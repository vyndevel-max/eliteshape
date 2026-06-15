-- ============================================================
-- ELITESHAPE AI — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  points INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'pt' CHECK (language IN ('pt', 'en')),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  avatar_url TEXT,
  -- Physical data
  age INTEGER,
  height NUMERIC(5,1),
  weight NUMERIC(5,1),
  fat_percentage NUMERIC(4,1),
  gender TEXT CHECK (gender IN ('male', 'female')),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  training_level TEXT CHECK (training_level IN ('beginner', 'intermediate', 'advanced')),
  objective TEXT,
  training_time TEXT,
  routine TEXT,
  sleep TEXT,
  current_diet TEXT,
  financial_condition TEXT CHECK (financial_condition IN ('low', 'medium', 'high')),
  wants_supplements BOOLEAN DEFAULT false,
  personality_mode TEXT DEFAULT 'motivational' CHECK (personality_mode IN ('motivational', 'technical', 'raiz')),
  -- Generated plans
  training_plan TEXT,
  nutrition_plan TEXT,
  last_analysis TEXT,
  target_calories INTEGER,
  target_protein INTEGER,
  target_carbs INTEGER,
  target_fat INTEGER,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEIGHT HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weight_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight NUMERIC(5,1) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEALS / FOOD LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories NUMERIC(6,1) NOT NULL DEFAULT 0,
  protein NUMERIC(5,1) DEFAULT 0,
  carbs NUMERIC(5,1) DEFAULT 0,
  fat NUMERIC(5,1) DEFAULT 0,
  meal_type TEXT DEFAULT 'other' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WATER LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL DEFAULT 250,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHAPE HISTORY (AI Body Analysis)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shape_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  analysis JSONB NOT NULL DEFAULT '{}',
  fat_percentage NUMERIC(4,1),
  muscle_score INTEGER CHECK (muscle_score BETWEEN 0 AND 10),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKOUT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workout_day TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  duration_minutes INTEGER,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHAT HISTORY (AI Coach conversations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHALLENGES (90-day transformation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  current_day INTEGER NOT NULL DEFAULT 1,
  before_image_url TEXT,
  after_image_url TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- DAILY MISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  protein_met BOOLEAN DEFAULT false,
  training_done BOOLEAN DEFAULT false,
  cardio_done BOOLEAN DEFAULT false,
  water_met BOOLEAN DEFAULT false,
  UNIQUE(user_id, date)
);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- ============================================================
-- SYSTEM SETTINGS (admin-controlled)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_settings (key, value) VALUES
  ('free_daily_analyses', '1'),
  ('premium_daily_analyses', '20'),
  ('free_chat_messages_per_day', '10'),
  ('premium_chat_messages_per_day', '200'),
  ('maintenance_mode', 'false'),
  ('premium_price_brl', '49.90'),
  ('premium_price_usd', '9.90')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shape_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/write their own; admins read all
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- All user-owned tables: users manage their own data
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['weight_history','meals','water_logs','shape_history','workout_logs','chat_messages','challenges','daily_missions','achievements']
  LOOP
    EXECUTE format(
      'CREATE POLICY "%s_own" ON public.%I FOR ALL USING (auth.uid() = user_id)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- System settings: everyone reads, only service role writes
CREATE POLICY "settings_read" ON public.system_settings
  FOR SELECT USING (true);

-- ============================================================
-- TRIGGERS: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update profiles.updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- STORAGE BUCKETS (run separately in Storage dashboard or here)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('shape-photos', 'shape-photos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies (adjust as needed):
-- CREATE POLICY "shape_photos_user" ON storage.objects FOR ALL
--   USING (bucket_id = 'shape-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
