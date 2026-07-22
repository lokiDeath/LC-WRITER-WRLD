'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, Link as LinkIcon, FileText, Loader2, Check, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast as sonnerToast } from 'sonner'

type SmartImportModalProps = {
  onClose: () => void
  onImported?: (projectName: string) => void
}

type ImportMode = 'file' | 'url'

export function SmartImportModal({ onClose, onImported }: SmartImportModalProps) {
  const [mode, setMode] = useState<ImportMode>('file')
  const [projectName, setProjectName] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  async function runImport() {
    if (mode === 'file' && !file) {
      sonnerToast.error('Please select a file first.')
      return
    }
    if (mode === 'url' && !url.trim()) {
      sonnerToast.error('Please enter a URL.')
      return
    }
    if (mode === 'url') {
      try {
         
        new URL(url)
      } catch {
        sonnerToast.error('Invalid URL.')
        return
      }
    }

    setImporting(true)
    setProgress('Uploading source…')

    try {
      const formData = new FormData()
      if (mode === 'file' && file) {
        formData.append('file', file)
      } else if (mode === 'url') {
        formData.append('url', url.trim())
      }
      if (projectName.trim()) {
        formData.append('projectName', projectName.trim())
      }

      setProgress('Parsing text and extracting content…')
      const res = await fetch('/api/import-manuscript', {
        method: 'POST',
        body: formData,
      })

      setProgress('AI is analyzing characters, lore, and locations…')
      const data = await res.json()

      if (!res.ok) {
        sonnerToast.error(data?.error || 'Import failed.')
        return
      }

      const importedName = data?.project?.name || projectName || 'Imported Project'
      sonnerToast.success(
        `Imported "${importedName}" — ${data?.tabsExtracted || 1} tab(s) auto-populated.`
      )
      onImported?.(importedName)
      onClose()
    } catch (err) {
      sonnerToast.error(
        `Import failed: ${err instanceof Error ? err.message : 'unknown error'}`
      )
    } finally {
      setImporting(false)
      setProgress('')
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[25000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 10 }}
          className="bg-zinc-900 border border-[#1a1a1a] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a]">
            <div>
              <h3 className="text-[13px] font-semibold text-zinc-200">Smart Import</h3>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                Upload a manuscript — the AI will extract characters, lore, locations, and auto-populate the project tabs.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-600 hover:text-zinc-300"
              disabled={importing}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('file')}
                disabled={importing}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 text-[12px] rounded-lg border transition',
                  mode === 'file'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    : 'border-[#1a1a1a] text-zinc-400 hover:text-zinc-200'
                )}
              >
                <Upload className="w-3.5 h-3.5" /> File
              </button>
              <button
                onClick={() => setMode('url')}
                disabled={importing}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 text-[12px] rounded-lg border transition',
                  mode === 'url'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    : 'border-[#1a1a1a] text-zinc-400 hover:text-zinc-200'
                )}
              >
                <LinkIcon className="w-3.5 h-3.5" /> URL
              </button>
            </div>

            {/* Project name */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">
                Project Name (optional)
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={importing}
                placeholder="My Imported Novel"
                className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg disabled:opacity-50"
              />
            </div>

            {/* File mode */}
            {mode === 'file' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer',
                  dragActive
                    ? 'border-purple-500 bg-purple-500/5'
                    : 'border-[#1a1a1a] hover:border-zinc-700'
                )}
                onClick={() => !importing && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.docx,text/plain"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-zinc-200">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span className="text-[12px]">{file.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-6 h-6 text-zinc-700 mx-auto" />
                    <p className="text-[12px] text-zinc-400">
                      Drag a file here or click to browse
                    </p>
                    <p className="text-[10px] text-zinc-600">.txt, .md, .docx supported</p>
                  </div>
                )}
              </div>
            )}

            {/* URL mode */}
            {mode === 'url' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">
                  Manuscript URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={importing}
                  placeholder="https://example.com/manuscript.txt"
                  className="w-full bg-zinc-950 border border-[#1a1a1a] px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none rounded-lg disabled:opacity-50"
                />
                <p className="text-[10px] text-zinc-600 mt-1">
                  Supports plain-text files and HTML pages (HTML will be stripped to text).
                </p>
              </div>
            )}

            {/* Progress / status */}
            {importing && (
              <div className="flex items-center gap-2 p-3 bg-zinc-950 border border-[#1a1a1a] rounded-lg">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                <span className="text-[11px] text-zinc-400">{progress || 'Working…'}</span>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300 leading-relaxed">
                The AI auto-sort extracts Characters, Lore, Locations, World Building, Power System, Plot, and Story Bible. Red alert dots will appear on tabs with missing fields after import.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#1a1a1a]">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 text-[12px] text-zinc-400 hover:text-zinc-100 border border-[#1a1a1a] rounded-lg hover:border-zinc-700 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={runImport}
              disabled={importing}
              className="px-4 py-2 text-[12px] text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Import & Auto-Sort
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
