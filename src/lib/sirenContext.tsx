import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';

interface SirenCtx {
  enabled: boolean;
  muted: boolean;
  /** Notification beep mute (separate from siren). */
  notifMuted: boolean;
  /** Siren playback duration in seconds (admin-controlled). */
  duration: number;
  setEnabled: (v: boolean) => void;
  setMuted: (v: boolean) => void;
  setNotifMuted: (v: boolean) => void;
  setDuration: (s: number) => void;
  playFor: (status: 'siaga' | 'bahaya') => void;
  /** Short beep for non-critical notifications (waspada/normal). */
  playNotif: (kind: 'info' | 'warn') => void;
  /** Preview siren regardless of recent triggers. Respects mute/enabled. */
  preview: () => void;
  stop: () => void;
}

export const SIREN_DURATION_MIN = 2;
export const SIREN_DURATION_MAX = 30;
export const SIREN_DURATION_DEFAULT = 5;

const Ctx = createContext<SirenCtx>({
  enabled: true,
  muted: false,
  notifMuted: false,
  duration: SIREN_DURATION_DEFAULT,
  setEnabled: () => {},
  setMuted: () => {},
  setNotifMuted: () => {},
  setDuration: () => {},
  playFor: () => {},
  playNotif: () => {},
  preview: () => {},
  stop: () => {},
});

const KEY_ENABLED = 'sja_siren_enabled';
const KEY_MUTED = 'sja_siren_muted';
const KEY_NOTIF_MUTED = 'sja_notif_muted';
const KEY_DURATION = 'sja_siren_duration';

const clampDuration = (n: number) =>
  Math.max(SIREN_DURATION_MIN, Math.min(SIREN_DURATION_MAX, Math.round(n)));

export function SirenProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    const v = localStorage.getItem(KEY_ENABLED);
    return v === null ? true : v === 'true';
  });
  const [muted, setMutedState] = useState<boolean>(() =>
    localStorage.getItem(KEY_MUTED) === 'true'
  );
  const [notifMuted, setNotifMutedState] = useState<boolean>(() =>
    localStorage.getItem(KEY_NOTIF_MUTED) === 'true'
  );
  const [duration, setDurationState] = useState<number>(() => {
    const v = Number(localStorage.getItem(KEY_DURATION));
    return Number.isFinite(v) && v > 0 ? clampDuration(v) : SIREN_DURATION_DEFAULT;
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);
  const activeTimeoutsRef = useRef<number[]>([]);

  const ensureCtx = (): AudioContext | null => {
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };

  const stop = useCallback(() => {
    activeTimeoutsRef.current.forEach(id => window.clearTimeout(id));
    activeTimeoutsRef.current = [];
    activeNodesRef.current.forEach(n => { try { (n as OscillatorNode).stop?.(); } catch {} try { n.disconnect(); } catch {} });
    activeNodesRef.current = [];
  }, []);

  const persistAndSet = {
    enabled: (v: boolean) => { setEnabledState(v); localStorage.setItem(KEY_ENABLED, String(v)); if (!v) stop(); },
    muted: (v: boolean) => { setMutedState(v); localStorage.setItem(KEY_MUTED, String(v)); if (v) stop(); },
    notifMuted: (v: boolean) => { setNotifMutedState(v); localStorage.setItem(KEY_NOTIF_MUTED, String(v)); },
    duration: (s: number) => { const c = clampDuration(s); setDurationState(c); localStorage.setItem(KEY_DURATION, String(c)); },
  };

  const trackNode = (n: AudioNode) => { activeNodesRef.current.push(n); };

  /** Build a single tone segment with frequency envelope. */
  const playTone = (
    ctx: AudioContext,
    startAt: number,
    durationS: number,
    freqStart: number,
    freqEnd: number,
    peakGain = 0.18,
    type: OscillatorType = 'sawtooth',
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startAt);
    osc.frequency.linearRampToValueAtTime(freqEnd, startAt + durationS);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peakGain, startAt + Math.min(0.04, durationS / 4));
    gain.gain.setValueAtTime(peakGain, startAt + Math.max(0, durationS - 0.04));
    gain.gain.linearRampToValueAtTime(0, startAt + durationS);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + durationS + 0.02);
    trackNode(osc); trackNode(gain);
  };

  /** Default "wail" pattern — slow up-down sweeps. */
  const runWail = (status: 'siaga' | 'bahaya', totalDuration: number) => {
    const ctx = ensureCtx(); if (!ctx) return;
    stop();
    const now = ctx.currentTime;
    const isBahaya = status === 'bahaya';
    const baseLow = isBahaya ? 500 : 440;
    const baseHigh = isBahaya ? 1100 : 880;
    const peak = isBahaya ? 0.22 : 0.16;
    const cycle = 1.0;
    for (let t = 0; t < totalDuration; t += cycle) {
      const half = cycle / 2;
      playTone(ctx, now + t, half, baseLow, baseHigh, peak);
      playTone(ctx, now + t + half, half, baseHigh, baseLow, peak);
    }
  };

  const playFor = useCallback((status: 'siaga' | 'bahaya') => {
    if (!enabled || muted) return;
    runWail(status, duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, muted, duration]);

  const preview = useCallback(() => {
    if (!enabled || muted) return;
    runWail('siaga', duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, muted, duration]);

  const playNotif = useCallback((kind: 'info' | 'warn') => {
    if (notifMuted) return;
    const ctx = ensureCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === 'warn') {
      playTone(ctx, now, 0.12, 660, 880, 0.12, 'sine');
      playTone(ctx, now + 0.14, 0.16, 880, 880, 0.12, 'sine');
    } else {
      playTone(ctx, now, 0.18, 880, 1320, 0.1, 'sine');
    }
  }, [notifMuted]);

  useEffect(() => () => stop(), [stop]);

  return (
    <Ctx.Provider value={{
      enabled, muted, notifMuted, duration,
      setEnabled: persistAndSet.enabled,
      setMuted: persistAndSet.muted,
      setNotifMuted: persistAndSet.notifMuted,
      setDuration: persistAndSet.duration,
      playFor, playNotif, preview, stop,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSiren = () => useContext(Ctx);
