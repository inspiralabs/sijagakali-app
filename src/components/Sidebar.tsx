import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, Bell, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/devices', label: 'Perangkat', icon: Server },
  { to: '/alerts', label: 'Peringatan', icon: Bell },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Waves className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-foreground">SiJagaAir</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(item => {
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
