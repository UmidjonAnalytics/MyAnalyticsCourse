-- 0007: lesson duration, discussions, Excel assignments with answer checking.
-- Run after 0006.

-- ============================================================
-- Lesson duration (shown in the learning path and lesson header)
-- ============================================================

alter table public.lessons add column if not exists duration_minutes integer check (duration_minutes between 0 and 600);

-- ============================================================
-- Discussions: comments under a lesson (one level of replies)
-- ============================================================

create table if not exists public.lesson_comments (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  parent_id  uuid references public.lesson_comments (id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists lesson_comments_lesson_idx on public.lesson_comments (lesson_id, created_at desc);
create index if not exists lesson_comments_parent_idx on public.lesson_comments (parent_id);

drop trigger if exists lesson_comments_updated_at on public.lesson_comments;
create trigger lesson_comments_updated_at before update on public.lesson_comments for each row execute function public.set_updated_at();

-- Replies may not have replies (keeps threads readable).
create or replace function public.lesson_comments_check_parent()
returns trigger language plpgsql as $$
begin
  if new.parent_id is not null and exists (
    select 1 from public.lesson_comments p where p.id = new.parent_id and (p.parent_id is not null or p.lesson_id <> new.lesson_id)
  ) then
    raise exception 'bad_parent';
  end if;
  return new;
end $$;
drop trigger if exists lesson_comments_parent on public.lesson_comments;
create trigger lesson_comments_parent before insert on public.lesson_comments for each row execute function public.lesson_comments_check_parent();

alter table public.lesson_comments enable row level security;
grant select, insert, update on public.lesson_comments to authenticated;

drop policy if exists lesson_comments_select on public.lesson_comments;
create policy lesson_comments_select on public.lesson_comments for select to authenticated
  using (public.can_view_lesson(lesson_id));
drop policy if exists lesson_comments_insert on public.lesson_comments;
create policy lesson_comments_insert on public.lesson_comments for insert to authenticated
  with check (user_id = auth.uid() and deleted_at is null and public.can_view_lesson(lesson_id));
-- Authors "delete" (soft delete) their own comments; admins moderate any.
drop policy if exists lesson_comments_update on public.lesson_comments;
create policy lesson_comments_update on public.lesson_comments for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Only body/deleted_at can be changed from the browser.
revoke update on public.lesson_comments from authenticated;
grant update (body, deleted_at) on public.lesson_comments to authenticated;

-- Comments with the author's public name/avatar (profiles themselves stay private).
create or replace function public.lesson_comments_list(p_lesson_id uuid)
returns table (
  id uuid, parent_id uuid, body text, created_at timestamptz, deleted boolean,
  user_id uuid, author_name text, author_avatar text, author_is_admin boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.parent_id,
         case when c.deleted_at is null then c.body else '' end,
         c.created_at, c.deleted_at is not null,
         c.user_id, coalesce(nullif(p.full_name, ''), 'Talaba'), p.avatar_url, p.role = 'admin'
  from public.lesson_comments c
  join public.profiles p on p.id = c.user_id
  where c.lesson_id = p_lesson_id and public.can_view_lesson(p_lesson_id)
  order by c.created_at;
$$;
revoke execute on function public.lesson_comments_list(uuid) from public, anon;
grant execute on function public.lesson_comments_list(uuid) to authenticated;

-- ============================================================
-- Excel assignments: embedded workbook + questions answered in input boxes
-- ============================================================

create table if not exists public.assignments (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  title           text not null,
  instructions_md text not null default '',
  embed_url       text,          -- OneDrive / Excel Online / Google Sheets embed link
  file_path       text,          -- uploaded .xlsx in the private "assignment-files" bucket
  allow_download  boolean not null default false,
  points          integer not null default 10 check (points >= 0),
  position        integer not null default 0,
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);
create index if not exists assignments_lesson_idx on public.assignments (lesson_id, position);

create table if not exists public.assignment_questions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  position      integer not null default 0,
  prompt        text not null,
  answer_type   text not null default 'number' check (answer_type in ('number', 'text')),
  placeholder   text not null default '',
  hint          text not null default ''
);
create index if not exists assignment_questions_idx on public.assignment_questions (assignment_id, position);

-- Correct answers: admins only; checked on the server.
create table if not exists public.assignment_answer_keys (
  question_id    uuid primary key references public.assignment_questions (id) on delete cascade,
  answers        text[] not null default '{}',   -- any of these is accepted
  tolerance      numeric not null default 0,     -- numbers: allowed difference
  case_sensitive boolean not null default false  -- text answers
);

create table if not exists public.assignment_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  answers       jsonb not null,
  results       jsonb not null,
  correct       integer not null,
  total         integer not null,
  passed        boolean not null,
  created_at    timestamptz not null default now()
);
create index if not exists assignment_submissions_user_idx on public.assignment_submissions (user_id, assignment_id, created_at desc);

drop trigger if exists assignments_updated_at on public.assignments;
create trigger assignments_updated_at before update on public.assignments for each row execute function public.set_updated_at();

create or replace function public.can_view_assignment(p_assignment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id and a.is_published and a.archived_at is null and public.can_view_lesson(a.lesson_id));
$$;

grant select on public.assignments, public.assignment_questions, public.assignment_submissions to authenticated;
grant insert, update, delete on public.assignments, public.assignment_questions, public.assignment_answer_keys to authenticated;
grant select on public.assignment_answer_keys to authenticated;  -- RLS: admins only

alter table public.assignments            enable row level security;
alter table public.assignment_questions   enable row level security;
alter table public.assignment_answer_keys enable row level security;
alter table public.assignment_submissions enable row level security;

drop policy if exists assignments_select on public.assignments;
create policy assignments_select on public.assignments for select to authenticated using (public.can_view_assignment(id));
drop policy if exists assignments_admin on public.assignments;
create policy assignments_admin on public.assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists assignment_questions_select on public.assignment_questions;
create policy assignment_questions_select on public.assignment_questions for select to authenticated using (public.can_view_assignment(assignment_id));
drop policy if exists assignment_questions_admin on public.assignment_questions;
create policy assignment_questions_admin on public.assignment_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists assignment_answer_keys_admin on public.assignment_answer_keys;
create policy assignment_answer_keys_admin on public.assignment_answer_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists assignment_submissions_select on public.assignment_submissions;
create policy assignment_submissions_select on public.assignment_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Private bucket for uploaded workbooks (shown through short-lived signed links).
insert into storage.buckets (id, name, public, file_size_limit)
values ('assignment-files', 'assignment-files', false, 20 * 1024 * 1024)
on conflict (id) do nothing;

drop policy if exists assignment_files_admin_read on storage.objects;
create policy assignment_files_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'assignment-files' and public.is_admin());
drop policy if exists assignment_files_admin_insert on storage.objects;
create policy assignment_files_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'assignment-files' and public.is_admin());
drop policy if exists assignment_files_admin_delete on storage.objects;
create policy assignment_files_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'assignment-files' and public.is_admin());
