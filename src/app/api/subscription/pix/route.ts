// src/app/api/subscription/pix/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPixPayment } from '@/lib/mercadopago'
import { notifyDiscord } from '@/lib/discord'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { couponId, amount: overrideAmount } = await req.json().catch(() => ({}))

    // Se um cupom foi aplicado, valida de novo no servidor (nunca confia no preço do frontend)
    let amount = 49.9
    if (couponId) {
      const { data: coupon } = await supabase.from('coupons').select('*').eq('id', couponId).eq('active', true).single()
      if (coupon) {
        if (coupon.discount_type === 'percent') amount = Math.max(0.01, 49.9 - (49.9 * coupon.discount_value) / 100)
        else if (coupon.discount_type === 'fixed_amount') amount = Math.max(0.01, 49.9 - coupon.discount_value)
        else if (coupon.discount_type === 'fixed_price') amount = Math.max(0.01, coupon.discount_value)
        amount = Math.round(amount * 100) / 100
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eliteshape-eta.vercel.app'

    const payment = await createPixPayment({
      amount,
      description: couponId ? 'FORGE Premium — 30 dias (com cupom)' : 'FORGE Premium — 30 dias',
      payerEmail: user.email,
      externalReference: user.id,
      notificationUrl: `${appUrl}/api/subscription/webhook`,
    })

    // A partir daqui, o pagamento Pix JÁ foi criado com sucesso — nenhuma falha
    // nos passos seguintes (registro de evento, cupom, Discord) deve impedir
    // o retorno do QR Code para o usuário. Cada passo é isolado com try/catch.

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
        mp_payment_id: payment.id,
        event_type: 'pix_payment_created',
        amount,
        status: payment.status,
        raw_payload: payment,
      })
    } catch (e) {
      console.error('Erro ao registrar payment_event (não crítico):', e)
    }

    // Registra o uso do cupom — se o usuário já usou esse cupom antes, a constraint
    // UNIQUE(coupon_id, user_id) vai rejeitar o insert. Isso é esperado e NÃO deve
    // quebrar o fluxo de pagamento, então o erro é apenas logado.
    if (couponId) {
      try {
        const { error: insertError } = await supabase.from('coupon_uses').insert({ coupon_id: couponId, user_id: user.id })
        if (insertError) {
          console.warn('Cupom já usado por este usuário ou erro ao registrar uso:', insertError.message)
        } else {
          const { data: c } = await supabase.from('coupons').select('uses_count').eq('id', couponId).single()
          if (c) await supabase.from('coupons').update({ uses_count: (c.uses_count || 0) + 1 }).eq('id', couponId)
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
        method: 'pix',
        paymentId: payment.id,
      })
    } catch (e) {
      console.error('Erro ao notificar Discord (não crítico):', e)
    }

    return NextResponse.json({
      paymentId: payment.id,
      qrCode: payment.qr_code,
      qrCodeBase64: payment.qr_code_base64,
      ticketUrl: payment.ticket_url,
      amount,
    })
  } catch (e: any) {
    console.error('pix payment error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Permite o frontend verificar se o Pix já foi pago (polling enquanto o QR está na tela)
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, premium_status, premium_expires_at')
      .eq('id', user.id)
      .single()

    return NextResponse.json(profile)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
