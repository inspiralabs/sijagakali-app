import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';

export type SirenPattern = 'wail' | 'yelp' | 'hilo' | 'pulse';

export const SIREN_PATTERNS: { value: SirenPattern; label: string; description: string }[] = [
  { value: 'wail', label: 'Wail', description: 'Naik-turun lambat (klasik)' },
  { value: 'yelp', label: 'Yelp', description: 'Naik-turun cepat (urgensi tinggi)' },
  { value: 'hilo', label: 'Hi-Lo', description: 'Dua nada bergantian (Eropa)' },
  { value: 'pulse', label: 'Pulse', description: 'Bunyi putus-putus' },
];

interface SirenCtx {
  enabled: boolean;
  muted: boolean;
  pattern: SirenPattern;
  /** Notification beep mute (separate from siren). */
  notifMuted: boolean;
  setEnabled: (v: boolean) => void;
  setMuted: (v: boolean) => void;
  setPattern: (p: SirenPattern) => void;
  setNotifMuted: (v: boolean) => void;
  playFor: (status: 'siaga' | 'bahaya') => void;
  /** Short beep for non-critical notifications (waspada/normal). */
  playNotif: (kind: 'info' | 'warn') => void;
  /** Preview siren regardless of recent triggers. Respects mute/enabled. */
  preview: () => void;
  stop: () => void;
}

const Ctx = createContext<SirenCtx>({
  enabled: true,
  muted: false,
  pattern: 'wail',
  notifMuted: false,
  setEnabled: () => {},
  setMuted: () => {},
  setPattern: () => {},
  setNotifMuted: () => {},
  playFor: () => {},
  playNotif: () => {},
  preview: () => {},
  stop: () => {},
});

const KEY_ENABLED = 'sja_siren_enabled';
const KEY_MUTED = 'sja_siren_muted';
const KEY_PATTERN = 'sja_siren_pattern';
const KEY_NOTIF_MUTED = 'sja_notif_muted';

export function SirenProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    const v = localStorage.getItem(KEY_ENABLED);
    return v === null ? true : v === 'true';
  });
  const [muted, setMutedState] = useState<boolean>(() =>
    localStorage.getItem(KEY_MUTED) === 'true'
  );
  const [pattern, setPatternState] = useState<SirenPattern>(() => {
    const v = localStorage.getItem(KEY_PATTERN) as SirenPattern | null;
    return v && SIREN_PATTERNS.some(p => p.value === v) ? v : 'wail';
  });
  const [notifMuted, setNotifMutedState] = useState<boolean>(() =>
    localStorage.getItem(KEY_NOTIF_MUTED) === 'true'
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);
  const activeTimeoutsRef = useRef<number[]>([]);

  const persistAndSet = {
    enabled: (v: boolean) => { setEnabledState(v); localStorage.setItem(KEY_ENABLED, String(v)); if (!v) stop(); },
    muted: (v: boolean) => { setMutedState(v); localStorage.setItem(KEY_MUTED, String(v)); if (v) stop(); },
    pattern: (p: SirenPattern) => { setPatternState(p); localStorage.setItem(KEY_PATTERN, p); },
    notifMuted: (v: boolean) => { setNotifMutedState(v); localStorage.setItem(KEY_NOTIF_MUTED, String(v)); },
  };

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

  const trackNode = (n: AudioNode) => { activeNodesRef.current.push(n); };
  const trackTimeout = (id: number) => { activeTimeoutsRef.current.push(id); };

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

  const runPattern = (status: 'siaga' | 'bahaya') => {
    const ctx = ensureCtx(); if (!ctx) return;
    stop();
    const now = ctx.currentTime;
    const isBahaya = status === 'bahaya';
    const totalDuration = isBahaya ? 5 : 2.5;
    const baseLow = isBahaya ? 500 : 440;
    const baseHigh = isBahaya ? 1100 : 880;
    const peak = isBahaya ? 0.22 : 0.16;

    switch (pattern) {
      case 'wail': {
        // slow up-down sweeps
        const cycle = 1.0;
        for (let t = 0; t < totalDuration; t += cycle) {
          const half = cycle / 2;
          playTone(ctx, now + t, half, baseLow, baseHigh, peak);
          playTone(ctx, now + t + half, half, baseHigh, baseLow, peak);
        }
        break;
      }
      case 'yelp': {
        // fast sweeps
        const cycle = 0.25;
        for (let t = 0; t < totalDuration; t += cycle) {
          playTone(ctx, now + t, cycle, baseLow, baseHigh, peak);
        }
        break;
      }
      case 'hilo': {
        // alternate two flat tones
        const cycle = 0.6;
        let hi = true;
        for (let t = 0; t < totalDuration; t += cycle) {
          const f = hi ? baseHigh : baseLow;
          playTone(ctx, now + t, cycle - 0.02, f, f, peak, 'square');
          hi = !hi;
        }
        break;
      }
      case 'pulse': {
        // short on-off bursts
        const on = 0.18, off = 0.12;
        let t = 0;
        while (t < totalDuration) {
          playTone(ctx, now + t, on, baseHigh, baseHigh, peak, 'square');
          t += on + off;
        }
        break;
      }
    }
  };

  const playFor = useCallback((status: 'siaga' | 'bahaya') => {
    if (!enabled || muted) return;
    runPattern(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, muted, pattern]);

  const preview = useCallback(() => {
    if (!enabled || muted) return;
    runPattern('siaga');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, muted, pattern]);

  const playNotif = useCallback((kind: 'info' | 'warn') => {
    if (notifMuted) return;
    const ctx = ensureCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === 'warn') {
      // two-tone warn beep
      playTone(ctx, now, 0.12, 660, 880, 0.12, 'sine');
      playTone(ctx, now + 0.14, 0.16, 880, 880, 0.12, 'sine');
    } else {
      // single soft ding
      playTone(ctx, now, 0.18, 880, 1320, 0.1, 'sine');
    }
  }, [notifMuted]);

  useEffect(() => () => stop(), [stop]);

  return (
    <Ctx.Provider value={{
      enabled, muted, pattern, notifMuted,
      setEnabled: persistAndSet.enabled,
      setMuted: persistAndSet.muted,
      setPattern: persistAndSet.pattern,
      setNotifMuted: persistAndSet.notifMuted,
      playFor, playNotif, preview, stop,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSiren = () => useContext(Ctx);
