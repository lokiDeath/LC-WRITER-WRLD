'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Mic,
  ArrowUp,
  FileText,
  FolderOpen,
  ChevronRight,
  Palette,
  MicVocal,
  Search,
  Settings as SettingsIcon,
  Expand,
  X,
  ChevronLeft,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Per spec: the Main Chat MUST NOT have a model selector.
// The model is hardcoded on the backend to gemini-2.0-flash for the
// main chat and gemini-2.5-pro for the Project Co-Pilot.
// The AIModel type is kept only for backwards compatibility.
export type AIModel = {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  desc: string
  color: string
}

export const AI_MODELS: AIModel[] = [
  { id: 'flash', name: 'Flash', icon: SettingsIcon, desc: 'Fast answers', color: 'text-zinc-400' },
]

const ATTACH_OPTIONS = [
  { id: 'upload', label: 'Upload files', icon: FileText },
  { id: 'drive', label: 'Add from Drive', icon: FolderOpen },
  { id: 'more', label: 'More uploads', icon: ChevronRight },
  { id: 'image', label: 'Create image', icon: Palette, badge: 'New' },
  { id: 'music', label: 'Create music', icon: MicVocal, badge: 'New' },
  { id: 'canvas', label: 'Canvas', icon: Palette },
  { id: 'research', label: 'Deep Research', icon: Search },
  { id: 'learning', label: 'Guided Learning', icon: SettingsIcon },
]

export type UploadedImage = {
  id: string
  url: string
  name: string
  base64: string
  mimeType: string
}

type ChatInputProps = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  selectedModel?: AIModel | null
  onModelChange?: (model: AIModel) => void
  isListening: boolean
  onToggleVoice: () => void
  isNewChat: boolean
  ghostText: string
  lineCount: number
  disabled?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  onImagesChange?: (images: UploadedImage[]) => void
  clearImagesSignal?: number
}

