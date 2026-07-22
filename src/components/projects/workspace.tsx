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
  Scroll, BookMarked, Search, Sparkles, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── 12 Core Tabs ───
type CoreTab = {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  missing?: number
  description: string
}

const CORE_TABS: CoreTab[] = [
  { id: 'full-writing', name: 'Full Writing', icon: BookOpen, missing: 0, description: 'Main manuscript drafting environment' },
  { id: 'character-creation', name: 'Character Creation', icon: PenTool, missing: 4, description: 'Profiles, relationship maps, and backstory bibles' },
  { id: 'world-building', name: 'World Building', icon: Globe, missing: 2, description: 'Locations, kingdoms, climate, and architecture' },
  { id: 'power-system', name: 'Power System', icon: Zap, missing: 3, description: 'Abilities, magic limits, rankings, and resources' },
  { id: 'timeline', name: 'Timeline', icon: Clock, missing: 0, description: 'Chronological events, ancient histories, and character ages' },
  { id: 'locations', name: 'Locations', icon: MapPin, missing: 0, description: 'Interactive geographical entries and settings' },
  { id: 'organisations', name: 'Organisations', icon: Building2, missing: 1, description: 'Sects, guilds, governments, and factions' },
  { id: 'lore', name: 'Lore', icon: Scroll, missing: 0, description: 'Myths, legends, hidden secrets, and historical records' },
  { id: 'plot', name: 'Plot', icon: BookMarked, missing: 0, description: 'Acts, story arcs, pacing milestones, and twist blueprints' },
  { id: 'research', name: 'Research', icon: Search, missing: 0, description: 'Data, reference links, and background notes' },
  { id: 'publishing', name: 'Publishing', icon: FileText, missing: 0, description: 'Cover design, blurb writing, formatting, and market planning' },
  { id: 'story-bible', name: 'Story Bible', icon: Sparkles, missing: 0, description: 'Master index referencing all concepts' },
]

// ─── Known characters (for auto-tagging) ───
const KNOWN_CHARACTERS: string[] = [] // No mock characters — loaded from project data

type Message = { id: string; role: 'user' | 'assistant'; content: string }

