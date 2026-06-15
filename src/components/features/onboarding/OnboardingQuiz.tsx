// src/components/features/onboarding/OnboardingQuiz.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'

// SVG icons for quiz cards
const Icons: Record<string, JSX.Element> = {
  // Objectives
  Hipertrofia: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M6.5 6.5h11M6.5 17.5h11M3 10h2.5M18.5 10H21M3 14h2.5M18.5 14H21"/><rect x="5.5" y="8" width="13" height="8" rx="1"/></svg>,
  Emagrecimento: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/></svg>,
  Definição: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Força: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>,
  Condicionamento: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  Recomposição: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M12 3v3M12 18v3M4.22 5.22l2.12 2.12M17.66 16.66l2.12 2.12M3 12h3M18 12h3M4.22 18.78l2.12-2.12M17.66 7.34l2.12-2.12"/></svg>,
  // Training levels
  beginner: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  intermediate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  advanced: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  // Activity
  sedentary: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M20 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h3"/><path d="M12 12v9"/><path d="M8 17h8"/></svg>,
  light: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><circle cx="12" cy="5" r="2"/><path d="M12 7v5l-2 2"/><path d="m9 22 3-8 3 8"/><path d="M7 14h10"/></svg>,
  moderate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><circle cx="12" cy="5" r="2"/><path d="M12 7v3l2.5 2.5"/><path d="M7.5 15.5 12 10l4.5 5.5"/><path d="m9 22 3-6 3 6"/></svg>,
  active: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  very_active: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  // Diet
  Onívoro: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M7 10h10"/><path d="M7 14h10"/><path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z"/><path d="M12 3c1.5 2 2.5 4.5 2.5 9S13.5 19 12 21"/><path d="M12 3c-1.5 2-2.5 4.5-2.5 9S10.5 19 12 21"/></svg>,
  Vegetariano: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M2 22c1.25-1.25 2.5-2.5 3.5-4C7 16 8 14 9 11.5S10.5 7 12 5c1-1 2-1.5 3-1.5s2 .5 2.5 1.5c.5 1 .5 2 0 3s-1.5 2-3 2.5S12 11 11 12c-1.5 2-2 4-2 6"/></svg>,
  Vegano: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><circle cx="12" cy="12" r="9"/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"/><path d="M12 8v1M12 15v1"/></svg>,
  'Low-carb': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M6 8a6 6 0 0 1 12 0c0 7-3 11-6 11S6 15 6 8z"/><path d="M12 14v7"/></svg>,
  // Personality
  motivational: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  technical: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>,
  raiz: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8"><path d="m9 9 5 12 1.774-5.226L21 14 9 9z"/><path d="m16.071 16.071 4.243 4.243"/><path d="m7.188 2.239.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656-2.12 2.122"/></svg>,
}

interface Step {
  id: string
  title: string
  subtitle: string
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'select' | 'cards' | 'textarea' | 'toggle'
    placeholder?: string
    unit?: string
    options?: Array<{ value: string; label: string; sub?: string }>
  }>
}