export function ChatInput({
  value,
  onChange,
  onKeyDown,
  onSend,
  selectedModel: _selectedModel,
  onModelChange: _onModelChange,
  isListening,
  onToggleVoice,
  isNewChat: _isNewChat,
  ghostText: _ghostText,
  lineCount,
  disabled,
  isExpanded: _isExpanded,
  onToggleExpand: _onToggleExpand,
  onImagesChange,
  clearImagesSignal,
}: ChatInputProps) {
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showVoiceTooltip, setShowVoiceTooltip] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [showExpandModal, setShowExpandModal] = useState(false)
  const [expandedText, setExpandedText] = useState(value)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const MAX_IMAGES = 20
  const showExpandButton = lineCount > 3

  useEffect(() => {
    onImagesChange?.(uploadedImages)
  }, [uploadedImages, onImagesChange])

  useEffect(() => {
    if (clearImagesSignal && clearImagesSignal > 0) {
      setUploadedImages([])
    }
  }, [clearImagesSignal])

  useEffect(() => {
    if (showExpandModal) {
      setExpandedText(value)
    }
  }, [showExpandModal, value])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('FileReader returned non-string'))
          return
        }
        const match = result.match(/^data:([^;]+);base64,(.+)$/)
        if (!match) {
          reject(new Error('Invalid data URL'))
          return
        }
        resolve({ base64: match[2], mimeType: match[1] })
      }
      reader.onerror = () => reject(reader.error || new Error('FileReader error'))
      reader.readAsDataURL(file)
    })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      showToast('Please select image files only.')
      return
    }

    if (uploadedImages.length + imageFiles.length > MAX_IMAGES) {
      showToast(`Maximum ${MAX_IMAGES} images per upload session.`)
      return
    }

    const newImages: UploadedImage[] = []
    for (const file of imageFiles) {
      try {
        const { base64, mimeType } = await fileToBase64(file)
        newImages.push({
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          url: URL.createObjectURL(file),
          name: file.name,
          base64,
          mimeType,
        })
      } catch (err) {
        console.error('fileToBase64 error:', err)
        showToast(`Failed to read ${file.name}`)
      }
    }

    if (newImages.length > 0) {
      setUploadedImages((prev) => [...prev, ...newImages])
    }
    e.target.value = ''
  }

  function removeImage(id: string) {
    setUploadedImages((prev) => {
      const next = prev.filter((img) => img.id !== id)
      const removed = prev.find((img) => img.id === id)
      if (removed) URL.revokeObjectURL(removed.url)
      return next
    })
  }

  function scrollCarousel(dir: 'left' | 'right') {
    if (carouselRef.current) {
      const scrollAmount = 120
      carouselRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  function saveExpandedText() {
    const syntheticEvent = {
      target: { value: expandedText },
    } as React.ChangeEvent<HTMLTextAreaElement>
    onChange(syntheticEvent)
    setShowExpandModal(false)
  }

  const canSend = (value.trim() || uploadedImages.length > 0) && !disabled

  return (
    <div className="shrink-0 px-4 md:px-8 pb-4 pt-2">
      <div className="max-w-3xl mx-auto relative">
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl focus-within:border-[var(--accent)] transition-all duration-150 ease-out relative z-[9999]">
          {/* Uploaded images carousel */}
          {uploadedImages.length > 0 && (
            <div className="px-3 pt-3 relative">
              <div className="flex items-center gap-2">
                {uploadedImages.length > 3 && (
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="p-1 bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full shrink-0 transition-all duration-150 ease-out"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                <div
                  ref={carouselRef}
                  className="flex gap-2 overflow-x-auto lc-scroll scrollbar-hide flex-1"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {uploadedImages.map((img) => (
                    <div key={img.id} className="relative shrink-0 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-16 h-16 object-cover rounded-lg border border-[var(--border-default)]"
                      />
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all duration-150 ease-out opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {uploadedImages.length > 3 && (
                  <button
                    onClick={() => scrollCarousel('right')}
                    className="p-1 bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full shrink-0 transition-all duration-150 ease-out"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-[9px] text-[var(--text-muted)] font-mono shrink-0">
                  {uploadedImages.length}/{MAX_IMAGES}
                </span>
              </div>
            </div>
          )}

          {/* Text area */}
          <div className="px-4 pt-3 relative">
            <textarea
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              disabled={disabled}
              placeholder={isListening ? 'Listening...' : 'Ask anything...'}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none resize-none lc-scroll relative disabled:opacity-50 transition-all duration-150 ease-out"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '24px',
                maxHeight: '200px',
              }}
              onInput={(e) => {
                const ta = e.currentTarget
                ta.style.height = 'auto'
                ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
              }}
            />
          </div>

          {/* Bottom controls bar */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-all duration-150 ease-out"
                  title="Add"
                  disabled={disabled}
                >
                  <Plus className="w-4 h-4" />
                </button>
                {showAttachMenu && (
                  <>
                    <div className="fixed inset-0 z-[10000]" onClick={() => setShowAttachMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--surface-menu)] rounded-xl shadow-2xl z-[10001] overflow-hidden border border-[var(--border-default)]"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowAttachMenu(false)
                            fileInputRef.current?.click()
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface-hover)] transition-all duration-150 ease-out text-left"
                        >
                          <ImageIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                          <span className="text-[13px] text-[var(--text-primary)] flex-1">Upload images</span>
                        </button>
                        {ATTACH_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setShowAttachMenu(false)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface-hover)] transition-all duration-150 ease-out text-left"
                          >
                            <opt.icon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                            <span className="text-[13px] text-[var(--text-primary)] flex-1">{opt.label}</span>
                            {opt.badge && (
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)]">
                                {opt.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
              {/* Model selector dropdown REMOVED per spec */}
            </div>

            <div className="flex items-center gap-1.5">
              {showExpandButton && (
                <button
                  onClick={() => setShowExpandModal(true)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-all duration-150 ease-out"
                  title="Expand to full screen"
                  disabled={disabled}
                >
                  <Expand className="w-4 h-4" />
                </button>
              )}
              <div className="relative">
                <button
                  onClick={onToggleVoice}
                  onMouseEnter={() => setShowVoiceTooltip(true)}
                  onMouseLeave={() => setShowVoiceTooltip(false)}
                  className={cn(
                    'p-2 rounded-lg transition-all duration-150 ease-out',
                    isListening
                      ? 'bg-[var(--danger-bg)] text-[var(--danger)] animate-pulse'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                  )}
                  title="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
                {showVoiceTooltip && (
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-[var(--surface-tooltip)] text-[var(--text-primary)] text-[10px] rounded-lg whitespace-nowrap shadow-xl border border-[var(--border-default)] z-[10002]">
                    {isListening ? 'Listening...' : 'Use microphone'}
                  </div>
                )}
              </div>
              <button
                onClick={onSend}
                disabled={!canSend}
                className={cn(
                  'p-2 rounded-lg transition-all duration-150 ease-out',
                  canSend
                    ? 'bg-[var(--accent)] text-white hover:brightness-110'
                    : 'bg-[var(--surface-disabled)] text-[var(--text-disabled)] cursor-not-allowed'
                )}
                title="Submit"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">
          AI responses may be inaccurate. Verify important information.
        </p>
      </div>

      <AnimatePresence>
        {showExpandModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
            onClick={() => setShowExpandModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              className="bg-[var(--surface-dialog)] border border-[var(--border-default)] rounded-xl shadow-2xl max-w-3xl w-full h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Expand message</h3>
                <button
                  onClick={() => setShowExpandModal(false)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-150 ease-out"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={expandedText}
                onChange={(e) => setExpandedText(e.target.value)}
                autoFocus
                className="flex-1 w-full bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none resize-none p-5 leading-relaxed"
                placeholder="Write your full message here..."
              />
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setShowExpandModal(false)}
                  className="px-4 py-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] transition-all duration-150 ease-out"
                >
                  Cancel
                </button>
                <button
                  onClick={saveExpandedText}
                  className="px-4 py-2 text-[12px] text-white bg-[var(--accent)] hover:brightness-110 rounded-lg transition-all duration-150 ease-out"
                >
                  Save to Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[10003] bg-[var(--surface-menu)] border border-[var(--border-default)] rounded-lg px-4 py-3 shadow-xl text-xs text-[var(--text-primary)]">
          {toast}
        </div>
      )}
    </div>
  )
}
