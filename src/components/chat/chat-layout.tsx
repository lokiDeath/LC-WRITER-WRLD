'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { ChatInput, type AIModel } from './chat-input'

const WELCOME_PROMPTS = [
  "Let's jump in",
  'Write a story together',
  'Brainstorm a concept',
  'Explore an idea',
  'Help me outline',
]

type Message = { id: string; role: 'user' | 'assistant'; content: string }

type ChatLayoutProps = {
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export function ChatPage({ isFullscreen: _isFullscreen, onToggleFullscreen: _onToggleFullscreen }: ChatLayoutProps) {
  const user = useApp((s) => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [welcomeText, setWelcomeText] = useState('')
  const [ghostText, setGhostText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [lineCount, setLineCount] = useState(1)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Lazy-load model default
  useEffect(() => {
    if (!selectedModel) {
      import('./chat-input').then(({ AI_MODELS }) => {
        setSelectedModel(AI_MODELS[1])
      })
    }
  }, [selectedModel])

  // Set welcome text ONCE on mount — no rotation. Use real user name if available.
  useEffect(() => {
    const name = user?.displayName
    const base = name ? `Let's jump in, ${name}` : WELCOME_PROMPTS[0]
    setWelcomeText(base)
  }, [user?.displayName])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInput(val)

    // Count lines
    const lines = val.split('\n').length
    setLineCount(lines)

    if (messages.length === 0 && val.trim().length > 3) {
      const suggestions: Record<string, string> = {
        'write': 'a story about a character who discovers a hidden world',
        'help': 'me brainstorm a plot twist for my novel',
        'brainstorm': 'an idea for a magic system based on emotions',
        'create': 'a character profile for a reluctant hero',
        'outline': 'a three-act structure for a fantasy novel',
        'describe': 'a dark fantasy city at midnight',
        'what': 'are some common themes in dark fantasy?',
        'how': 'do I improve my dialogue writing?',
      }
      const lower = val.toLowerCase()
      for (const key in suggestions) {
        if (lower.startsWith(key)) {
          setGhostText(suggestions[key])
          return
        }
      }
    }
    setGhostText('')
  }

  function acceptGhost() {
    if (ghostText) {
      setInput((prev) => prev + ghostText)
      setGhostText('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.key === 'Tab' || (e.key === 'ArrowRight' && ghostText)) && ghostText) {
      e.preventDefault()
      acceptGhost()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleSend() {
    if (!input.trim() || !selectedModel || sending) return
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: input.trim() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setGhostText('')
    setLineCount(1)
    setIsExpanded(false)
    setSending(true)
    const assistantId = `a_${Date.now()}`
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.id,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `AI request failed with ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('The AI service did not return a readable stream.')

      const decoder = new TextDecoder()
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
      const message = err instanceof Error ? err.message : 'Network error reaching the AI service.'
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: `${message} Please check your API key and try again.`,
        },
      ])
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

  if (!selectedModel) return null

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative">
      {/* Fullscreen toggle */}
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
                    <selectedModel.icon className={cn('w-4 h-4', selectedModel.color)} />
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
                <span>Generating response with {selectedModel.name}…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        isListening={isListening}
        onToggleVoice={toggleVoice}
        isNewChat={messages.length === 0}
        ghostText={ghostText}
        lineCount={lineCount}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        disabled={sending}
      />
    </div>
  )
}
