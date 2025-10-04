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

import cn from 'classnames';

import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { useUI } from '@/lib/state';

function ControlTray() {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [text, setText] = useState('');
  const { showVoiceCall, isVoiceCallActive } = useUI();
  const { client, connected, connect, disconnect } = useLiveAPIContext();

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    // Don't record audio from here if the voice call is active
    if (connected && !isVoiceCallActive && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, muted, audioRecorder, isVoiceCallActive]);

  // This button now shows the voice call UI instead of connecting directly
  const handleShowVoiceCall = () => {
    showVoiceCall();
  };

  const handleMuteToggle = () => {
    if (connected) {
      setMuted(!muted);
    }
  };

  return (
    <section className="control-tray">
      <div className="input-bar-wrapper">
        <button
          className="icon-button"
          aria-label="Attach image"
          disabled={isVoiceCallActive}
        >
          <span className="material-symbols-outlined">add_photo_alternate</span>
        </button>
        <input
          type="text"
          placeholder="Ask anything"
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={connected} // connected is true during voice call
        />
        <button
          className="icon-button"
          onClick={handleMuteToggle}
          aria-label={muted ? 'Unmute' : 'Mute'}
          disabled={!connected || isVoiceCallActive}
        >
          <span className="material-symbols-outlined filled">
            {muted ? 'mic_off' : 'mic'}
          </span>
        </button>
        <button
          className="primary-action-button"
          onClick={handleShowVoiceCall}
          aria-label={'Start voice conversation'}
          disabled={connected}
        >
          <span className="material-symbols-outlined filled">play_arrow</span>
        </button>
      </div>
    </section>
  );
}

export default memo(ControlTray);