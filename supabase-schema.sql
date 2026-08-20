-- ============================================================
-- InsightPulse — Supabase schema
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> "New query".
-- ============================================================

-- 1) Per-account workspace state (the former localStorage blob).
--    One row per user; the whole legacy `State` object lives in `state`.
create table if not exists public.user_states (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_states enable row level security;

-- Defense in depth: even the anon/authenticated roles can only ever see
-- their own row (the app actually accesses this table via the service
-- role after verifying the caller's token, but RLS stays ON regardless).
create policy "users read own state"
  on public.user_states for select
  using (auth.uid() = user_id);

create policy "users upsert own state"
  on public.user_states for insert
  with check (auth.uid() = user_id);

create policy "users update own state"
  on public.user_states for update
  using (auth.uid() = user_id);


-- 2) Shared interview links created by a logged-in creator.
create table if not exists public.shared_interviews (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  slug             text not null unique,
  title            text not null default '',
  company          text not null default '',
  questions        jsonb not null default '[]'::jsonb,  -- snapshot at share time
  max_respondents  integer not null check (max_respondents > 0),
  responses_count  integer not null default 0,
  is_active        boolean not null default true,       -- false = ended early by creator
  created_at       timestamptz not null default now(),
  closed_at        timestamptz
);

create index if not exists shared_interviews_owner_idx on public.shared_interviews (owner_id);
create index if not exists shared_interviews_slug_idx  on public.shared_interviews (slug);

alter table public.shared_interviews enable row level security;

create policy "owners read own shares"
  on public.shared_interviews for select
  using (auth.uid() = owner_id);


-- 3) Anonymous respondent submissions.
create table if not exists public.interview_responses (
  id           uuid primary key default gen_random_uuid(),
  share_id     uuid not null references public.shared_interviews (id) on delete cascade,
  answers      jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists interview_responses_share_idx on public.interview_responses (share_id);

alter table public.interview_responses enable row level security;

-- No public policies: reads/writes happen only through the server (service
-- role) after the cap/ownership checks in the API routes.


-- 4) Atomic slot-claim: guarantees the respondent cap can never be
--    exceeded, even under concurrent submissions. `for update` locks the
--    share row for the duration of the transaction.
create or replace function public.claim_response_slot(p_slug text, p_answers jsonb)
returns table (ok boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share public.shared_interviews%rowtype;
begin
  select * into v_share
  from public.shared_interviews
  where slug = p_slug
  for update;

  if not found then
    return query select false;
    return;
  end if;

  if (not v_share.is_active) or (v_share.responses_count >= v_share.max_respondents) then
    return query select false;   -- closed: ended early or cap reached
    return;
  end if;

  insert into public.interview_responses (share_id, answers)
  values (v_share.id, p_answers);

  update public.shared_interviews
  set responses_count = responses_count + 1
  where id = v_share.id;

  return query select true;
end;
$$;

-- Lock down the function: callable only by the service role (server).
revoke all on function public.claim_response_slot(text, jsonb) from public;
revoke all on function public.claim_response_slot(text, jsonb) from anon, authenticated;
grant execute on function public.claim_response_slot(text, jsonb) to service_role;
