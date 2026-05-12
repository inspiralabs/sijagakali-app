import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './sijagaairEnv';

let client: SupabaseClient | null = null;

/** Client PostgREST schema `sijagaair`; null jika env belum diisi. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        db: { schema: 'sijagaair' },
        auth: { persistSession: true, autoRefreshToken: true },
      }
    );
  }
  return client;
}
