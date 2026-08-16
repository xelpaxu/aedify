'use client'

import { ConvexClientProvider } from './ConvexProvider'
import { LanguageProvider } from '../lib/translations'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ConvexClientProvider>
  )
}
