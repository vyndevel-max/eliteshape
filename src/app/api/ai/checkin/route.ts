// src/app/api/ai/checkin/route.ts
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { weeklyCheckIn } from '@/lib/openai'
import { calculateTDEE } from '@/lib/openai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { images, profile } = await req.json()
    if (!images?.length) return NextResponse.json({ error: 'images required' }, { status: 400 })

    // Get previous analysis from shape_history
    const { data: history } = await supabase
      .from('shape_history')
      .select('analysis, fat_percentage, muscle_score, recorded_at')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)

    const previousEntry = history?.[0]
    const previousAnalysis = previousEntry?.analysis ?? {}

    // Week stats
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: logs }, { data: meals }, { data: weights }] = await Promise.all([
      supabase.from('workout_logs').select('logged_at').eq('user_id', user.id).gte('logged_at', sevenDaysAgo),
      supabase.from('meals').select('calories, logged_at').eq('user_id', user.id).gte('logged_at', sevenDaysAgo),
      supabase.from('weight_history').select('weight, recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(4),
    ])

    const trainingDays = new Set((logs || []).map((l: any) => l.logged_at?.slice(0, 10))).size
    const mealDays = new Set((meals || []).map((m: any) => m.logged_at?.slice(0, 10))).size
    const avgCalories = meals?.length
      ? Math.round((meals as any[]).reduce((s: number, m: any) => s + (m.calories || 0), 0) / Math.max(mealDays, 1))
      : undefined
    let weightChange: number | undefined
    if (weights && weights.length >= 2) {
      weightChange = Number(((weights[0].weight as number) - (weights[weights.length - 1].weight as number)).toFixed(1))
    }

    const tdee = calculateTDEE({
      weight: profile.weight || 70,
      height: profile.height || 170,
      age: profile.age || 25,
      gender: profile.gender || 'male',
      activity_level: profile.activity_level || 'moderate',
    })

    const result = await weeklyCheckIn({
      imageBase64Array: images,
      profile,
      previousAnalysis: {
        overall_score: previousEntry?.muscle_score ?? previousAnalysis.overall_score,
        fat_percentage_estimate: previousEntry?.fat_percentage ?? previousAnalysis.fat_percentage_estimate,
        strong_points: previousAnalysis.strong_points,
        weak_points: previousAnalysis.weak_points,
        muscle_mass: previousAnalysis.muscle_mass,
      },
      weekStats: { training_days: trainingDays, meal_days: mealDays, weight_change: weightChange, avg_calories: avgCalories },
      language: profile.language || 'pt',
      tdee,
    })

    // Save new shape_history entry
    await supabase.from('shape_history').insert({
      user_id: user.id,
      analysis: { ...result, type: 'weekly_checkin' },
      fat_percentage: result.fat_percentage_estimate,
      muscle_score: result.score,
      recorded_at: new Date().toISOString(),
    } as any)

    // Apply plan changes if major
    const profileUpdates: Record<string, any> = {
      last_analysis: JSON.stringify({ ...result, overall_score: result.score }),
    }
    if (result.training_adjustment === 'major' && result.new_training_plan) {
      profileUpdates.training_plan = result.new_training_plan
    }
    if (result.diet_adjustment === 'major' && result.new_nutrition_plan) {
      profileUpdates.nutrition_plan = result.new_nutrition_plan
    }

    await supabase.from('profiles').update(profileUpdates).eq('id', user.id)

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('checkin error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
