'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Settings as SettingsIcon, Sparkles, LogOut, User,
  Keyboard, Check, AlertTriangle, Plus, Camera, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAccounts, type Account } from '@/hooks/use-accounts'

type SettingsTab = 'general' | 'profile' | 'personalization' | 'keyboard'

const TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'profile', label: 'Profile & Account', icon: User },
  { id: 'personalization', label: 'Personalization', icon: Sparkles },
  { id: 'keyboard', label: 'Keyboard Shortcuts', icon: Keyboard },
]

type SettingsModalProps = {
  onClose: () => void
  activeAccount: Account
  onLogout?: () => void
  onUpdateAccount?: (updates: Partial<Account>) => void
}

export function SettingsModal({ onClose, activeAccount, onLogout, onUpdateAccount }: SettingsModalProps) {
  const { accounts, activeAccountId, switchAccount, addAccount } = useAccounts()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [name, setName] = useState(activeAccount.displayName)
  const [username, setUsername] = useState(activeAccount.username)
  const [email, setEmail] = useState(activeAccount.email)
  const [writingStatus, setWritingStatus] = useState<'Writing' | 'Editing' | 'Planning'>('Writing')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [addForm, setAddForm] = useState({ username: '', email: '', displayName: '' })

  function handleSaveAccount() {
    onUpdateAccount?.({ displayName: name, username, email })
    toast.success('Account updated.')
  }

  function handlePasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields required.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    toast.success('Password updated.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  function handleDelete() {
    toast.success('Account deletion requested.')
    setShowDeleteConfirm(false)
    onClose()
  }

  function handleAddAccount() {
    if (!addForm.username.trim() || !addForm.email.trim()) return
    addAccount({
      username: addForm.username.trim(),
      email: addForm.email.trim(),
      displayName: addForm.displayName.trim() || addForm.username.trim(),
    })
    setShowAddAccount(false)
    setAddForm({ username: '', email: '', displayName: '' })
    toast.success('Account added.')
  }

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-900 border border-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-4xl h-[640px] max-h-[88vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left sidebar — navigation */}
        <div className="w-56 shrink-0 bg-black border-r border-[#1a1a1a] flex flex-col">
          <div className="px-4 py-4 border-b border-[#1a1a1a]">
            <h2 className="text-sm font-semibold text-zinc-200">Settings</h2>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto lc-scroll">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-left',
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                )}
              >
                <tab.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12px]">{tab.label}</span>
              </button>
            ))}
          </nav>
          {/* Logout at bottom */}
          {onLogout && (
            <div className="p-2 border-t border-[#1a1a1a]">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition text-left"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12px]">Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Right content area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black">
          {/* Header */}
          <div className="h-12 flex items-center justify-between px-5 border-b border-[#1a1a1a] shrink-0">
            <h3 className="text-sm font-medium text-zinc-200">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <button onClick={onClose} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto lc-scroll p-6">
            {/* ─── GENERAL ─── */}
            {activeTab === 'general' && (
              <div className="space-y-5 max-w-md">
                <SettingRow label="Appearance">
                  <select
                    onChange={(e) => {
                      const mode = e.target.value
                      try {
                        const root = document.documentElement
                        if (mode === 'Light') {
                          root.classList.remove('dark')
                          root.classList.add('light')
                          localStorage.setItem('lc_theme', 'light')
                        } else if (mode === 'Dark') {
                          root.classList.remove('light')
                          root.classList.add('dark')
                          localStorage.setItem('lc_theme', 'dark')
                        }
                      } catch { /* ignore */ }
                    }}
                    className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                    defaultValue={typeof window !== 'undefined' && localStorage.getItem('lc_theme') === 'light' ? 'Light' : 'Dark'}
                  >
                    <option>Dark</option>
                    <option>Light</option>
                  </select>
                </SettingRow>
                <SettingRow label="App Language">
                  <select className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700">
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Français</option>
                    <option>Español</option>
                    <option>日本語</option>
                  </select>
                </SettingRow>
                <SettingRow label="Startup Behavior">
                  <select className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700">
                    <option>Open last active Hub/DM</option>
                    <option>Open last project</option>
                    <option>Open New Chat</option>
                    <option>Open Library</option>
                    <option>Show dashboard</option>
                  </select>
                </SettingRow>
                <SettingRow label="Send messages with Enter">
                  <ToggleSwitch defaultOn />
                </SettingRow>
                <SettingRow label="Auto-save documents">
                  <ToggleSwitch defaultOn />
                </SettingRow>
                <SettingRow label="Show typing indicators">
                  <ToggleSwitch defaultOn />
                </SettingRow>
                <SettingRow label="Read receipts">
                  <ToggleSwitch defaultOn />
                </SettingRow>
              </div>
            )}

            {/* ─── PROFILE & ACCOUNT ─── */}
            {activeTab === 'profile' && (
              <div className="space-y-6 max-w-lg">
                {/* Avatar upload */}
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-zinc-600">
                      <span className="text-[28px] font-serif text-red-500">{name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Camera className="w-6 h-6 text-zinc-300" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] text-zinc-200 font-medium mb-1">Profile Picture</p>
                    <p className="text-[10px] text-zinc-600 mb-2">Click the avatar to upload a new image. PNG or JPG, max 2MB.</p>
                    <button className="text-[11px] text-zinc-400 hover:text-zinc-200 border border-[#1a1a1a] px-3 py-1 rounded-md hover:bg-zinc-900 transition">
                      Upload new
                    </button>
                  </div>
                </div>

                <div className="h-px bg-[#1a1a1a]" />

                {/* Writer details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 focus:border-zinc-700 focus:outline-none rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-zinc-950 border border-[#1a1a1a] pl-7 pr-4 py-2.5 text-sm text-zinc-200 focus:border-zinc-700 focus:outline-none rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 focus:border-zinc-700 focus:outline-none rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">Writing Status</label>
                    <select
                      value={writingStatus}
                      onChange={(e) => setWritingStatus(e.target.value as 'Writing' | 'Editing' | 'Planning')}
                      className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 focus:border-zinc-700 focus:outline-none rounded-lg"
                    >
                      <option value="Writing">Writing</option>
                      <option value="Editing">Editing</option>
                      <option value="Planning">Planning</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSaveAccount}
                    className="bg-zinc-800 text-zinc-200 px-5 py-2 text-xs font-medium uppercase tracking-wider hover:bg-zinc-700 rounded-lg transition"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="h-px bg-[#1a1a1a]" />

                {/* Multi-Account Manager */}
                <div>
                  <h4 className="text-xs font-medium text-zinc-300 mb-3">Linked Accounts</h4>
                  <div className="space-y-2">
                    {accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className={cn(
                          'flex items-center gap-3 bg-zinc-950 border rounded-lg px-3 py-2.5 transition cursor-pointer',
                          acc.id === activeAccountId ? 'border-zinc-700' : 'border-[#1a1a1a] hover:border-zinc-800'
                        )}
                        onClick={() => { switchAccount(acc.id); toast.success(`Switched to ${acc.displayName}`) }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-zinc-600">
                          <span className="text-[11px] font-serif text-red-500">{acc.displayName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-zinc-200 truncate font-medium">{acc.displayName}</p>
                          <p className="text-[10px] text-zinc-600 truncate">{acc.email}</p>
                        </div>
                        {acc.id === activeAccountId && <Check className="w-4 h-4 text-zinc-400" />}
                      </div>
                    ))}
                    <button
                      onClick={() => setShowAddAccount(true)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-[#1a1a1a] rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-[12px]">Add Account</span>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-[#1a1a1a]" />

                {/* Security */}
                <div>
                  <h4 className="text-xs font-medium text-zinc-300 mb-3">Change Password</h4>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current Password"
                      className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm New Password"
                      className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                    />
                    <button
                      onClick={handlePasswordChange}
                      disabled={!currentPassword || !newPassword || !confirmPassword}
                      className="bg-zinc-800 text-zinc-200 px-5 py-2 text-xs font-medium uppercase tracking-wider hover:bg-zinc-700 rounded-lg transition disabled:opacity-50"
                    >
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="pt-4 border-t border-[#1a1a1a]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-300 font-medium">Delete account</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Permanently remove your account and all data.</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="border border-red-500/30 text-red-400 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider hover:bg-red-500/10 rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PERSONALIZATION ─── */}
            {activeTab === 'personalization' && (
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-2">Accent Theme</label>
                  <div className="flex gap-3">
                    {[
                      { name: 'Dark Purple', color: '#7c3aed' },
                      { name: 'Crimson', color: '#dc2626' },
                      { name: 'Emerald', color: '#10b981' },
                      { name: 'Midnight Blue', color: '#1e40af' },
                    ].map((theme, i) => (
                      <button
                        key={theme.name}
                        title={theme.name}
                        className={cn(
                          'w-8 h-8 rounded-full transition ring-offset-2 ring-offset-black',
                          i === 0 ? 'ring-2 ring-zinc-400' : 'opacity-60 hover:opacity-100'
                        )}
                        style={{ backgroundColor: theme.color }}
                      />
                    ))}
                  </div>
                </div>
                <SettingRow label="Editor Font Size">
                  <select className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700">
                    <option>14px</option>
                    <option>16px (default)</option>
                    <option>18px</option>
                    <option>20px</option>
                  </select>
                </SettingRow>
                <SettingRow label="Line Spacing">
                  <select className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700">
                    <option>Single</option>
                    <option>1.5 (default)</option>
                    <option>Double</option>
                  </select>
                </SettingRow>
                <SettingRow label="Editor Font Family">
                  <select className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700">
                    <option>Inter (default)</option>
                    <option>Serif</option>
                    <option>Mono</option>
                  </select>
                </SettingRow>
                <SettingRow label="Compact mode">
                  <ToggleSwitch defaultOn={false} />
                </SettingRow>
                <SettingRow label="Reduce motion">
                  <ToggleSwitch defaultOn={false} />
                </SettingRow>
              </div>
            )}

            {/* ─── KEYBOARD ─── */}
            {activeTab === 'keyboard' && (
              <div className="space-y-3 max-w-lg">
                <p className="text-[11px] text-zinc-500 mb-4">Keyboard shortcuts available across L-C. These are read-only and reflect the current keymap.</p>
                {[
                  { action: 'Send message', keys: 'Enter' },
                  { action: 'New line in message', keys: 'Shift + Enter' },
                  { action: 'Search chats', keys: 'Ctrl + K' },
                  { action: 'Toggle sidebar', keys: 'Ctrl + B' },
                  { action: 'Expand input', keys: 'Ctrl + E' },
                  { action: 'Bold (in editor)', keys: 'Ctrl + B' },
                  { action: 'Italic (in editor)', keys: 'Ctrl + I' },
                  { action: 'Underline (in editor)', keys: 'Ctrl + U' },
                  { action: 'Save document', keys: 'Ctrl + S' },
                  { action: 'Accept ghost text', keys: 'Tab' },
                  { action: 'Open Settings', keys: 'Ctrl + ,' },
                  { action: 'Switch account', keys: 'Ctrl + Shift + A' },
                ].map((shortcut) => (
                  <div key={shortcut.action} className="flex items-center justify-between bg-zinc-950 border border-[#1a1a1a] rounded-lg px-4 py-2.5">
                    <span className="text-xs text-zinc-400">{shortcut.action}</span>
                    <kbd className="text-[10px] font-mono px-2 py-1 bg-zinc-800 border border-[#1a1a1a] rounded text-zinc-300">{shortcut.keys}</kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.96 }}
                className="bg-zinc-900 border border-red-500/20 rounded-xl p-6 max-w-sm w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Delete account?</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-5">This will permanently delete your account, all projects, chats, and documents. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-zinc-800 text-zinc-400 py-2 text-xs font-medium uppercase tracking-wider hover:text-zinc-100 hover:border-zinc-600 rounded-lg transition">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-2 text-xs font-medium uppercase tracking-wider hover:bg-red-700 rounded-lg transition">Delete Forever</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Account Modal */}
        <AnimatePresence>
          {showAddAccount && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
              onClick={() => setShowAddAccount(false)}
            >
              <motion.div
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.96 }}
                className="bg-zinc-900 border border-[#1a1a1a] rounded-xl p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Add Linked Account</h3>
                  <button onClick={() => setShowAddAccount(false)} className="text-zinc-600 hover:text-zinc-300 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={addForm.displayName}
                    onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                    placeholder="Display Name"
                    className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                  />
                  <input
                    type="text"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    placeholder="Username"
                    className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                  />
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="Email"
                    className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full bg-zinc-950 border border-[#1a1a1a] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                  />
                  <button
                    onClick={handleAddAccount}
                    disabled={!addForm.username.trim() || !addForm.email.trim()}
                    className="w-full bg-purple-600 text-white py-2.5 text-sm font-medium uppercase tracking-wider hover:bg-purple-700 rounded-lg transition disabled:opacity-50"
                  >
                    Add Account
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Helpers ───
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-400">{label}</span>
      {children}
    </div>
  )
}

function ToggleSwitch({ defaultOn }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn)
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn('relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0', on ? 'bg-purple-600' : 'bg-zinc-800')}
    >
      <span className={cn('absolute top-0.5 left-0.5 bg-white rounded-full h-4 w-4 transform transition-transform duration-200', on ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  )
}
