-- Create a table for clients
create table "clients-real-estate" (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  password text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Optional but recommended)
alter table "clients-real-estate" enable row level security;

-- Allow read access to authenticated users (or service role) only
create policy "Allow read access to service role"
on "clients-real-estate"
for select
to service_role
using (true);

-- Add role and generation_count columns (Run this if table already exists)
alter table "clients-real-estate" 
add column role text default 'general',
add column generation_count int default 0;
