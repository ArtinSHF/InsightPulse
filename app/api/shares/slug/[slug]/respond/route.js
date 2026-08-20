import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';

// POST /api/shares/slug/[slug]/respond  { answers }  — PUBLIC (no auth).
// Atomically enforces the respondent cap via the claim_response_slot()
// Postgres function (see supabase-schema.sql), so concurrent submissions
// can never exceed max_respondents. Returns 410 when the interview is
// closed or full.

export async function POST(req, { params }) {
  const { answers } = await req.json().catch(() => ({}));
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'Invalid answers payload' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('claim_response_slot', {
    p_slug: params.slug,
    p_answers: answers,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.ok) {
    return NextResponse.json({ closed: true }, { status: 410 });
  }
  return NextResponse.json({ ok: true });
}
