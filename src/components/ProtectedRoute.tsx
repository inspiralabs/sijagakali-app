import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAuth();

  // Tunggu sesi Supabase dimuat sebelum memutuskan redirect
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Memuat sesi...</span>
      </div>
    );
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
