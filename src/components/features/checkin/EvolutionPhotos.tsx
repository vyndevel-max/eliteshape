// src/components/features/checkin/EvolutionPhotos.tsx
'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'

/* ── Icons ───────────────────────────────────────────────── */
const IconX        = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconLoader   = () => <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
const IconCompare  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="18"/><rect x="13" y="3" width="8" height="18"/></svg>
const IconTrend    = ({ up }: { up: boolean }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">{up ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>}</svg>
const IconCamera   = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>

/* ── Types ───────────────────────────────────────────────── */
interface WeeklyPhoto {
  id: string
  photo_url: string
  week_number: number
  year: number
  analysis_summary: string | null
  score: number | null
  fat_percentage: number | null
  recorded_at: string
}

interface Props {
  profile: Profile
  onClose: () => void
  onStartCheckIn: () => void
}

/* ── Helpers ─────────────────────────────────────────────── */
function weekLabel(week: number, year: number, recordedAt: string): string {
  const d = new Date(recordedAt)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Component ───────────────────────────────────────────── */
export default function EvolutionPhotos({ profile, onClose, onStartCheckIn }: Props) {
  const [photos, setPhotos] = useState<WeeklyPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'timeline' | 'compare'>('timeline')
  const [selected, setSelected] = useState<[number, number]>([0, 1])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('weekly_photos' as any)
        .select('*')
        .eq('user_id', profile.id)
        .order('recorded_at', { ascending: false })
        .limit(20)
      setPhotos((data || []) as WeeklyPhoto[])
      setLoading(false)
    }
    load()
  }, [profile.id])

  const photosSorted = [...photos].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
  const latest = photosSorted[photosSorted.length - 1]
  const first = photosSorted[0]
  const totalScoreChange = latest && first && first.score && latest.score ? latest.score - first.score : null
  const totalFatChange = latest && first && first.fat_percentage && latest.fat_percentage ? latest.fat_percentage - first.fat_percentage : null

  const compareA = photosSorted[selected[0]]
  const compareB = photosSorted[selected[1]]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:max-w-2xl bg-[#161616] border border-[#2A2A2A] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95dvh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0 border-b border-[#222]">
            <div>
              <p className="forge-gradient-text text-[10px] font-bold uppercase tracking-widest mb-0.5">Forge AI</p>
              <h2 className="font-display text-xl font-black text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                Evolução por Fotos
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {photos.length >= 2 && (
                <button onClick={() => setMode(m => m === 'timeline' ? 'compare' : 'timeline')}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all ${mode === 'compare' ? 'border-[#FF6A00]/50 text-[#FF6A00] bg-[#FF6A00]/10' : 'border-[#2A2A2A] text-[#666] hover:text-white'}`}>
                  <IconCompare /><span className="hidden sm:inline">Comparar</span>
                </button>
              )}
              <button onClick={onClose} className="text-[#555] hover:text-white w-8 h-8 flex items-center justify-center"><IconX /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-[#555]"><IconLoader /></div>
            ) : photos.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] flex items-center justify-center text-[#444] mb-4">
                  <IconCamera />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Nenhuma foto registrada</h3>
                <p className="text-[#666] text-sm leading-relaxed mb-6 max-w-xs">
                  Faça seu primeiro check-in semanal para começar a acompanhar sua evolução com fotos.
                </p>
                <button onClick={() => { onClose(); onStartCheckIn() }} className="btn btn-primary">
                  Fazer check-in agora
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Overall progress summary */}
                {photos.length >= 2 && (totalScoreChange !== null || totalFatChange !== null) && (
                  <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-3">
                      Progresso total — {photos.length} semanas
                    </p>
                    <div className="flex items-center gap-6">
                      {totalScoreChange !== null && (
                        <div>
                          <p className="text-[#666] text-xs mb-1">Forge Score</p>
                          <div className="flex items-center gap-1.5">
                            <span className="font-display text-2xl font-black forge-gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
                              {totalScoreChange >= 0 ? '+' : ''}{totalScoreChange.toFixed(1)}
                            </span>
                            <span className={totalScoreChange >= 0 ? 'text-[#22C55E]' : 'text-[#FF3B30]'}>
                              <IconTrend up={totalScoreChange >= 0} />
                            </span>
                          </div>
                        </div>
                      )}
                      {totalFatChange !== null && (
                        <div>
                          <p className="text-[#666] text-xs mb-1">Gordura corporal</p>
                          <div className="flex items-center gap-1.5">
                            <span className="font-display text-2xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>
                              {totalFatChange >= 0 ? '+' : ''}{totalFatChange.toFixed(1)}%
                            </span>
                            <span className={totalFatChange <= 0 ? 'text-[#22C55E]' : 'text-[#FF3B30]'}>
                              <IconTrend up={totalFatChange <= 0} />
                            </span>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-[#666] text-xs mb-1">Score atual</p>
                        <span className="font-display text-2xl font-black forge-gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
                          {latest?.score ?? '—'}<span className="text-[#444] text-sm">/10</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── COMPARE MODE ── */}
                {mode === 'compare' && photosSorted.length >= 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {([0, 1] as const).map(slot => (
                        <div key={slot}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#666] mb-2">{slot === 0 ? 'Antes' : 'Depois'}</p>
                          <select
                            value={selected[slot]}
                            onChange={e => setSelected(prev => { const next = [...prev] as [number, number]; next[slot] = Number(e.target.value); return next; })}
                            className="w-full bg-[#1B1B1B] border border-[#2A2A2A] rounded-xl px-3 py-2 text-white text-xs mb-2 focus:outline-none focus:border-[#FF6A00]/40"
                          >
                            {photosSorted.map((p, idx) => (
                              <option key={p.id} value={idx}>{weekLabel(p.week_number, p.year, p.recorded_at)}</option>
                            ))}
                          </select>
                          {photosSorted[selected[slot]] && (
                            <div className="rounded-2xl overflow-hidden aspect-[3/4] bg-[#1B1B1B]">
                              <img
                                src={photosSorted[selected[slot]].photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            </div>
                          )}
                          {photosSorted[selected[slot]]?.score && (
                            <div className="mt-2 text-center">
                              <span className="forge-gradient-text font-bold text-sm">{photosSorted[selected[slot]].score}/10</span>
                              {photosSorted[selected[slot]]?.fat_percentage && (
                                <span className="text-[#666] text-xs ml-2">{photosSorted[selected[slot]].fat_percentage}% gordura</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {compareA && compareB && (compareA.score || compareB.score) && (
                      <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-3">Variação entre seleções</p>
                        <div className="flex gap-6">
                          {compareA.score && compareB.score && (() => {
                            const diff = compareB.score - compareA.score
                            return (
                              <div>
                                <p className="text-[#666] text-xs mb-1">Score</p>
                                <span className={`font-bold text-lg ${diff >= 0 ? 'text-[#22C55E]' : 'text-[#FF3B30]'}`}>
                                  {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                                </span>
                              </div>
                            )
                          })()}
                          {compareA.fat_percentage && compareB.fat_percentage && (() => {
                            const diff = compareB.fat_percentage - compareA.fat_percentage
                            return (
                              <div>
                                <p className="text-[#666] text-xs mb-1">Gordura</p>
                                <span className={`font-bold text-lg ${diff <= 0 ? 'text-[#22C55E]' : 'text-[#FF3B30]'}`}>
                                  {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}

                    {compareB?.analysis_summary && (
                      <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-2">Análise da IA</p>
                        <p className="text-[#ccc] text-sm leading-relaxed">{compareB.analysis_summary}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TIMELINE MODE ── */}
                {mode === 'timeline' && (
                  <div className="space-y-3">
                    {[...photosSorted].reverse().map((photo, idx) => (
                      <motion.div key={photo.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                        <button
                          onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                          className="w-full text-left rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] hover:border-[#333] overflow-hidden transition-all"
                        >
                          <div className="flex items-center gap-4 p-4">
                            {/* Thumbnail */}
                            <div className="w-16 h-20 rounded-xl overflow-hidden bg-[#222] flex-shrink-0">
                              {photo.photo_url ? (
                                <img src={photo.photo_url} alt="" className="w-full h-full object-cover"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#444]"><IconCamera /></div>
                              )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm">{weekLabel(photo.week_number, photo.year, photo.recorded_at)}</p>
                              <p className="text-[#555] text-xs">Semana {photo.week_number}</p>
                              <div className="flex items-center gap-3 mt-2">
                                {photo.score && (
                                  <span className="forge-gradient-text font-bold text-sm">{photo.score}/10</span>
                                )}
                                {photo.fat_percentage && (
                                  <span className="text-[#666] text-xs">{photo.fat_percentage}% gordura</span>
                                )}
                              </div>
                            </div>
                            {/* Expand arrow */}
                            <svg className={`text-[#444] flex-shrink-0 transition-transform ${expandedIdx === idx ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>

                          {/* Expanded analysis */}
                          <AnimatePresence>
                            {expandedIdx === idx && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 border-t border-[#222] pt-3 space-y-3">
                                  {photo.photo_url && (
                                    <img src={photo.photo_url} alt="" className="w-full max-h-64 object-contain rounded-xl bg-[#111]"
                                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                  )}
                                  {photo.analysis_summary && (
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-1.5">Análise da Forge AI</p>
                                      <p className="text-[#ccc] text-xs leading-relaxed">{photo.analysis_summary}</p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* CTA — novo check-in */}
                <button onClick={() => { onClose(); onStartCheckIn() }} className="btn btn-primary w-full">
                  Novo check-in semanal
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
