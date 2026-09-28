-- 0004: Phase 2 — course covers storage and admin helper functions.
-- Run after 0003.

-- ============================================================
-- Storage: public bucket for course/bundle cover images (only admins upload)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy covers_public_read on storage.objects for select
  using (bucket_id = 'covers');
create policy covers_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_admin());
create policy covers_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_admin());
create policy covers_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_admin());

-- ============================================================
-- Reorder (drag and drop): positions follow the order of the given ids
-- ============================================================

create or replace function public.admin_reorder(p_table text, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_table not in ('categories', 'courses', 'modules', 'lessons', 'bundles') then
    raise exception 'bad_table';
  end if;
  execute format(
    'update public.%I t set position = x.ord from unnest($1) with ordinality as x(id, ord) where t.id = x.id',
    p_table) using p_ids;
  insert into public.audit_log (actor_id, action, entity, details)
  values (auth.uid(), 'reorder', p_table, jsonb_build_object('ids', to_jsonb(p_ids)));
end $$;

-- ============================================================
-- Roles: make someone admin / student (you cannot remove your own admin role)
-- ============================================================

create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_role not in ('student', 'admin') then raise exception 'bad_role'; end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then raise exception 'self_demote'; end if;
  update public.profiles set role = p_role where id = p_user_id;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'set_role', 'profile', p_user_id::text, jsonb_build_object('role', p_role));
end $$;

-- ============================================================
-- Students list for the admin panel (search by name, phone or email)
-- ============================================================

create or replace function public.admin_students(p_search text, p_limit integer, p_offset integer)
returns table (
  id uuid,
  full_name text,
  phone text,
  email text,
  role text,
  providers text[],
  created_at timestamptz,
  last_seen_at timestamptz,
  course_count integer,
  total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_digits text := nullif(regexp_replace(coalesce(p_search, ''), '\D', '', 'g'), '');
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select p.id, p.full_name, p.phone, p.email, p.role,
         coalesce(array(select jsonb_array_elements_text(u.raw_app_meta_data -> 'providers')), '{}'::text[]),
         p.created_at, p.last_seen_at,
         (select count(distinct e.course_id)::integer from public.enrollments e
           where e.user_id = p.id and e.revoked_at is null and (e.expires_at is null or e.expires_at > now())),
         count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  where v_q is null
     or p.full_name ilike '%' || v_q || '%'
     or p.email ilike '%' || v_q || '%'
     or (v_digits is not null and p.phone like '%' || v_digits || '%')
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- ============================================================
-- Permanent delete from the archive. Only archived items; never content someone paid for.
-- ============================================================

create or replace function public.admin_purge(p_entity text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_course_ids uuid[];
  v_archived boolean;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  if p_entity = 'course' then
    select archived_at is not null into v_archived from public.courses where id = p_id;
    v_course_ids := array[p_id];
  elsif p_entity = 'module' then
    select archived_at is not null, array[course_id] into v_archived, v_course_ids from public.modules where id = p_id;
  elsif p_entity = 'lesson' then
    select archived_at is not null, array[course_id] into v_archived, v_course_ids from public.lessons where id = p_id;
  elsif p_entity = 'bundle' then
    select archived_at is not null into v_archived from public.bundles where id = p_id;
    select coalesce(array_agg(course_id), '{}') into v_course_ids from public.bundle_courses where bundle_id = p_id;
    if exists (select 1 from public.orders where bundle_id = p_id) then raise exception 'paid_content'; end if;
  else
    raise exception 'bad_entity';
  end if;

  if v_archived is null then raise exception 'not_found'; end if;
  if not v_archived then raise exception 'not_archived'; end if;

  -- Someone bought (or was given) access to this content: keep it forever (archive only).
  if p_entity <> 'bundle' and (
       exists (select 1 from public.enrollments where course_id = any (v_course_ids))
    or exists (select 1 from public.orders where course_id = any (v_course_ids) and status in ('paid', 'refunded'))
  ) then
    raise exception 'paid_content';
  end if;

  if p_entity = 'course' then
    delete from public.payments where order_id in (
      select id from public.orders where course_id = p_id and status in ('pending', 'cancelled'));
    delete from public.orders where course_id = p_id and status in ('pending', 'cancelled');
    delete from public.courses where id = p_id;
  elsif p_entity = 'module' then delete from public.modules where id = p_id;
  elsif p_entity = 'lesson' then delete from public.lessons where id = p_id;
  elsif p_entity = 'bundle' then delete from public.bundles where id = p_id;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id)
  values (auth.uid(), 'purge', p_entity, p_id::text);
end $$;

revoke execute on function public.admin_reorder(text, uuid[]) from public, anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
revoke execute on function public.admin_students(text, integer, integer) from public, anon;
revoke execute on function public.admin_purge(text, uuid) from public, anon;
grant execute on function public.admin_reorder(text, uuid[]) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_students(text, integer, integer) to authenticated;
grant execute on function public.admin_purge(text, uuid) to authenticated;
