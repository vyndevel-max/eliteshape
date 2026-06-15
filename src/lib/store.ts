// src/lib/store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/supabase'

interface AppState {
  profile: Profile | null
  activeTab: string
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>

  setProfile: (profile: Profile | null) => void
  updateProfile: (data: Partial<Profile>) => void
  setActiveTab: (tab: string) => void
  addChatMessage: (msg: { role: 'user' | 'assistant'; content: string }) => void
  clearChat: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      activeTab: 'dashboard',
      chatMessages: [],

      setProfile: (profile) => set({ profile }),
      updateProfile: (data) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...data } : null,
        })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      addChatMessage: (msg) =>
        set((state) => ({
          chatMessages: [...state.chatMessages.slice(-49), msg],
        })),
      clearChat: () => set({ chatMessages: [] }),
    }),
    {
      name: 'eliteshape-store',
      partialize: (state) => ({
        activeTab: state.activeTab,
        chatMessages: state.chatMessages,
      }),
    }
  )
)
