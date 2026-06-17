// src/app/api/subscription/subscribe/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSubscriptionPlan } from '@/lib/mercadopago'
import { notifyDiscord } from '@/lib/discord'

export const maxDuration = 30

const BASE_PRICE = 49.9

function applyDiscount(basePrice: number, type: string, value: number): number {
  if (type === 'percent') return Math.max(0.01, basePrice - (basePrice * value) / 100)
  if (type === 'fixed_amount') return Math.max(0.01, basePrice - value)
  if (type === 'fixed_price') return Math.max(0.01, value)
  return basePrice
}

// Cacheia o plano padrão (sem cupom) em memória do processo, para não recriar
// em toda chamada. Planos com cupom (valor diferente) são sempre criados na hora,
// pois o Mercado Pago não permite alterar o preço de um plano já existente.
let cachedDefaultPlanId: string | null = process.env.MP_PREMIUM_PLAN_ID || null
let cachedDefaultInitPoint: string | null = null

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { couponId } = await req.json().catch(() => ({}))
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eliteshape-eta.vercel.app'

    let amount = BASE_PRICE
    let planReason = 'FORGE Premium Mensal'
    let coupon: any = null

    if (couponId) {
      const { data } = await supabase.from('coupons').select('*').eq('id', couponId).eq('active', true).single()
      if (data) {
        coupon = data
        amount = applyDiscount(BASE_PRICE, data.discount_type, data.discount_value)
        amount = Math.round(amount * 100) / 100
        planReason = `FORGE Premium Mensal — Cupom ${data.code}`
      }
    }

    let plan: { id: string; init_point?: string }

    if (!coupon && cachedDefaultPlanId && cachedDefaultInitPoint) {
      // Reusa o plano padrão já criado (sem cupom) — evita criar um novo plano idêntico a cada assinatura
      plan = { id: cachedDefaultPlanId, init_point: cachedDefaultInitPoint }
    } else {
      plan = await createSubscriptionPlan({
        reason: planReason,
        amount,
        frequencyType: 'months',
        backUrl: `${appUrl}/?subscribed=1`,
      })
      if (!coupon) {
        cachedDefaultPlanId = plan.id
        cachedDefaultInitPoint = plan.init_point || null
      }
    }

    if (!plan.init_point) {
      throw new Error('Mercado Pago não retornou o link de checkout do plano')
    }

    // Salva o e-mail do usuário como referência — o webhook usará esse e-mail
    // (vindo do pagamento aprovado) para identificar a qual perfil ativar o premium.
    try {
      await supabase.from('profiles').update({
        mp_customer_email: user.email,
        premium_status: 'pending',
      }).eq('id', user.id)
    } catch (e) {
      console.error('Erro ao atualizar profile (não crítico):', e)
    }

    try {
      await supabase.from('payment_events').insert({
        user_id: user.id,
        mp_subscription_id: plan.id,
        event_type: 'checkout_started',
        amount,
        status: 'pending',
        raw_payload: { plan_id: plan.id, payer_email: user.email, coupon_code: coupon?.code },
      })
    } catch (e) {
      console.error('Erro ao registrar payment_event (não crítico):', e)
    }

    if (coupon) {
      try {
        const { error: insertError } = await supabase.from('coupon_uses').insert({ coupon_id: coupon.id, user_id: user.id })
        if (insertError) {
          console.warn('Cupom já usado por este usuário ou erro ao registrar uso:', insertError.message)
        } else {
          await supabase.from('coupons').update({ uses_count: (coupon.uses_count || 0) + 1 }).eq('id', coupon.id)
        }
      } catch (e) {
        console.error('Erro ao processar uso do cupom (não crítico):', e)
      }
    }

    try {
      const { data: profileData } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      await notifyDiscord({
        status: 'pending',
        userName: profileData?.name,
        userEmail: user.email,
        amount,
        method: 'card_subscription',
        subscriptionId: plan.id,
      })
    } catch (e) {
      console.error('Erro ao notificar Discord (não crítico):', e)
    }

    // Redireciona o usuário para o checkout hospedado do Mercado Pago.
    // Lá ele faz login com o MESMO e-mail (ou digita o e-mail no formulário de
    // cartão) e o pagamento/assinatura fica vinculado a esse e-mail.
    return NextResponse.json({ checkoutUrl: plan.init_point, amount })
  } catch (e: any) {
    console.error('subscribe error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
