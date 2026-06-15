// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { suggestExerciseSwap } from '@/lib/openai'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { exerciseName, day, reason, profile } = await req.json()
    if (!exerciseName) return NextResponse.json({ error: 'exerciseName required' }, { status: 400 })

    const suggestion = await suggestExerciseSwap({ exerciseName, day: day || '', reason: reason || '', profile: profile || {} })

    return NextResponse.json(suggestion)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
