'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, ChevronDown, ChevronRight, X,
  Undo2, Redo2, Printer, Paintbrush, ZoomIn, ZoomOut,
  Bold, Italic, Underline as UnderlineIcon, Palette, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Table, Image as ImageIcon, Link as LinkIcon,
  Bot, Send, Loader2, AlertTriangle, Clipboard, Pencil, Check,
  PenTool, Plus, BookOpen, Globe, Zap, Clock, MapPin, Building2,
  Scroll, BookMarked, Search, Sparkles, Menu, Maximize2, Inbox, RefreshCw, Trash2, ThumbsDown, ThumbsUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { dispatchCompanionSignal } from '@/components/companion/lc-author-companion'
import { ReviewInbox, type ReviewSuggestion } from './ReviewInbox'

// ─── 12 Core Tabs ───
type CoreTab = {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const CORE_TABS: CoreTab[] = [
  { id: 'full-writing', name: 'FULL Writing', icon: BookOpen, description: 'Main manuscript drafting environment' },
  { id: 'character-creation', name: 'Character Creation', icon: PenTool, description: 'Profiles, relationship maps, and backstory bibles' },
  { id: 'world-building', name: 'World Building', icon: Globe, description: 'Locations, kingdoms, climate, and architecture' },
  { id: 'power-system', name: 'Power System', icon: Zap, description: 'Abilities, magic limits, rankings, and resources' },
  { id: 'timeline', name: 'Timeline', icon: Clock, description: 'Chronological events, ancient histories, and character ages' },
  { id: 'locations', name: 'Locations', icon: MapPin, description: 'Interactive geographical entries and settings' },
  { id: 'organisations', name: 'Organisations', icon: Building2, description: 'Sects, guilds, governments, and factions' },
  { id: 'lore', name: 'Lore', icon: Scroll, description: 'Myths, legends, hidden secrets, and historical records' },
  { id: 'plot', name: 'Plot', icon: BookMarked, description: 'Acts, story arcs, pacing milestones, and twist blueprints' },
  { id: 'research', name: 'Research', icon: Search, description: 'Data, reference links, and background notes' },
  { id: 'publishing', name: 'Publishing', icon: FileText, description: 'Cover design, blurb writing, formatting, and market planning' },
  { id: 'story-bible', name: 'Story Bible', icon: Sparkles, description: 'Master index referencing all concepts' },
]

type Message = { id: string; role: 'user' | 'assistant'; content: string }

type Chapter = {
  id: string
  name: string
  content: string // HTML or plain text
}

type SceneSearchResult = {
  group: 'FULL Writing' | 'Chapters'
  chapterName?: string
  snippet: string
  charOffset: number
}
const SLICER_CHECKPOINT_KEY = 'lc_project_slicer_checkpoint_v1'
const REVIEW_INBOX_KEY = 'lc_project_review_inbox_v1'
const REVIEW_TAB_KEYS = new Set(CORE_TABS.filter((tab) => tab.id !== 'full-writing').map((tab) => tab.id))
const MANUSCRIPT_SECTION_WORDS = 10000

function fullWritingToText(html: string) {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function escapeReviewHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function reviewContentToHtml(title: string, content: string) {
  const heading = escapeReviewHtml(title.trim() || 'Review note')
  const paragraphs = content.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  return `<h3>${heading}</h3>${paragraphs.map((paragraph) => `<p>${escapeReviewHtml(paragraph).replace(/\n/g, '<br />')}</p>`).join('')}`
}

type ProjectWorkspaceProps = {
  projectName: string
  projectId?: string
}

export function ProjectWorkspace({ projectName, projectId }: ProjectWorkspaceProps) {
  // ─── State ───
  const [activeTabId, setActiveTabId] = useState('full-writing')
  const [activeChapter, setActiveChapter] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [showChapterWizard, setShowChapterWizard] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [copilotWidth, setCopilotWidth] = useState(320)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageText, setEditingMessageText] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down'>>({})
  const [sending, setSending] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [sceneSearch, setSceneSearch] = useState('')
  const [sceneResults, setSceneResults] = useState<SceneSearchResult[]>([])
  const [showSceneResults, setShowSceneResults] = useState(false)
  const [importMarker, setImportMarker] = useState<number | null>(null)
  // Per-tab content cache (non-destructive). Maps tabId -> HTML string.
  const [tabContent, setTabContent] = useState<Record<string, string>>({})
  // Per-tab "missing fields" count, derived from content heuristics.
  const [missingCounts, setMissingCounts] = useState<Record<string, number>>({})
  // Expand-modal state for chat input
  const [showChatExpand, setShowChatExpand] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [slicerProgress, setSlicerProgress] = useState<string | null>(null)
  const [largePasteWords, setLargePasteWords] = useState<number | null>(null)
  const [selectedManuscriptSection, setSelectedManuscriptSection] = useState(0)
  const [chaptersExpanded, setChaptersExpanded] = useState(true)
  const [showAllChapters, setShowAllChapters] = useState(false)
  const [showDeleteAllChapters, setShowDeleteAllChapters] = useState(false)
  const [deletingChapters, setDeletingChapters] = useState<string | null>(null)
  const [refreshTarget, setRefreshTarget] = useState<{ tabKey: string; tabName: string; savedOffset: number } | null>(null)
  const [refreshingTabKey, setRefreshingTabKey] = useState<string | null>(null)
  const [pastedReviewText, setPastedReviewText] = useState('')
  const [reviewSuggestions, setReviewSuggestions] = useState<ReviewSuggestion[]>([])
  const [showReviewInbox, setShowReviewInbox] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewLoadedProjectId, setReviewLoadedProjectId] = useState<string | null>(null)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const chapterSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const companionTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const activeTab = CORE_TABS.find((t) => t.id === activeTabId)!
  const manuscriptWords = useMemo(() => fullWritingToText(tabContent['full-writing'] || '').split(/\s+/).filter(Boolean), [tabContent])
  const manuscriptSections = useMemo(() => Array.from({ length: Math.ceil(manuscriptWords.length / MANUSCRIPT_SECTION_WORDS) }, (_, index) => {
    const start = index * MANUSCRIPT_SECTION_WORDS
    const sectionWords = manuscriptWords.slice(start, start + MANUSCRIPT_SECTION_WORDS)
    return { index, content: sectionWords.join(' '), wordCount: sectionWords.length }
  }), [manuscriptWords])
  const currentManuscriptSection = manuscriptSections[selectedManuscriptSection] || null
  const reviewCounts = useMemo(() => reviewSuggestions.reduce<Record<string, number>>((counts, suggestion) => {
    counts[suggestion.tabKey] = (counts[suggestion.tabKey] || 0) + 1
    return counts
  }, {}), [reviewSuggestions])

  async function copyChatMessage(id: string, content: string) { try { await navigator.clipboard.writeText(content); setCopiedMessageId(id); window.setTimeout(() => setCopiedMessageId((current) => current === id ? null : current), 1600) } catch { toast.error('Copy is not available in this browser.') } }
  function saveChatEdit(id: string) { const content = editingMessageText.trim(); if (!content) return; setMessages((previous) => previous.map((message) => message.id === id ? { ...message, content } : message)); setEditingMessageId(null) }
  function restoreCoPilotPrompt(messageId: string) { const index = messages.findIndex((message) => message.id === messageId); const previousUser = messages.slice(0, index).reverse().find((message) => message.role === 'user'); if (!previousUser || sending) return; setChatInput(previousUser.content); chatInputRef.current?.focus() }

  async function deleteAllSlicedChapters() {
    if (!projectId || chapters.length === 0) return
    const pending = [...chapters]
    setShowDeleteAllChapters(false)
    try {
      for (let index = 0; index < pending.length; index++) {
        const chapter = pending[index]
        setDeletingChapters(`Deleting ${index + 1} of ${pending.length} chapters…`)
        const response = await fetch(`/api/projects/${projectId}/chapters/${chapter.id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error(`Could not delete ${chapter.name}.`)
        setChapters((current) => current.filter((item) => item.id !== chapter.id))
        if (activeChapter === chapter.id) setActiveChapter(null)
      }
      localStorage.removeItem(SLICER_CHECKPOINT_KEY)
      toast.success('All sliced chapters were deleted. Full Writing was preserved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chapter deletion stopped. Remaining chapters were kept.')
    } finally {
      setDeletingChapters(null)
    }
  }

  function openTabRefresh(tabKey: string, tabName: string) {
    if (!projectId) { toast.error('Open a saved project before refreshing a tab.'); return }
    const savedOffset = Number(localStorage.getItem(`lc_tab_refresh_offset_v1:${projectId}:${tabKey}`) || 0)
    setRefreshTarget({ tabKey, tabName, savedOffset: Number.isFinite(savedOffset) ? savedOffset : 0 })
  }

  async function runTabRefresh(startOffset: number) {
    if (!refreshTarget || !projectId) return
    const html = tabContent['full-writing'] || ''
    const text = html.replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    if (!text) { toast.error('Full Writing is empty.'); return }
    const offsetKey = `lc_tab_refresh_offset_v1:${projectId}:${refreshTarget.tabKey}`
    let offset = Math.min(Math.max(0, startOffset), text.length)
    let completed = 0
    const limit = 3
    setRefreshTarget(null)
    setRefreshingTabKey(refreshTarget.tabKey)
    try {
      while (offset < text.length && completed < limit) {
        let end = Math.min(offset + 18000, text.length)
        if (end < text.length) {
          const paragraph = text.lastIndexOf('\n\n', end)
          if (paragraph > offset + 4000) end = paragraph
        }
        const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: 'tab-refresh', projectId, tabKey: refreshTarget.tabKey, messages: [{ role: 'user', content: text.slice(offset, end) }] }) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || 'The tab review failed.')
        const incoming = Array.isArray(data?.suggestions) ? data.suggestions.filter((item: unknown): item is ReviewSuggestion => {
          if (!item || typeof item !== 'object') return false
          const suggestion = item as Partial<ReviewSuggestion>
          return suggestion.tabKey === refreshTarget.tabKey && typeof suggestion.id === 'string' && typeof suggestion.title === 'string' && typeof suggestion.content === 'string' && typeof suggestion.evidence === 'string' && (suggestion.confidence === 'high' || suggestion.confidence === 'medium' || suggestion.confidence === 'low')
        }) : []
        setReviewSuggestions((current) => {
          const known = new Set(current.map((item) => `${item.tabKey}:${item.title}:${item.content}`.toLowerCase()))
          return [...current, ...incoming.filter((item) => !known.has(`${item.tabKey}:${item.title}:${item.content}`.toLowerCase()))]
        })
        offset = end
        completed++
        localStorage.setItem(offsetKey, String(offset))
      }
      if (offset >= text.length) { localStorage.removeItem(offsetKey); toast.success(`${refreshTarget.tabName} review completed.`) }
      else toast.info(`Reviewed ${completed} chunks. Refresh ${refreshTarget.tabName} again to continue.`)
      setShowReviewInbox(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The tab review failed.')
    } finally {
      setRefreshingTabKey(null)
    }
  }

  async function runManuscriptReview(sourceText: string) {
    if (!projectId) { toast.error('Open a saved project before running a review.'); return }
    const content = sourceText.trim()
    if (!content) { toast.error('There is no pasted manuscript text to review.'); return }
    setIsReviewing(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'project-review',
          projectId,
          messages: [{ role: 'user', content: content.slice(0, 60000) }],
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Review failed')
      const next = Array.isArray(data?.suggestions) ? data.suggestions.filter((item: unknown): item is ReviewSuggestion => {
        if (!item || typeof item !== 'object') return false
        const suggestion = item as Partial<ReviewSuggestion>
        return typeof suggestion.id === 'string' && REVIEW_TAB_KEYS.has(String(suggestion.tabKey)) && typeof suggestion.title === 'string' && typeof suggestion.content === 'string' && typeof suggestion.evidence === 'string' && (suggestion.confidence === 'high' || suggestion.confidence === 'medium' || suggestion.confidence === 'low')
      }) : []
      if (next.length === 0) { toast.info('The review did not find any clear new project entries.'); return }
      setReviewSuggestions((current) => {
        const known = new Set(current.map((item) => `${item.tabKey}:${item.title}:${item.content}`))
        return [...current, ...next.filter((item) => !known.has(`${item.tabKey}:${item.title}:${item.content}`))]
      })
      setShowReviewInbox(true)
      toast.success(`${next.length} review suggestion${next.length === 1 ? '' : 's'} ready for your approval.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The manuscript review could not be completed.')
    } finally {
      setIsReviewing(false)
    }
  }

  async function approveReviewSuggestion(suggestion: ReviewSuggestion) {
    if (!projectId || !REVIEW_TAB_KEYS.has(suggestion.tabKey)) throw new Error('Invalid review destination')
    const previous = tabContent[suggestion.tabKey] || ''
    const next = `${previous}${previous ? '<hr />' : ''}${reviewContentToHtml(suggestion.title, suggestion.content)}`
    setTabContent((current) => ({ ...current, [suggestion.tabKey]: next }))
    if (activeTabId === suggestion.tabKey) editor?.commands.setContent(next, { emitUpdate: false })
    try {
      const response = await fetch(`/api/projects/${projectId}/tabs/${suggestion.tabKey}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: next }),
      })
      if (!response.ok) throw new Error('Save failed')
      setReviewSuggestions((current) => current.filter((item) => item.id !== suggestion.id))
    } catch (error) {
      setTabContent((current) => ({ ...current, [suggestion.tabKey]: previous }))
      if (activeTabId === suggestion.tabKey) editor?.commands.setContent(previous, { emitUpdate: false })
      throw error
    }
  }

  // ─── AI greeting + quick-action buttons (resets when project changes) ───
  useEffect(() => {
    setMessages([
      {
        id: 'greeting',
        role: 'assistant',
        content: `Project "${projectName}" loaded. I have read your Story Bible, Full Writing, and all 12 tabs. How would you like to proceed?`,
      },
    ])
    setChatInput('')
    // Reset chapter context on project swap
    setChapters([])
    setActiveChapter(null)
  }, [projectName, projectId])

  useEffect(() => {
    setReviewLoadedProjectId(null)
    setReviewSuggestions([])
    if (!projectId) return
    try {
      const saved = window.localStorage.getItem(`${REVIEW_INBOX_KEY}:${projectId}`)
      const parsed = saved ? JSON.parse(saved) : []
      if (Array.isArray(parsed)) setReviewSuggestions(parsed.filter((item): item is ReviewSuggestion => item && typeof item.id === 'string' && REVIEW_TAB_KEYS.has(item.tabKey) && typeof item.title === 'string' && typeof item.content === 'string'))
    } catch {
      window.localStorage.removeItem(`${REVIEW_INBOX_KEY}:${projectId}`)
    } finally {
      setReviewLoadedProjectId(projectId)
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId || reviewLoadedProjectId !== projectId) return
    window.localStorage.setItem(`${REVIEW_INBOX_KEY}:${projectId}`, JSON.stringify(reviewSuggestions))
  }, [projectId, reviewLoadedProjectId, reviewSuggestions])

  useEffect(() => {
    if (selectedManuscriptSection >= manuscriptSections.length) setSelectedManuscriptSection(Math.max(0, manuscriptSections.length - 1))
  }, [selectedManuscriptSection, manuscriptSections.length])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    fetch(`/api/projects/${projectId}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load project')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const next: Record<string, string> = {}
        for (const tab of data.project?.tabs || []) next[tab.tabKey] = tab.content || ''
        setTabContent(next)
        setChapters((data.project?.chapters || []).map((chapter: { id: string; title: string; content: string }) => ({
          id: chapter.id,
          name: chapter.title,
          content: chapter.content,
        })))
        setSaveState('saved')
      })
      .catch(() => toast.error('Unable to load this project.'))
    return () => { cancelled = true }
  }, [projectId])

  useEffect(() => {
    const receivePrompt = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt
      if (!prompt) return
      setChatInput(prompt)
      window.setTimeout(() => chatInputRef.current?.focus(), 0)
    }
    window.addEventListener('lc-companion-prompt', receivePrompt)
    return () => window.removeEventListener('lc-companion-prompt', receivePrompt)
  }, [])

  useEffect(() => {
    dispatchCompanionSignal({ mood: sending ? 'thinking' : 'idle' })
  }, [sending])

  useEffect(() => () => {
    if (companionTypingTimer.current) clearTimeout(companionTypingTimer.current)
  }, [])

  function signalWriting() {
    dispatchCompanionSignal({ mood: 'writing' })
    if (companionTypingTimer.current) clearTimeout(companionTypingTimer.current)
    companionTypingTimer.current = setTimeout(() => dispatchCompanionSignal({ mood: 'idle' }), 1100)
  }

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    fetch(`/api/projects/${projectId}/chat`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load project chat')
        return res.json()
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data.messages) || data.messages.length === 0) return
        setMessages(data.messages.map((message: { id: string; role: string; content: string }) => ({
          id: message.id,
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        })))
      })
      .catch(() => toast.error('Unable to load this project conversation.'))
    return () => { cancelled = true }
  }, [projectId])

  const saveTab = useCallback((tabKey: string, content: string) => {
    if (!projectId) return
    setSaveState('saving')
    clearTimeout(saveTimers.current[tabKey])
    saveTimers.current[tabKey] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tabs/${tabKey}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveState('saved')
      } catch {
        setSaveState('error')
        dispatchCompanionSignal({ mood: 'alert', message: 'Save failed. Your writing is still open here—please try again.' })
        toast.error('Your project could not be saved. Please try again.')
      }
    }, 700)
  }, [projectId])

  const saveChapterContent = useCallback((chapterId: string, content: string) => {
    setChapters((previous) => previous.map((chapter) => chapter.id === chapterId ? { ...chapter, content } : chapter))
    if (!projectId) return
    setSaveState('saving')
    clearTimeout(chapterSaveTimers.current[chapterId])
    chapterSaveTimers.current[chapterId] = setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/chapters/${chapterId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
        })
        if (!response.ok) throw new Error('Save failed')
        setSaveState('saved')
      } catch {
        setSaveState('error')
        dispatchCompanionSignal({ mood: 'alert', message: 'Chapter save failed. Please try again.' })
        toast.error('Your chapter could not be saved. Please try again.')
      }
    }, 700)
  }, [projectId])

  async function renameActiveChapter() {
    const chapter = chapters.find((item) => item.id === activeChapter)
    if (!chapter || !projectId) return
    const title = window.prompt('Chapter title:', chapter.name)?.trim()
    if (!title || title === chapter.name) return
    const previousTitle = chapter.name
    setChapters((previous) => previous.map((item) => item.id === chapter.id ? { ...item, name: title } : item))
    try {
      const response = await fetch(`/api/projects/${projectId}/chapters/${chapter.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }),
      })
      if (!response.ok) throw new Error('Rename failed')
    } catch {
      setChapters((previous) => previous.map((item) => item.id === chapter.id ? { ...item, name: previousTitle } : item))
      toast.error('Your chapter could not be renamed.')
    }
  }

  async function deleteActiveChapter() {
    const chapter = chapters.find((item) => item.id === activeChapter)
    if (!chapter || !projectId || !window.confirm(`Delete "${chapter.name}"? This cannot be undone.`)) return
    try {
      const response = await fetch(`/api/projects/${projectId}/chapters/${chapter.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      setChapters((previous) => previous.filter((item) => item.id !== chapter.id))
      setActiveChapter(null)
      toast.success('Chapter deleted.')
    } catch {
      toast.error('Your chapter could not be deleted.')
    }
  }

  async function moveActiveChapter(direction: -1 | 1) {
    if (!activeChapter || !projectId) return
    const currentIndex = chapters.findIndex((item) => item.id === activeChapter)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= chapters.length) return
    const next = [...chapters]
    ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
    setChapters(next)
    try {
      const response = await fetch(`/api/projects/${projectId}/chapters`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapterIds: next.map((chapter) => chapter.id) }),
      })
      if (!response.ok) throw new Error('Reorder failed')
    } catch {
      setChapters(chapters)
      toast.error('Your chapter order could not be saved.')
    }
  }

  // ─── Resizable copilot ───
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return
      const delta = dragRef.current.startX - e.clientX
      setCopilotWidth(Math.max(280, Math.min(640, dragRef.current.startW + delta)))
    }
    function onUp() {
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [messages, sending])

  // ─── TipTap editor ───
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CharacterCount,
      Placeholder.configure({
        placeholder: 'Begin writing your story...',
        emptyEditorClass:
          'before:content-[attr(data-placeholder)] before:text-zinc-600 before:italic before:pointer-events-none before:absolute',
      }),
    ],
    content: tabContent['full-writing'] || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[700px] text-zinc-200 leading-relaxed [&_h1]:text-zinc-100 [&_h1]:text-3xl [&_h1]:font-serif [&_h1]:mb-4 [&_h2]:text-zinc-100 [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:mb-3 [&_p]:mb-4 [&_p]:text-zinc-300 [&_strong]:text-zinc-100 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-purple-500/40 [&_blockquote]:pl-4 [&_blockquote]:italic',
        style: 'font-family: Georgia, serif; font-size: 16px; padding: 0;',
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain') || ''
        const words = text.trim().split(/\s+/).filter(Boolean).length
        if (words >= 5000) {
          setPastedReviewText(text)
          setLargePasteWords(words)
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      setTabContent((prev) => ({ ...prev, [activeTabId]: content }))
      saveTab(activeTabId, content)
      signalWriting()
    },
  })

  // When switching tabs, swap editor content from the cache.
  useEffect(() => {
    if (!editor) return
    const cached = tabContent[activeTabId] || ''
    // Suppress the onUpdate handler during programmatic setContent
    editor.commands.setContent(cached, { emitUpdate: false })
  }, [activeTabId, editor])  

  // ─── Dynamic missing-fields computation ───
  // Compute per-tab "missing field" count based on content heuristics.
  // For Full Writing: 0 missing if word count > 200, else (200 - words) / 50 (rounded).
  // For other tabs: 0 if content > 100 chars, else proportional.
  // This produces dynamic red dots that grow/shrink as the user writes.
  const computeMissing = useCallback(() => {
    const next: Record<string, number> = {}
    for (const tab of CORE_TABS) {
      const html = tabContent[tab.id] || ''
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const words = text.split(/\s+/).filter(Boolean).length
      if (tab.id === 'full-writing') {
        // Treat <200 words as missing milestone
        next[tab.id] = words < 200 ? Math.max(1, Math.ceil((200 - words) / 50)) : 0
      } else {
        // Each tab wants at least 100 words; missing fields scale accordingly
        next[tab.id] = words < 100 ? Math.max(1, Math.ceil((100 - words) / 25)) : 0
      }
    }
    setMissingCounts(next)
  }, [tabContent])

  useEffect(() => {
    computeMissing()
  }, [computeMissing])

  // ─── Semantic scene search ───
  // Scans Full Writing + chapter contents. Returns grouped results and scrolls to match.
  const runSceneSearch = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase()
      if (!q) {
        setSceneResults([])
        setShowSceneResults(false)
        return
      }
      const results: SceneSearchResult[] = []
      const tokens = q.split(/\s+/).filter((t) => t.length > 2)

      function scanText(text: string, group: 'FULL Writing' | 'Chapters', chapterName?: string) {
        if (!text) return
        const lower = text.toLowerCase()
        // Match either the full query or any token
        let idx = lower.indexOf(q)
        if (idx === -1) {
          for (const tok of tokens) {
            idx = lower.indexOf(tok)
            if (idx !== -1) break
          }
        }
        if (idx !== -1) {
          const start = Math.max(0, idx - 60)
          const end = Math.min(text.length, idx + q.length + 60)
          const snippet =
            (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '')
          results.push({ group, chapterName, snippet, charOffset: idx })
        }
      }

      // Full Writing — scan editor HTML as plain text
      const fullText =
        tabContent['full-writing']?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''
      scanText(fullText, 'FULL Writing')

      // Chapters
      for (const ch of chapters) {
        const text = ch.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        scanText(text, 'Chapters', ch.name)
      }

      setSceneResults(results)
      setShowSceneResults(true)
    },
    [tabContent, chapters]
  )

  function scrollToMatch(result: SceneSearchResult) {
    if (!editor) return
    if (result.group === 'FULL Writing') {
      // Switch to full-writing tab and try to focus the match
      setActiveTabId('full-writing')
      setActiveChapter(null)
      setTimeout(() => {
        if (!editor) return
        const html = editor.getHTML()
        const text = html.replace(/<[^>]+>/g, ' ')
        const lower = text.toLowerCase()
        const idx = lower.indexOf(result.snippet.replace(/^…/, '').replace(/…$/, '').trim().toLowerCase().slice(0, 30))
        if (idx !== -1) {
          // Best-effort: scroll the editor container
          if (editorContainerRef.current) {
            editorContainerRef.current.scrollTo({
              top: Math.max(0, idx / 10),
              behavior: 'smooth',
            })
          }
        }
        toast.success(`Jumped to match in Full Writing`)
      }, 100)
    } else if (result.chapterName) {
      setActiveTabId('full-writing')
      setActiveChapter(result.chapterName)
      toast.success(`Jumped to ${result.chapterName}`)
    }
    setShowSceneResults(false)
  }

  // ─── Chat handlers (wired to /api/chat with hardcoded Gemini Pro model) ───
  async function handleChatSend(overrideInput?: string) {
    const text = (overrideInput ?? chatInput).trim()
    if (!text || sending) return
    let completed = false
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Project Co-Pilot: hardcoded to gemini-1.5-pro + novel-writer
          // system prompt on the backend via purpose: 'copilot'.
          purpose: 'copilot',
          messages: [...messages.filter((m) => m.id !== 'greeting').slice(-39), userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectId,
          selectedSection: currentManuscriptSection ? {
            number: currentManuscriptSection.index + 1,
            content: currentManuscriptSection.content,
          } : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `AI request failed with ${res.status}`)
      }

      // The /api/chat endpoint streams plain text. Read the stream and
      // accumulate the response into a single assistant message.
      const reader = res.body?.getReader()
      if (!reader) throw new Error('The AI service did not return a readable stream.')

      const decoder = new TextDecoder()
      const assistantId = `a_${Date.now()}`
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg
          )
        )
      }
      completed = true
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content:
            'Network error reaching the AI service. Please check your connection and try again.',
        },
      ])
      dispatchCompanionSignal({ mood: 'alert', message: 'The co-pilot request failed. Check your connection or Gemini service, then try again.' })
    } finally {
      setSending(false)
      if (completed) dispatchCompanionSignal({ mood: 'alert', message: 'Your co-pilot response is ready.' })
    }
  }

  const wordCount = editor?.storage.characterCount?.characters() || 0
  const pageCount = Math.max(1, Math.ceil(wordCount / 500))

  function execCommand(command: string, value?: string) {
    if (!editor) return
    switch (command) {
      case 'undo':
        editor.chain().focus().undo().run()
        break
      case 'redo':
        editor.chain().focus().redo().run()
        break
      case 'bold':
        editor.chain().focus().toggleBold().run()
        break
      case 'italic':
        editor.chain().focus().toggleItalic().run()
        break
      case 'underline':
        editor.chain().focus().toggleUnderline().run()
        break
      case 'alignLeft':
        editor.chain().focus().setTextAlign('left').run()
        break
      case 'alignCenter':
        editor.chain().focus().setTextAlign('center').run()
        break
      case 'alignRight':
        editor.chain().focus().setTextAlign('right').run()
        break
      case 'alignJustify':
        editor.chain().focus().setTextAlign('justify').run()
        break
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run()
        break
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run()
        break
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case 'paragraph':
        editor.chain().focus().setParagraph().run()
        break
      case 'print':
        window.print()
        break
      case 'highlight':
        // Insert a highlighted span via inline HTML (no extra extension required)
        editor.chain().focus().insertContent(`<mark style="background-color: rgba(250, 204, 21, 0.35);">${editor.getText() || 'highlighted'}</mark>`).run()
        break
      case 'color':
        // Wrap the current selection in a colored span via insertContent
        if (value) {
          const selected = editor.getText() || 'colored text'
          editor.chain().focus().insertContent(`<span style="color: ${value};">${selected}</span>`).run()
        }
        break
    }
  }

  function insertTable() {
    if (!editor) return
    // Insert a simple HTML table (StarterKit supports insertContent with raw HTML)
    const html = `<table style="border-collapse: collapse; width: 100%;"><tbody>
      <tr><th style="border: 1px solid #444; padding: 4px;">Header 1</th><th style="border: 1px solid #444; padding: 4px;">Header 2</th><th style="border: 1px solid #444; padding: 4px;">Header 3</th></tr>
      <tr><td style="border: 1px solid #444; padding: 4px;">&nbsp;</td><td style="border: 1px solid #444; padding: 4px;">&nbsp;</td><td style="border: 1px solid #444; padding: 4px;">&nbsp;</td></tr>
      <tr><td style="border: 1px solid #444; padding: 4px;">&nbsp;</td><td style="border: 1px solid #444; padding: 4px;">&nbsp;</td><td style="border: 1px solid #444; padding: 4px;">&nbsp;</td></tr>
    </tbody></table><p></p>`
    editor.chain().focus().insertContent(html).run()
  }
  function insertImage() {
    const url = window.prompt('Image URL:')
    if (url && editor) {
      editor.chain().focus().insertContent(`<img src="${url}" alt="" style="max-width: 100%;" /><p></p>`).run()
    }
  }
  function insertLink() {
    const url = window.prompt('Link URL:')
    if (url && editor) {
      const selected = editor.getText() || url
      editor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #c9a96e; text-decoration: underline;">${selected}</a>`).run()
    }
  }

  // ─── Chapter Slicing (non-destructive) ───
  async function runChapterSlicer(opts: { mode: 'fixed-count' | 'words-per'; count?: number; words?: number }) {
    if (!editor) return
    // Get the FULL WRITING text (NOT the editor's current content — that would mutate it).
    // We use the cached full-writing content; if missing, fall back to editor HTML.
    const fullHtml = tabContent['full-writing'] || editor.getHTML()
    const fullText = fullHtml.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim()
    const words = fullText.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      toast.error('Full Writing is empty — write something before slicing.')
      return
    }

    let sliceCount = 0
    const newChapters: Chapter[] = []
    if (opts.mode === 'fixed-count' && opts.count && opts.count > 0) {
      const per = Math.ceil(words.length / opts.count)
      for (let i = 0; i < opts.count; i++) {
        const slice = words.slice(i * per, (i + 1) * per).join(' ')
        if (slice.trim()) {
          newChapters.push({
            id: `ch_${Date.now()}_${i}`,
            name: `Chapter ${chapters.length + i + 1}`,
            content: `<p>${slice.replace(/\n/g, '</p><p>')}</p>`,
          })
          sliceCount++
        }
      }
    } else if (opts.mode === 'words-per' && opts.words && opts.words > 0) {
      const per = opts.words
      const total = Math.ceil(words.length / per)
      for (let i = 0; i < total; i++) {
        const slice = words.slice(i * per, (i + 1) * per).join(' ')
        if (slice.trim()) {
          newChapters.push({
            id: `ch_${Date.now()}_${i}`,
            name: `Chapter ${chapters.length + i + 1}`,
            content: `<p>${slice.replace(/\n/g, '</p><p>')}</p>`,
          })
          sliceCount++
        }
      }
    }

    // Create in safe batches. A checkpoint lets a very large manuscript resume
    // after a browser/network interruption without duplicating completed slices.
    if (projectId) {
      try {
        const fingerprint = `${projectId}:${words.length}:${opts.mode}:${opts.count || opts.words || 0}`
        const stored = localStorage.getItem(SLICER_CHECKPOINT_KEY)
        const checkpoint = stored ? JSON.parse(stored) as { fingerprint?: string; nextIndex?: number } : {}
        const startIndex = checkpoint.fingerprint === fingerprint ? Math.max(0, checkpoint.nextIndex || 0) : 0
        if (startIndex > 0) toast.info(`Resuming chapter slicer from chapter ${startIndex + 1}.`)
        const batchSize = 25
        for (let index = startIndex; index < newChapters.length; index += batchSize) {
          const batch = newChapters.slice(index, index + batchSize)
          setSlicerProgress(`Creating chapters ${index + 1}-${Math.min(index + batch.length, newChapters.length)} of ${newChapters.length}…`)
          const response = await fetch(`/api/projects/${projectId}/chapters`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapters: batch.map((chapter) => ({ content: chapter.content })) }),
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || 'Unable to save chapters')
          const persisted = (data.chapters || []).map((chapter: { id: string; title: string; content: string }) => ({ id: chapter.id, name: chapter.title, content: chapter.content }))
          setChapters((prev) => [...prev, ...persisted])
          localStorage.setItem(SLICER_CHECKPOINT_KEY, JSON.stringify({ fingerprint, nextIndex: index + batch.length }))
        }
        localStorage.removeItem(SLICER_CHECKPOINT_KEY)
      } catch (err) {
        setSlicerProgress(null)
        toast.error(err instanceof Error ? err.message : 'Unable to save chapter slices.')
        return
      }
    } else {
      setChapters((prev) => [...prev, ...newChapters])
    }
    // Insert a visual bookmark divider where slicing ended in the Full Writing
    setImportMarker(wordCount)
    setSlicerProgress(null)
    toast.success(
      `Sliced ${sliceCount} chapter${sliceCount !== 1 ? 's' : ''}. Original Full Writing is preserved.`
    )
  }

  return (
    <div className="h-full flex flex-col bg-black text-zinc-200 overflow-hidden">
      {/* ═══ GOOGLE DOCS-STYLE TOP TOOLBAR ═══ */}
      <div className="shrink-0 border-b border-[#1a1a1a] bg-black">
        <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto lc-scroll">
          <ToolbarButton icon={Undo2} onClick={() => execCommand('undo')} title="Undo" />
          <ToolbarButton icon={Redo2} onClick={() => execCommand('redo')} title="Redo" />
          <ToolbarButton icon={Printer} onClick={() => execCommand('print')} title="Print" />
          <ToolbarButton
            icon={Paintbrush}
            onClick={() => toast.info('Format painter: select target text, then re-apply last style.')}
            title="Format Painter"
          />
          <Divider />
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-zinc-400 font-mono w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
          <Divider />
          {/* Text Style (headings) */}
          <select
            onChange={(e) => execCommand(e.target.value)}
            className="bg-zinc-950 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-zinc-700"
            defaultValue="paragraph"
          >
            <option value="paragraph">Body Text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
          </select>
          <Divider />
          <ToolbarButton icon={Table} onClick={insertTable} title="Insert Table" />
          <ToolbarButton icon={ImageIcon} onClick={insertImage} title="Insert Image" />
          <ToolbarButton icon={LinkIcon} onClick={insertLink} title="Insert Link" />
        </div>
      </div>

      {/* ═══ MAIN BODY: 3-COLUMN ═══ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ═══ LEFT SIDEBAR: 12 CORE TABS ═══ */}
        <div
          className={cn(
            'shrink-0 bg-black border-r border-[#1a1a1a] flex flex-col transition-all duration-200',
            // Desktop: collapse to 0 or expand to w-64
            // Mobile: hidden by default, overlay when expanded
            'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[10000] max-md:w-[260px] max-md:shadow-2xl',
            sidebarCollapsed ? 'w-0 overflow-hidden max-md:hidden' : 'w-64 max-md:flex'
          )}
        >
          {/* Project header with hamburger toggle */}
          <div className="px-3 py-3 border-b border-[#1a1a1a]">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">Active Project</p>
              <div className="flex items-center gap-1"><button onClick={() => setShowReviewInbox(true)} className="relative rounded p-1 text-zinc-600 transition hover:bg-zinc-900 hover:text-zinc-300" title="Open review inbox"><Inbox className="h-3.5 w-3.5" />{reviewSuggestions.length > 0 && <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">{reviewSuggestions.length > 9 ? '9+' : reviewSuggestions.length}</span>}</button><button onClick={() => setSidebarCollapsed(true)} className="rounded p-1 text-zinc-600 transition hover:bg-zinc-900 hover:text-zinc-300" title="Collapse sidebar"><Menu className="h-3.5 w-3.5" /></button></div>
            </div>
            <p className="text-[12px] text-zinc-200 truncate font-medium">{projectName}</p>
          </div>

          {/* 12 core tabs */}
          <div className="flex-1 overflow-y-auto lc-scroll py-2">
            {CORE_TABS.map((tab) => {
              const missing = missingCounts[tab.id] || 0
              return (
                <div key={tab.id}>
                  <button
                    onClick={() => {
                      setActiveTabId(tab.id)
                      setActiveChapter(null)
                      if (tab.id === 'full-writing') setChaptersExpanded((current) => !current)
                    }}
                    className={cn(
                      'group w-full flex items-center gap-2 px-3 py-2 text-left transition',
                      activeTabId === tab.id
                        ? 'bg-zinc-900 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950'
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[12px] flex-1 truncate">{tab.name}</span>
                    {tab.id === 'full-writing' && (chaptersExpanded ? <ChevronDown className="h-3 w-3 text-zinc-600" /> : <ChevronRight className="h-3 w-3 text-zinc-600" />)}
                    {/* Dynamic glowing red dot — appears only when missing > 0, hides when 0 */}
                    {missing > 0 && (
                      <span
                        className="relative shrink-0 flex items-center justify-center"
                        title={`${missing} missing field${missing !== 1 ? 's' : ''}`}
                      >
                        <span className="absolute w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
                        <span className="relative w-2 h-2 rounded-full bg-red-500" />
                        <span className="absolute -top-3 -right-2 text-[8px] font-mono text-red-300 font-bold">
                          {missing}
                        </span>
                      </span>
                    )}
                    {reviewCounts[tab.id] > 0 && (
                      <span className="relative ml-1 flex h-2 w-2 shrink-0" title={`${reviewCounts[tab.id]} review suggestion${reviewCounts[tab.id] === 1 ? '' : 's'} pending`}>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
                      </span>
                    )}
                  </button>

                  {/* Full Writing nested chapters */}
                  {tab.id === 'full-writing' && chaptersExpanded && (
                    <div className="ml-6 mt-1 mb-2 space-y-0.5">
                      {chapters.length === 0 && (
                        <p className="text-[10px] text-zinc-700 px-2 py-1 italic">No chapters yet.</p>
                      )}
                      {(showAllChapters ? chapters : chapters.slice(0, 8)).map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => { setActiveTabId('full-writing'); setActiveChapter(ch.id) }}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1 text-left transition rounded',
                            activeChapter === ch.id
                              ? 'bg-zinc-800 text-zinc-200'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950'
                          )}
                        >
                          <ChevronRight className="w-3 h-3" />
                          <span className="text-[11px]">{ch.name}</span>
                        </button>
                      ))}
                      {chapters.length > 8 && <button onClick={() => setShowAllChapters((current) => !current)} className="w-full px-2 py-1 text-left text-[10px] text-zinc-500 hover:text-purple-300">{showAllChapters ? 'Show less' : `Show more (${chapters.length - 8})`}</button>}
                      <button
                        onClick={() => setShowChapterWizard(true)}
                        className="w-full flex items-center gap-2 px-2 py-1 text-left transition rounded text-purple-400 hover:bg-purple-500/10"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="text-[11px]">Slice into chapters</span>
                      </button>
                      {chapters.length > 0 && <button onClick={() => setShowDeleteAllChapters(true)} className="w-full flex items-center gap-2 px-2 py-1 text-left transition rounded text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /><span className="text-[11px]">Delete all sliced chapters</span></button>}
                      {deletingChapters && <p className="px-2 py-1 text-[10px] text-amber-300">{deletingChapters}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Semantic Scene Search */}
          <div className="border-t border-[#1a1a1a] p-2 relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
              <input
                value={sceneSearch}
                onChange={(e) => {
                  setSceneSearch(e.target.value)
                  runSceneSearch(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    runSceneSearch(sceneSearch)
                  }
                }}
                placeholder="Scene search..."
                className="w-full bg-zinc-950 border border-[#1a1a1a] pl-7 pr-2 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded"
              />
            </div>
            <p className="text-[9px] text-zinc-700 mt-1 px-1">
              Semantic search across Full Writing & chapters
            </p>

            {/* Search results — dual-grouped: FULL Writing + Chapters */}
            {showSceneResults && sceneResults.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl max-h-72 overflow-y-auto lc-scroll z-50">
                {sceneResults.some((r) => r.group === 'FULL Writing') && (
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 px-2 py-1 bg-zinc-900/50 border-b border-[#1a1a1a]">
                      Full Writing
                    </p>
                    {sceneResults
                      .filter((r) => r.group === 'FULL Writing')
                      .map((r, i) => (
                        <button
                          key={`fw-${i}`}
                          onClick={() => scrollToMatch(r)}
                          className="block w-full text-left px-2 py-1.5 hover:bg-zinc-900 transition"
                        >
                          <p className="text-[10px] text-zinc-300 leading-snug line-clamp-2">{r.snippet}</p>
                        </button>
                      ))}
                  </div>
                )}
                {sceneResults.some((r) => r.group === 'Chapters') && (
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 px-2 py-1 bg-zinc-900/50 border-b border-[#1a1a1a]">
                      Chapters
                    </p>
                    {sceneResults
                      .filter((r) => r.group === 'Chapters')
                      .map((r, i) => (
                        <button
                          key={`ch-${i}`}
                          onClick={() => scrollToMatch(r)}
                          className="block w-full text-left px-2 py-1.5 hover:bg-zinc-900 transition"
                        >
                          <p className="text-[9px] text-zinc-500 mb-0.5">{r.chapterName}</p>
                          <p className="text-[10px] text-zinc-300 leading-snug line-clamp-2">{r.snippet}</p>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
            {showSceneResults && sceneResults.length === 0 && sceneSearch.trim() && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl p-2 z-50">
                <p className="text-[10px] text-zinc-600 italic">No matches found.</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ VERTICAL FORMATTING TOOLBAR (anchored on the LEFT side of editor, desktop only) ═══ */}
        <div className="shrink-0 w-10 bg-black border-r border-[#1a1a1a] flex-col items-center py-2 gap-0.5 overflow-y-auto lc-scroll hidden md:flex">
          <VerticalToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="Bold" />
          <VerticalToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="Italic" />
          <VerticalToolbarButton
            icon={UnderlineIcon}
            onClick={() => execCommand('underline')}
            title="Underline"
          />
          <VerticalDivider />
          {/* Font family */}
          <select
            onChange={(e) => {
              if (!editor) return
              const selected = editor.getText() || 'sample text'
              editor.chain().focus().insertContent(`<span style="font-family: ${e.target.value};">${selected}</span>`).run()
            }}
            className="bg-zinc-950 border border-[#1a1a1a] text-[9px] text-zinc-300 rounded px-1 py-0.5 focus:outline-none w-9"
            title="Font Family"
            defaultValue="Georgia"
          >
            <option>Georgia</option>
            <option>Inter</option>
            <option>Mono</option>
            <option>Serif</option>
          </select>
          {/* Font size */}
          <select
            onChange={(e) => {
              if (!editor) return
              const selected = editor.getText() || 'sample text'
              editor.chain().focus().insertContent(`<span style="font-size: ${e.target.value};">${selected}</span>`).run()
            }}
            className="bg-zinc-950 border border-[#1a1a1a] text-[9px] text-zinc-300 rounded px-1 py-0.5 focus:outline-none w-9"
            title="Font Size"
            defaultValue="16px"
          >
            <option>12px</option>
            <option>14px</option>
            <option>16px</option>
            <option>18px</option>
            <option>24px</option>
          </select>
          <VerticalDivider />
          {/* Text Color */}
          <div className="relative group">
            <button
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition flex items-center justify-center"
              title="Text Color"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <div className="absolute left-full top-0 ml-1 hidden group-hover:flex flex-wrap gap-1 p-2 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl z-[100] w-40">
              {['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#737373'].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => execCommand('color', c)}
                    className="w-5 h-5 rounded-full border border-[#1a1a1a]"
                    style={{ backgroundColor: c }}
                  />
                )
              )}
            </div>
          </div>
          <VerticalToolbarButton
            icon={Highlighter}
            onClick={() => execCommand('highlight')}
            title="Highlight"
          />
          <VerticalDivider />
          <VerticalToolbarButton icon={List} onClick={() => execCommand('bulletList')} title="Bullet List" />
          <VerticalToolbarButton
            icon={ListOrdered}
            onClick={() => execCommand('orderedList')}
            title="Numbered List"
          />
          <VerticalDivider />
          <VerticalToolbarButton icon={AlignLeft} onClick={() => execCommand('alignLeft')} title="Align Left" />
          <VerticalToolbarButton
            icon={AlignCenter}
            onClick={() => execCommand('alignCenter')}
            title="Align Center"
          />
          <VerticalToolbarButton icon={AlignRight} onClick={() => execCommand('alignRight')} title="Align Right" />
        </div>

        {/* ═══ CENTER EDITOR ═══ */}
        <div
          ref={editorContainerRef}
          className="flex-1 flex flex-col overflow-hidden bg-black"
          style={{ zoom: `${zoom}%` }}
        >
          {/* Tab header */}
          <div className="shrink-0 px-6 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Show expand-sidebar button when collapsed */}
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition"
                  title="Expand sidebar"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
              <activeTab.icon className="w-4 h-4 text-zinc-400" />
              <h2 className="text-[13px] font-medium text-zinc-200">
                {activeChapter
                  ? chapters.find((c) => c.id === activeChapter)?.name || activeTab.name
                  : activeTab.name}
              </h2>
              {activeTabId !== 'full-writing' && !activeChapter && (
                <button onClick={() => openTabRefresh(activeTabId, activeTab.name)} disabled={refreshingTabKey !== null} title="Review Full Writing for this tab" className="inline-flex items-center gap-1 rounded border border-purple-500/25 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-50">
                  <RefreshCw className={cn('h-3 w-3', refreshingTabKey === activeTabId && 'animate-spin')} />
                  {refreshingTabKey === activeTabId ? 'Reviewing…' : 'Refresh tab'}
                </button>
              )}
              {activeChapter && (
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-[10px] text-zinc-600 mr-1">
                    {(chapters.find((chapter) => chapter.id === activeChapter)?.content || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                  </span>
                  <button onClick={() => moveActiveChapter(-1)} className="px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded" title="Move chapter up">↑</button>
                  <button onClick={() => moveActiveChapter(1)} className="px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded" title="Move chapter down">↓</button>
                  <button onClick={renameActiveChapter} className="px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded">Rename</button>
                  <button onClick={deleteActiveChapter} className="px-1.5 py-0.5 text-[10px] text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded">Delete</button>
                </div>
              )}
            </div>
            <div className="hidden md:flex items-center gap-3 text-[10px]">
              <p className="text-zinc-600">{activeTab.description}</p>
              <span className={cn(
                'font-mono',
                saveState === 'error' ? 'text-red-400' : saveState === 'saving' ? 'text-amber-400' : 'text-emerald-500/80'
              )}>
                {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}
              </span>
            </div>
          </div>

          {activeTabId === 'full-writing' && (
            <div className="shrink-0 border-b border-[#1a1a1a] bg-zinc-950/60 px-6 py-2">
              <div className="grid max-w-md grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-[10px]">
                <span className="font-mono uppercase tracking-wider text-zinc-600">AI section</span>
                <select value={selectedManuscriptSection} onChange={(event) => setSelectedManuscriptSection(Number(event.target.value))} disabled={manuscriptSections.length === 0} className="min-w-0 rounded border border-[#252525] bg-black px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-purple-500/60 disabled:text-zinc-600">
                  {manuscriptSections.length === 0 ? <option value={0}>No writing yet</option> : manuscriptSections.map((section) => <option key={section.index} value={section.index}>SECTION {section.index + 1} — {section.wordCount.toLocaleString()} words</option>)}
                </select>
                <span className="font-mono uppercase tracking-wider text-zinc-600">Section size</span>
                <span className="text-zinc-400">10,000 words per section</span>
                <span className="font-mono uppercase tracking-wider text-zinc-600">Co-pilot</span>
                <span className="text-zinc-500">Selected section is included when you message the co-pilot.</span>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto lc-scroll">
            {activeTabId === 'full-writing' ? (
              <div className="max-w-3xl mx-auto py-8 px-12">
                {activeChapter ? (
                  <div
                    className="prose prose-invert max-w-none text-zinc-200 leading-relaxed min-h-[560px] focus:outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(event) => { saveChapterContent(activeChapter, event.currentTarget.innerHTML); signalWriting() }}
                    dangerouslySetInnerHTML={{
                      __html:
                        chapters.find((c) => c.id === activeChapter)?.content ||
                        '<p class="text-zinc-500 italic">This chapter has no content yet.</p>',
                    }}
                  />
                ) : (
                  editor && <EditorContent editor={editor} />
                )}

                {/* Import marker / slicing bookmark */}
                {importMarker !== null && (
                  <div className="my-6 flex items-center gap-3 text-[10px] text-purple-400 font-mono">
                    <span>✓ Slicing bookmark — original preserved above</span>
                    <div className="flex-1 border-t border-dashed border-purple-500/30" />
                  </div>
                )}

                {/* Bottom status */}
                <div className="sticky bottom-0 mt-12 py-2 flex items-center justify-between text-[10px] text-zinc-600 bg-black border-t border-[#1a1a1a]">
                  <span>
                    {wordCount.toLocaleString()} words · {pageCount} page{pageCount !== 1 ? 's' : ''}
                  </span>
                  <span className="font-mono">{Math.ceil(wordCount / 250)} min read</span>
                </div>
              </div>
            ) : activeTabId === 'character-creation' ? (
              <CharacterCreationView />
            ) : (
              <PlaceholderTabView tab={activeTab} missing={missingCounts[activeTab.id] || 0} />
            )}
          </div>
        </div>

        {/* Resize handle — desktop only */}
        <div
          className="w-1 bg-[#1a1a1a] hover:bg-purple-500/40 cursor-ew-resize transition shrink-0 max-lg:hidden"
          onMouseDown={(e) => {
            dragRef.current = { startX: e.clientX, startW: copilotWidth }
          }}
        />

        {/* ═══ RIGHT: PERMANENT AI CO-PILOT (locked to gemini-3.1-pro-preview) ═══ */}
        <div
          className="shrink-0 bg-black border-l border-[#1a1a1a] flex flex-col max-lg:hidden"
          style={{ width: copilotWidth }}
        >
          {/* Header */}
          <div className="h-12 flex items-center gap-2 px-4 border-b border-[#1a1a1a] shrink-0">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="text-[12px] font-semibold text-zinc-200">AI Co-Pilot</span>
            <span
              className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded ml-auto"
              title="Locked to gemini-3.1-pro-preview for project context"
            >
              {projectName.slice(0, 12)}
              {projectName.length > 12 ? '…' : ''}
            </span>
          </div>

          {/* Messages */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto lc-scroll px-3 py-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] px-3 py-2 rounded-lg text-[12px] leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-purple-600/15 border border-purple-500/20 text-zinc-100 rounded-br-sm'
                      : 'bg-zinc-950 border border-[#1a1a1a] text-zinc-300 rounded-bl-sm'
                  )}
                >
                  {editingMessageId === msg.id ? <div className="space-y-1"><textarea value={editingMessageText} onChange={(event) => setEditingMessageText(event.target.value)} className="w-full rounded bg-black/30 p-2 text-[12px] text-zinc-100 outline-none" /><div className="flex gap-1"><button onClick={() => saveChatEdit(msg.id)} title="Save edit" className="p-1 text-emerald-300"><Check className="h-3 w-3" /></button><button onClick={() => setEditingMessageId(null)} title="Cancel edit" className="p-1 text-zinc-400"><X className="h-3 w-3" /></button></div></div> : <><span>{msg.content}</span><div className="mt-1 flex justify-end gap-1 border-t border-zinc-800/60 pt-1"><button onClick={() => copyChatMessage(msg.id, msg.content)} title="Copy message" className="p-1 text-zinc-600 hover:text-zinc-200">{copiedMessageId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Clipboard className="h-3 w-3" />}</button>{msg.role === 'assistant' && <><button onClick={() => setMessageFeedback((current) => ({ ...current, [msg.id]: 'up' }))} title="Helpful" className={cn('p-1 hover:text-zinc-200', messageFeedback[msg.id] === 'up' ? 'text-emerald-400' : 'text-zinc-600')}><ThumbsUp className="h-3 w-3" /></button><button onClick={() => setMessageFeedback((current) => ({ ...current, [msg.id]: 'down' }))} title="Not helpful" className={cn('p-1 hover:text-zinc-200', messageFeedback[msg.id] === 'down' ? 'text-red-400' : 'text-zinc-600')}><ThumbsDown className="h-3 w-3" /></button><button onClick={() => restoreCoPilotPrompt(msg.id)} title="Restore the prompt to send again" className="p-1 text-zinc-600 hover:text-zinc-200"><RefreshCw className="h-3 w-3" /></button></>}<button onClick={() => { setEditingMessageId(msg.id); setEditingMessageText(msg.content) }} title="Edit message" className="p-1 text-zinc-600 hover:text-zinc-200"><Pencil className="h-3 w-3" /></button></div></>}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 pl-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Analyzing project data...</span>
              </div>
            )}

            {/* Quick-action buttons (shown initially) */}
            {messages.length === 1 && !sending && (
              <div className="space-y-1.5 pt-2">
                <CoPilotQuickBtn
                  text="Continue writing?"
                  onClick={() => handleChatSend('Continue writing from where I stopped.')}
                />
                <CoPilotQuickBtn
                  text="Fix pacing?"
                  onClick={() => handleChatSend('Help me fix the pacing of the current chapter.')}
                />
                <CoPilotQuickBtn
                  text="Check world consistency?"
                  onClick={() => handleChatSend('Scan the Story Bible and Full Writing for any worldbuilding inconsistencies.')}
                />
                <CoPilotQuickBtn
                  text="Brainstorm a twist?"
                  onClick={() => handleChatSend('Brainstorm an unexpected plot twist based on existing characters and lore.')}
                />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[#1a1a1a] p-3">
            {slicerProgress && <p className="mb-2 text-[10px] text-amber-300">{slicerProgress}</p>}
            <div className="bg-zinc-950 border border-[#1a1a1a] rounded-3xl shadow-xl focus-within:border-[var(--accent-color)] focus-within:ring-1 focus-within:ring-[var(--accent-color)] transition-[border-color,box-shadow] duration-150">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleChatSend()
                  }
                }}
                placeholder="Ask about your project..."
                className="w-full bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none px-3 pt-2.5 pb-1 max-h-32"
                rows={1}
              />
              <div className="flex items-center justify-between px-2 py-1.5">
                {/* Expand modal trigger — only renders when text > 3 lines */}
                {chatInput.split('\n').length > 3 || chatInput.length > 140 ? (
                  <button
                    onClick={() => setShowChatExpand(true)}
                    className="p-1 text-zinc-600 hover:text-zinc-300 transition"
                    title="Expand to full screen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button className="p-1 text-zinc-600 hover:text-zinc-300 transition" title="Add attachment">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleChatSend()}
                  disabled={!chatInput.trim() || sending}
                  className={cn(
                    'p-1.5 rounded-lg transition',
                    chatInput.trim() && !sending
                      ? 'btn-accent hover:brightness-110'
                      : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                  )}
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CHAPTER SLICER WIZARD ═══ */}
      <AnimatePresence>
        {showChapterWizard && (
          <ChapterSlicerWizard
            onClose={() => setShowChapterWizard(false)}
            onComplete={(opts) => {
              runChapterSlicer(opts)
              setShowChapterWizard(false)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {largePasteWords !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10030] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-2xl border border-purple-500/30 bg-zinc-950 p-5 shadow-2xl">
              <h3 className="text-base font-semibold text-zinc-100">Large manuscript update detected</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">You pasted about {largePasteWords.toLocaleString()} words into Full Writing. Would you like to prepare an AI review for new characters, powers, locations, lore, timeline events, and plot threads?</p>
              <p className="mt-2 text-[11px] text-amber-300">Reviewing uses Gemini once, only after you choose Review now. Nothing is written into your project automatically.</p>
              <div className="mt-5 flex justify-end gap-2"><button disabled={isReviewing} onClick={() => { setLargePasteWords(null); setPastedReviewText('') }} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 disabled:opacity-50">Not now</button><button disabled={isReviewing} onClick={() => { const text = pastedReviewText; setLargePasteWords(null); setPastedReviewText(''); void runManuscriptReview(text) }} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{isReviewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Review now</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteAllChapters && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10040] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowDeleteAllChapters(false)}><motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 p-5 shadow-2xl"><h3 className="text-base font-semibold text-zinc-100">Delete all sliced chapters?</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">This deletes the {chapters.length} chapter copies created by the slicer. Your Full Writing manuscript will remain exactly as it is.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowDeleteAllChapters(false)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Cancel</button><button onClick={() => void deleteAllSlicedChapters()} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700">Delete chapters</button></div></motion.div></motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {refreshTarget && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10040] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setRefreshTarget(null)}><motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl border border-purple-500/30 bg-zinc-950 p-5 shadow-2xl"><h3 className="text-base font-semibold text-zinc-100">Review Full Writing for {refreshTarget.tabName}?</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">This uses Gemini credit and creates review cards only. Nothing is added to {refreshTarget.tabName} until you approve each card.</p><p className="mt-2 text-[11px] text-amber-300">For credit safety, one refresh reviews up to three manuscript chunks.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={() => setRefreshTarget(null)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Cancel</button>{refreshTarget.savedOffset > 0 && <button onClick={() => void runTabRefresh(0)} className="rounded-lg border border-purple-500/40 px-3 py-2 text-xs text-purple-200">Restart</button>}<button onClick={() => void runTabRefresh(refreshTarget.savedOffset)} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white">{refreshTarget.savedOffset > 0 ? 'Continue review' : 'Start review'}</button></div></motion.div></motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {showReviewInbox && <ReviewInbox suggestions={reviewSuggestions} onApprove={approveReviewSuggestion} onReject={(id) => setReviewSuggestions((current) => current.filter((item) => item.id !== id))} onClearAll={() => setReviewSuggestions([])} onClose={() => setShowReviewInbox(false)} />}
      </AnimatePresence>

      {/* ═══ CHAT EXPAND MODAL ═══ */}
      <AnimatePresence>
        {showChatExpand && (
          <ChatExpandModal
            initialText={chatInput}
            onClose={() => setShowChatExpand(false)}
            onSave={(text) => {
              setChatInput(text)
              setShowChatExpand(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Character Creation View ───
function CharacterCreationView() {
  const [subMode, setSubMode] = useState<'profiles' | 'creator'>('profiles')
  const [characters, setCharacters] = useState<{ id: string; name: string; bio: string }[]>([])
  const [newCharName, setNewCharName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  async function generateImage() {
    if (!prompt.trim()) {
      toast.error('Enter a prompt first.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negative_prompt: 'low quality, blurry, distorted',
          aspect_ratio: '2:3',
        }),
      })
      const data = await res.json()
      if (data?.image) {
        setGeneratedImage(data.image)
        toast.success('Image generated.')
      } else {
        toast.error(data?.error || 'Image generation failed.')
      }
    } catch {
      toast.error('Network error during image generation.')
    } finally {
      setGenerating(false)
    }
  }

  function addCharacter() {
    if (!newCharName.trim()) return
    setCharacters((prev) => [
      ...prev,
      { id: `c_${Date.now()}`, name: newCharName.trim(), bio: '' },
    ])
    setNewCharName('')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sub-mode tabs */}
      <div className="flex border-b border-[#1a1a1a] shrink-0">
        {(
          [
            { id: 'profiles', label: 'Character Profiles' },
            { id: 'creator', label: 'Character Creator' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSubMode(t.id)}
            className={cn(
              'px-4 py-2.5 text-[11px] font-medium transition',
              subMode === t.id ? 'text-zinc-200 border-b border-purple-500' : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 pt-4 pb-2 border-b border-[#1a1a1a]/50">
        <h3 className="text-[14px] font-semibold text-zinc-200">Character Creation</h3>
        <p className="text-[11px] text-zinc-500">
          Manage character profiles, relationship charts, and backstory bibles.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto lc-scroll p-6">
        {subMode === 'profiles' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-[12px] text-zinc-500">
              Comprehensive fields for relationship charts, outfits, expressions, personality, backstory, and weaknesses.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {characters.length === 0 && (
                <p className="col-span-full text-center py-8 text-zinc-600 text-xs">
                  No characters yet. Add your first character below.
                </p>
              )}
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="bg-zinc-950 border border-[#1a1a1a] rounded-lg p-3 hover:border-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center">
                      <span className="text-[12px] font-serif text-zinc-300">
                        {char.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[12px] text-zinc-200 font-medium">{char.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600">Click to view full profile</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCharacter()
                }}
                placeholder="New character name..."
                className="flex-1 bg-zinc-950 border border-[#1a1a1a] px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
              />
              <button
                onClick={addCharacter}
                className="border border-dashed border-[#1a1a1a] rounded-lg px-3 py-2 flex items-center gap-1 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[11px]">Add</span>
              </button>
            </div>
          </div>
        )}

        {subMode === 'creator' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-[12px] text-zinc-500">
              Text-to-image prompts for expression generators, clothing generators, and weapon generators. Routes through the unrestricted image API.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Kael in formal court attire, expression serious, holding ancestral sword..."
                  className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg min-h-[80px]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrompt((p) => p + ' [expression sheet]')}
                  className="px-3 py-1.5 bg-zinc-900 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded-md hover:bg-zinc-800"
                >
                  Expression
                </button>
                <button
                  onClick={() => setPrompt((p) => p + ' [clothing design]')}
                  className="px-3 py-1.5 bg-zinc-900 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded-md hover:bg-zinc-800"
                >
                  Clothing
                </button>
                <button
                  onClick={() => setPrompt((p) => p + ' [weapon concept]')}
                  className="px-3 py-1.5 bg-zinc-900 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded-md hover:bg-zinc-800"
                >
                  Weapon
                </button>
                <button
                  onClick={generateImage}
                  disabled={generating}
                  className="px-3 py-1.5 bg-purple-600 text-white text-[11px] rounded-md hover:bg-purple-700 ml-auto disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
              {generatedImage && (
                <div className="mt-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-2">Result</p>
                  { }
                  <img
                    src={generatedImage}
                    alt="Generated character"
                    className="max-w-full rounded-lg border border-[#1a1a1a]"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Placeholder Tab View ───
function PlaceholderTabView({ tab, missing }: { tab: CoreTab; missing: number }) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-12">
      <div className="mb-6">
        <h2 className="text-xl font-serif text-zinc-100 mb-1">{tab.name}</h2>
        <p className="text-[12px] text-zinc-500">{tab.description}</p>
      </div>
      {missing > 0 && (
        <div className="mb-6 bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-[12px] text-red-300 font-medium">
              {missing} missing field{missing !== 1 ? 's' : ''}
            </p>
          </div>
          <p className="text-[11px] text-zinc-500">
            Start writing in this tab to clear the alert. The red dot will disappear once the section has enough content.
          </p>
        </div>
      )}
      <div className="bg-zinc-950 border border-[#1a1a1a] rounded-lg p-8 text-center">
        <tab.icon className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
        <p className="text-[12px] text-zinc-600">
          This section is ready for content. Use the AI Co-Pilot on the right to start building.
        </p>
      </div>
    </div>
  )
}

// ─── Chapter Slicer Wizard ───
function ChapterSlicerWizard({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: (opts: { mode: 'fixed-count' | 'words-per'; count?: number; words?: number }) => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [autoEnabled, setAutoEnabled] = useState(true)
  const [hasCount, setHasCount] = useState<'yes' | 'no' | null>(null)
  const [count, setCount] = useState<number>(10)
  const [wordsPer, setWordsPer] = useState<number>(2000)

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
        className="bg-zinc-900 border border-[#1a1a1a] rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a]">
          <h3 className="text-[13px] font-semibold text-zinc-200">Chapter Organization Wizard</h3>
          <button onClick={onClose} className="p-1 text-zinc-600 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[13px] text-zinc-300">
                Would you like automatic chapter organization?
              </p>
              <p className="text-[11px] text-zinc-600">
                The AI will preserve your original Full Writing exactly as it is and only copy chunks into new Chapter sub-tabs. Your source text is never modified or deleted.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAutoEnabled(true)
                    setStep(2)
                  }}
                  className={cn(
                    'flex-1 py-2.5 text-[12px] rounded-lg border transition',
                    autoEnabled
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                      : 'border-[#1a1a1a] text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  Yes, automatic
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-[12px] rounded-lg border border-[#1a1a1a] text-zinc-400 hover:text-zinc-200"
                >
                  No, manual
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-zinc-300">Have you decided how many chapters?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setHasCount('yes')
                    setStep(3)
                  }}
                  className="flex-1 py-2.5 text-[12px] rounded-lg border border-[#1a1a1a] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                >
                  Yes, I know
                </button>
                <button
                  onClick={() => {
                    setHasCount('no')
                    setStep(3)
                  }}
                  className="flex-1 py-2.5 text-[12px] rounded-lg border border-[#1a1a1a] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                >
                  No, by word count
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {hasCount === 'yes' ? (
                <>
                  <p className="text-[13px] text-zinc-300">How many chapters?</p>
                  <input
                    type="number"
                    min={1}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-2 text-[13px] text-zinc-200 focus:border-zinc-700 focus:outline-none rounded-lg"
                  />
                </>
              ) : (
                <>
                  <p className="text-[13px] text-zinc-300">Words per chapter?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[500, 1000, 2000, 5000].map((w) => (
                      <button
                        key={w}
                        onClick={() => setWordsPer(w)}
                        className={cn(
                          'py-2 text-[12px] rounded-lg border transition',
                          wordsPer === w
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                            : 'border-[#1a1a1a] text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        {w.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    placeholder="Custom"
                    onChange={(e) => setWordsPer(parseInt(e.target.value) || 2000)}
                    className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg"
                  />
                </>
              )}

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <p className="text-[11px] text-amber-300 leading-relaxed">
                  ⚠ Your original Full Writing will be preserved exactly as it is. The slicer copies chunks into new Chapter sub-tabs and inserts a visual bookmark divider where slicing ended — no destructive edits.
                </p>
              </div>

              <button
                onClick={() =>
                  onComplete(
                    hasCount === 'yes'
                      ? { mode: 'fixed-count', count }
                      : { mode: 'words-per', words: wordsPer }
                  )
                }
                className="w-full py-2.5 bg-purple-600 text-white text-[12px] font-medium uppercase tracking-wider rounded-lg hover:bg-purple-700 transition"
              >
                Run Slicer
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Chat Expand Modal (full-screen) ───
function ChatExpandModal({
  initialText,
  onClose,
  onSave,
}: {
  initialText: string
  onClose: () => void
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(initialText)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[25000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.96 }}
        className="bg-zinc-900 border border-[#1a1a1a] rounded-xl shadow-2xl max-w-3xl w-full h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a]">
          <h3 className="text-[13px] font-semibold text-zinc-200">Expand message</h3>
          <button onClick={onClose} className="p-1 text-zinc-600 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          className="flex-1 w-full bg-transparent text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none p-5 leading-relaxed"
          placeholder="Write your full message here..."
        />
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#1a1a1a]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-zinc-400 hover:text-zinc-100 border border-[#1a1a1a] rounded-lg hover:border-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(text)}
            className="px-4 py-2 text-[12px] text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition"
          >
            Save to Chat
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Toolbar Buttons ───
function ToolbarButton({
  icon: Icon,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition shrink-0"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function VerticalToolbarButton({
  icon: Icon,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition shrink-0"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-[#1a1a1a] mx-1 shrink-0" />
}

function VerticalDivider() {
  return <div className="w-6 h-px bg-[#1a1a1a] my-0.5 shrink-0" />
}

// ─── Co-Pilot Quick Button ───
function CoPilotQuickBtn({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 bg-zinc-950 border border-[#1a1a1a] rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900 transition"
    >
      {text}
    </button>
  )
}
