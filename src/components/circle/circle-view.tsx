'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Plus, Search, MoreVertical, X, ChevronDown,
  Mic, ImageIcon, Expand, Minimize2, Smile,
  Phone, Video, Archive, BellOff, CheckCheck, Pin,
  Reply, Copy, Forward, Star, Trash2, Flag, MessageCircle,
  FileText, Settings, User as UserIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───
type Receipt = 'sent' | 'delivered' | 'read'

type Message = {
  id: string
  senderId: 'me' | string
  content: string
  timestamp: string
  date: string
  receipt?: Receipt
  replyTo?: { id: string; authorName: string; snippet: string }
  attachment?: { type: 'image' | 'gif' | 'file'; name: string; url?: string }
  starred?: boolean
}

type Contact = {
  id: string
  displayName: string
  username: string
  avatarInitial: string
  status: 'Online' | 'Writing' | 'Away' | 'Offline'
  bio: string
  writingStatus: 'Writing' | 'Editing' | 'Planning'
  favorites: string
  isFavorite?: boolean
  isArchived?: boolean
  isMuted?: boolean
  isPinned?: boolean
}

type Conversation = {
  contactId: string
  lastMessage: string
  lastTime: string
  unread: number
  receipt?: Receipt
  messages: Message[]
  isPinned?: boolean
  isArchived?: boolean
}

// ─── Empty data — no mock users or conversations. Real data comes from /api/circle/conversations ───
const CONTACTS: Record<string, Contact> = {}

const INITIAL_CONVERSATIONS: Conversation[] = []

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const EMOJI_SET = [
  '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😇','🙂','🙃','😋','😜',
  '🤔','🤨','😐','😶','😏','😒','🙄','😬','😢','😭','😤','😠','🤬','🥺','😱','😨',
  '💀','👻','🤡','🔥','✨','⭐','🌟','💫','⚡','💥','🎯','📖','✍️','🖋️','📝','📚',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💘',
]

type CircleViewProps = {
  prefillContactId?: string | null
  onConsumePrefill?: () => void
}

