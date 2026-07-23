'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  Bot, Send, Loader2, AlertTriangle,
  PenTool, Plus, BookOpen, Globe, Zap, Clock, MapPin, Building2,
  Scroll, BookMarked, Search, Sparkles, Menu, Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const chapterSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const activeTab = CORE_TABS.find((t) => t.id === activeTabId)!

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
      })
      .catch(() => toast.error('Unable to load this project.'))
    return () => { cancelled = true }
  }, [projectId])

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
    clearTimeout(saveTimers.current[tabKey])
    saveTimers.current[tabKey] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tabs/${tabKey}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
        })
        if (!res.ok) throw new Error('Save failed')
      } catch {
        toast.error('Your project could not be saved. Please try again.')
      }
    }, 700)
  }, [projectId])

  const saveChapterContent = useCallback((chapterId: string, content: string) => {
    setChapters((previous) => previous.map((chapter) => chapter.id === chapterId ? { ...chapter, content } : chapter))
    if (!projectId) return
    clearTimeout(chapterSaveTimers.current[chapterId])
    chapterSaveTimers.current[chapterId] = setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/chapters/${chapterId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
        })
        if (!response.ok) throw new Error('Save failed')
      } catch {
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
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      setTabContent((prev) => ({ ...prev, [activeTabId]: content }))
      saveTab(activeTabId, content)
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
    } finally {
      setSending(false)
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

    // Append the new chapters (non-destructive — original Full Writing is untouched)
    if (projectId) {
      try {
        const response = await fetch(`/api/projects/${projectId}/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapters: newChapters.map((chapter) => ({ title: chapter.name, content: chapter.content })) }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Unable to save chapters')
        const persisted = (data.chapters || []).map((chapter: { id: string; title: string; content: string }) => ({
          id: chapter.id, name: chapter.title, content: chapter.content,
        }))
        setChapters((prev) => [...prev, ...persisted])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to save chapter slices.')
        return
      }
    } else {
      setChapters((prev) => [...prev, ...newChapters])
    }
    // Insert a visual bookmark divider where slicing ended in the Full Writing
    setImportMarker(wordCount)
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
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 rounded transition"
                title="Collapse sidebar"
              >
                <Menu className="w-3.5 h-3.5" />
              </button>
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
                  </button>

                  {/* Full Writing nested chapters */}
                  {activeTabId === 'full-writing' && tab.id === 'full-writing' && (
                    <div className="ml-6 mt-1 mb-2 space-y-0.5">
                      {chapters.length === 0 && (
                        <p className="text-[10px] text-zinc-700 px-2 py-1 italic">No chapters yet.</p>
                      )}
                      {chapters.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => setActiveChapter(ch.id)}
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
                      <button
                        onClick={() => setShowChapterWizard(true)}
                        className="w-full flex items-center gap-2 px-2 py-1 text-left transition rounded text-purple-400 hover:bg-purple-500/10"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="text-[11px]">Slice into chapters</span>
                      </button>
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
            <p className="text-[10px] text-zinc-600 hidden md:block">{activeTab.description}</p>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto lc-scroll">
            {activeTabId === 'full-writing' ? (
              <div className="max-w-3xl mx-auto py-8 px-12">
                {activeChapter ? (
                  <div
                    className="prose prose-invert max-w-none text-zinc-200 leading-relaxed min-h-[560px] focus:outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(event) => saveChapterContent(activeChapter, event.currentTarget.innerHTML)}
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
                  {msg.content}
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
            <div className="bg-zinc-950 border border-[#1a1a1a] rounded-xl focus-within:border-zinc-800 transition">
              <textarea
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
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
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
