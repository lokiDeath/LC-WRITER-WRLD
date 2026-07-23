'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Inbox, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type ReviewSuggestion = {
  id: string
  tabKey: string
  title: string
  content: string
  evidence: string
  confidence: 'high' | 'medium' | 'low'
}

const TAB_LABELS: Record<string, string> = {
  'character-creation': 'Character Creation',
  'world-building': 'World Building',
  'power-system': 'Power System',
  timeline: 'Timeline',
  locations: 'Locations',
  organisations: 'Organisations',
  lore: 'Lore',
  plot: 'Plot',
  research: 'Research',
  publishing: 'Publishing',
  'story-bible': 'Story Bible',
}

type ReviewInboxProps = {
  suggestions: ReviewSuggestion[]
  onApprove: (suggestion: ReviewSuggestion) => Promise<void>
  onReject: (id: string) => void
  onClearAll: () => void
  onClose: () => void
}

export function ReviewInbox({ suggestions, onApprove, onReject, onClearAll, onClose }: ReviewInboxProps) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const grouped = suggestions.reduce<Record<string, ReviewSuggestion[]>>((groups, suggestion) => {
    ;(groups[suggestion.tabKey] ||= []).push(suggestion)
    return groups
  }, {})

  async function approve(suggestion: ReviewSuggestion) {
    setProcessing(suggestion.id)
    try {
      await onApprove(suggestion)
      toast.success(`Added to ${TAB_LABELS[suggestion.tabKey] || suggestion.tabKey}.`)
    } catch {
      toast.error('The suggestion could not be added. Nothing was changed.')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} onClick={(event) => event.stopPropagation()} className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#1a1a1a] bg-zinc-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#1a1a1a] px-5 py-3">
          <div className="flex items-center gap-3"><Inbox className="h-5 w-5 text-purple-400" /><h2 className="text-sm font-semibold text-zinc-200">Review Inbox</h2><span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">{suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}</span></div>
          <div className="flex items-center gap-2">{suggestions.length > 0 && <button onClick={() => setShowClearConfirm(true)} className="rounded px-2 py-1 text-[11px] text-red-400/70 transition hover:bg-red-500/10 hover:text-red-300">Clear all</button>}<button onClick={onClose} className="rounded p-1 text-zinc-600 transition hover:text-zinc-300" title="Close review inbox"><X className="h-5 w-5" /></button></div>
        </div>
        <div className="lc-scroll flex-1 overflow-y-auto space-y-6 p-5">
          {suggestions.length === 0 ? <div className="py-12 text-center"><p className="text-sm text-zinc-500">No review suggestions pending.</p><p className="mt-1 text-xs text-zinc-600">A review only runs when you ask it to.</p></div> : Object.entries(grouped).map(([tabKey, items]) => <section key={tabKey}><h3 className="mb-2 border-b border-[#1a1a1a] pb-1 text-[12px] font-semibold uppercase tracking-wider text-zinc-400">{TAB_LABELS[tabKey] || tabKey}</h3><div className="space-y-3">{items.map((suggestion) => <article key={suggestion.id} className="rounded-lg border border-[#1a1a1a] bg-zinc-950 p-4 transition hover:border-zinc-800"><div className="flex items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h4 className="text-[13px] font-medium text-zinc-200">{suggestion.title}</h4><span className={cn('rounded px-1.5 py-0.5 text-[9px] font-mono uppercase', suggestion.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-300' : suggestion.confidence === 'medium' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-500/20 text-zinc-400')}>{suggestion.confidence}</span></div><p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-400">{suggestion.content}</p><p className="mt-2 rounded border border-[#1a1a1a] bg-zinc-900/50 p-2 text-[11px] text-zinc-500"><span className="font-mono text-[10px] text-zinc-600">Evidence:</span> {suggestion.evidence}</p></div><div className="flex shrink-0 items-center gap-1.5"><button onClick={() => approve(suggestion)} disabled={processing === suggestion.id} title="Approve and add this suggestion" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50">{processing === suggestion.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</button><button onClick={() => { onReject(suggestion.id); toast.info('Suggestion rejected.') }} disabled={processing === suggestion.id} title="Reject" className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"><X className="h-4 w-4" /></button></div></div></article>)}</div></section>)}
        </div>
        <AnimatePresence>{showClearConfirm && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowClearConfirm(false)} className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-lg border border-[#1a1a1a] bg-zinc-900 p-6"><h3 className="text-sm font-semibold text-zinc-200">Clear all suggestions?</h3><p className="mt-2 text-[12px] text-zinc-400">This removes only pending review cards. It does not change your writing.</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 text-[12px] text-zinc-400 hover:text-zinc-200">Cancel</button><button onClick={() => { onClearAll(); setShowClearConfirm(false) }} className="rounded bg-red-600 px-3 py-1.5 text-[12px] text-white hover:bg-red-700">Clear all</button></div></div></motion.div>}</AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
