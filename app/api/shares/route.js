import { NextResponse } from 'next/server';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

// GET  /api/shares  -> list the caller's shared links (with live counts)
// POST /api/shares  -> create a new shared link {title, company, questions, max_respondents}
// Auth required — creators only.

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('shared_interviews')
    .select('id, slug, title, company, questions, max_respondents, is_active, responses_count, created_at, closed_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, company, questions, max_respondents } = await req.json().catch(() => ({}));
  if (!company || !Array.isArray(questions) || !questions.length) {
    return NextResponse.json({ error: 'Company and at least one question are required.' }, { status: 400 });
  }
  const cap = Math.max(1, Math.min(10000, parseInt(max_respondents) || 1));

  const supabase = getServiceClient();
  const slug = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const { data, error } = await supabase
    .from('shared_interviews')
    .insert({
      owner_id: user.id,
      slug,
      title: (title || company + ' Interview').slice(0, 200),
      company: company.slice(0, 200),
      questions,
      max_respondents: cap,
      responses_count: 0,
      is_active: true,
      closed_at: null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
