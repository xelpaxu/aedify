'use client'

import { ConvexClientProvider } from './ConvexProvider'
import { LanguageProvider } from '../lib/translations'
import { ThemeProvider } from '../lib/theme'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <ThemeProvider>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </ThemeProvider>
    </ConvexClientProvider>
  )
}