const steps: Step[] = [
  {
    id: 'basics', title: 'Vamos começar', subtitle: 'Informações básicas para personalizar tudo',
    fields: [
      { key: 'name', label: 'Qual é o seu nome?', type: 'text', placeholder: 'Ex: João Silva' },
      { key: 'age', label: 'Quantos anos você tem?', type: 'number', placeholder: '25', unit: 'anos' },
      { key: 'gender', label: 'Sexo biológico', type: 'select', options: [
        { value: 'male', label: '♂ Masculino' }, { value: 'female', label: '♀ Feminino' },
      ]},
    ],
  },
  {
    id: 'body', title: 'Seu corpo', subtitle: 'Para calcular suas necessidades calóricas exatas',
    fields: [
      { key: 'height', label: 'Sua altura', type: 'number', placeholder: '175', unit: 'cm' },
      { key: 'weight', label: 'Seu peso atual', type: 'number', placeholder: '80', unit: 'kg' },
      { key: 'fat_percentage', label: '% de gordura estimada (opcional)', type: 'number', placeholder: '20', unit: '%' },
    ],
  },
  {
    id: 'objective', title: 'Seu objetivo', subtitle: 'O que você quer conquistar?',
    fields: [
      { key: 'objective', label: 'Objetivo principal', type: 'cards', options: [
        { value: 'Hipertrofia', label: 'Ganhar Massa' },
        { value: 'Emagrecimento', label: 'Emagrecer' },
        { value: 'Definição', label: 'Definição' },
        { value: 'Força', label: 'Força' },
        { value: 'Condicionamento', label: 'Cardio' },
        { value: 'Recomposição', label: 'Recomposição' },
      ]},
    ],
  },
  {
    id: 'training', title: 'Sua experiência', subtitle: 'Para adequar intensidade e volume',
    fields: [
      { key: 'training_level', label: 'Nível de treino', type: 'cards', options: [
        { value: 'beginner', label: 'Iniciante', sub: '< 1 ano' },
        { value: 'intermediate', label: 'Intermediário', sub: '1-3 anos' },
        { value: 'advanced', label: 'Avançado', sub: '3+ anos' },
      ]},
      { key: 'activity_level', label: 'Frequência semanal', type: 'cards', options: [
        { value: 'sedentary', label: 'Sedentário', sub: 'Sem atividade' },
        { value: 'light', label: 'Leve', sub: '1-2x/sem' },
        { value: 'moderate', label: 'Moderado', sub: '3-4x/sem' },
        { value: 'active', label: 'Ativo', sub: '5-6x/sem' },
        { value: 'very_active', label: 'Atleta', sub: '2x/dia' },
      ]},
    ],
  },
  {
    id: 'health', title: 'Saúde & Restrições', subtitle: 'Para recomendar treinos seguros e adaptados',
    fields: [
      { key: 'health_conditions', label: 'Tem algum problema de saúde ou lesão?', type: 'textarea',
        placeholder: 'Ex: joelho operado, hérnia de disco, hipertensão... (deixe vazio se não tiver)' },
      { key: 'current_diet', label: 'Sua alimentação', type: 'cards', options: [
        { value: 'Onívoro', label: 'Como tudo' },
        { value: 'Vegetariano', label: 'Vegetariano' },
        { value: 'Vegano', label: 'Vegano' },
        { value: 'Low-carb', label: 'Low-carb' },
      ]},
    ],
  },
  {
    id: 'preferences', title: 'Estilo do coach', subtitle: 'Como você quer que o coach se comunique?',
    fields: [
      { key: 'personality_mode', label: 'Personalidade do coach', type: 'cards', options: [
        { value: 'motivational', label: 'Motivacional', sub: 'Energia e hype' },
        { value: 'technical', label: 'Técnico', sub: 'Ciência aplicada' },
        { value: 'raiz', label: 'Raiz', sub: 'Direto ao ponto' },
      ]},
      { key: 'wants_supplements', label: 'Usa ou quer usar suplementos?', type: 'toggle' },
    ],
  },
]

interface OnboardingQuizProps { profile: Profile; onComplete: (data: Partial<Profile>) => void }

