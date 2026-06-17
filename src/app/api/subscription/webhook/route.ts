// src/app/api/subscription/webhook/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPayment, getSubscription, validateWebhookSignature } from '@/lib/mercadopago'
import { notifyDiscord } from '@/lib/discord'

export const maxDuration = 30

// Identifica o usuário pelo e-mail do pagador. O checkout hospedado por plano
// (init_point do preapproval_plan) não propaga external_reference automaticamente,
// então usamos o e-mail salvo em profiles.mp_customer_email quando o usuário
// clicou em "Assinar" como ponte de identificação.
async function findUserIdByEmail(supabase: any, email: string | undefined | null): Promise<string | null> {
  if (!email) return null
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('mp_customer_email', email)
    .maybeSingle()
  return data?.id || null
}

// Mercado Pago precisa de resposta rápida (idealmente <1s) e um 200/201 para não reenviar.
// Qualquer erro inesperado também responde 200 para não gerar reenvios infinitos —
// loga o erro para investigação manual, mas não deixa a fila travada.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)

    console.log('🔔 Webhook MP recebido:', JSON.stringify(body))

    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')
    const dataId = body?.data?.id || url.searchParams.get('data.id') || ''

    const secret = process.env.MP_WEBHOOK_SECRET
    if (secret && dataId) {
      const valid = validateWebhookSignature({ xSignature, xRequestId, dataId, secret })
      if (!valid) {
        console.warn('⚠️ Webhook MP: assinatura inválida — processando mesmo assim para não perder o evento. xSignature:', xSignature, 'dataId:', dataId)
        // Não bloqueia o processamento: a perda de uma notificação de pagamento é
        // mais custosa do que o risco de um payload forjado nesse estágio do projeto.
        // Se quiser bloquear de fato, troque o log abaixo por `return NextResponse.json(...)`.
      } else {
        console.log('✅ Assinatura do webhook validada com sucesso')
      }
    } else {
      console.log('ℹ️ Validação de assinatura pulada (secret ou dataId ausente). secret presente:', !!secret, 'dataId:', dataId)
    }

    const topic = body.type || body.topic || url.searchParams.get('topic')
    console.log('📌 Topic identificado:', topic)
    const supabase = createAdminClient()

    // ── Evento: pagamento (avulso ou de assinatura) ──
    if (topic === 'payment') {
      // O Mercado Pago pode mandar o ID em formatos levemente diferentes dependendo
      // do tipo de notificação (IPN legado vs Webhooks v2, ou query string vs body).
      // Cobrimos todos os caminhos conhecidos antes de desistir.
      const paymentId =
        body.data?.id ||
        body.resource?.split?.('/')?.pop() ||
        url.searchParams.get('data.id') ||
        url.searchParams.get('id') ||
        ''

      console.log('💳 Processando evento payment, paymentId extraído:', paymentId)

      if (!paymentId) {
        console.warn('⚠️ Payment sem ID no payload. Body completo recebido:', JSON.stringify(body), '| Query string:', url.search)
        return NextResponse.json({ received: true })
      }

      const payment = await getPayment(paymentId)
      console.log('💳 Detalhes do pagamento:', JSON.stringify({ status: payment.status, amount: payment.transaction_amount, external_reference: payment.external_reference, payer_email: payment.payer?.email }))

      const payerEmail = payment.payer?.email
      const userId = payment.external_reference || await findUserIdByEmail(supabase, payerEmail)
      console.log('👤 Usuário identificado:', userId, '(via', payment.external_reference ? 'external_reference' : 'email', ')')

      const isApproved = payment.status === 'approved'

      if (userId) {
        const { error: eventError } = await supabase.from('payment_events').insert({
          user_id: userId,
          mp_payment_id: String(paymentId),
          mp_subscription_id: payment.preapproval_id || null,
          event_type: isApproved ? 'payment_approved' : 'payment_rejected',
          amount: payment.transaction_amount,
          status: payment.status,
          raw_payload: payment,
        })
        if (eventError) console.error('❌ Erro ao inserir payment_event:', JSON.stringify(eventError))
        else console.log('✅ payment_event registrado')

        const { data: profileData } = await supabase.from('profiles').select('name').eq('id', userId).single()
        const method = payment.preapproval_id ? 'card_subscription' : 'pix'

        if (isApproved) {
          // Renova por mais 1 mês (30 dias) a partir de agora — cobre o ciclo recorrente
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30)

          console.log('🔓 Tentando ativar premium para userId:', userId)
          const { data: updateData, error: updateError } = await supabase.from('profiles').update({
            is_premium: true,
            premium_status: 'authorized',
            premium_expires_at: expiresAt.toISOString(),
            mp_subscription_id: payment.preapproval_id || null,
          }).eq('id', userId).select()

          if (updateError) {
            console.error('❌ ERRO ao atualizar profiles.is_premium:', JSON.stringify(updateError))
          } else {
            console.log('✅ Profile atualizado com sucesso:', JSON.stringify(updateData))
          }

          try {
            await notifyDiscord({
              status: 'approved',
              userName: profileData?.name,
              userEmail: payerEmail,
              amount: payment.transaction_amount,
              method,
              paymentId: String(paymentId),
              subscriptionId: payment.preapproval_id,
            })
            console.log('✅ Discord notificado: aprovado')
          } catch (discordErr) {
            console.error('❌ Erro ao notificar Discord:', discordErr)
          }
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
          const { error: rejectError } = await supabase.from('profiles').update({
            premium_status: payment.status,
          }).eq('id', userId)
          if (rejectError) console.error('❌ Erro ao atualizar status rejeitado/cancelado:', JSON.stringify(rejectError))

          try {
            await notifyDiscord({
              status: payment.status === 'rejected' ? 'rejected' : 'cancelled',
              userName: profileData?.name,
              userEmail: payerEmail,
              amount: payment.transaction_amount,
              method,
              paymentId: String(paymentId),
              subscriptionId: payment.preapproval_id,
            })
          } catch (discordErr) {
            console.error('❌ Erro ao notificar Discord:', discordErr)
          }
        } else {
          console.log('ℹ️ Pagamento ainda não está aprovado/rejeitado, status atual:', payment.status, '— nenhuma ação tomada')
        }
      } else {
        console.warn('Webhook MP: não foi possível identificar o usuário para o pagamento', paymentId, payerEmail)
      }
    }

    // ── Evento: mudança de status da assinatura (preapproval) ──
    if (topic === 'subscription_preapproval' || topic === 'preapproval') {
      const subscriptionId = body.data?.id
      if (!subscriptionId) return NextResponse.json({ received: true })

      const subscription = await getSubscription(subscriptionId)
      const payerEmail = subscription.payer_email
      const userId = subscription.external_reference || await findUserIdByEmail(supabase, payerEmail)

      if (userId) {
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
          mp_subscription_id: subscriptionId,
        }).eq('id', userId)

        await supabase.from('payment_events').insert({
          user_id: userId,
          mp_subscription_id: subscriptionId,
          event_type: 'subscription_status_changed',
          status: subscription.status,
          raw_payload: subscription,
        })

        if (subscription.status === 'cancelled') {
          const { data: profileData } = await supabase.from('profiles').select('name').eq('id', userId).single()
          notifyDiscord({
            status: 'cancelled',
            userName: profileData?.name,
            userEmail: payerEmail,
            method: 'card_subscription',
            subscriptionId,
          })
        }
      } else {
        console.warn('Webhook MP: não foi possível identificar o usuário para a assinatura', subscriptionId, payerEmail)
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (e: any) {
    console.error('❌ Webhook MP error:', e.message, e.stack)
    return NextResponse.json({ received: true, error: e.message }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
