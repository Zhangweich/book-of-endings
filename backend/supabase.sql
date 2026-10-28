-- Counting service for The Book of Endings (Supabase / PostgreSQL).
-- Visitors may add submissions but never read them; only aggregate counts are public.
-- Each participant counts once, with their most recent submission.

create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  participant_id uuid not null,
  nickname text check (nickname is null or char_length(nickname) <= 40),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 20),
  stop jsonb check (stop is null or jsonb_typeof(stop) = 'object'),
  endpoint text check (endpoint is null or char_length(endpoint) <= 40),
  framework text not null check (char_length(framework) <= 20),
  language text check (language is null or char_length(language) <= 10),
  created_at timestamptz not null default now()
);
create index if not exists submissions_latest on public.submissions (participant_id, created_at desc);

alter table public.submissions enable row level security;
drop policy if exists "visitors may add a submission" on public.submissions;
create policy "visitors may add a submission" on public.submissions for insert to anon, authenticated with check (true);
-- No select policy: raw rows, including emails, are readable only from the project dashboard.

create or replace view public.choice_counts as
with latest as (
  select distinct on (participant_id) answers, stop
  from public.submissions
  order by participant_id, created_at desc
)
select step->>'question' as question, step->>'option' as option, count(*)::int as people
from latest cross join jsonb_array_elements(latest.answers) as step
group by 1, 2
union all
select stop->>'question', '+' || (stop->>'type'), count(*)::int
from latest
where stop is not null
group by 1, 2;

create or replace view public.participant_total as
select count(distinct participant_id)::int as people from public.submissions;

revoke all on public.choice_counts, public.participant_total from anon, authenticated;
grant select on public.choice_counts, public.participant_total to anon, authenticated;

-- Paths added by visitors appear only after the initiator approves them.
-- Visitors can read approved paths; only the project owner can write them.
create table if not exists public.community_paths (
  id bigint generated always as identity primary key,
  at text not null check (char_length(at) <= 40),
  question text check (question is null or char_length(question) <= 40),
  label text not null check (char_length(label) between 1 and 120),
  label_en text check (label_en is null or char_length(label_en) <= 160),
  note text check (note is null or char_length(note) <= 2000),
  contributors text[] not null default '{}' check (cardinality(contributors) <= 50),
  approved_at timestamptz not null default now()
);
alter table public.community_paths enable row level security;
drop policy if exists "approved paths are public" on public.community_paths;
create policy "approved paths are public" on public.community_paths for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.community_paths from anon, authenticated;

-- Review list for the owner only (dashboard or SQL editor); never exposed to visitors.
create or replace view public.proposals_for_review with (security_invoker = true) as
select s.id as submission_id, s.created_at, s.stop->>'at' as at, s.stop->>'question' as question,
       s.stop->>'label' as label, s.stop->>'reason' as reason, s.nickname,
       exists (select 1 from public.community_paths c
               where c.at = s.stop->>'at' and lower(c.label) = lower(s.stop->>'label')) as already_approved
from public.submissions s
where s.stop->>'type' = 'proposal'
order by s.created_at desc;
revoke all on public.proposals_for_review from anon, authenticated;

-- Approve one proposal: copies it into community_paths, crediting everyone who proposed the same path.
create or replace function public.approve_proposal(submission bigint, final_label text default null, english_label text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  names text[];
  new_id bigint;
begin
  select * into s from public.submissions where id = submission and stop->>'type' = 'proposal';
  if not found then
    raise exception 'No proposal with submission id %', submission;
  end if;
  select coalesce(array_agg(distinct p.nickname) filter (where p.nickname is not null), '{}') into names
  from public.submissions p
  where p.stop->>'type' = 'proposal' and p.stop->>'at' = s.stop->>'at' and lower(p.stop->>'label') = lower(s.stop->>'label');
  insert into public.community_paths (at, question, label, label_en, note, contributors)
  values (s.stop->>'at', s.stop->>'question', coalesce(nullif(trim(final_label), ''), s.stop->>'label'),
          nullif(trim(english_label), ''), nullif(s.stop->>'reason', ''), names)
  returning id into new_id;
  return new_id;
end
$$;
revoke execute on function public.approve_proposal(bigint, text, text) from public, anon, authenticated;
