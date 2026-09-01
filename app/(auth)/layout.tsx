'use client'

import { AuthProvider } from '../../src/lib/auth'
import { useAuth } from '../../src/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Shield } from 'lucide-react'

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1017] text-white">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-teal-500/30 flex items-center justify-center shadow-xl shadow-teal-950/60 p-2.5">
            <img
              src="/assets/logo/aedify.png"
              alt="Aedify"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-500/30 border-t-teal-400" />
            <span className="text-xs font-medium text-slate-400 font-mono tracking-wide">Initializing Aedify Portal...</span>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </AuthProvider>
  )
}
