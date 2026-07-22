'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { ChatInput, type AIModel, type UploadedImage } from './chat-input'

// Default model object kept for backwards compatibility with ChatInput's
// optional selectedModel prop. The backend is hardcoded to gemini-1.5-flash
// for the Main Chat — this object is NOT used to select a model anymore.
const DEFAULT_MODEL: AIModel = {
  id: 'main',
  name: 'Lucian Assistant',
  icon: Sparkles,
  desc: 'Helpful AI assistant',
  color: 'text-purple-400',
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  // For user messages with images, we keep the data URLs for preview.
  imageUrls?: string[]
}

type ChatLayoutProps = {
  isFullscreen: boolean
  onToggleFullscreen: () => void
  // NEW: optional sessionId from the parent (Dashboard) so a clicked
  // recent chat is loaded into the chat view.
  sessionId?: string | null
  // NEW: when the parent creates a new chat, it bumps this counter to
  // force the chat view to reset.
  resetSignal?: number
}

export function ChatPage({ isFullscreen: _isFullscreen, onToggleFullscreen: _onToggleFullscreen, sessionId: externalSessionId, resetSignal }: ChatLayoutProps) {
  const user = useApp((s) => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [welcomeText, setWelcomeText] = useState('')
  const [ghostText, setGhostText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [lineCount, setLineCount] = useState(1)
  const [sending, setSending] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(externalSessionId ?? null)
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<UploadedImage[]>([])
  const [clearImagesSignal, setClearImagesSignal] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ─── Reset state when resetSignal bumps (parent clicked "New Chat") ───
  useEffect(() => {
    if (resetSignal && resetSignal > 0) {
      setMessages([])
      setInput('')
      setCurrentSessionId(null)
      setLoadedSessionId(null)
      setAttachedImages([])
      setClearImagesSignal((s) => s + 1)
    }
  }, [resetSignal])

  // ─── If parent passes a new externalSessionId, switch to it ───
  useEffect(() => {
    if (externalSessionId && externalSessionId !== currentSessionId) {
      setCurrentSessionId(externalSessionId)
    }
  }, [externalSessionId, currentSessionId])

  // ─── Load messages when sessionId changes ───
  useEffect(() => {
    if (!currentSessionId || currentSessionId === loadedSessionId) return
    let cancelled = false
    async function loadMessages() {
      try {
        const res = await fetch(`/api/chat/sessions/${currentSessionId}/messages`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
              content: m.content,
            }))
          )
        }
        setLoadedSessionId(currentSessionId)
      } catch {
        // silent
      }
    }
    loadMessages()
    return () => {
      cancelled = true
    }
  }, [currentSessionId, loadedSessionId])

  // Set welcome text ONCE on mount. Use real user name if available.
  useEffect(() => {
    const name = user?.displayName
    const base = name ? `Let's jump in, ${name}` : "Let's jump in"
    setWelcomeText(base)
  }, [user?.displayName])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  const handleImagesChange = useCallback((imgs: UploadedImage[]) => {
    setAttachedImages(imgs)
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInput(val)
    const lines = val.split('\n').length
    setLineCount(lines)
    setGhostText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ─── Ensure a chat session exists before sending ───
  async function ensureSession(firstMessageText: string): Promise<string | null> {
    if (currentSessionId) return currentSessionId
    try {
      // Derive a short title from the first message
      const title = firstMessageText.slice(0, 40).trim() || 'New Chat'
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mode: 'main' }),
      })
      if (!res.ok) return null
      const data = await res.json()
      const sid = data?.session?.id
      if (sid) {
        setCurrentSessionId(sid)
        // Notify the parent Dashboard so the sidebar list refreshes.
        // We use a custom event so the parent can react without tight coupling.
        try {
          window.dispatchEvent(new CustomEvent('lc-chat-created', { detail: { sessionId: sid, title } }))
        } catch {
          // ignore
        }
        return sid
      }
    } catch {
      // ignore
    }
    return null
  }

  async function handleSend() {
    const text = input.trim()
    const hasImages = attachedImages.length > 0
    if ((!text && !hasImages) || sending) return

    // Build user message with image previews (data URLs)
    const imageUrls = attachedImages.map((img) => img.url)
    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text || (hasImages ? '[Image attached]' : ''),
      imageUrls: hasImages ? imageUrls : undefined,
    }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setGhostText('')
    setLineCount(1)
    setIsExpanded(false)
    // Clear the image carousel in the child ChatInput
    setAttachedImages([])
    setClearImagesSignal((s) => s + 1)
    setSending(true)

    const assistantId = `a_${Date.now()}`
    // Optimistically add an empty assistant message that we'll stream into.
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      // Ensure a chat session exists (creates one on first send)
      const sid = await ensureSession(text || 'Image chat')

      // Build the payload for /api/chat. The Main Chat sends purpose: 'main'
      // which the backend uses to select gemini-1.5-flash + the generic
      // assistant system prompt.
      const payload: {
        purpose: 'main'
        sessionId?: string
        messages: Array<{ role: string; content: string; images?: Array<{ data: string; mimeType: string }> }>
      } = {
        purpose: 'main',
        messages: history.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }
      if (sid) payload.sessionId = sid

      // Attach images to the LAST (user) message in the payload
      if (hasImages) {
        const lastIdx = payload.messages.length - 1
        payload.messages[lastIdx].images = attachedImages.map((img) => ({
          data: img.base64,
          mimeType: img.mimeType,
        }))
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `AI request failed with ${res.status}`)
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
      const message = err instanceof Error ? err.message : 'Network error reaching the AI service.'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: `${message} Please check your API key and try again.` }
            : msg
        )
      )
    } finally {
      setSending(false)
    }
  }

  async function toggleVoice() {
    if (!isListening) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        setIsListening(true)
      } catch {
        // blocked
      }
    } else {
      setIsListening(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative">
      {/* Chat messages area — extra top padding on mobile so it clears the hamburger button */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto lc-scroll px-4 md:px-8 pt-12 md:py-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl font-serif text-zinc-300"
            >
              {welcomeText}
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-1">
                    <DEFAULT_MODEL.icon className={cn('w-4 h-4', DEFAULT_MODEL.color)} />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-zinc-800 text-zinc-100 rounded-br-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm'
                  )}
                >
                  {/* Render attached image thumbnails for user messages */}
                  {msg.imageUrls && msg.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.imageUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt={`Attachment ${i + 1}`}
                          className="w-32 h-32 object-cover rounded-lg border border-zinc-700"
                        />
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-[10px] text-zinc-400 font-serif">
                      {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 pl-12">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating response…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar — model selector removed per spec */}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        isListening={isListening}
        onToggleVoice={toggleVoice}
        isNewChat={messages.length === 0}
        ghostText={ghostText}
        lineCount={lineCount}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        disabled={sending}
        onImagesChange={handleImagesChange}
        clearImagesSignal={clearImagesSignal}
      />
    </div>
  )
}
