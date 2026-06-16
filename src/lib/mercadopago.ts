// src/lib/mercadopago.ts
// Cliente mínimo para a API REST do Mercado Pago — Assinaturas (Preapproval)
// Docs: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview

const MP_API = 'https://api.mercadopago.com'
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN

function authHeaders() {
  if (!ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  }
}

export interface MPPreapprovalPlan {
  id: string
  init_point?: string
}

/**
 * Cria um plano de assinatura recorrente (preapproval_plan).
 * Chame uma única vez por "produto" (ex: "FORGE Premium Mensal") e reutilize o id.
 */
export async function createSubscriptionPlan(params: {
  reason: string
  amount: number // em reais, ex: 49.90
  frequency?: number
  frequencyType?: 'days' | 'months'
  backUrl: string
}): Promise<MPPreapprovalPlan> {
  const { reason, amount, frequency = 1, frequencyType = 'months', backUrl } = params

  const res = await fetch(`${MP_API}/preapproval_plan`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      reason,
      auto_recurring: {
        frequency,
        frequency_type: frequencyType,
        transaction_amount: amount,
        currency_id: 'BRL',
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }],
      },
      back_url: backUrl,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao criar plano MP: ${res.status} ${err}`)
  }
  return res.json()
}

export interface MPSubscription {
  id: string
  status: string
  init_point?: string
}

/**
 * Inscreve um usuário em um plano de assinatura existente.
 * Retorna init_point — a URL de checkout para redirecionar o usuário.
 */
export async function createSubscription(params: {
  planId: string
  payerEmail: string
  externalReference: string // ex: user.id do Supabase
  backUrl: string
}): Promise<MPSubscription> {
  const { planId, payerEmail, externalReference, backUrl } = params

  const res = await fetch(`${MP_API}/preapproval`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      preapproval_plan_id: planId,
      payer_email: payerEmail,
      external_reference: externalReference,
      back_url: backUrl,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao criar assinatura MP: ${res.status} ${err}`)
  }
  return res.json()
}

/** Busca os dados completos de uma assinatura pelo ID. */
export async function getSubscription(subscriptionId: string): Promise<any> {
  const res = await fetch(`${MP_API}/preapproval/${subscriptionId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao buscar assinatura MP: ${res.status} ${err}`)
  }
  return res.json()
}

/** Cancela (ou pausa) uma assinatura existente. */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: 'cancelled' | 'paused' | 'authorized'
): Promise<any> {
  const res = await fetch(`${MP_API}/preapproval/${subscriptionId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao atualizar assinatura MP: ${res.status} ${err}`)
  }
  return res.json()
}

/** Busca os detalhes de um pagamento específico pelo ID (usado no webhook). */
export async function getPayment(paymentId: string): Promise<any> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao buscar pagamento MP: ${res.status} ${err}`)
  }
  return res.json()
}

/**
 * Valida a assinatura do webhook (header x-signature) usando o secret configurado
 * no painel do Mercado Pago (Webhooks > Configurar notificações).
 * Formato do header: "ts=1704908010,v1=618c85345248dd820d5fd456117c2...."
 */
export function validateWebhookSignature(params: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string
  secret: string
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params
  if (!xSignature) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map(p => {
      const [k, v] = p.split('=')
      return [k.trim(), v?.trim()]
    })
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`

  const crypto = require('crypto')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(manifest)
  const computed = hmac.digest('hex')

  return computed === v1
}
