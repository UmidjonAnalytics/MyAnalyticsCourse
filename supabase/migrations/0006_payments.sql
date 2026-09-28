-- 0006: Phase 3 — payments (Payme, Click, Paynet, test mode), promo codes, revenue stats.
-- Run after 0005. All money in so'm; Payme amounts (tiyin) are converted in code.
-- The payment functions below are called ONLY by server code with the secret key.

-- ============================================================
-- Schema changes
-- ============================================================

alter table public.orders drop constraint if exists orders_provider_check;
alter table public.orders add constraint orders_provider_check
  check (provider in ('payme', 'click', 'paynet', 'test', 'free', 'manual'));

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (provider in ('payme', 'click', 'paynet', 'test'));

-- Short numeric id (Click's merchant_prepare_id) and the provider's own timestamp (Payme "time", ms).
alter table public.payments add column if not exists public_id bigint generated always as identity;
alter table public.payments add column if not exists provider_time bigint;
create unique index if not exists payments_public_id_key on public.payments (public_id);

-- Link each logged callback to its order (for the admin order page).
alter table public.payment_events add column if not exists order_id uuid references public.orders (id) on delete set null;
create index if not exists payment_events_order_idx on public.payment_events (order_id);

-- Order number shown to students and support ("#1024").
alter table public.orders add column if not exists number bigint generated always as identity;
create unique index if not exists orders_number_key on public.orders (number);

-- ============================================================
-- Paid: mark the order paid and grant access (idempotent, one transaction)
-- ============================================================

create or replace function public.order_mark_paid(p_order_id uuid, p_provider text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
  v_expires timestamptz;
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
end $$;

-- Refund / cancellation after payment: order refunded and its access revoked.
-- A pending order is simply cancelled.
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
  elsif o.status = 'pending' then
    update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
  end if;
end $$;

-- ============================================================
-- Payme Merchant API (JSON-RPC) — https://developer.help.paycom.uz
-- Each function returns jsonb: {"error": {"code": ..., "data": ...}} or {"result": {...}}.
-- Payme states: 1 created, 2 performed, -1 cancelled, -2 cancelled after perform.
-- ============================================================

create or replace function public.payme_tx_json(p public.payments)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'create_time', floor(extract(epoch from p.created_at) * 1000)::bigint,
    'perform_time', coalesce(floor(extract(epoch from p.performed_at) * 1000)::bigint, 0),
    'cancel_time', coalesce(floor(extract(epoch from p.cancelled_at) * 1000)::bigint, 0),
    'transaction', p.id::text,
    'state', p.provider_state,
    'reason', p.reason);
$$;

-- CheckPerformTransaction / first half of CreateTransaction: can this order be paid with this amount?
create or replace function public.payme_check_order(p_order_id text, p_amount_tiyin bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
  if p_order_id is null or p_order_id !~ '^[0-9a-f-]{36}$' then
    return jsonb_build_object('error', jsonb_build_object('code', -31050, 'data', 'order_id'));
  end if;
  select * into o from public.orders where id = p_order_id::uuid;
  if not found then return jsonb_build_object('error', jsonb_build_object('code', -31050, 'data', 'order_id')); end if;
  if o.status <> 'pending' then return jsonb_build_object('error', jsonb_build_object('code', -31051, 'data', 'order_id')); end if;
  if p_amount_tiyin <> o.final_amount::bigint * 100 then return jsonb_build_object('error', jsonb_build_object('code', -31001)); end if;
  return jsonb_build_object('result', jsonb_build_object('allow', true));
end $$;

create or replace function public.payme_create(p_tx text, p_time bigint, p_amount_tiyin bigint, p_order_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p public.payments%rowtype;
  v_check jsonb;
  v_timeout constant bigint := 43200000; -- 12 hours
begin
  select * into p from public.payments where provider = 'payme' and provider_transaction_id = p_tx for update;
  if found then
    if p.provider_state <> 1 then return jsonb_build_object('error', jsonb_build_object('code', -31008)); end if;
    if (extract(epoch from now()) * 1000)::bigint - coalesce(p.provider_time, 0) > v_timeout then
      update public.payments set state = 'cancelled', provider_state = -1, reason = 4, cancelled_at = now()
       where id = p.id returning * into p;
      return jsonb_build_object('error', jsonb_build_object('code', -31008));
    end if;
    return jsonb_build_object('result', public.payme_tx_json(p));
  end if;

  perform 1 from public.orders where id = case when p_order_id ~ '^[0-9a-f-]{36}$' then p_order_id::uuid end for update;
  v_check := public.payme_check_order(p_order_id, p_amount_tiyin);
  if v_check ? 'error' then return v_check; end if;

  -- Only one open Payme transaction per order.
  if exists (select 1 from public.payments where order_id = p_order_id::uuid and provider = 'payme' and provider_state = 1) then
    return jsonb_build_object('error', jsonb_build_object('code', -31051, 'data', 'order_id'));
  end if;

  insert into public.payments (order_id, provider, provider_transaction_id, amount, state, provider_state, provider_time)
  values (p_order_id::uuid, 'payme', p_tx, (p_amount_tiyin / 100)::integer, 'created', 1, p_time)
  returning * into p;
  return jsonb_build_object('result', public.payme_tx_json(p));
end $$;

create or replace function public.payme_perform(p_tx text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.payments%rowtype;
begin
  select * into p from public.payments where provider = 'payme' and provider_transaction_id = p_tx for update;
  if not found then return jsonb_build_object('error', jsonb_build_object('code', -31003)); end if;
  if p.provider_state = 2 then return jsonb_build_object('result', public.payme_tx_json(p)); end if;
  if p.provider_state <> 1 then return jsonb_build_object('error', jsonb_build_object('code', -31008)); end if;
  if (extract(epoch from now()) * 1000)::bigint - coalesce(p.provider_time, 0) > 43200000 then
    update public.payments set state = 'cancelled', provider_state = -1, reason = 4, cancelled_at = now() where id = p.id;
    return jsonb_build_object('error', jsonb_build_object('code', -31008));
  end if;
  begin
    perform public.order_mark_paid(p.order_id, 'payme');
  exception when others then
    return jsonb_build_object('error', jsonb_build_object('code', -31008));
  end;
  update public.payments set state = 'performed', provider_state = 2, performed_at = now() where id = p.id returning * into p;
  return jsonb_build_object('result', public.payme_tx_json(p));
end $$;

create or replace function public.payme_cancel(p_tx text, p_reason integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.payments%rowtype;
begin
  select * into p from public.payments where provider = 'payme' and provider_transaction_id = p_tx for update;
  if not found then return jsonb_build_object('error', jsonb_build_object('code', -31003)); end if;
  if p.provider_state = 1 then
    update public.payments set state = 'cancelled', provider_state = -1, reason = p_reason, cancelled_at = now()
     where id = p.id returning * into p;
    perform public.order_mark_refunded(p.order_id, 'payment_cancelled');
  elsif p.provider_state = 2 then
    update public.payments set state = 'cancelled_after_perform', provider_state = -2, reason = p_reason, cancelled_at = now()
     where id = p.id returning * into p;
    perform public.order_mark_refunded(p.order_id, 'payme_refund');
  end if;
  return jsonb_build_object('result', public.payme_tx_json(p));
end $$;

create or replace function public.payme_check(p_tx text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('result', public.payme_tx_json(p)) from public.payments p
      where p.provider = 'payme' and p.provider_transaction_id = p_tx),
    jsonb_build_object('error', jsonb_build_object('code', -31003)));
$$;

create or replace function public.payme_statement(p_from bigint, p_to bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('result', jsonb_build_object('transactions', coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.provider_transaction_id,
      'time', p.provider_time,
      'amount', p.amount::bigint * 100,
      'account', jsonb_build_object('order_id', p.order_id::text)
    ) || public.payme_tx_json(p) order by p.provider_time), '[]'::jsonb)))
  from public.payments p
  where p.provider = 'payme' and p.provider_time between p_from and p_to;
$$;

-- ============================================================
-- Click (Prepare / Complete) and test payments
-- ============================================================

-- Prepare: create our payment row for this Click transaction. Returns {"error": code} or {"prepare_id": n}.
create or replace function public.click_prepare(p_click_trans_id text, p_order_id text, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
  p public.payments%rowtype;
begin
  if p_order_id is null or p_order_id !~ '^[0-9a-f-]{36}$' then return jsonb_build_object('error', -5); end if;
  select * into o from public.orders where id = p_order_id::uuid for update;
  if not found then return jsonb_build_object('error', -5); end if;
  if o.status = 'paid' then return jsonb_build_object('error', -4); end if;
  if o.status <> 'pending' then return jsonb_build_object('error', -9); end if;
  if abs(p_amount - o.final_amount) > 0.01 then return jsonb_build_object('error', -2); end if;

  select * into p from public.payments where provider = 'click' and provider_transaction_id = p_click_trans_id;
  if not found then
    insert into public.payments (order_id, provider, provider_transaction_id, amount, state)
    values (o.id, 'click', p_click_trans_id, o.final_amount, 'created') returning * into p;
  end if;
  return jsonb_build_object('error', 0, 'prepare_id', p.public_id);
end $$;

-- Complete: p_click_error < 0 means Click reports a failed payment -> cancel.
create or replace function public.click_complete(p_click_trans_id text, p_prepare_id bigint, p_order_id text, p_amount numeric, p_click_error integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.payments%rowtype;
begin
  select * into p from public.payments
   where provider = 'click' and provider_transaction_id = p_click_trans_id and public_id = p_prepare_id for update;
  if not found or p.order_id::text <> p_order_id then return jsonb_build_object('error', -6); end if;
  if p.state = 'performed' then return jsonb_build_object('error', 0, 'confirm_id', p.public_id); end if;  -- retry
  if p.state <> 'created' then return jsonb_build_object('error', -9); end if;
  if abs(p_amount - p.amount) > 0.01 then return jsonb_build_object('error', -2); end if;

  if p_click_error < 0 then
    update public.payments set state = 'cancelled', cancelled_at = now(), reason = p_click_error where id = p.id;
    perform public.order_mark_refunded(p.order_id, 'payment_cancelled');
    return jsonb_build_object('error', -9);
  end if;

  if exists (select 1 from public.orders where id = p.order_id and status = 'paid') then
    return jsonb_build_object('error', -4);
  end if;
  begin
    perform public.order_mark_paid(p.order_id, 'click');
  exception when others then
    return jsonb_build_object('error', -7);
  end;
  update public.payments set state = 'performed', performed_at = now() where id = p.id;
  return jsonb_build_object('error', 0, 'confirm_id', p.public_id);
end $$;

-- Test mode ("Sinov to'lovi"): pay or cancel an order without a real provider.
create or replace function public.test_payment(p_order_id uuid, p_success boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.status <> 'pending' then return; end if;
  insert into public.payments (order_id, provider, provider_transaction_id, amount, state, performed_at, cancelled_at)
  values (o.id, 'test', 'test-' || gen_random_uuid(), o.final_amount,
          case when p_success then 'performed' else 'cancelled' end,
          case when p_success then now() end, case when p_success then null else now() end);
  if p_success then perform public.order_mark_paid(o.id, 'test');
  else perform public.order_mark_refunded(o.id, 'test_cancel');
  end if;
end $$;

-- ============================================================
-- Admin: manual refund / revoke, dashboard numbers
-- ============================================================

create or replace function public.admin_refund_order(p_order_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  perform public.order_mark_refunded(p_order_id, 'admin_refund');
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'refund', 'order', p_order_id::text, jsonb_build_object('note', p_note));
end $$;

create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent';
  v_month timestamptz := date_trunc('month', now() at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent';
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'students', (select count(*) from public.profiles where role = 'student'),
    'paying_students', (select count(distinct user_id) from public.orders where status = 'paid'),
    'active_7d', (select count(*) from public.profiles where last_seen_at > now() - interval '7 days'),
    'revenue', (select jsonb_build_object(
        'today', coalesce(sum(final_amount) filter (where paid_at >= v_today), 0),
        'month', coalesce(sum(final_amount) filter (where paid_at >= v_month), 0),
        'total', coalesce(sum(final_amount), 0))
      from public.orders where status = 'paid'),
    'by_provider', (select coalesce(jsonb_agg(jsonb_build_object('provider', provider, 'total', total, 'orders', n) order by total desc), '[]')
      from (select coalesce(provider, '-') as provider, sum(final_amount) as total, count(*) as n
            from public.orders where status = 'paid' group by 1) x),
    'by_product', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'type', product_type, 'total', total, 'orders', n) order by total desc), '[]')
      from (select coalesce(c.title, b.title) as title, o.product_type, sum(o.final_amount) as total, count(*) as n
            from public.orders o
            left join public.courses c on c.id = o.course_id
            left join public.bundles b on b.id = o.bundle_id
            where o.status = 'paid' group by 1, 2) x),
    -- Where students stop: the last lesson each enrolled student completed, most common first.
    'drop_off', (select coalesce(jsonb_agg(jsonb_build_object('course', course, 'lesson', lesson, 'students', n) order by n desc), '[]')
      from (select c.title as course, l.title as lesson, count(*) as n
            from (select distinct on (lp.user_id, l2.course_id) lp.user_id, lp.lesson_id
                  from public.lesson_progress lp
                  join public.lessons l2 on l2.id = lp.lesson_id
                  where lp.status = 'completed'
                  order by lp.user_id, l2.course_id, lp.completed_at desc) last
            join public.lessons l on l.id = last.lesson_id
            join public.courses c on c.id = l.course_id
            group by 1, 2 order by n desc limit 5) x)
  );
end $$;

-- ============================================================
-- Permissions: payment functions are server-only (secret key)
-- ============================================================

do $$
declare f text;
begin
  foreach f in array array[
    'public.order_mark_paid(uuid, text)', 'public.order_mark_refunded(uuid, text)',
    'public.payme_check_order(text, bigint)', 'public.payme_create(text, bigint, bigint, text)',
    'public.payme_perform(text)', 'public.payme_cancel(text, integer)', 'public.payme_check(text)', 'public.payme_statement(bigint, bigint)',
    'public.click_prepare(text, text, numeric)', 'public.click_complete(text, bigint, text, numeric, integer)',
    'public.test_payment(uuid, boolean)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

revoke execute on function public.admin_refund_order(uuid, text) from public, anon;
revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_refund_order(uuid, text) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
