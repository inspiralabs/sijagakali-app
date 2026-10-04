import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { isSupabaseConfigured } from './sijagakaliEnv';
import { formatAuthError } from './authErrors';

export type UserRole = 'admin' | 'public';

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole;
  user: User | null;
  /** JWT access token — kirim sebagai "Authorization: Bearer <token>" ke Fastify API. */
  accessToken: string | null;
  /** null saat session masih dimuat (loading) */
  loading: boolean;
  /**
   * `captchaToken` dari widget Turnstile (wajib jika Supabase Attack Protection aktif).
   */
  login: (
    email: string,
    password: string,
    captchaToken?: string | null,
  ) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  role: 'public',
  user: null,
  accessToken: null,
  loading: true,
  login: async () => ({}),
  logout: async () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider dengan Supabase Auth (digunakan jika Supabase dikonfigurasi)
// ─────────────────────────────────────────────────────────────────────────────
function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase()!;

    // Ambil sesi yang ada (refresh token otomatis)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      captchaToken?: string | null,
    ): Promise<{ error?: string }> => {
      const supabase = getSupabase()!;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (error) return { error: formatAuthError(error) };
      return {};
    },
    [],
  );

  const logout = useCallback(async () => {
    const supabase = getSupabase()!;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoggedIn: !!session,
      role: session ? 'admin' : 'public',
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      loading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <MissingSupabaseConfig />;
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
}

/** Tanpa Supabase dashboard tidak punya data asli — tampilkan kesalahan konfigurasi, bukan data palsu. */
function MissingSupabaseConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Konfigurasi belum lengkap</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dashboard tidak bisa terhubung ke database. Isi <code>VITE_SUPABASE_URL</code> dan{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> lalu build ulang aplikasi.
        </p>
      </div>
    </div>
  );
}

export const useAuth = () => useContext(AuthContext);
