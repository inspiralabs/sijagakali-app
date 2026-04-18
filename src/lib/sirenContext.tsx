import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';

interface SirenCtx {
  /** Admin global on/off. When false, siren never plays for anyone. */
  enabled: boolean;
  /** Per-user mute (does not affect other users). */
  muted: boolean;
  setEnabled: (v: boolean) => void;
  setMuted: (v: boolean) => void;
  /** Play siren for given status. No-op if disabled or muted. */
  playFor: (status: 'siaga' | 'bahaya') => void;
  /** Stop any currently playing siren. */
  stop: () => void;
}

const Ctx = createContext<SirenCtx>({
  enabled: true,
  muted: false,
  setEnabled: () => {},
  setMuted: () => {},
  playFor: () => {},
  stop: () => {},
});

const KEY_ENABLED = 'sja_siren_enabled';
const KEY_MUTED = 'sja_siren_muted';

export function SirenProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    const v = localStorage.getItem(KEY_ENABLED);
    return v === null ? true : v === 'true';
  });
  const [muted, setMutedState] = useState<boolean>(() => {
    return localStorage.getItem(KEY_MUTED) === 'true';
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeRef = useRef<{ osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; stopAt: number } | null>(null);

  const setEnabled = (v: boolean) => {
    setEnabledState(v);
    localStorage.setItem(KEY_ENABLED, String(v));
    if (!v) stop();
  };
  const setMuted = (v: boolean) => {
    setMutedState(v);
    localStorage.setItem(KEY_MUTED, String(v));
    if (v) stop();
  };

  const stop = useCallback(() => {
    const a = activeRef.current;
    if (!a) return;
    try {
      a.gain.gain.cancelScheduledValues(a.gain.context.currentTime);
      a.gain.gain.linearRampToValueAtTime(0, a.gain.context.currentTime + 0.05);
      a.osc.stop(a.gain.context.currentTime + 0.1);
      a.lfo.stop(a.gain.context.currentTime + 0.1);
    } catch {}
    activeRef.current = null;
  }, []);

  const playFor = useCallback((status: 'siaga' | 'bahaya') => {
    if (!enabled || muted) return;
    try {
      if (!audioCtxRef.current) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        audioCtxRef.current = new Ctor();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      // If already playing, stop first
      stop();

      const duration = status === 'bahaya' ? 4 : 2; // seconds
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = status === 'bahaya' ? 880 : 660;

      // wail effect
      lfo.type = 'sine';
      lfo.frequency.value = status === 'bahaya' ? 4 : 2;
      lfoGain.gain.value = status === 'bahaya' ? 220 : 120;
      lfo.connect(lfoGain).connect(osc.frequency);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + duration - 0.1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

      osc.connect(gain).connect(ctx.destination);
      osc.start();
      lfo.start();
      osc.stop(ctx.currentTime + duration);
      lfo.stop(ctx.currentTime + duration);

      activeRef.current = { osc, gain, lfo, stopAt: ctx.currentTime + duration };
    } catch {
      // ignore audio errors
    }
  }, [enabled, muted, stop]);

  // React to enabled/muted runtime changes already handled in setters.
  useEffect(() => () => stop(), [stop]);

  return (
    <Ctx.Provider value={{ enabled, muted, setEnabled, setMuted, playFor, stop }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSiren = () => useContext(Ctx);
