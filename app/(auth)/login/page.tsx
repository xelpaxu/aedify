'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../src/lib/auth'
import { useLanguage } from '../../../src/lib/translations'
import { Eye, EyeOff, Loader2, Mail, Lock, Shield } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const { login, user, isLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const success = await login(email, password)
      if (!success) {
        setError(t('invalidCredentials'))
      }
    } catch (error) {
      setError(t('loginError'))
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 40L40 0H20L0 20M40 40V20L20 40' fill='%23fff' fill-opacity='1'/%3e%3c/svg%3e")`,
          backgroundSize: '40px 40px'
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Image
                src="/assets/images/favicon.ico"
                alt="Aedify"
                width={28}
                height={28}
                className="object-contain brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Aedify</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">VEC-PRO</p>
            </div>
          </div>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 mb-6">
              <Shield size={14} className="text-slate-300" />
              <span className="text-xs font-semibold text-white/80">{t('vectorBorne') || 'Vector-Borne Disease Surveillance'}</span>
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight mb-4">
              {t('monitoringTitle') || 'Protecting communities through intelligent monitoring'}
            </h2>
            <p className="text-base text-white/60 leading-relaxed">
              {t('monitoringDesc') || 'AI-powered detection and real-time risk mapping for mosquito-borne diseases in Molo District, Iloilo City.'}
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real-time Surveillance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span>AI Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Risk Mapping</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center border border-slate-200/60">
                <Image
                  src="/assets/images/favicon.ico"
                  alt="Aedify Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Aedify</h1>
            <p className="text-sm font-medium text-slate-500 tracking-wider uppercase mt-1">
              {t('vecProSystem') || 'VEC-PRO System'}
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('welcomeBack') || 'Welcome back'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {t('signInToDashboard') || 'Sign in to your surveillance dashboard'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t('emailAddress') || 'Email address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@aedify.com"
                  required
                  disabled={loading || isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  {t('password') || 'Password'}
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {t('forgotPassword') || 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('enterPassword') || 'Enter your password'}
                  required
                  disabled={loading || isLoading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                  disabled={loading || isLoading}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-200/60 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <span className="text-rose-600 text-[10px] font-bold">!</span>
                </div>
                <p className="text-xs font-medium text-rose-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isLoading}
              className="relative w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('signingIn') || 'Signing in...'}
                </>
              ) : (
                t('signIn') || 'Sign in'
              )}
            </button>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Lock className="h-3 w-3 text-slate-300" />
              <span className="text-xs text-slate-400">
                {t('dataSecure') || 'Your data is encrypted and secure'}
              </span>
            </div>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            &copy; {new Date().getFullYear()} Aedify VEC-PRO. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
