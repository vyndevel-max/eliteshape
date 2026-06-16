// src/app/api/subscription/subscribe/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSubscriptionPlan } from '@/lib/mercadopago'
import { notifyDiscord } from '@/lib/discord'

export const maxDuration = 30

// Cacheia o plan_id em memória do processo para não recriar o plano em toda chamada.
// Em produção, idealmente isso é criado uma única vez e salvo numa env var/config.
let cachedPlanId: string | null = process.env.MP_PREMIUM_PLAN_ID || null
let cachedInitPoint: string | null = null

async function getOrCreatePlan(appUrl: string): Promise<{ id: string; init_point?: string }> {
  if (cachedPlanId && cachedInitPoint) return { id: cachedPlanId, init_point: cachedInitPoint }
  const plan = await createSubscriptionPlan({
    reason: 'FORGE Premium Mensal',
    amount: 49.9,
    frequencyType: 'months',
    backUrl: `${appUrl}/?subscribed=1`,
  })
  cachedPlanId = plan.id
  cachedInitPoint = plan.init_point || null
  return plan
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eliteshape-eta.vercel.app'
    const plan = await getOrCreatePlan(appUrl)

    if (!plan.init_point) {
      throw new Error('Mercado Pago não retornou o link de checkout do plano')
    }

    // Salva o e-mail do usuário como referência — o webhook usará esse e-mail
    // (vindo do pagamento aprovado) para identificar a qual perfil ativar o premium.
    await supabase.from('profiles').update({
      mp_customer_email: user.email,
      premium_status: 'pending',
    }).eq('id', user.id)

    await supabase.from('payment_events').insert({
      user_id: user.id,
      mp_subscription_id: plan.id,
      event_type: 'checkout_started',
      status: 'pending',
      raw_payload: { plan_id: plan.id, payer_email: user.email },
    })

    const { data: profileData } = await supabase.from('profiles').select('name').eq('id', user.id).single()
    notifyDiscord({
      status: 'pending',
      userName: profileData?.name,
      userEmail: user.email,
      amount: 49.9,
      method: 'card_subscription',
      subscriptionId: plan.id,
    })

    // Redireciona o usuário para o checkout hospedado do Mercado Pago.
    // Lá ele faz login com o MESMO e-mail (ou digita o e-mail no formulário de
    // cartão) e o pagamento/assinatura fica vinculado a esse e-mail.
    return NextResponse.json({ checkoutUrl: plan.init_point })
  } catch (e: any) {
    console.error('subscribe error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
