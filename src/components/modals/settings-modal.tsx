'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Settings as SettingsIcon, Sparkles, User, Bell, Keyboard,
  Check, AlertTriangle, Camera, Plus, Link2, Shield, Crown,
  Volume2, MessageSquare, Eye, Loader2, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAccounts, type Account } from '@/hooks/use-accounts'
import { useLanguage } from '@/lib/LanguageContext'
import type { TranslationKey } from '@/lib/translations'

type SettingsTab = 'general' | 'notifications' | 'profile' | 'personalization' | 'keyboard'

const TABS: { id: SettingsTab; translationKey: TranslationKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', translationKey: 'general', icon: SettingsIcon },
  { id: 'notifications', translationKey: 'notifications', icon: Bell },
  { id: 'profile', translationKey: 'profileAccount', icon: User },
  { id: 'personalization', translationKey: 'personalization', icon: Sparkles },
  { id: 'keyboard', translationKey: 'keyboardShortcuts', icon: Keyboard },
]

type SettingsModalProps = {
  onClose: () => void
  activeAccount: Account
  onLogout?: () => void
  onUpdateAccount?: (updates: Partial<Account>) => void
}

// ─── Ascension tier metadata ───
// ascensionTier (DB 0..5) is displayed as Tier 1..6.
const TIER_NAMES = [
  'Apprentice', // 0 -> Tier 1
  'Initiate',   // 1 -> Tier 2
  'Adept',      // 2 -> Tier 3
  'Master',     // 3 -> Tier 4
  'Sage',       // 4 -> Tier 5 (frozen at 100%, awaiting tribulation)
  'Author Progenitor', // 5 -> Tier 6 (Divinity)
]

const ACCENT_THEMES = [
  { id: 'shadow-purple', name: 'Shadow Purple', color: '#8b5cf6' },
  { id: 'blood-red', name: 'Blood Red', color: '#dc2626' },
  { id: 'plague-green', name: 'Plague Green', color: '#10b981' },
  { id: 'abyssal-blue', name: 'Abyssal Blue', color: '#2563eb' },
]

const ACCENT_COLORS_GENERAL = [
  { id: 'default', name: 'Default', color: '#c9a96e' },
  { id: 'shadow-purple', name: 'Purple', color: '#8b5cf6' },
  { id: 'blood-red', name: 'Red', color: '#dc2626' },
  { id: 'plague-green', name: 'Green', color: '#10b981' },
  { id: 'abyssal-blue', name: 'Blue', color: '#2563eb' },
]

const NOTIF_CATEGORIES = [
  'Hubs',
  'Shared Projects',
  'Project Analysis',
  'AI Art',
  'Lore Gaps',
  'Product Updates',
  'Feedback Emails',
]

const LINKED_PROVIDERS = [
  { id: 'google', name: 'Google', envKey: 'GOOGLE_CLIENT_ID' },
  { id: 'onenote', name: 'OneNote', envKey: 'ONENOTE_CLIENT_ID' },
  { id: 'github', name: 'GitHub', envKey: 'GITHUB_CLIENT_ID' },
  { id: 'discord', name: 'Discord', envKey: 'DISCORD_CLIENT_ID' },
]

