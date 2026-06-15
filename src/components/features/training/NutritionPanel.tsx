// src/components/features/nutrition/NutritionPanel.tsx
'use client'
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Meal } from '@/types/supabase'
import toast from 'react-hot-toast'
import Markdown from 'react-markdown'
import { formatNumber, toBase64, resizeImage } from '@/lib/utils'
import NutritionQuiz from './NutritionQuiz'

const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
const IconLoader = () => <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IconWater = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
const IconCamera = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
const IconText = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 6.1H3M21 12.1H3M15.1 18H3"/></svg>

const MACRO_COLORS = { protein: '#E8002D', carbs: '#F59E0B', fat: '#6366F1' }
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
const MEAL_LABELS: Record<string, string> = { breakfast: 'Café', lunch: 'Almoço', dinner: 'Jantar', snack: 'Lanche', other: 'Outro' }
const WATER_OPTIONS = [150, 250, 350, 500]

function MacroBar({ label, current, target, color, unit = 'g' }: { label: string; current: number; target: number; color: string; unit?: string }) {
  const pct = Math.min((current / Math.max(target, 1)) * 100, 100)
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)', color }}>{label}</span>
        <span className="text-xs text-[#666]">{formatNumber(current)}/{formatNumber(target)}{unit}</span>
      </div>
      <div className="progress-track">
        <motion.div className="progress-fill" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  )
}

// ── Nutrition Plan Interactive View ──────────────────────────
interface FoodItem { name: string; quantity: string; swapOpen: boolean; swapReason: string; swapResult: string; swapLoading: boolean }
interface MealSection { title: string; foods: FoodItem[] }

function parsePlan(plan: string): MealSection[] {
  const sections: MealSection[] = []
  if (!plan) return sections
  let current: MealSection | null = null
  for (const line of plan.split('\n')) {
    const t = line.trim()
    if (!t) continue
    const clean = t.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
    // Section header: all caps or bold or starts with emoji-like meal name
    const isMealHeader = /^(café|almoço|jantar|lanche|pré-treino|pós-treino|desjejum|refeição)/i.test(clean) ||
      (clean.length < 40 && /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕ]/.test(clean) && !clean.includes(':') && !clean.match(/\d+[x×]/))
    if (isMealHeader && (t.startsWith('#') || t.startsWith('**') || sections.length === 0 || /^(café|almoço|jantar|lanche)/i.test(clean))) {
      current = { title: clean, foods: [] }
      sections.push(current)
      continue
    }
    if (!current) continue
    // Food item line
    if (/^[-*•]/.test(t) || /^\d+[.)]/.test(t) || (clean.length > 3 && clean.length < 80 && /[a-zA-ZÀ-ú]{3}/.test(clean))) {
      const foodName = clean.replace(/^[-*•\d.)\s]+/, '').trim()
      if (foodName.length > 2) {
        // Extract quantity if present (e.g. "150g", "2 colheres", "1 unidade")
        const qtyMatch = foodName.match(/(\d+\s*(?:g|ml|kg|l|colheres?|xícaras?|unidades?|fatias?|porções?|ovos?|copos?)?)/i)
        const qty = qtyMatch ? qtyMatch[0] : ''
        current.foods.push({ name: foodName, quantity: qty, swapOpen: false, swapReason: '', swapResult: '', swapLoading: false })
      }
    }
  }
  return sections.filter(s => s.foods.length > 0)
}

