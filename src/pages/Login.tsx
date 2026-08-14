import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AppBrandLogo } from '@/components/AppBrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/sijagakaliEnv';
import { TurnstileField, isTurnstileConfigured } from '@/components/TurnstileField';

const LOGIN_FORM_ID = 'sja-login-form';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaMountKey, setCaptchaMountKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const captchaRequired = isSupabaseConfigured() && isTurnstileConfigured();
  const captchaReady = !captchaRequired || Boolean(captchaToken);

  const finishLogin = async (token?: string | null) => {
    setSubmitting(true);
    const result = await login(email, password, token ?? undefined);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      setCaptchaToken(null);
      setCaptchaMountKey((k) => k + 1);
    } else {
      toast.success('Berhasil masuk sebagai Admin');
      navigate('/dashboard');
    }
  };

  const handleCaptchaToken = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (captchaRequired && !captchaToken) {
      toast.error('Mohon tunggu verifikasi keamanan selesai di bawah, lalu coba lagi.');
      return;
    }

    await finishLogin(captchaToken);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border bg-card p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <AppBrandLogo className="h-[clamp(2.5rem,8vw,3.5rem)] w-[clamp(2.5rem,8vw,3.5rem)]" />
          <h1 className="text-2xl font-bold text-foreground">SiJagaKali</h1>
          <p className="text-xs text-muted-foreground">Login Admin — Early Warning System</p>
        </div>

        <div className="space-y-4">
          <form id={LOGIN_FORM_ID} onSubmit={handleLogin} className="space-y-4">
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
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kata Sandi</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </form>

          {isSupabaseConfigured() && (
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
          )}

          <Button type="submit" form={LOGIN_FORM_ID} className="w-full" disabled={submitting || !captchaReady}>
            {submitting ? 'Memproses...' : 'Masuk'}
          </Button>
        </div>

        <div className="mt-4 space-y-2 text-center">
          {isSupabaseConfigured() && (
            <div>
              <Link to="/forgot-password" className="text-xs text-muted-foreground transition-colors hover:text-primary">
                Lupa kata sandi?
              </Link>
            </div>
          )}
          <div>
            <Link to="/public" className="text-xs text-muted-foreground transition-colors hover:text-primary">
              ← Kembali ke Dashboard Publik
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
