-- 0001: Tables
-- Run this file first in Supabase -> SQL Editor.

create extension if not exists pgcrypto;

-- Users (one row per Supabase auth user)
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  telegram_id   bigint unique,
  full_name     text not null default '',
  username      text,
  photo_url     text,
  phone         text,
  role          text not null default 'student' check (role in ('student', 'admin')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

-- Content
create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  description   text not null default '',
  cover_url     text,
  position      int not null default 0,
  is_published  boolean not null default false,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.modules (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses (id) on delete cascade,
  title         text not null,
  position      int not null default 0,
  is_published  boolean not null default false,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index modules_course_idx on public.modules (course_id, position);

-- Lesson metadata (title, order, flags). Visible in the learning path to every logged-in user.
create table public.lessons (
  id              uuid primary key default gen_random_uuid(),
  module_id       uuid not null references public.modules (id) on delete cascade,
  title           text not null,
  slug            text not null unique,
  position        int not null default 0,
  is_free_preview boolean not null default false,
  is_published    boolean not null default false,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index lessons_module_idx on public.lessons (module_id, position);

-- Lesson body (video + text). Separate table so RLS can hide it from students without access.
create table public.lesson_content (
  lesson_id    uuid primary key references public.lessons (id) on delete cascade,
  youtube_url  text,
  content_md   text not null default '',
  updated_at   timestamptz not null default now()
);

-- Access
create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  access_type  text not null default 'manual' check (access_type in ('one_time', 'monthly', 'manual')),
  note         text,
  granted_by   uuid references public.profiles (id) on delete set null,
  granted_at   timestamptz not null default now(),
  expires_at   timestamptz,
  revoked_at   timestamptz,
  revoked_by   uuid references public.profiles (id) on delete set null
);
-- At most one active enrollment per student per course
create unique index enrollments_one_active on public.enrollments (user_id, course_id) where revoked_at is null;

create table public.lesson_progress (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  status        text not null default 'started' check (status in ('started', 'completed')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  primary key (user_id, lesson_id)
);

-- Logged-in devices (max 2 active per student)
create table public.device_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  device_id        text not null,
  auth_session_id  uuid,
  user_agent       text,
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  revoked_at       timestamptz,
  revoked_reason   text check (revoked_reason in ('limit', 'user', 'admin', 'logout'))
);
create unique index device_sessions_one_active on public.device_sessions (user_id, device_id) where revoked_at is null;
create index device_sessions_user_idx on public.device_sessions (user_id, last_seen_at);

-- Practice (used from Phase 3)
create table public.datasets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  table_name    text not null unique check (table_name ~ '^[a-z_][a-z0-9_]*$'),
  storage_path  text not null,
  columns       jsonb not null default '[]'::jsonb,
  row_count     int not null default 0,
  created_at    timestamptz not null default now()
);

-- What students see about an exercise
create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  prompt_md    text not null default '',
  dataset_ids  uuid[] not null default '{}',
  points       int not null default 10,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index exercises_lesson_idx on public.exercises (lesson_id, position);

-- The answer key. Students have NO access to this table (not even through the API).
create table public.exercise_keys (
  exercise_id      uuid primary key references public.exercises (id) on delete cascade,
  reference_sql    text not null default '',
  expected_result  jsonb,
  check_rules      jsonb not null default '[]'::jsonb,
  hints            jsonb not null default '{}'::jsonb
);

create table public.exercise_submissions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  exercise_id    uuid not null references public.exercises (id) on delete cascade,
  submitted_sql  text not null,
  passed_checks  int not null default 0,
  total_checks   int not null default 0,
  is_correct     boolean not null default false,
  created_at     timestamptz not null default now()
);
create index exercise_submissions_user_idx on public.exercise_submissions (user_id, exercise_id, created_at desc);

-- Every admin action
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
