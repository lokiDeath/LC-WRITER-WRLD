'use client'

import { useState } from 'react'
import { MercuryCanvas } from './MercuryCanvas'
import { useApp } from '@/lib/store'
import { Eye, EyeOff, Chrome, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

export function LoginScreen() {
  const setUser = useApp((s) => s.setUser)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Enter both username and passphrase')
      return
    }
    if (mode === 'register') {
      if (!displayName.trim()) {
        setError('Display name is required.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
    }
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload = mode === 'login'
        ? { loginId: username.trim(), password }
        : { loginId: username.trim(), password, displayName: displayName.trim(), email: email.trim() || undefined }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `${mode === 'login' ? 'Login' : 'Registration'} failed.`)
        return
      }
      // Mark new registrations so the onboarding tour triggers on first load
      if (mode === 'register') {
        try {
          localStorage.setItem('lc_onboarding_pending', 'true')
        } catch {
          // ignore
        }
      }
      setUser(data.user)
      toast.success(mode === 'login'
        ? `Welcome back, ${data.user.displayName}.`
        : `Account created. Welcome, ${data.user.displayName}.`)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOAuth(provider: 'google' | 'discord') {
    toast.info(`${provider === 'google' ? 'Google' : 'Discord'} OAuth is coming soon. Please use email/passphrase for now.`)
  }

  return (
    <div className="min-h-screen bg-[#0a0908] relative overflow-hidden">
      <MercuryCanvas />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left: Login Panel */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <h1 className="font-serif text-5xl text-[#f8f5f2] tracking-wide mb-2">
                L-C
              </h1>
              <p className="font-mono text-xs text-[#8a7c6b] uppercase tracking-[0.25em]">
                Lucian Creation
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block font-mono text-[10px] text-[#8a7c6b] uppercase tracking-[0.2em] mb-2">
                    Choose Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[rgba(20,17,15,0.8)] border border-[rgba(201,169,110,0.2)] px-4 py-3.5 text-sm text-[#f8f5f2] font-mono placeholder:text-[#5d4037] focus:border-[#c9a96e] focus:outline-none transition-colors"
                    placeholder="scribe_scribe"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              )}

              {mode === 'login' && (
                <div>
                  <label className="block font-mono text-[10px] text-[#8a7c6b] uppercase tracking-[0.2em] mb-2">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[rgba(20,17,15,0.8)] border border-[rgba(201,169,110,0.2)] px-4 py-3.5 text-sm text-[#f8f5f2] font-mono placeholder:text-[#5d4037] focus:border-[#c9a96e] focus:outline-none transition-colors"
                    placeholder="your_username"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block font-mono text-[10px] text-[#8a7c6b] uppercase tracking-[0.2em] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[rgba(20,17,15,0.8)] border border-[rgba(201,169,110,0.2)] px-4 py-3.5 text-sm text-[#f8f5f2] font-mono placeholder:text-[#5d4037] focus:border-[#c9a96e] focus:outline-none transition-colors"
                    placeholder="scribe@grandarchive.com"
                    autoComplete="email"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-mono text-[10px] text-[#8a7c6b] uppercase tracking-[0.2em]">
                    {mode === 'login' ? 'Passphrase' : 'Secure Passphrase'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => toast.info('Password recovery is coming soon. Contact the admin if you are locked out.')}
                      className="font-mono text-[9px] text-[#5d4037] hover:text-[#c9a96e] uppercase tracking-wider transition-colors"
                    >
                      Forgot Passphrase?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[rgba(20,17,15,0.8)] border border-[rgba(201,169,110,0.2)] px-4 py-3.5 pr-12 text-sm text-[#f8f5f2] font-mono placeholder:text-[#5d4037] focus:border-[#c9a96e] focus:outline-none transition-colors"
                    placeholder=""
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7c6b] hover:text-[#c9a96e] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 font-mono">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C5A880] text-[#0a0908] py-3.5 text-sm font-bold uppercase tracking-[0.3em] hover:bg-[#d4b87a] transition-colors disabled:opacity-50"
              >
                {loading
                  ? (mode === 'login' ? 'Authenticating...' : 'Creating account...')
                  : (mode === 'login' ? 'E N T E R' : 'I N I T I A T E   C R E A T I O N')}
              </button>

              {/* Toggle between login and register */}
              <div className="text-center pt-2">
                {mode === 'login' ? (
                  <p className="font-mono text-[10px] text-[#5d4037] uppercase tracking-wider">
                    No account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setError('') }}
                      className="text-[#c9a96e] hover:text-[#d4b87a] underline uppercase tracking-wider"
                    >
                      Create one
                    </button>
                  </p>
                ) : (
                  <p className="font-mono text-[10px] text-[#5d4037] uppercase tracking-wider">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError('') }}
                      className="text-[#c9a96e] hover:text-[#d4b87a] underline uppercase tracking-wider"
                    >
                      Log in
                    </button>
                  </p>
                )}
              </div>
            </form>

            {/* OAuth Section */}
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[rgba(201,169,110,0.08)]" />
                <p className="font-mono text-[9px] text-[#5d4037] uppercase tracking-wider">
                  Or connect with auth key
                </p>
                <div className="flex-1 h-px bg-[rgba(201,169,110,0.08)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOAuth('google')}
                  className="flex items-center justify-center gap-2 bg-[rgba(20,17,15,0.6)] border border-[rgba(201,169,110,0.1)] hover:border-[#c9a96e] hover:bg-[rgba(20,17,15,0.9)] py-3 text-xs text-[#f8f5f2] font-mono uppercase tracking-wider transition-colors"
                >
                  <Chrome className="w-4 h-4" />
                  Google
                </button>
                <button
                  onClick={() => handleOAuth('discord')}
                  className="flex items-center justify-center gap-2 bg-[rgba(20,17,15,0.6)] border border-[rgba(201,169,110,0.1)] hover:border-[#c9a96e] hover:bg-[rgba(20,17,15,0.9)] py-3 text-xs text-[#f8f5f2] font-mono uppercase tracking-wider transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Discord
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Branding */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="font-serif text-[120px] text-[rgba(201,169,110,0.08)] leading-none tracking-tight select-none">
              L-C
            </div>
            <div className="mt-6">
              <p className="font-mono text-xs text-[#8a7c6b] uppercase tracking-[0.3em]">
                Lucian Creation / Writers Workspace
              </p>
              <p className="font-mono text-[10px] text-[#5d4037] mt-3 uppercase tracking-wider">
                AI-Powered Novel Writing Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 text-center">
        <p className="font-mono text-[9px] text-[#c9a96e] uppercase tracking-wider mb-1 flex items-center justify-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
          System Online
        </p>
        <p className="font-mono text-[8px] text-[#5d4037] tracking-wider">
          Created by L to help writers bring their stories to life.
        </p>
      </div>
    </div>
  )
}
