'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bell, BookOpen, FolderOpen, MessageSquare, PenLine, Settings2, Sparkles, X } from 'lucide-react'

type CompanionAppearance = 'scholar' | 'scholarine'
type CompanionMood = 'idle' | 'writing' | 'thinking' | 'celebrating' | 'alert'

type CompanionSettings = {
  name: string
  appearance: CompanionAppearance
  enabled: boolean
  reducedMotion: boolean
}

type CompanionSignal = {
  mood?: CompanionMood
  message?: string
}

const STORAGE_KEY = 'lc_author_companion_v1'
const defaults: CompanionSettings = { name: 'Ink', appearance: 'scholar', enabled: true, reducedMotion: false }

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

  if (!mounted) return null

  return (
    <aside className="fixed bottom-5 right-4 z-[10020] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:bottom-7 sm:right-7" aria-label="Writing companion">
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
      <button
        type="button"
        onClick={() => { if (!settings.enabled) updateSettings({ enabled: true }); setOpen((value) => !value) }}
        className={`group relative flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-300/35 bg-gradient-to-br from-sky-500/30 via-indigo-500/25 to-violet-500/35 shadow-xl shadow-sky-950/40 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-300 ${reduceMotion ? '' : mood === 'thinking' ? 'animate-pulse' : mood === 'writing' ? 'lc-companion-float' : 'lc-companion-drift'}`}
        aria-label={open ? `Close ${settings.name}` : `Open ${settings.name}, your writing companion`}
        aria-expanded={open}
      >
        <ScholarSprite appearance={settings.appearance} mood={mood} />
        {notice && <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-zinc-950 bg-rose-400" aria-label="New companion notification" />}
        {!settings.enabled && <span className="absolute -bottom-5 whitespace-nowrap text-[10px] text-zinc-400">Show companion</span>}
      </button>
      {!open && settings.enabled && <p className="max-w-48 text-right text-[10px] text-zinc-500 opacity-0 transition group-hover:opacity-100 sm:group-hover:opacity-100">{statusText}</p>}
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
    <Toggle label="Reduce animation" checked={settings.reducedMotion} onChange={(checked) => updateSettings({ reducedMotion: checked })} />
    <button onClick={() => updateSettings(defaults)} className="w-full rounded-lg border border-zinc-700 px-2 py-2 text-[11px] text-zinc-400 hover:border-zinc-500 hover:text-white">Reset companion settings</button>
  </div>
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className={`rounded-lg border px-2 py-2 ${active ? 'border-sky-400/60 bg-sky-500/10 text-sky-200' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-900'}`}>{children}</button> }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-sky-400" /></label> }

function ScholarSprite({ appearance, mood }: { appearance: CompanionAppearance; mood: CompanionMood }) {
  const robe = appearance === 'scholar' ? '#3359a6' : '#7646a8'
  const hair = appearance === 'scholar' ? '#172554' : '#4c1d95'
  const thinking = mood === 'thinking' || mood === 'writing'
  return <svg viewBox="0 0 96 96" className="h-14 w-14 drop-shadow-md" aria-hidden="true"><circle cx="48" cy="46" r="27" fill="#89b5ff" /><circle cx="48" cy="43" r="20" fill="#f2c9ae" /><path d={appearance === 'scholar' ? 'M28 42c1-18 38-22 40 1-7-6-12-7-20-7s-13 1-20 6Z' : 'M25 49c0-20 43-23 46 1-7-7-14-10-23-10S32 42 25 49Z'} fill={hair} /><rect x="25" y="60" width="46" height="27" rx="16" fill={robe} /><path d="M42 52h12" stroke="#264653" strokeWidth="2" /><circle cx="40" cy="47" r="6" fill="none" stroke="#334155" strokeWidth="2" /><circle cx="56" cy="47" r="6" fill="none" stroke="#334155" strokeWidth="2" /><path d="M46 47h4" stroke="#334155" strokeWidth="2" /><path d="M42 55q6 4 12 0" fill="none" stroke="#9a5d50" strokeWidth="1.5" />{thinking ? <path d="M31 65q7-16 15-17" fill="none" stroke="#f2c9ae" strokeWidth="4" strokeLinecap="round" /> : <><path d="M31 67q-5 7-1 12" fill="none" stroke="#f2c9ae" strokeWidth="4" strokeLinecap="round" /><path d="M65 67q7 3 6 11" fill="none" stroke="#f2c9ae" strokeWidth="4" strokeLinecap="round" /></>}<rect x="57" y="67" width="13" height="15" rx="2" fill="#d7a750" /><path d="M59 72h9M59 76h9" stroke="#8b5e19" strokeWidth="1" />{mood === 'alert' && <circle cx="73" cy="22" r="6" fill="#fb7185" />}</svg>
}
