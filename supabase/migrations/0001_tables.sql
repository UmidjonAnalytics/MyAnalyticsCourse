-- 0001: tables
-- Run in Supabase: SQL Editor -> New query -> paste this whole file -> Run.
-- Money is stored as whole so'm (integer). Providers that need tiyin (Payme) multiply by 100 in code.

-- ============================================================
-- Users
-- ============================================================

-- One row per auth user, created automatically by a trigger (see 0002).
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null default '',
  phone          text unique,               -- digits only, e.g. 998901234567 (mirrors auth.users.phone)
  phone_verified boolean not null default false,
  email          text,
  avatar_url     text,
  role           text not null default 'student' check (role in ('student', 'admin')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_seen_at   timestamptz
);

-- Account sharing protection: one row per logged-in browser/device.
create table public.device_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  device_id       text not null,            -- random id kept in an httpOnly cookie
  auth_session_id uuid,                     -- Supabase auth session (JWT "session_id" claim)
  user_agent      text not null default '',
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  revoked_at      timestamptz,
  revoke_reason   text check (revoke_reason in ('limit', 'user', 'admin', 'logout'))
);
create unique index device_sessions_active_unique
  on public.device_sessions (user_id, device_id) where revoked_at is null;
create index device_sessions_user_idx on public.device_sessions (user_id, created_at);

-- ============================================================
-- Catalog
-- ============================================================

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.courses (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.categories (id) on delete set null,
  title             text not null,
  slug              text not null unique,
  short_description text not null default '',
  description       text not null default '',      -- Markdown
  cover_url         text,
  price             integer not null default 0 check (price >= 0),   -- one-time price, so'm
  monthly_price     integer check (monthly_price >= 0),              -- for future monthly plans (null = not sold monthly)
  is_published      boolean not null default false,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz
);

create table public.modules (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  title        text not null,
  position     integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);
create index modules_course_idx on public.modules (course_id, position);

-- Lesson "shell": public metadata (title, order, flags). Visible in the syllabus to everyone.
create table public.lessons (
  id              uuid primary key default gen_random_uuid(),
  module_id       uuid not null references public.modules (id) on delete cascade,
  course_id       uuid not null references public.courses (id) on delete cascade, -- filled by trigger from module
  title           text not null,
  slug            text not null,
  position        integer not null default 0,
  is_free_preview boolean not null default false,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,
  unique (course_id, slug)
);
create index lessons_module_idx on public.lessons (module_id, position);

-- Lesson content: only readable with access to the course (or free preview). Split from
-- "lessons" because Row Level Security works per row, not per column.
create table public.lesson_contents (
  lesson_id   uuid primary key references public.lessons (id) on delete cascade,
  youtube_url text,
  content_md  text not null default '',   -- lesson text (Markdown)
  task_md     text not null default '',   -- business task / scenario (Markdown)
  updated_at  timestamptz not null default now()
);

create table public.bundles (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  slug                  text not null unique,
  short_description     text not null default '',
  description           text not null default '',
  cover_url             text,
  price                 integer not null default 0 check (price >= 0),
  monthly_price         integer check (monthly_price >= 0),
  allow_upgrade_pricing boolean not null default false,  -- owners of some courses pay less
  is_published          boolean not null default false,
  position              integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  archived_at           timestamptz
);

create table public.bundle_courses (
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  position  integer not null default 0,
  primary key (bundle_id, course_id)
);

-- Everything that can be sold, in one list. Orders point to a product by type + id.
create view public.products with (security_invoker = true) as
  select 'course'::text as product_type, id as product_id, title, slug, price, monthly_price, is_published, archived_at
    from public.courses
  union all
  select 'bundle'::text, id, title, slug, price, monthly_price, is_published, archived_at
    from public.bundles;

-- ============================================================
-- Sales
-- ============================================================

create table public.promo_codes (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code = upper(code)),   -- stored in CAPITALS
  discount_type  text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  valid_from     timestamptz,
  valid_to       timestamptz,
  usage_limit    integer check (usage_limit > 0),     -- null = unlimited
  used_count     integer not null default 0,
  -- {"all": true}  or  {"courses": ["<uuid>", ...], "bundles": ["<uuid>", ...]}
  applies_to     jsonb not null default '{"all": true}'::jsonb,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  archived_at    timestamptz,
  check (discount_type <> 'percent' or discount_value <= 100)
);

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete restrict,
  product_type  text not null check (product_type in ('course', 'bundle')),
  course_id     uuid references public.courses (id) on delete restrict,
  bundle_id     uuid references public.bundles (id) on delete restrict,
  product_id    uuid generated always as (coalesce(course_id, bundle_id)) stored,
  plan          text not null default 'lifetime' check (plan in ('lifetime', 'monthly')),
  access_days   integer check (access_days > 0),     -- null = lifetime access
  amount        integer not null check (amount >= 0),          -- list price, so'm
  discount      integer not null default 0 check (discount >= 0),
  final_amount  integer not null check (final_amount >= 0),    -- what the student pays, so'm
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  status        text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  provider      text check (provider in ('payme', 'click', 'paynet')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  paid_at       timestamptz,
  cancelled_at  timestamptz,
  refunded_at   timestamptz,
  check (
    (product_type = 'course' and course_id is not null and bundle_id is null) or
    (product_type = 'bundle' and bundle_id is not null and course_id is null)
  )
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.payments (
  id                      uuid primary key default gen_random_uuid(),
  order_id                uuid not null references public.orders (id) on delete restrict,
  provider                text not null check (provider in ('payme', 'click', 'paynet')),
  provider_transaction_id text,
  amount                  integer not null check (amount >= 0),     -- so'm
  state                   text not null default 'created'
                          check (state in ('created', 'performed', 'cancelled', 'cancelled_after_perform', 'failed')),
  provider_state          integer,         -- provider's own numeric state (Payme: 1, 2, -1, -2)
  reason                  integer,         -- provider cancel reason code
  created_at              timestamptz not null default now(),
  performed_at            timestamptz,
  cancelled_at            timestamptz,
  unique (provider, provider_transaction_id)
);
create index payments_order_idx on public.payments (order_id);

-- Raw log of every provider callback (webhook). Never deleted.
create table public.payment_events (
  id          bigint generated always as identity primary key,
  provider    text not null,
  method      text,
  payload     jsonb not null,
  response    jsonb,
  received_at timestamptz not null default now(),
  processed   boolean not null default false,
  error       text
);
create index payment_events_received_idx on public.payment_events (received_at desc);

create table public.enrollments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete restrict,
  source        text not null check (source in ('purchase', 'bundle', 'manual')),
  order_id      uuid references public.orders (id) on delete restrict,
  note          text,
  granted_by    uuid references public.profiles (id) on delete set null,
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz,         -- null = lifetime
  revoked_at    timestamptz,
  revoked_by    uuid references public.profiles (id) on delete set null,
  revoke_reason text
);
create index enrollments_user_course_idx on public.enrollments (user_id, course_id);
create index enrollments_order_idx on public.enrollments (order_id);

-- ============================================================
-- Learning
-- ============================================================

create table public.lesson_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  status       text not null default 'started' check (status in ('started', 'completed')),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ============================================================
-- System
-- ============================================================

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- Fixed-window rate limiter (used only by server code through check_rate_limit()).
create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);
