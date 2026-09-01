'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../src/lib/auth'
import { useLanguage } from '../../../src/lib/translations'
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from 'lucide-react'
import Image from 'next/image'

const DEMO_ACCOUNTS = [
  { label: 'LGU Admin', email: 'lgu@aedify.com' },
  { label: 'Calumpang', email: 'calumpang@aedify.com' },
  { label: 'San Juan', email: 'sanjuan@aedify.com' },
  { label: 'Fundidor', email: 'southfundidor@aedify.com' },
  { label: 'Admin', email: 'admin@aedify.com' },
]

export default function LoginPage() {
  const { login, user, isLoading } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSelectDemo = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setSelectedDemo(demo.email)
    setEmail(demo.email)
    if (!password) {
      setPassword('password123')
    }
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const success = await login(email, password)
      if (!success) {
        setError(t('invalidCredentials') || 'Invalid email or password.')
      }
    } catch (err) {
      setError(t('loginError') || 'An error occurred during sign in.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#070b13] text-slate-100 p-4 sm:p-6 relative overflow-hidden selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* Soft ambient center glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-br from-teal-500/10 via-cyan-600/5 to-transparent rounded-full blur-[110px] pointer-events-none" />

      {/* Top bar */}
      <header className="w-full max-w-4xl flex justify-between items-center z-10 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 relative flex items-center justify-center">
            <Image
              src="/assets/logo/vecpro.png"
              alt="VEC-PRO"
              width={22}
              height={22}
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider">
            VEC-PRO
          </span>
        </div>

        {/* Language switch */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
              language === 'en'
                ? 'bg-teal-500/20 text-teal-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('tl')}
            className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
              language === 'tl'
                ? 'bg-teal-500/20 text-teal-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TL
          </button>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-[390px] my-auto z-10 py-6">
        <div className="bg-slate-900/80 border border-slate-800/90 backdrop-blur-2xl rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/70">
          
          {/* Logo & Heading */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 relative flex items-center justify-center mb-3">
              <Image
                src="/assets/logo/aedify.png"
                alt="Aedify"
                width={56}
                height={56}
                className="object-contain drop-shadow-md"
                priority
              />
            </div>
            
            <h1 className="text-xl font-bold tracking-tight text-white">
              {t('welcomeBack') || 'Sign in to Aedify'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Vector Disease Surveillance
            </p>
          </div>

          {/* Quick Demo Selector */}
          <div className="mb-5">
            <p className="text-[11px] font-medium text-slate-400 mb-1.5 text-center">
              Quick demo login:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {DEMO_ACCOUNTS.map((demo) => {
                const isSelected = selectedDemo === demo.email || email === demo.email
                return (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleSelectDemo(demo)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500/60 text-teal-300'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {demo.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('emailAddress') || 'Email'}
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-400 transition-colors pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setSelectedDemo(null)
                  }}
                  placeholder="name@aedify.com"
                  required
                  autoComplete="email"
                  disabled={loading || isLoading}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/70 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  {t('password') || 'Password'}
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-400 transition-colors pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading || isLoading}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/70 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                  tabIndex={-1}
                  disabled={loading || isLoading}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500/20 transition cursor-pointer"
                />
                <span className="text-xs text-slate-400">
                  {t('rememberWorkstation') || 'Remember me'}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-[0.99] text-slate-950 font-semibold text-sm shadow-md shadow-teal-950/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{t('signingIn') || 'Signing in...'}</span>
                </>
              ) : (
                <span>{t('signIn') || 'Sign In'}</span>
              )}
            </button>
          </form>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-sm text-center z-10 pb-2">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <span>Aedify</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Image
              src="/assets/logo/vecpro.png"
              alt="VEC-PRO"
              width={13}
              height={13}
              className="object-contain"
            />
            <span>VEC-PRO Surveillance</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
