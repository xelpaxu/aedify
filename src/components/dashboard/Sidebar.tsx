'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Map,
  ClipboardList,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useLanguage } from '../../lib/translations'
import Image from 'next/image'

export function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const { t } = useLanguage()

  const navSections = [
    {
      label: t('overview') || 'Overview',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { href: '/analytics', icon: BarChart3, label: t('analytics') },
      ],
    },
    {
      label: t('operations') || 'Operations',
      items: [
        { href: '/reports', icon: FileText, label: t('reports') },
        { href: '/map', icon: Map, label: t('riskMap') },
        { href: '/assignments', icon: ClipboardList, label: t('assignments') },
      ],
    },
    {
      label: t('system') || 'System',
      items: [
        { href: '/settings', icon: Settings, label: t('settings') },
      ],
    },
  ]

  return (
    <aside className="w-[260px] shrink-0 bg-white border-r border-slate-200/80 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Image
            src="/assets/images/favicon.ico"
            alt="Aedify"
            width={22}
            height={22}
            className="object-contain brightness-0 invert"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="font-bold text-[15px] text-slate-900 tracking-tight leading-none">Aedify</h1>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">VEC-PRO</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section, sectionIdx) => (
          <div key={section.label} className={sectionIdx > 0 ? 'mt-6' : ''}>
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href || pathname?.startsWith(`${href}/`)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.7}
                      className={`transition-colors ${isActive ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-500'}`}
                    />
                    <span className="flex-1">{label}</span>
                    {isActive && (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all duration-150"
        >
          <LogOut size={18} strokeWidth={1.7} />
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
