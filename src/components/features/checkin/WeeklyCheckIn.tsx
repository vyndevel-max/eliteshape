// src/components/features/checkin/WeeklyCheckIn.tsx
'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'

/* ── Icons ───────────────────────────────────────────────── */
const IconCamera   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
const IconX        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconLoader   = () => <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
const IconTrend    = ({ up }: { up: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{up ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>}</svg>
const IconCheck    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconFire     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>

/* ── Types ───────────────────────────────────────────────── */
interface CheckInResult {
  score: number
  fat_percentage_estimate: number
  evolution_summary: string
  score_change: number
  fat_change: number
  detected_changes: string[]
  training_adjustment: 'none' | 'minor' | 'major'
  diet_adjustment: 'none' | 'minor' | 'major'
  carb_cycle_recommended: boolean
  training_notes: string
  diet_notes: string
  motivational_message: string
  keep_current_plan_reason?: string
  new_training_plan?: string
  new_nutrition_plan?: string
}

interface Props {
  profile: Profile
  onProfileUpdate: (updates: Partial<Profile>) => void
  onClose: () => void
}

/* ── Helper ──────────────────────────────────────────────── */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1]
      resolve(b64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* ── Component ───────────────────────────────────────────── */
export default function WeeklyCheckIn({ profile, onProfileUpdate, onClose }: Props) {
  const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files).slice(0, 3).filter(f => f.type.startsWith('image/'))
    setPhotos(prev => [...prev, ...valid].slice(0, 3))
    valid.forEach(f => {
      const url = URL.createObjectURL(f)
      setPreviews(prev => [...prev, url].slice(0, 3))
    })
  }

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
  }

  const getWeekNumber = (d: Date): [number, number] => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    return [Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7), date.getUTCFullYear()]
  }

  const uploadPhoto = async (photo: File): Promise<string | null> => {
    try {
      const [week, year] = getWeekNumber(new Date())
      const ext = photo.name.split('.').pop() || 'jpg'
      const path = `${profile.id}/${year}-W${week}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('evolution-photos')
        .upload(path, photo, { upsert: true, contentType: photo.type })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        toast.error(`Erro ao salvar foto: ${uploadError.message}`)
        return null
      }

      // Bucket é privado — gerar URL assinada válida por 10 anos
      const { data: signedData, error: signError } = await supabase.storage
        .from('evolution-photos')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)

      if (signError) {
        console.error('Signed URL error:', signError)
        return null
      }

      return signedData?.signedUrl ?? null
    } catch (e) {
      console.error('uploadPhoto exception:', e)
      return null
    }
  }

  const saveWeeklyPhoto = async (photoUrl: string | null, data: CheckInResult) => {
    try {
      const [week, year] = getWeekNumber(new Date())
      await supabase.from('weekly_photos' as any).upsert({
        user_id: profile.id,
        photo_url: photoUrl || '',
        week_number: week,
        year,
        analysis_summary: data.evolution_summary,
        score: data.score,
        fat_percentage: data.fat_percentage_estimate,
        recorded_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_number,year' })
    } catch (e) { console.error('Save weekly photo error:', e) }
  }

  const runCheckIn = async () => {
    if (!photos.length) { toast.error('Envie pelo menos 1 foto'); return }
    setStep('processing')

    const steps = [
      'Analisando sua foto...',
      'Comparando com análise anterior...',
      'Avaliando consistência da semana...',
      'Decidindo ajustes no treino e dieta...',
      'Salvando foto de evolução...',
    ]
    let i = 0
    setStatusMsg(steps[0])
    const interval = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1)
      setStatusMsg(steps[i])
    }, 3000)

    try {
      const images = await Promise.all(photos.map(fileToBase64))
      const [photoUrl] = await Promise.all([
        uploadPhoto(photos[0]),
      ])

      const res = await fetch('/api/ai/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, profile }),
      })
      if (!res.ok) throw new Error('Erro na análise')
      const data: CheckInResult = await res.json()

      await saveWeeklyPhoto(photoUrl, data)
      setResult(data)
      setStep('result')

      const updates: Partial<Profile> = {
        last_analysis: JSON.stringify({ ...data, overall_score: data.score }),
      }
      if (data.training_adjustment === 'major' && data.new_training_plan) {
        updates.training_plan = data.new_training_plan
      }
      if (data.diet_adjustment === 'major' && data.new_nutrition_plan) {
        updates.nutrition_plan = data.new_nutrition_plan
      }
      onProfileUpdate(updates)

    } catch (e) {
      toast.error('Erro ao processar check-in')
      setStep('upload')
    } finally {
      clearInterval(interval)
    }
  }

  const adjLabel: Record<string, string> = {
    none: 'Manter plano atual',
    minor: 'Ajuste leve',
    major: 'Novo plano gerado',
  }
  const adjColor: Record<string, string> = {
    none: 'text-[#22C55E]',
    minor: 'text-[#FF6A00]',
    major: 'text-[#FF3B30]',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => e.target === e.currentTarget && step !== 'processing' && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:max-w-lg bg-[#161616] border border-[#2A2A2A] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92dvh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0 border-b border-[#222]">
            <div>
              <p className="forge-gradient-text text-[10px] font-bold uppercase tracking-widest mb-0.5">Forge AI</p>
              <h2 className="font-display text-xl font-black text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                Check-in Semanal
              </h2>
            </div>
            {step !== 'processing' && (
              <button onClick={onClose} className="text-[#555] hover:text-white transition-colors w-8 h-8 flex items-center justify-center">
                <IconX />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── STEP: UPLOAD ── */}
            {step === 'upload' && (
              <div className="p-6 space-y-5">
                <p className="text-[#888] text-sm leading-relaxed">
                  Envie uma foto atual (frente, costas ou lado). A Forge AI vai comparar com sua análise anterior, ver sua evolução e decidir se precisa ajustar treino ou dieta.
                </p>

                {/* Photo grid */}
                <div className="grid grid-cols-3 gap-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-[#1B1B1B] border border-[#2A2A2A]">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white">
                        <IconX />
                      </button>
                    </div>
                  ))}
                  {previews.length < 3 && (
                    <button onClick={() => fileRef.current?.click()}
                      className="aspect-square rounded-2xl border-2 border-dashed border-[#2A2A2A] hover:border-[#FF6A00]/50 text-[#555] hover:text-[#FF6A00] transition-all flex flex-col items-center justify-center gap-2">
                      <IconCamera />
                      <span className="text-[10px] font-medium">Adicionar</span>
                    </button>
                  )}
                </div>

                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

                <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4 space-y-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">O que a IA vai analisar</p>
                  {['Evolução visual comparada à análise anterior', 'Consistência do treino e dieta na semana', 'Se o plano precisa mudar ou continua ideal', 'Ciclo de carbos (se necessário)'].map(t => (
                    <div key={t} className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-full forge-gradient-bg flex items-center justify-center flex-shrink-0"><IconCheck /></span>
                      <span className="text-[#888] text-xs">{t}</span>
                    </div>
                  ))}
                </div>

                <button onClick={runCheckIn} disabled={!photos.length}
                  className={`btn btn-lg w-full ${photos.length ? 'btn-primary' : 'btn-ghost opacity-40'}`}>
                  <IconFire />Iniciar Check-in com Forge AI
                </button>
              </div>
            )}

            {/* ── STEP: PROCESSING ── */}
            {step === 'processing' && (
              <div className="p-6 flex flex-col items-center justify-center py-16 gap-6">
                <div className="relative w-20 h-20">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-20 h-20 rounded-full border-4 border-[#FF6A00]/20 border-t-[#FF6A00]" />
                  <img src="/icons/forge-logo.png" alt="" className="absolute inset-0 m-auto w-9 h-9 object-contain" />
                </div>
                <div className="text-center">
                  <p className="forge-gradient-text font-bold text-sm uppercase tracking-widest mb-2">Forge AI analisando</p>
                  <p className="text-[#888] text-sm">{statusMsg}</p>
                </div>
              </div>
            )}

            {/* ── STEP: RESULT ── */}
            {step === 'result' && result && (
              <div className="p-6 space-y-4">
                {/* Score */}
                <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#555]">FORGE SCORE</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#555]">GORDURA</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-end gap-2">
                      <span className="font-display text-4xl font-black forge-gradient-text" style={{ fontFamily: 'var(--font-display)' }}>{result.score}</span>
                      <span className="text-[#555] text-lg mb-1">/10</span>
                      <span className={`flex items-center gap-1 text-xs font-bold mb-1.5 ${result.score_change >= 0 ? 'text-[#22C55E]' : 'text-[#FF3B30]'}`}>
                        <IconTrend up={result.score_change >= 0} />
                        {result.score_change >= 0 ? '+' : ''}{result.score_change.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="font-display text-4xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>{result.fat_percentage_estimate}%</span>
                      <span className={`flex items-center gap-1 text-xs font-bold mb-1.5 ${result.fat_change <= 0 ? 'text-[#22C55E]' : 'text-[#FF3B30]'}`}>
                        <IconTrend up={result.fat_change <= 0} />
                        {result.fat_change >= 0 ? '+' : ''}{result.fat_change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evolution summary */}
                <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-2">Análise da Semana</p>
                  <p className="text-white text-sm leading-relaxed">{result.evolution_summary}</p>
                </div>

                {/* Detected changes */}
                {result.detected_changes.length > 0 && (
                  <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-3">Mudanças Detectadas</p>
                    <div className="space-y-2">
                      {result.detected_changes.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="w-4 h-4 rounded-full bg-[#FF6A00]/15 border border-[#FF6A00]/30 flex items-center justify-center flex-shrink-0 mt-0.5"><IconCheck /></span>
                          <span className="text-[#ccc] text-xs leading-relaxed">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plan decisions */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-1">Treino</p>
                    <p className={`text-sm font-bold ${adjColor[result.training_adjustment]}`}>{adjLabel[result.training_adjustment]}</p>
                    <p className="text-[#666] text-xs mt-1 leading-relaxed">{result.training_notes.slice(0, 80)}...</p>
                  </div>
                  <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-1">Nutrição</p>
                    <p className={`text-sm font-bold ${adjColor[result.diet_adjustment]}`}>{adjLabel[result.diet_adjustment]}</p>
                    <p className="text-[#666] text-xs mt-1 leading-relaxed">{result.diet_notes.slice(0, 80)}...</p>
                  </div>
                </div>

                {/* Carb cycle banner */}
                {result.carb_cycle_recommended && (
                  <div className="rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 p-4 flex items-start gap-3">
                    <span className="text-[#FF6A00] flex-shrink-0 mt-0.5"><IconFire /></span>
                    <div>
                      <p className="text-[#FF6A00] font-bold text-sm">Ciclo de Carbos Recomendado</p>
                      <p className="text-[#FF6A00]/70 text-xs mt-0.5">A Forge AI detectou estagnação. Ciclo de carbos pode quebrar o platô.</p>
                    </div>
                  </div>
                )}

                {/* Major change banners */}
                {result.training_adjustment === 'major' && (
                  <div className="rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 p-4">
                    <p className="text-[#22C55E] font-bold text-sm flex items-center gap-2"><IconCheck />Novo plano de treino ativado</p>
                    <p className="text-[#22C55E]/70 text-xs mt-1">Seu plano foi atualizado automaticamente. Acesse a aba Treino.</p>
                  </div>
                )}
                {result.diet_adjustment === 'major' && (
                  <div className="rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 p-4">
                    <p className="text-[#22C55E] font-bold text-sm flex items-center gap-2"><IconCheck />Novo plano alimentar ativado</p>
                    <p className="text-[#22C55E]/70 text-xs mt-1">Seu plano nutricional foi atualizado. Acesse a aba Nutrição.</p>
                  </div>
                )}

                {/* Motivational */}
                <div className="rounded-2xl forge-gradient-border p-4">
                  <p className="text-white text-sm leading-relaxed italic">"{result.motivational_message}"</p>
                  <p className="forge-gradient-text text-[10px] font-bold uppercase tracking-widest mt-2">— Forge AI</p>
                </div>

                <button onClick={onClose} className="btn btn-primary btn-lg w-full">
                  Ver meu progresso
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
