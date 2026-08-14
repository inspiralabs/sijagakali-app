import { useState } from 'react';
import { AppBrandLogo } from '@/components/AppBrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';
import { formatAuthError } from '@/lib/authErrors';
import { toast } from 'sonner';
import { TurnstileField, isTurnstileConfigured } from '@/components/TurnstileField';

const FORGOT_FORM_ID = 'sja-forgot-password-form';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaMountKey, setCaptchaMountKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const captchaRequired = isTurnstileConfigured();
  const captchaReady = !captchaRequired || Boolean(captchaToken);

  const finishSendReset = async (token?: string | null) => {
    const supabase = getSupabase();
    if (!supabase) {
      setSubmitting(false);
      toast.error('Supabase belum dikonfigurasi');
      return;
    }

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
      captchaToken: token ?? undefined,
    });

    setSubmitting(false);

    if (error) {
      toast.error(formatAuthError(error));
      setCaptchaToken(null);
      setCaptchaMountKey((k) => k + 1);
    } else {
      setSent(true);
    }
  };

  const handleCaptchaToken = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (captchaRequired && !captchaToken) {
      toast.error('Mohon tunggu verifikasi keamanan selesai di bawah, lalu coba lagi.');
      return;
    }

    setSubmitting(true);
    await finishSendReset(captchaToken);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border bg-card p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <AppBrandLogo className="h-[clamp(2.5rem,8vw,3.5rem)] w-[clamp(2.5rem,8vw,3.5rem)]" />
          <h1 className="text-2xl font-bold text-foreground">Lupa Kata Sandi</h1>
          <p className="text-xs text-muted-foreground">Masukkan email akun admin Anda</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
              Email reset kata sandi telah dikirim ke <strong>{email}</strong>. Periksa kotak masuk Anda.
            </div>
            <Link to="/login" className="block text-xs text-muted-foreground transition-colors hover:text-primary">
              ← Kembali ke halaman login
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <form id={FORGOT_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sijagakali.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </form>
              <div className="space-y-1">
                <TurnstileField
                  key={captchaMountKey}
                  onToken={handleCaptchaToken}
                  className="flex min-h-[65px] items-center justify-center [&_iframe]:max-w-full"
                />
                {captchaRequired && !captchaToken && (
                  <p className="text-center text-[11px] text-muted-foreground">Memuat verifikasi keamanan…</p>
                )}
              </div>
              <Button type="submit" form={FORGOT_FORM_ID} className="w-full" disabled={submitting || !captchaReady}>
                {submitting ? 'Memproses...' : 'Kirim Link Reset'}
              </Button>
            </div>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-xs text-muted-foreground transition-colors hover:text-primary">
                ← Kembali ke halaman login
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
