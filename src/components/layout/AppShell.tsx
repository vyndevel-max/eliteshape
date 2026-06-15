// src/components/layout/AppShell.tsx
'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'
import CoachPanel from '@/components/features/coach/CoachPanel'
import TrainingPanel from '@/components/features/training/TrainingPanel'
import NutritionPanel from '@/components/features/nutrition/NutritionPanel'
import ProfilePanel from '@/components/features/profile/ProfilePanel'
import RankingPanel from '@/components/features/ranking/RankingPanel'
import CommunityPanel from '@/components/features/community/CommunityPanel'
import AdminPanel from '@/components/features/admin/AdminPanel'
import OnboardingQuiz from '@/components/features/onboarding/OnboardingQuiz'
import ChatPanel from '@/components/features/chat/ChatPanel'
import DashboardPanel from '@/components/features/dashboard/DashboardPanel'

// ============================================================
// SVG NAV ICONS
// ============================================================
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const IconChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const IconBrain = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
)

const IconDumbbell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>
  </svg>
)

const IconUtensils = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
  </svg>
)

const IconTrophy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
)

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const IconCrown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 20h20L18 8l-6 8-6-8L2 20Z"/>
    <circle cx="12" cy="4" r="2"/>
    <circle cx="4" cy="10" r="2"/>
    <circle cx="20" cy="10" r="2"/>
  </svg>
)

const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
)

// ============================================================
// NAV ITEMS
// ============================================================
interface NavItem {
  id: string
  label: string
  mobileLabel?: string
  Icon: () => JSX.Element
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Hoje', Icon: IconHome },
  { id: 'coach', label: 'Diagnóstico Forge', mobileLabel: 'Diagnóstico', Icon: IconBrain },
  { id: 'chat', label: 'Forge AI', mobileLabel: 'Forge AI', Icon: IconChat },
  { id: 'training', label: 'Treino', Icon: IconDumbbell },
  { id: 'nutrition', label: 'Nutrição', Icon: IconUtensils },
  { id: 'profile', label: 'Perfil', Icon: IconUser },
  { id: 'admin', label: 'Admin', Icon: IconShield, adminOnly: true },
]

const PANELS: Record<string, React.ComponentType<any>> = {
  dashboard: DashboardPanel,
  coach: CoachPanel,
  chat: ChatPanel,
  training: TrainingPanel,
  nutrition: NutritionPanel,
  ranking: RankingPanel,
  community: CommunityPanel,
  profile: ProfilePanel,
  admin: AdminPanel,
}

interface AppShellProps {
  initialProfile: Profile | null
}

export default function AppShell({ initialProfile }: AppShellProps) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [collapsed, setCollapsed] = useState(false)
  const { activeTab, setActiveTab } = useAppStore()
  const router = useRouter()
  const supabase = createClient()

  const showOnboarding = profile && !(profile as any).onboarding_done && !profile.age

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const handleProfileUpdate = (updated: Partial<Profile>) => {
    setProfile(prev => prev ? { ...prev, ...updated } : null)
  }

  const navItems = NAV_ITEMS.filter(
    item => !item.adminOnly || profile?.role === 'admin'
  )

  const ActivePanel = PANELS[activeTab] ?? DashboardPanel

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex">
      {/* Onboarding Quiz */}
      {showOnboarding && profile && (
        <OnboardingQuiz profile={profile} onComplete={handleProfileUpdate} />
      )}
      {/* ====================================================
          SIDEBAR (desktop only)
      ==================================================== */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden lg:flex flex-shrink-0 h-screen sticky top-0 bg-[#0C0C0C] border-r border-[#222222] flex-col overflow-hidden z-20"
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-[#222222]">
          <img src="/icons/forge-logo.png" alt="FORGE" className="w-9 h-9 object-contain flex-shrink-0" />
          {!collapsed && (
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="font-display font-black text-base text-white tracking-wider uppercase leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                FORGE
              </p>
              <p className="text-[9px] forge-gradient-text tracking-[0.2em] uppercase font-bold">FORJE SUA EVOLUÇÃO</p>
            </motion.div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-[68px] -right-3 w-6 h-6 bg-[#1B1B1B] border border-[#2A2A2A] rounded-full flex items-center justify-center text-[#666] hover:text-white transition-colors z-30"
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
            <IconChevron />
          </motion.div>
        </button>

        {/* Nav Items */}
        <nav className="flex-1 p-3 pt-4 space-y-1 overflow-y-auto">
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                  isActive
                    ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                    : 'text-[#555] hover:text-[#999] hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-[#FF3B30]/10 border border-[#FF3B30]/20"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <span className="relative flex-shrink-0"><Icon /></span>
                {!collapsed && (
                  <span className="relative text-sm font-medium truncate">{label}</span>
                )}
                {isActive && !collapsed && (
                  <span className="relative ml-auto w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: Premium Banner + User */}
        <div className="p-3 space-y-3 border-t border-[#222222]">
          {!collapsed && !profile?.is_premium && (
            <div className="rounded-xl bg-gradient-to-br from-[#FF3B30]/10 to-[#6366F1]/5 border border-[#FF3B30]/20 p-4">
              <div className="flex items-center gap-1.5 text-[#FF3B30] mb-2">
                <IconCrown />
                <span className="text-[10px] font-black tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)' }}>UPGRADE</span>
              </div>
              <p className="text-[11px] text-[#666] mb-3 leading-relaxed">
                Libere o Diagnóstico Forge completo, fotos ilimitadas e receitas exclusivas.
              </p>
              <button className="w-full py-2 bg-[#FF3B30] text-white text-[11px] font-black rounded-lg hover:bg-[#CC2E26] transition-colors tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                ASSINAR R$ 49,90/mês
              </button>
            </div>
          )}

          {/* User row */}
          <div className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-[#FF3B30]/20 border border-[#FF3B30]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[#FF3B30] text-xs font-bold">
                {profile?.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{profile?.name || 'Atleta'}</p>
                <p className="text-[10px] text-[#444] uppercase tracking-widest">
                  {profile?.is_premium ? (
                    <span className="text-[#FF3B30]">Premium</span>
                  ) : 'Free'}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="text-[#444] hover:text-[#FF3B30] transition-colors"
                title="Sair"
              >
                <IconLogout />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ====================================================
          MAIN CONTENT
      ==================================================== */}
      <main className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden pb-28 lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="min-h-screen"
          >
            {profile && (
              <ActivePanel
                profile={profile}
                onProfileUpdate={handleProfileUpdate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ====================================================
          BOTTOM NAV (mobile only)
      ==================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0C0C0C] border-t border-[#222222] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch overflow-x-auto no-scrollbar">
          {navItems.map(({ id, label, mobileLabel, Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-colors relative ${
                  isActive ? 'text-[#FF3B30]' : 'text-[#555]'
                }`}
              >
                {isActive && (
                  <motion.span layoutId="mobile-nav-active" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF3B30] rounded-full" transition={{ duration: 0.2 }} />
                )}
                <Icon />
                <span className="text-[9px] font-medium leading-none text-center truncate max-w-full px-0.5">{mobileLabel || label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
