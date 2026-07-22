'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, ChevronLeft, Sparkles,
  Settings, BookOpen,
  Bell, Bot, Check, FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tour Steps ───
type TourStep = {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  highlight?: string // CSS selector hint (informational only — we use a centered modal for simplicity)
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to L-C',
    description: 'Your AI-powered writers workspace. Lets take a 60-second tour of everything you can do here. You can skip at any time.',
    icon: Sparkles,
  },
  {
    id: 'sidebar',
    title: 'The Sidebar',
    description: 'This is your home base. New Chat starts a fresh AI conversation. Library holds your manuscripts. Projects holds your novels. Recent Chats shows your latest conversations.',
    icon: BookOpen,
  },
  {
    id: 'projects',
    title: 'Projects & Workspace',
    description: 'Open the Projects tab to create a new novel or open an existing one. Each project has 12 core tabs: Full Writing, Character Creation, World Building, Power System, Timeline, Locations, Organisations, Lore, Plot, Research, Publishing, and Story Bible.',
    icon: FolderOpen,
  },
  {
    id: 'alerts',
    title: 'Red Alert Dots',
    description: 'Watch for red glowing dots on workspace tabs. They show how many fields are missing in that section (e.g., a character with no goal). As you or the AI fills in details, the count decreases. When everything is filled, the dot disappears.',
    icon: Bell,
  },
  {
    id: 'canvas',
    title: 'The Writing Canvas',
    description: 'A Google-Docs-style editor with a full formatting toolbar on the left side — bold, italic, headings, alignment, lists, and more. Your work auto-saves. Use the Chapter Slicer to break long manuscripts into chapters without touching the original.',
    icon: BookOpen,
  },
  {
    id: 'copilot',
    title: 'AI Co-Pilot',
    description: 'The right panel is your AI writing partner. It has read your entire project (Story Bible, Full Writing, all tabs) and remembers it as long as you stay in this project. Ask it to continue writing, fix pacing, find inconsistencies, or brainstorm.',
    icon: Bot,
  },
  {
    id: 'settings',
    title: 'Settings & Ascension',
    description: 'Click your profile pill (bottom-left) to open Settings. Personalize the theme, configure AI behavior, link external accounts (Google, GitHub, Discord). Track your Ascension Status — a silent cultivation system that ranks you from Apprentice to Author Progenitor. That is the tour — welcome to the Grand Archive.',
    icon: Settings,
  },
]

type OnboardingTourProps = {
  // Called when the user dismisses or completes the tour
  onComplete: () => void
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [phase, setPhase] = useState<'prompt' | 'tour'>('prompt')
  const [stepIndex, setStepIndex] = useState(0)

  // Esc key dismisses
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
     
  }, [])

  function handleDismiss() {
    onComplete()
  }

  function handleStartTour() {
    setPhase('tour')
    setStepIndex(0)
  }

  function handleNext() {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      onComplete()
    }
  }

  function handleBack() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  const currentStep = TOUR_STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === TOUR_STEPS.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-zinc-900 border border-[#1a1a1a] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Phase 1: Welcome prompt ─── */}
          {phase === 'prompt' && (
            <div className="p-8 text-center">
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Sparkle icon */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-purple-600/30 to-purple-900/30 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-300" />
              </div>

              <h2 className="text-xl font-serif text-zinc-100 mb-2">
                Welcome to L-C
              </h2>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">
                Would you like a guided tour through the workspace? Well walk through the sidebar, projects, writing canvas, AI Co-Pilot, and everything in between.
              </p>

              <div className="space-y-2">
                <button
                  onClick={handleStartTour}
                  className="w-full bg-purple-600 text-white py-3 text-[13px] font-semibold uppercase tracking-wider hover:bg-purple-700 rounded-lg transition"
                >
                  Start Tour
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full border border-zinc-800 text-zinc-400 py-3 text-[13px] font-medium uppercase tracking-wider hover:text-zinc-100 hover:border-zinc-600 rounded-lg transition"
                >
                  Skip for Now
                </button>
              </div>

              <p className="text-[10px] text-zinc-600 mt-4">
                Takes about 60 seconds. You can dismiss at any time.
              </p>
            </div>
          )}

          {/* ─── Phase 2: Step-by-step tour ─── */}
          {phase === 'tour' && (
            <div>
              {/* Top bar: progress + close */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                    Step {stepIndex + 1} of {TOUR_STEPS.length}
                  </span>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition"
                  aria-label="Close tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-0.5 bg-zinc-800">
                <motion.div
                  className="h-full bg-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Content */}
              <div className="p-7">
                <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-gradient-to-br from-purple-600/20 to-zinc-900 border border-purple-500/20 flex items-center justify-center">
                  <currentStep.icon className="w-7 h-7 text-purple-300" />
                </div>

                <h3 className="text-lg font-serif text-zinc-100 text-center mb-3">
                  {currentStep.title}
                </h3>
                <p className="text-[13px] text-zinc-400 leading-relaxed text-center mb-7">
                  {currentStep.description}
                </p>

                {/* Step dots */}
                <div className="flex items-center justify-center gap-1.5 mb-6">
                  {TOUR_STEPS.map((step, i) => (
                    <button
                      key={step.id}
                      onClick={() => setStepIndex(i)}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        i === stepIndex
                          ? 'w-6 bg-purple-500'
                          : i < stepIndex
                            ? 'w-1.5 bg-purple-700'
                            : 'w-1.5 bg-zinc-700'
                      )}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                  {!isFirst && (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1 px-3 py-2.5 text-[12px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex-1 flex items-center justify-center gap-1 bg-purple-600 text-white py-2.5 text-[12px] font-semibold uppercase tracking-wider hover:bg-purple-700 rounded-lg transition"
                  >
                    {isLast ? (
                      <>
                        <Check className="w-4 h-4" />
                        Finish
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {isLast && (
                  <p className="text-[10px] text-zinc-600 text-center mt-4">
                    Click Finish to start writing.
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
