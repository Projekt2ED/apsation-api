create extension if not exists pgcrypto;

create table if not exists public.workspace_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null default 'manual',
  name text not null,
  token_preview text not null,
  token_hash text,
  scope text not null default 'all',
  status text not null default 'active',
  source text not null default 'dashboard',
  notes text,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspace_api_keys_status_check
    check (status in ('active', 'restricted', 'revoked'))
);

alter table public.workspace_api_keys
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.workspace_api_keys
  add column if not exists token_hash text;

drop index if exists workspace_api_keys_kind_name_uidx;

create unique index if not exists workspace_api_keys_user_kind_name_uidx
  on public.workspace_api_keys (user_id, kind, name)
  where user_id is not null;

create unique index if not exists workspace_api_keys_token_hash_uidx
  on public.workspace_api_keys (token_hash)
  where token_hash is not null;

create index if not exists workspace_api_keys_created_at_idx
  on public.workspace_api_keys (created_at desc);

create index if not exists workspace_api_keys_user_created_at_idx
  on public.workspace_api_keys (user_id, created_at desc);

create table if not exists public.playground_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mode_id text not null,
  endpoint text not null,
  model text,
  prompt_preview text,
  status_code integer not null,
  duration_ms integer,
  summary text,
  error_message text,
  upstream_request_id text,
  upstream_task_id text,
  upstream_result_id text,
  api_key_id uuid references public.workspace_api_keys(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.playground_logs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.playground_logs
  add column if not exists api_key_id uuid references public.workspace_api_keys(id) on delete set null;

alter table public.playground_logs
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists cached_input_tokens integer,
  add column if not exists billable_amount numeric(18, 8),
  add column if not exists billing_currency text,
  add column if not exists pricing_model text,
  add column if not exists pricing_snapshot jsonb;

create index if not exists playground_logs_created_at_idx
  on public.playground_logs (created_at desc);

create index if not exists playground_logs_mode_model_idx
  on public.playground_logs (mode_id, model);

create index if not exists playground_logs_user_created_at_idx
  on public.playground_logs (user_id, created_at desc);

create index if not exists playground_logs_api_key_created_at_idx
  on public.playground_logs (api_key_id, created_at desc)
  where api_key_id is not null;

create index if not exists playground_logs_user_billing_month_idx
  on public.playground_logs (user_id, created_at desc)
  where billable_amount is not null;

create table if not exists public.user_billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_cny numeric(18, 8) not null default 0,
  total_recharged_cny numeric(18, 8) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_billing_accounts_status_check
    check (status in ('active', 'restricted', 'disabled')),
  constraint user_billing_accounts_balance_check
    check (balance_cny >= 0),
  constraint user_billing_accounts_total_recharged_check
    check (total_recharged_cny >= 0)
);

create table if not exists public.billing_recharge_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  amount_cny numeric(18, 8) not null,
  provider text not null default 'manual',
  provider_order_id text,
  status text not null default 'created',
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billing_recharge_orders_amount_check
    check (amount_cny > 0),
  constraint billing_recharge_orders_status_check
    check (status in ('created', 'pending', 'paid', 'failed', 'cancelled'))
);

create index if not exists billing_recharge_orders_user_created_at_idx
  on public.billing_recharge_orders (user_id, created_at desc);

