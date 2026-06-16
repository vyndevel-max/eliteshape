// src/lib/discord.ts
// Envia notificações formatadas para um canal do Discord via Webhook.
// Configurar: criar um Webhook em Configurações do Canal > Integrações > Webhooks,
// copiar a URL e salvar como DISCORD_WEBHOOK_URL nas env vars do Vercel.

interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

interface NotifyParams {
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  userName?: string | null
  userEmail?: string | null
  amount?: number | null
  method: 'card_subscription' | 'pix'
  paymentId?: string | null
  subscriptionId?: string | null
}

const STATUS_CONFIG: Record<NotifyParams['status'], { color: number; title: string; emoji: string }> = {
  pending: { color: 0xFF6A00, title: 'Pagamento Pendente', emoji: '🟠' },
  approved: { color: 0x22C55E, title: 'Pagamento Aprovado', emoji: '✅' },
  rejected: { color: 0xFF3B30, title: 'Pagamento Rejeitado', emoji: '❌' },
  cancelled: { color: 0x666666, title: 'Assinatura Cancelada', emoji: '🚫' },
}

/**
 * Envia uma notificação para o Discord sobre um evento de pagamento/assinatura.
 * Nunca lança erro — uma falha no Discord não pode quebrar o fluxo de pagamento real.
 */
export async function notifyDiscord(params: NotifyParams): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL não configurado — notificação ignorada')
    return
  }

  const { status, userName, userEmail, amount, method, paymentId, subscriptionId } = params
  const config = STATUS_CONFIG[status]

  const fields: DiscordEmbedField[] = []
  if (userName) fields.push({ name: 'Nome', value: userName, inline: true })
  if (userEmail) fields.push({ name: 'E-mail', value: userEmail, inline: true })
  fields.push({ name: 'Forma de pagamento', value: method === 'pix' ? 'Pix (avulso)' : 'Cartão (assinatura)', inline: true })
  if (amount) fields.push({ name: 'Valor', value: `R$ ${amount.toFixed(2).replace('.', ',')}`, inline: true })
  if (paymentId) fields.push({ name: 'ID do pagamento', value: String(paymentId), inline: true })
  if (subscriptionId) fields.push({ name: 'ID da assinatura', value: String(subscriptionId), inline: true })

  const embed = {
    title: `${config.emoji} ${config.title} — FORGE`,
    color: config.color,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: 'FORGE · Mercado Pago' },
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Discord webhook falhou:', res.status, text)
    }
  } catch (e) {
    console.error('Discord webhook exception:', e)
  }
}
