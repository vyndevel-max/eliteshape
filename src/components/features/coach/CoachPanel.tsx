// src/components/features/coach/CoachPanel.tsx
'use client'
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from 'react-markdown'
import type { Profile } from '@/types/supabase'
import { resizeImage } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import RadialScore from '@/components/ui/RadialScore'
import AnimatedNumber from '@/components/ui/AnimatedNumber'

// ---- SVG Icons ----
const IconCamera = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
const IconScan = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
const IconZap = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
const IconX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
const IconLoader = () => <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconTrendUp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
const IconChatLink = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>

interface CoachPanelProps {
  profile: Profile
  onProfileUpdate: (data: Partial<Profile>) => void
}

interface AnalysisResult {
  overall_score?: number
  fat_percentage_estimate?: number
  muscle_mass?: string
  strong_points?: string[]
  weak_points?: string[]
  priority_muscles?: string[]
  training_plan?: string
  nutrition_plan?: string
  motivational_message?: string
  roast?: string
}

export default function CoachPanel({ profile, onProfileUpdate }: CoachPanelProps) {
  const [images, setImages] = useState<{ file: File; preview: string; base64: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const supabase = createClient()

  const isProfileReady = profile.age && profile.height && profile.weight && profile.objective

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 5)
    const processed = await Promise.all(arr.map(async (file) => {
      const base64 = await resizeImage(file, 1024)
      const preview = URL.createObjectURL(file)
      return { file, preview, base64 }
    }))
    setImages(prev => [...prev, ...processed].slice(0, 5))
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const runAnalysis = async (isRoast = false) => {
    if (images.length === 0) { toast.error('Adicione pelo menos uma foto'); return }
    if (!isProfileReady) { toast.error('Complete seu perfil primeiro'); return }
    if (!profile.is_premium && images.length > 1) { toast.error('Plano free permite apenas 1 foto'); return }

    setLoading(true)
    setLoadingStep('Processando imagens...')
    setResult(null)

    try {
      setLoadingStep('Consultando Forge AI...')
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map(i => i.base64),
          profile,
          isRoast,
        }),
      })

      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro na análise')
      const data = await res.json()
      setResult(data)
      setLoadingStep('Salvando análise...')

      // Save to Supabase
      await supabase.from('shape_history').insert({
        user_id: profile.id,
        analysis: data,
        fat_percentage: data.fat_percentage_estimate,
        muscle_score: data.overall_score,
      })

      // Update profile plans
      if (data.training_plan) {
        await supabase.from('profiles').update({
          training_plan: data.training_plan,
          nutrition_plan: data.nutrition_plan,
          last_analysis: JSON.stringify(data),
          target_calories: data.nutrition_schedule?.target_calories,
          target_protein: data.nutrition_schedule?.target_protein,
          target_carbs: data.nutrition_schedule?.target_carbs,
          target_fat: data.nutrition_schedule?.target_fat,
        }).eq('id', profile.id)

        onProfileUpdate({
          training_plan: data.training_plan,
          nutrition_plan: data.nutrition_plan,
          target_calories: data.nutrition_schedule?.target_calories,
          target_protein: data.nutrition_schedule?.target_protein,
          target_carbs: data.nutrition_schedule?.target_carbs,
          target_fat: data.nutrition_schedule?.target_fat,
        })
      }

      toast.success('Análise concluída!')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao analisar')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }


  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-[#222222] flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
            DIAGNÓSTICO FORGE
          </h1>
          <p className="text-[#555] text-sm mt-0.5">Visão computacional + Forge AI aplicada ao seu físico</p>
        </div>
        <button onClick={() => setActiveTab('chat')}
          className="flex items-center gap-2 text-xs text-[#555] hover:text-[#999] border border-[#222222] hover:border-[#333] rounded-xl px-4 py-2.5 transition-all">
          <IconChatLink />Falar com o Coach
        </button>
      </div>

      <div className="flex-1 p-4 sm:p-8">
          <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!isProfileReady && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                  Complete seu perfil antes de gerar uma análise.
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Upload Zone */}
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#555] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                    FOTOS DO SHAPE (até {profile.is_premium ? 5 : 1})
                  </h2>

                  {/* Drop Area */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => images.length < (profile.is_premium ? 5 : 1) && fileRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                      dragging ? 'border-[#FF3B30] bg-[#FF3B30]/5' : 'border-[#2A2A2A] hover:border-[#FF3B30]/40 hover:bg-white/[0.02]'
                    } ${images.length > 0 ? 'p-4' : 'p-12 flex flex-col items-center justify-center'}`}
                  >
                    {images.length === 0 ? (
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-center justify-center mx-auto mb-4 text-[#FF3B30]">
                          <IconCamera />
                        </div>
                        <p className="text-white font-semibold mb-1">Arraste ou clique para enviar</p>
                        <p className="text-[#555] text-sm">Fotos do shape em poses padrão — max {profile.is_premium ? 5 : 1} foto{profile.is_premium ? 's' : ''}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {images.map((img, i) => (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#1B1B1B]">
                            <img src={img.preview} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={e => { e.stopPropagation(); setImages(prev => prev.filter((_, j) => j !== i)) }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-[#FF3B30] transition-colors"
                            >
                              <IconX />
                            </button>
                          </div>
                        ))}
                        {images.length < (profile.is_premium ? 5 : 1) && (
                          <div className="aspect-square rounded-xl border-2 border-dashed border-[#2A2A2A] flex items-center justify-center text-[#444] hover:text-[#FF3B30] hover:border-[#FF3B30]/40 transition-colors cursor-pointer">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => e.target.files && handleFiles(e.target.files)} />

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => runAnalysis(false)}
                      disabled={loading || images.length === 0}
                      className="btn btn-primary flex-1"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {loading ? (
                        <><IconLoader />{loadingStep || 'Analisando...'}</>
                      ) : (
                        <><IconScan />GERAR PROTOCOLO FORGE</>
                      )}
                    </button>
                    {profile.is_premium && (
                      <button
                        onClick={() => runAnalysis(true)}
                        disabled={loading || images.length === 0}
                        className="btn btn-secondary px-4"
                        title="Zoar meu shape"
                      >
                        <IconZap />
                      </button>
                    )}
                  </div>

                  {/* Tips */}
                  <div className="mt-6 rounded-xl bg-[#161616] border border-[#222222] p-5 card-lift">
                    <p className="text-xs font-black text-[#FF3B30] uppercase tracking-widest mb-3" style={{ fontFamily: 'var(--font-display)' }}>DICAS DO COACH</p>
                    <ul className="space-y-2">
                      {[
                        'Envie fotos em jejum para melhor análise de gordura',
                        'Use iluminação consistente e poses padrão de fisiculturismo',
                        'Envie fotos de frente, lado e costas para análise completa',
                      ].map((tip, i) => (
                        <li key={i} className="flex gap-2 text-sm text-[#555]">
                          <span className="text-[#FF3B30] mt-0.5 flex-shrink-0"><IconCheck /></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Results */}
                <div>
                  {!result ? (
                    <div className="h-full flex items-center justify-center text-center py-20">
                      <div>
                        <div className={`relative w-20 h-20 rounded-2xl bg-[#161616] border flex items-center justify-center mx-auto mb-4 overflow-hidden ${loading ? 'border-[#FF3B30]/30 text-[#FF3B30]' : 'border-[#222222] text-[#333]'}`}>
                          <IconScan />
                          {loading && <span className="scan-line" />}
                        </div>
                        <p className={`text-sm ${loading ? 'text-[#999]' : 'text-[#444]'}`}>
                          {loading ? loadingStep : 'Envie fotos e clique em "Gerar Protocolo Forge"'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      {result.roast && (
                        <div className="rounded-2xl bg-gradient-to-br from-[#FF3B30]/10 to-[#6366F1]/5 border border-[#FF3B30]/20 p-6">
                          <p className="text-xs font-black text-[#FF3B30] uppercase tracking-widest mb-3" style={{ fontFamily: 'var(--font-display)' }}>ROAST MODE ATIVADO</p>
                          <p className="text-white text-sm leading-relaxed italic">{result.roast}</p>
                        </div>
                      )}

                      {result.overall_score !== undefined && (
                        <div className="grid grid-cols-2 gap-3">
                          {/* Score */}
                          <div className="rounded-2xl bg-[#161616] border border-[#222222] p-5 flex flex-col items-center justify-center card-lift">
                            <RadialScore value={result.overall_score} max={10} size={108} strokeWidth={6} gradient label="SCORE" />
                          </div>
                          {/* BF% */}
                          <div className="rounded-2xl bg-[#161616] border border-[#222222] p-5 flex flex-col items-center justify-center card-lift">
                            <RadialScore value={result.fat_percentage_estimate ?? 0} max={40} size={108} strokeWidth={6} color="var(--gold)" label="% GORDURA" decimals={1} suffix="%" />
                          </div>
                        </div>
                      )}

                      {result.muscle_mass && (
                        <div className="rounded-xl bg-[#161616] border border-[#222222] px-5 py-3 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-[#555]" style={{ fontFamily: 'var(--font-display)' }}>MASSA MUSCULAR</span>
                          <span className="badge-green text-xs font-bold rounded-lg px-3 py-1 capitalize">{result.muscle_mass}</span>
                        </div>
                      )}

                      {result.strong_points && (
                        <div className="rounded-2xl bg-[#161616] border border-[#222222] p-5 card-lift">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--green)' }}>
                                <IconCheck />PONTOS FORTES
                              </p>
                              <ul className="space-y-2">
                                {result.strong_points.map((p, i) => (
                                  <li key={i} className="text-sm text-[#999] flex gap-2 leading-relaxed"><span className="text-[var(--green)] mt-0.5 flex-shrink-0"><IconCheck /></span>{p}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="sm:border-l border-[#222222] sm:pl-5">
                              <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-[#FF3B30]" style={{ fontFamily: 'var(--font-display)' }}>
                                <IconTrendUp />PRIORIDADES
                              </p>
                              <ul className="space-y-2">
                                {result.weak_points?.map((p, i) => (
                                  <li key={i} className="text-sm text-[#999] flex gap-2 leading-relaxed"><span className="text-[#FF3B30] mt-0.5 flex-shrink-0"><IconTrendUp /></span>{p}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {result.motivational_message && (
                        <div className="rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/15 p-4 card-lift">
                          <p className="text-sm text-[#E8E8E8] italic leading-relaxed">{result.motivational_message}</p>
                        </div>
                      )}

                      {result.training_plan && (
                        <details className="rounded-2xl bg-[#161616] border border-[#222222] overflow-hidden card-lift">
                          <summary className="p-5 cursor-pointer text-white font-semibold text-sm flex items-center justify-between">
                            Ver Plano de Treino Completo
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                          </summary>
                          <div className="p-5 pt-0 border-t border-[#222222]">
                            <div className="prose-dark"><Markdown>{result.training_plan}</Markdown></div>
                          </div>
                        </details>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
      </div>
    </div>
  )
}
