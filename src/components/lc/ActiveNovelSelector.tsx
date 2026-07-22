'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { ChevronDown, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type Novel = {
  id: string
  title: string
  genre: string | null
  status: string
}

export function ActiveNovelSelector() {
  const activeNovelId = useApp((s) => s.activeNovelId)
  const setActiveNovelId = useApp((s) => s.setActiveNovelId)
  const setView = useApp((s) => s.setView)
  const [novels, setNovels] = useState<Novel[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/novels')
      .then((r) => r.json())
      .then((d) => {
        setNovels(d.novels || [])
        if (!activeNovelId && d.novels?.length > 0) {
          setActiveNovelId(d.novels[0].id)
        }
      })
  }, [activeNovelId, setActiveNovelId])

  const active = novels.find((n) => n.id === activeNovelId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2.5 py-2 bg-[#0a0908] border border-[rgba(201,169,110,0.15)] hover:border-[#c9a96e] transition-colors text-left"
      >
        <BookOpen className="w-3.5 h-3.5 text-[#c9a96e] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-mono text-[#5d4037] uppercase tracking-wider">
            Active Novel
          </div>
          <div className="text-xs text-[#f8f5f2] truncate">
            {active?.title || 'Select a novel'}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[#8a7c6b] transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0908] border border-[rgba(201,169,110,0.2)] z-20 max-h-64 overflow-y-auto lc-scroll">
            {novels.length === 0 && (
              <button
                onClick={() => {
                  setView('workspace')
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-xs text-[#8a7c6b] hover:bg-[rgba(201,169,110,0.06)]"
              >
                No novels yet — create one
              </button>
            )}
            {novels.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setActiveNovelId(n.id)
                  setOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-[rgba(201,169,110,0.06)] transition',
                  n.id === activeNovelId ? 'bg-[rgba(201,169,110,0.08)]' : ''
                )}
              >
                <div className="text-xs text-[#f8f5f2] truncate">{n.title}</div>
                <div className="text-[9px] text-[#5d4037] font-mono uppercase">
                  {n.genre || 'No genre'} · {n.status}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
