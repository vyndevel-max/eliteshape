// src/app/api/subscription/coupon/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 15

const BASE_PRICE = 49.9

function applyDiscount(basePrice: number, type: string, value: number): number {
  if (type === 'percent') return Math.max(0, basePrice - (basePrice * value) / 100)
  if (type === 'fixed_amount') return Math.max(0, basePrice - value)
  if (type === 'fixed_price') return Math.max(0, value)
  return basePrice
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await req.json()
    if (!code?.trim()) return NextResponse.json({ error: 'Informe um código de cupom' }, { status: 400 })

    const normalizedCode = code.trim().toUpperCase()

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', normalizedCode)
      .eq('active', true)
      .maybeSingle()

    if (error || !coupon) {
      return NextResponse.json({ error: 'Cupom inválido ou inativo' }, { status: 404 })
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 })
    }

    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return NextResponse.json({ error: 'Cupom esgotado' }, { status: 400 })
    }

    const { data: alreadyUsed } = await supabase
      .from('coupon_uses')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (alreadyUsed) {
      return NextResponse.json({ error: 'Você já usou este cupom' }, { status: 400 })
    }

    const finalPrice = applyDiscount(BASE_PRICE, coupon.discount_type, coupon.discount_value)

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      couponId: coupon.id,
      originalPrice: BASE_PRICE,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
    })
  } catch (e: any) {
    console.error('coupon validation error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
