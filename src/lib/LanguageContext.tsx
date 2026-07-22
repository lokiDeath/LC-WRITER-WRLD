'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  translations,
  translate,
  LANGUAGE_OPTIONS,
  LANGUAGE_LABEL_TO_CODE,
  type LanguageCode,
  type TranslationKey,
} from './translations'

// ─────────────────────────────────────────────────────────────
// LanguageContext
// ─────────────────────────────────────────────────────────────
// Provides a `t(key)` translation function and the current `lang`
// to every component inside <LanguageProvider>. The language
// preference is persisted to localStorage('lc_language') and
// synced with the Settings → App Language dropdown.
//
// Usage:
//   const { t, lang, setLang } = useLanguage()
//   <button>{t('logOut')}</button>

type LanguageContextValue = {
  lang: LanguageCode
  setLang: (lang: LanguageCode) => void
  setLangByLabel: (label: string) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'lc_language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to English until the client hydrates from localStorage.
  const [lang, setLangState] = useState<LanguageCode>('en')

  // ─── Hydrate language from localStorage on mount ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null
      if (saved && translations[saved]) {
        setLangState(saved)
      } else {
        // Auto-detect from navigator.language
        const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase()
        if (nav.startsWith('es')) setLangState('es')
        else if (nav.startsWith('zh')) setLangState('zh')
        else setLangState('en')
      }
    } catch {
      // ignore (private mode etc.)
    }
  }, [])

  // ─── Set language by code ───
  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  // ─── Set language by UI label (from the Settings dropdown) ───
  const setLangByLabel = useCallback((label: string) => {
    const code = LANGUAGE_LABEL_TO_CODE[label] || 'en'
    setLang(code)
  }, [setLang])

  // ─── Translate function ───
  const t = useCallback(
    (key: TranslationKey) => translate(lang, key),
    [lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, setLangByLabel, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// ─── Hook ───────────────────────────────────────────────────
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // Defensive fallback — should never happen because LanguageProvider
    // wraps the entire app in layout.tsx. If it does, return English
    // so the UI doesn't crash.
    return {
      lang: 'en',
      setLang: () => {},
      setLangByLabel: () => {},
      t: (key: TranslationKey) => translate('en', key),
    }
  }
  return ctx
}

// ─── Re-export options for convenience ─────────────────────
export { LANGUAGE_OPTIONS, type LanguageCode, type TranslationKey }
