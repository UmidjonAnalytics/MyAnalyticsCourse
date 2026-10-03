-- 0013: free data library and monthly challenges. Run after 0012. Safe to run again.

-- ============================================================
-- Free data library: public catalog, download after a free sign-up
-- ============================================================

create table if not exists public.open_datasets (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '',
  description_md    text not null default '',     -- context + questions to explore
  industry          text not null default '',     -- "Chakana savdo", "Bank", ...
  tags              text[] not null default '{}',
  file_path         text,                         -- private bucket "open-data"
  file_name         text not null default '',
  size_bytes        bigint,
  row_count         integer,
  columns           jsonb not null default '[]',  -- [{name, description}]
  preview           jsonb not null default '[]',  -- first rows: [[...], ...] (header = columns)
  download_count    integer not null default 0,
  is_published      boolean not null default false,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz
);
drop trigger if exists open_datasets_updated_at on public.open_datasets;
create trigger open_datasets_updated_at before update on public.open_datasets for each row execute function public.set_updated_at();

alter table public.open_datasets enable row level security;
grant select on public.open_datasets to anon, authenticated;
grant insert, update, delete on public.open_datasets to authenticated;
drop policy if exists open_datasets_select on public.open_datasets;
create policy open_datasets_select on public.open_datasets for select to anon, authenticated
  using ((is_published and archived_at is null) or public.is_admin());
drop policy if exists open_datasets_admin on public.open_datasets;
create policy open_datasets_admin on public.open_datasets for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('open-data', 'open-data', false, 100 * 1024 * 1024)
on conflict (id) do nothing;
drop policy if exists open_data_admin_read on storage.objects;
create policy open_data_admin_read on storage.objects for select to authenticated using (bucket_id = 'open-data' and public.is_admin());
drop policy if exists open_data_admin_insert on storage.objects;
create policy open_data_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'open-data' and public.is_admin());
drop policy if exists open_data_admin_delete on storage.objects;
create policy open_data_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'open-data' and public.is_admin());

-- Counts a download (called by the server after the login check).
create or replace function public.open_dataset_downloaded(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.open_datasets set download_count = download_count + 1
  where id = p_id and is_published and archived_at is null;
$$;
revoke execute on function public.open_dataset_downloaded(uuid) from public, anon;
grant execute on function public.open_dataset_downloaded(uuid) to authenticated;

-- ============================================================
-- Monthly challenges
-- ============================================================

create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '',
  brief_md     text not null default '',
  rules_md     text not null default '',
  prize        text not null default '',
  dataset_id   uuid references public.open_datasets (id) on delete set null,
  cover_url    text,
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz not null,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz,
  check (ends_at > starts_at)
);
drop trigger if exists challenges_updated_at on public.challenges;
create trigger challenges_updated_at before update on public.challenges for each row execute function public.set_updated_at();

alter table public.challenges enable row level security;
grant select on public.challenges to anon, authenticated;
grant insert, update, delete on public.challenges to authenticated;
drop policy if exists challenges_select on public.challenges;
create policy challenges_select on public.challenges for select to anon, authenticated
  using ((is_published and archived_at is null) or public.is_admin());
drop policy if exists challenges_admin on public.challenges;
create policy challenges_admin on public.challenges for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.challenge_entries (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  link_url     text not null check (link_url ~ '^https://' and length(link_url) <= 1000),
  image_path   text,                                  -- screenshot in the public "challenge-images" bucket
  summary      text not null default '' check (length(summary) <= 2000),
  place        integer check (place between 1 and 3), -- set by the admin
  hidden_at    timestamptz,                           -- moderation
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (challenge_id, user_id)
);
drop trigger if exists challenge_entries_updated_at on public.challenge_entries;
create trigger challenge_entries_updated_at before update on public.challenge_entries for each row execute function public.set_updated_at();

create or replace function public.challenge_is_open(p_challenge_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.challenges c
    where c.id = p_challenge_id and c.is_published and c.archived_at is null and now() between c.starts_at and c.ends_at);
$$;

alter table public.challenge_entries enable row level security;
grant select, insert on public.challenge_entries to authenticated;
revoke update on public.challenge_entries from authenticated;
grant update (link_url, image_path, summary, place, hidden_at) on public.challenge_entries to authenticated;

drop policy if exists challenge_entries_select on public.challenge_entries;
create policy challenge_entries_select on public.challenge_entries for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- Anyone signed up may enter while the challenge is open (no course purchase needed).
drop policy if exists challenge_entries_insert on public.challenge_entries;
create policy challenge_entries_insert on public.challenge_entries for insert to authenticated
  with check (user_id = auth.uid() and place is null and hidden_at is null and public.challenge_is_open(challenge_id));
drop policy if exists challenge_entries_update on public.challenge_entries;
create policy challenge_entries_update on public.challenge_entries for update to authenticated
  using ((user_id = auth.uid() and public.challenge_is_open(challenge_id)) or public.is_admin())
  with check ((user_id = auth.uid() and public.challenge_is_open(challenge_id)) or public.is_admin());

create or replace function public.challenge_entries_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and (new.place is distinct from old.place or new.hidden_at is distinct from old.hidden_at) then
    raise exception 'forbidden';
  end if;
  return new;
end $$;
drop trigger if exists challenge_entries_guard on public.challenge_entries;
create trigger challenge_entries_guard before update on public.challenge_entries for each row execute function public.challenge_entries_guard();

-- Public gallery: only after the deadline (so nobody copies), winners first. "Ism F." + profile link.
create or replace function public.challenge_gallery(p_challenge_id uuid)
returns table (id uuid, link_url text, image_path text, summary text, place integer, author text, username text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, e.link_url, e.image_path, e.summary, e.place,
    coalesce(nullif(
      trim(split_part(trim(p.full_name), ' ', 1) || ' ' ||
           coalesce(left(nullif(split_part(trim(p.full_name), ' ', 2), ''), 1) || '.', '')), ''), 'Talaba'),
    case when p.is_public then p.username end,
    e.created_at
  from public.challenge_entries e
  join public.profiles p on p.id = e.user_id
  join public.challenges c on c.id = e.challenge_id
  where e.challenge_id = p_challenge_id and e.hidden_at is null
    and c.is_published and c.archived_at is null and now() > c.ends_at
  order by e.place nulls last, e.created_at
  limit 200;
$$;
revoke execute on function public.challenge_gallery(uuid) from public;
grant execute on function public.challenge_gallery(uuid) to anon, authenticated;

create or replace function public.challenge_entry_count(p_challenge_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.challenge_entries where challenge_id = p_challenge_id and hidden_at is null;
$$;
revoke execute on function public.challenge_entry_count(uuid) from public;
grant execute on function public.challenge_entry_count(uuid) to anon, authenticated;

-- Screenshots: public images; each student writes only inside their own folder "<user id>/...".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('challenge-images', 'challenge-images', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists challenge_images_read on storage.objects;
create policy challenge_images_read on storage.objects for select using (bucket_id = 'challenge-images');
drop policy if exists challenge_images_insert on storage.objects;
create policy challenge_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'challenge-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists challenge_images_delete on storage.objects;
create policy challenge_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'challenge-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
