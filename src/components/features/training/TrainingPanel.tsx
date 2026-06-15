// src/components/features/training/TrainingPanel.tsx
'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from 'react-markdown'
import type { Profile } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const IconLoader = () => <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
const IconPlay = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IconSave = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
const IconSwap = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
const IconChevron = ({ open }: { open: boolean }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>

const DAYS_PT: Record<string, string> = { Monday:'Segunda', Tuesday:'Terça', Wednesday:'Quarta', Thursday:'Quinta', Friday:'Sexta', Saturday:'Sábado', Sunday:'Domingo' }
const DAY_ORDER = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']

interface SetLog { reps: string; weight: string }
interface ExerciseData { name: string; sets_target: string; sets: SetLog[]; swapOpen: boolean; swapReason: string; swapResult: string; swapLoading: boolean; saved: boolean }
interface DayData { label: string; exercises: ExerciseData[] }

interface TrainingPanelProps { profile: Profile; onProfileUpdate: (data: Partial<Profile>) => void }

function parseTrainingPlan(plan: string): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  if (!plan) return result

  const dayKeys = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  const dayPatterns = [
    { regex: /segunda[\-\s]*feira/i, key: 'Segunda' },
    { regex: /ter[cç]a[\-\s]*feira/i, key: 'Terça' },
    { regex: /quarta[\-\s]*feira/i, key: 'Quarta' },
    { regex: /quinta[\-\s]*feira/i, key: 'Quinta' },
    { regex: /sexta[\-\s]*feira/i, key: 'Sexta' },
    { regex: /s[aá]bado/i, key: 'Sábado' },
    { regex: /domingo/i, key: 'Domingo' },
    { regex: /monday/i, key: 'Segunda' },
    { regex: /tuesday/i, key: 'Terça' },
    { regex: /wednesday/i, key: 'Quarta' },
    { regex: /thursday/i, key: 'Quinta' },
    { regex: /friday/i, key: 'Sexta' },
    { regex: /saturday/i, key: 'Sábado' },
    { regex: /sunday/i, key: 'Domingo' },
  ]

  const skipWords = ['descanso', 'rest', 'recuperação', 'active recovery', 'plano', 'protocolo', 'semana:', 'foco:', 'objetivo:', 'notas:', 'obs:', 'dica:', 'importante:']
  const lines = plan.split('\n')
  let currentDay: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Skip pure markdown headers that are day names
    const cleanLine = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()

    // Check if this line declares a day
    let foundDay = false
    for (const { regex, key } of dayPatterns) {
      if (regex.test(cleanLine) && cleanLine.length < 80) {
        currentDay = key
        if (!result[currentDay]) result[currentDay] = []
        foundDay = true
        break
      }
    }
    if (foundDay) continue
    if (!currentDay) continue

    // Skip non-exercise lines
    if (/^#{1,6}\s/.test(trimmed)) continue
    const lower = cleanLine.toLowerCase()
    if (skipWords.some(w => lower === w || lower.startsWith(w))) continue
    if (cleanLine.length < 4 || cleanLine.length > 100) continue
    if (!/[a-zA-ZÀ-ú]{3,}/.test(cleanLine)) continue

    // Accept lines that have sets info (4x8, 3x10-12) OR look like exercise names
    const hasSets = /\d+\s*[x×]\s*\d+/.test(cleanLine)
    const hasBullet = /^[-*•]/.test(trimmed)
    const hasNumber = /^\d+[.)]/.test(trimmed)
    // Also accept plain text lines under a day heading if they look like exercises
    const looksLikeExercise = /^[A-ZÀ-Ú][a-záéíóúâêîôûãõàèìòùç]/.test(cleanLine) && !cleanLine.endsWith(':')

    if (hasSets || hasBullet || hasNumber || looksLikeExercise) {
      // Clean the exercise name
      let name = cleanLine.replace(/^[-*•\d.)\s]+/, '').trim()
      // Extract sets portion
      const setsMatch = cleanLine.match(/(\d+)\s*[x×]\s*(\d+[-–]?\d*)/)
      if (setsMatch) {
        const baseName = name.replace(/[:\-–]?\s*\d+\s*[x×]\s*\d+[-–]?\d*.*$/, '').trim()
        name = baseName + ' — ' + setsMatch[0].replace(/\s/g, '')
      }
      if (name.length > 3 && !result[currentDay].includes(name) && result[currentDay].length < 10) {
        result[currentDay].push(name)
      }
    }
  }

  return result
}


