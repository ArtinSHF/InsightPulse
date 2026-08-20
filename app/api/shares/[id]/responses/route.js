import { NextResponse } from 'next/server';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

// GET /api/shares/[id]/responses -> all responses for a link. OWNER ONLY —
// results are never visible to anyone but the logged-in creator.

export async function GET(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();

  // Verify ownership first.
  const { data: share, error: sErr } = await supabase
    .from('shared_interviews')
    .select('id, title, company, questions, max_respondents, is_active, responses_count')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: rows, error } = await supabase
    .from('interview_responses')
    .select('id, answers, submitted_at')
    .eq('share_id', params.id)
    .order('submitted_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach the share (questions snapshot) so the client can aggregate.
  const out = (rows || []).map((r) => ({ ...r, share }));
  return NextResponse.json(out);
}
