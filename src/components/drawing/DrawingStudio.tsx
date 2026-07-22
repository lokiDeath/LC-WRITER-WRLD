'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Brush, Pencil, Eraser, Square, Circle as CircleIcon, Palette,
  Image as ImageIcon, Save, Plus, Eye, EyeOff, Lock, Unlock, Trash2,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Tool = 'brush' | 'pencil' | 'eraser' | 'rectangle' | 'circle'
type Layer = {
  id: string
  name: string
  visible: boolean
  locked: boolean
}

type SavedAsset = {
  id: string
  name: string
  dataUrl: string
  createdAt: string
}

export function DrawingStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState('#8b5cf6')
  const [brushSize, setBrushSize] = useState(5)
  const [opacity, setOpacity] = useState(1)
  const isDrawing = useRef(false)
  const startPoint = useRef<{ x: number; y: number } | null>(null)
  const snapshotRef = useRef<ImageData | null>(null)

  const [layers, setLayers] = useState<Layer[]>([
    { id: 'l1', name: 'Layer 1', visible: true, locked: false },
  ])
  const [activeLayerId, setActiveLayerId] = useState('l1')
  const [savedAssets, setSavedAssets] = useState<SavedAsset[]>([])
  const [activeTab, setActiveTab] = useState<'canvas' | 'assets' | 'courses'>('canvas')
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Initialize canvas
  useEffect(() => {
    if (activeTab !== 'canvas') return
    const canvas = canvasRef.current
    if (!canvas) return
    const container = containerRef.current
    if (container) {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.fillStyle = '#0a0908'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctxRef.current = ctx
    }
  }, [activeTab])

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const ctx = ctxRef.current
    if (!ctx) return
    const activeLayer = layers.find((l) => l.id === activeLayerId)
    if (activeLayer?.locked) {
      toast.error('Layer is locked. Unlock it to draw.')
      return
    }
    isDrawing.current = true
    const pos = getPos(e)
    startPoint.current = pos
    const canvas = canvasRef.current!
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = opacity
    ctx.lineWidth = brushSize
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    if (tool === 'brush' || tool === 'pencil' || tool === 'eraser') {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }, [tool, color, brushSize, opacity, layers, activeLayerId, getPos])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return
    e.preventDefault()
    const ctx = ctxRef.current
    if (!ctx) return
    const pos = getPos(e)
    if (tool === 'brush' || tool === 'pencil' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'rectangle' || tool === 'circle') {
      if (snapshotRef.current) ctx.putImageData(snapshotRef.current, 0, 0)
      const start = startPoint.current
      if (!start) return
      ctx.beginPath()
      if (tool === 'rectangle') {
        ctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y)
      } else {
        const radius = Math.sqrt((pos.x - start.x) ** 2 + (pos.y - start.y) ** 2)
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }, [tool, getPos])

  const endDraw = useCallback(() => {
    isDrawing.current = false
    startPoint.current = null
    snapshotRef.current = null
  }, [])

  const saveToProject = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    setSavedAssets((prev) => [{
      id: `asset_${Date.now()}`,
      name: `Sketch ${prev.length + 1}`,
      dataUrl,
      createdAt: new Date().toISOString(),
    }, ...prev])
    toast.success('Saved to project assets.')
  }, [])

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `lc-drawing-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success('Drawing downloaded.')
  }, [])

  const importImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        const ctx = ctxRef.current
        if (!canvas || !ctx) return
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        toast.success('Image imported.')
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.fillStyle = '#0a0908'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    toast.success('Canvas cleared.')
  }, [])

  const addLayer = useCallback(() => {
    const newLayer: Layer = { id: `l${Date.now()}`, name: `Layer ${layers.length + 1}`, visible: true, locked: false }
    setLayers((prev) => [...prev, newLayer])
    setActiveLayerId(newLayer.id)
  }, [layers.length])

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, visible: !l.visible } : l))
  }, [])
  const toggleLayerLock = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, locked: !l.locked } : l))
  }, [])
  const deleteLayer = useCallback((id: string) => {
    if (layers.length <= 1) { toast.error('Cannot delete the last layer.'); return }
    setLayers((prev) => prev.filter((l) => l.id !== id))
    if (activeLayerId === id) {
      const remaining = layers.filter((l) => l.id !== id)
      if (remaining[0]) setActiveLayerId(remaining[0].id)
    }
  }, [layers, activeLayerId])

  const tools = [
    { id: 'brush' as Tool, icon: Brush, label: 'Brush' },
    { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as Tool, icon: CircleIcon, label: 'Circle' },
  ]

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#1a1a1a] shrink-0">
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-100">Drawing Studio</h2>
          <p className="text-[10px] text-zinc-500">Digital canvas, art prompts, and visual asset designer for your project.</p>
        </div>
      </div>

      <div className="flex border-b border-[#1a1a1a] shrink-0">
        {([['canvas','Canvas'],['assets','Project Assets'],['courses','Skill Courses & Prompts']] as const).map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)} className={cn('px-4 py-2.5 text-[11px] font-medium transition', activeTab === id ? 'text-zinc-200 border-b border-purple-500' : 'text-zinc-600 hover:text-zinc-400')}>{label}</button>
        ))}
      </div>

      {activeTab === 'canvas' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left toolbar */}
          <div className="w-12 shrink-0 bg-zinc-950 border-r border-[#1a1a1a] flex flex-col items-center py-3 gap-1.5">
            {tools.map((t) => (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.label} className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition', tool === t.id ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800')}>
                <t.icon className="w-4 h-4" />
              </button>
            ))}
            <div className="relative">
              <button onClick={() => setShowColorPicker(!showColorPicker)} title="Color" className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition">
                <Palette className="w-4 h-4" />
              </button>
              {showColorPicker && (
                <div className="absolute left-full ml-2 top-0 z-[100] bg-zinc-900 border border-[#1a1a1a] rounded-lg p-2 shadow-2xl">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {['#8b5cf6','#dc2626','#10b981','#2563eb','#f59e0b','#ec4899','#ffffff','#000000'].map((c) => (
                      <button key={c} onClick={() => { setColor(c); setShowColorPicker(false) }} className="w-5 h-5 rounded border border-zinc-700" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="w-6 h-px bg-[#1a1a1a] my-1" />
            <label className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer" title="Import Image">
              <ImageIcon className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={importImage} />
            </label>
            <button onClick={saveToProject} title="Save to Project" className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition">
              <Save className="w-4 h-4" />
            </button>
            <button onClick={downloadCanvas} title="Download PNG" className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={clearCanvas} title="Clear Canvas" className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 text-red-400 hover:bg-red-500/10 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas */}
          <div ref={containerRef} className="flex-1 relative bg-zinc-900 overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              className="absolute inset-0 cursor-crosshair touch-none"
            />
          </div>

          {/* Right panel */}
          <div className="w-48 shrink-0 bg-zinc-950 border-l border-[#1a1a1a] p-3 overflow-y-auto lc-scroll">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">Layers</p>
              <button onClick={addLayer} className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition" title="Add Layer">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {layers.map((layer) => (
                <div key={layer.id} onClick={() => setActiveLayerId(layer.id)} className={cn('flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition', activeLayerId === layer.id ? 'bg-zinc-800' : 'bg-zinc-900 hover:bg-zinc-800/50')}>
                  <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id) }} className="text-zinc-500 hover:text-zinc-200">
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer.id) }} className="text-zinc-500 hover:text-zinc-200">
                    {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-[10px] text-zinc-400 flex-1 truncate">{layer.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id) }} className="text-zinc-600 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-zinc-600">Brush Size</p>
                  <p className="text-[9px] text-zinc-400 font-mono">{brushSize}px</p>
                </div>
                <input type="range" min={1} max={100} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-zinc-600">Opacity</p>
                  <p className="text-[9px] text-zinc-400 font-mono">{Math.round(opacity * 100)}%</p>
                </div>
                <input type="range" min={0} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="w-full accent-purple-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[9px] text-zinc-600 mb-1">Current Color</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-zinc-700" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-zinc-400 font-mono">{color}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="flex-1 overflow-y-auto lc-scroll p-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-[12px] text-zinc-500 mb-4">Gallery of saved sketches.</p>
            {savedAssets.length === 0 ? (
              <div className="text-center py-12">
                <Save className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-[12px] text-zinc-600">No saved assets yet. Draw something and click Save to add it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {savedAssets.map((asset) => (
                  <div key={asset.id} className="bg-zinc-950 border border-[#1a1a1a] rounded-lg overflow-hidden group">
                    <img src={asset.dataUrl} alt={asset.name} className="w-full aspect-video object-cover" />
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 truncate">{asset.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <a href={asset.dataUrl} download={`${asset.name}.png`} className="p-1 text-zinc-500 hover:text-zinc-200"><Download className="w-3 h-3" /></a>
                        <button onClick={() => setSavedAssets((prev) => prev.filter((a) => a.id !== asset.id))} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="flex-1 overflow-y-auto lc-scroll p-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-[12px] text-zinc-500 mb-4">Practice modules across four mastery tiers.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {['Beginner','Intermediate','Advanced','Sovereign Artist'].map((tier, i) => (
                <button key={tier} className={cn('px-3 py-2.5 text-[11px] font-medium rounded-md border transition', i === 0 ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-zinc-950 border-[#1a1a1a] text-zinc-500 hover:text-zinc-300')}>{tier}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['Perspective','Anatomy','Color Theory','Lighting & Shadow'].map((topic) => (
                <div key={topic} className="bg-zinc-950 border border-[#1a1a1a] rounded-lg p-4">
                  <p className="text-[12px] text-zinc-300 font-medium mb-1">{topic}</p>
                  <p className="text-[10px] text-zinc-600 mb-3">Practice prompts + certification milestones</p>
                  <button className="text-[10px] text-purple-400 hover:text-purple-300">Start course →</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
