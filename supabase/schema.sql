-- ============================================================
-- Morning Q — Full Database Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Drop existing policies/tables if re-running
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists alarms_updated_at on public.alarms;
drop trigger if exists categories_updated_at on public.categories;
drop trigger if exists preferences_updated_at on public.preferences;

drop table if exists public.activity cascade;
drop table if exists public.scores cascade;
drop table if exists public.categories cascade;
drop table if exists public.preferences cascade;
drop table if exists public.chat_messages cascade;
drop table if exists public.alarms cascade;
drop table if exists public.profiles cascade;


-- 1. PROFILES (auto-created on sign-up via trigger)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  username text unique,
  bio text,
  avatar_url text,
  score int default 0,
  day_streak int default 0,
  sessions_completed int default 0,
  total_hours numeric(6,1) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);


-- 2. ALARMS
create table public.alarms (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  label text not null default 'Alarm',
  next_fire_at timestamptz not null,
  repeat_days int[] default '{}',
  mantra_id text not null default 'focus',
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.alarms enable row level security;
create policy "Users CRUD own alarms" on public.alarms for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 3. CHAT MESSAGES
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;
create policy "Users CRUD own messages" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 4. SCORES (time series for profile chart)
create table public.scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  score int not null,
  recorded_at timestamptz default now()
);

alter table public.scores enable row level security;
create policy "Users CRUD own scores" on public.scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 5. CATEGORIES (Sleep, Confidence, etc.)
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  progress int default 0 check (progress >= 0 and progress <= 100),
  updated_at timestamptz default now()
);

alter table public.categories enable row level security;
create policy "Users CRUD own categories" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 6. ACTIVITY LOG
create table public.activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  category text,
  duration_min int,
  completed_at timestamptz default now()
);

alter table public.activity enable row level security;
create policy "Users CRUD own activity" on public.activity for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 7. PREFERENCES
create table public.preferences (
  user_id uuid references auth.users on delete cascade primary key,
  notifications boolean default true,
  haptics boolean default true,
  dark_mode boolean default true,
  default_sound text default 'focus',
  default_duration_min int default 10,
  ambient_sound text default 'silence',
  updated_at timestamptz default now()
);

alter table public.preferences enable row level security;
create policy "Users CRUD own preferences" on public.preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- 8. AUTO-CREATE PROFILE ON SIGN-UP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1)),
    coalesce(new.raw_user_meta_data->>'last_name', nullif(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 2), ''))
  );
  insert into public.preferences (user_id) values (new.id);
  insert into public.categories (user_id, name, progress) values
    (new.id, 'Sleep', 0),
    (new.id, 'Confidence', 0),
    (new.id, 'Addiction', 0),
    (new.id, 'Anxiety', 0),
    (new.id, 'Gratitude', 0),
    (new.id, 'Mindfulness', 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 9. UPDATED_AT TRIGGERS
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger alarms_updated_at before update on public.alarms for each row execute procedure public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
create trigger preferences_updated_at before update on public.preferences for each row execute procedure public.set_updated_at();


-- 10. SESSIONS (audio content library — public, not user-scoped)
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null default '',
  category text not null,
  narrator text not null default 'Samantha',
  duration_sec int not null default 60,
  audio_url text,             -- remote URL (Supabase Storage or CDN) — null = bundled asset
  audio_asset text,           -- local asset key (e.g. "deep-sleep") — used when audio_url is null
  plays int default 0,
  mantras text[] default '{}',
  created_at timestamptz default now()
);

-- Sessions are public content — everyone can read, only service role can write
alter table public.sessions enable row level security;
create policy "Anyone can read sessions" on public.sessions for select using (true);


-- 11. INDEXES
create index idx_alarms_user on public.alarms (user_id);
create index idx_chat_user on public.chat_messages (user_id, created_at);
create index idx_scores_user on public.scores (user_id, recorded_at);
create index idx_categories_user on public.categories (user_id);
create index idx_activity_user on public.activity (user_id, completed_at);
create index idx_sessions_category on public.sessions (category);


-- 12. SEED SESSIONS
insert into public.sessions (title, description, category, narrator, duration_sec, audio_asset, plays, mantras) values
  ('Quit Vaping', 'Break free from nicotine with guided breathwork and powerful affirmations.', 'Addiction', 'Samantha', 1680, 'quit-vaping', 6452,
    '{"Each craving is a wave. You can ride it without giving in.","Your lungs are healing with every clean breath.","Freedom feels better than any hit ever did."}'),
  ('Improve Focus', 'Sharpen your concentration and build laser-like attention through guided mindfulness.', 'Confidence', 'Samantha', 1320, 'improve-focus', 6452,
    '{"Your mind is a garden. You choose what grows here.","Each exhale releases tension. Each inhale fills you with clarity and light.","You are the author of your own story. Write it with intention and power."}'),
  ('Stop Social Media Addiction', 'Reclaim your attention from endless scrolling with awareness techniques.', 'Addiction', 'Samantha', 1200, 'stop-scrolling', 6452,
    '{"Your attention is your most valuable resource.","Every moment spent here is a moment chosen, not lost.","Put the screen down. The real world is waiting for you."}'),
  ('Stop Overeating', 'Develop a healthier relationship with food through mindful eating practices.', 'Addiction', 'Samantha', 2100, 'overeating-reset', 6452,
    '{"You eat to nourish, not to fill a void.","Pause before each bite. Notice the flavor. Notice the fullness.","Your body knows what it needs. Trust it."}'),
  ('Deep Sleep Induction', 'Drift into deep, restorative sleep with guided breathing and calming visualization.', 'Sleep', 'Samantha', 3480, 'deep-sleep', 12841,
    '{"Let go of the day. It has served its purpose.","Your body is heavy. Your mind is still.","Sleep is a gift you give yourself freely."}'),
  ('Morning Confidence Ritual', 'Start your day with powerful affirmations designed to build unshakeable self-belief.', 'Confidence', 'Samantha', 720, 'morning-confidence', 8203,
    '{"Your mind is a garden. You choose what grows here.","Each exhale releases tension. Each inhale fills you with clarity and light.","You are the author of your own story. Write it with intention and power."}'),
  ('Circadian Reset', 'Realign your body clock with a guided wind-down session for better sleep quality.', 'Sleep', 'Samantha', 2700, 'circadian-reset', 4109,
    '{"Your body has an ancient rhythm. Honor it.","Darkness invites rest. Let it come.","Tomorrow begins with how you end tonight."}'),
  ('Gratitude Flood', 'A short mindfulness session to fill your awareness with gratitude and presence.', 'Mindfulness', 'Samantha', 600, 'gratitude-flood', 9721,
    '{"Name three things that went right today.","Gratitude rewires your brain for joy.","What you appreciate, appreciates."}'),
  ('Worry Dissolve', 'Gently release anxious thoughts and find calm through progressive relaxation.', 'Anxiety', 'Samantha', 1320, 'worry-dissolve', 5334,
    '{"Gently release your anxious thoughts.","With each breath, tension melts away.","Peace is your natural state."}'),
  ('Panic Relief', 'A quick-access session to help you regain calm during moments of intense anxiety.', 'Anxiety', 'Samantha', 900, 'panic-relief', 7510,
    '{"You are safe right now.","This feeling will pass.","You have survived every difficult moment before this one."}'),
  ('Self-Worth Boost', 'Reprogram limiting beliefs and build a stronger sense of your own value.', 'Confidence', 'Samantha', 1080, 'self-worth', 3892,
    '{"You are worthy exactly as you are.","Your value does not decrease based on someone''s inability to see your worth.","You deserve love, success, and happiness."}');
