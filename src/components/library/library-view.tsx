'use client'

import { useState } from 'react'
import {
  Search, Plus, Upload, Folder, StickyNote, LayoutGrid, List as ListIcon,
  Download, FolderInput, CheckSquare, Square, X, FileText, Image as ImageIcon,
  MoreVertical, ChevronDown, FileType, MessageSquare, Trash2,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const DUMMY_FILES = [
  { name: 'Chapter_1.docx', modified: 'Today', size: '45 KB', type: 'file' },
  { name: 'World_Map.png', modified: 'Today', size: '1.2 MB', type: 'image' },
  { name: 'Character_Notes.txt', modified: 'Yesterday', size: '12 KB', type: 'file' },
  { name: 'Outline.pdf', modified: 'Yesterday', size: '89 KB', type: 'file' },
  { name: 'Magic_System.docx', modified: 'Jul 11', size: '34 KB', type: 'file' },
  { name: 'Cover_Draft.png', modified: 'Jul 11', size: '2.4 MB', type: 'image' },
  { name: 'Cultivation_Chart.png', modified: 'Jul 10', size: '876 KB', type: 'image' },
  { name: 'Lore_Bible.docx', modified: 'Jul 10', size: '156 KB', type: 'file' },
  { name: 'Scene_Drafts.txt', modified: 'Jul 8', size: '23 KB', type: 'file' },
  { name: 'Character_Portrait_Mira.png', modified: 'Jul 8', size: '3.1 MB', type: 'image' },
  { name: 'Timeline_Notes.pdf', modified: 'Jul 5', size: '67 KB', type: 'file' },
  { name: 'Battle_Map.png', modified: 'Jul 5', size: '1.8 MB', type: 'image' },
  { name: 'Dialogue_Scratch.txt', modified: 'Jun 28', size: '8 KB', type: 'file' },
  { name: 'World_Structure.png', modified: 'Jun 28', size: '2.2 MB', type: 'image' },
  { name: 'Plot_Arcs.docx', modified: 'Jun 20', size: '92 KB', type: 'file' },
  { name: 'Reference_Images.zip', modified: 'Jun 16', size: '14.3 MB', type: 'file' },
  { name: 'Character_Portrait_Aldric.png', modified: 'Jun 16', size: '2.8 MB', type: 'image' },
  { name: 'Revision_Notes.txt', modified: 'Jun 10', size: '15 KB', type: 'file' },
  { name: 'Cover_Final.png', modified: 'Jun 10', size: '4.1 MB', type: 'image' },
  { name: 'Research_Data.pdf', modified: 'Jun 5', size: '234 KB', type: 'file' },
]

export function LibraryView() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = DUMMY_FILES.filter((f) => {
    if (filter === 'images' && f.type !== 'image') return false
    if (filter === 'files' && f.type !== 'file') return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const selectedCount = selectedFiles.size
  const hasSelection = selectedCount > 0

  function toggleSelect(name: string) {
    setSelectedFiles((prev) => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next })
  }
  function selectAll() {
    if (selectedFiles.size === filtered.length) setSelectedFiles(new Set())
    else setSelectedFiles(new Set(filtered.map((f) => f.name)))
  }
  function clearSelection() { setSelectedFiles(new Set()) }
  function showToastMsg(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }
  function handleDelete() { const count = selectedFiles.size; setSelectedFiles(new Set()); showToastMsg(`Deleted ${count} file${count > 1 ? 's' : ''}.`) }
  function handleDownload() { showToastMsg(`Downloading ${selectedCount} file${selectedCount > 1 ? 's' : ''}...`) }
  function getFileIcon(file: typeof DUMMY_FILES[0]) {
    if (file.type === 'image') return ImageIcon
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return FileType
    if (ext === 'zip') return FolderInput
    return FileText
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 pt-8 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-semibold text-zinc-100">Library</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                <Plus className="w-3.5 h-3.5" /> New <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-xl min-w-[160px] p-1">
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[13px] flex items-center gap-2.5" onClick={() => showToastMsg('Upload dialog would open.')}>
                <Upload className="w-4 h-4 text-zinc-400" /> Upload
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[13px] flex items-center gap-2.5" onClick={() => showToastMsg('New folder created.')}>
                <Folder className="w-4 h-4 text-zinc-400" /> Folder
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer rounded-md px-2.5 py-2 text-[13px] flex items-center gap-2.5" onClick={() => showToastMsg('New note opened.')}>
                <StickyNote className="w-4 h-4 text-zinc-400" /> Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..." className="w-full bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-red-500/40 focus:outline-none rounded-lg" />
        </div>
        <div className="flex items-center justify-between">
          {hasSelection ? (
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-500 cursor-not-allowed bg-zinc-900 border border-zinc-800 opacity-50">
                <MessageSquare className="w-3.5 h-3.5" /> Start chat
              </button>
              <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:bg-zinc-800 bg-zinc-900 border border-zinc-800 transition">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button onClick={() => setShowMoveModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:bg-zinc-800 bg-zinc-900 border border-zinc-800 transition">
                <FolderInput className="w-3.5 h-3.5" /> Move
              </button>
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-400 hover:bg-red-500/10 bg-zinc-900 border border-red-500/20 transition">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <span className="text-xs text-zinc-500 ml-2">{selectedCount} selected</span>
              <button onClick={clearSelection} className="ml-1 p-1 text-zinc-600 hover:text-zinc-300 transition" title="Clear selection">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {['all', 'images', 'files'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition capitalize', filter === f ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50')}>{f}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-md transition', viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')} title="Grid view">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-md transition', viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')} title="List view">
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto lc-scroll px-8 pb-8">
        {viewMode === 'list' ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                  <th className="px-4 py-3 w-10"><button onClick={selectAll} className="text-zinc-500 hover:text-zinc-300 transition">{selectedFiles.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4" />}</button></th>
                  <th className="text-left px-2 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium w-32"><button className="flex items-center gap-1 hover:text-zinc-300 transition">Modified <ChevronDown className="w-3 h-3" /></button></th>
                  <th className="text-right px-4 py-3 font-medium w-20">Size</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((file, i) => {
                  const isSelected = selectedFiles.has(file.name)
                  const Icon = getFileIcon(file)
                  return (
                    <tr key={file.name} onClick={() => toggleSelect(file.name)} className={cn('border-b border-zinc-800/50 hover:bg-zinc-800/30 transition cursor-pointer', isSelected && 'bg-red-500/5', !isSelected && i % 2 === 1 && 'bg-zinc-900/30')}>
                      <td className="px-4 py-3">{isSelected ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4 text-zinc-700" />}</td>
                      <td className="px-2 py-3"><div className="flex items-center gap-2.5"><Icon className={cn('w-4 h-4 shrink-0', file.type === 'image' ? 'text-blue-400/70' : 'text-zinc-500')} /><span className={cn('text-zinc-200', isSelected && 'text-zinc-100')}>{file.name}</span></div></td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{file.modified}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs text-right tabular-nums">{file.size}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-zinc-600 text-sm">No files found.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((file) => {
              const isSelected = selectedFiles.has(file.name)
              const Icon = getFileIcon(file)
              return (
                <div key={file.name} onClick={() => toggleSelect(file.name)} className={cn('group relative bg-zinc-900/50 border rounded-lg overflow-hidden cursor-pointer transition-all', isSelected ? 'border-red-500/40 ring-1 ring-red-500/20' : 'border-zinc-800 hover:border-zinc-700')}>
                  <div className="aspect-square bg-zinc-900 flex items-center justify-center relative">
                    {file.type === 'image' ? <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center"><ImageIcon className="w-10 h-10 text-zinc-700" /></div> : <Icon className="w-10 h-10 text-zinc-700" />}
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(file.name) }} className={cn('absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center transition', isSelected ? 'bg-red-500 text-white' : 'bg-zinc-800/80 text-zinc-600 opacity-0 group-hover:opacity-100')}>
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="px-3 py-2"><p className="text-xs text-zinc-300 truncate font-medium">{file.name}</p><p className="text-[10px] text-zinc-600 mt-0.5">{file.modified} · {file.size}</p></div>
                </div>
              )
            })}
            {filtered.length === 0 && <div className="col-span-full text-center py-12 text-zinc-600 text-sm">No files found.</div>}
          </div>
        )}
      </div>
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowMoveModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2"><FolderInput className="w-4 h-4 text-zinc-400" /> Move to folder</h3><button onClick={() => setShowMoveModal(false)} className="text-zinc-600 hover:text-zinc-300"><X className="w-4 h-4" /></button></div>
            <p className="text-xs text-zinc-500 mb-4">Move {selectedCount} file{selectedCount > 1 ? 's' : ''} to a folder:</p>
            <div className="space-y-1 mb-4">
              {['Character Art', 'World Maps', 'Outlines', 'Research'].map((folder) => (
                <button key={folder} onClick={() => { setShowMoveModal(false); clearSelection(); showToastMsg(`Moved to ${folder}.`) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-zinc-800 transition text-left"><Folder className="w-4 h-4 text-zinc-500" /><span className="text-xs text-zinc-300">{folder}</span></button>
              ))}
            </div>
            <button onClick={() => setShowMoveModal(false)} className="w-full border border-zinc-800 text-zinc-400 py-2 text-xs font-medium uppercase tracking-wider hover:text-zinc-100 hover:border-zinc-600 rounded-md transition">Cancel</button>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl text-xs text-zinc-200">{toast}</div>}
    </div>
  )
}

