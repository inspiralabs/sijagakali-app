/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEFAULT_DEPLOYMENT_SLUG?: string;
  /** URL base Fastify API (mis. http://localhost:3100 atau https://api.sijagaair.id) */
  readonly VITE_SIJAGAAIRAPI_URL?: string;
  /** Cloudflare Turnstile site key (publik). Wajib jika Supabase Auth → Attack Protection pakai Turnstile. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
