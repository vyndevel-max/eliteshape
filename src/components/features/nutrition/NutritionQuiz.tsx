// src/components/features/nutrition/NutritionQuiz.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'

interface NutritionQuizProps { profile: Profile; onComplete: (data: Partial<Profile>) => void }

const steps = [
  {
    id: 'budget',
    title: 'Seu orçamento',
    subtitle: 'Pra montar um plano que caiba no seu bolso',
    fields: [
      {
        key: 'financial_condition', label: 'Quanto você gasta com comida por mês?', type: 'cards',
        options: [
          { value: 'low', label: 'Econômico', sub: 'Até R$400/mês', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2.5-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5"/></svg> },
          { value: 'medium', label: 'Médio', sub: 'R$400–800/mês', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
          { value: 'high', label: 'Confortável', sub: 'Acima de R$800/mês', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> },
        ],
      },
    ],
  },
  {
    id: 'cooking',
    title: 'Sua rotina',
    subtitle: 'Pra saber como encaixar a alimentação no seu dia',
    fields: [
      {
        key: 'cooking_skill', label: 'Você costuma cozinhar?', type: 'cards',
        options: [
          { value: 'none', label: 'Não cozinho', sub: 'Marmita ou restaurante', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> },
          { value: 'basic', label: 'Cozinho o básico', sub: 'Pratos simples', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg> },
          { value: 'good', label: 'Cozinho bem', sub: 'Diversas receitas', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><circle cx="18" cy="6" r="3"/></svg> },
        ],
      },
      {
        key: 'meal_prep_time', label: 'Quanto tempo você tem para preparar refeições?', type: 'cards',
        options: [
          { value: 'none', label: 'Quase nenhum', sub: 'Menos de 15min', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { value: 'moderate', label: 'Moderado', sub: '15–30min por refeição', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 18 12"/></svg> },
          { value: 'plenty', label: 'Bastante', sub: 'Gosto de cozinhar', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10"/><path d="M12 6v6l4 2"/><path d="M18 14v4h4"/></svg> },
        ],
      },
    ],
  },
  {
    id: 'foods',
    title: 'Seus alimentos',
    subtitle: 'Pra recomendar só o que você tem acesso e gosta',
    fields: [
      {
        key: 'favorite_proteins', label: 'Quais proteínas você mais gosta ou tem acesso?', type: 'multicheck',
        options: ['Frango', 'Carne bovina', 'Ovo', 'Atum/Sardinha', 'Peixe', 'Proteína em pó', 'Feijão/Lentilha', 'Queijo cottage'],
      },
      {
        key: 'favorite_carbs', label: 'Quais carboidratos você mais gosta?', type: 'multicheck',
        options: ['Arroz', 'Batata doce', 'Macarrão', 'Pão integral', 'Aveia', 'Mandioca', 'Frutas', 'Inhame'],
      },
    ],
  },
  {
    id: 'restrictions',
    title: 'Restrições',
    subtitle: 'O que você não pode ou não gosta de comer',
    fields: [
      {
        key: 'food_intolerances', label: 'Tem alguma intolerância ou alergia?', type: 'multicheck',
        options: ['Lactose', 'Glúten', 'Amendoim', 'Frutos do mar', 'Nenhuma'],
      },
      {
        key: 'disliked_foods', label: 'Tem algum alimento que não come de jeito nenhum?', type: 'textarea',
        placeholder: 'Ex: fígado, brócolis, peixe... (deixe vazio se não tiver)',
      },
    ],
  },
  {
    id: 'routine',
    title: 'Sua rotina alimentar',
    subtitle: 'Quantas vezes você costuma comer por dia',
    fields: [
      {
        key: 'meals_per_day', label: 'Quantas refeições você faz normalmente?', type: 'cards',
        options: [
          { value: '2', label: '2 refeições', sub: 'Jejum intermitente', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
          { value: '3', label: '3 refeições', sub: 'Café, almoço, janta', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg> },
          { value: '4', label: '4–5 refeições', sub: 'Com lanches', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
          { value: '6', label: '6+ refeições', sub: 'Foco em performance', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
        ],
      },
    ],
  },
]

export default function NutritionQuiz({ profile, onComplete }: NutritionQuizProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const current = steps[step]
  const progress = ((step + 1) / steps.length) * 100

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))
  const toggleMulti = (key: string, value: string) => {
    setForm(prev => {
      const arr: string[] = prev[key] || []
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }

  const next = () => step < steps.length - 1 ? setStep(s => s + 1) : finish()
  const finish = async () => {
    setSaving(true)
    try {
      const updateData = { ...form, nutrition_quiz_done: true }
      await supabase.from('profiles').update(updateData).eq('id', profile.id)
      onComplete(updateData)
      toast.success('Preferências salvas! Gerando seu plano personalizado...')
    } catch { toast.error('Erro ao salvar') } finally { setSaving(false) }
  }

  const canAdvance = () => {
    const optional = ['disliked_foods', 'food_intolerances']
    return current.fields.filter(f => !optional.includes(f.key)).every(f => {
      const val = form[f.key]
      if (f.type === 'multicheck') return true // optional
      return val !== undefined && val !== ''
    })
  }

  return (
    <div className="fixed inset-0 bg-[#080808] flex flex-col items-center justify-center z-50 p-4 overflow-y-auto py-8">
      <div className="w-full max-w-lg mb-8">
        <div className="flex justify-between text-[10px] text-[#333] mb-2 uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
          <span>Configurando sua Nutrição</span><span>{step + 1} / {steps.length}</span>
        </div>
        <div className="h-0.5 bg-[#111] rounded-full overflow-hidden">
          <motion.div className="h-full bg-[#F59E0B] rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="w-full max-w-lg">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-display)' }}>{current.title}</h2>
            <p className="text-[#555] text-sm">{current.subtitle}</p>
          </div>

          <div className="space-y-7">
            {current.fields.map(field => (
              <div key={field.key}>
                <label className="text-[11px] font-black uppercase tracking-widest text-[#555] mb-3 block" style={{ fontFamily: 'var(--font-display)' }}>{field.label}</label>

                {field.type === 'cards' && (
                  <div className={`grid gap-3 ${(field.options?.length || 0) <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {(field.options as any[])?.map((o: any) => {
                      const selected = form[field.key] === o.value
                      return (
                        <button key={o.value} onClick={() => set(field.key, o.value)}
                          className={`p-4 rounded-xl border text-left transition-all ${selected ? 'bg-[#F59E0B]/8 border-[#F59E0B]/50' : 'bg-[#0E0E0E] border-[#1C1C1C] hover:border-[#2A2A2A]'}`}>
                          <div className={`mb-2 transition-colors ${selected ? 'text-[#F59E0B]' : 'text-[#333]'}`}>{o.icon}</div>
                          <div className={`text-sm font-bold ${selected ? 'text-white' : 'text-[#666]'}`}>{o.label}</div>
                          {o.sub && <div className={`text-xs mt-0.5 ${selected ? 'text-[#F59E0B]/70' : 'text-[#333]'}`}>{o.sub}</div>}
                        </button>
                      )
                    })}
                  </div>
                )}

                {field.type === 'multicheck' && (
                  <div className="flex flex-wrap gap-2">
                    {(field.options as string[])?.map(opt => {
                      const selected = (form[field.key] || []).includes(opt)
                      return (
                        <button key={opt} onClick={() => toggleMulti(field.key, opt)}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${selected ? 'bg-[#F59E0B]/10 border-[#F59E0B]/50 text-white' : 'bg-[#0E0E0E] border-[#1C1C1C] text-[#555] hover:border-[#2A2A2A]'}`}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}

                {field.type === 'textarea' && (
                  <textarea value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)}
                    placeholder={(field as any).placeholder} rows={3}
                    className="w-full bg-[#0E0E0E] border border-[#1C1C1C] rounded-xl px-5 py-4 text-white text-sm placeholder-[#333] resize-none focus:outline-none focus:border-[#F59E0B]/40" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-10">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="text-[#444] hover:text-[#999] transition-colors text-sm disabled:opacity-0">← Voltar</button>
            <button onClick={next} disabled={saving}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-black font-black uppercase tracking-wide px-10 py-3 rounded-xl transition-colors text-sm disabled:opacity-40">
              {saving ? 'Salvando...' : step === steps.length - 1 ? 'Montar meu plano →' : 'Próximo →'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
