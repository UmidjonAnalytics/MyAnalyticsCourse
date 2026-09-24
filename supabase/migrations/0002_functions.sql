-- 0002: helper functions and triggers
-- Run after 0001.

-- ============================================================
-- Generic triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_updated_at  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger courses_updated_at   before update on public.courses   for each row execute function public.set_updated_at();
create trigger modules_updated_at   before update on public.modules   for each row execute function public.set_updated_at();
create trigger lessons_updated_at   before update on public.lessons   for each row execute function public.set_updated_at();
create trigger lesson_contents_updated_at before update on public.lesson_contents for each row execute function public.set_updated_at();
create trigger bundles_updated_at   before update on public.bundles   for each row execute function public.set_updated_at();
create trigger orders_updated_at    before update on public.orders    for each row execute function public.set_updated_at();
create trigger lesson_progress_updated_at before update on public.lesson_progress for each row execute function public.set_updated_at();

-- lessons.course_id always follows the lesson's module (also when a lesson is dragged to another module).
create or replace function public.lessons_set_course_id()
returns trigger language plpgsql as $$
begin
  select m.course_id into new.course_id from public.modules m where m.id = new.module_id;
  return new;
end $$;

create trigger lessons_course_id
  before insert or update of module_id on public.lessons
  for each row execute function public.lessons_set_course_id();

-- ============================================================
-- Access helpers (used by RLS policies)
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- Active enrollment = not revoked and not expired.
create or replace function public.has_course_access(p_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid()
      and e.course_id = p_course_id
      and e.revoked_at is null
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Can the current user open this lesson's content (video, text, exercises)?
create or replace function public.can_view_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = l.course_id
    where l.id = p_lesson_id
      and l.is_published and l.archived_at is null
      and m.is_published and m.archived_at is null
      and c.is_published and c.archived_at is null
      and (l.is_free_preview or public.has_course_access(l.course_id))
  );
$$;

