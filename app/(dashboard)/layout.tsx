'use client'

import { AuthProvider } from '../../src/lib/auth'
import { RootLayout } from '../../src/components/dashboard/RootLayout'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '../../src/lib/auth'

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
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