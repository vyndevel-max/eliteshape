// src/components/features/profile/ProfilePanel.tsx
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'

const IconSave = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
const IconLoader = () => <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>

interface Field {
  key: keyof Profile
  label: string
  type: 'text' | 'number' | 'select' | 'toggle'
  options?: { value: string; label: string }[]
  placeholder?: string
  unit?: string
  min?: number
  max?: number
}

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: 'DADOS FÍSICOS',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', placeholder: 'Seu nome completo' },
      { key: 'age', label: 'Idade', type: 'number', unit: 'anos', min: 14, max: 90 },
      { key: 'height', label: 'Altura', type: 'number', unit: 'cm', min: 140, max: 230 },
      { key: 'weight', label: 'Peso atual', type: 'number', unit: 'kg', min: 40, max: 300 },
      { key: 'fat_percentage', label: '% Gordura estimada', type: 'number', unit: '%', min: 3, max: 50 },
      { key: 'gender', label: 'Sexo', type: 'select', options: [{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Feminino' }] },
    ],
  },
  {
    title: 'OBJETIVO & TREINO',
    fields: [
      {
        key: 'objective', label: 'Objetivo principal', type: 'select', options: [
          { value: 'Definição', label: 'Definição / Cutting' },
          { value: 'Hipertrofia', label: 'Hipertrofia / Bulking' },
          { value: 'Emagrecimento', label: 'Emagrecimento' },
          { value: 'Força', label: 'Força Máxima' },
          { value: 'Condicionamento', label: 'Condicionamento' },
          { value: 'Recomposição', label: 'Recomposição Corporal' },
        ]
      },
      {
        key: 'training_level', label: 'Nível de treino', type: 'select', options: [
          { value: 'beginner', label: 'Iniciante (< 1 ano)' },
          { value: 'intermediate', label: 'Intermediário (1-3 anos)' },
          { value: 'advanced', label: 'Avançado (3+ anos)' },
        ]
      },
      {
        key: 'activity_level', label: 'Nível de atividade', type: 'select', options: [
          { value: 'sedentary', label: 'Sedentário (sem atividade)' },
          { value: 'light', label: 'Leve (1-2x/semana)' },
          { value: 'moderate', label: 'Moderado (3-4x/semana)' },
          { value: 'active', label: 'Ativo (5-6x/semana)' },
          { value: 'very_active', label: 'Muito ativo (2x/dia)' },
        ]
      },
      { key: 'training_time', label: 'Horário de treino', type: 'text', placeholder: 'Ex: 18:00 - 20:00' },
      { key: 'routine', label: 'Frequência semanal', type: 'text', placeholder: 'Ex: 5x por semana' },
      { key: 'sleep', label: 'Horas de sono', type: 'number', unit: 'h/noite', min: 4, max: 12 },
    ],
  },
  {
    title: 'DIETA & CONDIÇÃO',
    fields: [
      {
        key: 'current_diet', label: 'Dieta atual', type: 'select', options: [
          { value: 'Onívoro', label: 'Onívoro (come tudo)' },
          { value: 'Vegetariano', label: 'Vegetariano' },
          { value: 'Vegano', label: 'Vegano' },
          { value: 'Low-carb', label: 'Low-carb / Keto' },
          { value: 'Mediterrânea', label: 'Mediterrânea' },
        ]
      },
      {
        key: 'financial_condition', label: 'Orçamento alimentar', type: 'select', options: [
          { value: 'low', label: 'Econômico (até R$400/mês)' },
          { value: 'medium', label: 'Médio (R$400-800/mês)' },
          { value: 'high', label: 'Alto (acima de R$800/mês)' },
        ]
      },
      { key: 'wants_supplements', label: 'Usa suplementos', type: 'toggle' },
    ],
  },
  {
    title: 'PREFERÊNCIAS',
    fields: [
      {
        key: 'personality_mode', label: 'Estilo do Coach', type: 'select', options: [
          { value: 'motivational', label: 'Motivacional (energia alta)' },
          { value: 'technical', label: 'Técnico (ciência aplicada)' },
          { value: 'raiz', label: 'Raiz (direto ao ponto)' },
        ]
      },
      {
        key: 'language', label: 'Idioma', type: 'select', options: [
          { value: 'pt', label: 'Português' },
          { value: 'en', label: 'English' },
        ]
      },
    ],
  },
]

interface ProfilePanelProps {
  profile: Profile
  onProfileUpdate: (data: Partial<Profile>) => void
}

export default function ProfilePanel({ profile, onProfileUpdate }: ProfilePanelProps) {
  const [form, setForm] = useState<Partial<Profile>>(profile)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const set = (key: keyof Profile, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update(form).eq('id', profile.id)
      if (error) throw error
      onProfileUpdate(form)
      toast.success('Perfil atualizado!')
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const completionFields = ['age', 'height', 'weight', 'gender', 'objective', 'training_level', 'activity_level']
  const completed = completionFields.filter(f => form[f as keyof Profile]).length
  const pct = Math.round((completed / completionFields.length) * 100)

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-8 py-6 border-b border-[#1C1C1C] flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>PERFIL</h1>
          <p className="text-[#555] text-sm mt-0.5">Mantenha seus dados atualizados para melhores resultados</p>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? <><IconLoader />Salvando...</> : <><IconSave />Salvar Alterações</>}
        </button>
      </div>

      <div className="flex-1 p-8 max-w-3xl">
        {/* Completion */}
        <div className="rounded-2xl bg-[#111] border border-[#1C1C1C] p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-semibold">{profile.name || 'Atleta'}</p>
              <p className="text-xs text-[#555]">{profile.is_premium ? 'Membro Premium' : 'Plano Free'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-black text-[#E8002D]" style={{ fontFamily: 'var(--font-display)' }}>{pct}%</p>
              <p className="text-xs text-[#555]">perfil completo</p>
            </div>
          </div>
          <div className="progress-track">
            <motion.div className="progress-fill" style={{ width: `${pct}%` }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
          </div>
          {pct < 100 && (
            <p className="text-xs text-[#555] mt-2">Complete seu perfil para análises mais precisas da IA</p>
          )}
        </div>

        {/* Form Sections */}
        <div className="space-y-8 stagger">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p className="text-xs font-black uppercase tracking-widest text-[#E8002D] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                {section.title}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-[#111] border border-[#1C1C1C] p-6">
                {section.fields.map(field => (
                  <div key={String(field.key)} className={field.type === 'toggle' ? 'flex items-center justify-between col-span-2' : ''}>
                    <label className="input-label">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(form[field.key] as string) || ''}
                        onChange={e => set(field.key, e.target.value)}
                        className="input select"
                      >
                        <option value="">— Selecionar —</option>
                        {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : field.type === 'toggle' ? (
                      <button
                        onClick={() => set(field.key, !form[field.key])}
                        className={`relative w-12 h-6 rounded-full transition-colors ${form[field.key] ? 'bg-[#E8002D]' : 'bg-[#252525]'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form[field.key] ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type}
                          value={(form[field.key] as string | number) || ''}
                          onChange={e => set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                          placeholder={field.placeholder}
                          min={field.min}
                          max={field.max}
                          className="input"
                        />
                        {field.unit && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#444] pointer-events-none">{field.unit}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={save} disabled={saving} className="btn btn-primary btn-lg">
            {saving ? <><IconLoader />Salvando...</> : <><IconSave />Salvar Perfil</>}
          </button>
        </div>
      </div>
    </div>
  )
}
