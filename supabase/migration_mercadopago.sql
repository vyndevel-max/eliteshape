-- ============================================================
-- MIGRATION: Mercado Pago subscription fields
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_customer_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_status TEXT DEFAULT 'inactive'
  CHECK (premium_status IN ('inactive', 'pending', 'authorized', 'paused', 'cancelled'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- Tabela de histórico de cobranças (auditoria + suporte ao cliente)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mp_subscription_id TEXT,
  mp_payment_id TEXT,
  event_type TEXT NOT NULL, -- 'subscription_created' | 'payment_approved' | 'payment_rejected' | 'subscription_cancelled'
  amount NUMERIC(10,2),
  status TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_events_own" ON public.payment_events
  FOR SELECT USING (auth.uid() = user_id);

-- Nenhuma policy de INSERT/UPDATE para usuários — só o backend (service role) escreve aqui
