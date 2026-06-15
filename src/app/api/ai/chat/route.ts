// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithCoach } from '@/lib/openai'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, profile, lastAnalysis } = await req.json()

    // Build recent-progress context for adaptive coaching
    let progressContext = ''
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [{ data: recentLogs }, { data: recentWeights }, { data: recentMeals }] = await Promise.all([
        supabase.from('workout_logs').select('logged_at').eq('user_id', user.id).gte('logged_at', sevenDaysAgo),
        supabase.from('weight_history').select('weight, recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(3),
        supabase.from('meals').select('calories, logged_at').eq('user_id', user.id).gte('logged_at', sevenDaysAgo),
      ])

      const trainingDays = new Set((recentLogs || []).map((l: any) => l.logged_at?.slice(0, 10))).size
      progressContext += `- Treinos registrados nos últimos 7 dias: ${trainingDays} dia(s)\n`

      if (recentWeights && recentWeights.length >= 2) {
        const latest = recentWeights[0].weight
        const previous = recentWeights[recentWeights.length - 1].weight
        const diff = (latest - previous).toFixed(1)
        progressContext += `- Peso: de ${previous}kg para ${latest}kg (variação: ${diff}kg) em ${recentWeights.length} registros recentes\n`
      }

      const mealDays = new Set((recentMeals || []).map((m: any) => m.logged_at?.slice(0, 10))).size
      progressContext += `- Dias com refeições registradas nos últimos 7 dias: ${mealDays}\n`
    } catch {
      // Non-critical — proceed without progress context
    }

    const reply = await chatWithCoach({
      messages,
      profile,
      language: profile.language || 'pt',
      lastAnalysis: lastAnalysis || profile.last_analysis,
      analysisContext: profile.analysis_summary,
      nutritionContext: profile.nutrition_context,
      progressContext: progressContext || undefined,
    })

    // Save to DB
    await supabase.from('chat_messages').insert([
      { user_id: user.id, role: 'user', content: messages[messages.length - 1]?.content },
      { user_id: user.id, role: 'assistant', content: reply },
    ] as any)

    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
