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

// ─────────────────────────────────────────────────────────────
// NOTE: Per spec, the Main Chat MUST NOT have a model selector.
// The model is hardcoded on the backend to gemini-1.5-flash for the
// main chat and gemini-1.5-pro for the Project Co-Pilot. The
// AIModel type is kept only for backwards compatibility with
// callers that still pass selectedModel/onModelChange props, but
// the dropdown UI has been removed.
// ─────────────────────────────────────────────────────────────

export type AIModel = {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  desc: string
  color: string
}

// Kept for backwards compatibility — no longer rendered in the UI.
export const AI_MODELS: AIModel[] = [
  { id: 'flash-lite', name: '3.1 Flash-Lite', icon: SettingsIcon, desc: 'Fastest answers', color: 'text-zinc-400' },
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
  url: string // blob URL for preview
  name: string
  base64: string // raw base64 string (no data: prefix) for sending to Gemini
  mimeType: string
}

type ChatInputProps = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  // Kept for backwards compat — no longer used internally.
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
  // NEW: called when the user attaches/removes images so the parent
  // can include them in the send payload. Passes the current array.
  onImagesChange?: (images: UploadedImage[]) => void
  // NEW: called by the parent after a successful send to clear the
  // image carousel in this child component.
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
  isNewChat,
  ghostText,
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
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [showExpandModal, setShowExpandModal] = useState(false)
  const [expandedText, setExpandedText] = useState(value)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const MAX_IMAGES = 20
  // Spec: hidden for 1, 2, 3 lines; visible only when more than 3 lines typed
  const showExpandButton = lineCount > 3

  // Notify parent whenever images change
  useEffect(() => {
    onImagesChange?.(uploadedImages)
  }, [uploadedImages, onImagesChange])

  // Parent signals clear (e.g. after send) by bumping clearImagesSignal
  useEffect(() => {
    if (clearImagesSignal && clearImagesSignal > 0) {
      setUploadedImages([])
      setCarouselIndex(0)
    }
  }, [clearImagesSignal])

  // Sync expanded text when modal opens
  useEffect(() => {
    if (showExpandModal) {
      setExpandedText(value)
    }
  }, [showExpandModal, value])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Convert a File to base64 (raw, no data: prefix) ───
  function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('FileReader returned non-string'))
          return
        }
        // Strip "data:<mime>;base64," prefix
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

    // Convert each file to base64 in parallel
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
      setCarouselIndex(uploadedImages.length) // jump to first new image
    }
    e.target.value = ''
  }

  function removeImage(id: string) {
    setUploadedImages((prev) => {
      const next = prev.filter((img) => img.id !== id)
      // Revoke the blob URL to free memory
      const removed = prev.find((img) => img.id === id)
      if (removed) URL.revokeObjectURL(removed.url)
      return next
    })
    setCarouselIndex(0)
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

  // The send button should be enabled when there's text OR at least one image.
  const canSend = (value.trim() || uploadedImages.length > 0) && !disabled

  return (
    <div className="shrink-0 px-4 md:px-8 pb-4 pt-2">
      <div className="max-w-3xl mx-auto relative">
        {/* Input container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl focus-within:border-zinc-700 transition relative z-[9999]">
          {/* Uploaded images carousel */}
          {uploadedImages.length > 0 && (
            <div className="px-3 pt-3 relative">
              <div className="flex items-center gap-2">
                {/* Left arrow */}
                {uploadedImages.length > 3 && (
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="p-1 bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-full shrink-0 transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Carousel */}
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
                        className="w-16 h-16 object-cover rounded-lg border border-zinc-800"
                      />
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/20 transition opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Right arrow */}
                {uploadedImages.length > 3 && (
                  <button
                    onClick={() => scrollCarousel('right')}
                    className="p-1 bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-full shrink-0 transition"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Image counter */}
                <span className="text-[9px] text-zinc-600 font-mono shrink-0">
                  {uploadedImages.length}/{MAX_IMAGES}
                </span>
              </div>
            </div>
          )}

          {/* Ghost text + Text area */}
          <div className="px-4 pt-3 relative">
            {ghostText && (
              <div className="absolute inset-0 px-4 pt-3 pointer-events-none text-sm text-zinc-700">
                <span className="invisible">{value}</span>
                <span className="italic">{ghostText}</span>
              </div>
            )}
            <textarea
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              disabled={disabled}
              placeholder={isListening ? 'Listening...' : 'Ask anything...'}
              className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none lc-scroll relative disabled:opacity-50"
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
            {/* Left controls */}
            <div className="flex items-center gap-1.5">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Plus / Attach menu */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
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
                      className="absolute bottom-full left-0 mb-2 w-56 bg-zinc-900 rounded-xl shadow-2xl z-[10001] overflow-hidden border border-zinc-800"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowAttachMenu(false)
                            fileInputRef.current?.click()
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition text-left"
                        >
                          <ImageIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="text-[13px] text-zinc-200 flex-1">Upload images</span>
                        </button>
                        {ATTACH_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setShowAttachMenu(false)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition text-left"
                          >
                            <opt.icon className="w-4 h-4 text-zinc-400 shrink-0" />
                            <span className="text-[13px] text-zinc-200 flex-1">{opt.label}</span>
                            {opt.badge && (
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">
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

              {/* NOTE: Model selector dropdown has been REMOVED per spec.
                  The Main Chat is hardcoded to gemini-1.5-flash on the backend.
                  The Project Co-Pilot is hardcoded to gemini-1.5-pro on the backend. */}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5">
              {/* Expand button — only shows when text > 3 lines */}
              {showExpandButton && (
                <button
                  onClick={() => setShowExpandModal(true)}
                  className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                  title="Expand to full screen"
                  disabled={disabled}
                >
                  <Expand className="w-4 h-4" />
                </button>
              )}
              {/* Microphone with tooltip */}
              <div className="relative">
                <button
                  onClick={onToggleVoice}
                  onMouseEnter={() => setShowVoiceTooltip(true)}
                  onMouseLeave={() => setShowVoiceTooltip(false)}
                  className={cn(
                    'p-2 rounded-lg transition',
                    isListening
                      ? 'bg-red-500/20 text-red-400 animate-pulse'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                  )}
                  title="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
                {showVoiceTooltip && (
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-black text-zinc-200 text-[10px] rounded-lg whitespace-nowrap shadow-xl border border-zinc-800 z-[10002]">
                    {isListening ? 'Listening...' : 'Use microphone'}
                  </div>
                )}
              </div>

              {/* Submit button — enabled when text OR images are present */}
              <button
                onClick={onSend}
                disabled={!canSend}
                className={cn(
                  'p-2 rounded-lg transition',
                  canSend
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-zinc-800 text-zinc-700 cursor-not-allowed'
                )}
                title="Submit"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-zinc-700 text-center mt-2">
          AI responses may be inaccurate. Verify important information.
        </p>
      </div>

      {/* Expand Modal — full-screen with large textarea, Save to Chat, Cancel */}
      <AnimatePresence>
        {showExpandModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
            onClick={() => setShowExpandModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-3xl w-full h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <h3 className="text-[13px] font-semibold text-zinc-200">Expand message</h3>
                <button
                  onClick={() => setShowExpandModal(false)}
                  className="p-1 text-zinc-600 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={expandedText}
                onChange={(e) => setExpandedText(e.target.value)}
                autoFocus
                className="flex-1 w-full bg-transparent text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none p-5 leading-relaxed"
                placeholder="Write your full message here..."
              />
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-800">
                <button
                  onClick={() => setShowExpandModal(false)}
                  className="px-4 py-2 text-[12px] text-zinc-400 hover:text-zinc-100 border border-zinc-800 rounded-lg hover:border-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveExpandedText}
                  className="px-4 py-2 text-[12px] text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                >
                  Save to Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[10003] bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl text-xs text-zinc-200">
          {toast}
        </div>
      )}
    </div>
  )
}
