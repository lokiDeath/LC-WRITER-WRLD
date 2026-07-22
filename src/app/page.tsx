'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { LoginScreen } from '@/components/lc/LoginScreen'
import { Dashboard } from '@/components/lc/Dashboard'

export default function Home() {
  const user = useApp((s) => s.user)
  const setUser = useApp((s) => s.setUser)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          if (d?.user) setUser(d.user)
          else setUser(null)
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
      })
    return () => {
      cancelled = true
    }
  }, [setUser])

  if (booting || user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="font-serif text-2xl text-red-500 tracking-wider">L-C</span>
      </div>
    )
  }

  return user ? <Dashboard /> : <LoginScreen />
}
