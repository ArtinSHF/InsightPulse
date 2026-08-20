import { NextResponse } from 'next/server';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

// PATCH /api/shares/[id]  { is_active }  -> end an interview early / reopen it.
// Owner only.

export async function PATCH(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { is_active } = await req.json().catch(() => ({}));
  if (typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const patch = { is_active };
  if (!is_active) patch.closed_at = new Date().toISOString();
  else patch.closed_at = null;

  const { data, error } = await supabase
    .from('shared_interviews')
    .update(patch)
    .eq('id', params.id)
    .eq('owner_id', user.id) // ownership enforcement
    .select('id, is_active')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('shared_interviews')
    .delete()
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
