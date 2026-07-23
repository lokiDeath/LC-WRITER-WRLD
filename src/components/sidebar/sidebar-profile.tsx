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
          className="flex-1 flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-bg-hover transition-colors min-w-0"
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-elevated flex items-center justify-center shrink-0 border border-b-default">
            <span className="text-[11px] font-serif text-accent-color">{initial}</span>
          </div>
          {/* Name */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] text-t-primary truncate font-medium leading-tight">
              {effectiveAccount.displayName}
            </p>
          </div>
          {/* Settings icon */}
          <SettingsIcon className="w-3.5 h-3.5 text-t-muted group-hover:text-t-secondary transition shrink-0" />
        </button>

        {/* Logout icon */}
        <button
          onClick={() => setShowLogoutOverlay(true)}
          className="p-1.5 rounded-md text-t-muted hover:text-danger hover:bg-danger-soft transition-colors shrink-0"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop-overlay)] backdrop-blur-md p-4"
            onClick={() => setShowLogoutOverlay(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="bg-dialog border border-b-subtle rounded-xl p-6 shadow-pop w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-t-primary font-bold text-lg mb-1">
                Are you sure you want to log out?
              </h2>
              <p className="text-sm text-t-secondary mb-5">
                You will need to sign in again to continue writing.
              </p>

              {/* User preview */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-elevated border border-b-subtle mb-5">
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-b-default shrink-0">
                  <span className="text-sm font-serif text-accent-color">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-t-primary truncate">
                    {effectiveAccount.displayName}
                  </p>
                  {effectiveAccount.email && (
                    <p className="text-[11px] text-t-secondary truncate">{effectiveAccount.email}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowLogoutOverlay(false)
                    onLogout()
                  }}
                  className="btn-accent w-full py-2.5 text-sm font-bold rounded-lg"
                >
                  Log out
                </button>
                <button
                  onClick={() => setShowLogoutOverlay(false)}
                  className="w-full bg-transparent border border-b-default text-t-secondary hover:bg-bg-hover hover:text-t-primary py-2.5 text-sm font-medium rounded-lg transition"
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
