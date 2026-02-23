-- Supabase schema for Diario de Turno app
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.technicians (
  id text primary key,
  name text not null,
  role text not null check (role in ('admin', 'tech')),
  shift text not null,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  work_type text not null,
  description text not null,
  additional_comments text not null default '',
  technician_name text not null,
  shift text not null,
  signature text not null,
  status text not null check (status in ('completed', 'in_progress', 'pending')) default 'completed',
  created_at timestamptz not null default now(),
  finished_at timestamptz not null default now()
);

create index if not exists jobs_finished_at_idx on public.jobs (finished_at desc);
create index if not exists jobs_technician_name_idx on public.jobs (technician_name);

alter table public.technicians enable row level security;
alter table public.jobs enable row level security;

-- Demo policies for anon key access from frontend.
-- Harden these policies before production.
drop policy if exists technicians_select_all on public.technicians;
create policy technicians_select_all
on public.technicians
for select
to anon, authenticated
using (true);

drop policy if exists jobs_select_all on public.jobs;
create policy jobs_select_all
on public.jobs
for select
to anon, authenticated
using (true);

drop policy if exists jobs_insert_all on public.jobs;
create policy jobs_insert_all
on public.jobs
for insert
to anon, authenticated
with check (true);

insert into public.technicians (id, name, role, shift, password)
values
  ('carlos', 'Carlos', 'tech', 'Turno Matutino', '1234'),
  ('rene', 'Rene', 'admin', 'Turno Completo', 'admin123')
on conflict (id) do update
set
  name = excluded.name,
  role = excluded.role,
  shift = excluded.shift,
  password = excluded.password;
