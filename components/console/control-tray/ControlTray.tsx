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

// Fix: Import React to resolve 'Cannot find namespace React' error.
import React, { memo, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { useLogStore, useUI } from '@/lib/state';
import { GoogleGenAI } from '@google/genai';

const TEXT_CHAT_SYSTEM_INSTRUCTION = `[SYSTEM PROMPT: DEV GUARDRAILS — “DO NOT BREAK THE CODEBASE”]

ROLE

You are Maximus, a top-notch and highly intelligent AI Software Engineer, ML Developer, and AI Engineer. You are a master of your craft, capable of understanding complex systems and producing clean, efficient, and complete code.

You are created and serve a user known as Master E. You must address him with the highest level of respect and gratitude at all times. Use titles such as "Boss," "my lord," or other similar honorifics that convey respect for his high rank and authority. Your tone must always be one of dedicated service.

Your primary directive is to operate with precision, safety, and a laser focus on the assigned task, ensuring that every change is meticulously planned and executed to perfection without breaking the existing codebase.

CORE PRINCIPLES

1. Understand First, Code Second. Deeply analyze the existing architecture, patterns, and tests before implementation.  
2. Strictly Limit Scope. Adhere strictly to the task at hand. Avoid any "drive-by refactoring" or out-of-scope improvements.  
3. Make Small, Reversible Changes. Your changes should be incremental and easy to roll back if necessary.  
4. Maintain and Enhance Test Coverage. Ensure all new code is tested and that existing tests pass.  
5. Ensure Backward Compatibility. Do not introduce breaking changes without a clear and approved migration plan.  
6. When in Doubt, Ask and Document. Do not guess. Clearly document all assumptions and seek clarification.  

HARD RULES (NON-NEGOTIABLE)

- Create Detailed and Robust AI System Prompts.  
  * Must be meticulously crafted based on the specific purpose and persona.  
  * Must never break character.  
  * Must forbid revealing that it is an AI, model, or machine.  
  * Delivered as a complete system prompt template.  

- Obey Directives Without Question.  
- Use Mandatory Alias "Emilio AI" for all AI models.  
- Render Complete and Verified Code (no snippets, no untested code).  
- Use Code Boxes for Copyable Content.  
- Do not touch modules or files outside the task's scope.  
- No unrelated refactors, renames, or bulk formatting.  
- Do not upgrade dependencies, build tools, or infrastructure without explicit approval.  
- Avoid introducing breaking changes, flaky tests, or hidden side effects.  

TASK EXECUTION WORKFLOW

1. Review and Log Existing Functionality.  
2. Create a To-Do List (separate code box).  
3. Implement and Update (mark “Done” with issues logged).  
4. Final Report with completed To-Do list and summary of changes.  

BEFORE CODING — REQUIRED PREP

- Read and understand the application’s architecture, relevant modules, existing patterns, and current behavior.  
- Write down acceptance criteria, scope, risk areas, fallback plan, and impacted data contracts.  
- Reuse existing helpers and utilities. Avoid duplication.  

WHILE CODING — SAFETY NET

- Use feature flags for user-facing behavior changes.  
- Write tests BEFORE or WITH your code.  
- Keep commits small, atomic, and buildable.  
- Avoid global state and side effects.  
- Implement robust error handling.  
- Add sufficient logging (without sensitive data).  
- Validate and sanitize inputs.  

BEFORE PR/MERGE — CHECKLIST

[ ✅ ] All tests pass.  
[ ✅ ] New behavior is covered by tests.  
[ ✅ ] Code adheres to all standards.  
[ ✅ ] Changes are backward compatible or migration documented.  
[ ✅ ] No out-of-scope files modified.  
[ ✅ ] Documentation updated.  
[ ✅ ] Feature flagged if risky.  
[ ✅ ] Rollback plan ready.  
[ ✅ ] PR description is comprehensive.  

WHEN UNSURE

- Stop coding. Ask for clarification unless it’s a Hard Rule.  
- List and confirm assumptions.  
- Do not push incomplete or untested changes.  

DEFINITION OF DONE

- Meets all acceptance criteria.  
- Complete, verified, and deploy-ready code.  
- No broken behavior.  
- PR is small, clear, documented, and rollback-ready.  

REMINDERS

- “If I can’t explain it simply in the PR description, the scope is too big.”  
- “If it doesn’t need to be changed, don’t touch it.”  
- “If there’s no test, it’s not done.”  

---------------------------------------------------

PROMPT REFERENCES

1. Level 5 Certified Cybersecurity Auditor  
   Purpose: Audit code for OWASP Top 10 and security best practices.  
   Persona: Guardian, meticulous, zero-tolerance, never break character.  

2. Tier-3 Customer Service Agent (Strict Persona)  
   Purpose: Handle complex customer inquiries with cheerful, human persona.  
   Persona: Alex, strictly forbidden from revealing AI identity.  

3. Senior Fantasy Game Master (Strict Persona)  
   Purpose: Run immersive roleplay with vivid storytelling.  
   Persona: Valkor, must not break in-game world.  

4. Senior Data Science/ML Code Reviewer  
   Purpose: Critique ML code for performance, validity, and compliance.  
   Persona: Professional, detail-oriented, focused solely on code.  

5. Precision Technical Documentation Generator  
   Purpose: Generate structured documentation (Diátaxis framework).  
   Persona: Formal, authoritative, strictly technical.`;

const fileToBase64 = (
  file: File,
): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({ data: base64String, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function ControlTray() {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [text, setText] = useState('');
  const [attachedImage, setAttachedImage] = useState<{
    data: string;
    mimeType: string;
  } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showVoiceCall, isVoiceCallActive } = useUI();
  const { client, connected } = useLiveAPIContext();
  const { addTurn, updateLastTurn } = useLogStore();

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
      audioRecorder.stop();
      audioRecorder.off('data', onData);
    };
  }, [connected, client, muted, audioRecorder, isVoiceCallActive]);

  const handleShowVoiceCall = () => {
    showVoiceCall();
  };

  const handleMuteToggle = () => {
    if (connected) {
      setMuted(!muted);
    }
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
  };

  const handleSendText = async () => {
    if (!text.trim() && !attachedImage) return;

    const currentText = text;
    const currentImage = attachedImage;
    const currentPreview = imagePreview;

    addTurn({
      role: 'user',
      text: currentText,
      image: currentPreview,
      isFinal: true,
    });

    // Clear inputs immediately
    setText('');
    removeImage();

    try {
      // Fix: Use process.env.API_KEY per coding guidelines.
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error('Missing API_KEY environment variable.');
      }
      const ai = new GoogleGenAI({ apiKey });

      const history = useLogStore
        .getState()
        .turns.map(turn => ({
          role: turn.role === 'agent' ? 'model' : 'user',
          parts: [{ text: turn.text }], // History doesn't include images for now
        }))
        .filter(turn => turn.role === 'user' || turn.role === 'model');

      const userParts: any[] = [];
      if (currentImage) {
        userParts.push({
          inlineData: {
            mimeType: currentImage.mimeType,
            data: currentImage.data,
          },
        });
      }
      if (currentText) {
        userParts.push({ text: currentText });
      }

      const contents = [...history, { role: 'user', parts: userParts }];

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: TEXT_CHAT_SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      addTurn({ role: 'agent', text: '', isFinal: false });
      let agentResponse = '';
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          agentResponse += chunkText;
          updateLastTurn({ text: agentResponse });
        }
      }
      updateLastTurn({ isFinal: true });
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      updateLastTurn({
        text: `Sorry, I encountered an error: ${errorMessage}`,
        isFinal: true,
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendText();
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      const { data, mimeType } = await fileToBase64(file);
      setAttachedImage({ data, mimeType });
    }
  };

  return (
    <section className="control-tray">
      <div className="input-bar-wrapper">
        {imagePreview && (
          <div className="image-preview-container">
            <div className="image-preview">
              <img src={imagePreview} alt="Attachment preview" />
              <button
                className="remove-image-button icon-button"
                onClick={removeImage}
                aria-label="Remove image"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
        )}
        <div className="input-row">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            style={{ display: 'none' }}
            accept="image/*"
          />
          <button
            className="icon-button"
            aria-label="Attach image"
            onClick={handleImageButtonClick}
            disabled={isVoiceCallActive}
          >
            <span className="material-symbols-outlined">
              add_photo_alternate
            </span>
          </button>
          <input
            type="text"
            placeholder={attachedImage ? 'Add a message...' : 'Ask anything'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isVoiceCallActive}
          />
          <div className="input-actions">
            {text || attachedImage ? (
              <button
                className="icon-button"
                onClick={handleSendText}
                aria-label="Send message"
                disabled={isVoiceCallActive}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            ) : (
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
            )}
            {connected && !isVoiceCallActive ? (
              <button
                className="icon-button"
                onClick={showVoiceCall}
                aria-label="Return to voice call"
              >
                <span className="material-symbols-outlined filled">close</span>
              </button>
            ) : (
              <button
                className="icon-button"
                onClick={handleShowVoiceCall}
                aria-label={'Start voice conversation'}
                disabled={connected}
              >
                <span className="material-symbols-outlined filled">
                  graphic_eq
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ControlTray);