-- ============================================================
-- Profiles: created and kept in sync with auth.users
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone, phone_verified, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    nullif(new.phone, ''),
    new.phone_confirmed_at is not null and coalesce(new.phone, '') <> '',
    nullif(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When a phone/email is added or confirmed (e.g. account linking), copy it to the profile.
create or replace function public.handle_user_updated()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles p set
    phone          = nullif(new.phone, ''),
    phone_verified = new.phone_confirmed_at is not null and coalesce(new.phone, '') <> '',
    email          = nullif(new.email, ''),
    full_name      = case when p.full_name = ''
                          then coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
                          else p.full_name end,
    avatar_url     = coalesce(p.avatar_url, new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  where p.id = new.id;
  return new;
end $$;

create trigger on_auth_user_updated
  after update of phone, phone_confirmed_at, email, raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

-- ============================================================
-- Device sessions (max 2 devices per student)
-- ============================================================

-- Change this number to allow more devices per student.
create or replace function public.max_devices()
returns integer language sql immutable as $$ select 2 $$;

-- Ends a Supabase auth session so its refresh token stops working.
create or replace function public.kill_auth_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_session_id is null then return; end if;
  begin
    delete from auth.sessions where id = p_session_id;
  exception when others then
    -- Not fatal: the proxy also blocks revoked devices on every request.
    null;
  end;
end $$;
revoke execute on function public.kill_auth_session(uuid) from public, anon, authenticated;

-- Called right after every login on this device. Revokes the oldest devices above the limit.
create or replace function public.register_device_session(p_device_id text, p_user_agent text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_row record;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(p_device_id, '') = '' or length(p_device_id) > 100 then raise exception 'bad_device_id'; end if;

  -- A session that was already pushed out cannot register itself again.
  if v_sid is not null and exists (
    select 1 from public.device_sessions d
    where d.user_id = v_uid and d.auth_session_id = v_sid and d.revoked_at is not null
  ) then
    raise exception 'session_revoked';
  end if;

  perform pg_advisory_xact_lock(hashtext('device_sessions:' || v_uid::text));

  update public.device_sessions d
     set last_seen_at = now(),
         user_agent = left(coalesce(p_user_agent, ''), 400),
         auth_session_id = coalesce(v_sid, d.auth_session_id)
   where d.user_id = v_uid and d.device_id = p_device_id and d.revoked_at is null;

  if not found then
    insert into public.device_sessions (user_id, device_id, auth_session_id, user_agent)
    values (v_uid, p_device_id, v_sid, left(coalesce(p_user_agent, ''), 400));
  end if;

  update public.profiles set last_seen_at = now() where id = v_uid;

  -- Admins are not limited (they also log in on the admin subdomain).
  if public.is_admin() then return; end if;

  for v_row in
    select d.id, d.auth_session_id
    from public.device_sessions d
    where d.user_id = v_uid and d.revoked_at is null
    order by d.created_at desc
    offset public.max_devices()
  loop
    update public.device_sessions set revoked_at = now(), revoke_reason = 'limit' where id = v_row.id;
    perform public.kill_auth_session(v_row.auth_session_id);
  end loop;
end $$;

-- Called by the proxy on every request. Returns false if this device was logged out.
create or replace function public.touch_device_session(p_device_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_seen timestamptz;
begin
  if v_uid is null or coalesce(p_device_id, '') = '' then return false; end if;

  select d.id, d.last_seen_at into v_id, v_seen
  from public.device_sessions d
  where d.user_id = v_uid and d.device_id = p_device_id and d.revoked_at is null;

  if v_id is null then return false; end if;

  -- Write at most once a minute.
  if v_seen < now() - interval '1 minute' then
    update public.device_sessions set last_seen_at = now() where id = v_id;
    update public.profiles set last_seen_at = now() where id = v_uid;
  end if;
  return true;
end $$;

-- Why was this browser logged out? Lets the login page explain it ("logged in on a 3rd device").
-- Device ids are random and secret (httpOnly cookie), so this reveals nothing about other users.
create or replace function public.device_revoke_reason(p_device_id text)
returns text language sql stable security definer set search_path = '' as $$
  select d.revoke_reason
  from public.device_sessions d
  where d.device_id = p_device_id
    and d.revoked_at > now() - interval '30 days'
    and not exists (
      select 1 from public.device_sessions a where a.device_id = p_device_id and a.revoked_at is null)
  order by d.revoked_at desc
  limit 1;
$$;

-- Student logs out one of their own devices from the profile panel.
create or replace function public.revoke_my_device(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  update public.device_sessions
     set revoked_at = now(), revoke_reason = 'user'
   where id = p_id and user_id = auth.uid() and revoked_at is null
  returning auth_session_id into v_sid;
  perform public.kill_auth_session(v_sid);
end $$;

-- Normal logout on this device.
create or replace function public.end_device_session(p_device_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.device_sessions
     set revoked_at = now(), revoke_reason = 'logout'
   where user_id = auth.uid() and device_id = p_device_id and revoked_at is null;
end $$;

-- Admin: log a student out of every device.
create or replace function public.admin_reset_devices(p_user_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_row record;
  v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  for v_row in
    update public.device_sessions
       set revoked_at = now(), revoke_reason = 'admin'
     where user_id = p_user_id and revoked_at is null
    returning auth_session_id
  loop
    perform public.kill_auth_session(v_row.auth_session_id);
    v_count := v_count + 1;
  end loop;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'reset_devices', 'profile', p_user_id::text, jsonb_build_object('revoked', v_count));
  return v_count;
end $$;

-- ============================================================
-- Rate limiting (server only)
-- ============================================================

-- Returns true if the action is allowed, false if the limit for this window is used up.
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
    hits         = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end
  returning hits into v_hits;

  -- Occasionally clean up old keys.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end $$;

-- ============================================================
-- Function permissions
-- ============================================================

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
revoke execute on function public.register_device_session(text, text) from public, anon;
revoke execute on function public.touch_device_session(text) from public, anon;
revoke execute on function public.revoke_my_device(uuid) from public, anon;
revoke execute on function public.end_device_session(text) from public, anon;
revoke execute on function public.admin_reset_devices(uuid) from public, anon;
grant execute on function public.device_revoke_reason(text) to anon, authenticated;
grant execute on function public.register_device_session(text, text) to authenticated;
grant execute on function public.touch_device_session(text) to authenticated;
grant execute on function public.revoke_my_device(uuid) to authenticated;
grant execute on function public.end_device_session(text) to authenticated;
grant execute on function public.admin_reset_devices(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_updated() from public, anon, authenticated;