create table if not exists public.billing_recharge_cards (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_preview text not null,
  amount_cny numeric(18, 8) not null,
  status text not null default 'active',
  note text,
  expires_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_order_id uuid references public.billing_recharge_orders(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billing_recharge_cards_amount_check
    check (amount_cny > 0),
  constraint billing_recharge_cards_status_check
    check (status in ('active', 'redeemed', 'disabled', 'expired'))
);

create index if not exists billing_recharge_cards_status_created_at_idx
  on public.billing_recharge_cards (status, created_at desc);

create index if not exists billing_recharge_cards_redeemed_by_idx
  on public.billing_recharge_cards (redeemed_by, redeemed_at desc)
  where redeemed_by is not null;

create or replace function public.redeem_billing_recharge_card(
  p_user_id uuid,
  p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.billing_recharge_cards%rowtype;
  v_order_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_balance_cny numeric(18, 8);
begin
  select *
    into v_card
    from public.billing_recharge_cards
   where code_hash = p_code_hash
   for update;

  if not found then
    raise exception '卡密不存在。';
  end if;

  if v_card.status <> 'active' then
    raise exception '卡密不可用或已被兑换。';
  end if;

  if v_card.expires_at is not null and v_card.expires_at < v_now then
    update public.billing_recharge_cards
       set status = 'expired',
           updated_at = v_now
     where id = v_card.id;

    raise exception '卡密已过期。';
  end if;

  insert into public.billing_recharge_orders (
    user_id,
    amount_cny,
    provider,
    provider_order_id,
    status,
    metadata
  )
  values (
    p_user_id,
    v_card.amount_cny,
    'card',
    v_card.id::text,
    'paid',
    jsonb_build_object('cardPreview', v_card.code_preview)
  )
  returning id into v_order_id;

  insert into public.user_billing_accounts (
    user_id,
    balance_cny,
    total_recharged_cny,
    status,
    updated_at
  )
  values (
    p_user_id,
    v_card.amount_cny,
    v_card.amount_cny,
    'active',
    v_now
  )
  on conflict (user_id)
  do update set
    balance_cny = coalesce(public.user_billing_accounts.balance_cny, 0) + excluded.balance_cny,
    total_recharged_cny = coalesce(public.user_billing_accounts.total_recharged_cny, 0) + excluded.total_recharged_cny,
    status = 'active',
    updated_at = v_now
  returning balance_cny into v_balance_cny;

  update public.billing_recharge_cards
     set status = 'redeemed',
         redeemed_by = p_user_id,
         redeemed_order_id = v_order_id,
         redeemed_at = v_now,
         updated_at = v_now
   where id = v_card.id;

  return jsonb_build_object(
    'orderId', v_order_id,
    'amountCny', v_card.amount_cny,
    'balanceCny', v_balance_cny,
    'codePreview', v_card.code_preview
  );
end;
$$;

create table if not exists public.async_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  upstream_task_id text not null unique,
  mode_id text not null,
  model text,
  prompt_preview text,
  status text not null,
  note text,
  result_url text,
  last_status_code integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.async_tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists async_tasks_updated_at_idx
  on public.async_tasks (updated_at desc);

create index if not exists async_tasks_user_updated_at_idx
  on public.async_tasks (user_id, updated_at desc);

alter table public.workspace_api_keys enable row level security;
alter table public.playground_logs enable row level security;
alter table public.async_tasks enable row level security;
alter table public.user_billing_accounts enable row level security;
alter table public.billing_recharge_orders enable row level security;
alter table public.billing_recharge_cards enable row level security;

delete from public.workspace_api_keys
  where kind = 'system';

drop policy if exists workspace_api_keys_select_own on public.workspace_api_keys;
create policy workspace_api_keys_select_own
  on public.workspace_api_keys
  for select
  to authenticated
  using (auth.uid() = user_id and kind <> 'system');

drop policy if exists playground_logs_select_own on public.playground_logs;
create policy playground_logs_select_own
  on public.playground_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists async_tasks_select_own on public.async_tasks;
create policy async_tasks_select_own
  on public.async_tasks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_billing_accounts_select_own on public.user_billing_accounts;
create policy user_billing_accounts_select_own
  on public.user_billing_accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists billing_recharge_orders_select_own on public.billing_recharge_orders;
create policy billing_recharge_orders_select_own
  on public.billing_recharge_orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists billing_recharge_cards_select_redeemed_own on public.billing_recharge_cards;
create policy billing_recharge_cards_select_redeemed_own
  on public.billing_recharge_cards
  for select
  to authenticated
  using (auth.uid() = redeemed_by);
