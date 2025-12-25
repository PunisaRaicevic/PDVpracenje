'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Button } from '@/components/ui/button'
import { LogOut, User, ChevronDown, Building, Check, Menu, Settings } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  user: {
    id: string
    email: string
    fullName?: string
  }
  onMenuClick?: () => void
}

// User Profile Dropdown Component - defined before Header
function UserProfileDropdown({ user, onLogout }: { user: HeaderProps['user']; onLogout: () => void }) {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-2 lg:px-3 py-2 hover:bg-navy-700 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-navy-700 rounded-full flex items-center justify-center border border-navy-600">
          <User size={16} className="text-teal-500" />
        </div>
        <span className="hidden lg:inline text-sm text-navy-300 max-w-[150px] truncate">
          {user.fullName || user.email.split('@')[0]}
        </span>
        <ChevronDown size={14} className="text-navy-400 hidden lg:block" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full right-0 mt-1 w-56 bg-navy-800 rounded-lg shadow-xl border border-navy-600 z-20 py-1">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-navy-700">
              <p className="text-sm font-medium text-white truncate">
                {user.fullName || 'Korisnik'}
              </p>
              <p className="text-xs text-navy-400 truncate">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/dashboard/profile"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-navy-300 hover:bg-navy-700 hover:text-white transition-colors"
              >
                <User size={16} />
                Moj profil
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-navy-300 hover:bg-navy-700 hover:text-white transition-colors"
              >
                <Settings size={16} />
                Podesavanja
              </Link>
            </div>

            {/* Logout */}
            <div className="border-t border-navy-700 py-1">
              <button
                onClick={() => {
                  setShowDropdown(false)
                  onLogout()
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Odjava
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { currentOrganization, organizations, switchOrganization } = useOrganization()
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleSwitchOrg = async (orgId: string) => {
    await switchOrganization(orgId)
    setShowOrgDropdown(false)
    router.refresh()
  }

  return (
    <header className="bg-navy-800/80 backdrop-blur-sm border-b border-navy-700 px-4 lg:px-6 py-3 lg:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 lg:gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-navy-700 rounded-lg transition-colors lg:hidden"
          >
            <Menu size={24} className="text-teal-400" />
          </button>

          {/* Organization Switcher / Display */}
          {currentOrganization && (
            <div className="relative">
              {organizations.length > 1 ? (
                <button
                  onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-navy-700 hover:bg-navy-600 border border-navy-600 rounded-lg transition-colors"
                >
                  <Building size={16} className="text-teal-500" />
                  <span className="text-sm font-medium text-white max-w-[80px] sm:max-w-[150px] truncate">
                    {currentOrganization?.name}
                  </span>
                  <ChevronDown size={14} className="text-navy-400" />
                </button>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-navy-700/50 border border-navy-600 rounded-lg">
                  <Building size={16} className="text-teal-500" />
                  <span className="text-sm font-medium text-white max-w-[80px] sm:max-w-[150px] truncate">
                    {currentOrganization?.name}
                  </span>
                </div>
              )}

              {showOrgDropdown && organizations.length > 1 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowOrgDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-64 bg-navy-800 rounded-lg shadow-xl border border-navy-600 z-20">
                    <div className="p-2">
                      <p className="px-3 py-2 text-xs font-semibold text-navy-400 uppercase">
                        Vase firme
                      </p>
                      {organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => handleSwitchOrg(org.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-navy-700 rounded-lg transition-colors"
                        >
                          <div className="w-8 h-8 bg-navy-700 border border-navy-600 rounded-lg flex items-center justify-center">
                            <Building size={14} className="text-teal-500" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {org.name}
                            </p>
                            <p className="text-xs text-navy-400">
                              {org.role === 'owner' ? 'Vlasnik' : 'Clan'}
                            </p>
                          </div>
                          {org.id === currentOrganization?.id && (
                            <Check size={16} className="text-teal-500 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-white">
              Dobrodosli, <span className="text-teal-400">{user.fullName || user.email.split('@')[0]}</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Dropdown */}
          <UserProfileDropdown user={user} onLogout={handleLogout} />
        </div>
      </div>
    </header>
  )
}
