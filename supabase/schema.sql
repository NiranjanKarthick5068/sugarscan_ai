-- ============================================================
-- SugarScan AI — Supabase Schema + RLS
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_stat_statements";

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
--    Extended user data beyond auth.users
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  avatar_url     text,
  date_of_birth  date,
  gender         text check (gender in ('male','female','other','prefer_not_to_say')),
  diabetes_type  text check (diabetes_type in ('type1','type2','prediabetes','gestational','other')),
  diagnosis_year int,
  target_glucose_min float default 70,
  target_glucose_max float default 140,
  units          text default 'mg/dL' check (units in ('mg/dL','mmol/L')),
  timezone       text default 'UTC',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. HEALTH PROFILES
-- ────────────────────────────────────────────────────────────
create table if not exists public.health_profiles (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  medications    text[],
  allergies      text[],
  blood_type     text,
  weight_kg      float,
  height_cm      float,
  a1c_percent    float,
  comorbidities  text[],
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(user_id)
);

alter table public.health_profiles enable row level security;
create policy "Users can manage own health profile" on public.health_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 3. MEAL SCANS  (replaces local Postgres `scans` table)
-- ────────────────────────────────────────────────────────────
create table if not exists public.meal_scans (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  image_url       text,           -- Supabase Storage public URL
  image_path      text,           -- Supabase Storage path (for deletion)
  food_name       text,
  serving_size    text,
  estimated_weight_g float,
  nutrition_data  jsonb,          -- { calories, carbs_g, sugar_g, protein_g, fat_g, fiber_g, ... }
  glycemic_data   jsonb,          -- { glycemic_index, glycemic_load, estimated_spike_mg_dl, diabetes_safety_score }
  risk_level      text check (risk_level in ('low','moderate','high','critical')),
  recommendations text[],
  alternatives    jsonb,          -- [{ name, reason }]
  rag_sources     text[],         -- RAG grounded sources
  is_estimate_fallback boolean default false,
  meal_type       text check (meal_type in ('breakfast','lunch','dinner','snack')),
  scanned_at      timestamptz default now(),
  created_at      timestamptz default now()
);

alter table public.meal_scans enable row level security;
create policy "Users can manage own meal scans" on public.meal_scans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime — subscribe on INSERT for dashboard live updates
alter publication supabase_realtime add table public.meal_scans;

-- ────────────────────────────────────────────────────────────
-- 4. GLUCOSE READINGS
-- ────────────────────────────────────────────────────────────
create table if not exists public.glucose_readings (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  glucose_value_mg_dl   float not null,
  measured_at           timestamptz default now(),
  context               text check (context in ('fasting','before_meal','after_meal','bedtime','random')),
  notes                 text,
  source                text default 'manual' check (source in ('manual','cgm','device'))
);

alter table public.glucose_readings enable row level security;
create policy "Users can manage own glucose readings" on public.glucose_readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.glucose_readings;

-- ────────────────────────────────────────────────────────────
-- 5. EMERGENCY CONTACTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.emergency_contacts (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  name                 text not null,
  phone                text not null,
  country_code         text default '+1',
  relationship         text check (relationship in ('spouse','parent','child','sibling','friend','doctor','other')),
  notify_on_critical   boolean default true,
  created_at           timestamptz default now()
);

alter table public.emergency_contacts enable row level security;
create policy "Users can manage own emergency contacts" on public.emergency_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. CHAT SESSIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.chat_sessions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text,
  created_at timestamptz default now()
);

alter table public.chat_sessions enable row level security;
create policy "Users can manage own chat sessions" on public.chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 7. CHAT MESSAGES
-- ────────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;
create policy "Users can manage own chat messages" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 8. MEDICATIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.medications (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  dosage       text,
  frequency    text,
  timing       text,
  notes        text,
  active       boolean default true,
  created_at   timestamptz default now()
);

alter table public.medications enable row level security;
create policy "Users can manage own medications" on public.medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 9. ACTIVITY LOGS
-- ────────────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  activity_type text,
  duration_min  int,
  calories_burned float,
  logged_at     timestamptz default now()
);

alter table public.activity_logs enable row level security;
create policy "Users can manage own activity logs" on public.activity_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 10. STORAGE BUCKETS
-- ────────────────────────────────────────────────────────────
-- Run these via: Supabase Dashboard → Storage → New Bucket
-- Or via supabase CLI:
--
--   supabase storage buckets create meal-scans --public false
--   supabase storage buckets create avatars --public true
--
-- Storage RLS policies (run after creating buckets):
insert into storage.buckets (id, name, public)
values ('meal-scans', 'meal-scans', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to meal-scans
create policy "Auth users can upload meal scans" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-scans' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own meal scan images
create policy "Users can read own meal scans" on storage.objects
  for select to authenticated
  using (bucket_id = 'meal-scans' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own meal scan images
create policy "Users can delete own meal scans" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-scans' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read for avatars
CREATE POLICY "Public read for avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- 3. USER PROFILES
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    age INTEGER,
    diabetes_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- 4. USER ACHIEVEMENTS
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own achievements" ON public.user_achievements
    FOR ALL USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- HELPER: Auto-create profile on signup
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant permissions to authenticated, anon, and service_role roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- ────────────────────────────────────────────────────────────
-- 11. PGVECTOR & HYBRID SEARCH (RAG)
-- ────────────────────────────────────────────────────────────
create extension if not exists vector;

-- Table for Nutrition Facts RAG
create table if not exists public.nutrition_facts_embeddings (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  metadata jsonb,
  embedding vector(384) -- all-MiniLM-L6-v2 outputs 384 dimensions
);

-- Table for Diabetes Guidelines RAG
create table if not exists public.diabetes_guidelines_embeddings (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  metadata jsonb,
  embedding vector(384)
);

-- Hybrid Search RPC for Diabetes Guidelines (Semantic + Keyword)
create or replace function public.match_guidelines_hybrid(
  query_text text,
  query_embedding vector(384),
  match_count int default 20
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    e.content,
    e.metadata,
    -- Combine Cosine similarity (1 - distance) and a basic text match boost
    (1 - (e.embedding <=> query_embedding)) + 
    case when e.content ilike '%' || query_text || '%' then 0.1 else 0.0 end as similarity
  from public.diabetes_guidelines_embeddings e
  order by similarity desc
  limit match_count;
end;
$$;

-- Hybrid Search RPC for Nutrition Facts
create or replace function public.match_nutrition_hybrid(
  query_text text,
  query_embedding vector(384),
  match_count int default 20
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    e.content,
    e.metadata,
    (1 - (e.embedding <=> query_embedding)) + 
    case when e.content ilike '%' || query_text || '%' then 0.1 else 0.0 end as similarity
  from public.nutrition_facts_embeddings e
  order by similarity desc
  limit match_count;
end;
$$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, anon, service_role;
