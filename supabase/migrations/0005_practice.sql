-- 0005: Phase 4 — datasets, SQL exercises, answer keys, submissions.
-- Run after 0004.

-- ============================================================
-- Datasets: tables students query in the browser. Files live in a PRIVATE bucket and are
-- only handed out as short-lived signed URLs to students who can open a lesson that uses them.
-- ============================================================

create table public.datasets (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                         -- display name
  table_name   text not null unique check (table_name ~ '^[a-z][a-z0-9_]{0,62}$'),  -- name used in SQL
  description  text not null default '',
  storage_path text not null,                         -- object path in the "datasets" bucket (Parquet)
  columns      jsonb not null default '[]'::jsonb,    -- [{"name": "...", "type": "..."}]
  row_count    integer not null default 0,
  preview      jsonb not null default '[]'::jsonb,    -- first 20 rows (admin preview)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  title        text not null,
  task_md      text not null default '',
  points       integer not null default 10 check (points >= 0),
  position     integer not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);
create index exercises_lesson_idx on public.exercises (lesson_id, position);

create table public.exercise_datasets (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  dataset_id  uuid not null references public.datasets (id) on delete restrict,
  primary key (exercise_id, dataset_id)
);

-- The answer key. NEVER readable by students (no student policy; server reads it with the secret key).
create table public.exercise_keys (
  exercise_id   uuid primary key references public.exercises (id) on delete cascade,
  reference_sql text not null default '',
  expected      jsonb,                                -- {"columns": [...], "rows": [[...], ...]}
  -- [{"id": "...", "type": "row_count" | "columns" | "rows" | "column_sum",
  --   "label": "...", "hint": "...", "ordered": bool, "column": "...", "tolerance": number}]
  check_rules   jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);

create table public.exercise_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sql         text not null,
  passed      boolean not null,
  score       integer not null default 0,
  results     jsonb not null default '[]'::jsonb,     -- per-check pass/fail shown to the student
  created_at  timestamptz not null default now()
);
create index exercise_submissions_user_idx on public.exercise_submissions (user_id, exercise_id, created_at desc);

create trigger datasets_updated_at before update on public.datasets for each row execute function public.set_updated_at();
create trigger exercises_updated_at before update on public.exercises for each row execute function public.set_updated_at();
create trigger exercise_keys_updated_at before update on public.exercise_keys for each row execute function public.set_updated_at();

-- ============================================================
-- Access helpers
-- ============================================================

-- Can the current user open this exercise (published, and its lesson is viewable)?
create or replace function public.can_view_exercise(p_exercise_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.exercises x
    where x.id = p_exercise_id and x.is_published and x.archived_at is null
      and public.can_view_lesson(x.lesson_id)
  );
$$;

-- Can the current user load this dataset (used by at least one exercise they can open)?
create or replace function public.can_access_dataset(p_dataset_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.exercise_datasets ed
    where ed.dataset_id = p_dataset_id and public.can_view_exercise(ed.exercise_id)
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

grant select on public.datasets, public.exercises, public.exercise_datasets, public.exercise_submissions to authenticated;
grant insert, update, delete on public.datasets, public.exercises, public.exercise_datasets, public.exercise_keys to authenticated;
grant select on public.exercise_keys to authenticated;   -- RLS below allows admins only

alter table public.datasets             enable row level security;
alter table public.exercises            enable row level security;
alter table public.exercise_datasets    enable row level security;
alter table public.exercise_keys        enable row level security;
alter table public.exercise_submissions enable row level security;

create policy datasets_select on public.datasets for select to authenticated
  using (public.can_access_dataset(id));
create policy datasets_admin on public.datasets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy exercises_select on public.exercises for select to authenticated
  using (public.can_view_exercise(id));
create policy exercises_admin on public.exercises for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy exercise_datasets_select on public.exercise_datasets for select to authenticated
  using (public.can_view_exercise(exercise_id));
create policy exercise_datasets_admin on public.exercise_datasets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy exercise_keys_admin on public.exercise_keys for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Students read their own submissions. Only the server (secret key) writes them.
create policy exercise_submissions_select on public.exercise_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- Storage: PRIVATE bucket for dataset files (admins upload; students get signed URLs from the server)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('datasets', 'datasets', false, 50 * 1024 * 1024)
on conflict (id) do nothing;

create policy datasets_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'datasets' and public.is_admin());
create policy datasets_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'datasets' and public.is_admin());
create policy datasets_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'datasets' and public.is_admin());
create policy datasets_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'datasets' and public.is_admin());
