'use client'

import { useEffect } from 'react'

export function LucianIntro({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 5600)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return (
    <main className="lc-intro-stage" aria-label="Lucian Creation">
      <style>{`
        .lc-intro-stage { position: fixed; inset: 0; z-index: 99999; display: grid; place-items: center; overflow: hidden; background: radial-gradient(circle at 50% 52%, rgba(255,210,120,.08), transparent 18%), radial-gradient(circle at 50% 50%, rgba(255,255,255,.04), transparent 32%), #000; }
        .lc-intro-stage svg { width: min(88vw, 1100px); height: auto; overflow: visible; }
        .lc-intro-outline { fill: transparent; stroke: rgba(255,230,170,.45); stroke-width: 1.1; opacity: 0; filter: url(#lc-soft-glow); animation: lc-outline 1.1s 3.1s ease-out forwards; }
        .lc-intro-fill { fill: url(#lc-logo-gradient); opacity: 0; filter: url(#lc-gold-glow); animation: lc-fill 1.35s 3.2s ease-in-out forwards, lc-breathe 1.2s 4.15s ease-in-out 2 alternate; }
        .lc-intro-particle { fill: #fff7d6; opacity: 0; filter: url(#lc-particle-glow); transform-origin: center; animation: lc-particle-drop 3.4s ease-in-out forwards, lc-particle-fade .95s 3.45s ease-out forwards; }
        .lc-intro-line { stroke: url(#lc-line-gradient); stroke-width: 2.5; stroke-linecap: round; opacity: 0; filter: url(#lc-particle-glow); animation: lc-line 3.45s ease-in-out forwards; }
        .lc-intro-flash { fill: url(#lc-flash-gradient); opacity: 0; transform-origin: center; filter: blur(10px); animation: lc-flash 2.1s 3s ease-out forwards; }
        .lc-intro-ambient { fill: url(#lc-ambient-gradient); opacity: 0; filter: blur(28px); animation: lc-ambient 1.8s 3.7s ease-out forwards; }
        @keyframes lc-particle-drop { 0% { opacity: 0; transform: translateY(0) scale(1); } 12% { opacity: 1; } 82% { opacity: 1; transform: translateY(278px) scale(1); } 100% { opacity: 1; transform: translateY(278px) scale(2.2); } }
        @keyframes lc-particle-fade { to { opacity: 0; transform: translateY(278px) scale(.1); } }
        @keyframes lc-line { 0% { opacity: 0; stroke-dasharray: 0 300; } 14% { opacity: .85; } 82% { opacity: .85; stroke-dasharray: 300 0; } 100% { opacity: 0; } }
        @keyframes lc-outline { to { opacity: .35; } }
        @keyframes lc-fill { to { opacity: 1; } }
        @keyframes lc-flash { 0% { opacity: 0; transform: scale(.7); } 25% { opacity: 1; transform: scale(1.15); } 100% { opacity: 0; transform: scale(1.85); } }
        @keyframes lc-ambient { to { opacity: 1; } }
        @keyframes lc-breathe { to { transform: scale(1.015); } }
        @media (prefers-reduced-motion: reduce) { .lc-intro-outline, .lc-intro-fill, .lc-intro-particle, .lc-intro-line, .lc-intro-flash, .lc-intro-ambient { animation-duration: .01ms; animation-delay: 0ms; animation-fill-mode: forwards; } }
      `}</style>
      <svg viewBox="0 0 1200 600" role="img" aria-label="LUCIAN CREATION">
        <defs>
          <linearGradient id="lc-logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fff" /><stop offset="42%" stopColor="#ffe6a3" /><stop offset="70%" stopColor="#d99b2b" /><stop offset="100%" stopColor="#fff4cf" /></linearGradient>
          <radialGradient id="lc-flash-gradient"><stop offset="0%" stopColor="#fff" /><stop offset="35%" stopColor="#ffd36a" stopOpacity=".8" /><stop offset="100%" stopColor="#000" stopOpacity="0" /></radialGradient>
          <radialGradient id="lc-ambient-gradient"><stop offset="0%" stopColor="#ffd36a" stopOpacity=".4" /><stop offset="45%" stopColor="#9f6b17" stopOpacity=".18" /><stop offset="100%" stopColor="#000" stopOpacity="0" /></radialGradient>
          <linearGradient id="lc-line-gradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#fff" stopOpacity="0" /><stop offset="45%" stopColor="#fff" stopOpacity=".9" /><stop offset="100%" stopColor="#fff7d6" stopOpacity="0" /></linearGradient>
          <filter id="lc-particle-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="lc-soft-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="lc-gold-glow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fff" floodOpacity=".6" /><feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#ffd36a" floodOpacity=".75" /><feDropShadow dx="0" dy="0" stdDeviation="26" floodColor="#9f6b17" floodOpacity=".5" /></filter>
        </defs>
        <ellipse className="lc-intro-ambient" cx="600" cy="316" rx="420" ry="130" />
        <circle className="lc-intro-flash" cx="600" cy="260" r="195" />
        <line className="lc-intro-line" x1="600" y1="-40" x2="600" y2="230" />
        <circle className="lc-intro-particle" cx="600" cy="-40" r="7" />
        <text className="lc-intro-outline" x="600" y="310" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="72" fontWeight="700" letterSpacing=".12em">LUCIAN CREATION</text>
        <text className="lc-intro-fill" x="600" y="310" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="72" fontWeight="700" letterSpacing=".12em">LUCIAN CREATION</text>
      </svg>
    </main>
  )
}
