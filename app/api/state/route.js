import { NextResponse } from 'next/server';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

// GET  /api/state  -> the caller's saved workspace state (cross-device sync)
// PUT  /api/state  -> upsert the caller's workspace state
// Auth required (Bearer token). Each user can only ever touch their own row.

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('user_states')
    .select('state')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ state: data?.state || null });
}

export async function PUT(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { state } = await req.json().catch(() => ({}));
  if (!state || typeof state !== 'object') {
    return NextResponse.json({ error: 'Invalid state payload' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('user_states')
    .upsert(
      { user_id: user.id, state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
