import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './sijagakaliEnv';

const makeClient = () =>
  createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    db: { schema: 'sijagakali' },
    auth: { persistSession: true, autoRefreshToken: true },
  });

export type SijagakaliClient = ReturnType<typeof makeClient>;

let client: SijagakaliClient | null = null;

/** Client PostgREST schema `sijagakali`; null jika env belum diisi. */
export function getSupabase(): SijagakaliClient | null {
  if (!isSupabaseConfigured()) return null;
  client ??= makeClient();
  return client;
}
