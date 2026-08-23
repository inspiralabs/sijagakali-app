import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_SIJAGAKALIAPI_URL ?? '';
const POLL_MS = 5_000;

export default function DemoModeBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/mock-data/chart/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { active: boolean };
        if (!cancelled) setActive(data.active);
      } catch {
        // abaikan kegagalan poll — banner cukup tidak tampil
      }
    };
    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-400">
      ⚠️ MODE DEMO AKTIF — data tidak mencerminkan kondisi asli
    </div>
  );
}
