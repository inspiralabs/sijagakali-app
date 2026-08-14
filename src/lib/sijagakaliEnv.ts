/** True jika frontend boleh memakai Supabase (schema `sijagakali`). */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      typeof url === 'string' &&
      typeof key === 'string' &&
      url.startsWith('http')
  );
}

export function getDefaultDeploymentSlug(): string {
  return import.meta.env.VITE_DEFAULT_DEPLOYMENT_SLUG || 'sijagakali-bojong-kulur';
}
