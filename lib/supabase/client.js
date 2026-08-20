import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client (uses the public anon key — safe to expose;
// all data access is still governed by Row Level Security).
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
