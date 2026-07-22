'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  ChevronDown,
  Mic,
  ArrowUp,
  FileText,
  FolderOpen,
  ChevronRight,
  Palette,
  MicVocal,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Zap,
  Brain,
  Expand,
  X,
  ChevronLeft,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type AIModel = {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  desc: string
  color: string
}

// Exactly 4 options per spec: ⚡ 3.1 Flash-Lite, ⚡ 3.5 Flash, 🧠 3.1 Pro, 🔍 Extended Thinking
export const AI_MODELS: AIModel[] = [
  { id: 'flash-lite', name: '⚡ 3.1 Flash-Lite', icon: Sparkles, desc: 'Fastest answers', color: 'text-zinc-400' },
  { id: 'flash', name: '⚡ 3.5 Flash', icon: Zap, desc: 'All-around help', color: 'text-amber-400' },
  { id: 'pro', name: '🧠 3.1 Pro', icon: Brain, desc: 'Advanced reasoning and code', color: 'text-blue-400' },
  { id: 'thinking', name: '🔍 Extended Thinking', icon: Search, desc: 'Complex problem solving', color: 'text-purple-400' },
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

type UploadedImage = { id: string; url: string; name: string }

type ChatInputProps = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  selectedModel: AIModel
  onModelChange: (model: AIModel) => void
  isListening: boolean
  onToggleVoice: () => void
  isNewChat: boolean
  ghostText: string
  lineCount: number
  disabled?: boolean
  // Optional overrides (kept for backward compat; not used internally for the modal)
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function ChatInput({
  value,
  onChange,
  onKeyDown,
  onSend,
  selectedModel,
  onModelChange,
  isListening,
  onToggleVoice,
  isNewChat,
  ghostText,
  lineCount,
  disabled,
  isExpanded: _isExpanded,
  onToggleExpand: _onToggleExpand,
}: ChatInputProps) {
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

    const newImages: UploadedImage[] = imageFiles.map((file, i) => ({
      id: `img_${Date.now()}_${i}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }))

    setUploadedImages((prev) => [...prev, ...newImages])
    setCarouselIndex(uploadedImages.length) // jump to first new image
    e.target.value = ''
  }

  function removeImage(id: string) {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id))
    setCarouselIndex(0)
  }

  function scrollCarousel(dir: 'left' | 'right') {
    if (carouselRef.current) {
      const scrollAmount = 120
      carouselRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  function saveExpandedText() {
    // Sync the expanded text back to the parent chat input via a synthetic event
    const syntheticEvent = {
      target: { value: expandedText },
    } as React.ChangeEvent<HTMLTextAreaElement>
    onChange(syntheticEvent)
    setShowExpandModal(false)
  }

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
                      { }
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
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu)
                    setShowModelDropdown(false)
                  }}
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

              {/* Model selector dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowModelDropdown(!showModelDropdown)
                    setShowAttachMenu(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                >
                  <selectedModel.icon className={cn('w-3.5 h-3.5', selectedModel.color)} />
                  <span className="hidden sm:inline">{selectedModel.name}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showModelDropdown && (
                  <>
                    <div className="fixed inset-0 z-[10000]" onClick={() => setShowModelDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full left-0 mb-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[10001] overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-zinc-800">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">Select Model</p>
                      </div>
                      <div className="py-1">
                        {AI_MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              onModelChange(model)
                              setShowModelDropdown(false)
                            }}
                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-zinc-800 transition text-left"
                          >
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0',
                                selectedModel.id === model.id && 'bg-zinc-700'
                              )}
                            >
                              <model.icon className={cn('w-4 h-4', model.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-medium text-zinc-200 truncate">{model.name}</p>
                                {selectedModel.id === model.id && (
                                  <svg
                                    className="w-3.5 h-3.5 text-zinc-400 shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{model.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5">
              {/* Expand button — only shows when text > 3 lines. Opens a full-screen modal. */}
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

              {/* Submit button */}
              <button
                onClick={onSend}
                disabled={!value.trim() || disabled}
                className={cn(
                  'p-2 rounded-lg transition',
                  value.trim() && !disabled
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
          All models can make mistakes. Verify important information.
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
