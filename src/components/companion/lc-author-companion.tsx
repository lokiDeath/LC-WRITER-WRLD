'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { Bell, BookOpen, FolderOpen, MessageSquare, PenLine, Send, Settings2, Sparkles, X } from 'lucide-react'

type CompanionAppearance = 'scholar' | 'scholarine'
type CompanionMood = 'idle' | 'writing' | 'thinking' | 'celebrating' | 'alert'

type CompanionSettings = {
  name: string
  appearance: CompanionAppearance
  enabled: boolean
  reducedMotion: boolean
  color: string
  position?: { x: number; y: number }
}

type CompanionSignal = {
  mood?: CompanionMood
  message?: string
}

const STORAGE_KEY = 'lc_author_companion_v1'
const defaults: CompanionSettings = { name: 'Ink', appearance: 'scholar', enabled: true, reducedMotion: false, color: '#3b82f6' }

export function dispatchCompanionSignal(signal: CompanionSignal) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<CompanionSignal>('lc-companion-signal', { detail: signal }))
}

type LCAuthorCompanionProps = {
  projectName?: string | null
  isProjectWorkspace: boolean
  onOpenChat: () => void
  onOpenProjects: () => void
}

export function LCAuthorCompanion({ projectName, isProjectWorkspace, onOpenChat, onOpenProjects }: LCAuthorCompanionProps) {
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState<CompanionSettings>(defaults)
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mood, setMood] = useState<CompanionMood>('idle')
  const [notice, setNotice] = useState<string | null>(null)
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState('')
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSettings({ ...defaults, ...JSON.parse(saved) })
      setSystemReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    } catch {
      // Local settings are optional; the companion still works with defaults.
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch { /* optional storage */ }
  }, [mounted, settings])

  useEffect(() => {
    const refreshSettings = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setSettings({ ...defaults, ...JSON.parse(saved) })
      } catch { /* keep current settings */ }
    }
    window.addEventListener('lc-companion-settings', refreshSettings)
    return () => window.removeEventListener('lc-companion-settings', refreshSettings)
  }, [])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragRef.current) return
      const width = Math.min(window.innerWidth - 20, 340)
      const nextX = Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - dragRef.current.offsetX))
      const nextY = Math.max(8, Math.min(window.innerHeight - 130, event.clientY - dragRef.current.offsetY))
      setSettings((current) => ({ ...current, position: { x: nextX, y: nextY } }))
    }
    const end = () => { dragRef.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end) }
  }, [])

  useEffect(() => {
    const receiveSignal = (event: Event) => {
      const signal = (event as CustomEvent<CompanionSignal>).detail
      if (!signal) return
      if (signal.mood) setMood(signal.mood)
      if (signal.message) {
        setNotice(signal.message)
        setMood(signal.mood ?? 'alert')
        window.setTimeout(() => setNotice(null), 5000)
      }
    }
    window.addEventListener('lc-companion-signal', receiveSignal)
    return () => window.removeEventListener('lc-companion-signal', receiveSignal)
  }, [])

  useEffect(() => {
    if (mood !== 'celebrating' && mood !== 'alert') return
    const timer = window.setTimeout(() => setMood('idle'), 1800)
    return () => window.clearTimeout(timer)
  }, [mood])

  const reduceMotion = settings.reducedMotion || systemReducedMotion
  const statusText = useMemo(() => {
    if (notice) return notice
    if (mood === 'thinking') return `${settings.name} is thinking…`
    if (mood === 'writing') return `${settings.name} is writing alongside you.`
    return isProjectWorkspace ? `Ready for ${projectName || 'this project'}.` : 'Ready when inspiration arrives.'
  }, [isProjectWorkspace, mood, notice, projectName, settings.name])

  function updateSettings(update: Partial<CompanionSettings>) {
    setSettings((current) => ({ ...current, ...update }))
  }

  function choosePrompt(prompt: string) {
    window.dispatchEvent(new CustomEvent('lc-companion-prompt', { detail: { prompt } }))
    setNotice('Prompt placed in your project co-pilot.')
    setOpen(false)
  }

  function submitPrompt() {
    const prompt = draftPrompt.trim()
    if (!prompt) return
    if (isProjectWorkspace) choosePrompt(prompt)
    else { onOpenChat(); setNotice('Chat opened. Ask your question there.'); setOpen(false) }
    setDraftPrompt('')
  }

  function beginDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    const rect = event.currentTarget.closest('aside')?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  if (!mounted) return null

  return (
    <aside style={settings.position ? { left: settings.position.x, top: settings.position.y } : undefined} className={`fixed ${settings.position ? '' : 'bottom-5 right-4 sm:bottom-7 sm:right-7'} z-[10020] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2`} aria-label="Writing companion">
      {notice && !open && <div role="status" className="max-w-64 rounded-xl border border-sky-400/25 bg-zinc-950/95 px-3 py-2 text-xs text-zinc-200 shadow-2xl backdrop-blur">{notice}</div>}
      {open && (
        <section className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-sky-400/20 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
            <div>
              <p className="text-sm font-medium text-zinc-100">{settings.name}</p>
              <p className="max-w-52 truncate text-[10px] text-zinc-500">{isProjectWorkspace ? projectName || 'Project workspace' : 'General companion'}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowSettings((value) => !value)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Companion settings"><Settings2 className="h-4 w-4" /></button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Close companion panel"><X className="h-4 w-4" /></button>
            </div>
          </div>
          {showSettings ? <CompanionSettings settings={settings} updateSettings={updateSettings} /> : isProjectWorkspace ? (
            <div className="space-y-1">
              <Action label="Continue writing" icon={<PenLine className="h-4 w-4 text-sky-300" />} onClick={() => choosePrompt('Continue writing from where I stopped.')} />
              <Action label="Summarize current chapter" icon={<BookOpen className="h-4 w-4 text-violet-300" />} onClick={() => choosePrompt('Summarize the current chapter and identify its key changes.')} />
              <Action label="Check Story Bible" icon={<Sparkles className="h-4 w-4 text-amber-300" />} onClick={() => choosePrompt('Check the Story Bible and current writing for consistency issues.')} />
              <Action label="Project status" icon={<Bell className="h-4 w-4 text-emerald-300" />} onClick={() => choosePrompt('Give me a concise project status: progress, open threads, and the best next writing step.')} />
              <p className="px-2 pt-2 text-[10px] leading-relaxed text-zinc-600">These actions only place a prompt in the co-pilot. They never call Gemini by themselves.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <Action label="Open chat" icon={<MessageSquare className="h-4 w-4 text-sky-300" />} onClick={() => { onOpenChat(); setOpen(false) }} />
              <Action label="Open projects" icon={<FolderOpen className="h-4 w-4 text-violet-300" />} onClick={() => { onOpenProjects(); setOpen(false) }} />
              <p className="px-2 pt-2 text-[10px] leading-relaxed text-zinc-600">General mode never receives project text or project memory.</p>
            </div>
          )}
        </section>
      )}
      <div className="relative flex flex-col items-end">
      <button
        type="button"
        onPointerDown={beginDrag}
        onClick={() => { if (!settings.enabled) updateSettings({ enabled: true }); setOpen((value) => !value) }}
        style={{ '--companion-color': settings.color } as CSSProperties}
        className={`group relative -mb-6 flex h-36 w-36 cursor-grab items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,color-mix(in_srgb,var(--companion-color)_65%,white),var(--companion-color)_70%)] drop-shadow-2xl active:cursor-grabbing focus:outline-none ${reduceMotion ? '' : mood === 'thinking' ? 'animate-pulse' : mood === 'writing' ? 'lc-companion-float' : 'lc-companion-drift'}`}
        aria-label={open ? `Close ${settings.name}` : `Open ${settings.name}, your writing companion`}
        aria-expanded={open}
      >
        <ScholarSprite appearance={settings.appearance} mood={mood} color={settings.color} />
        {notice && <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-zinc-950 bg-rose-400" aria-label="New companion notification" />}
        {!settings.enabled && <span className="absolute -bottom-5 whitespace-nowrap text-[10px] text-zinc-400">Show companion</span>}
      </button>
      <div className="w-72 rounded-2xl border border-zinc-700/80 bg-[#1e1e24]/95 p-3 pt-8 shadow-2xl backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-2 text-[11px] font-mono text-zinc-400"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{settings.name} AI</span><span className={mood === 'thinking' ? 'h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200' : 'text-zinc-600'}>{mood === 'thinking' ? '' : 'ready'}</span></div>
        <div className="flex items-center gap-2"><input value={draftPrompt} onChange={(event) => setDraftPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitPrompt() }} placeholder={isProjectWorkspace ? 'Ask your project companion…' : 'Open chat to ask…'} className="min-w-0 flex-1 bg-transparent py-1 text-xs text-zinc-100 outline-none placeholder:text-zinc-500" /><button onClick={submitPrompt} className="rounded-lg bg-zinc-800 p-1.5 text-zinc-300 hover:bg-[var(--companion-color)] hover:text-white" style={{ '--companion-color': settings.color } as CSSProperties} aria-label="Send companion prompt"><Send className="h-3.5 w-3.5" /></button></div>
      </div>
      {!open && settings.enabled && <p className="mt-2 max-w-64 text-right text-[10px] text-zinc-500">{statusText}</p>}
      </div>
    </aside>
  )
}

