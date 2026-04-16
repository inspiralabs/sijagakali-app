import { useState } from 'react';
import { Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email, password);
    if (success) {
      toast.success('Berhasil masuk sebagai Admin');
      navigate('/dashboard');
    } else {
      toast.error('Email atau kata sandi salah');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border bg-card p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Waves className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SiJagaAir</h1>
          <p className="text-xs text-muted-foreground">Login Admin — Early Warning System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@sijagaair.id"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Kata Sandi</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Masuk
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/public" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            ← Kembali ke Dashboard Publik
          </Link>
        </div>
      </Card>
    </div>
  );
}
