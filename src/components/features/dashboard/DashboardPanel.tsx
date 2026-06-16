// src/components/features/dashboard/DashboardPanel.tsx
'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import type { Profile } from '@/types/supabase'
import { formatNumber } from '@/lib/utils'
import RadialScore from '@/components/ui/RadialScore'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import WeeklyCheckIn from '@/components/features/checkin/WeeklyCheckIn'
import EvolutionPhotos from '@/components/features/checkin/EvolutionPhotos'

// ---- Icons ----
const IconFlame = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2-1 2-2.5 0-1.5-1-2.5-1-4 0-1.5 1-3 1-3s2 2 2 5c0 3-2 5-5 5-3 0-5-2-5-5 0-2 1-3.5 2.5-5.5C8.5 5.5 9 4 9 2c0 0 2 1.5 2 4 0 1-.5 2-.5 2" /></svg>
const IconScan = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
const IconDroplet = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
const IconFork = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
const IconDumbbell = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
const IconChat = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const IconCalendar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IconArrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>

interface DashboardPanelProps {
  profile: Profile
  onProfileUpdate: (data: Partial<Profile>) => void
}

interface ShapeRow { fat_percentage: number | null; muscle_score: number | null; recorded_at: string }

const DAY_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTH_LABEL = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

export default function DashboardPanel({ profile, onProfileUpdate }: DashboardPanelProps) {
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const supabase = createClient()

  const [latestShape, setLatestShape] = useState<ShapeRow | null>(null)
  const [shapeHistory, setShapeHistory] = useState<ShapeRow[]>([])
  const [totals, setTotals] = useState({ calories: 0, protein: 0 })
  const [waterMl, setWaterMl] = useState(0)
  const [trainingDone, setTrainingDone] = useState(false)
  const [streak, setStreak] = useState(0)

  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const greetingHour = now.getHours()
  const greeting = greetingHour < 12 ? 'Bom dia' : greetingHour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = profile.name ? profile.name.split(' ')[0] : 'Atleta'

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [shapeRes, mealsRes, waterRes, missionsRes] = await Promise.all([
        supabase.from('shape_history').select('fat_percentage, muscle_score, recorded_at').eq('user_id', profile.id).order('recorded_at', { ascending: false }).limit(10),
        supabase.from('meals').select('calories, protein').eq('user_id', profile.id).gte('logged_at', today + 'T00:00:00'),
        supabase.from('water_logs').select('amount_ml').eq('user_id', profile.id).gte('logged_at', today + 'T00:00:00'),
        supabase.from('daily_missions' as any).select('date, training_done').eq('user_id', profile.id).order('date', { ascending: false }).limit(30),
      ])

      const shapeRows = (shapeRes.data || []) as ShapeRow[]
      setLatestShape(shapeRows[0] || null)
      setShapeHistory([...shapeRows].reverse())

      const meals = mealsRes.data || []
      setTotals({
        calories: meals.reduce((s, m: any) => s + (m.calories || 0), 0),
        protein: meals.reduce((s, m: any) => s + (m.protein || 0), 0),
      })

      const waterRows = waterRes.data || []
      setWaterMl(waterRows.reduce((s, w: any) => s + (w.amount_ml || 0), 0))

      const missions = (missionsRes.data || []) as any[]
      const todayMission = missions.find(m => m.date === today)
      setTrainingDone(!!todayMission?.training_done)

      // Streak: consecutive days with training_done, walking back from today
      let s = 0
      const map = new Map(missions.map(m => [m.date, m.training_done]))
      let cursor = new Date()
      for (let i = 0; i < 30; i++) {
        const key = cursor.toISOString().split('T')[0]
        if (map.get(key)) { s++; cursor.setDate(cursor.getDate() - 1) }
        else if (key === today) { cursor.setDate(cursor.getDate() - 1); continue }
        else break
      }
      setStreak(s)
    } catch {
      // dashboard is non-critical, fail silently
    }
  }

  const calorieTarget = profile.target_calories || 2500
  const proteinTarget = profile.target_protein || 160
  const waterTarget = 3000
  const caloriePct = Math.min((totals.calories / Math.max(calorieTarget, 1)) * 100, 100)
  const waterPct = Math.min((waterMl / waterTarget) * 100, 100)

  const chartData = shapeHistory.map(s => {
    const d = new Date(s.recorded_at)
    return { date: `${d.getDate()} ${MONTH_LABEL[d.getMonth()]}`, score: s.muscle_score ?? 0, fat: s.fat_percentage ?? 0 }
  })

  // Days since last check-in
  const lastCheckIn = shapeHistory.length > 0
    ? [...shapeHistory].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0].recorded_at
    : null
  const daysSinceCheckIn = lastCheckIn
    ? Math.floor((Date.now() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24))
    : 999
  const checkInDue = profile.onboarding_done && daysSinceCheckIn >= 7

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-[#222222] flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
            {greeting}, {firstName.toUpperCase()}
          </h1>
          <p className="text-[#555] text-sm mt-0.5 capitalize">
            {DAY_LABEL[now.getDay()]}, {now.getDate()} de {MONTH_LABEL[now.getMonth()]}
          </p>
        </div>
        {streak > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 badge-gold rounded-xl px-4 py-2.5">
            <IconFlame />
            <span className="font-display font-black text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              <AnimatedNumber value={streak} /> {streak === 1 ? 'DIA' : 'DIAS'} DE SEQUÊNCIA
            </span>
          </motion.div>
        )}
      </div>

      <div className="p-4 sm:p-8 space-y-6">
        {/* Hero row: score + daily summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Score card */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-4 rounded-2xl bg-[#161616] border border-[#222222] p-6 flex flex-col items-center justify-center text-center card-lift">
            {/* Check-in due banner */}
            {checkInDue ? (
              <button onClick={() => setShowCheckIn(true)}
                className="w-full mb-5 rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 hover:border-[#FF6A00]/60 p-4 flex items-center gap-3 transition-all text-left group">
                <span className="w-10 h-10 rounded-xl forge-gradient-bg flex items-center justify-center flex-shrink-0"><IconCalendar /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[#FF6A00] font-bold text-sm">Check-in semanal disponível</p>
                  <p className="text-[#FF6A00]/60 text-xs mt-0.5">{daysSinceCheckIn === 999 ? 'Faça sua primeira análise de acompanhamento' : `Última análise há ${daysSinceCheckIn} dias — hora de ver sua evolução!`}</p>
                </div>
                <svg className="text-[#FF6A00]/50 group-hover:text-[#FF6A00] transition-colors flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            ) : shapeHistory.length > 0 && (
              <button onClick={() => setShowEvolution(true)}
                className="w-full mb-5 rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] hover:border-[#333] p-4 flex items-center gap-3 transition-all text-left group">
                <span className="w-10 h-10 rounded-xl bg-[#FF6A00]/10 border border-[#FF6A00]/20 flex items-center justify-center flex-shrink-0 text-[#FF6A00]"><IconCalendar /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-sm">Ver evolução por fotos</p>
                  <p className="text-[#555] text-xs mt-0.5">Próximo check-in em {7 - daysSinceCheckIn} dia{7 - daysSinceCheckIn !== 1 ? 's' : ''}</p>
                </div>
                <svg className="text-[#444] group-hover:text-[#999] transition-colors flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            )}
            <p className="text-xs font-black uppercase tracking-widest text-[#555] mb-4" style={{ fontFamily: 'var(--font-display)' }}>FORGE SCORE</p>
            {latestShape ? (
              <>
                <RadialScore value={latestShape.muscle_score ?? 0} max={10} size={150} gradient label="/ 10" />
                <div className="flex items-center gap-2 mt-4">
                  <span className="badge-gold text-xs font-bold rounded-lg px-3 py-1">
                    {formatNumber(latestShape.fat_percentage ?? 0, 1)}% gordura
                  </span>
                </div>
              </>
            ) : (
              <div className="py-6">
                <div className="w-16 h-16 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-center justify-center mx-auto mb-4 text-[#FF3B30]">
                  <IconScan />
                </div>
                <p className="text-white font-semibold text-sm mb-1">Sem análise ainda</p>
                <p className="text-[#555] text-xs mb-4">Faça sua análise corporal para começar a acompanhar sua evolução</p>
                <button onClick={() => setActiveTab('coach')} className="btn btn-primary btn-sm">
                  <IconScan />Gerar Análise
                </button>
              </div>
            )}
          </motion.div>

          {/* Today summary */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Calories */}
            <div className="rounded-2xl bg-[#161616] border border-[#222222] p-6 card-lift">
              <div className="flex items-center gap-2 text-[#FF3B30] mb-4">
                <IconFork />
                <p className="text-xs font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>CALORIAS HOJE</p>
              </div>
              <p className="font-display font-black text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
                <AnimatedNumber value={totals.calories} />
              </p>
              <p className="text-[#555] text-xs mb-3">de {formatNumber(calorieTarget)} kcal</p>
              <div className="progress-track"><motion.div className="progress-fill" style={{ background: 'var(--red)' }} initial={{ width: 0 }} animate={{ width: `${caloriePct}%` }} transition={{ duration: 0.8, delay: 0.3 }} /></div>
              <p className="text-[10px] text-[#444] mt-2">Proteína: {formatNumber(totals.protein)}g / {formatNumber(proteinTarget)}g</p>
            </div>

            {/* Water */}
            <div className="rounded-2xl bg-[#161616] border border-[#222222] p-6 card-lift">
              <div className="flex items-center gap-2 text-[var(--blue)] mb-4">
                <IconDroplet />
                <p className="text-xs font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>HIDRATAÇÃO</p>
              </div>
              <p className="font-display font-black text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
                <AnimatedNumber value={waterMl / 1000} decimals={1} suffix="L" />
              </p>
              <p className="text-[#555] text-xs mb-3">de {(waterTarget / 1000).toFixed(1)}L</p>
              <div className="progress-track"><motion.div className="progress-fill" style={{ background: 'var(--blue)' }} initial={{ width: 0 }} animate={{ width: `${waterPct}%` }} transition={{ duration: 0.8, delay: 0.4 }} /></div>
              <button onClick={() => setActiveTab('nutrition')} className="text-[10px] text-[#444] mt-2 hover:text-[#999] transition-colors flex items-center gap-1">
                Registrar na Nutrição <IconArrow />
              </button>
            </div>

            {/* Training status */}
            <div className="rounded-2xl bg-[#161616] border border-[#222222] p-6 card-lift">
              <div className="flex items-center gap-2 text-[var(--green)] mb-4">
                <IconDumbbell />
                <p className="text-xs font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>TREINO DE HOJE</p>
              </div>
              {trainingDone ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-8 h-8 rounded-full bg-[var(--green)]/15 border border-[var(--green)]/30 flex items-center justify-center text-[var(--green)] flex-shrink-0"><IconCheck /></span>
                  <div>
                    <p className="text-white font-semibold text-sm">Concluído</p>
                    <p className="text-[#555] text-xs">Bom trabalho hoje</p>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-white font-semibold text-sm mb-1">Ainda não treinou</p>
                  <p className="text-[#555] text-xs mb-3">Confira seu protocolo de hoje</p>
                  <button onClick={() => setActiveTab('training')} className="btn btn-secondary btn-sm w-full">
                    Ver treino <IconArrow />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Trend chart */}
        {chartData.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl bg-[#161616] border border-[#222222] p-6 card-lift">
            <p className="text-xs font-black uppercase tracking-widest text-[#555] mb-4" style={{ fontFamily: 'var(--font-display)' }}>EVOLUÇÃO DO SCORE</p>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#FF3B30" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#222222" vertical={false} />
                  <XAxis dataKey="date" stroke="#444" tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#444" tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: '#1B1B1B', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#999' }}
                    itemStyle={{ color: '#FF3B30' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#FF3B30" strokeWidth={2.5} fill="url(#scoreGradient)" dot={{ fill: '#FF3B30', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { id: 'training', icon: IconDumbbell, title: 'Treino', desc: 'Veja seu protocolo de hoje e registre cargas', color: 'var(--green)' },
            { id: 'nutrition', icon: IconFork, title: 'Nutrição', desc: 'Registre refeições e acompanhe macros', color: 'var(--blue)' },
            { id: 'chat', icon: IconChat, title: 'Chat com Coach', desc: 'Tire dúvidas sobre treino e dieta', color: 'var(--red)' },
          ].map(({ id, icon: Icon, title, desc, color }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="text-left rounded-2xl bg-[#161616] border border-[#222222] p-6 card-lift group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}1A`, border: `1px solid ${color}33`, color }}>
                <Icon />
              </div>
              <p className="text-white font-semibold text-sm mb-1 flex items-center justify-between">
                {title}
                <span className="text-[#444] group-hover:text-[#999] group-hover:translate-x-0.5 transition-all"><IconArrow /></span>
              </p>
              <p className="text-[#555] text-xs leading-relaxed">{desc}</p>
            </button>
          ))}
        </motion.div>
      </div>

      {showCheckIn && (
        <WeeklyCheckIn
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onClose={() => setShowCheckIn(false)}
        />
      )}
      {showEvolution && (
        <EvolutionPhotos
          profile={profile}
          onClose={() => setShowEvolution(false)}
          onStartCheckIn={() => { setShowEvolution(false); setShowCheckIn(true) }}
        />
      )}
    </div>
  )
}
