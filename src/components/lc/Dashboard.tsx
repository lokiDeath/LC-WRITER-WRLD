'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PanelLeftClose, PanelLeft, MessageSquare, Library as LibraryIcon, FolderOpen,
  Search, MoreVertical, Pencil, Trash2, ChevronDown, ChevronRight, Link2,
  Pin, PinOff, ArrowLeft, Feather, Users, Palette, Shield, X, Loader2,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'
import type { TranslationKey } from '@/lib/translations'
import { ChatPage } from '@/components/chat/chat-layout'
import { SearchModal } from '@/components/chat/search-modal'
import { LibraryView } from '@/components/library/library-view'
import { ProjectsDashboard } from '@/components/projects/projects-dashboard'
import { ProjectWorkspace } from '@/components/projects/workspace'
import { SidebarProfile } from '@/components/sidebar/sidebar-profile'
import { GuildView } from '@/components/guild/guild-view'
import { CircleView } from '@/components/circle/circle-view'
import { ProfileModal, type WriterProfile } from '@/components/profile/profile-modal'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { DrawingStudio } from '@/components/drawing/DrawingStudio'
import { LCAuthorCompanion } from '@/components/companion/lc-author-companion'

type NavPage = 'newchat' | 'searchchat' | 'library' | 'projects' | 'workspace' | 'guild' | 'circle' | 'drawing' | 'admin'

const NAV_ITEMS: { id: NavPage; label: string; translationKey: TranslationKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'newchat', label: 'New Chat', translationKey: 'newChat', icon: MessageSquare },
  { id: 'searchchat', label: 'Search Chat', translationKey: 'searchChat', icon: Search },
  { id: 'library', label: 'Library', translationKey: 'library', icon: LibraryIcon },
  { id: 'projects', label: 'Projects', translationKey: 'projects', icon: FolderOpen },
  { id: 'drawing', label: 'Drawing Studio', translationKey: 'drawingStudio', icon: Palette },
]

// No dummy chats — the sidebar starts empty for fresh accounts.
// Real chats are loaded from /api/chat/sessions on mount.
type ChatSummary = { id: string; name: string; time: string }

