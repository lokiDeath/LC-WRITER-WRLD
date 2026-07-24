'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { LoginScreen } from '@/components/lc/LoginScreen'
import { Dashboard } from '@/components/lc/Dashboard'
import { LucianIntro } from '@/components/lc/LucianIntro'

export default function Home() {
  const user = useApp((s) => s.user)
  const setUser = useApp((s) => s.setUser)
  const [booting, setBooting] = useState(true)
  const [introDone, setIntroDone] = useState(false)
  const [introRun, setIntroRun] = useState(0)
  const previousUser = useRef<typeof user>(user)

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

  useLayoutEffect(() => {
    if (previousUser.current === null && user) {
      setIntroDone(false)
      setIntroRun((run) => run + 1)
    }
    previousUser.current = user
  }, [user])

  if (booting || user === undefined || !introDone) return <LucianIntro key={introRun} onComplete={() => setIntroDone(true)} />

  return user ? <Dashboard /> : <LoginScreen />
}
