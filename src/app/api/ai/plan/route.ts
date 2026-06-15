// @ts-nocheck
// src/app/api/ai/plan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePlanFromProfile, calculateTDEE } from '@/lib/openai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profile } = await req.json()
    const tdee = calculateTDEE({
      weight: profile.weight || 70,
      height: profile.height || 170,
      age: profile.age || 25,
      gender: profile.gender || 'male',
      activity_level: profile.activity_level || 'moderate',
    })

    const result = await generatePlanFromProfile({ profile, tdee, language: profile.language || 'pt' })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
