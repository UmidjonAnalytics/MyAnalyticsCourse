-- 0016: sales features
--   1. Sale price with an end date for courses and bundles ("launch week" price).
--   2. Referrals: each student gets a link. A friend who opens it gets a discount on their first purchase;
--      when that purchase is confirmed by the payment provider, the student gets a one-time discount code.
-- Run after 0015. Safe to run again.

-- ============================================================
-- 1. Sale price
-- ============================================================

alter table public.courses add column if not exists sale_price integer;
alter table public.courses add column if not exists sale_ends_at timestamptz;
alter table public.courses drop constraint if exists courses_sale_price_check;
alter table public.courses add constraint courses_sale_price_check check (sale_price is null or (sale_price >= 0 and sale_price < price));

alter table public.bundles add column if not exists sale_price integer;
alter table public.bundles add column if not exists sale_ends_at timestamptz;
alter table public.bundles drop constraint if exists bundles_sale_price_check;
alter table public.bundles add constraint bundles_sale_price_check check (sale_price is null or (sale_price >= 0 and sale_price < price));

-- ============================================================
-- 2. Referrals
-- ============================================================

alter table public.site_settings add column if not exists referral_enabled boolean not null default true;
alter table public.site_settings add column if not exists referral_friend_percent integer not null default 10;
alter table public.site_settings add column if not exists referral_reward_percent integer not null default 10;
alter table public.site_settings drop constraint if exists site_settings_referral_check;
alter table public.site_settings add constraint site_settings_referral_check
  check (referral_friend_percent between 0 and 50 and referral_reward_percent between 0 and 50);

-- Personal invite code (created the first time the student opens the invite card).
alter table public.profiles add column if not exists referral_code text;
create unique index if not exists profiles_referral_code_key on public.profiles (referral_code);
alter table public.profiles drop constraint if exists profiles_referral_code_format;
alter table public.profiles add constraint profiles_referral_code_format check (referral_code is null or referral_code ~ '^[A-Z0-9]{6,12}$');

-- A promo code can belong to one student (referral rewards); null = anyone may use it.
alter table public.promo_codes add column if not exists owner_id uuid references public.profiles (id) on delete cascade;

-- Who invited the buyer of this order (set by the server at checkout).
alter table public.orders add column if not exists referrer_id uuid references public.profiles (id) on delete set null;

create table if not exists public.referral_rewards (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders (id) on delete cascade,
  referrer_id   uuid not null references public.profiles (id) on delete cascade,
  referred_id   uuid not null references public.profiles (id) on delete cascade,
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz
);
create index if not exists referral_rewards_referrer_idx on public.referral_rewards (referrer_id, created_at desc);

alter table public.referral_rewards enable row level security;
revoke all on public.referral_rewards from anon;
revoke insert, update, delete, truncate, references, trigger on public.referral_rewards from authenticated;
grant select on public.referral_rewards to authenticated;
drop policy if exists referral_rewards_select on public.referral_rewards;
create policy referral_rewards_select on public.referral_rewards for select to authenticated
  using (referrer_id = auth.uid() or public.is_admin());

-- The current student's invite code (created on first call).
create or replace function public.my_referral_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I
  i integer;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  select referral_code into v_code from public.profiles where id = auth.uid();
  if v_code is not null then return v_code; end if;
  loop
    v_code := '';
    for i in 1..7 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    begin
      update public.profiles set referral_code = v_code where id = auth.uid() and referral_code is null;
      exit;
    exception when unique_violation then
      -- extremely rare: try another code
    end;
  end loop;
  select referral_code into v_code from public.profiles where id = auth.uid();
  return v_code;
end $$;

-- The current student's invite results: friends who bought and their reward codes.
create or replace function public.my_referral_rewards()
returns table (created_at timestamptz, code text, percent integer, used boolean, valid_to timestamptz, revoked boolean)
language sql stable security definer set search_path = '' as $$
  select r.created_at, p.code, p.discount_value, p.used_count >= coalesce(p.usage_limit, 1), p.valid_to,
         r.revoked_at is not null or p.id is null or not p.is_active
  from public.referral_rewards r
  left join public.promo_codes p on p.id = r.promo_code_id
  where r.referrer_id = auth.uid()
  order by r.created_at desc
  limit 100;
$$;

revoke execute on function public.my_referral_code() from public, anon;
revoke execute on function public.my_referral_rewards() from public, anon;
grant execute on function public.my_referral_code() to authenticated;
grant execute on function public.my_referral_rewards() to authenticated;

-- ============================================================
-- Paid / refunded: same as 0006, plus the referral reward
-- ============================================================

create or replace function public.order_mark_paid(p_order_id uuid, p_provider text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
  v_expires timestamptz;
  v_percent integer;
  v_code text;
  v_promo uuid;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.status = 'paid' then return; end if;               -- already done (retry)
  if o.status <> 'pending' then raise exception 'order_not_payable'; end if;

  update public.orders
     set status = 'paid', paid_at = now(), provider = coalesce(p_provider, provider)
   where id = p_order_id;

  v_expires := case when o.access_days is null then null else now() + make_interval(days => o.access_days) end;

  if o.product_type = 'course' then
    insert into public.enrollments (user_id, course_id, source, order_id, expires_at)
    values (o.user_id, o.course_id, 'purchase', o.id, v_expires);
  else
    insert into public.enrollments (user_id, course_id, source, order_id, expires_at)
    select o.user_id, bc.course_id, 'bundle', o.id, v_expires
    from public.bundle_courses bc
    where bc.bundle_id = o.bundle_id
      -- courses the student already owns stay as they are (upgrade purchase)
      and not exists (
        select 1 from public.enrollments e
        where e.user_id = o.user_id and e.course_id = bc.course_id and e.revoked_at is null
          and (e.expires_at is null or e.expires_at > now()));
  end if;

  if o.promo_code_id is not null then
    update public.promo_codes set used_count = used_count + 1 where id = o.promo_code_id;
  end if;

  -- Referral: the friend who invited this buyer gets a one-time discount code (only for real money).
  if o.referrer_id is not null and o.referrer_id <> o.user_id and o.final_amount > 0 then
    select referral_reward_percent into v_percent from public.site_settings where id = 1 and referral_enabled;
    if coalesce(v_percent, 0) > 0 then
      loop
        v_code := 'DOST' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
        exit when not exists (select 1 from public.promo_codes where code = v_code);
      end loop;
      insert into public.promo_codes (code, discount_type, discount_value, valid_to, usage_limit, owner_id)
      values (v_code, 'percent', v_percent, now() + interval '180 days', 1, o.referrer_id)
      returning id into v_promo;
      insert into public.referral_rewards (order_id, referrer_id, referred_id, promo_code_id)
      values (o.id, o.referrer_id, o.user_id, v_promo)
      on conflict (order_id) do nothing;
    end if;
  end if;
end $$;

create or replace function public.order_mark_refunded(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.status = 'paid' then
    update public.orders set status = 'refunded', refunded_at = now() where id = p_order_id;
    update public.enrollments
       set revoked_at = now(), revoke_reason = coalesce(p_reason, 'refund')
     where order_id = p_order_id and revoked_at is null;
    -- The referral reward for this purchase is withdrawn (if its code was not used yet).
    update public.promo_codes p set is_active = false
      from public.referral_rewards r
     where r.order_id = p_order_id and p.id = r.promo_code_id and p.used_count = 0;
    update public.referral_rewards set revoked_at = now() where order_id = p_order_id and revoked_at is null;
  elsif o.status = 'pending' then
    update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
  end if;
end $$;
