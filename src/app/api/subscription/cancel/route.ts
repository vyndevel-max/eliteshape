// src/app/api/subscription/cancel/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSubscriptionStatus } from '@/lib/mercadopago'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('mp_subscription_id')
      .eq('id', user.id)
      .single()

    if (!profile?.mp_subscription_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 400 })
    }

    await updateSubscriptionStatus(profile.mp_subscription_id, 'cancelled')

    await supabase.from('profiles').update({
      premium_status: 'cancelled',
      is_premium: false,
    }).eq('id', user.id)

    await supabase.from('payment_events').insert({
      user_id: user.id,
      mp_subscription_id: profile.mp_subscription_id,
      event_type: 'subscription_cancelled',
      status: 'cancelled',
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('cancel error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