export default function OnboardingQuiz({ profile, onComplete }: OnboardingQuizProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, any>>({ name: profile.name || '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))
  const current = steps[step]
  const progress = ((step + 1) / steps.length) * 100

  const next = () => step < steps.length - 1 ? setStep(s => s + 1) : finish()
  const finish = async () => {
    setSaving(true)
    try {
      const updateData = { ...form, onboarding_done: true }
      await supabase.from('profiles').update(updateData).eq('id', profile.id)
      onComplete(updateData)
      toast.success('Perfil configurado! Bem-vindo ao Elite Shape!')
    } catch { toast.error('Erro ao salvar') } finally { setSaving(false) }
  }

  const optional = ['fat_percentage', 'health_conditions', 'wants_supplements']
  const canAdvance = () => current.fields.filter(f => !optional.includes(f.key)).every(f => form[f.key] !== undefined && form[f.key] !== '')

  return (
    <div className="fixed inset-0 bg-[#080808] flex flex-col items-center justify-center z-50 p-4 overflow-y-auto py-8">
      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex justify-between text-[10px] text-[#333] mb-2 uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
          <span>Configuração do Perfil</span><span>{step + 1} / {steps.length}</span>
        </div>
        <div className="h-0.5 bg-[#111] rounded-full overflow-hidden">
          <motion.div className="h-full bg-[#E8002D] rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
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

                {field.type === 'text' && (
                  <input type="text" value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)}
                    placeholder={field.placeholder} autoFocus
                    className="w-full bg-[#0E0E0E] border border-[#1C1C1C] rounded-xl px-5 py-4 text-white text-lg placeholder-[#333] focus:outline-none focus:border-[#E8002D]/50 transition-colors" />
                )}
                {field.type === 'number' && (
                  <div className="relative">
                    <input type="number" value={form[field.key] || ''} onChange={e => set(field.key, Number(e.target.value))}
                      placeholder={field.placeholder}
                      className="w-full bg-[#0E0E0E] border border-[#1C1C1C] rounded-xl px-5 py-4 text-white text-lg placeholder-[#333] focus:outline-none focus:border-[#E8002D]/50 transition-colors pr-16" />
                    {field.unit && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[#444] text-sm">{field.unit}</span>}
                  </div>
                )}
                {field.type === 'textarea' && (
                  <textarea value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)}
                    placeholder={field.placeholder} rows={3}
                    className="w-full bg-[#0E0E0E] border border-[#1C1C1C] rounded-xl px-5 py-4 text-white text-sm placeholder-[#333] resize-none focus:outline-none focus:border-[#E8002D]/50 transition-colors" />
                )}
                {field.type === 'toggle' && (
                  <div className="flex items-center gap-4">
                    <button onClick={() => set(field.key, !form[field.key])}
                      className={`relative w-14 h-7 rounded-full transition-colors ${form[field.key] ? 'bg-[#E8002D]' : 'bg-[#1C1C1C]'}`}>
                      <span className={`absolute top-1.5 w-4 h-4 rounded-full bg-white transition-transform ${form[field.key] ? 'translate-x-8' : 'translate-x-1.5'}`} />
                    </button>
                    <span className="text-[#666] text-sm">{form[field.key] ? 'Sim' : 'Não'}</span>
                  </div>
                )}
                {field.type === 'select' && (
                  <select value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)}
                    className="w-full bg-[#0E0E0E] border border-[#1C1C1C] rounded-xl px-5 py-4 text-white text-base focus:outline-none focus:border-[#E8002D]/50 transition-colors">
                    <option value="">— Selecionar —</option>
                    {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
                {field.type === 'cards' && (
                  <div className={`grid gap-3 ${(field.options?.length || 0) <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
                    {field.options?.map(o => {
                      const icon = Icons[o.value]
                      const selected = form[field.key] === o.value
                      return (
                        <button key={o.value} onClick={() => set(field.key, o.value)}
                          className={`p-4 rounded-xl border text-left transition-all group ${selected ? 'bg-[#E8002D]/8 border-[#E8002D]/50' : 'bg-[#0E0E0E] border-[#1C1C1C] hover:border-[#2A2A2A]'}`}>
                          <div className={`mb-2 transition-colors ${selected ? 'text-[#E8002D]' : 'text-[#333] group-hover:text-[#555]'}`}>
                            {icon || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><circle cx="12" cy="12" r="9"/></svg>}
                          </div>
                          <div className={`text-sm font-bold ${selected ? 'text-white' : 'text-[#666]'}`}>{o.label}</div>
                          {o.sub && <div className={`text-xs mt-0.5 ${selected ? 'text-[#E8002D]/70' : 'text-[#333]'}`}>{o.sub}</div>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-10">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="text-[#444] hover:text-[#999] transition-colors text-sm disabled:opacity-0">
              ← Voltar
            </button>
            <button onClick={next} disabled={!canAdvance() || saving}
              className="btn btn-primary px-10 disabled:opacity-30">
              {saving ? 'Salvando...' : step === steps.length - 1 ? 'Entrar no App →' : 'Próximo →'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
