create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  avatar_url text,
  role text not null default 'citizen',
  provider text not null default 'google-demo',
  created_at timestamptz not null default now()
);

create table if not exists public.service_partners (
  id text primary key,
  name text not null,
  phone text not null,
  department text not null,
  vehicle_no text not null,
  eta text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  category text not null,
  location text not null,
  description text not null,
  department text not null,
  urgency text not null,
  status text not null,
  submitted_at timestamptz not null,
  updated_at timestamptz not null,
  sla_due_at timestamptz not null,
  escalation_due_at timestamptz not null,
  service_partner jsonb,
  service_completed_at timestamptz,
  closed_at timestamptz,
  evidence jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  feedback jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  complaint_id text
);

create index if not exists complaints_user_submitted_idx on public.complaints(user_id, submitted_at);
create index if not exists complaints_status_idx on public.complaints(status);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

alter table public.users enable row level security;
alter table public.service_partners enable row level security;
alter table public.complaints enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "service role full access users" on public.users;
drop policy if exists "service role full access service partners" on public.service_partners;
drop policy if exists "service role full access complaints" on public.complaints;
drop policy if exists "service role full access notifications" on public.notifications;

create policy "service role full access users" on public.users
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "service role full access service partners" on public.service_partners
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "service role full access complaints" on public.complaints
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "service role full access notifications" on public.notifications
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Payment Module Tables

create table if not exists public.pricing (
  category text primary key,
  base_price numeric not null,
  distance_charge numeric not null,
  urgency_charge numeric not null
);

create table if not exists public.payments (
  payment_id text primary key,
  grievance_id text not null references public.complaints(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  partner_id text references public.service_partners(id) on delete set null,
  amount numeric not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'PENDING',
  created_at timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_partner_idx on public.payments(partner_id);

alter table public.pricing enable row level security;
alter table public.payments enable row level security;

-- Policies for pricing
create policy "anyone can read pricing" on public.pricing
  for select using (true);
create policy "service role full access pricing" on public.pricing
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Policies for payments
create policy "users can read own payments" on public.payments
  for select using (auth.uid()::text = user_id);
create policy "service role full access payments" on public.payments
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
