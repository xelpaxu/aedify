'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

type ThemeToggleProps = {
  variant?: 'icon' | 'settings'
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (variant === 'settings') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        className={`relative h-7 w-12 shrink-0 rounded-full shadow-inner transition-colors duration-300 focus-ring ${
          isDark ? 'bg-primary-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {isDark ? <Moon size={12} className="text-slate-700" /> : <Sun size={12} className="text-amber-500" />}
        </span>
        <span className="sr-only">Toggle dark theme</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all focus-ring"
    >
      {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
    </button>
  )
}
