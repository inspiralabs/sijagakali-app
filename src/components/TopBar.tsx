import { Waves, LogOut, User, Sun, Moon, Volume2, VolumeX, Siren, Bell, BellOff, Play } from 'lucide-react';
import { formatWIB } from '@/lib/mockData';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTheme } from '@/lib/themeContext';
import { useSiren, SIREN_PATTERNS, SirenPattern } from '@/lib/sirenContext';
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
  const { enabled, muted, pattern, notifMuted, setEnabled, setMuted, setPattern, setNotifMuted, preview } = useSiren();
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

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mr-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-live-dot absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="hidden sm:inline">LIVE</span>
        </div>
        <span className="text-xs text-muted-foreground hidden md:inline mr-1">
          Update: {formatWIB(lastUpdated)}
        </span>

        {/* Admin: siren control + pattern picker */}
        {isAdmin && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={enabled ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Siren admin controls"
                  >
                    <Siren className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Kontrol sirine (admin)</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Sirine (Admin)</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  const next = !enabled;
                  setEnabled(next);
                  toast.success(next ? 'Sirine diaktifkan' : 'Sirine dinonaktifkan');
                }}
              >
                {enabled ? 'Nonaktifkan sirine' : 'Aktifkan sirine'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Pola Sirine</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={pattern}
                onValueChange={(v) => {
                  setPattern(v as SirenPattern);
                  toast.success(`Pola: ${SIREN_PATTERNS.find(p => p.value === v)?.label}`);
                }}
              >
                {SIREN_PATTERNS.map(p => (
                  <DropdownMenuRadioItem key={p.value} value={p.value}>
                    <div className="flex flex-col">
                      <span className="text-sm">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.description}</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (!enabled) { toast.error('Sirine nonaktif'); return; }
                  if (muted) { toast.error('Bunyi sirine di-mute'); return; }
                  preview();
                }}
              >
                <Play className="mr-2 h-4 w-4" /> Preview pola
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User: mute siren */}
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
            {!enabled ? 'Sirine dinonaktifkan admin' : muted ? 'Sirine di-mute — klik untuk nyalakan' : 'Sirine aktif — klik untuk mute'}
          </TooltipContent>
        </Tooltip>

        {/* User: mute notification beeps */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setNotifMuted(!notifMuted)}
              aria-label="Mute notifications"
            >
              {notifMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {notifMuted ? 'Bunyi notifikasi mati — klik untuk nyalakan' : 'Bunyi notifikasi aktif — klik untuk mute'}
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
