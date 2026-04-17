import { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { DangerAlarm } from './DangerAlarm';
import { useLiveData } from '@/lib/liveDataContext';
import { useIsMobile } from '@/hooks/use-mobile';

const SIDEBAR_LS_KEY = 'sja_sidebar_open';

function getInitialOpen(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(SIDEBAR_LS_KEY);
  if (stored !== null) return stored === 'true';
  // No stored preference: desktop open, tablet collapsed
  return window.innerWidth >= 1024;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { devices, lastUpdated } = useLiveData();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState<boolean>(getInitialOpen);

  // Re-evaluate default when crossing tablet/desktop breakpoint if user has no explicit pref
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (localStorage.getItem(SIDEBAR_LS_KEY) === null) {
        setOpen(mql.matches);
      }
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    localStorage.setItem(SIDEBAR_LS_KEY, String(next));
  };

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <DangerAlarm devices={devices} />
      <div className="flex min-h-screen w-full bg-background">
        {!isMobile && <AppSidebar />}
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar lastUpdated={lastUpdated} showSidebarTrigger={!isMobile} />
          <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