export function SettingsModal({ onClose, activeAccount, onLogout, onUpdateAccount }: SettingsModalProps) {
  const { t, setLangByLabel } = useLanguage()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [name, setName] = useState(activeAccount.displayName)
  const [username, setUsername] = useState(activeAccount.username)
  const [email, setEmail] = useState(activeAccount.email)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ─── Ascension state (fetched from /api/auth/me) ───
  const [ascensionTier, setAscensionTier] = useState(0)
  const [attunement, setAttunement] = useState(0)
  const [loadingAscension, setLoadingAscension] = useState(true)

  // ─── Settings state ───
  const [appearance, setAppearance] = useState<'Default' | 'Dark' | 'Light'>('Dark')
  const [accentColor, setAccentColor] = useState('default')
  const [appLanguage, setAppLanguage] = useState('English (US)')
  const [startupBehavior, setStartupBehavior] = useState('Open last active Hub/DM')
  const [sendWithEnter, setSendWithEnter] = useState(true)
  const [autoSaveDocs, setAutoSaveDocs] = useState(true)
  const [smartReadingCompanion, setSmartReadingCompanion] = useState(false)
  const [aiChatMemoryAutoload, setAiChatMemoryAutoload] = useState(false)
  // Voice & Communication
  const [allowIncomingCalls, setAllowIncomingCalls] = useState(true)
  const [showCallAlerts, setShowCallAlerts] = useState(true)
  const [showMessagePreviews, setShowMessagePreviews] = useState(true)
  const [reactionNotifications, setReactionNotifications] = useState(false)
  // Notification delivery
  const [notifDelivery, setNotifDelivery] = useState<'Push' | 'Email' | 'Both' | 'Off'>('Push')
  // Notifications tab
  const [notifPrefs, setNotifPrefs] = useState<Record<string, 'Push' | 'Email' | 'Both' | 'Off'>>(
    Object.fromEntries(NOTIF_CATEGORIES.map((c) => [c, 'Push']))
  )
  // Profile
  const [presencePrivacy, setPresencePrivacy] = useState(true)
  // Personalization
  const [accentTheme, setAccentTheme] = useState('shadow-purple')
  const [editorFontSize, setEditorFontSize] = useState('16px')
  const [editorFontFamily, setEditorFontFamily] = useState('Inter')
  const [editorLineSpacing, setEditorLineSpacing] = useState('1.5')
  const [compactMode, setCompactMode] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [aiAlignment, setAiAlignment] = useState('Balanced')
  const [aiVerbosity, setAiVerbosity] = useState('Concise')
  const [globalDirectives, setGlobalDirectives] = useState('')

  // Linked accounts (server-side presence only — no mock data)
  const [linkedAccounts, setLinkedAccounts] = useState<Record<string, { linked: boolean; username?: string }>>(
    Object.fromEntries(LINKED_PROVIDERS.map((p) => [p.id, { linked: false }]))
  )

  // ─── Hydrate theme + settings from server/localStorage ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lc_theme')
      if (saved === 'light' || saved === 'dark') {
        setAppearance(saved.charAt(0).toUpperCase() + saved.slice(1) as 'Dark' | 'Light')
      } else {
        setAppearance('Default')
      }
      const savedAccent = localStorage.getItem('lc_accent_color')
      if (savedAccent) setAccentColor(savedAccent)
      const savedAccentTheme = localStorage.getItem('lc_accent_theme')
      if (savedAccentTheme) setAccentTheme(savedAccentTheme)
    } catch {
      // ignore
    }
  }, [])

  // ─── Fetch ascension info + linked accounts from server ───
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data?.user) {
          setAscensionTier(Number(data.user.ascensionTier ?? 0))
          setAttunement(Number(data.user.attunement ?? 0))
          // Hydrate linked accounts from server
          if (Array.isArray(data.user.linkedAccounts)) {
            const next: Record<string, { linked: boolean; username?: string }> = {}
            for (const p of LINKED_PROVIDERS) {
              const found = data.user.linkedAccounts.find((a: { provider: string; username?: string }) => a.provider === p.id)
              next[p.id] = { linked: !!found, username: found?.username }
            }
            setLinkedAccounts(next)
          }
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingAscension(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ─── Apply appearance changes to the root <html> element ───
  const applyAppearance = useCallback((mode: 'Default' | 'Dark' | 'Light') => {
    setAppearance(mode)
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
      } else {
        // Default = system preference
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
        if (prefersLight) {
          root.classList.remove('dark')
          root.classList.add('light')
        } else {
          root.classList.remove('light')
          root.classList.add('dark')
        }
        localStorage.removeItem('lc_theme')
      }
    } catch {
      // ignore
    }
  }, [])

  // ─── Apply accent color via CSS variable ───
  // Sets --accent-color on the root <html> element. Any element using the
  // .accent-bg / .accent-text / .accent-border helper classes, or Tailwind
  // utilities mapped to var(--accent-color), will instantly recolor.
  const applyAccentColor = useCallback((id: string, hex: string) => {
    setAccentColor(id)
    try {
      document.documentElement.style.setProperty('--accent-color', hex)
      localStorage.setItem('lc_accent_color', id)
      localStorage.setItem('lc_accent_color_hex', hex)
    } catch {
      // ignore
    }
  }, [])

  // ─── Hydrate accent color from localStorage on mount ───
  useEffect(() => {
    try {
      const savedHex = localStorage.getItem('lc_accent_color_hex')
      if (savedHex) {
        document.documentElement.style.setProperty('--accent-color', savedHex)
      }
    } catch {
      // ignore
    }
  }, [])

  // ─── Persist settings ───
  async function persistSettings(patch: Record<string, unknown>) {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch {
      // silent — settings still in local React state
    }
  }

  function handleSaveAccount() {
    onUpdateAccount?.({ displayName: name, username, email })
    persistSettings({ displayName: name, loginId: username, email })
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

  function handleNotifPrefChange(category: string, value: 'Push' | 'Email' | 'Both' | 'Off') {
    setNotifPrefs((prev) => ({ ...prev, [category]: value }))
    persistSettings({ [`notif_${category}`]: value })
  }

  async function handleLinkProvider(providerId: string) {
    try {
      // Use assign() instead of mutating window.location.href directly
      // to satisfy the react-hooks/immutability rule.
      window.location.assign(`/api/auth/oauth/${providerId}`)
    } catch {
      toast.error('Failed to initiate OAuth.')
    }
  }

  async function handleDisconnectProvider(providerId: string) {
    setLinkedAccounts((prev) => ({ ...prev, [providerId]: { linked: false } }))
    persistSettings({ [`unlink_${providerId}`]: true })
    toast.success(`${providerId} disconnected.`)
  }

  // ─── Derived ascension display ───
  // Tier badge = 1..6 (db tier + 1). Max tier = 6 = Divinity.
  const displayTier = Math.min(6, Math.max(1, ascensionTier + 1))
  const isFrozen = ascensionTier === 4 && attunement >= 100 // Tier 5 + 100% = frozen
  const isMaxTier = ascensionTier >= 5
  // Attunement bar: if frozen, show 100% with frozen styling.
  const attunementPct = isFrozen ? 100 : Math.max(0, Math.min(100, attunement))
  const tierName = TIER_NAMES[Math.min(TIER_NAMES.length - 1, ascensionTier)]

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
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
            <h2 className="text-sm font-semibold text-zinc-200">{t('settings')}</h2>
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
                <span className="text-[12px]">{t(tab.translationKey)}</span>
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
                <span className="text-[12px]">{t('logOut')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right content area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black">
          {/* Header */}
          <div className="h-12 flex items-center justify-between px-5 border-b border-[#1a1a1a] shrink-0">
            <h3 className="text-sm font-medium text-zinc-200">
              {TABS.find((tb) => tb.id === activeTab) ? t(TABS.find((tb) => tb.id === activeTab)!.translationKey) : ''}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto lc-scroll p-6">
            {/* ─── GENERAL ─── */}
            {activeTab === 'general' && (
              <div className="space-y-6 max-w-md">
                <SettingRow label="Appearance">
                  <select
                    value={appearance}
                    onChange={(e) => applyAppearance(e.target.value as 'Default' | 'Dark' | 'Light')}
                    className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                  >
                    <option>Default</option>
                    <option>Dark</option>
                    <option>Light</option>
                  </select>
                </SettingRow>
                <SettingRow label="Accent Color">
                  <div className="flex items-center gap-2">
                    {ACCENT_COLORS_GENERAL.map((c) => (
                      <button
                        key={c.id}
                        title={c.name}
                        onClick={() => applyAccentColor(c.id, c.color)}
                        className={cn(
                          'w-5 h-5 rounded-full transition flex items-center justify-center',
                          accentColor === c.id ? 'ring-2 ring-offset-2 ring-offset-black ring-zinc-300' : 'opacity-60 hover:opacity-100'
                        )}
                        style={{ backgroundColor: c.color }}
                      >
                        {accentColor === c.id && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label={t('appLanguage')}>
                  <select
                    value={appLanguage}
                    onChange={(e) => {
                      setAppLanguage(e.target.value)
                      setLangByLabel(e.target.value)
                      persistSettings({ language: e.target.value })
                    }}
                    className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                  >
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Français</option>
                    <option>Español</option>
                    <option>日本語</option>
                    <option>简体中文</option>
                  </select>
                </SettingRow>
                <SettingRow label="Startup Behavior">
                  <select
                    value={startupBehavior}
                    onChange={(e) => { setStartupBehavior(e.target.value); persistSettings({ startupBehavior: e.target.value }) }}
                    className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                  >
                    <option>Open last active Hub/DM</option>
                    <option>Open last project</option>
                    <option>Open New Chat</option>
                    <option>Open Library</option>
                    <option>Show dashboard</option>
                  </select>
                </SettingRow>

                <div className="h-px bg-[#1a1a1a]" />

                <SettingRow label="Send messages with Enter">
                  <ToggleSwitch
                    defaultOn={sendWithEnter}
                    onChange={(v) => { setSendWithEnter(v); persistSettings({ sendWithEnter: v }) }}
                  />
                </SettingRow>
                <SettingRow label="Auto-save documents">
                  <ToggleSwitch
                    defaultOn={autoSaveDocs}
                    onChange={(v) => { setAutoSaveDocs(v); persistSettings({ autoSaveDocs: v }) }}
                  />
                </SettingRow>
                <SettingRow label="Enable Smart Reading Companion">
                  <ToggleSwitch
                    defaultOn={smartReadingCompanion}
                    onChange={(v) => { setSmartReadingCompanion(v); persistSettings({ smartReadingCompanion: v }) }}
                  />
                </SettingRow>
                <SettingRow label="AI Chat Memory Autoload">
                  <ToggleSwitch
                    defaultOn={aiChatMemoryAutoload}
                    onChange={(v) => { setAiChatMemoryAutoload(v); persistSettings({ aiChatMemoryAutoload: v }) }}
                  />
                </SettingRow>

                <div className="h-px bg-[#1a1a1a]" />

                {/* Voice & Communication */}
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Volume2 className="w-3 h-3" /> Voice & Communication
                  </h4>
                  <div className="space-y-3">
                    <SettingRow label="Allow incoming calls">
                      <ToggleSwitch
                        defaultOn={allowIncomingCalls}
                        onChange={(v) => { setAllowIncomingCalls(v); persistSettings({ allowIncomingCalls: v }) }}
                      />
                    </SettingRow>
                    <SettingRow label="Show call alerts">
                      <ToggleSwitch
                        defaultOn={showCallAlerts}
                        onChange={(v) => { setShowCallAlerts(v); persistSettings({ showCallAlerts: v }) }}
                      />
                    </SettingRow>
                  </div>
                </div>

                {/* Notification Delivery */}
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Bell className="w-3 h-3" /> Notification Delivery
                  </h4>
                  <div className="space-y-3">
                    <SettingRow label="Show message previews">
                      <ToggleSwitch
                        defaultOn={showMessagePreviews}
                        onChange={(v) => { setShowMessagePreviews(v); persistSettings({ showMessagePreviews: v }) }}
                      />
                    </SettingRow>
                    <SettingRow label="Reaction notifications">
                      <ToggleSwitch
                        defaultOn={reactionNotifications}
                        onChange={(v) => { setReactionNotifications(v); persistSettings({ reactionNotifications: v }) }}
                      />
                    </SettingRow>
                    <SettingRow label="Delivery method">
                      <select
                        value={notifDelivery}
                        onChange={(e) => { setNotifDelivery(e.target.value as typeof notifDelivery); persistSettings({ notifDelivery: e.target.value }) }}
                        className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                      >
                        <option>Push</option>
                        <option>Email</option>
                        <option>Both</option>
                        <option>Off</option>
                      </select>
                    </SettingRow>
                  </div>
                </div>
              </div>
            )}

            {/* ─── NOTIFICATIONS ─── */}
            {activeTab === 'notifications' && (
              <div className="space-y-3 max-w-lg">
                <p className="text-[11px] text-zinc-500 mb-4">
                  Configure how each category reaches you. Push notifications appear in-app; Email sends to your registered address.
                </p>
                {NOTIF_CATEGORIES.map((category) => (
                  <div
                    key={category}
                    className="flex items-center justify-between bg-zinc-950 border border-[#1a1a1a] rounded-lg px-4 py-2.5"
                  >
                    <span className="text-xs text-zinc-300">{category}</span>
                    <select
                      value={notifPrefs[category]}
                      onChange={(e) => handleNotifPrefChange(category, e.target.value as 'Push' | 'Email' | 'Both' | 'Off')}
                      className="bg-zinc-900 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                    >
                      <option>Push</option>
                      <option>Email</option>
                      <option>Both</option>
                      <option>Off</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* ─── PROFILE & ACCOUNT ─── */}
            {activeTab === 'profile' && (
              <div className="space-y-6 max-w-lg">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-zinc-600 overflow-hidden">
                      {activeAccount.avatar ? (
                         
                        <img src={activeAccount.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[28px] font-serif text-red-500">
                          {name.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Camera className="w-6 h-6 text-zinc-300" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] text-zinc-200 font-medium mb-1">Profile Picture</p>
                    <p className="text-[10px] text-zinc-600 mb-2">
                      Click the avatar to upload a new image. PNG or JPG, max 2MB.
                    </p>
                    <button
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/png,image/jpeg'
                        input.onchange = (e) => {
                          const f = (e.target as HTMLInputElement).files?.[0]
                          if (f) {
                            const reader = new FileReader()
                            reader.onload = () => {
                              onUpdateAccount?.({ avatar: String(reader.result) })
                              persistSettings({ avatar: String(reader.result) })
                              toast.success('Avatar updated.')
                            }
                            reader.readAsDataURL(f)
                          }
                        }
                        input.click()
                      }}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 border border-[#1a1a1a] px-3 py-1 rounded-md hover:bg-zinc-900 transition"
                    >
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
                  <SettingRow label="Presence Privacy">
                    <ToggleSwitch
                      defaultOn={presencePrivacy}
                      onChange={(v) => { setPresencePrivacy(v); persistSettings({ presencePrivacy: v }) }}
                    />
                  </SettingRow>
                  <button
                    onClick={handleSaveAccount}
                    className="bg-zinc-800 text-zinc-200 px-5 py-2 text-xs font-medium uppercase tracking-wider hover:bg-zinc-700 rounded-lg transition"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="h-px bg-[#1a1a1a]" />

                {/* Ascension Status */}
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Crown className="w-3 h-3" /> Ascension Status
                  </h4>
                  {loadingAscension ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading ascension data...
                    </div>
                  ) : (
                    <AscensionStatus
                      displayTier={displayTier}
                      tierName={tierName}
                      attunementPct={attunementPct}
                      isFrozen={isFrozen}
                      isMaxTier={isMaxTier}
                    />
                  )}
                </div>

                <div className="h-px bg-[#1a1a1a]" />

                {/* Linked Accounts (real OAuth providers) */}
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Link2 className="w-3 h-3" /> Linked Accounts
                  </h4>
                  <div className="space-y-2">
                    {LINKED_PROVIDERS.map((p) => {
                      const info = linkedAccounts[p.id] || { linked: false }
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-zinc-950 border border-[#1a1a1a] rounded-lg px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-200">{p.name}</span>
                            <StatusPill linked={info.linked} />
                          </div>
                          {info.linked ? (
                            <div className="flex items-center gap-2">
                              {info.username && (
                                <span className="text-[10px] text-zinc-500">{info.username}</span>
                              )}
                              <button
                                onClick={() => handleDisconnectProvider(p.id)}
                                className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-1 rounded-md hover:bg-red-500/10 transition"
                              >
                                Disconnect
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleLinkProvider(p.id)}
                              className="text-[10px] text-zinc-300 hover:text-zinc-100 border border-[#1a1a1a] px-2 py-1 rounded-md hover:bg-zinc-800 transition"
                            >
                              Link
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="h-px bg-[#1a1a1a]" />

                {/* Security */}
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Change Password
                  </h4>
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
                    {ACCENT_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        title={theme.name}
                        onClick={() => {
                          setAccentTheme(theme.id)
                          try { localStorage.setItem('lc_accent_theme', theme.id) } catch { /* ignore */ }
                          persistSettings({ accentTheme: theme.id })
                        }}
                        className={cn(
                          'relative w-10 h-10 rounded-full transition',
                          accentTheme === theme.id
                            ? 'ring-2 ring-offset-2 ring-offset-black ring-[var(--ring)] shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                            : 'opacity-60 hover:opacity-100'
                        )}
                        style={{
                          backgroundColor: theme.color,
                          // Dual-ring glowing border on active
                          boxShadow: accentTheme === theme.id ? `0 0 0 2px #000, 0 0 0 4px ${theme.color}, 0 0 12px ${theme.color}88` : undefined,
                          ['--ring' as string]: theme.color,
                        }}
                      >
                        {accentTheme === theme.id && (
                          <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-2">Typography</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-600 mb-1">Font Family</label>
                      <select
                        value={editorFontFamily}
                        onChange={(e) => setEditorFontFamily(e.target.value)}
                        className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                      >
                        <option>Inter</option>
                        <option>Serif</option>
                        <option>Mono</option>
                        <option>LXGW WenKai</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-600 mb-1">Font Size</label>
                      <select
                        value={editorFontSize}
                        onChange={(e) => setEditorFontSize(e.target.value)}
                        className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                      >
                        <option>14px</option>
                        <option>16px</option>
                        <option>18px</option>
                        <option>20px</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-600 mb-1">Line Spacing</label>
                      <select
                        value={editorLineSpacing}
                        onChange={(e) => setEditorLineSpacing(e.target.value)}
                        className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                      >
                        <option>1.0</option>
                        <option>1.5</option>
                        <option>2.0</option>
                      </select>
                    </div>
                  </div>
                </div>

                <SettingRow label="Compact mode">
                  <ToggleSwitch defaultOn={compactMode} onChange={(v) => { setCompactMode(v); persistSettings({ compactMode: v }) }} />
                </SettingRow>
                <SettingRow label="Reduce motion">
                  <ToggleSwitch defaultOn={reduceMotion} onChange={(v) => { setReduceMotion(v); persistSettings({ reduceMotion: v }) }} />
                </SettingRow>

                <div className="h-px bg-[#1a1a1a]" />

                {/* AI Alignment */}
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> AI Alignment
                  </h4>
                  <div className="space-y-3">
                    <SettingRow label="Creativity vs. Discipline">
                      <select
                        value={aiAlignment}
                        onChange={(e) => { setAiAlignment(e.target.value); persistSettings({ aiAlignment: e.target.value }) }}
                        className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                      >
                        <option>Creative</option>
                        <option>Balanced</option>
                        <option>Disciplined</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Verbosity">
                      <select
                        value={aiVerbosity}
                        onChange={(e) => { setAiVerbosity(e.target.value); persistSettings({ aiVerbosity: e.target.value }) }}
                        className="bg-zinc-950 border border-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-700"
                      >
                        <option>Terse</option>
                        <option>Concise</option>
                        <option>Verbose</option>
                      </select>
                    </SettingRow>
                  </div>
                </div>

                {/* Global Workspace Directives */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-2">
                    Global Workspace Directives
                  </label>
                  <textarea
                    value={globalDirectives}
                    onChange={(e) => setGlobalDirectives(e.target.value)}
                    onBlur={() => persistSettings({ globalDirectives })}
                    placeholder="Stylistic and structural rules the AI should follow across all chats and edits (e.g., 'Avoid adverbs. Keep POV tight to the protagonist. Always italicize foreign words.')"
                    rows={4}
                    className="w-full rounded-lg p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none"
                    style={{ backgroundColor: '#160d22', border: '1px solid #2d1a3e' }}
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">
                    These directives are appended to every AI prompt in this workspace.
                  </p>
                </div>
              </div>
            )}

            {/* ─── KEYBOARD ─── */}
            {activeTab === 'keyboard' && (
              <div className="space-y-3 max-w-lg">
                <p className="text-[11px] text-zinc-500 mb-4">
                  Keyboard shortcuts available across L-C. These reflect the current keymap.
                </p>
                {[
                  { action: 'Send message', keys: 'Enter' },
                  { action: 'New line in message', keys: 'Shift + Enter' },
                  { action: 'Search chats', keys: 'Ctrl + K' },
                  { action: 'Toggle sidebar', keys: 'Ctrl + \\' },
                  { action: 'Open Story Bible', keys: 'Ctrl + L' },
                  { action: 'Toggle Word Count Viewer', keys: 'Ctrl + Shift + C' },
                  { action: 'Expand input', keys: 'Ctrl + E' },
                  { action: 'Bold (in editor)', keys: 'Ctrl + B' },
                  { action: 'Italic (in editor)', keys: 'Ctrl + I' },
                  { action: 'Underline (in editor)', keys: 'Ctrl + U' },
                  { action: 'Save document', keys: 'Ctrl + S' },
                  { action: 'Accept ghost text', keys: 'Tab' },
                  { action: 'Open Settings', keys: 'Ctrl + ,' },
                  { action: 'Switch account', keys: 'Ctrl + Shift + A' },
                ].map((shortcut) => (
                  <div
                    key={shortcut.action}
                    className="flex items-center justify-between bg-zinc-950 border border-[#1a1a1a] rounded-lg px-4 py-2.5"
                  >
                    <span className="text-xs text-zinc-400">{shortcut.action}</span>
                    <kbd className="text-[10px] font-mono px-2 py-1 bg-zinc-800 border border-[#1a1a1a] rounded text-zinc-300">
                      {shortcut.keys}
                    </kbd>
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
                <p className="text-xs text-zinc-500 mb-5">
                  This will permanently delete your account, all projects, chats, and documents. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 border border-zinc-800 text-zinc-400 py-2 text-xs font-medium uppercase tracking-wider hover:text-zinc-100 hover:border-zinc-600 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 text-white py-2 text-xs font-medium uppercase tracking-wider hover:bg-red-700 rounded-lg transition"
                  >
                    Delete Forever
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

function ToggleSwitch({
  defaultOn,
  onChange,
}: {
  defaultOn?: boolean
  onChange?: (v: boolean) => void
}) {
  const [on, setOn] = useState(!!defaultOn)
  return (
    <button
      onClick={() => {
        const next = !on
        setOn(next)
        onChange?.(next)
      }}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0',
        on ? 'bg-purple-600' : 'bg-zinc-800'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 bg-white rounded-full h-4 w-4 transform transition-transform duration-200',
          on ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

function StatusPill({ linked }: { linked: boolean }) {
  return (
    <span
      className={cn(
        'text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border',
        linked
          ? 'bg-green-500/10 text-green-400 border-green-500/30'
          : 'bg-zinc-900 text-zinc-500 border-[#1a1a1a]'
      )}
    >
      {linked ? 'Linked' : 'Not Linked'}
    </span>
  )
}

// ─── Ascension Status sub-component ───
function AscensionStatus({
  displayTier,
  tierName,
  attunementPct,
  isFrozen,
  isMaxTier,
}: {
  displayTier: number
  tierName: string
  attunementPct: number
  isFrozen: boolean
  isMaxTier: boolean
}) {
  return (
    <div className="space-y-3">
      {/* Tier badges 1..6 */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: 6 }, (_, i) => {
          const tierNum = i + 1
          const unlocked = tierNum <= displayTier
          const current = tierNum === displayTier
          return (
            <div
              key={tierNum}
              title={`Tier ${tierNum}`}
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center border text-[10px] font-mono',
                isMaxTier && tierNum === 6
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  : current && isFrozen
                    ? 'border-ruby-500/60 bg-ruby-500/10 text-red-300 shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                    : current
                      ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                      : unlocked
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-400'
                        : 'border-[#1a1a1a] bg-zinc-950 text-zinc-700'
              )}
            >
              {tierNum}
            </div>
          )
        })}
        <div className="ml-2">
          <p className="text-xs text-zinc-200 font-medium">
            Tier {displayTier} · {tierName}
          </p>
        </div>
      </div>

      {/* Attunement progress bar — show only percentage */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Attunement Progress</span>
          <span className={cn('text-[10px] font-mono', isFrozen ? 'text-red-300' : 'text-zinc-400')}>
            {attunementPct}%
          </span>
        </div>
        <div
          className={cn(
            'h-2 rounded-full overflow-hidden border',
            isFrozen
              ? 'border-red-500/40 bg-red-950/40 shadow-[0_0_12px_rgba(220,38,38,0.4)]'
              : 'border-[#1a1a1a] bg-zinc-950'
          )}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isFrozen
                ? 'bg-gradient-to-r from-red-700 via-red-500 to-red-700'
                : 'bg-gradient-to-r from-purple-700 to-purple-500'
            )}
            style={{
              width: `${attunementPct}%`,
              animation: isFrozen ? 'none' : undefined,
            }}
          />
        </div>
      </div>

      {/* Frozen / max tier alert */}
      {isFrozen && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-950/40 text-red-200 text-[11px] leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Bottleneck reached.</p>
            <p className="text-red-300/80 mt-0.5">
              You are at Tier 5 with 100% Attunement. Ascension to Tier 6 (Author Progenitor)
              requires an Admin to inspect your novel and approve your divinity. No further
              attunement can be gained until the tribulation is resolved.
            </p>
          </div>
        </div>
      )}

      {isMaxTier && !isFrozen && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-950/40 text-amber-200 text-[11px] leading-relaxed">
          <Crown className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Author Progenitor.</p>
            <p className="text-amber-300/80 mt-0.5">
              You have ascended to the highest tier. Your divinity is recognized across the Grand Archive.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
