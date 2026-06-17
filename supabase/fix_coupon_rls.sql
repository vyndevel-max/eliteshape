-- ============================================================
-- FIX: Política de INSERT faltando em coupon_uses
-- Rode cada bloco separadamente no SQL Editor do Supabase
-- ============================================================

-- 1. O usuário autenticado precisa poder REGISTRAR o próprio uso de cupom
CREATE POLICY "coupon_uses_insert_own" ON public.coupon_uses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Permitir que o usuário autenticado incremente uses_count do cupom usado
CREATE POLICY "coupons_increment_uses" ON public.coupons
  FOR UPDATE USING (active = true) WITH CHECK (active = true);
