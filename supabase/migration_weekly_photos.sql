-- ============================================================
-- MIGRATION: Weekly evolution photos
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

-- 1. Tabela de fotos semanais de evolução
CREATE TABLE IF NOT EXISTS public.weekly_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  week_number INTEGER NOT NULL,          -- ISO week number
  year INTEGER NOT NULL,
  analysis_summary TEXT,                 -- resumo da IA para essa semana
  score NUMERIC(3,1),
  fat_percentage NUMERIC(4,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_number, year)     -- 1 foto por semana por usuário
);

ALTER TABLE public.weekly_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_photos_own" ON public.weekly_photos
  FOR ALL USING (auth.uid() = user_id);

-- 2. Storage bucket para fotos de evolução (crie via Dashboard se preferir)
-- Supabase Storage > New bucket > nome: "evolution-photos" > Public: false
-- Ou via SQL (requer extensão pg_storage que pode não estar disponível):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evolution-photos', 'evolution-photos', false)
-- ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket (execute após criar o bucket)
-- CREATE POLICY "evolution_photos_own_read" ON storage.objects FOR SELECT USING (
--   bucket_id = 'evolution-photos' AND auth.uid()::text = (storage.foldername(name))[1]
-- );
-- CREATE POLICY "evolution_photos_own_insert" ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'evolution-photos' AND auth.uid()::text = (storage.foldername(name))[1]
-- );

