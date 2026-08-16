'use client'

import { ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useLanguage } from '../../lib/translations'
import Image from 'next/image'

interface RootLayoutProps {
  children: ReactNode
}

export function RootLayout({ children }: RootLayoutProps) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [showProfile, setShowProfile] = useState(false)

  const getProfileTitle = () => {
    switch (user?.role) {
      case 'lgu-admin': return t('lguAdmin')
      case 'brgy-calumpang': return t('brgyAdmin')
      case 'brgy-sanjuan': return t('brgyAdmin')
      case 'brgy-southfundidor': return t('brgyAdmin')
      case 'sys-admin': return t('sysAdmin')
      default: return 'User'
    }
  }

  const getProfileDesc = () => {
    switch (user?.role) {
      case 'lgu-admin': return t('moloDistrict')
      case 'brgy-calumpang': return t('calumpang')
      case 'brgy-sanjuan': return t('sanJuan')
      case 'brgy-southfundidor': return t('southFundidor')
      case 'sys-admin': return t('globalRoot')
      default: return ''
    }
  }

  const getTopTitle = () => {
    if (user?.role?.startsWith('brgy')) return t('barangayMonitoring')
    if (user?.role === 'sys-admin') return t('systemManagement')
    return t('districtMonitoring')
  }

  return (
    <div className="flex relative h-screen w-full overflow-hidden bg-[#f0f2f5] text-slate-800 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 shrink-0 px-6 flex items-center justify-between bg-white z-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-none tracking-tight">{t('aedifyInterface')}</h2>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{getTopTitle()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <button className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all text-xs font-medium border border-slate-200/80">
              <Search size={14} />
              <span className="hidden sm:inline text-slate-400">Search...</span>
              <kbd className="hidden sm:inline text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 ml-2">/</kbd>
            </button>

            {/* Notifications */}
            <button className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
              <Bell size={18} strokeWidth={1.8} />
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden ring-2 ring-slate-200/50">
                  <Image
                    src="/assets/images/Aedify.png"
                    alt="profile"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800 leading-none">{getProfileTitle()}</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">{getProfileDesc()}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block group-hover:text-slate-600 transition-colors" />
              </button>

              {/* Dropdown menu */}
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 py-2 z-50 animate-scale-in">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">{getProfileTitle()}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        <User size={16} className="text-slate-400" />
                        Profile
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        <Settings size={16} className="text-slate-400" />
                        Settings
                      </button>
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => { logout(); setShowProfile(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut size={16} />
                        {t('logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <section className="flex-1 overflow-y-auto px-6 py-5 scroll-smooth">
          {children}
        </section>
      </main>
    </div>
  )
}
