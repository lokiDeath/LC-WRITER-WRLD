'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, FolderOpen, MoreVertical, Pencil, Trash2,
  ExternalLink, Share2, LayoutGrid, List as ListIcon, ChevronDown,
  Folder, ArrowDownAZ, X, CloudUpload, Star, Monitor, Clock,
  FileText, ImageIcon, Upload, Loader2,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SmartImportModal } from './smart-import-modal'

type Project = {
  id: string
  name: string
  modified: string
  words: string
  offline: boolean
  owner: 'me' | 'other'
  starred: boolean
}

type FilterOption = 'anyone' | 'me' | 'notme'
type ModalTab = 'recent' | 'mydrive' | 'shared' | 'starred' | 'computers' | 'upload'

export function ProjectsDashboard({ onOpen }: { onOpen?: (project: { id: string; name: string }) => void }) {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterOption>('anyone')
  const [azSorted, setAzSorted] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>('recent')
  const [modalSearch, setModalSearch] = useState('')

  // ─── Fetch projects from /api/projects on mount ───
  const refreshProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.projects)) {
        setProjects(
          data.projects.map((p: { id: string; name: string; updatedAt: string; wordCount?: number; description?: string | null; _count?: { tabs?: number } }) => ({
            id: p.id,
            name: p.name,
            modified: formatRelativeTime(p.updatedAt),
            words: `${(p.wordCount || 0).toLocaleString()}`,
            offline: false,
            owner: 'me' as const,
            starred: false,
          }))
        )
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  let filtered = projects.filter((p) => {
    if (filter === 'me' && p.owner !== 'me') return false
    if (filter === 'notme' && p.owner !== 'other') return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (azSorted) {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }

  function bubbleToTop(id: string) {
    setProjects((prev) => {
      const item = prev.find((p) => p.id === id)
      if (!item) return prev
      const rest = prev.filter((p) => p.id !== id)
      return [{ ...item, modified: 'Just now' }, ...rest]
    })
    setSelectedProject(id)
    const project = projects.find((item) => item.id === id)
    if (project) onOpen?.({ id: project.id, name: project.name })
  }

  function toggleOffline(id: string) {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, offline: !p.offline } : p))
  }

  async function toggleStarred(id: string) {
    // Optimistic update — no backend endpoint yet for star toggle
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, starred: !p.starred } : p))
  }

  async function renameProject(id: string) {
    const newName = prompt('Rename project:')
    if (!newName?.trim()) return
    // Optimistic update
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, name: newName.trim() } : p))
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
    } catch {
      toast.error('Failed to rename on server.')
    }
  }

  async function removeProject(id: string) {
    if (!confirm('Remove this project?')) return
    // Optimistic remove
    setProjects((prev) => prev.filter((p) => p.id !== id))
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      toast.success('Project deleted.')
    } catch {
      toast.error('Failed to delete on server.')
      refreshProjects() // restore on failure
    }
  }

  // ─── Create project: POST to /api/projects ───
  async function createProject(name: string) {
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok && data?.project) {
        const p = data.project
        const newProj: Project = {
          id: p.id,
          name: p.name,
          modified: 'Just now',
          words: '0',
          offline: false,
          owner: 'me',
          starred: false,
        }
        setProjects((prev) => [newProj, ...prev])
        toast.success(`Project "${name}" created.`)
        // Initialize the 12 default tabs for the new project
        try {
          await fetch(`/api/projects/${p.id}/tabs/init`, { method: 'POST' })
        } catch {
          // non-fatal
        }
      } else {
        toast.error(data?.error || 'Failed to create project.')
      }
    } catch {
      toast.error('Network error creating project.')
    } finally {
      setCreating(false)
    }
  }

  const filterLabels: Record<FilterOption, string> = {
    anyone: 'Owned by anyone',
    me: 'Owned by me',
    notme: 'Not owned by me',
  }

  const modalTabs: { id: ModalTab; label: string }[] = [
    { id: 'recent', label: 'Recent' },
    { id: 'mydrive', label: 'My Drive' },
    { id: 'shared', label: 'Shared with me' },
    { id: 'starred', label: 'Starred' },
    { id: 'computers', label: 'Computers' },
    { id: 'upload', label: 'Upload' },
  ]

  // Modal-filtered projects
  const modalFiltered = projects.filter((p) => {
    if (modalSearch && !p.name.toLowerCase().includes(modalSearch.toLowerCase())) return false
    if (modalTab === 'shared') return p.owner === 'other'
    if (modalTab === 'starred') return p.starred
    if (modalTab === 'mydrive' || modalTab === 'recent') return true
    return false
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-8 pt-8 pb-3 shrink-0">
        <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Projects</h1>

        {/* Single "+" create card */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 rounded-xl py-8 flex flex-col items-center justify-center transition group"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition">
              <Plus className="w-6 h-6 text-zinc-400 group-hover:text-zinc-100 transition" />
            </div>
            <p className="text-xs text-zinc-600 mt-2">Create new project</p>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/40 hover:bg-purple-500/5 rounded-xl py-8 flex flex-col items-center justify-center transition group"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-purple-500/20 flex items-center justify-center transition">
              <Upload className="w-6 h-6 text-zinc-400 group-hover:text-purple-300 transition" />
            </div>
            <p className="text-xs text-zinc-600 mt-2 group-hover:text-purple-300 transition">Import manuscript</p>
            <p className="text-[10px] text-zinc-700 mt-0.5">.docx, .txt, or URL</p>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          {/* Left: filter + search + A-Z */}
          <div className="flex items-center gap-2">
            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition bg-zinc-900 border border-zinc-800">
                  {filterLabels[filter]}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-xl min-w-[180px] p-1">
                {(Object.keys(filterLabels) as FilterOption[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn('cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2 transition', filter === key ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800')}
                  >
                    {filterLabels[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-zinc-900 border border-zinc-800 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-red-500/40 focus:outline-none rounded-lg w-44"
              />
            </div>

            {/* A-Z sort — large clear icon */}
            <button
              onClick={() => setAzSorted(!azSorted)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition',
                azSorted
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-600'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-200 border-zinc-800'
              )}
              title="Sort A-Z"
            >
              <span className={cn('text-sm', azSorted ? 'text-red-500' : '')}>A</span>
              <ArrowDownAZ className="w-4 h-4" />
              <span className={cn('text-sm', azSorted ? 'text-red-500' : '')}>Z</span>
            </button>
          </div>

          {/* Right: view toggle + folder picker */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-md transition', viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')} title="Grid view"><LayoutGrid className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-md transition', viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')} title="List view"><ListIcon className="w-3.5 h-3.5" /></button>
            </div>
            <button onClick={() => setShowOpenModal(true)} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition" title="Open project picker"><Folder className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Projects display */}
      <div className="flex-1 overflow-y-auto lc-scroll px-4 md:px-8 pb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent projects</h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mb-2" />
            <p className="text-xs">Loading projects…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">No projects found.</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => bubbleToTop(p.id)} className={cn('group relative bg-zinc-900/50 border rounded-xl p-4 cursor-pointer transition', selectedProject === p.id ? 'border-zinc-600' : 'border-zinc-800 hover:border-zinc-700')}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center"><FolderOpen className="w-4 h-4 text-zinc-500" /></div>
                    {p.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                  </div>
                  <ProjectContextMenu project={p} onRename={() => renameProject(p.id)} onRemove={() => removeProject(p.id)} onToggleOffline={() => toggleOffline(p.id)} onToggleStar={() => toggleStarred(p.id)} onOpen={() => bubbleToTop(p.id)} />
                </div>
                <h3 className="text-sm text-zinc-100 font-medium truncate">{p.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-600">{p.words} words</span>
                  <span className="text-[10px] text-zinc-700">·</span>
                  <span className="text-[10px] text-zinc-600">{p.modified}</span>
                  {p.offline && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">offline</span>}
                  {p.owner === 'other' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">shared</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => bubbleToTop(p.id)} className={cn('group flex items-center gap-3 px-4 py-3 rounded-lg border transition cursor-pointer', selectedProject === p.id ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700')}>
                <FolderOpen className="w-4 h-4 text-zinc-500 shrink-0" />
                {p.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                <div className="flex-1 min-w-0"><h3 className="text-sm text-zinc-100 truncate">{p.name}</h3><p className="text-[10px] text-zinc-600 mt-0.5">{p.words} words · {p.modified}{p.owner === 'other' ? ' · shared' : ''}</p></div>
                {p.offline && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">offline</span>}
                <ProjectContextMenu project={p} onRename={() => renameProject(p.id)} onRemove={() => removeProject(p.id)} onToggleOffline={() => toggleOffline(p.id)} onToggleStar={() => toggleStarred(p.id)} onOpen={() => bubbleToTop(p.id)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/70" onClick={() => setShowCreateModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-zinc-100">Create New Project</h2><button onClick={() => setShowCreateModal(false)} className="text-zinc-600 hover:text-zinc-300"><X className="w-5 h-5" /></button></div>
            <p className="text-xs text-zinc-500 mb-4">Enter a name for your new novel project.</p>
            <input id="new-project-input" type="text" placeholder="Project name..." className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-red-500/40 focus:outline-none rounded-lg mb-4" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value.trim(); if (val) { createProject(val); setShowCreateModal(false) } } }} />
            <div className="flex gap-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 border border-zinc-800 text-zinc-400 py-2 text-xs font-medium uppercase tracking-wider hover:text-zinc-100 hover:border-zinc-600 rounded-lg transition">Cancel</button>
              <button onClick={() => { const input = document.getElementById('new-project-input') as HTMLInputElement; const val = input?.value.trim(); if (val) { createProject(val); setShowCreateModal(false) } }} className="flex-1 bg-red-500 text-white py-2 text-xs font-medium uppercase tracking-wider hover:bg-red-600 rounded-lg transition">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Open a Project modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80" onClick={() => setShowOpenModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-zinc-400" />
                <h2 className="text-base font-semibold text-zinc-100">Open a project</h2>
              </div>
              <button onClick={() => setShowOpenModal(false)} className="p-1 text-zinc-600 hover:text-zinc-300 transition"><X className="w-5 h-5" /></button>
            </div>

            {/* Search bar */}
            <div className="px-5 py-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} placeholder="Search in Drive or paste URL" className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-10 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-red-500/40 focus:outline-none rounded-lg" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition"><ChevronDown className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-5 py-2 border-b border-zinc-800 overflow-x-auto lc-scroll">
              {modalTabs.map((tab) => (
                <button key={tab.id} onClick={() => setModalTab(tab.id)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap', modalTab === tab.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50')}>{tab.label}</button>
              ))}
              <div className="ml-auto flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-md transition', viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}><LayoutGrid className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-md transition', viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}><ListIcon className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto lc-scroll p-4">
              {modalTab === 'upload' ? (
                /* Upload tab — drag and drop */
                <div className="h-full min-h-[300px] flex items-center justify-center">
                  <div className="w-full max-w-md border-2 border-dashed border-zinc-700 rounded-2xl py-16 px-8 flex flex-col items-center text-center">
                    <CloudUpload className="w-12 h-12 text-zinc-600 mb-4" />
                    <button className="bg-red-500 text-white px-5 py-2 rounded-lg text-xs font-medium uppercase tracking-wider hover:bg-red-600 transition mb-3">Browse</button>
                    <p className="text-xs text-zinc-600">or drag a project to upload to My Drive and select</p>
                  </div>
                </div>
              ) : modalFiltered.length === 0 ? (
                /* Empty state for shared/starred/computers */
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                    {modalTab === 'starred' ? <Star className="w-10 h-10 text-zinc-700" /> : modalTab === 'computers' ? <Monitor className="w-10 h-10 text-zinc-700" /> : <Folder className="w-10 h-10 text-zinc-700" />}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-400 mb-1">This folder is empty</h3>
                  <p className="text-xs text-zinc-600">Add projects to this folder and try reloading</p>
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid view */
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {modalFiltered.map((p) => (
                    <div key={p.id} onClick={() => { bubbleToTop(p.id); setShowOpenModal(false) }} className="group relative bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 cursor-pointer transition">
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center"><FolderOpen className="w-4 h-4 text-zinc-500" /></div>
                        {p.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        <ProjectContextMenu project={p} onRename={() => renameProject(p.id)} onRemove={() => removeProject(p.id)} onToggleOffline={() => toggleOffline(p.id)} onToggleStar={() => toggleStarred(p.id)} onOpen={() => { bubbleToTop(p.id); setShowOpenModal(false) }} />
                      </div>
                      <h3 className="text-xs text-zinc-200 font-medium truncate">{p.name}</h3>
                      <p className="text-[9px] text-zinc-600 mt-0.5">{p.modified}</p>
                    </div>
                  ))}
                </div>
              ) : (
                /* List view */
                <div className="space-y-1">
                  {modalFiltered.map((p) => (
                    <div key={p.id} onClick={() => { bubbleToTop(p.id); setShowOpenModal(false) }} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition cursor-pointer">
                      <FolderOpen className="w-4 h-4 text-zinc-500 shrink-0" />
                      {p.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                      <div className="flex-1 min-w-0"><h3 className="text-xs text-zinc-200 truncate">{p.name}</h3><p className="text-[9px] text-zinc-600">{p.modified}</p></div>
                      <ProjectContextMenu project={p} onRename={() => renameProject(p.id)} onRemove={() => removeProject(p.id)} onToggleOffline={() => toggleOffline(p.id)} onToggleStar={() => toggleStarred(p.id)} onOpen={() => { bubbleToTop(p.id); setShowOpenModal(false) }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smart Import Modal */}
      {showImportModal && (
        <SmartImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            // The import route creates the project on the server, so we
            // just need to refresh the list from /api/projects.
            refreshProjects()
          }}
        />
      )}
    </div>
  )
}

// Format an ISO timestamp as a short relative time string.
function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diffMs = now - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay === 1) return 'Yesterday'
    if (diffDay < 7) return `${diffDay}d`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

// ═══ PROJECT CONTEXT MENU (with fixed offline toggle) ═══
function ProjectContextMenu({
  project, onRename, onRemove, onToggleOffline, onToggleStar, onOpen,
}: {
  project: Project
  onRename: () => void
  onRemove: () => void
  onToggleOffline: () => void
  onToggleStar: () => void
  onOpen: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="p-1 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition rounded shrink-0">
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-xl min-w-[180px] p-1">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen() }} className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
          <FolderOpen className="w-3.5 h-3.5 text-zinc-400" /> Open
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStar() }} className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
          <Star className={cn('w-3.5 h-3.5 text-zinc-400', project.starred && 'text-amber-400 fill-amber-400')} /> {project.starred ? 'Remove star' : 'Add star'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename() }} className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
          <Pencil className="w-3.5 h-3.5 text-zinc-400" /> Rename project
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation() }} className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
          <Share2 className="w-3.5 h-3.5 text-zinc-400" /> Share project
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRemove() }} className="hover:bg-red-500/10 text-red-400 cursor-pointer rounded-md px-2.5 py-2 text-[12px] flex items-center gap-2.5">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800 my-1" />
        {/* Fixed offline toggle */}
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-[12px] text-zinc-300">Available offline</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleOffline() }}
            className={cn('relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0', project.offline ? 'bg-red-600' : 'bg-zinc-800')}
          >
            <span className={cn('absolute top-0.5 left-0.5 bg-white rounded-full h-4 w-4 transform transition-transform duration-200', project.offline ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
