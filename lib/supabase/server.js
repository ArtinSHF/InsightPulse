import { createClient } from '@supabase/supabase-js';

// Service-role client — SERVER ONLY. Bypasses RLS, so it must never be
// imported by client components. Used to verify callers and enforce
// ownership in API routes.
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Verify a Supabase access token (sent as `Authorization: Bearer <token>`)
// and return the authenticated user, or null.
export async function getUserFromRequest(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
