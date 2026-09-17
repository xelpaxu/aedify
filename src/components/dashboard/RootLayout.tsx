'use client'

import { ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Search, ChevronDown, LogOut, Settings, User, Menu } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useLanguage } from '../../lib/translations'
import Image from 'next/image'
import Link from 'next/link'
import { ThemeToggle } from '../ThemeToggle'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { NotificationCenter } from './NotificationCenter'

interface RootLayoutProps {
  children: ReactNode
}

export function RootLayout({ children }: RootLayoutProps) {
  const { user, firebaseUser, logout } = useAuth()
  const profile = useQuery(api.users.getUserByUid, firebaseUser ? { uid: firebaseUser.uid } : 'skip')
  const { t } = useLanguage()
  const [showProfile, setShowProfile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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
    <div className="flex relative h-screen w-full overflow-hidden bg-[#f8fafc] text-slate-800 font-sans p-3 sm:p-4 lg:p-5">
      <Sidebar />
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f8fafc]">
        {/* Header */}
        <header className="h-[72px] shrink-0 px-6 md:px-8 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-200/60 z-10">
          {/* Left section */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="hidden sm:block">
              <h2 className="text-[16px] font-bold text-slate-900 leading-none tracking-tight flex items-center gap-2">
                Aedify Interface
              </h2>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                {getTopTitle()} • {getProfileDesc()}
              </p>
            </div>

            {/* Mobile title */}
            <div className="sm:hidden">
              <h2 className="text-[15px] font-bold text-slate-900 leading-none">Aedify</h2>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">{getTopTitle()}</p>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Search - hidden on mobile */}
            <button className="hidden md:flex items-center gap-2.5 px-4 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all text-sm font-medium border border-slate-200/80 bg-white/50">
              <Search size={16} strokeWidth={1.8} />
              <span className="text-slate-400">Search...</span>
              <kbd className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-400 ml-1">⌘K</kbd>
            </button>

            {/* Search icon - visible on mobile */}
            <button className="md:hidden p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
              <Search size={18} strokeWidth={1.8} />
            </button>

            {/* Real-time Notification Center & Watcher */}
            <NotificationCenter />

            <ThemeToggle />

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-slate-200/60" />

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50/80 transition-all group border border-transparent hover:border-slate-200/60"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center overflow-hidden ring-2 ring-slate-200/50 group-hover:ring-primary-200/50 transition-all">
                  <Image
                    src={profile?.profileImageUrl || '/assets/logo/aedify.png'}
                    alt="profile"
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800 leading-none group-hover:text-primary-600 transition-colors">
                    {profile?.displayName || getProfileTitle()}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    {getProfileDesc()}
                  </p>
                </div>
                <ChevronDown 
                  size={14} 
                  className={`text-slate-400 hidden sm:block transition-transform duration-200 ${
                    showProfile ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* Dropdown menu */}
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100/80 py-2 z-50 animate-scale-in">
                    {/* User info */}
                    <div className="px-4 py-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center">
                          <Image
                            src={profile?.profileImageUrl || '/assets/logo/aedify.png'}
                            alt="profile"
                            width={40}
                            height={40}
                            className="w-full h-full object-cover rounded-xl"
                            unoptimized
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{profile?.displayName || getProfileTitle()}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{user?.email || 'user@aedify.com'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        onClick={() => setShowProfile(false)}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                          <User size={14} className="text-slate-400" />
                        </div>
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        onClick={() => setShowProfile(false)}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Settings size={14} className="text-slate-400" />
                        </div>
                        Settings
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => { logout(); setShowProfile(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                          <LogOut size={14} className="text-primary-600" />
                        </div>
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
        <section className="flex-1 overflow-y-auto scroll-smooth p-5 sm:p-7">
          {children}
        </section>
      </main>
    </div>
  )
}
