/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GenAILiveClient } from '../../lib/genai-live-client';
import { LiveConnectConfig, Modality, LiveServerToolCall } from '@google/genai';
import { AudioStreamer } from '../../lib/audio-streamer';
import { audioContext } from '../../lib/utils';
import VolMeterWorket from '../../lib/worklets/vol-meter';
import { useLogStore, useSettings, useUserSettings } from '@/lib/state';

export type UseLiveApiResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;

  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;

  volume: number;
};

async function handleSendEmail(
  args: any,
  auth: { isGmailConnected: boolean; accessToken: string | null },
) {
  if (!auth.isGmailConnected || !auth.accessToken) {
    return 'User is not connected to Gmail. Please ask them to connect their account through the settings.';
  }

  const { recipient, subject, body } = args;
  if (!recipient || !subject || !body) {
    return 'Missing required parameters for sending an email. I need a recipient, a subject, and a body.';
  }

  // Create RFC 2822 message
  const email = [
    `To: ${recipient}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ].join('\r\n');

  // Using btoa(unescape(encodeURIComponent(str))) for proper UTF-8 handling
  const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  try {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64EncodedEmail,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      console.error('Gmail API error:', data);
      return `Failed to send email: ${data.error.message}`;
    }
    return 'Email sent successfully.';
  } catch (error) {
    console.error('Error sending email:', error);
    return `An error occurred while sending the email: ${
      (error as Error).message
    }`;
  }
}

async function handleReadEmails(
  args: any,
  auth: { isGmailConnected: boolean; accessToken: string | null },
) {
  if (!auth.isGmailConnected || !auth.accessToken) {
    return 'User is not connected to Gmail. Please ask them to connect their account through the settings.';
  }

  const { count = 5, from, subject, unreadOnly = true } = args;
  let query = '';
  if (from) query += `from:${from} `;
  if (subject) query += `subject:(${subject}) `;
  if (unreadOnly) query += `is:unread `;

  try {
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${count}&q=${encodeURIComponent(
        query.trim(),
      )}`,
      {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      },
    );
    const listData = await listResponse.json();
    if (!listResponse.ok) throw new Error(listData.error.message);

    if (!listData.messages || listData.messages.length === 0) {
      return 'No matching emails found.';
    }

    const emailPromises = listData.messages.map((message: any) =>
      fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        },
      ).then(res => res.json()),
    );

    const emails = await Promise.all(emailPromises);

    const summaries = emails.map(email => {
      const fromHeader =
        email.payload.headers.find((h: any) => h.name === 'From')?.value ||
        'Unknown Sender';
      const subjectHeader =
        email.payload.headers.find((h: any) => h.name === 'Subject')?.value ||
        'No Subject';
      return `From: ${fromHeader}, Subject: ${subjectHeader}`;
    });

    return `Here are the latest emails:\n- ${summaries.join('\n- ')}`;
  } catch (error) {
    console.error('Error reading emails:', error);
    return `An error occurred while reading emails: ${(error as Error).message}`;
  }
}

export function useLiveApi({
  apiKey,
}: {
  apiKey: string;
}): UseLiveApiResults {
  const { model } = useSettings();
  const client = useMemo(
    () => new GenAILiveClient(apiKey, model),
    [apiKey, model],
  );

  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [volume, setVolume] = useState(0);
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConnectConfig>({});

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: 'audio-out' }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>('vumeter-out', VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          })
          .catch(err => {
            console.error('Error adding worklet:', err);
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
    };

    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop();
      }
    };

    const onAudio = (data: ArrayBuffer) => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.addPCM16(new Uint8Array(data));
      }
    };

    // Bind event listeners
    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('interrupted', stopAudioStreamer);
    client.on('audio', onAudio);

    const onToolCall = async (toolCall: LiveServerToolCall) => {
      const { isGmailConnected, accessToken } = useUserSettings.getState();
      const functionResponses: any[] = [];

      for (const fc of toolCall.functionCalls) {
        // Log the function call trigger
        const triggerMessage = `Triggering function call: **${
          fc.name
        }**\n\`\`\`json\n${JSON.stringify(fc.args, null, 2)}\n\`\`\``;
        useLogStore.getState().addTurn({
          role: 'system',
          text: triggerMessage,
          isFinal: true,
        });

        let resultPromise;

        switch (fc.name) {
          case 'send_email':
            resultPromise = handleSendEmail(fc.args, {
              isGmailConnected,
              accessToken,
            });
            break;
          case 'read_emails':
            resultPromise = handleReadEmails(fc.args, {
              isGmailConnected,
              accessToken,
            });
            break;
          default:
            resultPromise = Promise.resolve('ok'); // Default for other tools
        }

        const result = await resultPromise;

        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: result },
        });
      }

      // Log the function call response
      if (functionResponses.length > 0) {
        const responseMessage = `Function call response:\n\`\`\`json\n${JSON.stringify(
          functionResponses.map(r => r.response.result),
          null,
          2,
        )}\n\`\`\``;
        useLogStore.getState().addTurn({
          role: 'system',
          text: responseMessage,
          isFinal: true,
        });
      }

      client.sendToolResponse({ functionResponses: functionResponses });
    };

    client.on('toolcall', onToolCall);

    return () => {
      // Clean up event listeners
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('interrupted', stopAudioStreamer);
      client.off('audio', onAudio);
      client.off('toolcall', onToolCall);
    };
  }, [client]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error('config has not been set');
    }
    client.disconnect();
    await client.connect(config);
  }, [client, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connect,
    connected,
    disconnect,
    volume,
  };
}
