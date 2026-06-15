// src/components/features/ranking/RankingPanel.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'

interface RankingEntry { id: string; name: string; points: number; is_premium: boolean; rank: number }

const IconTrophy = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>

const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#B45309']

export default function RankingPanel({ profile }: { profile: Profile; onProfileUpdate: any }) {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('profiles').select('id, name, points, is_premium')
      .order('points', { ascending: false }).limit(50)
      .then(({ data }) => {
        if (data) setRanking(data.map((d, i) => ({ ...d, rank: i + 1 })))
      })
  }, [])

  const myRank = ranking.findIndex(r => r.id === profile.id) + 1

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-8 py-6 border-b border-[#1C1C1C]">
        <h1 className="font-display text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>RANKING ELITE</h1>
        <p className="text-[#555] text-sm mt-0.5">Os atletas mais dedicados da plataforma</p>
      </div>
      <div className="flex-1 p-8">
        {myRank > 0 && (
          <div className="rounded-2xl bg-[#E8002D]/10 border border-[#E8002D]/20 p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-[#E8002D] uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--font-display)' }}>SUA POSIÇÃO</p>
              <p className="text-white font-semibold">{profile.name}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-4xl font-black text-[#E8002D]" style={{ fontFamily: 'var(--font-display)' }}>#{myRank}</p>
              <p className="text-xs text-[#555]">{profile.points} pts</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-[#111] border border-[#1C1C1C] overflow-hidden">
          {ranking.length === 0 && (
            <div className="text-center py-16 text-[#444]">
              <IconTrophy />
              <p className="text-sm mt-2">Nenhum atleta no ranking ainda</p>
            </div>
          )}
          {ranking.map((entry, i) => (
            <div key={entry.id}
              className={`flex items-center gap-4 px-6 py-4 border-b border-[#1C1C1C] last:border-0 transition-colors ${entry.id === profile.id ? 'bg-[#E8002D]/5' : 'hover:bg-white/[0.02]'}`}>
              <div className="w-8 text-center">
                {i < 3 ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={MEDAL_COLORS[i]}>
                    <path d="M2 20h20L18 8l-6 8-6-8L2 20ZM12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                  </svg>
                ) : (
                  <span className="text-sm font-mono text-[#444]">#{entry.rank}</span>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-[#E8002D]/20 border border-[#E8002D]/30 flex items-center justify-center text-[#E8002D] text-xs font-bold flex-shrink-0">
                {entry.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                {entry.is_premium && <span className="text-[9px] text-[#E8002D] uppercase tracking-widest">Premium</span>}
              </div>
              <p className="font-display font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>{entry.points}</p>
              <p className="text-xs text-[#444]">pts</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
