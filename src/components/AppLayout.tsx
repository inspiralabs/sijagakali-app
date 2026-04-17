import { ReactNode, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { DangerAlarm } from './DangerAlarm';
import { useLiveData } from '@/lib/liveDataContext';
import { useIsMobile } from '@/hooks/use-mobile';

const SIDEBAR_LS_KEY = 'sja_sidebar_open';

function useDefaultSidebarOpen() {
  // Desktop ≥1024 → open, tablet 768-1023 → collapsed, mobile handled by Sheet.
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(SIDEBAR_LS_KEY);
  if (stored !== null) return stored === 'true';
  return window.innerWidth >= 1024;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { devices, lastUpdated } = useLiveData();
  const isMobile = useIsMobile();
  const defaultOpen = useDefaultSidebarOpen();

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      onOpenChange={(open) => localStorage.setItem(SIDEBAR_LS_KEY, String(open))}
    >
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