export function CircleView({ prefillContactId, onConsumePrefill }: CircleViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS)
  const [contacts, setContacts] = useState<Record<string, Contact>>(CONTACTS)
  const [activeContactId, setActiveContactId] = useState<string | null>('seraphina')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all')
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [archiveTab, setArchiveTab] = useState<'dms' | 'hubs'>('dms')
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false)
  const [rowMenuContactId, setRowMenuContactId] = useState<string | null>(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; snippet: string } | null>(null)

  const [input, setInput] = useState('')
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'gif' | 'stickers'>('emoji')
  const [emojiSearch, setEmojiSearch] = useState('')
  const [customStickers, setCustomStickers] = useState<string[]>([])
  const [lineCount, setLineCount] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)
  const stickerInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Handle prefill from Guild message button
  useEffect(() => {
    if (prefillContactId && contacts[prefillContactId]) {
      setActiveContactId(prefillContactId)
      onConsumePrefill?.()
    }
  }, [prefillContactId, contacts, onConsumePrefill])

  const activeConv = conversations.find((c) => c.contactId === activeContactId && !c.isArchived)
  const activeContact = activeContactId ? contacts[activeContactId] : null

  const filteredConvs = useMemo(() => {
    return conversations
      .filter((c) => view === 'archived' ? c.isArchived : !c.isArchived)
      .filter((c) => {
        const contact = contacts[c.contactId]
        if (!contact) return false
        if (filter === 'unread') return c.unread > 0
        if (filter === 'favorites') return contact.isFavorite
        return true
      })
      .filter((c) => {
        const contact = contacts[c.contactId]
        return contact?.displayName.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase())
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return 0
      })
  }, [conversations, contacts, view, filter, search])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [activeContactId, activeConv?.messages.length])

  function handleSend() {
    if (!input.trim() || !activeContactId) return
    const newMsg: Message = {
      id: `m${Date.now()}`,
      senderId: 'me',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      date: new Date().toLocaleDateString('en-US'),
      receipt: 'sent',
      replyTo: replyTo || undefined,
    }
    setConversations((prev) => prev.map((c) =>
      c.contactId === activeContactId && !c.isArchived
        ? { ...c, messages: [...c.messages, newMsg], lastMessage: input.trim().slice(0, 50), lastTime: 'now', receipt: 'sent' as Receipt }
        : c
    ))
    setInput('')
    setReplyTo(null)
    setIsExpanded(false)
    setLineCount(1)

    // Simulate delivery + read receipts
    setTimeout(() => {
      setConversations((prev) => prev.map((c) =>
        c.contactId === activeContactId ? { ...c, messages: c.messages.map((m) => m.id === newMsg.id ? { ...m, receipt: 'delivered' } : m), receipt: 'delivered' as Receipt } : c
      ))
    }, 800)
    setTimeout(() => {
      setConversations((prev) => prev.map((c) =>
        c.contactId === activeContactId ? { ...c, messages: c.messages.map((m) => m.id === newMsg.id ? { ...m, receipt: 'read' } : m), receipt: 'read' as Receipt } : c
      ))
    }, 2500)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInput(val)
    setLineCount(val.split('\n').length)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, isExpanded ? 400 : 200) + 'px'
  }

  function startNewChat() {
    const username = prompt('Enter username to start a new chat:')
    if (!username?.trim()) return
    const id = username.toLowerCase().trim()
    if (!contacts[id]) {
      const newContact: Contact = {
        id, displayName: username.trim(), username: id,
        avatarInitial: username.charAt(0).toUpperCase(),
        status: 'Offline', bio: 'No bio yet.', writingStatus: 'Planning',
        favorites: 'Unknown',
      }
      setContacts((prev) => ({ ...prev, [id]: newContact }))
    }
    if (!conversations.find((c) => c.contactId === id)) {
      setConversations((prev) => [...prev, { contactId: id, lastMessage: 'New conversation', lastTime: 'now', unread: 0, messages: [] }])
    }
    setActiveContactId(id)
    setView('active')
  }

  function archiveChat(contactId: string) {
    setConversations((prev) => prev.map((c) => c.contactId === contactId ? { ...c, isArchived: true } : c))
    if (activeContactId === contactId) setActiveContactId(null)
    setRowMenuContactId(null)
  }
  function unarchiveChat(contactId: string) {
    setConversations((prev) => prev.map((c) => c.contactId === contactId ? { ...c, isArchived: false } : c))
    setRowMenuContactId(null)
  }
  function muteChat(contactId: string) {
    setContacts((prev) => ({ ...prev, [contactId]: { ...prev[contactId], isMuted: !prev[contactId]?.isMuted } }))
    setRowMenuContactId(null)
  }
  function pinChat(contactId: string) {
    setConversations((prev) => prev.map((c) => c.contactId === contactId ? { ...c, isPinned: !c.isPinned } : c))
    setRowMenuContactId(null)
  }
  function markUnread(contactId: string) {
    setConversations((prev) => prev.map((c) => c.contactId === contactId ? { ...c, unread: 1 } : c))
    setRowMenuContactId(null)
  }
  function closeChat(contactId: string) {
    setActiveContactId(null)
    setRowMenuContactId(null)
  }
  function toggleFavorite(contactId: string) {
    setContacts((prev) => ({ ...prev, [contactId]: { ...prev[contactId], isFavorite: !prev[contactId]?.isFavorite } }))
    setRowMenuContactId(null)
  }
  function clearChat(contactId: string) {
    setConversations((prev) => prev.map((c) => c.contactId === contactId ? { ...c, messages: [], lastMessage: '' } : c))
    setRowMenuContactId(null)
  }
  function deleteChat(contactId: string) {
    setConversations((prev) => prev.filter((c) => c.contactId !== contactId))
    if (activeContactId === contactId) setActiveContactId(null)
    setRowMenuContactId(null)
  }

  function handleReaction(messageId: string, emoji: string) {
    if (!activeContactId) return
    setConversations((prev) => prev.map((c) =>
      c.contactId === activeContactId ? {
        ...c,
        messages: c.messages.map((m) => {
          if (m.id !== messageId) return m
          const existing = (m as any).reactions || []
          const found = existing.find((r: any) => r.emoji === emoji)
          if (found) {
            return { ...m, reactions: existing.map((r: any) => r.emoji === emoji ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted } : r).filter((r: any) => r.count > 0) }
          }
          return { ...m, reactions: [...existing, { emoji, count: 1, reacted: true }] }
        }),
      } : c
    ))
    setMessageMenuId(null)
  }
  function toggleStar(messageId: string) {
    if (!activeContactId) return
    setConversations((prev) => prev.map((c) =>
      c.contactId === activeContactId ? { ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, starred: !m.starred } : m) } : c
    ))
    setMessageMenuId(null)
  }
  function deleteMessage(messageId: string) {
    if (!activeContactId) return
    setConversations((prev) => prev.map((c) =>
      c.contactId === activeContactId ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) } : c
    ))
    setMessageMenuId(null)
  }
  function copyMessage(content: string) {
    navigator.clipboard?.writeText(content)
    setMessageMenuId(null)
  }
  function startReply(messageId: string) {
    if (!activeConv) return
    const msg = activeConv.messages.find((m) => m.id === messageId)
    if (!msg) return
    const author = msg.senderId === 'me' ? 'You' : contacts[msg.senderId]?.displayName || 'Unknown'
    setReplyTo({ id: messageId, authorName: author, snippet: msg.content.slice(0, 60) })
    setMessageMenuId(null)
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!activeConv) return []
    const groups: { date: string; messages: Message[] }[] = []
    for (const msg of activeConv.messages) {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.date === msg.date) lastGroup.messages.push(msg)
      else groups.push({ date: msg.date, messages: [msg] })
    }
    return groups
  }, [activeConv])

  return (
    <div className="h-full flex bg-black text-zinc-200 relative overflow-hidden">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <div className={cn('shrink-0 bg-black border-r border-[#1a1a1a] flex flex-col transition-all duration-200', activeContactId && activeConv ? 'w-full md:w-80 md:max-w-80' : 'w-full md:w-80')}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#1a1a1a] flex items-center justify-between">
          <h1 className="text-[15px] font-semibold tracking-tight">The Circle</h1>
          <div className="flex items-center gap-1">
            <button onClick={startNewChat} className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition">
              <Plus className="w-4 h-4" />
            </button>
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
                      <button onClick={() => { setView('archived'); setSidebarMenuOpen(false) }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900 transition text-left">
                        <Archive className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[12px] text-zinc-200">Archived Chats</span>
                      </button>
                      <button onClick={() => setSidebarMenuOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900 transition text-left">
                        <BellOff className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[12px] text-zinc-200">Mute All</span>
                      </button>
                      <button onClick={() => setSidebarMenuOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900 transition text-left">
                        <Settings className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[12px] text-zinc-200">Settings</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-[#1a1a1a]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or start a new chat"
              className="w-full bg-zinc-950 border border-[#1a1a1a] pl-8 pr-3 py-1.5 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
            />
          </div>
          {/* Filter pills */}
          <div className="flex gap-1.5 mt-2">
            {(['all', 'unread', 'favorites'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1 text-[11px] font-medium rounded-full transition capitalize',
                  filter === f ? 'bg-zinc-200 text-black' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 border border-[#1a1a1a]'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* View tabs (active vs archived) */}
        {view === 'archived' && (
          <div className="flex border-b border-[#1a1a1a]">
            {([
              { id: 'dms', label: '💬 Archived DMs' },
              { id: 'hubs', label: '🛡️ Archived Hubs' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setArchiveTab(t.id)}
                className={cn(
                  'flex-1 py-2 text-[11px] font-medium transition',
                  archiveTab === t.id ? 'text-zinc-200 border-b border-zinc-300' : 'text-zinc-600 hover:text-zinc-400'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Conversation rows */}
        <div className="flex-1 overflow-y-auto lc-scroll">
          {archiveTab === 'hubs' && view === 'archived' ? (
            <div className="p-6 text-center">
              <Archive className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-[11px] text-zinc-600">No archived Hubs.</p>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[11px] text-zinc-600">{view === 'archived' ? 'No archived chats.' : 'No conversations match.'}</p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const contact = contacts[conv.contactId]
              if (!contact) return null
              return (
                <div
                  key={conv.contactId}
                  onClick={() => { setActiveContactId(conv.contactId); setConversations((prev) => prev.map((c) => c.contactId === conv.contactId ? { ...c, unread: 0 } : c)) }}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 cursor-pointer transition border-b border-[#1a1a1a]/50',
                    activeContactId === conv.contactId && view === 'active' ? 'bg-zinc-900/60' : 'hover:bg-zinc-950'
                  )}
                >
                  {/* Avatar with status dot */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center">
                      <span className="text-[14px] font-serif text-zinc-300">{contact.avatarInitial}</span>
                    </div>
                    <span className={cn(
                      'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black',
                      contact.status === 'Online' && 'bg-green-500',
                      contact.status === 'Writing' && 'bg-purple-500',
                      contact.status === 'Away' && 'bg-amber-500',
                      contact.status === 'Offline' && 'bg-zinc-700'
                    )} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-zinc-100 truncate font-medium">{contact.displayName}</span>
                      <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{conv.lastTime}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-zinc-500 truncate pr-2 flex items-center gap-1">
                        {conv.receipt && conv.contactId !== activeContactId && <CheckCheck className={cn('w-3 h-3', conv.receipt === 'read' ? 'text-purple-500' : 'text-zinc-600')} />}
                        {contact.isMuted && <BellOff className="w-2.5 h-2.5 text-zinc-600" />}
                        {conv.lastMessage}
                      </span>
                      {conv.unread > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] font-mono rounded-full flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Hover dropdown arrow */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setRowMenuContactId(rowMenuContactId === conv.contactId ? null : conv.contactId) }}
                    className="absolute right-2 top-2 p-0.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <AnimatePresence>
                    {rowMenuContactId === conv.contactId && (
                      <>
                        <div className="fixed inset-0 z-[10000]" onClick={(e) => { e.stopPropagation(); setRowMenuContactId(null) }} />
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute right-2 top-7 w-48 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl z-[10001] overflow-hidden py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {conv.isArchived ? (
                            <RowMenuItem icon={Archive} label="Unarchive" onClick={() => unarchiveChat(conv.contactId)} />
                          ) : (
                            <>
                              <RowMenuItem icon={Archive} label="Archive Chat" onClick={() => archiveChat(conv.contactId)} />
                              <RowMenuItem icon={BellOff} label={contact.isMuted ? 'Unmute Notifications' : 'Mute Notifications'} onClick={() => muteChat(conv.contactId)} />
                              <RowMenuItem icon={Pin} label={conv.isPinned ? 'Unpin Chat' : 'Pin Chat'} onClick={() => pinChat(conv.contactId)} />
                              <RowMenuItem icon={CheckCheck} label="Mark as Unread" onClick={() => markUnread(conv.contactId)} />
                              <RowMenuItem icon={X} label="Close Chat" onClick={() => closeChat(conv.contactId)} />
                              <RowMenuItem icon={Star} label={contact.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'} onClick={() => toggleFavorite(conv.contactId)} />
                              <div className="my-1 border-t border-[#1a1a1a]" />
                              <RowMenuItem icon={Trash2} label="Clear Chat" onClick={() => clearChat(conv.contactId)} />
                              <RowMenuItem icon={X} label="Delete Chat" danger onClick={() => deleteChat(conv.contactId)} />
                            </>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>

        {/* Archived link at bottom */}
        {view === 'active' && (
          <button
            onClick={() => setView('archived')}
            className="border-t border-[#1a1a1a] px-4 py-2.5 text-left text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950 transition flex items-center gap-2"
          >
            <Archive className="w-3.5 h-3.5" />
            Archived Chats ({conversations.filter((c) => c.isArchived).length})
          </button>
        )}
        {view === 'archived' && (
          <button
            onClick={() => setView('active')}
            className="border-t border-[#1a1a1a] px-4 py-2.5 text-left text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950 transition flex items-center gap-2"
          >
            <X className="w-3.5 h-3.5" />
            Back to Active Chats
          </button>
        )}
      </div>

      {/* ═══ ACTIVE DM CHAT VIEW ═══ */}
      {activeConv && activeContact ? (
        <div className="hidden md:flex flex-1 flex-col min-w-0 bg-black">
          {/* Chat header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#1a1a1a] shrink-0">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setShowContactInfo(true)} className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center">
                  <span className="text-[12px] font-serif text-zinc-300">{activeContact.avatarInitial}</span>
                </div>
                <span className={cn(
                  'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black',
                  activeContact.status === 'Online' && 'bg-green-500',
                  activeContact.status === 'Writing' && 'bg-purple-500',
                  activeContact.status === 'Away' && 'bg-amber-500',
                  activeContact.status === 'Offline' && 'bg-zinc-700'
                )} />
              </button>
              <button onClick={() => setShowContactInfo(true)} className="text-left">
                <p className="text-[13px] font-semibold text-zinc-100">{activeContact.displayName}</p>
                <p className="text-[10px] text-zinc-500">{activeContact.status}</p>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition" title="Audio Call">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition" title="Video Call">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition" title="Search Messages">
                <Search className="w-4 h-4" />
              </button>
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
                        <RowMenuItem icon={UserIcon} label="Contact Info" onClick={() => { setShowContactInfo(true); setHeaderMenuOpen(false) }} />
                        <RowMenuItem icon={BellOff} label="Mute Notifications" onClick={() => { muteChat(activeContact.id); setHeaderMenuOpen(false) }} />
                        <div className="my-1 border-t border-[#1a1a1a]" />
                        <RowMenuItem icon={Trash2} label="Clear Chat" onClick={() => { clearChat(activeContact.id); setHeaderMenuOpen(false) }} />
                        <RowMenuItem icon={X} label="Delete Chat" danger onClick={() => { deleteChat(activeContact.id); setHeaderMenuOpen(false) }} />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto lc-scroll px-4 py-4">
            <div className="max-w-2xl mx-auto space-y-1">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] text-zinc-600 bg-zinc-950 px-3 py-1 rounded-full border border-[#1a1a1a]">{group.date}</span>
                  </div>
                  {group.messages.map((msg) => (
                    <DMMessageRow
                      key={msg.id}
                      msg={msg}
                      contact={activeContact}
                      isMe={msg.senderId === 'me'}
                      isMenuOpen={messageMenuId === msg.id}
                      onToggleMenu={() => setMessageMenuId(messageMenuId === msg.id ? null : msg.id)}
                      onReact={(emoji) => handleReaction(msg.id, emoji)}
                      onReply={() => startReply(msg.id)}
                      onCopy={() => copyMessage(msg.content)}
                      onForward={() => setMessageMenuId(null)}
                      onStar={() => toggleStar(msg.id)}
                      onDelete={() => deleteMessage(msg.id)}
                    />
                  ))}
                </div>
              ))}
              {activeConv.messages.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                  <p className="text-[12px] text-zinc-600">No messages yet. Say hello to {activeContact.displayName}.</p>
                </div>
              )}
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

          {/* Smart input */}
          <div className="shrink-0 border-t border-[#1a1a1a] bg-black p-3 relative">
            <AnimatePresence>
              {showEmojiPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-3 right-3 mb-2 bg-zinc-950 border border-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden z-[10001]"
                >
                  <div className="flex border-b border-[#1a1a1a]">
                    {([
                      { id: 'emoji', label: '😀 Emoji' },
                      { id: 'gif', label: '🎬 GIF' },
                      { id: 'stickers', label: '🖼️ Stickers' },
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setEmojiTab(tab.id)}
                        className={cn('flex-1 py-2.5 text-[11px] font-medium transition', emojiTab === tab.id ? 'text-zinc-200 bg-zinc-900/50' : 'text-zinc-600 hover:text-zinc-400')}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
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
                          <button key={emoji} onClick={() => { setInput(input + emoji); setShowEmojiPanel(false) }} className="w-7 h-7 flex items-center justify-center text-lg hover:bg-zinc-900 rounded transition">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {emojiTab === 'gif' && (
                    <div className="p-3 max-h-[260px]">
                      <input placeholder="Search Giphy..." className="w-full bg-zinc-900 border border-[#1a1a1a] px-3 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none rounded-md mb-2" />
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1,2,3,4,5,6].map((i) => (
                          <div key={i} className="aspect-video rounded-md border border-[#1a1a1a] bg-zinc-900 flex items-center justify-center text-[9px] text-zinc-700">GIF {i}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {emojiTab === 'stickers' && (
                    <div className="p-3 max-h-[260px]">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => stickerInputRef.current?.click()}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-zinc-300 bg-zinc-900 border border-[#1a1a1a] rounded-md hover:bg-zinc-800 transition"
                        >
                          <Plus className="w-3 h-3" /> Create
                        </button>
                        <input
                          ref={stickerInputRef}
                          type="file"
                          accept="image/png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = URL.createObjectURL(file)
                              setCustomStickers((prev) => [...prev, url])
                              e.target.value = ''
                            }
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
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

            <div className="max-w-2xl mx-auto">
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
                    {lineCount > 3 && (
                      <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition">
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
      ) : (
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="text-center">
            <MessageCircle className="w-14 h-14 text-zinc-800 mx-auto mb-4" />
            <h2 className="font-serif text-lg text-zinc-400 mb-1">The Circle</h2>
            <p className="text-xs text-zinc-600 italic">Private conversations and collaboration.</p>
          </div>
        </div>
      )}

      {/* ═══ CONTACT INFO DRAWER ═══ */}
      <AnimatePresence>
        {showContactInfo && activeContact && (
          <ContactInfoDrawer
            contact={activeContact}
            onClose={() => setShowContactInfo(false)}
            mediaCount={activeConv?.messages.filter((m) => m.attachment).length || 0}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── DM Message Row ───
function DMMessageRow({
  msg, contact, isMe, isMenuOpen, onToggleMenu, onReact, onReply, onCopy, onForward, onStar, onDelete,
}: {
  msg: Message
  contact: Contact
  isMe: boolean
  isMenuOpen: boolean
  onToggleMenu: () => void
  onReact: (emoji: string) => void
  onReply: () => void
  onCopy: () => void
  onForward: () => void
  onStar: () => void
  onDelete: () => void
}) {
  return (
    <div className={cn('group flex gap-2 px-2 py-1 relative', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center shrink-0 mt-auto">
          <span className="text-[11px] font-serif text-zinc-300">{contact.avatarInitial}</span>
        </div>
      )}
      <div className={cn('max-w-[70%] relative', isMe && 'items-end')}>
        {msg.replyTo && (
          <div className={cn('mb-1 flex items-center gap-2 px-2 py-1 bg-zinc-950 border-l-2 border-purple-500 rounded-r-md text-[10px]', isMe && 'flex-row-reverse')}>
            <Reply className="w-3 h-3 text-zinc-600" />
            <span className="text-zinc-500"><span className="text-zinc-400">{msg.replyTo.authorName}:</span> {msg.replyTo.snippet}</span>
          </div>
        )}
        <div
          className={cn(
            'inline-block px-3.5 py-2 text-[13px] leading-relaxed rounded-2xl relative',
            isMe
              ? 'bg-purple-600/15 border border-purple-500/20 text-zinc-100 rounded-br-sm'
              : 'bg-[#111111] border border-[#1a1a1a] text-zinc-200 rounded-bl-sm'
          )}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
          {msg.attachment && (
            <div className={cn('mt-1.5 flex items-center gap-2 px-2 py-1 bg-black/40 rounded-md text-[11px]', isMe ? 'text-purple-200' : 'text-zinc-400')}>
              {msg.attachment.type === 'image' || msg.attachment.type === 'gif' ? (
                <ImageIcon className="w-3.5 h-3.5" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span className="truncate">{msg.attachment.name}</span>
            </div>
          )}
          {/* Reactions */}
          {(msg as any).reactions?.length > 0 && (
            <div className={cn('flex gap-1 mt-1 flex-wrap', isMe && 'justify-end')}>
              {(msg as any).reactions.map((r: any) => (
                <button key={r.emoji} onClick={() => onReact(r.emoji)} className={cn('flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] rounded-full border', r.reacted ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-zinc-900 border-[#1a1a1a] text-zinc-400')}>
                  <span>{r.emoji}</span><span className="text-[10px] font-mono">{r.count}</span>
                </button>
              ))}
            </div>
          )}
          {/* Timestamp + receipt */}
          <div className={cn('flex items-center gap-1 mt-0.5 text-[9px] text-zinc-600', isMe ? 'justify-end' : 'justify-start')}>
            <span>{msg.timestamp}</span>
            {isMe && msg.receipt && (
              <CheckCheck className={cn('w-3 h-3', msg.receipt === 'read' ? 'text-purple-500' : 'text-zinc-600')} />
            )}
            {msg.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
          </div>
        </div>

        {/* Hover arrow */}
        <button
          onClick={onToggleMenu}
          className="absolute top-0 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-zinc-300 transition"
          style={isMe ? { left: '-22px' } : { right: '-22px' }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-[10000]" onClick={onToggleMenu} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn('absolute top-6 w-56 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl z-[10001] overflow-hidden', isMe ? 'right-2' : 'left-2')}
            >
              <div className="flex items-center justify-around px-2 py-2 border-b border-[#1a1a1a]">
                {QUICK_REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => onReact(emoji)} className="w-7 h-7 flex items-center justify-center text-base hover:bg-zinc-900 rounded transition">
                    {emoji}
                  </button>
                ))}
                <button className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-zinc-900 rounded transition">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="py-1">
                <MenuActionItem icon={Reply} label="Reply" onClick={onReply} />
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

// ─── Contact Info Drawer ───
function ContactInfoDrawer({ contact, onClose, mediaCount }: { contact: Contact; onClose: () => void; mediaCount: number }) {
  const [openSection, setOpenSection] = useState<string | null>('about')
  function toggle(section: string) {
    setOpenSection(openSection === section ? null : section)
  }
  return (
    <motion.div
      initial={{ x: 340 }}
      animate={{ x: 0 }}
      exit={{ x: 340 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="w-[340px] shrink-0 bg-black border-l border-[#1a1a1a] flex flex-col h-full absolute right-0 top-0 z-[10002]"
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#1a1a1a] shrink-0">
        <span className="text-[13px] font-semibold text-zinc-200">Contact Info</span>
        <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto lc-scroll">
        <div className="flex flex-col items-center text-center py-6 px-4 border-b border-[#1a1a1a]">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center mb-3">
            <span className="text-[28px] font-serif text-zinc-300">{contact.avatarInitial}</span>
          </div>
          <h2 className="text-[15px] font-semibold text-zinc-100">{contact.displayName}</h2>
          <p className="text-[11px] text-zinc-500">@{contact.username}</p>
        </div>

        <div className="flex items-center justify-around py-3 border-b border-[#1a1a1a]">
          <QuickAction icon={Phone} label="Audio Call" onClick={() => {}} />
          <QuickAction icon={Video} label="Video Call" onClick={() => {}} />
          <QuickAction icon={Search} label="Search Chat" onClick={() => {}} />
        </div>

        <AccordionItem icon="📖" title="About" isOpen={openSection === 'about'} onToggle={() => toggle('about')}>
          <Field label="Bio" value={contact.bio} />
          <Field label="Writing Status" value={contact.writingStatus} />
          <Field label="Favorites" value={contact.favorites} />
        </AccordionItem>

        <AccordionItem icon="📁" title={`Media, Links, and Docs (${mediaCount})`} isOpen={openSection === 'media'} onToggle={() => toggle('media')}>
          {mediaCount === 0 ? (
            <p className="text-[11px] text-zinc-600">No shared media yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {[1,2,3].map((i) => (
                <div key={i} className="aspect-square bg-zinc-900 border border-[#1a1a1a] rounded-md flex items-center justify-center">
                  <FileText className="w-5 h-5 text-zinc-700" />
                </div>
              ))}
            </div>
          )}
        </AccordionItem>

        <AccordionItem icon="⭐" title="Starred Messages" isOpen={openSection === 'starred'} onToggle={() => toggle('starred')}>
          <p className="text-[11px] text-zinc-600">No starred messages in this chat yet.</p>
        </AccordionItem>
      </div>

      <div className="border-t border-[#1a1a1a] p-3 space-y-1">
        <button className="w-full text-left px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 rounded-lg transition">Block {contact.displayName}</button>
        <button className="w-full text-left px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 rounded-lg transition">Report {contact.displayName}</button>
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