export function ProjectWorkspace({ projectName, projectId }: { projectName: string; projectId?: string }) {
  // ─── State ───
  const [activeTabId, setActiveTabId] = useState('full-writing')
  const [activeChapter, setActiveChapter] = useState<string | null>(null)
  const [chapters, setChapters] = useState<{ id: string; name: string; content: string }[]>([])
  const [tabContent, setTabContent] = useState<Record<string, string>>({})
  const [showChapterWizard, setShowChapterWizard] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [copilotWidth, setCopilotWidth] = useState(320)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [sceneSearch, setSceneSearch] = useState('')
  const [importMarker, setImportMarker] = useState<number | null>(null)

  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const activeTab = CORE_TABS.find((t) => t.id === activeTabId)!

  // ─── AI greeting ───
  useEffect(() => {
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: `Project successfully analyzed. Ready whenever you are.`,
    }])
  }, [projectName])

  // ─── Resizable copilot ───
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return
      const delta = dragRef.current.startX - e.clientX
      setCopilotWidth(Math.max(280, Math.min(640, dragRef.current.startW + delta)))
    }
    function onUp() { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
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
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:text-zinc-600 before:italic before:pointer-events-none before:absolute',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[700px] text-zinc-200 leading-relaxed [&_h1]:text-zinc-100 [&_h1]:text-3xl [&_h1]:font-serif [&_h1]:mb-4 [&_h2]:text-zinc-100 [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:mb-3 [&_p]:mb-4 [&_p]:text-zinc-300 [&_strong]:text-zinc-100 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-purple-500/40 [&_blockquote]:pl-4 [&_blockquote]:italic',
        style: 'font-family: Georgia, serif; font-size: 16px; padding: 0;',
      },
    },
  })

  // ─── Chat handlers (wired to /api/chat with purpose='copilot') ───
  function handleChatSend() {
    if (!chatInput.trim() || sending) return
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: chatInput.trim() }
    setMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setSending(true)

    const assistantId = `a_${Date.now()}`
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    async function streamChat() {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Project Co-Pilot: hardcoded to gemini-2.5-pro + novel-writer
            // system prompt on the backend via purpose: 'copilot'.
            purpose: 'copilot',
            messages: [...messages.filter((m) => m.id !== 'greeting'), userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            novelContext: {
              projectName,
              projectId,
              activeTab: activeTabId,
              fullWriting: (tabContent['full-writing'] || '').replace(/<[^>]+>/g, ' ').slice(0, 8000),
              storyBible: (tabContent['story-bible'] || '').replace(/<[^>]+>/g, ' ').slice(0, 4000),
              chapters: chapters.map((c) => ({
                name: c.name,
                content: c.content.replace(/<[^>]+>/g, ' ').slice(0, 2000),
              })),
            },
          }),
        })

        if (!res.ok) {
          // Surface the EXACT error from the backend
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || `Request failed with status ${res.status}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('The AI service did not return a readable stream.')

        const decoder = new TextDecoder()
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
        // Display the EXACT error message from the backend
        const errMsg = err instanceof Error ? err.message : 'Request failed.'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: `${errMsg}` }
              : msg
          )
        )
      } finally {
        setSending(false)
      }
    }
    streamChat()
  }

  const wordCount = editor?.storage.characterCount?.characters() || 0
  const pageCount = Math.max(1, Math.ceil(wordCount / 500))

  function execCommand(command: string, value?: string) {
    if (!editor) return
    switch (command) {
      case 'undo': editor.chain().focus().undo().run(); break
      case 'redo': editor.chain().focus().redo().run(); break
      case 'bold': editor.chain().focus().toggleBold().run(); break
      case 'italic': editor.chain().focus().toggleItalic().run(); break
      case 'underline': editor.chain().focus().toggleUnderline().run(); break
      case 'alignLeft': editor.chain().focus().setTextAlign('left').run(); break
      case 'alignCenter': editor.chain().focus().setTextAlign('center').run(); break
      case 'alignRight': editor.chain().focus().setTextAlign('right').run(); break
      case 'alignJustify': editor.chain().focus().setTextAlign('justify').run(); break
      case 'bulletList': editor.chain().focus().toggleBulletList().run(); break
      case 'orderedList': editor.chain().focus().toggleOrderedList().run(); break
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break
      case 'paragraph': editor.chain().focus().setParagraph().run(); break
      case 'print': window.print(); break
      case 'highlight': toast.info('Highlight requires @tiptap/extension-highlight package'); break
      case 'color': toast.info('Text color requires @tiptap/extension-color package'); break
    }
  }

  return (
    <div className="h-full flex flex-col bg-black text-zinc-200 overflow-hidden">
      {/* ═══ GOOGLE DOCS-STYLE TOP TOOLBAR ═══ */}
      <div className="shrink-0 border-b border-[#1a1a1a] bg-black">
        <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto lc-scroll">
          <ToolbarButton icon={Undo2} onClick={() => execCommand('undo')} title="Undo" />
          <ToolbarButton icon={Redo2} onClick={() => execCommand('redo')} title="Redo" />
          <ToolbarButton icon={Printer} onClick={() => execCommand('print')} title="Print" />
          <ToolbarButton icon={Paintbrush} onClick={() => toast.info('Format painter not yet implemented')} title="Format Painter" />
          <Divider />
          <div className="flex items-center gap-1 px-1">
            <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-zinc-400 font-mono w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition">
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
          {/* Font family */}
          <select className="bg-zinc-950 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-zinc-700">
            <option>Georgia</option>
            <option>Inter</option>
            <option>Serif</option>
            <option>Mono</option>
          </select>
          {/* Font size */}
          <select className="bg-zinc-950 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-zinc-700">
            <option>12</option>
            <option selected>14</option>
            <option>16</option>
            <option>18</option>
            <option>24</option>
            <option>32</option>
          </select>
          <Divider />
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="Bold" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="Italic" />
          <ToolbarButton icon={UnderlineIcon} onClick={() => execCommand('underline')} title="Underline" />
          {/* Text Color */}
          <div className="relative group">
            <button className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition flex items-center gap-0.5">
              <Palette className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-wrap gap-1 p-2 bg-zinc-950 border border-[#1a1a1a] rounded-lg shadow-2xl z-[100] w-40">
              {['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#737373'].map((c) => (
                <button key={c} onClick={() => execCommand('color', c)} className="w-5 h-5 rounded-full border border-[#1a1a1a]" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          {/* Highlight color */}
          <ToolbarButton icon={Highlighter} onClick={() => execCommand('highlight')} title="Highlight" />
          <Divider />
          <ToolbarButton icon={AlignLeft} onClick={() => execCommand('alignLeft')} title="Align Left" />
          <ToolbarButton icon={AlignCenter} onClick={() => execCommand('alignCenter')} title="Align Center" />
          <ToolbarButton icon={AlignRight} onClick={() => execCommand('alignRight')} title="Align Right" />
          <ToolbarButton icon={AlignJustify} onClick={() => execCommand('alignJustify')} title="Justify" />
          {/* Line spacing */}
          <select className="bg-zinc-950 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-zinc-700">
            <option>1.0</option>
            <option selected>1.15</option>
            <option>1.5</option>
            <option>2.0</option>
          </select>
          <Divider />
          <ToolbarButton icon={List} onClick={() => execCommand('bulletList')} title="Bullet List" />
          <ToolbarButton icon={ListOrdered} onClick={() => execCommand('orderedList')} title="Numbered List" />
          <ToolbarButton icon={Table} onClick={() => toast.info('Insert table — coming soon')} title="Insert Table" />
          <ToolbarButton icon={ImageIcon} onClick={() => toast.info('Insert image — coming soon')} title="Insert Image" />
          <ToolbarButton icon={LinkIcon} onClick={() => toast.info('Insert link — coming soon')} title="Insert Link" />
        </div>
      </div>

      {/* ═══ MAIN BODY: 3-COLUMN ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ═══ LEFT SIDEBAR: 12 CORE TABS ═══ */}
        <div className={cn('shrink-0 bg-black border-r border-[#1a1a1a] flex flex-col transition-all duration-200', sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64')}>
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
            {CORE_TABS.map((tab) => (
              <div key={tab.id}>
                <button
                  onClick={() => { setActiveTabId(tab.id); setActiveChapter(null) }}
                  className={cn(
                    'group w-full flex items-center gap-2 px-3 py-2 text-left transition',
                    activeTabId === tab.id ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[12px] flex-1 truncate">{tab.name}</span>
                  {/* Glowing red dot — replaces the old ⚠ warning badge.
                      Shows only when there are missing fields; hides completely when count is 0. */}
                  {tab.missing !== undefined && tab.missing > 0 && (
                    <span className="relative shrink-0 flex items-center justify-center" title={`${tab.missing} missing fields`}>
                      <span className="absolute w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
                      <span className="relative w-2 h-2 rounded-full bg-red-500" />
                    </span>
                  )}
                </button>

                {/* Full Writing nested chapters */}
                {activeTabId === 'full-writing' && tab.id === 'full-writing' && (
                  <div className="ml-6 mt-1 mb-2 space-y-0.5">
                    {chapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => setActiveChapter(ch.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1 text-left transition rounded',
                          activeChapter === ch.id ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950'
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
            ))}
          </div>

          {/* Scene search */}
          <div className="border-t border-[#1a1a1a] p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
              <input
                value={sceneSearch}
                onChange={(e) => setSceneSearch(e.target.value)}
                placeholder="Scene search..."
                className="w-full bg-zinc-950 border border-[#1a1a1a] pl-7 pr-2 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded"
              />
            </div>
            <p className="text-[9px] text-zinc-700 mt-1 px-1">Semantic search across all chapters</p>
          </div>
        </div>

        {/* ═══ CENTER EDITOR ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black" style={{ zoom: `${zoom}%` }}>
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
                {activeChapter ? (chapters.find((c) => c.id === activeChapter)?.name || activeTab.name) : activeTab.name}
              </h2>
            </div>
            <p className="text-[10px] text-zinc-600 hidden md:block">{activeTab.description}</p>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto lc-scroll">
            {activeTabId === 'full-writing' ? (
              <div className="max-w-3xl mx-auto py-8 px-12">
                {editor && <EditorContent editor={editor} />}

                {/* Import marker */}
                {importMarker !== null && (
                  <div className="my-6 flex items-center gap-3 text-[10px] text-purple-400 font-mono">
                    <span>✓ Imported until here</span>
                    <div className="flex-1 border-t border-dashed border-purple-500/30" />
                  </div>
                )}

                {/* Bottom status */}
                <div className="sticky bottom-0 mt-12 py-2 flex items-center justify-between text-[10px] text-zinc-600 bg-black border-t border-[#1a1a1a]">
                  <span>{wordCount.toLocaleString()} words · {pageCount} page{pageCount !== 1 ? 's' : ''}</span>
                  <span className="font-mono">{Math.ceil(wordCount / 250)} min read</span>
                </div>
              </div>
            ) : activeTabId === 'character-creation' ? (
              <CharacterCreationView />
            ) : (
              <PlaceholderTabView tab={activeTab} />
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="w-1 bg-[#1a1a1a] hover:bg-purple-500/40 cursor-ew-resize transition shrink-0"
          onMouseDown={(e) => { dragRef.current = { startX: e.clientX, startW: copilotWidth } }}
        />

        {/* ═══ RIGHT: PERMANENT AI CO-PILOT ═══ */}
        <div className="shrink-0 bg-black border-l border-[#1a1a1a] flex flex-col" style={{ width: copilotWidth }}>
          {/* Header */}
          <div className="h-12 flex items-center gap-2 px-4 border-b border-[#1a1a1a] shrink-0">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="text-[12px] font-semibold text-zinc-200">AI Co-Pilot</span>
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded ml-auto">
              {projectName.slice(0, 12)}{projectName.length > 12 ? '...' : ''}
            </span>
          </div>

          {/* Messages */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto lc-scroll px-3 py-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] px-3 py-2 rounded-lg text-[12px] leading-relaxed',
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

            {/* Quick action buttons (shown initially) */}
            {messages.length === 1 && (
              <div className="space-y-1.5 pt-2">
                <CoPilotQuickBtn text="Continue writing?" onClick={() => setChatInput('Continue writing from where I stopped.')} />
                <CoPilotQuickBtn text="Ask about your world?" onClick={() => setChatInput('Tell me about the world of this project.')} />
                <CoPilotQuickBtn text="Need help fixing pacing?" onClick={() => setChatInput('Help me fix the pacing of the current chapter.')} />
                <CoPilotQuickBtn text="Looking for inconsistencies?" onClick={() => setChatInput('Scan the Story Bible for any inconsistencies.')} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[#1a1a1a] p-3">
            <div className="bg-zinc-950 border border-[#1a1a1a] rounded-xl focus-within:border-zinc-800 transition">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                placeholder="Ask about your project..."
                className="w-full bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none px-3 pt-2.5 pb-1 max-h-32"
                rows={1}
              />
              <div className="flex items-center justify-between px-2 py-1.5">
                <button className="p-1 text-zinc-600 hover:text-zinc-300 transition">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim()}
                  className={cn('p-1.5 rounded-lg transition', chatInput.trim() ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed')}
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
              const newChapters: { id: string; name: string; content: string }[] = []
              if (opts.mode === 'fixed-count' && opts.count) {
                for (let i = 1; i <= opts.count; i++) newChapters.push({ id: `ch_${Date.now()}_${i}`, name: `Chapter ${i + chapters.length}`, content: '' })
              } else if (opts.mode === 'words-per' && opts.words) {
                const total = Math.max(wordCount, 1)
                const num = Math.max(1, Math.ceil(total / opts.words))
                for (let i = 1; i <= num; i++) newChapters.push({ id: `ch_${Date.now()}_${i}`, name: `Chapter ${i + chapters.length}`, content: '' })
              }
              setChapters((prev) => [...prev, ...newChapters])
              setImportMarker(wordCount)
              setShowChapterWizard(false)
              toast.success(`Sliced into ${newChapters.length} new chapter${newChapters.length !== 1 ? 's' : ''}.`)
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

  return (
    <div className="h-full flex flex-col">
      {/* Sub-mode tabs — Drawing Studio moved to main sidebar */}
      <div className="flex border-b border-[#1a1a1a] shrink-0">
        {([
          { id: 'profiles', label: 'Character Profiles' },
          { id: 'creator', label: 'Character Creator' },
        ] as const).map((t) => (
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

      {/* Sub-header & description per spec */}
      <div className="px-6 pt-4 pb-2 border-b border-[#1a1a1a]/50">
        <h3 className="text-[14px] font-semibold text-zinc-200">Character Creation</h3>
        <p className="text-[11px] text-zinc-500">Manage character profiles, relationship charts, and backstory bibles.</p>
      </div>

      <div className="flex-1 overflow-y-auto lc-scroll p-6">
        {subMode === 'profiles' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-[12px] text-zinc-500">Comprehensive fields for relationship charts, outfits, expressions, personality, backstory, and weaknesses.</p>
            <div className="grid grid-cols-2 gap-3">
              {KNOWN_CHARACTERS.map((char) => (
                <div key={char} className="bg-zinc-950 border border-[#1a1a1a] rounded-lg p-3 hover:border-zinc-800 transition cursor-pointer">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-[#1a1a1a] flex items-center justify-center">
                      <span className="text-[12px] font-serif text-zinc-300">{char.charAt(0)}</span>
                    </div>
                    <span className="text-[12px] text-zinc-200 font-medium">{char}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600">Click to view full profile</p>
                </div>
              ))}
              <button className="border border-dashed border-[#1a1a1a] rounded-lg p-3 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition">
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-[11px]">New Character</span>
              </button>
            </div>
          </div>
        )}

        {subMode === 'creator' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-[12px] text-zinc-500">Text-to-image prompts for expression generators, clothing generators, and weapon generators.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">Prompt</label>
                <textarea
                  placeholder="e.g. Kael in formal court attire, expression serious, holding ancestral sword..."
                  className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg min-h-[80px]"
                />
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-zinc-900 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded-md hover:bg-zinc-800">Expression</button>
                <button className="px-3 py-1.5 bg-zinc-900 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded-md hover:bg-zinc-800">Clothing</button>
                <button className="px-3 py-1.5 bg-zinc-900 border border-[#1a1a1a] text-[11px] text-zinc-300 rounded-md hover:bg-zinc-800">Weapon</button>
                <button className="px-3 py-1.5 bg-purple-600 text-white text-[11px] rounded-md hover:bg-purple-700 ml-auto">Generate</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Placeholder Tab View ───
function PlaceholderTabView({ tab }: { tab: CoreTab }) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-12">
      <div className="mb-6">
        <h2 className="text-xl font-serif text-zinc-100 mb-1">{tab.name}</h2>
        <p className="text-[12px] text-zinc-500">{tab.description}</p>
      </div>
      {tab.missing !== undefined && tab.missing > 0 && (
        <div className="mb-6 bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-[12px] text-red-300 font-medium">{tab.missing} missing field{tab.missing !== 1 ? 's' : ''}</p>
          </div>
          <ul className="text-[11px] text-zinc-500 space-y-1 list-disc list-inside">
            <li>Missing field 1</li>
            <li>Missing field 2</li>
          </ul>
        </div>
      )}
      <div className="bg-zinc-950 border border-[#1a1a1a] rounded-lg p-8 text-center">
        <tab.icon className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
        <p className="text-[12px] text-zinc-600">This section is ready for content. Use the AI Co-Pilot on the right to start building.</p>
      </div>
    </div>
  )
}

// ─── Chapter Slicer Wizard ───
function ChapterSlicerWizard({ onClose, onComplete }: {
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
              <p className="text-[13px] text-zinc-300">Would you like automatic chapter organization?</p>
              <p className="text-[11px] text-zinc-600">The AI will preserve your original writing exactly as it is and only create copies inside the chapter tabs.</p>
              <div className="flex gap-2">
                <button onClick={() => { setAutoEnabled(true); setStep(2) }} className={cn('flex-1 py-2.5 text-[12px] rounded-lg border transition', autoEnabled ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'border-[#1a1a1a] text-zinc-400 hover:text-zinc-200')}>
                  Yes, automatic
                </button>
                <button onClick={onClose} className="flex-1 py-2.5 text-[12px] rounded-lg border border-[#1a1a1a] text-zinc-400 hover:text-zinc-200">
                  No, manual
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-zinc-300">Have you decided how many chapters?</p>
              <div className="flex gap-2">
                <button onClick={() => { setHasCount('yes'); setStep(3) }} className="flex-1 py-2.5 text-[12px] rounded-lg border border-[#1a1a1a] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700">Yes, I know</button>
                <button onClick={() => { setHasCount('no'); setStep(3) }} className="flex-1 py-2.5 text-[12px] rounded-lg border border-[#1a1a1a] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700">No, by word count</button>
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
                        className={cn('py-2 text-[12px] rounded-lg border transition', wordsPer === w ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'border-[#1a1a1a] text-zinc-400 hover:text-zinc-200')}
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
                  ⚠ Make sure your Full Writing is already arranged correctly from beginning to end. The AI will preserve your original writing exactly as it is and only create copies inside the chapter tabs.
                </p>
              </div>

              <button
                onClick={() => onComplete(hasCount === 'yes' ? { mode: 'fixed-count', count } : { mode: 'words-per', words: wordsPer })}
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

// ─── Toolbar Button ───
function ToolbarButton({ icon: Icon, onClick, title }: { icon: React.ComponentType<{ className?: string }>; onClick: () => void; title: string }) {
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
