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
 * O retorno já inclui init_point — o link de checkout hospedado do Mercado Pago,
 * que coleta o cartão do usuário e cria a assinatura automaticamente. Não é necessário
 * (e nem desejável) chamar POST /preapproval manualmente depois — esse endpoint exige
 * um card_token_id já tokenizado, que só existe se você implementar o Card Form
 * (checkout transparente) no frontend. Usar o checkout hospedado evita essa complexidade.
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

/**
 * Monta a URL de checkout do plano, anexando external_reference como query param
 * para conseguirmos identificar o usuário quando o webhook de pagamento chegar.
 * O Mercado Pago propaga query params extras da URL de retorno/checkout através
 * do fluxo, mas o jeito confiável de linkar é usar o payer_email já vinculado à conta
 * do usuário que loga no checkout — por isso back_url também carrega esse parâmetro
 * como fallback de exibição (não é usado para autenticação).
 */
export function buildCheckoutUrl(initPoint: string, externalReference: string): string {
  const url = new URL(initPoint)
  url.searchParams.set('external_reference', externalReference)
  return url.toString()
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

// ============================================================
// PAGAMENTO AVULSO VIA PIX (sem renovação automática)
// Endpoint: POST /v1/payments — cobrança única, libera N dias de premium.
// Diferente da assinatura por cartão, aqui o cliente paga mês a mês manualmente.
// ============================================================

export interface MPPixPayment {
  id: string
  status: string
  qr_code?: string          // código copia-e-cola
  qr_code_base64?: string   // imagem do QR Code em base64
  ticket_url?: string       // link para visualizar o pagamento (ex: abrir no app do banco)
}

/**
 * Cria um pagamento Pix avulso. O usuário paga uma vez e libera `amount`
 * por um período fixo (ex: 30 dias) — sem renovação automática.
 */
export async function createPixPayment(params: {
  amount: number
  description: string
  payerEmail: string
  externalReference: string // user.id do Supabase — vem de volta no webhook
  notificationUrl: string
}): Promise<MPPixPayment> {
  const { amount, description, payerEmail, externalReference, notificationUrl } = params

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'X-Idempotency-Key': `${externalReference}-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description,
      payment_method_id: 'pix',
      payer: { email: payerEmail },
      external_reference: externalReference,
      notification_url: notificationUrl,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao criar pagamento Pix MP: ${res.status} ${err}`)
  }

  const data = await res.json()
  return {
    id: String(data.id),
    status: data.status,
    qr_code: data.point_of_interaction?.transaction_data?.qr_code,
    qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
  }
}
