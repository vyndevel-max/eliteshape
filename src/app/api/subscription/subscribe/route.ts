// src/app/api/subscription/subscribe/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSubscriptionPlan, createSubscription } from '@/lib/mercadopago'

export const maxDuration = 30

// Cacheia o plan_id em memória do processo para não recriar o plano em toda chamada.
// Em produção, idealmente isso é criado uma única vez e salvo numa env var/config.
let cachedPlanId: string | null = process.env.MP_PREMIUM_PLAN_ID || null

async function getOrCreatePlanId(appUrl: string): Promise<string> {
  if (cachedPlanId) return cachedPlanId
  const plan = await createSubscriptionPlan({
    reason: 'FORGE Premium Mensal',
    amount: 49.9,
    frequencyType: 'months',
    backUrl: appUrl,
  })
  cachedPlanId = plan.id
  return plan.id
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eliteshape-eta.vercel.app'
    const planId = await getOrCreatePlanId(appUrl)

    const subscription = await createSubscription({
      planId,
      payerEmail: user.email,
      externalReference: user.id,
      backUrl: `${appUrl}/?subscribed=1`,
    })

    // Marca como "pending" — só fica "authorized" quando o webhook confirmar
    await supabase.from('profiles').update({
      mp_subscription_id: subscription.id,
      mp_customer_email: user.email,
      premium_status: 'pending',
    }).eq('id', user.id)

    await supabase.from('payment_events').insert({
      user_id: user.id,
      mp_subscription_id: subscription.id,
      event_type: 'subscription_created',
      status: subscription.status,
      raw_payload: subscription,
    })

    return NextResponse.json({ checkoutUrl: subscription.init_point })
  } catch (e: any) {
    console.error('subscribe error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
