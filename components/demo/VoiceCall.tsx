/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Import React to fix "Cannot find namespace 'React'" error.
import React, { useEffect, useRef, useState, memo } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { useUI, useUserSettings } from '../../lib/state';
import { AudioRecorder } from '../../lib/audio-recorder';
import cn from 'classnames';

const VoiceCall = () => {
  const {
    client,
    connect,
    disconnect,
    connected,
    volume, // This is the agent's output volume
  } = useLiveAPIContext();
  const { hideVoiceCall } = useUI();
  const { personaName } = useUserSettings();

  const [audioRecorder] = useState(() => new AudioRecorder());
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [userVolume, setUserVolume] = useState(0); // State for user's input volume
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Automatically connect when the component mounts
    connect();
  }, [connect]);

  // Handle user's input volume for visualization
  useEffect(() => {
    const onVolume = (vol: number) => {
      setUserVolume(vol);
    };
    if (connected && !isMuted) {
      audioRecorder.on('volume', onVolume);
    }
    return () => {
      audioRecorder.off('volume', onVolume);
    };
  }, [connected, isMuted, audioRecorder]);

  // Handle audio recording and streaming to the API
  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    if (connected && !isMuted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.stop();
      audioRecorder.off('data', onData);
    };
  }, [connected, client, isMuted, audioRecorder]);

  // Handle camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    const setupCamera = async () => {
      if (isCameraOn && videoRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoRef.current.srcObject = stream;
        } catch (err) {
          console.error('Error accessing camera:', err);
          setIsCameraOn(false); // Turn off toggle if permission is denied
        }
      } else {
        if (videoRef.current?.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
    };

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);

  const handleEndCall = () => {
    disconnect();
    hideVoiceCall();
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleCameraToggle = () => {
    setIsCameraOn(!isCameraOn);
  };

  return (
    <div className="voice-call-overlay">
      <header className="voice-call-header">
        <span className="voice-call-persona-name">{personaName}</span>
        <div className="voice-call-header-actions">
          <button className="icon-button" aria-label="Closed captions">
            <span className="material-symbols-outlined">closed_caption</span>
          </button>
          <button className="icon-button" aria-label="Volume">
            <span className="material-symbols-outlined">volume_up</span>
          </button>
          <button className="icon-button" aria-label="More options">
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>
      </header>

      <main className="voice-call-main">
        <div className="voice-call-orb-container">
          <div className="voice-call-orb">
            {isCameraOn && (
              <video
                ref={videoRef}
                className="voice-call-video-preview"
                autoPlay
                playsInline
                muted
              />
            )}
            <div
              className="voice-call-orb-effect user-effect"
              style={{ opacity: Math.min(1, userVolume * 15) }}
            ></div>
            <div
              className="voice-call-orb-effect agent-effect"
              style={{ opacity: Math.min(1, volume * 10) }}
            ></div>
          </div>
        </div>
      </main>

      <footer className="voice-call-footer">
        <button
          className={cn('voice-call-button', { 'toggled-off': !isCameraOn })}
          onClick={handleCameraToggle}
          aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          <span className="material-symbols-outlined">
            {isCameraOn ? 'videocam' : 'videocam_off'}
          </span>
        </button>
        <button
          className={cn('voice-call-button', { 'toggled-off': isMuted })}
          onClick={handleMuteToggle}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="material-symbols-outlined">
            {isMuted ? 'mic_off' : 'mic'}
          </span>
        </button>
        <button className="voice-call-button" aria-label="More options">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
        <button
          className="voice-call-button end-call"
          onClick={handleEndCall}
          aria-label="End call"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </footer>
    </div>
  );
};

export default memo(VoiceCall);