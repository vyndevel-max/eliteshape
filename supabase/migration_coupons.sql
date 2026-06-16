-- ============================================================
-- MIGRATION: Sistema de cupons de desconto
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,              -- ex: "TESTE100", "AMIGO20"
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed_amount', 'fixed_price')),
  discount_value NUMERIC(10,2) NOT NULL,  -- 100 (=100%), 10.00 (=R$10 off), ou 0.01 (preço fixo de teste)
  max_uses INTEGER,                       -- null = ilimitado
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,                 -- null = nunca expira
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Histórico de uso (auditoria — quem usou qual cupom e quando)
CREATE TABLE IF NOT EXISTS public.coupon_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_read_active" ON public.coupons
  FOR SELECT USING (active = true);

CREATE POLICY "coupons_admin_write" ON public.coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "coupon_uses_own" ON public.coupon_uses
  FOR SELECT USING (auth.uid() = user_id);
