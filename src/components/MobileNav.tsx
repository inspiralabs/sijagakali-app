import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, Bell, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/devices', label: 'Perangkat', icon: Server },
  { to: '/alerts', label: 'Alert', icon: Bell },
  { to: '/logs', label: 'Logs', icon: FileText },
  { to: '/admin/users', label: 'Admin', icon: Users },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
      <div className="flex overflow-x-auto snap-x snap-mandatory">
      {navItems.map(item => {
        const active = location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex min-w-[72px] flex-1 snap-start flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