function Action({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-xs text-zinc-300 transition hover:bg-zinc-900 hover:text-white">{icon}<span>{label}</span></button>
}

function CompanionSettings({ settings, updateSettings }: { settings: CompanionSettings; updateSettings: (update: Partial<CompanionSettings>) => void }) {
  return <div className="space-y-3 text-xs text-zinc-300">
    <label className="block"><span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">Companion name</span><input value={settings.name} maxLength={24} onChange={(event) => updateSettings({ name: event.target.value.trimStart() || 'Ink' })} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-zinc-100 outline-none focus:border-sky-400" /></label>
    <div><span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">Appearance</span><div className="grid grid-cols-2 gap-2"><Choice active={settings.appearance === 'scholar'} onClick={() => updateSettings({ appearance: 'scholar' })}>Scholar</Choice><Choice active={settings.appearance === 'scholarine'} onClick={() => updateSettings({ appearance: 'scholarine' })}>Scholarine</Choice></div></div>
    <Toggle label="Show companion" checked={settings.enabled} onChange={(checked) => updateSettings({ enabled: checked })} />
    <label className="block"><span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">Companion color</span><input aria-label="Companion color" type="color" value={settings.color} onChange={(event) => updateSettings({ color: event.target.value })} className="h-8 w-full cursor-pointer rounded border border-zinc-700 bg-zinc-900 p-1" /></label>
    <Toggle label="Reduce animation" checked={settings.reducedMotion} onChange={(checked) => updateSettings({ reducedMotion: checked })} />
    <button onClick={() => updateSettings(defaults)} className="w-full rounded-lg border border-zinc-700 px-2 py-2 text-[11px] text-zinc-400 hover:border-zinc-500 hover:text-white">Reset companion settings</button>
  </div>
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className={`rounded-lg border px-2 py-2 ${active ? 'border-sky-400/60 bg-sky-500/10 text-sky-200' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-900'}`}>{children}</button> }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-sky-400" /></label> }

function ScholarSprite({ appearance, mood, color }: { appearance: CompanionAppearance; mood: CompanionMood; color: string }) {
  const accent = appearance === 'scholarine' ? '#c084fc' : color
  const face = mood === 'thinking' ? '? !' : mood === 'writing' ? '✎ …' : mood === 'celebrating' ? '^ ^' : '> _'
  return <svg viewBox="0 0 120 120" className="h-32 w-32" aria-hidden="true"><path d="M32 70C18 69 17 51 29 43 22 29 38 16 51 25 61 13 78 17 84 26 100 19 108 36 99 47c11 12 1 25-12 22v28H33Z" fill={accent} stroke="#111827" strokeWidth="3" strokeLinejoin="round" /><rect x="36" y="37" width="48" height="31" rx="10" fill="#111827" stroke="#0b1220" strokeWidth="3" /><text x="60" y="58" textAnchor="middle" fontFamily="monospace" fontSize="16" fontWeight="bold" fill="#7dd3fc">{face}</text><rect x="43" y="76" width="35" height="25" rx="9" fill={accent} stroke="#111827" strokeWidth="3" /><text x="60" y="93" textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="bold" fill="#bae6fd">&gt; _</text><path d="M42 82c-12 2-13 14-4 14M79 82c12 2 13 14 4 14" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />{appearance === 'scholarine' && <path d="M78 26c-8-8-13 5 0 3 13 2 8-11 0-3Z" fill="#f472b6" stroke="#111827" strokeWidth="1.5" />}{mood === 'writing' && <path d="m84 75 8 18" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />}{mood === 'alert' && <circle cx="91" cy="23" r="7" fill="#fb7185" stroke="#111827" strokeWidth="2" />}</svg>
}
