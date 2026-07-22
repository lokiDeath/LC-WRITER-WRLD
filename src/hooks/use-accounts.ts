'use client'

import { useState, useEffect, useCallback } from 'react'

export type Account = {
  id: string
  username: string
  email: string
  displayName: string
  plan: 'Free' | 'Plus' | 'Pro'
  avatar?: string
}

const STORAGE_KEY = 'lc_accounts'
const ACTIVE_KEY = 'lc_active_account'

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'a1', username: 'L.U.C.I.A.N', email: 'luckydeath1975@gmail.com', displayName: 'Lucian', plan: 'Free' },
  { id: 'a2', username: 'lucian1975', email: 'lucian1975@gmail.com', displayName: 'Lucian Jr.', plan: 'Free' },
]

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS)
  const [activeAccountId, setActiveAccountId] = useState<string>('a1')
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const activeStored = localStorage.getItem(ACTIVE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed)
        }
      }
      if (activeStored) {
        setActiveAccountId(activeStored)
      }
    } catch {
      // keep defaults
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Persist to localStorage
  const persist = useCallback((accs: Account[], activeId: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accs))
      localStorage.setItem(ACTIVE_KEY, activeId)
    } catch {
      // ignore
    }
  }, [])

  const switchAccount = useCallback((id: string) => {
    setActiveAccountId(id)
    persist(accounts, id)
  }, [accounts, persist])

  const addAccount = useCallback((data: { username: string; email: string; displayName: string }) => {
    const newAccount: Account = {
      id: `a${Date.now()}`,
      username: data.username,
      email: data.email,
      displayName: data.displayName || data.username,
      plan: 'Free',
    }
    setAccounts((prev) => {
      const next = [...prev, newAccount]
      persist(next, activeAccountId)
      return next
    })
    return newAccount
  }, [activeAccountId, persist])

  const removeAccount = useCallback((id: string) => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id)
      if (id === activeAccountId && next.length > 0) {
        setActiveAccountId(next[0].id)
        persist(next, next[0].id)
      } else {
        persist(next, activeAccountId)
      }
      return next
    })
  }, [activeAccountId, persist])

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts((prev) => {
      const next = prev.map((a) => a.id === id ? { ...a, ...updates } : a)
      persist(next, activeAccountId)
      return next
    })
  }, [activeAccountId, persist])

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0] || null

  return {
    accounts,
    activeAccount,
    activeAccountId,
    isLoading,
    switchAccount,
    addAccount,
    removeAccount,
    updateAccount,
  }
}
