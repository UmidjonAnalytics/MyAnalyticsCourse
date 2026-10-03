-- 0012: allow "uzum" as a payment provider (integration waits for Uzum's merchant documentation).
-- Run after 0011. Safe to run again.

alter table public.orders drop constraint if exists orders_provider_check;
alter table public.orders add constraint orders_provider_check
  check (provider in ('payme', 'click', 'paynet', 'uzum', 'test', 'free', 'manual'));

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (provider in ('payme', 'click', 'paynet', 'uzum', 'test'));
