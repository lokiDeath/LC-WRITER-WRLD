'use client'

import { useState } from 'react'
import { MercuryCanvas } from './MercuryCanvas'
import { useApp } from '@/lib/store'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

// Official 4-color Google "G" logo (inline SVG, no external dependency)
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

// Official Discord logo (inline SVG)
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export function LoginScreen() {
  const setUser = useApp((s) => s.setUser)
  const { t } = useLanguage()
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
    // Redirect to the OAuth initiation endpoint. The endpoint will either
    // redirect to the provider's consent screen, or return a friendly message
    // if the provider is not configured on the server.
    try {
      window.location.href = `/api/auth/oauth/${provider}`
    } catch {
      toast.info(`${provider} OAuth is unavailable. Please use username/passphrase.`)
    }
  }

  return (
    <div className="min-h-screen bg-bg-app relative overflow-hidden">
      <MercuryCanvas />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left: Login Panel */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <h1 className="font-serif text-5xl text-t-primary tracking-wide mb-2">
                {t('appName')}
              </h1>
              <p className="font-mono text-xs text-t-secondary uppercase tracking-[0.25em]">
                {t('appTagline')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block font-mono text-[10px] text-t-secondary uppercase tracking-[0.2em] mb-2">
                    {t('chooseUsername')}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-input border border-b-default px-4 py-3.5 text-sm text-t-primary font-mono placeholder:text-t-placeholder focus:border-b-focus focus:outline-none transition-colors rounded-md"
                    placeholder="scribe_scribe"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              )}

              {mode === 'login' && (
                <div>
                  <label className="block font-mono text-[10px] text-t-secondary uppercase tracking-[0.2em] mb-2">
                    {t('usernameOrEmail')}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-input border border-b-default px-4 py-3.5 text-sm text-t-primary font-mono placeholder:text-t-placeholder focus:border-b-focus focus:outline-none transition-colors rounded-md"
                    placeholder="your_username"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block font-mono text-[10px] text-t-secondary uppercase tracking-[0.2em] mb-2">
                    {t('emailAddress')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-input border border-b-default px-4 py-3.5 text-sm text-t-primary font-mono placeholder:text-t-placeholder focus:border-b-focus focus:outline-none transition-colors rounded-md"
                    placeholder="scribe@grandarchive.com"
                    autoComplete="email"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-mono text-[10px] text-t-secondary uppercase tracking-[0.2em]">
                    {mode === 'login' ? t('passphrase') : t('securePassphrase')}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => toast.info('Password recovery requires admin assistance. Contact the admin if you are locked out.')}
                      className="font-mono text-[9px] text-t-muted hover:text-accent-color uppercase tracking-wider transition-colors"
                    >
                      {t('forgotPassphrase')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-input border border-b-default px-4 py-3.5 pr-12 text-sm text-t-primary font-mono placeholder:text-t-placeholder focus:border-b-focus focus:outline-none transition-colors rounded-md"
                    placeholder=""
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary hover:text-accent-color transition-colors"
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
                <p className="text-xs text-danger font-mono">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full py-3.5 text-sm font-bold uppercase tracking-[0.3em] rounded-md"
              >
                {loading
                  ? (mode === 'login' ? t('authenticating') : t('creatingAccount'))
                  : (mode === 'login' ? t('enter') : t('initiateCreation'))}
              </button>

              {/* Toggle between login and register */}
              <div className="text-center pt-2">
                {mode === 'login' ? (
                  <p className="font-mono text-[10px] text-t-muted uppercase tracking-wider">
                    {t('noAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setError('') }}
                      className="text-accent-color hover:opacity-80 underline uppercase tracking-wider"
                    >
                      {t('createOne')}
                    </button>
                  </p>
                ) : (
                  <p className="font-mono text-[10px] text-t-muted uppercase tracking-wider">
                    {t('alreadyRegistered')}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError('') }}
                      className="text-accent-color hover:opacity-80 underline uppercase tracking-wider"
                    >
                      {t('logIn')}
                    </button>
                  </p>
                )}
              </div>
            </form>

            {/* OAuth Section */}
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-b-default" />
                <p className="font-mono text-[9px] text-t-muted uppercase tracking-wider">
                  {t('orConnectWith')}
                </p>
                <div className="flex-1 h-px bg-b-default" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOAuth('google')}
                  className="flex items-center justify-center gap-2 bg-input border border-b-default hover:border-b-focus hover:bg-bg-hover py-3 text-xs text-t-primary font-mono uppercase tracking-wider transition-colors rounded-md"
                >
                  <GoogleIcon className="w-5 h-5" />
                  {t('google')}
                </button>
                <button
                  onClick={() => handleOAuth('discord')}
                  className="flex items-center justify-center gap-2 bg-input border border-b-default hover:border-b-focus hover:bg-bg-hover py-3 text-xs text-t-primary font-mono uppercase tracking-wider transition-colors rounded-md"
                >
                  <DiscordIcon className="w-5 h-5 text-[#5865F2]" />
                  {t('discord')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Branding */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="font-serif text-[120px] leading-none tracking-tight select-none opacity-[0.08]" style={{ color: 'var(--accent-color)' }}>
              L-C
            </div>
            <div className="mt-6">
              <p className="font-mono text-xs text-t-secondary uppercase tracking-[0.3em]">
                {t('writersWorkspace')}
              </p>
              <p className="font-mono text-[10px] text-t-muted mt-3 uppercase tracking-wider">
                {t('aiPoweredPlatform')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 text-center">
        <p className="font-mono text-[9px] text-accent-color uppercase tracking-wider mb-1 flex items-center justify-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" style={{ boxShadow: '0 0 6px var(--color-success)' }} />
          {t('systemOnline')}
        </p>
        <p className="font-mono text-[8px] text-t-muted tracking-wider">
          {t('footerCredit')}
        </p>
      </div>
    </div>
  )
}
