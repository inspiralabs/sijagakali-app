import { useMemo } from 'react';
import { DeviceCard } from '@/components/DeviceCard';
import { WaterChart } from '@/components/WaterChart';
import { AlertLog } from '@/components/AlertLog';
import { SummaryCards } from '@/components/SummaryCards';
import { DangerAlarm } from '@/components/DangerAlarm';
import { CctvPanel } from '@/components/CctvPanel';
import { LogIn, Sun, Moon, Volume2, VolumeX, MapPin, Radio } from 'lucide-react';
import { AppBrandLogo } from '@/components/AppBrandLogo';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLiveData } from '@/lib/liveDataContext';
import { useTheme } from '@/lib/themeContext';
import { useSiren } from '@/lib/sirenContext';
import { formatWIB } from '@/lib/utils';
import { getPublicMonitoringGridClass } from '@/lib/publicMonitoringLayout';

export default function PublicDashboard() {
  const { devices, alerts, histories, lastUpdated, supabaseError } = useLiveData();
  const { theme, toggle } = useTheme();
  const { enabled, muted, setMuted } = useSiren();

  const gridClass = useMemo(() => getPublicMonitoringGridClass(devices.length), [devices.length]);

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35] dark:opacity-[0.22]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 85% 55% at 50% -12%, hsl(var(--primary) / 0.18), transparent 55%),
            radial-gradient(ellipse 60% 45% at 100% 0%, hsl(195 65% 42% / 0.12), transparent 50%),
            radial-gradient(ellipse 50% 40% at 0% 100%, hsl(160 45% 38% / 0.1), transparent 45%)
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.04] dark:opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'%3E%3Cg fill='none' stroke='%23000' stroke-opacity='1'%3E%3Cpath d='M0 44h88M44 0v88'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '88px 88px',
        }}
      />

      <DangerAlarm devices={devices} />
      {supabaseError && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          Koneksi data: {supabaseError}
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 px-4 py-3 shadow-sm backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-primary/12 p-1.5 ring-1 ring-primary/20 sm:p-2">
              <AppBrandLogo
                className="h-7 w-7 sm:h-[clamp(1.75rem,4.5vw,2.25rem)] sm:w-[clamp(1.75rem,4.5vw,2.25rem)] md:h-10 md:w-10"
                alt=""
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">SiJagaAir</h1>
              <p className="text-[13px] text-muted-foreground">Early Warning System - Desa Bojong Kulur</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-live-dot absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <span className="hidden sm:inline">LIVE</span>
            </div>
            <span className="hidden text-xs text-muted-foreground md:inline">
              Update: {formatWIB(lastUpdated)}
            </span>
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/login">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <LogIn className="h-3.5 w-3.5" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-6">
        <SummaryCards devices={devices} />

        <section
          className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm ring-1 ring-black/[0.03] dark:bg-card/50 dark:ring-white/[0.06]"
          aria-labelledby="public-monitoring-heading"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/[0.09] blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-cyan-500/[0.06] blur-3xl dark:bg-cyan-400/[0.09]" aria-hidden />

          <div className="relative border-b border-border/60 bg-gradient-to-r from-secondary/40 via-transparent to-secondary/30 px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div>
                  <h2 id="public-monitoring-heading" className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                    Titik pantau
                  </h2>
                  <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-muted-foreground sm:text-xs">
                    Pantau level air di berbagai titik lokasi
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
                  <Radio className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    <span className="tabular-nums font-semibold text-foreground">{devices.length}</span>
                    {' '}
                    titik pantau
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {devices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/25 px-6 py-14 text-center">
                <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">Belum ada titik pantau aktif</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Data perangkat akan tampil di sini setelah konfigurasi.
                </p>
              </div>
            ) : (
              <div className={gridClass}>
                {devices.map((d, i) => (
                  <div
                    key={d.id}
                    className="min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-forwards"
                    style={{ animationDelay: `${Math.min(i, 10) * 70}ms` }}
                  >
                    <DeviceCard device={d} publicView embedCctv={false} className="h-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <CctvPanel devices={devices} showAdminLinks={false} emphasis />

        <section
          className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/50 p-4 shadow-sm ring-1 ring-black/[0.03] dark:bg-card/40 dark:ring-white/[0.06] sm:p-5"
          aria-labelledby="public-tren-peringatan-heading"
        >
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-primary/[0.08] blur-3xl" aria-hidden />
          <div className="relative mb-5 border-b border-border/60 pb-4">
            <h2
              id="public-tren-peringatan-heading"
              className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
            >
              Tren & peringatan
            </h2>
            <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-muted-foreground sm:text-xs">
              Historis level air dan peristiwa terbaru
            </p>
          </div>
          <div className="relative grid gap-6 lg:grid-cols-[7fr_3fr] lg:items-stretch lg:gap-6 xl:gap-8">
            <div className="min-h-0 min-w-0 lg:min-h-[22rem]">
              <WaterChart devices={devices} histories={histories} className="h-full" />
            </div>
            <div className="min-h-0 min-w-0 lg:min-h-[22rem]">
              <AlertLog alerts={alerts.slice(0, 5)} className="h-full" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/80 px-4 py-4 text-center text-xs text-muted-foreground backdrop-blur-sm">
        © {new Date().getFullYear()} Nawa Inspira Digital · Sistem Informasi Jaga Air
      </footer>
    </div>
  );
}
