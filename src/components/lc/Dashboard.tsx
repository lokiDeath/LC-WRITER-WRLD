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

type NavPage = 'newchat' | 'searchchat' | 'library' | 'projects' | 'workspace' | 'guild' | 'circle' | 'drawing' | 'admin'

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'newchat', label: 'New Chat', icon: MessageSquare },
  { id: 'searchchat', label: 'Search Chat', icon: Search },
  { id: 'library', label: 'Library', icon: LibraryIcon },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'drawing', label: 'Drawing Studio', icon: Palette },
]

type ChatSummary = { id: string; name: string; time: string }
type ProjectSummary = { id: string; name: string; modified: string }

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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState<NavPage>('newchat')
  const [chatsExpanded, setChatsExpanded] = useState(true)
  const [projectsExpanded, setProjectsExpanded] = useState(true)
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

  const [recentChats, setRecentChats] = useState<ChatSummary[]>([])
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null)
  const [chatResetSignal, setChatResetSignal] = useState(0)
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    function applyResponsiveDefaults() {
      const w = window.innerWidth
      if (w >= 768 && w < 1024) setSidebarCollapsed(true)
      else if (w >= 1024) setSidebarCollapsed(false)
    }
    applyResponsiveDefaults()
    window.addEventListener('resize', applyResponsiveDefaults)
    return () => window.removeEventListener('resize', applyResponsiveDefaults)
  }, [])

  const refreshRecentChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions?mode=main', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.sessions)) {
        setRecentChats(data.sessions.map((s: { id: string; title: string; updatedAt: string }) => ({ id: s.id, name: s.title || 'Untitled', time: formatRelativeTime(s.updatedAt) })))
      }
    } catch {}
  }, [])

  const refreshRecentProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.projects)) {
        setRecentProjects(data.projects.map((p: { id: string; name: string; updatedAt: string }) => ({ id: p.id, name: p.name, modified: formatRelativeTime(p.updatedAt) })))
      }
    } catch {}
  }, [])

  useEffect(() => {
    refreshRecentChats()
    refreshRecentProjects()
    const handler = () => { refreshRecentChats(); refreshRecentProjects() }
    window.addEventListener('lc-chat-created', handler)
    window.addEventListener('lc-project-created', handler)
    return () => { window.removeEventListener('lc-chat-created', handler); window.removeEventListener('lc-project-created', handler) }
  }, [refreshRecentChats, refreshRecentProjects])

  const [showOnboarding, setShowOnboarding] = useState(false)
  useEffect(() => {
    try {
      const pending = localStorage.getItem('lc_onboarding_pending') === 'true'
      const complete = localStorage.getItem('lc_onboarding_complete') === 'true'
      if (pending && !complete) { const t = setTimeout(() => setShowOnboarding(true), 400); return () => clearTimeout(t) }
    } catch {}
  }, [])

  function handleOnboardingComplete() {
    setShowOnboarding(false)
    try { localStorage.removeItem('lc_onboarding_pending'); localStorage.setItem('lc_onboarding_complete', 'true') } catch {}
  }

  if (!user) return null

  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null) }

  function togglePin(chatId: string) {
    setPinnedChats((prev) => { const next = new Set(prev); if (next.has(chatId)) next.delete(chatId); else next.add(chatId); return next })
  }

  const pinnedChatItems = recentChats.filter((c) => pinnedChats.has(c.id))
  const regularChatItems = recentChats.filter((c) => !pinnedChats.has(c.id))
  const showSidebar = !isFullscreen || (activePage !== 'newchat' && activePage !== 'workspace')

  function openProject(name: string) { setActiveProjectName(name); setActiveProjectId(null); setActivePage('workspace'); setMobileSidebarOpen(false) }
  function openProjectById(id: string, name: string) { setActiveProjectId(id); setActiveProjectName(name); setActivePage('workspace'); setMobileSidebarOpen(false) }

  function handleNavClick(page: NavPage) {
    if (page === 'searchchat') { setShowSearchModal(true) }
    else if (page === 'newchat') { setActiveChatSessionId(null); setSelectedChat(null); setChatResetSignal((s) => s + 1); setActivePage('newchat') }
    else { setActivePage(page) }
    setMobileSidebarOpen(false)
  }

  function selectRecentChat(chatId: string) { setActiveChatSessionId(chatId); setSelectedChat(chatId); setActivePage('newchat'); setMobileSidebarOpen(false) }

  return (
    <div className="h-screen flex bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden relative">
      {!mobileSidebarOpen && (
        <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden fixed top-3 left-3 z-[10001] p-2 bg-[var(--surface-card)]/95 border border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all duration-150 ease-out shadow-lg backdrop-blur" aria-label="Open menu">
          <PanelLeft className="w-5 h-5" />
        </button>
      )}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileSidebarOpen(false)} className="md:hidden fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm" />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: 0 }} animate={{ width: sidebarCollapsed ? 60 : 260 }} exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn('shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col h-screen', 'max-md:hidden', mobileSidebarOpen && 'max-md:flex max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[10000] max-md:w-[280px] max-md:shadow-2xl')}
          >
            <div className="h-12 flex items-center px-3 shrink-0">
              {activePage === 'workspace' && !isFullscreen ? (
                <button onClick={() => { setActivePage('projects'); setActiveProjectName(null); setActiveProjectId(null) }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-all duration-150 ease-out" title="Back to projects">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-all duration-150 ease-out hidden md:block" title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
                  {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              )}
              <button onClick={() => setMobileSidebarOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-all duration-150 ease-out md:hidden ml-auto" title="Close menu" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto lc-scroll">
              {NAV_ITEMS.map((item) => (
                <div key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={cn('w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 ease-out', sidebarCollapsed && 'justify-center', activePage === item.id ? 'bg-[var(--surface-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]')}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="text-[13px] font-medium">{item.label}</span>}
                  </button>

                  {item.id === 'projects' && !sidebarCollapsed && (
                    <AnimatePresence initial={false}>
                      {projectsExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden">
                          <div className="pb-1 pt-0.5 space-y-0.5">
                            {recentProjects.length === 0 ? (
                              <p className="px-2.5 py-1 text-[11px] text-[var(--text-muted)] italic">No projects yet.</p>
                            ) : (
                              recentProjects.slice(0, 10).map((proj) => (
                                <button key={proj.id} onClick={() => openProjectById(proj.id, proj.name)} className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-150 ease-out text-left group', activeProjectId === proj.id ? 'bg-[var(--surface-active)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]')} title={proj.name}>
                                  <FolderOpen className="w-3 h-3 shrink-0 opacity-60" />
                                  <span className="text-[12px] flex-1 truncate">{proj.name}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">{proj.modified}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}

              {activePage === 'workspace' && activeProjectName && !sidebarCollapsed && (
                <div className="px-2.5 py-2 mt-1 rounded-lg bg-[var(--surface-hover)]">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Active Project</p>
                  <p className="text-[12px] text-[var(--text-secondary)] truncate">{activeProjectName}</p>
                </div>
              )}

              {!sidebarCollapsed && (
                <div className="pt-3 mt-2 border-t border-[var(--border-subtle)]">
                  <button onClick={() => setChatsExpanded(!chatsExpanded)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all duration-150 ease-out text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                    {chatsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Recent Chats</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {chatsExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden">
                        <div className="pb-1">
                          {pinnedChatItems.length > 0 && (
                            <div className="mb-1">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)]"><Pin className="w-2.5 h-2.5" /> Pinned</div>
                              {pinnedChatItems.map((chat) => (<ChatListItem key={chat.id} chat={chat} isSelected={selectedChat === chat.id} isPinned={true} onClick={() => selectRecentChat(chat.id)} onTogglePin={() => togglePin(chat.id)} />))}
                            </div>
                          )}
                          <div className={cn('space-y-0.5', chatsVisibleCount >= regularChatItems.length && regularChatItems.length > 5 && 'max-h-[300px] overflow-y-auto lc-scroll')}>
                            {regularChatItems.length === 0 ? (
                              <p className="px-2.5 py-1 text-[11px] text-[var(--text-muted)] italic">No chats yet.</p>
                            ) : (
                              regularChatItems.slice(0, chatsVisibleCount).map((chat) => (<ChatListItem key={chat.id} chat={chat} isSelected={selectedChat === chat.id} isPinned={false} onClick={() => selectRecentChat(chat.id)} onTogglePin={() => togglePin(chat.id)} />))
                            )}
                          </div>
                          {chatsVisibleCount < regularChatItems.length && (
                            <button onClick={() => setChatsVisibleCount((prev) => prev + 10)} className="w-full text-left px-2.5 py-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all duration-150 ease-out">Show more</button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {!sidebarCollapsed && (
                <div className="pt-3 mt-2 border-t border-[var(--border-subtle)] space-y-0.5">
                  <button onClick={() => setActivePage('guild')} className={cn('w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 ease-out', activePage === 'guild' ? 'bg-[var(--surface-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]')}>
                    <Users className="w-4 h-4 shrink-0" /><span className="text-[13px] font-medium">The Guild</span>
                  </button>
                  <button onClick={() => setActivePage('circle')} className={cn('w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 ease-out', activePage === 'circle' ? 'bg-[var(--surface-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]')}>
                    <Feather className="w-4 h-4 shrink-0" /><span className="text-[13px] font-medium">The Circle</span>
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button onClick={() => setActivePage('admin')} className={cn('w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 ease-out', activePage === 'admin' ? 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]' : 'text-[var(--danger-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]')}>
                      <Shield className="w-4 h-4 shrink-0" /><span className="text-[13px] font-medium">Overseer Panel</span>
                    </button>
                  )}
                </div>
              )}
            </nav>

            <div className="shrink-0 border-t border-[var(--border-subtle)] p-2">
              <SidebarProfile onLogout={logout} user={user ? { id: user.id, displayName: user.displayName, email: user.email, username: user.loginId } : undefined} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-hidden bg-[var(--bg-canvas)] min-w-0 w-full">
        <AnimatePresence mode="wait">
          <motion.div key={activePage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }} className="h-full w-full overflow-x-hidden">
            {activePage === 'library' && <LibraryView />}
            {activePage === 'projects' && <ProjectsDashboardWithOpen onOpen={openProject} />}
            {activePage === 'newchat' && (<ChatPage isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)} sessionId={activeChatSessionId} resetSignal={chatResetSignal} />)}
            {activePage === 'workspace' && activeProjectName && (<ProjectWorkspace projectName={activeProjectName} projectId={activeProjectId ?? undefined} />)}
            {activePage === 'guild' && <GuildView onOpenCircle={(userId) => { setCirclePrefillContactId(userId); setActivePage('circle') }} />}
            {activePage === 'circle' && <CircleView prefillContactId={circlePrefillContactId} onConsumePrefill={() => setCirclePrefillContactId(null)} />}
            {activePage === 'drawing' && <DrawingStudio />}
            {activePage === 'admin' && user?.role === 'ADMIN' && <AdminOverseerView />}
            {activePage === 'searchchat' && <PlaceholderPage title="Search Chat" icon={Search} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} chats={recentChats} onSelectChat={(chatId) => selectRecentChat(chatId)} />

      {showProfile && profileData && (
        <ProfileModal profile={profileData} isOwner={!!user && profileData.username === user.loginId} onClose={() => { setShowProfile(false); setProfileData(null) }} onMessage={() => { setShowProfile(false); setProfileData(null); setActivePage('circle') }} />
      )}
      {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}
    </div>
  )
}

function ProjectsDashboardWithOpen({ onOpen }: { onOpen: (name: string) => void }) {
  return (
    <div className="h-full" onClick={(e) => {
      const target = e.target as HTMLElement
      const card = target.closest('[class*="cursor-pointer"]')
      if (card) { const nameEl = card.querySelector('h3'); if (nameEl) { onOpen(nameEl.textContent || 'Untitled'); try { window.dispatchEvent(new CustomEvent('lc-project-created')) } catch {} } }
    }}>
      <ProjectsDashboard />
    </div>
  )
}

function ChatListItem({ chat, isSelected, isPinned, onClick, onTogglePin }: { chat: { id: string; name: string; time: string }; isSelected: boolean; isPinned: boolean; onClick: () => void; onTogglePin: () => void }) {
  return (
    <div onClick={onClick} className={cn('group flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-150 ease-out cursor-pointer', isSelected ? 'bg-[var(--surface-active)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]')}>
      {isPinned ? <Pin className="w-3 h-3 shrink-0 text-[var(--warning)]" /> : <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />}
      <span className="text-[12px] flex-1 truncate">{chat.name}</span>
      <span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--text-muted)] shrink-0">{chat.time}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-all duration-150 ease-out rounded shrink-0"><MoreVertical className="w-3.5 h-3.5" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[var(--surface-menu)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-xl min-w-[160px] p-1">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin() }} className="hover:bg-[var(--surface-hover)] cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5 transition-all duration-150 ease-out">{isPinned ? <PinOff className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <Pin className="w-3.5 h-3.5 text-[var(--text-muted)]" />}{isPinned ? 'Unpin chat' : 'Pin chat'}</DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-[var(--surface-hover)] cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5 transition-all duration-150 ease-out"><Link2 className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Share conversation</DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-[var(--surface-hover)] cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5 transition-all duration-150 ease-out"><Pencil className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Rename chat</DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[var(--border-subtle)] my-1" />
          <DropdownMenuItem className="hover:bg-[var(--danger-bg)] text-[var(--danger)] cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5 transition-all duration-150 ease-out"><Trash2 className="w-3.5 h-3.5" /> Delete chat</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function PlaceholderPage({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Icon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
        <h2 className="text-lg text-[var(--text-secondary)] font-medium mb-1">{title}</h2>
        <p className="text-xs text-[var(--text-muted)]">This section will be built next.</p>
      </div>
    </div>
  )
}

function AdminOverseerView() {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try { const res = await fetch('/api/admin/users', { cache: 'no-store' }); if (res.ok) { const data = await res.json(); if (Array.isArray(data.users)) setUsers(data.users) } } catch {} finally { setLoading(false) }
    }
    load()
  }, [])

  const filteredUsers = users.filter((u) => (u.loginId || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()) || (u.displayName || '').toLowerCase().includes(search.toLowerCase()))
  const activeUsers = users.filter((u) => !u.isBanned && !u.isSuspended).length
  const totalProjects = users.reduce((sum, u) => sum + (u._count?.projects || 0) + (u._count?.novels || 0), 0)

  return (
    <div className="h-full flex flex-col bg-[var(--bg-canvas)] overflow-hidden">
      <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--danger)]" />
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Overseer Panel</h2>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] rounded">Admin</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto lc-scroll p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user by name, email, or @handle..." className="w-full bg-[var(--surface-card)] border border-[var(--border-subtle)] pl-10 pr-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent)] focus:outline-none rounded-lg transition-all duration-150 ease-out" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg p-4"><p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">Active Users</p><p className="text-2xl font-serif text-[var(--text-primary)]">{activeUsers}</p></div>
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg p-4"><p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">Total Books / Projects</p><p className="text-2xl font-serif text-[var(--text-primary)]">{totalProjects}</p></div>
            <div className="bg-[var(--surface-card)] border border-[var(--danger-border)] rounded-lg p-4"><p className="text-[10px] font-mono uppercase tracking-wider text-[var(--danger-muted)] mb-1">Pending Tribulations</p><p className="text-2xl font-serif text-[var(--danger)]">{users.filter((u) => u.ascensionTier === 4 && u.attunement >= 100).length}</p></div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-muted)] text-xs"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading users…</div>
          ) : (
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">User Management</h3>
              <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Username</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Email</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Tier</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                        <td className="px-4 py-3 text-[12px] text-[var(--text-primary)]">@{u.loginId}</td>
                        <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{u.email || '—'}</td>
                        <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">Tier {Math.min(6, (u.ascensionTier || 0) + 1)}</td>
                        <td className="px-4 py-3"><span className={cn('text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border', !u.isBanned && !u.isSuspended ? 'text-[var(--success)] bg-[var(--success-bg)] border-[var(--success-border)]' : 'text-[var(--danger)] bg-[var(--danger-bg)] border-[var(--danger-border)]')}>{u.isBanned ? 'Banned' : u.isSuspended ? 'Suspended' : 'Active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (<div className="p-8 text-center"><p className="text-[12px] text-[var(--text-muted)]">{users.length === 0 ? 'No users registered yet.' : 'No users match your search.'}</p></div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
