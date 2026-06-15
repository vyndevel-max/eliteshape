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

    const reply = await chatWithCoach({
      messages,
      profile,
      language: profile.language || 'pt',
      lastAnalysis: lastAnalysis || profile.last_analysis,
      analysisContext: profile.analysis_summary,
      nutritionContext: profile.nutrition_context,
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