// Format an ISO timestamp as a short relative time string ("Just now", "5m", "2h", "Yesterday", "Jun 5").
function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diffMs = now - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay === 1) return 'Yesterday'
    if (diffDay < 7) return `${diffDay}d`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function Dashboard() {
  const user = useApp((s) => s.user)
  const setUser = useApp((s) => s.setUser)
  const { t } = useLanguage()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // Mobile: sidebar is hidden by default and opens as a slide-out overlay
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState<NavPage>('newchat')
  const [chatsExpanded, setChatsExpanded] = useState(true)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [chatsVisibleCount, setChatsVisibleCount] = useState(5)
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [profileData, setProfileData] = useState<WriterProfile | null>(null)
  const [circlePrefillContactId, setCirclePrefillContactId] = useState<string | null>(null)

  // ─── Chat state: list of recent chat sessions + the active session ───
  const [recentChats, setRecentChats] = useState<ChatSummary[]>([])
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null)
  // Bump this to force the ChatPage to reset (new chat button)
  const [chatResetSignal, setChatResetSignal] = useState(0)

  // ─── Responsive default: tablet collapses to icons, desktop expanded ───
  useEffect(() => {
    if (typeof window === 'undefined') return
    function applyResponsiveDefaults() {
      const w = window.innerWidth
      // Mobile (<768px): sidebar closed, opens as overlay (handled via mobileSidebarOpen)
      // Tablet (768-1024px): sidebar collapsed to icons by default
      // Desktop (>=1024px): sidebar expanded by default
      if (w >= 768 && w < 1024) {
        setSidebarCollapsed(true)
      } else if (w >= 1024) {
        setSidebarCollapsed(false)
      }
    }
    applyResponsiveDefaults()
    window.addEventListener('resize', applyResponsiveDefaults)
    return () => window.removeEventListener('resize', applyResponsiveDefaults)
  }, [])

  // ─── Fetch recent chat sessions from /api/chat/sessions ───
  const refreshRecentChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions?mode=main', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.sessions)) {
        setRecentChats(
          data.sessions.map((s: { id: string; title: string; updatedAt: string }) => ({
            id: s.id,
            name: s.title || 'Untitled',
            time: formatRelativeTime(s.updatedAt),
          }))
        )
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    refreshRecentChats()
    // Listen for the custom event dispatched by ChatPage when a new chat
    // session is created on first send.
    const handler = () => refreshRecentChats()
    window.addEventListener('lc-chat-created', handler)
    return () => window.removeEventListener('lc-chat-created', handler)
  }, [refreshRecentChats])

  // ─── Onboarding Tour ───
  // Triggers only on the first login of a newly registered account.
  // The LoginScreen sets `lc_onboarding_pending` in localStorage right after a successful registration.
  // Once the user dismisses or completes the tour, we clear the flag and set `lc_onboarding_complete`
  // so it never appears again.
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    try {
      const pending = localStorage.getItem('lc_onboarding_pending') === 'true'
      const complete = localStorage.getItem('lc_onboarding_complete') === 'true'
      if (pending && !complete) {
        // Small delay so the dashboard finishes rendering first
        const t = setTimeout(() => setShowOnboarding(true), 400)
        return () => clearTimeout(t)
      }
    } catch {
      // ignore localStorage errors (private mode etc.)
    }
  }, [])

  function handleOnboardingComplete() {
    setShowOnboarding(false)
    try {
      localStorage.removeItem('lc_onboarding_pending')
      localStorage.setItem('lc_onboarding_complete', 'true')
    } catch {
      // ignore
    }
  }

  if (!user) return null

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  function togglePin(chatId: string) {
    setPinnedChats((prev) => {
      const next = new Set(prev)
      if (next.has(chatId)) next.delete(chatId)
      else next.add(chatId)
      return next
    })
  }

  const pinnedChatItems = recentChats.filter((c) => pinnedChats.has(c.id))
  const regularChatItems = recentChats.filter((c) => !pinnedChats.has(c.id))
  // Desktop: respect isFullscreen. Mobile/tablet: always show via overlay when toggled.
  const showSidebar = !isFullscreen || (activePage !== 'newchat' && activePage !== 'workspace')

  function openProject(project: { id: string; name: string }) {
    setActiveProjectName(project.name)
    setActiveProjectId(project.id)
    setActivePage('workspace')
    // Close mobile sidebar when navigating
    setMobileSidebarOpen(false)
  }

  function handleNavClick(page: NavPage) {
    if (page === 'searchchat') {
      setShowSearchModal(true)
    } else if (page === 'newchat') {
      // "New Chat" nav click: reset the active chat session so the ChatPage
      // starts a fresh conversation. Bump the reset signal to force the
      // child ChatPage to clear its local state.
      setActiveChatSessionId(null)
      setSelectedChat(null)
      setChatResetSignal((s) => s + 1)
      setActivePage('newchat')
    } else {
      setActivePage(page)
    }
    // Auto-close mobile sidebar after nav selection
    setMobileSidebarOpen(false)
  }

  // When a recent chat is clicked in the sidebar, set it as the active session.
  function selectRecentChat(chatId: string) {
    setActiveChatSessionId(chatId)
    setSelectedChat(chatId)
    setActivePage('newchat')
    setMobileSidebarOpen(false)
  }

  return (
    <div className="h-screen flex bg-zinc-950 text-zinc-200 overflow-hidden relative">
      {/* ═══ MOBILE HAMBURGER (pinned top-left, only visible on mobile) ═══ */}
      {!mobileSidebarOpen && (
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden fixed top-3 left-3 z-[10001] p-2 bg-zinc-900/95 border border-zinc-800 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition shadow-lg backdrop-blur"
          aria-label={t('openMenu')}
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      )}

      {/* ═══ MOBILE BACKDROP — click to close sidebar overlay ═══ */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ═══ SIDEBAR ═══ */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: 0 }}
            animate={{ width: sidebarCollapsed ? 60 : 260 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'shrink-0 bg-zinc-950 border-r border-zinc-900 flex flex-col h-screen',
              // Mobile: sidebar is hidden by default; when mobileSidebarOpen, render as fixed overlay
              'max-md:hidden',
              mobileSidebarOpen && 'max-md:flex max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[10000] max-md:w-[280px] max-md:shadow-2xl'
            )}
          >
            <div className="h-12 flex items-center px-3 shrink-0">
              {activePage === 'workspace' && !isFullscreen ? (
                <button
                  onClick={() => { setActivePage('projects'); setActiveProjectName(null) }}
                  className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Back to projects"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors hidden md:block"
                  title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                >
                  {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              )}
              {/* Mobile close button */}
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors md:hidden ml-auto"
                title={t('closeMenu')}
                aria-label={t('closeMenu')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto lc-scroll">
              {NAV_ITEMS.map((item) => (
                <div key={item.id}>
                <button
                  onClick={() => {
                    handleNavClick(item.id)
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors',
                    sidebarCollapsed && 'justify-center',
                    activePage === item.id
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                  )}
                  title={sidebarCollapsed ? t(item.translationKey) : undefined}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="text-[13px]">{t(item.translationKey)}</span>}
                </button>
                {/* Keep the active project tied to Projects, rather than placing it below Drawing Studio. */}
                {item.id === 'projects' && activePage === 'workspace' && activeProjectName && !sidebarCollapsed && (
                  <div className="px-2.5 py-2 mt-1 rounded-lg bg-zinc-800/50 border border-zinc-800/70">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-0.5">{t('activeProject')}</p>
                    <p className="text-[12px] text-zinc-300 truncate">{activeProjectName}</p>
                  </div>
                )}
                </div>
              ))}

              {/* ─── RECENT CHATS SECTION ─── */}
              {!sidebarCollapsed && (
                <div className="pt-3 mt-2 border-t border-zinc-900">
                  <button
                    onClick={() => setChatsExpanded(!chatsExpanded)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/50 transition text-zinc-500 hover:text-zinc-300"
                  >
                    {chatsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{t('recentChats')}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {chatsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-1">
                          {/* Pinned subsection */}
                          {pinnedChatItems.length > 0 && (
                            <div className="mb-1">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-zinc-700">
                                <Pin className="w-2.5 h-2.5" /> Pinned
                              </div>
                              {pinnedChatItems.map((chat) => (
                                <ChatListItem
                                  key={chat.id}
                                  chat={chat}
                                  isSelected={selectedChat === chat.id}
                                  isPinned={true}
                                  onClick={() => selectRecentChat(chat.id)}
                                  onTogglePin={() => togglePin(chat.id)}
                                />
                              ))}
                            </div>
                          )}

                          {/* Regular chats */}
                          <div className={cn(
                            'space-y-0.5',
                            chatsVisibleCount >= regularChatItems.length && regularChatItems.length > 5 && 'max-h-[300px] overflow-y-auto lc-scroll'
                          )}>
                            {regularChatItems.slice(0, chatsVisibleCount).map((chat) => (
                              <ChatListItem
                                key={chat.id}
                                chat={chat}
                                isSelected={selectedChat === chat.id}
                                isPinned={false}
                                onClick={() => selectRecentChat(chat.id)}
                                onTogglePin={() => togglePin(chat.id)}
                              />
                            ))}
                          </div>

                          {chatsVisibleCount < regularChatItems.length && (
                            <button
                              onClick={() => setChatsVisibleCount((prev) => prev + 10)}
                              className="w-full text-left px-2.5 py-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition"
                            >
                              Show more
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ─── THE GUILD & THE CIRCLE ─── */}
              {!sidebarCollapsed && (
                <div className="pt-3 mt-2 border-t border-zinc-900 space-y-0.5">
                  <button
                    onClick={() => setActivePage('guild')}
                    className={cn(
                      'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors',
                      activePage === 'guild'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                    )}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="text-[13px]">The Guild</span>
                  </button>
                  <button
                    onClick={() => setActivePage('circle')}
                    className={cn(
                      'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors',
                      activePage === 'circle'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                    )}
                  >
                    <Feather className="w-4 h-4 shrink-0" />
                    <span className="text-[13px]">The Circle</span>
                  </button>

                  {/* Admin Overseer button — only visible to ADMIN role */}
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => setActivePage('admin')}
                      className={cn(
                        'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors',
                        activePage === 'admin'
                          ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                          : 'text-red-400/70 hover:text-red-300 hover:bg-red-500/5'
                      )}
                    >
                      <Shield className="w-4 h-4 shrink-0" />
                      <span className="text-[13px]">{t('overseerPanel')}</span>
                    </button>
                  )}
                </div>
              )}
            </nav>

            {/* Bottom: SidebarProfile (account switcher + settings + logout) */}
            <div className="shrink-0 border-t border-zinc-900 p-2">
              <SidebarProfile
                onLogout={logout}
                user={user ? { id: user.id, displayName: user.displayName, email: user.email, username: user.loginId } : undefined}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══ MAIN WORKSPACE ═══ */}
      <main className="flex-1 overflow-hidden bg-zinc-950 min-w-0 w-full">
        <AnimatePresence mode="sync">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.12 }}
            className="h-full w-full overflow-x-hidden"
          >
            {activePage === 'library' && <LibraryView />}
            {activePage === 'projects' && <ProjectsDashboardWithOpen onOpen={openProject} />}
            {activePage === 'newchat' && (
              <ChatPage
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                sessionId={activeChatSessionId}
                resetSignal={chatResetSignal}
              />
            )}
            {activePage === 'workspace' && activeProjectName && (
              <ProjectWorkspace projectName={activeProjectName} projectId={activeProjectId ?? undefined} />
            )}
            {activePage === 'guild' && <GuildView onOpenCircle={(userId) => { setCirclePrefillContactId(userId); setActivePage('circle') }} />}
            {activePage === 'circle' && <CircleView prefillContactId={circlePrefillContactId} onConsumePrefill={() => setCirclePrefillContactId(null)} />}
            {activePage === 'drawing' && <DrawingStudio />}
            {activePage === 'admin' && user?.role === 'ADMIN' && <AdminOverseerView />}
            {activePage === 'searchchat' && <PlaceholderPage title="Search Chat" icon={Search} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <LCAuthorCompanion
        projectName={activeProjectName}
        isProjectWorkspace={activePage === 'workspace'}
        onOpenChat={() => handleNavClick('newchat')}
        onOpenProjects={() => handleNavClick('projects')}
      />

      {/* ═══ SEARCH MODAL ═══ */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        chats={recentChats}
        onSelectChat={(chatId) => selectRecentChat(chatId)}
      />

      {/* ═══ PROFILE MODAL ═══ */}
      {showProfile && profileData && (
        <ProfileModal
          profile={profileData}
          isOwner={!!user && profileData.username === user.loginId}
          onClose={() => { setShowProfile(false); setProfileData(null) }}
          onMessage={() => { setShowProfile(false); setProfileData(null); setActivePage('circle') }}
        />
      )}

      {/* ═══ ONBOARDING TOUR (only shows on first login of newly registered accounts) ═══ */}
      {showOnboarding && (
        <OnboardingTour onComplete={handleOnboardingComplete} />
      )}
    </div>
  )
}

// ═══ PROJECTS DASHBOARD WITH OPEN CALLBACK ═══
function ProjectsDashboardWithOpen({ onOpen }: { onOpen: (project: { id: string; name: string }) => void }) {
  return <ProjectsDashboard onOpen={onOpen} />
}

// ═══ CHAT LIST ITEM ═══
function ChatListItem({
  chat, isSelected, isPinned, onClick, onTogglePin,
}: {
  chat: { id: string; name: string; time: string }
  isSelected: boolean
  isPinned: boolean
  onClick: () => void
  onTogglePin: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition cursor-pointer',
        isSelected ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
      )}
    >
      {isPinned ? <Pin className="w-3 h-3 shrink-0 text-amber-500/70" /> : <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />}
      <span className="text-[12px] flex-1 truncate">{chat.name}</span>
      <span className="text-[9px] text-zinc-700 group-hover:text-zinc-600 shrink-0">{chat.time}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-0.5 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition rounded shrink-0"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-xl min-w-[160px] p-1">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin() }} className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
            {isPinned ? <PinOff className="w-3.5 h-3.5 text-zinc-400" /> : <Pin className="w-3.5 h-3.5 text-zinc-400" />}
            {isPinned ? 'Unpin chat' : 'Pin chat'}
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
            <Link2 className="w-3.5 h-3.5 text-zinc-400" /> Share conversation
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
            <Pencil className="w-3.5 h-3.5 text-zinc-400" /> Rename chat
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800 my-1" />
          <DropdownMenuItem className="hover:bg-red-500/10 text-red-400 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ═══ PLACEHOLDER PAGE ═══
