-- 0002: Helper functions and triggers
-- Run after 0001.

-- Is the current user an admin? (security definer avoids RLS recursion on profiles)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Does the current user have active access to a course?
create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.enrollments e
    where e.user_id = (select auth.uid())
      and e.course_id = p_course_id
      and e.revoked_at is null
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Course id for a lesson
create or replace function public.lesson_course_id(p_lesson_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.course_id
  from public.lessons l join public.modules m on m.id = l.module_id
  where l.id = p_lesson_id;
$$;

-- Is a lesson visible in the learning path (published and nothing above it archived/unpublished)?
create or replace function public.lesson_is_visible(p_lesson_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = p_lesson_id
      and l.is_published and l.archived_at is null
      and m.is_published and m.archived_at is null
      and c.is_published and c.archived_at is null
  );
$$;

-- Can the current user open the lesson body (video + text)?
create or replace function public.can_view_lesson_content(p_lesson_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or (
    public.lesson_is_visible(p_lesson_id)
    and (
      exists (select 1 from public.lessons where id = p_lesson_id and is_free_preview)
      or public.has_course_access(public.lesson_course_id(p_lesson_id))
    )
  );
$$;

-- Students may edit their own name/phone, but never role, telegram data or dates.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' and not public.is_admin() then
    new.role         := old.role;
    new.telegram_id  := old.telegram_id;
    new.username     := old.username;
    new.photo_url    := old.photo_url;
    new.created_at   := old.created_at;
    new.last_seen_at := old.last_seen_at;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger modules_updated_at before update on public.modules for each row execute function public.set_updated_at();
create trigger lessons_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger lesson_content_updated_at before update on public.lesson_content for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Device sessions
-- ---------------------------------------------------------------------------

-- Revoke one device session and kill its Supabase login (refresh token).
-- Server only (service role).
create or replace function public.revoke_device_session(p_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_auth_session uuid;
begin
  update public.device_sessions
     set revoked_at = now(), revoked_reason = p_reason
   where id = p_id and revoked_at is null
  returning auth_session_id into v_auth_session;

  if v_auth_session is not null then
    begin
      delete from auth.sessions where id = v_auth_session;
    exception when others then
      -- If Supabase does not allow this, the app-level check still blocks the device.
      null;
    end;
  end if;
end;
$$;

-- Record a login from a device and keep at most p_limit active devices
-- (the least recently used ones are logged out). Server only (service role).
create or replace function public.register_device_session(
  p_user_id uuid,
  p_device_id text,
  p_auth_session_id uuid,
  p_user_agent text,
  p_limit int default 2
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_old record;
  v_existing uuid;
begin
  -- Same browser logging in again: replace its old session.
  select id into v_existing from public.device_sessions
   where user_id = p_user_id and device_id = p_device_id and revoked_at is null;
  if v_existing is not null then
    perform public.revoke_device_session(v_existing, 'logout');
  end if;

  insert into public.device_sessions (user_id, device_id, auth_session_id, user_agent)
  values (p_user_id, p_device_id, p_auth_session_id, left(p_user_agent, 500));

  for v_old in
    select id from public.device_sessions
     where user_id = p_user_id and revoked_at is null
     order by last_seen_at desc, created_at desc
     offset greatest(p_limit, 1)
  loop
    perform public.revoke_device_session(v_old.id, 'limit');
  end loop;

  update public.profiles set last_seen_at = now() where id = p_user_id;
end;
$$;

-- Called by the app on page loads: is this device still allowed? Also updates "last seen"
-- (at most once a minute). Returns false if the device was logged out.
create or replace function public.touch_device_session(p_device_id text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_last timestamptz;
begin
  select id, last_seen_at into v_id, v_last
    from public.device_sessions
   where user_id = (select auth.uid()) and device_id = p_device_id and revoked_at is null;

  if v_id is null then
    return false;
  end if;

  if v_last < now() - interval '1 minute' then
    update public.device_sessions set last_seen_at = now() where id = v_id;
    update public.profiles set last_seen_at = now() where id = (select auth.uid());
  end if;
  return true;
end;
$$;

-- Permissions: helpers for logged-in users; device management for the server only.
revoke all on function public.revoke_device_session(uuid, text) from public, anon, authenticated;
revoke all on function public.register_device_session(uuid, text, uuid, text, int) from public, anon, authenticated;
grant execute on function public.revoke_device_session(uuid, text) to service_role;
grant execute on function public.register_device_session(uuid, text, uuid, text, int) to service_role;

revoke all on function public.touch_device_session(text) from public, anon;
grant execute on function public.touch_device_session(text) to authenticated;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.has_course_access(uuid) from public, anon;
revoke all on function public.lesson_course_id(uuid) from public, anon;
revoke all on function public.lesson_is_visible(uuid) from public, anon;
revoke all on function public.can_view_lesson_content(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.has_course_access(uuid) to authenticated, service_role;
grant execute on function public.lesson_course_id(uuid) to authenticated, service_role;
grant execute on function public.lesson_is_visible(uuid) to authenticated, service_role;
grant execute on function public.can_view_lesson_content(uuid) to authenticated, service_role;
