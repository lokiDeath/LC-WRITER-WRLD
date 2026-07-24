'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccounts, type Account } from '@/hooks/use-accounts'
import { SettingsModal } from '@/components/modals/settings-modal'

type SidebarProfileProps = {
  onLogout: () => void
  // Optional: hydrated from the real /api/auth/me user. Falls back to useAccounts().
  user?: {
    id: string
    displayName: string
    email: string | null
    username?: string
  }
}

/**
 * Sidebar profile pill.
 *
 * - Bottom-left: avatar + username only (no "Free plan" subtext)
 * - Hover highlight + settings cog icon
 * - Logout icon -> opens confirmation overlay
 */
export function SidebarProfile({ onLogout, user }: SidebarProfileProps) {
  const { activeAccount } = useAccounts()
  const [showSettings, setShowSettings] = useState(false)
  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false)

  // Prefer the real user from the API; fall back to the local account switcher.
  const effectiveAccount: Account | null = user
    ? {
        id: user.id,
        username: user.username || user.displayName,
        email: user.email || '',
        displayName: user.displayName,
        plan: 'Free',
      }
    : activeAccount

  if (!effectiveAccount) return null

  const initial = effectiveAccount.displayName.charAt(0).toUpperCase() || '?'

  return (
    <>
      <div className="w-full flex items-center gap-1 px-1 py-1 rounded-lg group">
        {/* Profile pill (opens settings) */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-zinc-800/80 transition-colors min-w-0"
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center shrink-0 border border-zinc-600">
            <span className="text-[11px] font-serif text-red-500">{initial}</span>
          </div>
          {/* Name */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] text-zinc-200 truncate font-medium leading-tight">
              {effectiveAccount.displayName}
            </p>
          </div>
          {/* Settings icon */}
          <SettingsIcon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition shrink-0" />
        </button>

        {/* Logout icon */}
        <button
          onClick={() => setShowLogoutOverlay(true)}
          className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Centralized settings modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          activeAccount={effectiveAccount}
          onLogout={onLogout}
        />
      )}

      {/* Logout confirmation overlay — high contrast per spec */}
      <AnimatePresence>
        {showLogoutOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={() => setShowLogoutOverlay(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="lc-logout-dialog bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-zinc-100 font-bold text-lg mb-1">
                Are you sure you want to log out?
              </h2>
              <p className="text-sm text-zinc-400 mb-5">
                You will need to sign in again to continue writing.
              </p>

              {/* User preview */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 border border-zinc-700 mb-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-zinc-600 shrink-0">
                  <span className="text-sm font-serif text-red-500">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {effectiveAccount.displayName}
                  </p>
                  {effectiveAccount.email && (
                    <p className="text-[11px] text-zinc-400 truncate">{effectiveAccount.email}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowLogoutOverlay(false)
                    onLogout()
                  }}
                  className="w-full bg-white text-black hover:bg-zinc-200 py-2.5 text-sm font-bold rounded-lg transition"
                >
                  Log out
                </button>
                <button
                  onClick={() => setShowLogoutOverlay(false)}
                  className="w-full bg-transparent border border-zinc-600 text-zinc-300 hover:bg-zinc-800 py-2.5 text-sm font-medium rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
