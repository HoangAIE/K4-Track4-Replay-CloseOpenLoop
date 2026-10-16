import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertLevel } from '../types/adas';

export function useAudioAlert(alertLevel: AlertLevel, enabled = true) {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('drivedeck_audio_muted');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepTimerRef = useRef<number | null>(null);

  // Initialize or get AudioContext safely after user gesture
  const getAudioContext = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Unlock AudioContext on window interaction
  useEffect(() => {
    const handleGesture = () => {
      setHasInteracted(true);
      getAudioContext();
    };

    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [getAudioContext]);

  // Persist mute setting
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('drivedeck_audio_muted', JSON.stringify(next));
      if (!next) {
        getAudioContext();
      }
      return next;
    });
  }, [getAudioContext]);

  // Play single synthesized ADAS beep
  const playTone = useCallback((frequency: number, durationSec: number, type: OscillatorType = 'sine', gainVal = 0.22) => {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Envelope to avoid popping sound
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(gainVal, ctx.currentTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationSec + 0.02);
    } catch {
      // AudioContext policy error ignored
    }
  }, [getAudioContext]);

  // Play double beep for collision warning (FCW)
  const playCollisionAlert = useCallback(() => {
    playTone(1650, 0.07, 'triangle', 0.28);
    window.setTimeout(() => {
      playTone(1950, 0.07, 'triangle', 0.32);
    }, 110);
  }, [playTone]);

  // Play warning chime for distance attention
  const playWarningChime = useCallback(() => {
    playTone(780, 0.12, 'sine', 0.18);
  }, [playTone]);

  // Periodic alert scheduler based on alertLevel
  useEffect(() => {
    if (beepTimerRef.current) {
      clearInterval(beepTimerRef.current);
      beepTimerRef.current = null;
    }

    if (!enabled || isMuted || !hasInteracted) {
      return;
    }

    if (alertLevel === 'danger') {
      // Immediate first beep
      playCollisionAlert();
      // Rapid pulse every 380ms
      beepTimerRef.current = window.setInterval(() => {
        playCollisionAlert();
      }, 380);
    } else if (alertLevel === 'warning') {
      // Immediate first chime
      playWarningChime();
      // Intermittent chime every 1100ms
      beepTimerRef.current = window.setInterval(() => {
        playWarningChime();
      }, 1100);
    }

    return () => {
      if (beepTimerRef.current) {
        clearInterval(beepTimerRef.current);
        beepTimerRef.current = null;
      }
    };
  }, [alertLevel, enabled, isMuted, hasInteracted, playCollisionAlert, playWarningChime]);

  // Test sound function for manual button
  const playTestSound = useCallback(() => {
    getAudioContext();
    playTone(880, 0.1, 'sine', 0.25);
  }, [getAudioContext, playTone]);

  return {
    isMuted,
    toggleMute,
    hasInteracted,
    playTestSound
  };
}
