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
  const visualizerRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const smoothedUserVolume = useRef(0);
  const smoothedAgentVolume = useRef(0);

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
    if (!isCameraOn) {
      // If camera is off, ensure any existing stream is stopped.
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    // If camera is on, request stream.
    let stream: MediaStream | null = null;
    let cancelled = false;

    const enableCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        } else {
          // Component unmounted after await, but before assignment
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        if (!cancelled) {
          setIsCameraOn(false); // Turn off toggle if permission is denied
        }
      }
    };

    enableCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);

  // Canvas audio visualizer animation
  useEffect(() => {
    const canvas = visualizerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }
    };

    const draw = () => {
      // Smooth the volume values for a more fluid animation
      smoothedUserVolume.current =
        smoothedUserVolume.current * 0.9 + userVolume * 0.1;
      smoothedAgentVolume.current =
        smoothedAgentVolume.current * 0.9 + volume * 0.1;

      resizeCanvas();
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw user speaking visualizer (expanding teal rings)
      if (smoothedUserVolume.current > 0.005) {
        const maxRadius = width / 2;
        const baseRadius = maxRadius * 0.2;
        const dynamicRadius =
          maxRadius * 0.8 * Math.min(1, smoothedUserVolume.current * 15);

        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          const radius = baseRadius + dynamicRadius / i;
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          const opacity = Math.max(0, 1 - radius / maxRadius - 0.2);
          ctx.strokeStyle = `rgba(100, 255, 218, ${opacity})`;
          ctx.lineWidth = 1 + (smoothedUserVolume.current * 20) / i;
          ctx.stroke();
        }
      }

      // Draw agent speaking visualizer (pulsating white glow)
      if (smoothedAgentVolume.current > 0.005) {
        const maxRadius = width / 2;
        const radius =
          maxRadius * 0.4 +
          maxRadius * 0.5 * Math.min(1, smoothedAgentVolume.current * 10);

        // Create a radial gradient for a soft glow effect
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          radius * 0.5,
          centerX,
          centerY,
          radius,
        );
        gradient.addColorStop(
          0,
          `rgba(232, 234, 237, ${Math.min(
            0.5,
            smoothedAgentVolume.current * 5,
          )})`,
        );
        gradient.addColorStop(1, 'rgba(232, 234, 237, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [userVolume, volume]);

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

  // Define thresholds for speaking state
  const isUserSpeaking = userVolume > 0.01;
  const isAgentSpeaking = volume > 0.01;
  const isIdle = !isUserSpeaking && !isAgentSpeaking;

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
              className="voice-call-orb-effect standby-effect"
              style={{ opacity: isIdle ? 1 : 0 }}
            />
            <canvas ref={visualizerRef} className="voice-call-visualizer" />
            <div
              className="voice-call-orb-effect user-smoke-effect"
              style={{ opacity: Math.min(1, userVolume * 20) }}
            />
            <div
              className="voice-call-orb-effect agent-smoke-effect"
              style={{ opacity: Math.min(1, volume * 15) }}
            />
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