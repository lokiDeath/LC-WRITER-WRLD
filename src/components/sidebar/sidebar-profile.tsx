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
  user?: {
    id: string
    displayName: string
    email: string | null
    username?: string
  }
}

export function SidebarProfile({ onLogout, user }: SidebarProfileProps) {
  const { activeAccount } = useAccounts()
  const [showSettings, setShowSettings] = useState(false)
  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false)

  const effectiveAccount: Account | null = user
    ? { id: user.id, username: user.username || user.displayName, email: user.email || '', displayName: user.displayName, plan: 'Free' }
    : activeAccount

  if (!effectiveAccount) return null

  const initial = effectiveAccount.displayName.charAt(0).toUpperCase() || '?'

  return (
    <>
      <div className="w-full flex items-center gap-1 px-1 py-1 rounded-lg group">
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-all duration-150 ease-out min-w-0"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--surface-elevated)] to-[var(--surface-active)] flex items-center justify-center shrink-0 border border-[var(--border-default)]">
            <span className="text-[11px] font-serif text-[var(--accent)]">{initial}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] text-[var(--text-primary)] truncate font-medium leading-tight">{effectiveAccount.displayName}</p>
          </div>
          <SettingsIcon className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-all duration-150 ease-out shrink-0" />
        </button>

        <button
          onClick={() => setShowLogoutOverlay(true)}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all duration-150 ease-out shrink-0"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} activeAccount={effectiveAccount} onLogout={onLogout} />
      )}

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
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-2xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-[var(--text-primary)] font-bold text-lg mb-1">Are you sure you want to log out?</h2>
              <p className="text-sm text-[var(--text-muted)] mb-5">You will need to sign in again to continue writing.</p>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] mb-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--surface-elevated)] to-[var(--surface-active)] flex items-center justify-center border border-[var(--border-default)] shrink-0">
                  <span className="text-sm font-serif text-[var(--accent)]">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{effectiveAccount.displayName}</p>
                  {effectiveAccount.email && <p className="text-[11px] text-[var(--text-muted)] truncate">{effectiveAccount.email}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={() => { setShowLogoutOverlay(false); onLogout() }} className="w-full bg-white text-black hover:bg-zinc-200 py-2.5 text-sm font-bold rounded-lg transition-all duration-150 ease-out">Log out</button>
                <button onClick={() => setShowLogoutOverlay(false)} className="w-full bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ease-out">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