function NutritionPlanView({ plan, profile }: { plan: string | null; profile: any }) {
  const [sections, setSections] = React.useState<MealSection[]>(() => parsePlan(plan || ''))
  React.useEffect(() => { setSections(parsePlan(plan || '')) }, [plan])

  const updateFood = (si: number, fi: number, updates: Partial<FoodItem>) => {
    setSections(prev => prev.map((s, i) => i !== si ? s : {
      ...s, foods: s.foods.map((f, j) => j !== fi ? f : { ...f, ...updates })
    }))
  }

  const requestSwap = async (si: number, fi: number) => {
    const food = sections[si]?.foods[fi]
    if (!food) return
    updateFood(si, fi, { swapLoading: true, swapResult: '' })
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Preciso de 2-3 alternativas para "${food.name}" no plano alimentar. Motivo: ${food.swapReason || 'não tenho esse alimento'}. Dê opções com quantidades equivalentes em proteína e calorias.` }],
          profile
        })
      })
      const data = await res.json()
      updateFood(si, fi, { swapResult: data.reply, swapLoading: false })
    } catch { updateFood(si, fi, { swapLoading: false }) }
  }

  if (!plan) return (
    <div className="text-center py-20">
      <p className="text-[#555] mb-2">Nenhum plano nutricional gerado</p>
      <p className="text-[#333] text-sm">Faça sua análise corporal primeiro</p>
    </div>
  )

  if (sections.length === 0) return (
    <div className="max-w-3xl rounded-2xl bg-[#111] border border-[#1C1C1C] p-8 prose-dark">
      <Markdown>{plan}</Markdown>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-4">
      {sections.map((section, si) => (
        <div key={si} className="rounded-2xl bg-[#111] border border-[#1C1C1C] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1C1C1C]">
            <p className="font-black uppercase tracking-widest text-sm text-[#E8002D]" style={{ fontFamily: 'var(--font-display)' }}>{section.title}</p>
          </div>
          <div className="divide-y divide-[#0D0D0D]">
            {section.foods.map((food, fi) => (
              <div key={fi}>
                <div className="px-6 py-3 flex items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm">{food.name}</span>
                  </div>
                  <button onClick={() => updateFood(si, fi, { swapOpen: !food.swapOpen, swapResult: '', swapReason: '' })}
                    className={`ml-4 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 ${food.swapOpen ? 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/5' : 'text-[#444] border-[#1C1C1C] hover:border-[#333] hover:text-[#999]'}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
                    Trocar
                  </button>
                </div>
                {food.swapOpen && (
                  <div className="px-6 pb-4 bg-[#0A0A0A]">
                    {!food.swapResult ? (
                      <div className="space-y-2">
                        <textarea value={food.swapReason} onChange={e => updateFood(si, fi, { swapReason: e.target.value })}
                          placeholder="Por que quer trocar? (ex: não tenho, não gosto, sou alérgico...)"
                          rows={2} className="w-full bg-[#111] border border-[#1C1C1C] rounded-xl px-4 py-3 text-white text-xs placeholder-[#333] resize-none focus:outline-none focus:border-[#F59E0B]/40" />
                        <button onClick={() => requestSwap(si, fi)} disabled={food.swapLoading}
                          className="w-full py-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-bold hover:bg-[#F59E0B]/20 transition-all disabled:opacity-40">
                          {food.swapLoading ? 'Buscando alternativas...' : 'Pedir alternativa ao coach'}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="prose-dark text-xs mb-2"><Markdown>{food.swapResult}</Markdown></div>
                        <button onClick={() => updateFood(si, fi, { swapResult: '', swapReason: '' })} className="text-xs text-[#444] hover:text-[#999]">← Perguntar novamente</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}


interface NutritionPanelProps { profile: Profile; onProfileUpdate: (data: Partial<Profile>) => void }

export default function NutritionPanel({ profile, onProfileUpdate }: NutritionPanelProps) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [waterMl, setWaterMl] = useState(0)
  const [foodInput, setFoodInput] = useState('')
  const [mealType, setMealType] = useState('other')
  const [addingMeal, setAddingMeal] = useState(false)
  const [addingWater, setAddingWater] = useState(false)
  const [activeView, setActiveView] = useState<'log' | 'plan'>('log')
  const [inputMode, setInputMode] = useState<'text' | 'photo'>('text')
  const [showQuiz, setShowQuiz] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0), protein: acc.protein + (m.protein || 0),
    carbs: acc.carbs + (m.carbs || 0), fat: acc.fat + (m.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [mealsRes, waterRes] = await Promise.all([
      supabase.from('meals').select('*').eq('user_id', profile.id).gte('logged_at', today + 'T00:00:00').order('logged_at', { ascending: false }),
      supabase.from('water_logs').select('amount_ml').eq('user_id', profile.id).gte('logged_at', today + 'T00:00:00'),
    ])
    if (mealsRes.data) setMeals(mealsRes.data as Meal[])
    if (waterRes.data) setWaterMl(waterRes.data.reduce((sum: number, r: any) => sum + r.amount_ml, 0))
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const resized = await resizeImage(file)
    setPhotoPreview(resized)
    setInputMode('photo')
  }

  const addMeal = async () => {
    if (!foodInput.trim() && !photoPreview) return
    setAddingMeal(true)
    try {
      const body: any = { mealType, language: profile.language }
      if (inputMode === 'photo' && photoPreview) {
        body.imageBase64 = photoPreview.split(',')[1]
        body.description = foodInput || 'Analise esta refeição pela foto'
      } else {
        body.description = foodInput
      }

      const res = await fetch('/api/ai/meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      const { error } = await supabase.from('meals').insert({
        user_id: profile.id, name: data.name || foodInput,
        calories: data.calories || 0, protein: data.protein || 0,
        carbs: data.carbs || 0, fat: data.fat || 0, meal_type: mealType,
        logged_at: new Date().toISOString(),
      } as any)
      if (error) throw error
      setFoodInput('')
      setPhotoPreview(null)
      setInputMode('text')
      await loadData()
      toast.success(`${data.name || 'Refeição'} registrada!`)
    } catch { toast.error('Erro ao registrar refeição') } finally { setAddingMeal(false) }
  }

  const addWater = async (ml: number) => {
    setAddingWater(true)
    await supabase.from('water_logs').insert({ user_id: profile.id, amount_ml: ml, logged_at: new Date().toISOString() } as any)
    setWaterMl(prev => prev + ml)
    toast.success(`+${ml}ml registrado`)
    setAddingWater(false)
  }

  const deleteMeal = async (id: string) => {
    await supabase.from('meals').delete().eq('id', id)
    setMeals(prev => prev.filter(m => m.id !== id))
  }

  const targets = { calories: profile.calories_target || 2500, protein: profile.protein_target || 160, carbs: profile.carbs_target || 300, fat: profile.fat_target || 80 }
  const waterTarget = 3000
  const waterPct = Math.min((waterMl / waterTarget) * 100, 100)

  return (
    <div className="min-h-screen flex flex-col">
      {showQuiz && (
        <NutritionQuiz profile={profile} onComplete={(data) => {
          onProfileUpdate(data)
          setShowQuiz(false)
          toast.success('Preferências salvas!')
        }} />
      )}
      <div className="px-8 py-6 border-b border-[#1C1C1C] flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>NUTRIÇÃO</h1>
          <p className="text-[#555] text-sm mt-0.5">Rastreamento de macros com IA</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowQuiz(true)}
            className="flex items-center gap-2 text-xs text-[#555] border border-[#1C1C1C] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] rounded-lg px-3 py-2 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
            Preferências
          </button>
          <div className="flex gap-1 bg-[#111] border border-[#1C1C1C] rounded-lg p-1">
            {(['log', 'plan'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${v === activeView ? 'bg-[#E8002D] text-white' : 'text-[#666] hover:text-[#999]'}`}>
                {v === 'log' ? 'Diário' : 'Plano IA'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        {activeView === 'log' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
            <div className="space-y-6">

              {/* Add meal card */}
              <div className="rounded-2xl bg-[#111] border border-[#1C1C1C] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[#E8002D]" style={{ fontFamily: 'var(--font-display)' }}>REGISTRAR REFEIÇÃO</p>
                  <div className="flex gap-1 bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg p-1">
                    <button onClick={() => { setInputMode('text'); setPhotoPreview(null) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${inputMode === 'text' ? 'bg-[#E8002D] text-white' : 'text-[#555] hover:text-[#999]'}`}>
                      <IconText /><span>Texto</span>
                    </button>
                    <button onClick={() => photoRef.current?.click()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${inputMode === 'photo' ? 'bg-[#E8002D] text-white' : 'text-[#555] hover:text-[#999]'}`}>
                      <IconCamera /><span>Foto</span>
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                  </div>
                </div>

                {/* Meal type selector */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {MEAL_TYPES.map(t => (
                    <button key={t} onClick={() => setMealType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${mealType === t ? 'bg-[#E8002D]/10 border-[#E8002D]/40 text-[#E8002D]' : 'border-[#1C1C1C] text-[#555] hover:border-[#333]'}`}>
                      {MEAL_LABELS[t]}
                    </button>
                  ))}
                </div>

                {/* Photo preview */}
                {photoPreview && (
                  <div className="mb-4 relative">
                    <img src={photoPreview} alt="preview" className="rounded-xl w-full max-h-48 object-cover" />
                    <button onClick={() => { setPhotoPreview(null); setInputMode('text') }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-white text-xs hover:bg-black">✕</button>
                  </div>
                )}

                {/* Text input - VISIBLE */}
                <div className="mb-4">
                  <textarea
                    value={foodInput}
                    onChange={e => setFoodInput(e.target.value)}
                    placeholder={inputMode === 'photo'
                      ? 'Adicione uma descrição (opcional)...'
                      : 'Descreva o que comeu... Ex: 150g frango grelhado com arroz integral e salada'}
                    rows={3}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:border-[#E8002D]/50 transition-colors"
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) addMeal() }}
                  />
                  <p className="text-xs text-[#444] mt-1">Ctrl+Enter para registrar</p>
                </div>

                <button onClick={addMeal} disabled={addingMeal || (!foodInput.trim() && !photoPreview)}
                  className="btn btn-primary w-full disabled:opacity-40">
                  {addingMeal ? <><IconLoader />Analisando com IA...</> : <><IconPlus />Registrar Refeição</>}
                </button>
              </div>

              {/* Meals list */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#444]" style={{ fontFamily: 'var(--font-display)' }}>HOJE — {meals.length} REFEIÇÃO{meals.length !== 1 ? 'ÕES' : ''}</p>
                {meals.length === 0 ? (
                  <div className="rounded-2xl bg-[#111] border border-[#1C1C1C] p-8 text-center">
                    <p className="text-[#555] text-sm">Nenhuma refeição registrada hoje</p>
                  </div>
                ) : meals.map(meal => (
                  <motion.div key={meal.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-[#111] border border-[#1C1C1C] px-5 py-4 flex items-center justify-between group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#444] border border-[#1C1C1C] rounded px-1.5 py-0.5">{MEAL_LABELS[meal.meal_type || 'other']}</span>
                        <span className="font-medium text-white text-sm truncate">{meal.name}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-[#555]">
                        <span className="text-[#E8002D]">{meal.calories} kcal</span>
                        <span>P: {formatNumber(meal.protein || 0)}g</span>
                        <span>C: {formatNumber(meal.carbs || 0)}g</span>
                        <span>G: {formatNumber(meal.fat || 0)}g</span>
                      </div>
                    </div>
                    <button onClick={() => deleteMeal(meal.id)} className="opacity-0 group-hover:opacity-100 text-[#444] hover:text-[#E8002D] transition-all ml-4 p-1"><IconTrash /></button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              {/* Calories */}
              <div className="rounded-2xl bg-[#111] border border-[#1C1C1C] p-6">
                <p className="text-xs font-black uppercase tracking-widest text-[#E8002D] mb-4" style={{ fontFamily: 'var(--font-display)' }}>CALORIAS DO DIA</p>
                <div className="text-center mb-4">
                  <p className="text-4xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>{formatNumber(totals.calories)}</p>
                  <p className="text-[#555] text-sm">de {formatNumber(targets.calories)} kcal</p>
                </div>
                <div className="space-y-4">
                  <MacroBar label="Proteína" current={totals.protein} target={targets.protein} color={MACRO_COLORS.protein} />
                  <MacroBar label="Carboidratos" current={totals.carbs} target={targets.carbs} color={MACRO_COLORS.carbs} />
                  <MacroBar label="Gordura" current={totals.fat} target={targets.fat} color={MACRO_COLORS.fat} />
                </div>
              </div>

              {/* Water */}
              <div className="rounded-2xl bg-[#111] border border-[#1C1C1C] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[#E8002D]" style={{ fontFamily: 'var(--font-display)' }}>HIDRATAÇÃO</p>
                  <div className="flex items-center gap-1 text-[#4DA6FF]"><IconWater /><span className="text-sm font-bold">{(waterMl / 1000).toFixed(1)}L</span></div>
                </div>
                <div className="progress-track mb-4">
                  <motion.div className="progress-fill" style={{ background: '#4DA6FF' }} animate={{ width: `${waterPct}%` }} transition={{ duration: 0.6 }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {WATER_OPTIONS.map(ml => (
                    <button key={ml} onClick={() => addWater(ml)} disabled={addingWater}
                      className="py-2 rounded-xl border border-[#1C1C1C] text-sm text-[#666] hover:text-white hover:border-[#4DA6FF]/40 hover:bg-[#4DA6FF]/5 transition-all font-medium">
                      +{ml}ml
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'plan' && (
          <NutritionPlanView plan={profile.nutrition_plan} profile={profile} />
        )}
      </div>
    </div>
  )
}
