// src/app/api/subscription/webhook/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPayment, getSubscription, validateWebhookSignature } from '@/lib/mercadopago'

export const maxDuration = 30

// Mercado Pago precisa de resposta rápida (idealmente <1s) e um 200/201 para não reenviar.
// Qualquer erro inesperado também responde 200 para não gerar reenvios infinitos —
// loga o erro para investigação manual, mas não deixa a fila travada.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)

    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')
    const dataId = body?.data?.id || url.searchParams.get('data.id') || ''

    const secret = process.env.MP_WEBHOOK_SECRET
    if (secret && dataId) {
      const valid = validateWebhookSignature({ xSignature, xRequestId, dataId, secret })
      if (!valid) {
        console.warn('Webhook MP: assinatura inválida, ignorando')
        return NextResponse.json({ received: true }, { status: 200 })
      }
    }

    const topic = body.type || body.topic || url.searchParams.get('topic')
    const supabase = createClient()

    // ── Evento: pagamento (avulso ou de assinatura) ──
    if (topic === 'payment') {
      const paymentId = body.data?.id
      if (!paymentId) return NextResponse.json({ received: true })

      const payment = await getPayment(paymentId)
      const externalRef = payment.external_reference // user.id que enviamos ao criar a assinatura
      const isApproved = payment.status === 'approved'

      if (externalRef) {
        await supabase.from('payment_events').insert({
          user_id: externalRef,
          mp_payment_id: String(paymentId),
          mp_subscription_id: payment.preapproval_id || null,
          event_type: isApproved ? 'payment_approved' : 'payment_rejected',
          amount: payment.transaction_amount,
          status: payment.status,
          raw_payload: payment,
        })

        if (isApproved) {
          // Renova por mais 1 mês (30 dias) a partir de agora — cobre o ciclo recorrente
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30)

          await supabase.from('profiles').update({
            is_premium: true,
            premium_status: 'authorized',
            premium_expires_at: expiresAt.toISOString(),
          }).eq('id', externalRef)
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
          await supabase.from('profiles').update({
            premium_status: payment.status,
          }).eq('id', externalRef)
        }
      }
    }

    // ── Evento: mudança de status da assinatura (preapproval) ──
    if (topic === 'subscription_preapproval' || topic === 'preapproval') {
      const subscriptionId = body.data?.id
      if (!subscriptionId) return NextResponse.json({ received: true })

      const subscription = await getSubscription(subscriptionId)
      const externalRef = subscription.external_reference

      if (externalRef) {
        const statusMap: Record<string, string> = {
          authorized: 'authorized',
          paused: 'paused',
          cancelled: 'cancelled',
          pending: 'pending',
        }
        const newStatus = statusMap[subscription.status] || 'pending'

        await supabase.from('profiles').update({
          premium_status: newStatus,
          is_premium: newStatus === 'authorized',
        }).eq('id', externalRef)

        await supabase.from('payment_events').insert({
          user_id: externalRef,
          mp_subscription_id: subscriptionId,
          event_type: 'subscription_status_changed',
          status: subscription.status,
          raw_payload: subscription,
        })
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (e: any) {
    console.error('webhook MP error', e)
    return NextResponse.json({ received: true, error: e.message }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
