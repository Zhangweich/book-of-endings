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
