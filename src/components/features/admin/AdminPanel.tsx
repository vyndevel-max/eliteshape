// src/components/features/admin/AdminPanel.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'

interface AdminPanelProps { profile: Profile; onProfileUpdate: any }

export default function AdminPanel({ profile }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    if (profile.role !== 'admin') return
    supabase.from('profiles').select('id, name, email, is_premium, points, created_at').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setUsers(data) })
    supabase.from('system_settings').select('*').then(({ data }) => {
      if (data) setSettings(Object.fromEntries(data.map(d => [d.key, d.value])))
    })
  }, [])

  if (profile.role !== 'admin') {
    return <div className="p-8 text-[#555]">Acesso negado.</div>
  }

  const togglePremium = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_premium: !current }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !current } : u))
    toast.success('Status atualizado')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-8 py-6 border-b border-[#1C1C1C]">
        <h1 className="font-display text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>ADMIN</h1>
        <p className="text-[#555] text-sm mt-0.5">Painel de controle da plataforma</p>
      </div>
      <div className="flex-1 p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'USUÁRIOS', value: users.length },
            { label: 'PREMIUM', value: users.filter(u => u.is_premium).length },
            { label: 'GRATUITOS', value: users.filter(u => !u.is_premium).length },
            { label: 'HOJE', value: users.filter(u => u.created_at?.startsWith(new Date().toISOString().split('T')[0])).length },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl bg-[#111] border border-[#1C1C1C] p-5">
              <p className="text-xs font-black uppercase tracking-widest text-[#555] mb-1" style={{ fontFamily: 'var(--font-display)' }}>{stat.label}</p>
              <p className="font-display text-3xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-[#111] border border-[#1C1C1C] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1C1C1C]">
            <p className="text-xs font-black uppercase tracking-widest text-[#555]" style={{ fontFamily: 'var(--font-display)' }}>USUÁRIOS RECENTES</p>
          </div>
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#1C1C1C] last:border-0 hover:bg-white/[0.02] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#E8002D]/20 flex items-center justify-center text-[#E8002D] text-xs font-bold">
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.name}</p>
                <p className="text-xs text-[#444] truncate">{user.email}</p>
              </div>
              <p className="text-xs text-[#444] hidden sm:block">{user.points} pts</p>
              <button
                onClick={() => togglePremium(user.id, user.is_premium)}
                className={`text-xs font-black px-3 py-1 rounded-full transition-all ${user.is_premium ? 'bg-[#E8002D]/20 text-[#E8002D] hover:bg-[#E8002D]/30' : 'bg-[#252525] text-[#666] hover:bg-[#333]'}`}
              >
                {user.is_premium ? 'PREMIUM' : 'FREE'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
