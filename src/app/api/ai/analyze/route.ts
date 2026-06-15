// @ts-nocheck
// src/app/api/ai/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeBodyShape, calculateTDEE } from '@/lib/openai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { images, profile, isRoast } = await req.json()

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 })
    }

    // Check premium for multiple images
    const { data: profileData } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single()
    const isPremium = (profileData as any)?.is_premium
    if (!isPremium && images.length > 1) {
      return NextResponse.json({ error: 'Plano Premium necessário para múltiplas fotos' }, { status: 403 })
    }

    const tdee = calculateTDEE({
      weight: profile.weight || 70,
      height: profile.height || 170,
      age: profile.age || 25,
      gender: profile.gender || 'male',
      activity_level: profile.activity_level || 'moderate',
    })

    const result = await analyzeBodyShape({
      imageBase64Array: images,
      profile,
      language: profile.language || 'pt',
      tdee,
      isRoastMode: isRoast || false,
    })

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('Analyze error:', e)
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
