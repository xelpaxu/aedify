'use client'

import { AuthProvider } from '../../src/lib/auth'
import { RootLayout } from '../../src/components/dashboard/RootLayout'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '../../src/lib/auth'
import { Shield } from 'lucide-react'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center">
            <Shield size={28} className="text-white" />
          </div>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-slate-900" />
            <span className="text-sm font-medium text-slate-500">Loading Aedify...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <RootLayout>{children}</RootLayout>
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  )
}
