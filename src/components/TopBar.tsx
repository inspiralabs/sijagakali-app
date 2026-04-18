import { Waves, LogOut, User, Sun, Moon, Volume2, VolumeX, Siren } from 'lucide-react';
import { formatWIB } from '@/lib/mockData';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTheme } from '@/lib/themeContext';
import { useSiren } from '@/lib/sirenContext';
import { useAuth } from '@/lib/authContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface TopBarProps {
  lastUpdated: string;
  onLogout?: () => void;
  showSidebarTrigger?: boolean;
}

export function TopBar({ lastUpdated, onLogout, showSidebarTrigger }: TopBarProps) {
  const { theme, toggle } = useTheme();
  const { enabled, muted, setEnabled, setMuted } = useSiren();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        {showSidebarTrigger && <SidebarTrigger className="lg:flex" />}
        <div className="flex items-center gap-2">
          <Waves className="h-6 w-6 text-primary lg:hidden" />
          <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg lg:hidden">
            SiJagaAir
          </h1>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">Early Warning System</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-live-dot absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="hidden sm:inline">LIVE</span>
        </div>
        <span className="text-xs text-muted-foreground hidden md:inline">
          Update: {formatWIB(lastUpdated)}
        </span>

        {/* Admin: enable/disable global siren */}
        {isAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={enabled ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = !enabled;
                  setEnabled(next);
                  toast.success(next ? 'Sirine diaktifkan (admin)' : 'Sirine dinonaktifkan (admin)');
                }}
                aria-label="Toggle siren (admin)"
              >
                <Siren className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {enabled ? 'Sirine AKTIF — klik untuk matikan (admin)' : 'Sirine NONAKTIF — klik untuk aktifkan (admin)'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* User: mute siren locally */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMuted(!muted)}
              disabled={!enabled}
              aria-label="Mute siren"
            >
              {muted || !enabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {!enabled ? 'Sirine dinonaktifkan admin' : muted ? 'Bunyi dimatikan — klik untuk nyalakan' : 'Bunyi aktif — klik untuk mute'}
          </TooltipContent>
        </Tooltip>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {onLogout && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