function parseWeekSummary(plan: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = plan.split('\n')
  const dayPatterns = [
    { regex: /segunda[\-\s]*feira?/i, key: 'Segunda' },
    { regex: /terça[\-\s]*feira?/i, key: 'Terça' },
    { regex: /quarta[\-\s]*feira?/i, key: 'Quarta' },
    { regex: /quinta[\-\s]*feira?/i, key: 'Quinta' },
    { regex: /sexta[\-\s]*feira?/i, key: 'Sexta' },
    { regex: /sábado/i, key: 'Sábado' },
    { regex: /sabado/i, key: 'Sábado' },
    { regex: /domingo/i, key: 'Domingo' },
    { regex: /monday/i, key: 'Segunda' },
    { regex: /tuesday/i, key: 'Terça' },
    { regex: /wednesday/i, key: 'Quarta' },
    { regex: /thursday/i, key: 'Quinta' },
    { regex: /friday/i, key: 'Sexta' },
    { regex: /saturday/i, key: 'Sábado' },
    { regex: /sunday/i, key: 'Domingo' },
  ]
  for (const line of lines) {
    for (const { regex, key } of dayPatterns) {
      if (regex.test(line) && line.length < 120 && !result[key]) {
        // Remove markdown, day name, "feira", colons, asterisks
        let clean = line
          .replace(/^#+\s*/, '')         // headers
          .replace(/\*\*/g, '')           // bold
          .replace(/\*/g, '')             // italic
          .replace(regex, '')             // day name
          .replace(/^[\s\-:|–—]+/, '')   // leading separators
          .replace(/[:\-–—]\s*$/, '')    // trailing separators
          .replace(/feira/gi, '')         // leftover "feira"
          .replace(/^\s+/, '')
          .trim()
        if (clean.length > 2) result[key] = clean
        break
      }
    }
  }
  return result
}

function makeExerciseData(name: string): ExerciseData {
  const setsMatch = name.match(/(\d+)[x×]/)
  const defaultSets = setsMatch ? parseInt(setsMatch[1]) : 3
  return {
    name,
    sets_target: name,
    sets: Array.from({ length: defaultSets }, () => ({ reps: '', weight: '' })),
    swapOpen: false,
    swapReason: '',
    swapResult: '',
    swapLoading: false,
    saved: false,
  }
}

export default function TrainingPanel({ profile, onProfileUpdate }: TrainingPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayData, setDayData] = useState<Record<string, DayData>>({})
  const [weekSummary, setWeekSummary] = useState<Record<string, string>>({})
  const supabase = createClient()

  const todayEn = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayPt = DAYS_PT[todayEn] || todayEn

  useEffect(() => {
    if (profile.training_plan) {
      initDayData(profile.training_plan)
    }
    setSelectedDay(todayPt)
    loadSavedLogs()
  }, [profile.training_plan])

  const initDayData = (plan: string) => {
    const exercisesByDay = parseTrainingPlan(plan)
    const summary = parseWeekSummary(plan)
    setWeekSummary(summary)
    const newDayData: Record<string, DayData> = {}
    DAY_ORDER.forEach(day => {
      const exercises = exercisesByDay[day] || []
      newDayData[day] = {
        label: summary[day] || day,
        exercises: exercises.length > 0 ? exercises.map(makeExerciseData) : [],
      }
    })
    setDayData(newDayData)
  }

  const loadSavedLogs = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('workout_logs' as any).select('*').eq('user_id', profile.id).gte('logged_at', today + 'T00:00:00')
    if (!data) return
    setDayData(prev => {
      const updated = { ...prev }
      data.forEach((log: any) => {
        Object.keys(updated).forEach(day => {
          updated[day].exercises = updated[day].exercises.map(ex => {
            if (ex.name === log.exercise_name && log.sets_data?.sets) {
              return { ...ex, sets: log.sets_data.sets, saved: true }
            }
            return ex
          })
        })
      })
      return updated
    })
  }

  const updateExercise = (day: string, exIdx: number, updates: Partial<ExerciseData>) => {
    setDayData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: prev[day].exercises.map((ex, i) => i === exIdx ? { ...ex, ...updates } : ex)
      }
    }))
  }

  const updateSet = (day: string, exIdx: number, setIdx: number, field: 'reps' | 'weight', value: string) => {
    setDayData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: prev[day].exercises.map((ex, i) => {
          if (i !== exIdx) return ex
          const newSets = [...ex.sets]
          newSets[setIdx] = { ...newSets[setIdx], [field]: value }
          return { ...ex, sets: newSets, saved: false }
        })
      }
    }))
  }

  const addSet = (day: string, exIdx: number) => {
    setDayData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: prev[day].exercises.map((ex, i) =>
          i === exIdx ? { ...ex, sets: [...ex.sets, { reps: '', weight: '' }], saved: false } : ex
        )
      }
    }))
  }

  const removeSet = (day: string, exIdx: number, setIdx: number) => {
    setDayData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: prev[day].exercises.map((ex, i) =>
          i === exIdx ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx), saved: false } : ex
        )
      }
    }))
  }

  const saveLog = async (day: string, exIdx: number) => {
    const ex = dayData[day]?.exercises[exIdx]
    if (!ex) return
    await supabase.from('workout_logs' as any).upsert({
      user_id: profile.id, exercise_name: ex.name,
      sets_data: { sets: ex.sets }, logged_at: new Date().toISOString()
    }, { onConflict: 'user_id,exercise_name,logged_at' })
    updateExercise(day, exIdx, { saved: true })
    toast.success('Carga salva!')
  }

  const requestSwap = async (day: string, exIdx: number) => {
    const ex = dayData[day]?.exercises[exIdx]
    if (!ex) return
    updateExercise(day, exIdx, { swapLoading: true, swapResult: '' })
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Preciso de alternativas para o exercício "${ex.name}" no dia ${day}. Motivo: ${ex.swapReason || 'não tenho esse equipamento na minha academia'}. Me dê 2-3 alternativas com séries e repetições.`
          }],
          profile
        })
      })
      const data = await res.json()
      updateExercise(day, exIdx, { swapResult: data.reply, swapLoading: false })
    } catch {
      updateExercise(day, exIdx, { swapLoading: false })
      toast.error('Erro ao buscar alternativa')
    }
  }

  const generatePlan = async () => {
    if (!profile.age || !profile.weight) { toast.error('Complete seu perfil primeiro'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile }) })
      const data = await res.json()
      await supabase.from('profiles').update({ training_plan: data.training_plan, nutrition_plan: data.nutrition_plan }).eq('id', profile.id)
      onProfileUpdate({ training_plan: data.training_plan, nutrition_plan: data.nutrition_plan })
      initDayData(data.training_plan)
      toast.success('Plano gerado!')
    } catch { toast.error('Erro ao gerar plano') } finally { setGenerating(false) }
  }

  const markDone = async () => {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('daily_missions' as any).upsert({ user_id: profile.id, date: today, training_done: true }, { onConflict: 'user_id,date' })
    toast.success('Treino concluído! 💪')
  }

  const orderedDays = DAY_ORDER.filter(d => dayData[d])
  const currentDay = selectedDay && dayData[selectedDay] ? dayData[selectedDay] : null

  if (!profile.training_plan) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="px-8 py-6 border-b border-[#1C1C1C]">
          <h1 className="font-display text-3xl font-black text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>TREINO</h1>
          <p className="text-[#555] text-sm mt-0.5">Protocolos personalizados com registro de carga</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-20 h-20 text-[#222] mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
            <p className="text-white font-semibold mb-1">Nenhum plano gerado ainda</p>
            <p className="text-[#555] text-sm mb-6">Complete seu perfil e gere um plano personalizado com IA</p>
            <button onClick={generatePlan} disabled={generating} className="btn btn-primary">
              {generating ? <><IconLoader />Gerando plano...</> : <><IconPlay />Gerar Plano com IA</>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-8 py-6 border-b border-[#1C1C1C] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-3xl font-black text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>TREINO</h1>
          <p className="text-[#555] text-sm mt-0.5">Registro de carga por exercício</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={markDone} className="btn btn-secondary btn-sm"><IconCheck />Marcar Feito</button>
          <button onClick={generatePlan} disabled={generating} className="btn btn-ghost btn-sm">
            {generating ? <><IconLoader />Gerando...</> : 'Regenerar Plano'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Days sidebar */}
        <div className="w-56 border-r border-[#1C1C1C] flex-shrink-0 overflow-y-auto">
          <div className="p-3 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#333] px-2 py-2" style={{ fontFamily: 'var(--font-display)' }}>SEMANA</p>
            {orderedDays.map(day => {
              const isToday = day === todayPt
              const isSelected = day === selectedDay
              const d = dayData[day]
              const savedCount = d?.exercises.filter(e => e.saved).length || 0
              const totalCount = d?.exercises.length || 0
              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  className={`w-full text-left rounded-xl p-3 border transition-all ${isSelected ? 'bg-[#E8002D]/10 border-[#E8002D]/40' : 'bg-transparent border-transparent hover:bg-[#111] hover:border-[#1C1C1C]'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-[#E8002D]' : isToday ? 'text-[#E8002D]/60' : 'text-[#444]'}`} style={{ fontFamily: 'var(--font-display)' }}>{day}</span>
                    {isToday && <span className="text-[7px] bg-[#E8002D] text-white px-1 py-0.5 rounded font-bold">HOJE</span>}
                  </div>
                  <p className="text-[11px] text-[#555] leading-tight truncate">
              {(d?.label || '—').replace(/^feira[:\s]*/i, '').replace(/\*\*/g, '').trim() || '—'}
            </p>
                  {totalCount > 0 && (
                    <div className="mt-1.5 flex gap-1">
                      {d.exercises.map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${d.exercises[i].saved ? 'bg-[#E8002D]' : 'bg-[#222]'}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedDay && currentDay ? (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-black text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>{selectedDay}</h2>
                <p className="text-[#555] text-sm">
                {(currentDay.label || '').replace(/^feira[:\s]*/i, '').replace(/\*\*/g, '').trim()}
              </p>
              </div>

              {currentDay.exercises.length === 0 ? (
                <div className="rounded-2xl bg-[#111] border border-[#1C1C1C] p-12 text-center">
                  <p className="text-[#555] text-sm mb-2">Nenhum exercício detalhado encontrado para este dia</p>
                  <p className="text-[#333] text-xs">O plano completo está disponível abaixo</p>
                  <div className="mt-6 prose-dark text-left">
                    <Markdown>{profile.training_plan}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDay.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className={`rounded-2xl border transition-all ${ex.saved ? 'bg-[#0E1A0E] border-[#1A3A1A]' : 'bg-[#111] border-[#1C1C1C]'}`}>
                      {/* Exercise header */}
                      <div className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {ex.saved && <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center"><IconCheck /></span>}
                          {!ex.saved && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#E8002D]" />}
                          <span className="font-semibold text-white text-sm truncate">{ex.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {ex.sets.some(s => s.weight || s.reps) && !ex.saved && (
                            <button onClick={() => saveLog(selectedDay, exIdx)}
                              className="flex items-center gap-1 text-xs text-[#E8002D] border border-[#E8002D]/30 hover:bg-[#E8002D]/10 rounded-lg px-2.5 py-1.5 transition-all">
                              <IconSave /><span>Salvar</span>
                            </button>
                          )}
                          <button onClick={() => updateExercise(selectedDay, exIdx, { swapOpen: !ex.swapOpen, swapResult: '' })}
                            className={`flex items-center gap-1 text-xs border rounded-lg px-2.5 py-1.5 transition-all ${ex.swapOpen ? 'text-[#E8002D] border-[#E8002D]/30 bg-[#E8002D]/5' : 'text-[#555] border-[#1C1C1C] hover:border-[#333] hover:text-[#999]'}`}>
                            <IconSwap /><span>Trocar</span>
                          </button>
                        </div>
                      </div>

                      {/* Swap section */}
                      <AnimatePresence>
                        {ex.swapOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="px-5 pb-4 border-t border-[#1C1C1C] pt-4">
                              {!ex.swapResult ? (
                                <div className="space-y-3">
                                  <p className="text-xs text-[#666]">Por que precisa trocar?</p>
                                  <textarea
                                    value={ex.swapReason}
                                    onChange={e => updateExercise(selectedDay, exIdx, { swapReason: e.target.value })}
                                    placeholder="Ex: não tenho esse aparelho, dor no ombro, sem barra..."
                                    rows={2}
                                    className="w-full bg-[#0A0A0A] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:border-[#E8002D]/40"
                                  />
                                  <button onClick={() => requestSwap(selectedDay, exIdx)} disabled={ex.swapLoading}
                                    className="btn btn-primary btn-sm w-full">
                                    {ex.swapLoading ? <><IconLoader />Buscando alternativas...</> : 'Pedir alternativa ao coach'}
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <div className="prose-dark text-sm mb-3">
                                    <Markdown>{ex.swapResult}</Markdown>
                                  </div>
                                  <button onClick={() => updateExercise(selectedDay, exIdx, { swapResult: '', swapReason: '' })}
                                    className="text-xs text-[#555] hover:text-[#999] transition-colors">← Perguntar novamente</button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Sets table */}
                      <div className="px-5 pb-4">
                        {ex.sets.length > 0 && (
                          <div className="grid grid-cols-[40px_1fr_1fr_28px] gap-2 text-[10px] uppercase tracking-widest text-[#333] mb-2 px-1">
                            <span>Série</span><span>Reps</span><span>Carga (kg)</span><span></span>
                          </div>
                        )}
                        <div className="space-y-2">
                          {ex.sets.map((s, sIdx) => (
                            <div key={sIdx} className="grid grid-cols-[40px_1fr_1fr_28px] gap-2 items-center">
                              <span className="text-xs text-[#444] font-mono text-center">#{sIdx + 1}</span>
                              <input type="number" value={s.reps} onChange={e => updateSet(selectedDay, exIdx, sIdx, 'reps', e.target.value)}
                                className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-[#E8002D]/40 transition-colors"
                                placeholder="12" min="1" />
                              <input type="number" value={s.weight} onChange={e => updateSet(selectedDay, exIdx, sIdx, 'weight', e.target.value)}
                                className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-[#E8002D]/40 transition-colors"
                                placeholder="—" step="0.5" />
                              <button onClick={() => removeSet(selectedDay, exIdx, sIdx)} className="text-[#333] hover:text-[#E8002D] transition-colors flex items-center justify-center">
                                <IconTrash />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => addSet(selectedDay, exIdx)}
                          className="mt-2 flex items-center gap-1.5 text-xs text-[#444] hover:text-[#999] transition-colors px-1 py-1">
                          <IconPlus /><span>Adicionar série</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#444] text-sm">Selecione um dia</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