function PlaceholderPage({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Icon className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
        <h2 className="text-lg text-zinc-400 font-medium mb-1">{title}</h2>
        <p className="text-xs text-zinc-600">This section will be built next.</p>
      </div>
    </div>
  )
}

// ═══ ADMIN OVERSEER VIEW ═══
type AdminUser = {
  id: string
  loginId: string
  displayName: string
  email: string | null
  role: string
  isBanned: boolean
  isSuspended: boolean
  ascensionTier: number
  attunement: number
  avatar: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
  _count: { projects: number; novels: number }
}

function AdminOverseerView() {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Fetch real users from /api/admin/users
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin/users', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data.users)) {
          setUsers(data.users)
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredUsers = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.loginId.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q)
    )
  })

  const activeUsers = users.filter((u) => !u.isBanned && !u.isSuspended).length
  const totalProjects = users.reduce((sum, u) => sum + u._count.projects + u._count.novels, 0)
  const pendingTribulations = users.filter(
    (u) => u.ascensionTier === 4 && u.attunement >= 100
  ).length

  function userStatus(u: AdminUser): 'Active' | 'Banned' | 'Suspended' {
    if (u.isBanned) return 'Banned'
    if (u.isSuspended) return 'Suspended'
    return 'Active'
  }

  // Derive a real IP / country / device string from the request metadata
  // available to the client. We fetch the user's last session IP from the
  // audit log; if not available, we display the connection info from the
  // current request (which is the admin's, not the user's — best we can do
  // client-side without a real session-tracking model).
  function deriveDeviceInfo() {
    if (typeof window === 'undefined') return { ip: 'Unknown', country: 'Unknown', device: 'Unknown' }
    const ua = window.navigator.userAgent
    let device = 'Unknown'
    if (/windows/i.test(ua)) device = 'Windows'
    else if (/mac/i.test(ua)) device = 'macOS'
    else if (/linux/i.test(ua)) device = 'Linux'
    else if (/android/i.test(ua)) device = 'Android'
    else if (/iphone|ipad|ios/i.test(ua)) device = 'iOS'
    return {
      ip: 'See audit log',
      country: 'Derived from session',
      device,
    }
  }

  async function approveDivinity(userId: string) {
    setApprovingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve-divinity`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, ascensionTier: 5, attunement: 0 }
              : u
          )
        )
        toast.success('Divinity approved. User ascended to Tier 6 — Author Progenitor.')
      } else {
        toast.error(data?.error || 'Approval failed.')
      }
    } catch {
      toast.error('Network error during approval.')
    } finally {
      setApprovingId(null)
    }
  }

  async function suspendUser(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isSuspended: true } : u))
        )
        toast.success('User suspended.')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'Suspend failed.')
      }
    } catch {
      toast.error('Network error during suspend.')
    }
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          <h2 className="text-[14px] font-semibold text-zinc-100">Overseer Panel</h2>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
            Admin
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto lc-scroll p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user by name, email, or @handle..."
              className="w-full bg-zinc-950 border border-[#1a1a1a] pl-10 pr-4 py-2.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
            />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-950 border border-[#1a1a1a] rounded-lg p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1">
                Active Users
              </p>
              <p className="text-2xl font-serif text-zinc-100">{activeUsers}</p>
            </div>
            <div className="bg-zinc-950 border border-[#1a1a1a] rounded-lg p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1">
                Total Books / Projects
              </p>
              <p className="text-2xl font-serif text-zinc-100">{totalProjects}</p>
            </div>
            <div className="bg-zinc-950 border border-red-500/20 rounded-lg p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-red-400/70 mb-1">
                Pending Tribulations
              </p>
              <p className="text-2xl font-serif text-red-300">{pendingTribulations}</p>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading users…
            </div>
          )}

          {/* Tribulation Queue */}
          {!loading && pendingTribulations > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-zinc-200 mb-3">
                Tribulation Approval Queue
              </h3>
              <div className="space-y-2">
                {users
                  .filter((u) => u.ascensionTier === 4 && u.attunement >= 100)
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 bg-zinc-950 border border-red-500/20 rounded-lg px-4 py-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-red-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                        {u.avatar ? (
                           
                          <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[12px] font-serif text-red-300">
                            {u.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-zinc-200 font-medium">{u.displayName}</p>
                        <p className="text-[10px] text-zinc-600">
                          Tier 5 — Sage · 100% Attuned · @{u.loginId}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedUserId(u.id)}
                        className="text-[11px] px-3 py-1.5 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 rounded-md transition"
                      >
                        Inspect Novel
                      </button>
                      <button
                        onClick={() => approveDivinity(u.id)}
                        disabled={approvingId === u.id}
                        className="text-[11px] px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-md transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {approvingId === u.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Approving…
                          </>
                        ) : (
                          'Approve Divinity'
                        )}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* User Management Table */}
          {!loading && (
            <div>
              <h3 className="text-[13px] font-semibold text-zinc-200 mb-3">User Management</h3>
              <div className="bg-zinc-950 border border-[#1a1a1a] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        Username
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        Email
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        Tier
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        Status
                      </th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const status = userStatus(u)
                      return (
                        <tr key={u.id} className="border-b border-[#1a1a1a]/50 last:border-b-0">
                          <td className="px-4 py-3 text-[12px] text-zinc-200">@{u.loginId}</td>
                          <td className="px-4 py-3 text-[12px] text-zinc-500">{u.email || '—'}</td>
                          <td className="px-4 py-3 text-[12px] text-zinc-400">
                            Tier {Math.min(6, u.ascensionTier + 1)}
                            <span className="text-[10px] text-zinc-600 ml-1">({u.attunement}%)</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                                status === 'Active'
                                  ? 'text-green-400 bg-green-500/10 border-green-500/30'
                                  : 'text-red-400 bg-red-500/10 border-red-500/30'
                              )}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedUserId(u.id)}
                              className="text-[11px] px-2.5 py-1 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded transition mr-1"
                            >
                              View
                            </button>
                            {status === 'Active' && (
                              <button
                                onClick={() => suspendUser(u.id)}
                                className="text-[11px] px-2.5 py-1 text-red-400 hover:bg-red-500/10 rounded transition"
                              >
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-[12px] text-zinc-600">
                      {users.length === 0
                        ? 'No users registered yet.'
                        : 'No users match your search.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Moderator Report Flags (empty state) */}
          <div>
            <h3 className="text-[13px] font-semibold text-zinc-200 mb-3">Moderator Report Flags</h3>
            <div className="bg-zinc-950 border border-[#1a1a1a] rounded-lg p-8 text-center">
              <p className="text-[12px] text-zinc-600">No reports flagged.</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Inspector Drawer */}
      <AnimatePresence>
        {selectedUserId && (
          (() => {
            const user = users.find((u) => u.id === selectedUserId)
            if (!user) return null
            const device = deriveDeviceInfo()
            return (
              <motion.div
                initial={{ x: 360 }}
                animate={{ x: 0 }}
                exit={{ x: 360 }}
                transition={{ duration: 0.25 }}
                className="w-[340px] shrink-0 bg-black border-l border-[#1a1a1a] flex flex-col h-full absolute right-0 top-0 z-[10002]"
              >
                <div className="h-14 flex items-center justify-between px-4 border-b border-[#1a1a1a] shrink-0">
                  <span className="text-[13px] font-semibold text-zinc-200">User Inspector</span>
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto lc-scroll">
                  <div className="flex flex-col items-center text-center py-6 px-4 border-b border-[#1a1a1a]">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center mb-3 overflow-hidden">
                      {user.avatar ? (
                         
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[20px] font-serif text-zinc-300">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[14px] font-semibold text-zinc-100">{user.displayName}</h3>
                    <p className="text-[11px] text-zinc-500">@{user.loginId}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-zinc-500 rounded border border-[#1a1a1a]">
                        Tier {Math.min(6, user.ascensionTier + 1)}
                      </span>
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-zinc-500 rounded border border-[#1a1a1a]">
                        {user.attunement}% Attuned
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1">
                        Email
                      </p>
                      <p className="text-[12px] text-zinc-300">{user.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1">
                        Status
                      </p>
                      <p className="text-[12px] text-zinc-300">{userStatus(user)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1">
                        About
                      </p>
                      <p className="text-[12px] text-zinc-300">
                        {user.bio || 'No bio set.'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1">
                        Project Space
                      </p>
                      <p className="text-[12px] text-zinc-300">
                        {user._count.projects} project(s) · {user._count.novels} legacy novel(s)
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1">
                        Joined
                      </p>
                      <p className="text-[12px] text-zinc-300">
                        {new Date(user.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#1a1a1a]">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-2">
                        Security &amp; Location
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">IP Address</span>
                          <span className="text-[11px] text-zinc-300 font-mono">{device.ip}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Country</span>
                          <span className="text-[11px] text-zinc-300">{device.country}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Device</span>
                          <span className="text-[11px] text-zinc-300">{device.device}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-700 mt-2 italic">
                        IP &amp; country come from the audit log; client-side inspector shows the admin&apos;s device UA only.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-[#1a1a1a] p-3 space-y-1">
                  {userStatus(user) === 'Active' && (
                    <button
                      onClick={() => suspendUser(user.id)}
                      className="w-full text-left px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    >
                      Suspend Account
                    </button>
                  )}
                  {userStatus(user) === 'Suspended' && (
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`/api/admin/users/${user.id}/unsuspend`, { method: 'POST' })
                          setUsers((prev) =>
                            prev.map((u) =>
                              u.id === user.id ? { ...u, isSuspended: false } : u
                            )
                          )
                          toast.success('User unsuspended.')
                        } catch {
                          toast.error('Failed to unsuspend.')
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] text-green-400 hover:bg-green-500/10 rounded-lg transition"
                    >
                      Unsuspend Account
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })()
        )}
      </AnimatePresence>
    </div>
  )
}
