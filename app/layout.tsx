import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '../src/providers/ClientProviders'

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: {
    default: 'Aedify - Vector Surveillance',
    template: '%s | Aedify',
  },
  description: 'Vector-borne disease surveillance and mosquito hotspot monitoring system for Molo District, Iloilo City.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aedify-theme');if(t==='dark')document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=t==='dark'?'dark':'light'}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
