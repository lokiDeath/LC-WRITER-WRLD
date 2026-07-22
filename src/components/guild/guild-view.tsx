'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Feather, Send, Plus, Search, MoreVertical, X, ChevronDown,
  Paperclip, Smile, Mic, ImageIcon, Expand, Minimize2,
  Reply, Copy, Forward, Star, Trash2, Flag, UserPlus, MessageCircle,
  Pin, Bell, BellOff, CheckCheck, BookmarkPlus, Settings, LogOut,
  Image as ImageIconLucide, FileText, Gift,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───
type Role = 'Guild Master' | 'Scribe' | 'Herald' | 'Inquisitor' | 'Apprentice'

type Writer = {
  id: string
  displayName: string
  username: string
  avatarInitial: string
  role: Role
  writingStatus: 'Writing' | 'Editing' | 'Planning'
  bio: string
  joinedDate: string
  favoriteGenres: string[]
  currentProject?: string
  publicProjects?: string[]
  socialLinks?: { label: string; url: string }[]
  dailyWords?: number
  dailyGoal?: number
}

type Reaction = { emoji: string; count: number; reacted: boolean }

type ChatMessage = {
  id: string
  authorId: string
  content: string
  timestamp: string
  date: string
  reactions?: Reaction[]
  starred?: boolean
  replyTo?: { id: string; authorName: string; snippet: string }
  attachment?: { type: 'image' | 'gif' | 'file'; name: string; url?: string }
}

type HubMessage = ChatMessage & { systemLog?: boolean }

type Hub = {
  id: string
  name: string
  avatarInitial: string
  isTheHub?: boolean
  lastMessage: string
  lastSender: string
  lastTime: string
  unread: number
  muted?: boolean
  pinned?: boolean
  favorited?: boolean
  messages: HubMessage[]
}

// ─── Current user placeholder (populated from session) ───
const CURRENT_USER: Writer = {
  id: 'me',
  displayName: 'You',
  username: 'you',
  avatarInitial: 'Y',
  role: 'Apprentice',
  writingStatus: 'Writing',
  bio: '',
  joinedDate: '',
  favoriteGenres: [],
  dailyWords: 0,
  dailyGoal: 1000,
}

// Empty writers map — no mock users. Real users come from the API.
const WRITERS: Record<string, Writer> = { me: CURRENT_USER }

// Empty initial hubs — no mock chat rooms. Real hubs come from /api/guild/hubs.
const INITIAL_HUBS: Hub[] = []

// ─── Quick reactions ───
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

// ─── Small reusable Emoji set ───
const EMOJI_SET = [
  '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😇','🙂','🙃','😋','😜',
  '🤔','🤨','😐','😶','😏','😒','🙄','😬','😢','😭','😤','😠','🤬','🥺','😱','😨',
  '💀','👻','🤡','🔥','✨','⭐','🌟','💫','⚡','💥','🎯','📖','✍️','🖋️','📝','📚',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💘',
]

type GuildViewProps = {
  onOpenCircle?: (userId: string) => void
}

