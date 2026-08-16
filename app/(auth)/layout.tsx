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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Shield size={28} className="text-white" />
          </div>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-200 border-t-primary-600" />
            <span className="text-sm font-medium text-slate-500">Loading Aedify...</span>
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
