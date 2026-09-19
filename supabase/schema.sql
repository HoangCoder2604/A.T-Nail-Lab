-- A.T Nail Lab booking system
-- Run this file in Supabase SQL Editor on a NEW project or adapt it carefully to an existing schema.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (char_length(phone) between 8 and 20),
  email text,
  service text not null check (char_length(service) between 2 and 120),
  booking_date date not null,
  booking_time time not null,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','COMPLETED','CANCELLED')),
  messenger_psid text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists bookings_date_idx on public.bookings (booking_date, booking_time);
create index if not exists bookings_status_idx on public.bookings (status);


-- Prevent overlapping active bookings within a 30-minute appointment window.
-- [) means exactly 30 minutes apart is allowed: 14:00 and 14:30 do NOT overlap.
-- PENDING and CONFIRMED hold the slot; CANCELLED/COMPLETED do not.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_no_30min_overlap'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_no_30min_overlap
      exclude using gist (
        tsrange(
          booking_date + booking_time,
          booking_date + booking_time + interval '30 minutes',
          '[)'
        ) with &&
      )
      where (status in ('PENDING', 'CONFIRMED'));
  end if;
end
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Public visitors create bookings only through this narrow RPC.
-- This lets us return the new booking safely without granting public SELECT access.
drop policy if exists "public can create pending bookings" on public.bookings;

create or replace function public.create_booking(
  p_booking_code text,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_service text,
  p_booking_date date,
  p_booking_time time,
  p_note text
)
returns table (
  id uuid,
  booking_code text,
  customer_name text,
  phone text,
  email text,
  service text,
  booking_date date,
  booking_time time,
  note text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.bookings (
    booking_code, customer_name, phone, email, service,
    booking_date, booking_time, note, status
  )
  values (
    upper(trim(p_booking_code)), trim(p_customer_name),
    regexp_replace(p_phone, '[^0-9]', '', 'g'), nullif(trim(p_email), ''),
    trim(p_service), p_booking_date, p_booking_time, nullif(trim(p_note), ''), 'PENDING'
  )
  returning
    bookings.id, bookings.booking_code, bookings.customer_name, bookings.phone,
    bookings.email, bookings.service, bookings.booking_date, bookings.booking_time,
    bookings.note, bookings.status, bookings.created_at;
exception
  when exclusion_violation then
    raise exception using errcode = 'P0001', message = 'BOOKING_TIME_CONFLICT';
end;
$$;

revoke all on function public.create_booking(text,text,text,text,text,date,time,text) from public;
grant execute on function public.create_booking(text,text,text,text,text,date,time,text) to anon, authenticated;

-- Only admins can read/manage the full booking list.
drop policy if exists "admins can read bookings" on public.bookings;
create policy "admins can read bookings"
on public.bookings
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can update bookings" on public.bookings;
create policy "admins can update bookings"
on public.bookings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete bookings" on public.bookings;
create policy "admins can delete bookings"
on public.bookings
for delete
to authenticated
using (public.is_admin());

-- Logged-in admin can read their own admin marker.
drop policy if exists "admin can read own marker" on public.admin_users;
create policy "admin can read own marker"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

-- Public booking lookup without exposing the whole table.
create or replace function public.check_booking(p_booking_code text, p_phone text)
returns table (
  booking_code text,
  customer_name text,
  service text,
  booking_date date,
  booking_time time,
  note text,
  status text,
  created_at timestamptz,
  confirmed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    b.booking_code,
    b.customer_name,
    b.service,
    b.booking_date,
    b.booking_time,
    b.note,
    b.status,
    b.created_at,
    b.confirmed_at
  from public.bookings b
  where upper(b.booking_code) = upper(trim(p_booking_code))
    and regexp_replace(b.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
  limit 1;
$$;

revoke all on function public.check_booking(text, text) from public;
grant execute on function public.check_booking(text, text) to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- AFTER creating the admin account in Supabase Auth, run ONE line like this:
-- insert into public.admin_users (user_id) values ('PASTE_AUTH_USER_UUID_HERE');
