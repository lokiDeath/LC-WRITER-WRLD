'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, MessageSquare, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChatItem = { id: string; name: string; time: string }

type SearchModalProps = {
  isOpen: boolean
  onClose: () => void
  chats: ChatItem[]
  onSelectChat: (chatId: string) => void
}

export function SearchModal({ isOpen, onClose, chats, onSelectChat }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[20000] flex items-start justify-center pt-[15vh] bg-[var(--backdrop-overlay)] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bg-dialog border border-b-subtle rounded-2xl shadow-pop w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-b-subtle">
              <Search className="w-4 h-4 text-t-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search recent chats..."
                className="flex-1 bg-transparent text-sm text-t-primary placeholder:text-t-placeholder focus:outline-none"
              />
              <button
                onClick={onClose}
                className="p-1 text-t-muted hover:text-t-primary hover:bg-bg-hover rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results list */}
            <div className="max-h-[400px] overflow-y-auto lc-scroll py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-t-muted">No chats found.</p>
                </div>
              ) : (
                filtered.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      onSelectChat(chat.id)
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover transition text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-t-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-t-primary truncate group-hover:text-t-primary">{chat.name}</p>
                      <p className="text-[10px] text-t-muted flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {chat.time} ago
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-b-subtle flex items-center justify-between">
              <span className="text-[10px] text-t-muted font-mono">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] text-t-muted">
                <kbd className="px-1.5 py-0.5 rounded bg-elevated border border-b-default text-[9px]">Esc</kbd> to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
