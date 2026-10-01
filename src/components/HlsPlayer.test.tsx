import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const hls = vi.hoisted(() => ({ instances: [] as Array<Record<string, ReturnType<typeof vi.fn>>> }));

vi.mock('hls.js', () => {
  class FakeHls {
    static isSupported = () => true;
    static Events = { ERROR: 'hlsError' };
    loadSource = vi.fn();
    attachMedia = vi.fn();
    on = vi.fn();
    destroy = vi.fn();
    constructor() {
      hls.instances.push(this as unknown as Record<string, ReturnType<typeof vi.fn>>);
    }
  }
  return { default: FakeHls };
});

import { HlsPlayer, MAX_WATCH_MS } from './HlsPlayer';

const SRC = 'https://cctv-sijagakali.inspiralabs.id/cam-node-001/index.m3u8';

describe('HlsPlayer', () => {
  beforeEach(() => {
    hls.instances.length = 0;
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not load the stream until the user presses play', () => {
    render(<HlsPlayer src={SRC} />);
    expect(screen.getByRole('button', { name: /putar live/i })).toBeInTheDocument();
    expect(hls.instances).toHaveLength(0);
  });

  it('loads the stream on play', () => {
    render(<HlsPlayer src={SRC} />);
    fireEvent.click(screen.getByRole('button', { name: /putar live/i }));
    expect(hls.instances).toHaveLength(1);
    expect(hls.instances[0].loadSource).toHaveBeenCalledWith(SRC);
  });

  it('auto-stops after MAX_WATCH_MS and offers to continue', () => {
    render(<HlsPlayer src={SRC} />);
    fireEvent.click(screen.getByRole('button', { name: /putar live/i }));
    act(() => {
      vi.advanceTimersByTime(MAX_WATCH_MS);
    });
    expect(hls.instances[0].destroy).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /lanjut menonton/i })).toBeInTheDocument();
  });

  it('destroys the stream on unmount', () => {
    const { unmount } = render(<HlsPlayer src={SRC} />);
    fireEvent.click(screen.getByRole('button', { name: /putar live/i }));
    unmount();
    expect(hls.instances[0].destroy).toHaveBeenCalled();
  });

  it('shows "Kamera offline" on a fatal HLS error', () => {
    render(<HlsPlayer src={SRC} />);
    fireEvent.click(screen.getByRole('button', { name: /putar live/i }));
    const onError = hls.instances[0].on.mock.calls[0][1] as (e: unknown, d: { fatal: boolean }) => void;
    act(() => onError('hlsError', { fatal: true }));
    expect(screen.getByText(/kamera offline/i)).toBeInTheDocument();
    expect(hls.instances[0].destroy).toHaveBeenCalled();
  });
});
