-- Rode isso no SQL Editor do Supabase (novo projeto)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_foods TEXT;
