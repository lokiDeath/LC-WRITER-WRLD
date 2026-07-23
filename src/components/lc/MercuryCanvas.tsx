'use client'

import { useEffect, useRef } from 'react'

/**
 * Liquid Mercury Particle System — Canvas 2D.
 * ~900 particles drifting through a subtle noise field, repelled by the mouse.
 */
class MercuryParticle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  size: number
  phase: number
  rand: number
  constructor(w: number, h: number) {
    this.x = (Math.random() - 0.5) * w * 1.4
    this.y = (Math.random() - 0.5) * h * 1.4
    this.z = (Math.random() - 0.5) * 4
    this.vx = (Math.random() - 0.5) * 0.3
    this.vy = (Math.random() - 0.5) * 0.3
    this.size = 1.5 + Math.random() * 2.5
    this.phase = Math.random() * Math.PI * 2
    this.rand = 0.5 + Math.random() * 0.5
  }
  update(time: number, mouseX: number, mouseY: number, w: number, h: number) {
    const n1 = Math.sin(this.x * 0.003 + time * 0.0005 + this.phase) * 0.15
    const n2 = Math.cos(this.y * 0.003 + time * 0.0004 + this.phase * 0.7) * 0.15
    this.vx += n1 * 0.01
    this.vy += n2 * 0.01
    this.vx *= 0.99
    this.vy *= 0.99

    const mdx = mouseX - this.x
    const mdy = mouseY - this.y
    const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
    if (mdist < 200 && mdist > 0) {
      const force = (200 - mdist) * 0.00008
      this.vx -= (mdx / mdist) * force
      this.vy -= (mdy / mdist) * force
    }

    this.x += this.vx
    this.y += this.vy

    if (this.x < -w * 0.7) this.x = w * 0.7
    if (this.x > w * 0.7) this.x = -w * 0.7
    if (this.y < -h * 0.7) this.y = h * 0.7
    if (this.y > h * 0.7) this.y = -h * 0.7
  }
}

export function MercuryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<MercuryParticle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const PARTICLE_COUNT = 900
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.push(
          new MercuryParticle(canvas.width, canvas.height)
        )
      }
    }

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX - canvas.width / 2
      mouseRef.current.y = e.clientY - canvas.height / 2
    }
    window.addEventListener('mousemove', handleMouse, { passive: true })

    // Read the current theme tokens so the particle palette matches the UI.
    // We sample these once per frame (cheap) so theme switches are picked up.
    const getThemeColors = () => {
      const root = document.documentElement
      const cs = getComputedStyle(root)
      const isDark = root.classList.contains('dark') ||
        root.getAttribute('data-theme') === 'dark'
      // Fade-cover (the translucent rectangle drawn each frame that creates
      // the trailing motion-blur effect). Use the page surface color.
      const bg = cs.getPropertyValue('--bg-app').trim() || (isDark ? '#0c0b0a' : '#fbfaf7')
      // Particle base hue derived from the accent color so the field always
      // feels aligned with the brand.
      const accent = cs.getPropertyValue('--accent-color').trim() || (isDark ? '#8b7cff' : '#7c5cff')
      return { isDark, bg, accent }
    }

    const hexToRgb = (hex: string): [number, number, number] => {
      let h = hex.replace('#', '').trim()
      if (h.length === 3) {
        h = h.split('').map((c) => c + c).join('')
      }
      const num = parseInt(h, 16)
      if (Number.isNaN(num) || h.length !== 6) return [200, 195, 190]
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
    }

    let time = 0
    const animate = () => {
      time += 16
      const { isDark, bg, accent } = getThemeColors()
      const [br, bg2, bb] = hexToRgb(bg)
      const [ar, ag, ab] = hexToRgb(accent)

      // Translucent fill creates the motion-blur trail. Match the page bg.
      ctx.fillStyle = `rgba(${br}, ${bg2}, ${bb}, ${isDark ? 0.18 : 0.10})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const cx = canvas.width / 2
      const cy = canvas.height / 2

      for (const p of particlesRef.current) {
        p.update(time, mouseRef.current.x, mouseRef.current.y, canvas.width, canvas.height)
        const sx = cx + p.x
        const sy = cy + p.y
        const depth = (p.z + 2) / 4
        const alpha = (isDark ? 0.22 : 0.30) + depth * 0.40
        const flicker = 0.82 + Math.sin(time * 0.002 + p.phase) * 0.18

        // Blend the particle color between the accent and a neutral
        // brightness tier so the field has depth without harshness.
        const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)
        const r = mix(ar, isDark ? 180 : 120, depth * 0.45)
        const g = mix(ag, isDark ? 175 : 115, depth * 0.45)
        const b = mix(ab, isDark ? 170 : 110, depth * 0.45)

        ctx.beginPath()
        ctx.arc(sx, sy, p.size * (0.8 + depth * 0.4), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * flicker})`
        ctx.fill()

        if (p.rand > 0.7) {
          ctx.beginPath()
          ctx.arc(sx, sy - 0.5, p.size * 0.3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 25)}, ${Math.min(255, b + 20)}, ${alpha * 0.35})`
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
      aria-hidden
    />
  )
}
