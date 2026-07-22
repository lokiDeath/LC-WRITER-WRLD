'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Sparkles, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { ChatInput, type UploadedImage } from './chat-input'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrls?: string[]
}

type ChatLayoutProps = {
  isFullscreen: boolean
  onToggleFullscreen: () => void
  sessionId?: string | null
  resetSignal?: number
}

export function ChatPage({ isFullscreen, onToggleFullscreen, sessionId: externalSessionId, resetSignal }: ChatLayoutProps) {
  const user = useApp((s) => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [welcomeText, setWelcomeText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [lineCount, setLineCount] = useState(1)
  const [sending, setSending] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(externalSessionId ?? null)
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<UploadedImage[]>([])
  const [clearImagesSignal, setClearImagesSignal] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset when resetSignal bumps (parent clicked "New Chat")
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

  // If parent passes a new externalSessionId, switch to it
  useEffect(() => {
    if (externalSessionId && externalSessionId !== currentSessionId) {
      setCurrentSessionId(externalSessionId)
    }
  }, [externalSessionId, currentSessionId])

  // Load messages when sessionId changes
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
    return () => { cancelled = true }
  }, [currentSessionId, loadedSessionId])

  // Set welcome text
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
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Ensure a chat session exists before sending
  async function ensureSession(firstMessageText: string): Promise<string | null> {
    if (currentSessionId) return currentSessionId
    try {
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
        try {
          window.dispatchEvent(new CustomEvent('lc-chat-created', { detail: { sessionId: sid, title } }))
        } catch { /* ignore */ }
        return sid
      }
    } catch { /* ignore */ }
    return null
  }

  async function handleSend() {
    const text = input.trim()
    const hasImages = attachedImages.length > 0
    if ((!text && !hasImages) || sending) return

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
    setLineCount(1)
    setIsExpanded(false)
    setAttachedImages([])
    setClearImagesSignal((s) => s + 1)
    setSending(true)

    const assistantId = `a_${Date.now()}`
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const sid = await ensureSession(text || 'Image chat')

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

      // Attach images to the LAST (user) message
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
        // Surface the EXACT error from the backend — never a generic string
        const data = await res.json().catch(() => ({}))
        const errMsg = data?.error || `Request failed with status ${res.status}`
        throw new Error(errMsg)
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

  async function toggleVoice() {
    if (!isListening) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        setIsListening(true)
      } catch { /* blocked */ }
    } else {
      setIsListening(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-canvas)] relative">
      {/* Fullscreen toggle */}
      <div className="absolute top-3 right-4 z-50">
        <button
          onClick={onToggleFullscreen}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-all duration-150 ease-out"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Chat messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto lc-scroll px-4 md:px-8 pt-12 md:py-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl font-serif text-[var(--text-secondary)]"
            >
              {welcomeText}
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all duration-150 ease-out',
                    msg.role === 'user'
                      ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-br-sm'
                      : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-bl-sm'
                  )}
                >
                  {msg.imageUrls && msg.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.imageUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt={`Attachment ${i + 1}`}
                          className="w-32 h-32 object-cover rounded-lg border border-[var(--border-default)]"
                        />
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center shrink-0 mt-1">
                    <span className="text-[10px] text-[var(--text-muted)] font-serif">
                      {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-12">
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
        ghostText=""
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