export function GuildView({ onOpenCircle }: GuildViewProps) {
  const [hubs, setHubs] = useState<Hub[]>(INITIAL_HUBS)
  const [activeHubId, setActiveHubId] = useState<string>('the-hub')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'hubs'>('all')
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false)
  const [rowMenuHubId, setRowMenuHubId] = useState<string | null>(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false)
  const [headerSearchQuery, setHeaderSearchQuery] = useState('')
  const [showLoreBoard, setShowLoreBoard] = useState(false)

  // Writer Info drawer
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null)

  // Message hover & menu
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null)

  // Reply state
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; snippet: string } | null>(null)

  // Input state
  const [input, setInput] = useState('')
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'gif' | 'stickers'>('emoji')
  const [emojiSearch, setEmojiSearch] = useState('')
  const [stickerSearch, setStickerSearch] = useState('')
  const [customStickers, setCustomStickers] = useState<string[]>([])
  const [lineCount, setLineCount] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stickerInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeHub = hubs.find((h) => h.id === activeHubId)

  const filteredHubs = useMemo(() => {
    return hubs
      .filter((h) => h.name.toLowerCase().includes(search.toLowerCase()))
      .filter((h) => (filter === 'hubs' ? !h.isTheHub || true : true))
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return 0
      })
  }, [hubs, search, filter])

  // Filtered messages for header search
  const filteredMessages = useMemo(() => {
    if (!activeHub || !headerSearchQuery.trim()) return activeHub?.messages || []
    return activeHub.messages.filter((m) => m.content.toLowerCase().includes(headerSearchQuery.toLowerCase()))
  }, [activeHub, headerSearchQuery])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [activeHubId, activeHub?.messages.length])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInput(val)
    // Count lines based on newlines + wrapping estimate
    const lines = val.split('\n').length
    setLineCount(lines)
    // Auto-resize
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, isExpanded ? 400 : 200) + 'px'
  }

  function handleSend() {
    if (!input.trim() || !activeHub) return
    const newMsg: HubMessage = {
      id: `m${Date.now()}`,
      authorId: 'lucian',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      date: new Date().toLocaleDateString('en-US'),
      replyTo: replyTo || undefined,
    }
    setHubs((prev) => prev.map((h) =>
      h.id === activeHubId
        ? { ...h, messages: [...h.messages, newMsg], lastMessage: `Lucian: ${input.trim().slice(0, 40)}${input.trim().length > 40 ? '...' : ''}`, lastSender: 'Lucian', lastTime: 'now' }
        : h
    ))
    setInput('')
    setReplyTo(null)
    setIsExpanded(false)
    setLineCount(1)
  }

  function handleReaction(messageId: string, emoji: string) {
    if (!activeHub) return
    setHubs((prev) => prev.map((h) =>
      h.id === activeHubId ? {
        ...h,
        messages: h.messages.map((m) => {
          if (m.id !== messageId || m.systemLog) return m
          const existing = m.reactions || []
          const found = existing.find((r) => r.emoji === emoji)
          if (found) {
            return {
              ...m,
              reactions: existing.map((r) => r.emoji === emoji
                ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
                : r
              ).filter((r) => r.count > 0),
            }
          }
          return { ...m, reactions: [...existing, { emoji, count: 1, reacted: true }] }
        }),
      } : h
    ))
    setMessageMenuId(null)
  }

  function toggleStar(messageId: string) {
    if (!activeHub) return
    setHubs((prev) => prev.map((h) =>
      h.id === activeHubId ? { ...h, messages: h.messages.map((m) => m.id === messageId ? { ...m, starred: !m.starred } : m) } : h
    ))
    setMessageMenuId(null)
  }

  function deleteMessage(messageId: string) {
    if (!activeHub) return
    setHubs((prev) => prev.map((h) =>
      h.id === activeHubId ? { ...h, messages: h.messages.filter((m) => m.id !== messageId) } : h
    ))
    setMessageMenuId(null)
  }

  function copyMessage(content: string) {
    navigator.clipboard?.writeText(content)
    setMessageMenuId(null)
  }

  function startReply(messageId: string) {
    if (!activeHub) return
    const msg = activeHub.messages.find((m) => m.id === messageId)
    if (!msg) return
    const author = WRITERS[msg.authorId]
    setReplyTo({ id: messageId, authorName: author?.displayName || 'Unknown', snippet: msg.content.slice(0, 60) })
    setMessageMenuId(null)
  }

  function replyPrivately(messageId: string) {
    if (!activeHub) return
    const msg = activeHub.messages.find((m) => m.id === messageId)
    if (!msg || msg.authorId === 'system') return
    setMessageMenuId(null)
    onOpenCircle?.(msg.authorId)
  }

  function messageUser(authorId: string) {
    setMessageMenuId(null)
    setDrawerUserId(null)
    onOpenCircle?.(authorId)
  }

  function toggleHubPin(hubId: string) {
    setHubs((prev) => prev.map((h) => h.id === hubId ? { ...h, pinned: !h.pinned } : h))
    setRowMenuHubId(null)
  }
  function toggleHubMute(hubId: string) {
    setHubs((prev) => prev.map((h) => h.id === hubId ? { ...h, muted: !h.muted } : h))
    setRowMenuHubId(null)
  }
  function toggleHubFavorite(hubId: string) {
    setHubs((prev) => prev.map((h) => h.id === hubId ? { ...h, favorited: !h.favorited } : h))
    setRowMenuHubId(null)
  }
  function markHubRead(hubId: string) {
    setHubs((prev) => prev.map((h) => h.id === hubId ? { ...h, unread: 0 } : h))
    setRowMenuHubId(null)
  }
  function exitHub(hubId: string) {
    if (hubId === 'the-hub') return
    setHubs((prev) => prev.filter((h) => h.id !== hubId))
    if (activeHubId === hubId) setActiveHubId('the-hub')
    setRowMenuHubId(null)
  }

  function createNewHub() {
    const name = prompt('Name your new Hub:')
    if (!name?.trim()) return
    const newHub: Hub = {
      id: `hub-${Date.now()}`,
      name: name.trim(),
      avatarInitial: name.trim().charAt(0).toUpperCase(),
      lastMessage: 'Hub created',
      lastSender: 'Lucian',
      lastTime: 'now',
      unread: 0,
      messages: [
        { id: `m${Date.now()}`, authorId: 'system', content: `${name.trim()} was created by Lucian`, timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), date: new Date().toLocaleDateString('en-US'), systemLog: true },
      ],
    }
    setHubs((prev) => [...prev, newHub])
    setActiveHubId(newHub.id)
    setSidebarMenuOpen(false)
  }

  // ─── Render markdown (bold, italics, blockquotes) ───
  function renderMarkdown(content: string) {
    const lines = content.split('\n')
    return lines.map((line, lineIdx) => {
      if (line.startsWith('> ')) {
        return (
          <blockquote key={lineIdx} className="border-l-2 border-zinc-700 pl-3 italic text-zinc-400 my-1">
            {renderInline(line.slice(2))}
          </blockquote>
        )
      }
      return <span key={lineIdx}>{renderInline(line)}{lineIdx < lines.length - 1 && <br />}</span>
    })
  }

  function renderInline(text: string) {
    const parts: React.ReactNode[] = []
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
    let lastIndex = 0
    let match
    let i = 0
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
      const token = match[0]
      if (token.startsWith('**')) {
        parts.push(<strong key={i++} className="font-semibold text-white">{token.slice(2, -2)}</strong>)
      } else {
        parts.push(<em key={i++} className="italic">{token.slice(1, -1)}</em>)
      }
      lastIndex = match.index + token.length
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex))
    return parts
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!activeHub) return []
    const groups: { date: string; messages: HubMessage[] }[] = []
    for (const msg of activeHub.messages) {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.date === msg.date) {
        lastGroup.messages.push(msg)
      } else {
        groups.push({ date: msg.date, messages: [msg] })
      }
    }
    return groups
  }, [activeHub])

  const drawerUser = drawerUserId ? WRITERS[drawerUserId] : null

  return (
    <div className="h-full flex bg-black text-zinc-200 relative overflow-hidden">
      {/* ═══ LEFT SIDEBAR (THE GUILD LIST) ═══ */}
      <div className={cn('shrink-0 bg-black border-r border-[#1a1a1a] flex flex-col transition-all duration-200', activeHubId ? 'w-full md:w-80 md:max-w-80' : 'w-full md:w-80')}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Feather className="w-4 h-4 text-zinc-300" />
            <h1 className="text-[15px] font-semibold tracking-tight">The Guild</h1>
          </div>
          <div className="relative">
            <button
              onClick={() => setSidebarMenuOpen(!sidebarMenuOpen)}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {sidebarMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[10000]" onClick={() => setSidebarMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-1 w-44 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl z-[10001] overflow-hidden py-1"
                  >
                    <button onClick={createNewHub} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900 transition text-left">
                      <Plus className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[12px] text-zinc-200">Create New Hub</span>
                    </button>
                    <button onClick={() => { setSidebarMenuOpen(false); /* open settings */ }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900 transition text-left">
                      <Settings className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[12px] text-zinc-200">Settings</span>
                    </button>
                    <button onClick={() => { setSidebarMenuOpen(false); alert('Log out') }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900 transition text-left">
                      <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[12px] text-zinc-200">Log Out</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-[#1a1a1a]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Hubs"
              className="w-full bg-zinc-950 border border-[#1a1a1a] pl-8 pr-3 py-1.5 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
            />
          </div>
          {/* Filter pills */}
          <div className="flex gap-1.5 mt-2">
            {(['all', 'hubs'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1 text-[11px] font-medium rounded-full transition capitalize',
                  filter === f ? 'bg-zinc-200 text-black' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 border border-[#1a1a1a]'
                )}
              >
                {f === 'all' ? 'All' : 'Hubs'}
              </button>
            ))}
          </div>
        </div>

        {/* Hub rows */}
        <div className="flex-1 overflow-y-auto lc-scroll">
          {filteredHubs.map((hub) => (
            <div
              key={hub.id}
              onClick={() => { setActiveHubId(hub.id); markHubRead(hub.id) }}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 cursor-pointer transition border-b border-[#1a1a1a]/50',
                activeHubId === hub.id ? 'bg-zinc-900/60' : 'hover:bg-zinc-950'
              )}
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center shrink-0">
                <span className="text-[14px] font-serif text-zinc-300">{hub.avatarInitial}</span>
              </div>
              {/* Center content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-zinc-100 truncate font-medium">{hub.name}</span>
                  <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{hub.lastTime}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] text-zinc-500 truncate pr-2">
                    {hub.muted && <BellOff className="inline w-2.5 h-2.5 mr-1 text-zinc-600" />}
                    {hub.lastMessage}
                  </span>
                  {hub.unread > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] font-mono rounded-full flex items-center justify-center">
                      {hub.unread}
                    </span>
                  )}
                </div>
              </div>
              {/* Hover dropdown arrow */}
              <button
                onClick={(e) => { e.stopPropagation(); setRowMenuHubId(rowMenuHubId === hub.id ? null : hub.id) }}
                className="absolute right-2 top-2 p-0.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {rowMenuHubId === hub.id && (
                  <>
                    <div className="fixed inset-0 z-[10000]" onClick={(e) => { e.stopPropagation(); setRowMenuHubId(null) }} />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-2 top-7 w-48 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl z-[10001] overflow-hidden py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenuItem icon={Pin} label="Pin to Top" onClick={() => toggleHubPin(hub.id)} />
                      <RowMenuItem icon={hub.muted ? Bell : BellOff} label={hub.muted ? 'Unmute Notifications' : 'Mute Notifications'} onClick={() => toggleHubMute(hub.id)} />
                      <RowMenuItem icon={CheckCheck} label="Mark as Read" onClick={() => markHubRead(hub.id)} />
                      <RowMenuItem icon={Star} label="Add to Favorites" onClick={() => toggleHubFavorite(hub.id)} />
                      {!hub.isTheHub && (
                        <>
                          <div className="my-1 border-t border-[#1a1a1a]" />
                          <RowMenuItem icon={Trash2} label="Clear Chat History" onClick={() => { setHubs((prev) => prev.map((h) => h.id === hub.id ? { ...h, messages: [] } : h)); setRowMenuHubId(null) }} />
                          <RowMenuItem icon={X} label="Exit Hub" danger onClick={() => exitHub(hub.id)} />
                        </>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ))}
          {filteredHubs.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-xs text-zinc-600">No hubs match your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ACTIVE CHAT AREA ═══ */}
      {activeHub && (
        <div className="hidden md:flex flex-1 flex-col min-w-0 bg-black">
          {/* Chat header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#1a1a1a] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center shrink-0">
                <span className="text-[12px] font-serif text-zinc-300">{activeHub.avatarInitial}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-zinc-100">{activeHub.name}</span>
                  {activeHub.isTheHub && (
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                      VIP Showroom
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500">{Object.keys(WRITERS).length} writers · {activeHub.messages.filter(m => !m.systemLog).length} messages</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Header search */}
              <button
                onClick={() => setHeaderSearchOpen(!headerSearchOpen)}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Lore Board */}
              <button
                onClick={() => setShowLoreBoard(true)}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition"
                title="Lore Board"
              >
                <BookmarkPlus className="w-4 h-4" />
              </button>

              {/* Three-dot menu */}
              <div className="relative">
                <button
                  onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {headerMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-[10000]" onClick={() => setHeaderMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full mt-1 w-48 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl z-[10001] overflow-hidden py-1"
                      >
                        <RowMenuItem icon={Search} label="Search" onClick={() => { setHeaderSearchOpen(true); setHeaderMenuOpen(false) }} />
                        <RowMenuItem icon={Feather} label="Hub Info" onClick={() => setHeaderMenuOpen(false)} />
                        <RowMenuItem icon={BellOff} label="Mute" onClick={() => { toggleHubMute(activeHub.id); setHeaderMenuOpen(false) }} />
                        <RowMenuItem icon={Star} label="Add to Favorites" onClick={() => { toggleHubFavorite(activeHub.id); setHeaderMenuOpen(false) }} />
                        {!activeHub.isTheHub && (
                          <>
                            <div className="my-1 border-t border-[#1a1a1a]" />
                            <RowMenuItem icon={UserPlus} label="Add Member" onClick={() => setHeaderMenuOpen(false)} />
                            <RowMenuItem icon={Trash2} label="Clear Chat" onClick={() => { setHubs((prev) => prev.map((h) => h.id === activeHub.id ? { ...h, messages: [] } : h)); setHeaderMenuOpen(false) }} />
                            <RowMenuItem icon={X} label="Exit Hub" danger onClick={() => exitHub(activeHub.id)} />
                          </>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Header search bar */}
          <AnimatePresence>
            {headerSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-[#1a1a1a]"
              >
                <div className="px-4 py-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                    <input
                      autoFocus
                      value={headerSearchQuery}
                      onChange={(e) => setHeaderSearchQuery(e.target.value)}
                      placeholder="Search messages in this hub..."
                      className="w-full bg-zinc-950 border border-[#1a1a1a] pl-8 pr-8 py-1.5 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                    />
                    <button onClick={() => { setHeaderSearchOpen(false); setHeaderSearchQuery('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto lc-scroll px-4 py-4">
            <div className="max-w-3xl mx-auto space-y-1">
              {/* Welcome box — only for The Hub */}
              {activeHub.isTheHub && (
                <div className="flex flex-col items-center text-center py-8 mb-4 border-b border-[#1a1a1a]/50">
                  <div className="w-20 h-20 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center mb-3 relative group cursor-pointer overflow-hidden">
                    <span className="text-[28px] font-serif text-zinc-300">{activeHub.avatarInitial}</span>
                    {CURRENT_USER.username === 'lucian' && (
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-zinc-300" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-100 mb-1">Welcome to {activeHub.name}</h2>
                  <p className="text-[12px] text-zinc-500 max-w-md leading-relaxed">
                    A place where writers gather to ask questions, share ideas, receive feedback, and help each other create unforgettable stories. Community for every writer.
                  </p>
                </div>
              )}

              {groupedMessages.map((group) => (
                <div key={group.date}>
                  {/* Date divider */}
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] text-zinc-600 bg-zinc-950 px-3 py-1 rounded-full border border-[#1a1a1a]">{group.date}</span>
                  </div>

                  {group.messages.map((msg) => {
                    if (msg.systemLog) {
                      return (
                        <div key={msg.id} className="flex justify-center my-3">
                          <div className="text-[10px] text-zinc-600 bg-zinc-950 px-3 py-1 rounded-full border border-[#1a1a1a]">
                            {msg.content} · {msg.timestamp}
                          </div>
                        </div>
                      )
                    }
                    const author = WRITERS[msg.authorId] || { displayName: msg.authorId, username: msg.authorId, avatarInitial: msg.authorId.charAt(0).toUpperCase(), role: 'Apprentice' as Role }
                    return (
                      <MessageRow
                        key={msg.id}
                        msg={msg}
                        author={author}
                        isMe={msg.authorId === 'lucian'}
                        isMenuOpen={messageMenuId === msg.id}
                        onToggleMenu={() => setMessageMenuId(messageMenuId === msg.id ? null : msg.id)}
                        onReact={(emoji) => handleReaction(msg.id, emoji)}
                        onReply={() => startReply(msg.id)}
                        onReplyPrivately={() => replyPrivately(msg.id)}
                        onMessageUser={() => messageUser(msg.authorId)}
                        onCopy={() => copyMessage(msg.content)}
                        onForward={() => setMessageMenuId(null)}
                        onStar={() => toggleStar(msg.id)}
                        onDelete={() => deleteMessage(msg.id)}
                        onAuthorClick={() => setDrawerUserId(msg.authorId)}
                        renderMarkdown={renderMarkdown}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Reply preview */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-[#1a1a1a] bg-zinc-950"
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <div className="w-1 h-8 bg-purple-500 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-purple-400 font-medium">Replying to {replyTo.authorName}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{replyTo.snippet}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-1 text-zinc-600 hover:text-zinc-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart input bar */}
          <div className="shrink-0 border-t border-[#1a1a1a] bg-black p-3 relative">
            {/* Emoji / GIF / Sticker panel */}
            <AnimatePresence>
              {showEmojiPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-3 right-3 mb-2 bg-zinc-950 border border-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden z-[10001]"
                >
                  {/* Tab switcher */}
                  <div className="flex border-b border-[#1a1a1a]">
                    {([
                      { id: 'emoji', label: '😀 Emoji' },
                      { id: 'gif', label: '🎬 GIF' },
                      { id: 'stickers', label: '🖼️ Stickers' },
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setEmojiTab(tab.id)}
                        className={cn(
                          'flex-1 py-2.5 text-[11px] font-medium transition',
                          emojiTab === tab.id ? 'text-zinc-200 bg-zinc-900/50' : 'text-zinc-600 hover:text-zinc-400'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Emoji tab */}
                  {emojiTab === 'emoji' && (
                    <div className="p-3 max-h-[260px] overflow-hidden flex flex-col">
                      <input
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        placeholder="Search emojis..."
                        className="w-full bg-zinc-900 border border-[#1a1a1a] px-3 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none rounded-md mb-2"
                      />
                      <div className="grid grid-cols-10 gap-1 overflow-y-auto lc-scroll">
                        {EMOJI_SET.filter((e) => !emojiSearch || e.includes(emojiSearch)).map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => { setInput(input + emoji); setShowEmojiPanel(false) }}
                            className="w-7 h-7 flex items-center justify-center text-lg hover:bg-zinc-900 rounded transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GIF tab */}
                  {emojiTab === 'gif' && (
                    <div className="p-3 max-h-[260px] overflow-hidden flex flex-col">
                      <input
                        placeholder="Search Giphy..."
                        className="w-full bg-zinc-900 border border-[#1a1a1a] px-3 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none rounded-md mb-2"
                      />
                      <div className="grid grid-cols-3 gap-1.5 overflow-y-auto lc-scroll">
                        {['#1a1a1a', '#1a1a1a', '#1a1a1a', '#1a1a1a', '#1a1a1a', '#1a1a1a'].map((c, i) => (
                          <div key={i} className="aspect-video rounded-md border border-[#1a1a1a] flex items-center justify-center text-[9px] text-zinc-700" style={{ background: c }}>
                            GIF {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stickers tab */}
                  {emojiTab === 'stickers' && (
                    <div className="p-3 max-h-[260px] overflow-hidden flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => stickerInputRef.current?.click()}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-zinc-300 bg-zinc-900 border border-[#1a1a1a] rounded-md hover:bg-zinc-800 transition"
                        >
                          <Plus className="w-3 h-3" /> Create
                        </button>
                        <input
                          value={stickerSearch}
                          onChange={(e) => setStickerSearch(e.target.value)}
                          placeholder="Search stickers..."
                          className="flex-1 bg-zinc-900 border border-[#1a1a1a] px-3 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none rounded-md"
                        />
                        <input ref={stickerInputRef} type="file" accept="image/png" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = URL.createObjectURL(file)
                            setCustomStickers((prev) => [...prev, url])
                            e.target.value = ''
                          }
                        }} />
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 overflow-y-auto lc-scroll">
                        {customStickers.length === 0 ? (
                          <div className="col-span-5 text-center py-6">
                            <p className="text-[11px] text-zinc-600">No stickers yet. Click "+ Create" to upload.</p>
                          </div>
                        ) : (
                          customStickers.map((url, i) => (
                            <button key={i} onClick={() => { setInput(input + ' [sticker]'); setShowEmojiPanel(false) }} className="aspect-square rounded-md border border-[#1a1a1a] overflow-hidden hover:bg-zinc-900 transition">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="max-w-3xl mx-auto">
              <div className="bg-zinc-950 border border-[#1a1a1a] rounded-2xl focus-within:border-zinc-800 transition">
                <div className="px-3 pt-3">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none lc-scroll"
                    rows={1}
                    style={{ height: 'auto', minHeight: '24px', maxHeight: isExpanded ? '400px' : '200px' }}
                  />
                </div>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={() => {}} />
                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowEmojiPanel(!showEmojiPanel)} className={cn('p-1.5 rounded-lg transition', showEmojiPanel ? 'text-zinc-200 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900')}>
                      <Smile className="w-4 h-4" />
                    </button>
                    {/* Expand button — visible only when > 3 lines */}
                    {lineCount > 3 && (
                      <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition" title={isExpanded ? 'Collapse' : 'Expand'}>
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition">
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className={cn('p-2 rounded-lg transition', input.trim() ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed')}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ WRITER INFO DRAWER ═══ */}
      <AnimatePresence>
        {drawerUser && (
          <WriterInfoDrawer
            writer={drawerUser}
            isOwner={drawerUser.username === 'lucian'}
            onClose={() => setDrawerUserId(null)}
            onMessage={() => messageUser(drawerUser.id)}
          />
        )}
      </AnimatePresence>

      {/* ═══ LORE BOARD MODAL ═══ */}
      <AnimatePresence>
        {showLoreBoard && (
          <LoreBoardModal onClose={() => setShowLoreBoard(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Message Row Component ───
function MessageRow({
  msg, author, isMe, isMenuOpen, onToggleMenu, onReact, onReply, onReplyPrivately, onMessageUser, onCopy, onForward, onStar, onDelete, onAuthorClick, renderMarkdown,
}: {
  msg: HubMessage
  author: Writer | { displayName: string; username: string; avatarInitial: string; role: Role }
  isMe: boolean
  isMenuOpen: boolean
  onToggleMenu: () => void
  onReact: (emoji: string) => void
  onReply: () => void
  onReplyPrivately: () => void
  onMessageUser: () => void
  onCopy: () => void
  onForward: () => void
  onStar: () => void
  onDelete: () => void
  onAuthorClick: () => void
  renderMarkdown: (content: string) => React.ReactNode
}) {
  const roleColors: Record<Role, string> = {
    'Guild Master': 'text-purple-400',
    'Scribe': 'text-blue-400',
    'Herald': 'text-amber-400',
    'Inquisitor': 'text-emerald-400',
    'Apprentice': 'text-zinc-400',
  }
  return (
    <div className="group flex gap-2.5 px-2 py-1 hover:bg-zinc-950/50 rounded-lg transition relative">
      {/* Avatar */}
      <button onClick={onAuthorClick} className="shrink-0 mt-0.5">
        <div className="w-9 h-9 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center hover:ring-2 hover:ring-zinc-700 transition">
          <span className="text-[13px] font-serif text-zinc-300">{author.avatarInitial}</span>
        </div>
      </button>

      {/* Message body */}
      <div className="flex-1 min-w-0">
        {/* Header line */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <button onClick={onAuthorClick} className={cn('text-[13px] font-medium hover:underline', roleColors[author.role])}>
            {author.displayName}
          </button>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-zinc-500 rounded border border-[#1a1a1a]">
            {author.role}
          </span>
          <span className="text-[10px] text-zinc-600">{msg.timestamp}</span>
          {msg.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
        </div>

        {/* Reply preview */}
        {msg.replyTo && (
          <div className="mb-1.5 flex items-center gap-2 px-2 py-1 bg-zinc-950 border-l-2 border-zinc-700 rounded-r-md text-[10px]">
            <Reply className="w-3 h-3 text-zinc-600" />
            <span className="text-zinc-500"><span className="text-zinc-400">{msg.replyTo.authorName}:</span> {msg.replyTo.snippet}</span>
          </div>
        )}

        {/* Content */}
        <div className="text-[13px] text-zinc-300 leading-relaxed">
          {renderMarkdown(msg.content)}
        </div>

        {/* Attachment */}
        {msg.attachment && (
          <div className="mt-1.5 flex items-center gap-2 bg-zinc-950 border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 max-w-xs">
            {msg.attachment.type === 'image' || msg.attachment.type === 'gif' ? (
              <ImageIconLucide className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span className="text-[11px] text-zinc-400 truncate">{msg.attachment.name}</span>
          </div>
        )}

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded-full border transition',
                  r.reacted ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-zinc-900 border-[#1a1a1a] text-zinc-400 hover:border-zinc-700'
                )}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] font-mono">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover dropdown arrow */}
      <button
        onClick={onToggleMenu}
        className="absolute top-1 right-1 p-1 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {/* Action menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-[10000]" onClick={onToggleMenu} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-6 right-1 w-56 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl z-[10001] overflow-hidden"
            >
              {/* Quick reactions row */}
              <div className="flex items-center justify-around px-2 py-2 border-b border-[#1a1a1a]">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(emoji)}
                    className="w-7 h-7 flex items-center justify-center text-base hover:bg-zinc-900 rounded transition"
                  >
                    {emoji}
                  </button>
                ))}
                <button className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-zinc-900 rounded transition">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Actions */}
              <div className="py-1">
                <MenuActionItem icon={Reply} label="Reply" onClick={onReply} />
                <MenuActionItem icon={MessageCircle} label="Reply Privately" onClick={onReplyPrivately} />
                <MenuActionItem icon={Send} label={`Message ${author.username}`} onClick={onMessageUser} />
                <MenuActionItem icon={Copy} label="Copy text" onClick={onCopy} />
                <MenuActionItem icon={Forward} label="Forward" onClick={onForward} />
                <MenuActionItem icon={Star} label="Star" onClick={onStar} />
                <div className="my-1 border-t border-[#1a1a1a]" />
                {isMe ? (
                  <MenuActionItem icon={Trash2} label="Delete" danger onClick={onDelete} />
                ) : (
                  <MenuActionItem icon={Flag} label="Report" danger onClick={onToggleMenu} />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Writer Info Drawer ───
function WriterInfoDrawer({
  writer, isOwner, onClose, onMessage,
}: {
  writer: Writer
  isOwner: boolean
  onClose: () => void
  onMessage: () => void
}) {
  const [openSection, setOpenSection] = useState<string | null>('about')
  function toggle(section: string) {
    setOpenSection(openSection === section ? null : section)
  }

  return (
    <motion.div
      initial={{ x: 360 }}
      animate={{ x: 0 }}
      exit={{ x: 360 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="w-[340px] shrink-0 bg-black border-l border-[#1a1a1a] flex flex-col h-full absolute right-0 top-0 z-[10002]"
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#1a1a1a] shrink-0">
        <span className="text-[13px] font-semibold text-zinc-200">Writer Info</span>
        <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto lc-scroll">
        {/* Profile header */}
        <div className="flex flex-col items-center text-center py-6 px-4 border-b border-[#1a1a1a]">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center mb-3 relative group cursor-pointer overflow-hidden">
            <span className="text-[28px] font-serif text-zinc-300">{writer.avatarInitial}</span>
            {isOwner && (
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-zinc-300" />
              </div>
            )}
          </div>
          <h2 className="text-[15px] font-semibold text-zinc-100">{writer.displayName}</h2>
          <p className="text-[11px] text-zinc-500">@{writer.username}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-zinc-500 rounded border border-[#1a1a1a]">{writer.role}</span>
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-zinc-500 rounded border border-[#1a1a1a]">{writer.writingStatus}</span>
          </div>

          {/* Daily word count tracker */}
          {writer.dailyGoal && (
            <div className="w-full mt-4">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-zinc-500">Daily word count</span>
                <span className="text-zinc-400 font-mono">{writer.dailyWords?.toLocaleString() || 0} / {writer.dailyGoal.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((writer.dailyWords || 0) / writer.dailyGoal) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions row */}
        <div className="flex items-center justify-around py-3 border-b border-[#1a1a1a]">
          <QuickAction icon={Send} label="Message" onClick={onMessage} />
          <QuickAction icon={UserPlus} label="Follow" onClick={() => {}} />
          <QuickAction icon={Gift} label="Share" onClick={() => navigator.clipboard?.writeText(`https://l-c.app/@${writer.username}`)} />
        </div>

        {/* Accordion: About */}
        <AccordionItem
          icon="📖"
          title="About the Writer"
          isOpen={openSection === 'about'}
          onToggle={() => toggle('about')}
        >
          <Field label="Bio" value={writer.bio} />
          <Field label="Joined Date" value={writer.joinedDate} />
          <Field label="Favorite Genres" value={writer.favoriteGenres.join(', ')} />
        </AccordionItem>

        {/* Accordion: Project Space */}
        <AccordionItem
          icon="✍️"
          title="Project Space"
          isOpen={openSection === 'project'}
          onToggle={() => toggle('project')}
        >
          <Field label="Current Writing Project" value={writer.currentProject || '—'} />
          <Field label="Public Projects" value={(writer.publicProjects || []).join(', ') || '—'} />
        </AccordionItem>

        {/* Accordion: Media */}
        <AccordionItem
          icon="📁"
          title="Media, Links, and Docs"
          isOpen={openSection === 'media'}
          onToggle={() => toggle('media')}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-zinc-900 border border-[#1a1a1a] rounded-md flex items-center justify-center">
                <FileText className="w-5 h-5 text-zinc-700" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">No media shared yet.</p>
        </AccordionItem>

        {/* Accordion: Starred Messages */}
        <AccordionItem
          icon="⭐"
          title="Starred Messages"
          isOpen={openSection === 'starred'}
          onToggle={() => toggle('starred')}
        >
          <p className="text-[11px] text-zinc-600">No starred messages from this writer yet.</p>
        </AccordionItem>
      </div>

      {/* Bottom: Block & Report */}
      <div className="border-t border-[#1a1a1a] p-3 space-y-1">
        {!isOwner && (
          <>
            <button className="w-full text-left px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 rounded-lg transition">Block User</button>
            <button className="w-full text-left px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 rounded-lg transition">Report User</button>
          </>
        )}
        {isOwner && (
          <p className="text-[10px] text-zinc-600 text-center px-3 py-2">This is your profile.</p>
        )}
      </div>
    </motion.div>
  )
}

function QuickAction({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center group-hover:bg-zinc-800 group-hover:border-zinc-700 transition">
        <Icon className="w-4 h-4 text-zinc-300" />
      </div>
      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition">{label}</span>
    </button>
  )
}

function AccordionItem({ icon, title, isOpen, onToggle, children }: { icon: string; title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#1a1a1a]">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-950 transition">
        <span className="text-[12px] text-zinc-300 font-medium flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-500 transition-transform', isOpen && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-0.5">{label}</p>
      <p className="text-[12px] text-zinc-300 leading-relaxed">{value}</p>
    </div>
  )
}

function RowMenuItem({ icon: Icon, label, onClick, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-900 transition text-left',
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-zinc-300'
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[12px]">{label}</span>
    </button>
  )
}

function MenuActionItem({ icon: Icon, label, onClick, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900 transition text-left',
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-zinc-300'
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[12px]">{label}</span>
    </button>
  )
}

// ─── Lore Board Modal ───
function LoreBoardModal({ onClose }: { onClose: () => void }) {
  // No mock pinned cards — loads from project data in production
  const pinnedCards: { title: string; subtitle: string; type: string }[] = []
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 10 }}
        className="bg-zinc-950 border border-[#1a1a1a] rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#1a1a1a]">
          <h3 className="text-[13px] font-semibold text-zinc-200 flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-zinc-400" />
            Lore Board
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-600 hover:text-zinc-300 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          {pinnedCards.map((card) => (
            <div key={card.title} className="bg-black border border-[#1a1a1a] rounded-lg p-3 hover:border-zinc-800 transition cursor-pointer">
              <p className="text-[9px] font-mono uppercase tracking-wider text-purple-400 mb-1">{card.type}</p>
              <p className="text-[12px] text-zinc-200 font-medium mb-0.5">{card.title}</p>
              <p className="text-[10px] text-zinc-600">{card.subtitle}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
