import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';

// GET /api/shares/slug/[slug]  — PUBLIC (no auth). Respondents fetch the
// interview content here. Returns 410 if the link is closed (ended early
// or cap reached) and 404 if it doesn't exist.

export async function GET(req, { params }) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('shared_interviews')
    .select('slug, title, company, questions, max_respondents, is_active, responses_count')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const closed = !data.is_active || data.responses_count >= data.max_respondents;
  if (closed) {
    return NextResponse.json(
      { closed: true, company: data.company, title: data.title },
      { status: 410 }
    );
  }

  return NextResponse.json({
    slug: data.slug,
    title: data.title,
    company: data.company,
    questions: data.questions,
  });
}
