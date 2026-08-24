-- Adds the ambient_sound preference used by the ambient audio layer
-- (lib/ambient.ts, app/ambient-picker.tsx). Run this against the live
-- Supabase project via the SQL editor — schema.sql is only for fresh setups.
alter table public.preferences
  add column if not exists ambient_sound text default 'silence';
