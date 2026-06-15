// src/components/features/community/CommunityPanel.tsx
'use client'
import type { Profile } from '@/types/supabase'
const IconUsers = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>

export default function CommunityPanel({ profile }: { profile: Profile; onProfileUpdate: any }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-8 py-6 border-b border-[#1C1C1C]">
        <h1 className="font-display text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>COMUNIDADE</h1>
        <p className="text-[#555] text-sm mt-0.5">Conecte-se com outros atletas de elite</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#111] border border-[#1C1C1C] flex items-center justify-center mx-auto mb-4 text-[#333]">
            <IconUsers />
          </div>
          <p className="text-white font-semibold mb-1">Em breve</p>
          <p className="text-[#555] text-sm">Feed de transformações, challenges e rankings ao vivo</p>
        </div>
      </div>
    </div>
  )
}
