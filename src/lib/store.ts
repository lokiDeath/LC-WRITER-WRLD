'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'ADMIN' | 'CLIENT'

export type CurrentUser = {
  id: string
  loginId: string
  displayName: string
  email: string | null
  role: Role
  voiceEnabled: boolean
  hiddenModeUnlocked: boolean
  bio: string | null
}

export type View =
  | 'home'
  | 'workspace'
  | 'aichat'
  | 'characters'
  | 'relationships'
  | 'worldbuilder'
  | 'lore'
  | 'cultivation'
  | 'magic'
  | 'timeline'
  | 'plot'
  | 'foreshadow'
  | 'contradiction'
  | 'chapters'
  | 'ideas'
  | 'analytics'
  | 'community'
  | 'trade'
  | 'hidden'
  | 'research'
  | 'uploads'
  | 'versions'
  | 'settings'
  | 'admin'
  | 'notfound'

type AppState = {
  user: CurrentUser | null
  setUser: (u: CurrentUser | null) => void

  view: View
  setView: (v: View) => void

  param: string | null
  setParam: (p: string | null) => void

  activeNovelId: string | null
  setActiveNovelId: (id: string | null) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  openGroup: string | null
  setOpenGroup: (g: string | null) => void
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),

      view: 'home',
      setView: (view) => set({ view, param: null }),

      param: null,
      setParam: (p) => set({ param: p }),

      activeNovelId: null,
      setActiveNovelId: (id) => set({ activeNovelId: id }),

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      openGroup: 'workspace',
      setOpenGroup: (g) =>
        set((s) => ({ openGroup: s.openGroup === g ? null : g })),
    }),
    {
      name: 'lc-app',
      partialize: (s) => ({
        view: s.view,
        sidebarCollapsed: s.sidebarCollapsed,
        activeNovelId: s.activeNovelId,
        openGroup: s.openGroup,
      }),
    }
  )
)
