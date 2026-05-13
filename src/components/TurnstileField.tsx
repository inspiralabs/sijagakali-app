import { forwardRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '';

type Props = {
  /** Dipanggil saat verifikasi sukses; null jika expired/error. */
  onToken: (token: string | null) => void;
  className?: string;
  /**
   * true = token diperoleh saat `ref.execute()` (widget tersembunyi sampai dipanggil).
   * Mempercepat load halaman vs challenge selalu aktif.
   */
  deferChallenge?: boolean;
};

/**
 * Cloudflare Turnstile — kirim token ke Supabase (`options.captchaToken`).
 *
 * Jangan meletakkan komponen ini di dalam `<form>` induk: widget Turnstile memakai
 * form sendiri; form bersarang memicu "Form submission canceled ... not connected".
 *
 * Di produksi dengan CSP ketat, izinkan `challenges.cloudflare.com` (frame-src, script-src).
 */
export const TurnstileField = forwardRef<TurnstileInstance | null, Props>(function TurnstileField(
  { onToken, className, deferChallenge = false },
  ref,
) {
  if (!siteKey) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        CAPTCHA aktif di Supabase, tapi{' '}
        <code className="rounded bg-muted px-1">VITE_TURNSTILE_SITE_KEY</code> belum diisi. Tambahkan{' '}
        <strong>site key</strong> (bukan secret) ke file <code className="rounded bg-muted px-1">.env</code>.
      </div>
    );
  }

  const options = deferChallenge
    ? {
        theme: 'auto' as const,
        language: 'id' as const,
        execution: 'execute' as const,
        appearance: 'execute' as const,
        retry: 'auto' as const,
        retryInterval: 2500,
        refreshExpired: 'auto' as const,
        refreshTimeout: 'auto' as const,
      }
    : {
        theme: 'auto' as const,
        language: 'id' as const,
        execution: 'render' as const,
        appearance: 'interaction-only' as const,
        retry: 'auto' as const,
        retryInterval: 2500,
        refreshExpired: 'auto' as const,
        refreshTimeout: 'auto' as const,
      };

  return (
    <div className={className}>
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        options={options}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => {
          onToken(null);
        }}
      />
    </div>
  );
});

export function isTurnstileConfigured(): boolean {
  return Boolean(siteKey);
}
