-- Add race-safe 30-minute booking conflict protection to an existing database.
-- Resolve any already-conflicting PENDING/CONFIRMED rows before running this migration.

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

-- Public booking creation now goes through a security-definer RPC.
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
