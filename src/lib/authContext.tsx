import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { isSupabaseConfigured } from './sijagaairEnv';
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
// Fallback provider tanpa Supabase (dev/demo mode)
// ─────────────────────────────────────────────────────────────────────────────
function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('sja_auth') === 'true';
  });

  const login = useCallback(
    async (
      email: string,
      password: string,
      _captchaToken?: string | null,
    ): Promise<{ error?: string }> => {
    if (email && password) {
      setIsLoggedIn(true);
      sessionStorage.setItem('sja_auth', 'true');
      return {};
    }
    return { error: 'Email atau kata sandi salah' };
  }, []);

  const logout = useCallback(async () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('sja_auth');
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      role: isLoggedIn ? 'admin' : 'public',
      user: null,
      accessToken: null,
      loading: false,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export: pilih provider berdasarkan konfigurasi
// ─────────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured()) {
    return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
  }
  return <MockAuthProvider>{children}</MockAuthProvider>;
}

export const useAuth = () => useContext(AuthContext);
