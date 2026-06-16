// src/app/api/subscription/pix/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPixPayment } from '@/lib/mercadopago'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eliteshape-eta.vercel.app'

    const payment = await createPixPayment({
      amount: 49.9,
      description: 'FORGE Premium — 30 dias',
      payerEmail: user.email,
      externalReference: user.id,
      notificationUrl: `${appUrl}/api/subscription/webhook`,
    })

    await supabase.from('profiles').update({
      mp_customer_email: user.email,
      premium_status: 'pending',
    }).eq('id', user.id)

    await supabase.from('payment_events').insert({
      user_id: user.id,
      mp_payment_id: payment.id,
      event_type: 'pix_payment_created',
      amount: 49.9,
      status: payment.status,
      raw_payload: payment,
    })

    return NextResponse.json({
      paymentId: payment.id,
      qrCode: payment.qr_code,
      qrCodeBase64: payment.qr_code_base64,
      ticketUrl: payment.ticket_url,
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
