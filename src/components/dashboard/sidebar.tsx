'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useOrganization } from '@/lib/organization-context'
import {
  LayoutDashboard,
  Upload,
  FileText,
  FolderKanban,
  BarChart3,
  Settings,
  Users,
  Building,
  X,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const mainNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Pregled', icon: <LayoutDashboard size={20} /> },
  { href: '/dashboard/upload', label: 'Upload', icon: <Upload size={20} /> },
  { href: '/dashboard/invoices', label: 'Fakture', icon: <FileText size={20} /> },
  { href: '/dashboard/projects', label: 'Projekti', icon: <FolderKanban size={20} /> },
  { href: '/dashboard/reports', label: 'Izvjestaji', icon: <BarChart3 size={20} /> },
]

const settingsNavItems: NavItem[] = [
  { href: '/dashboard/settings', label: 'Podesavanja', icon: <Settings size={20} /> },
  { href: '/dashboard/settings/members', label: 'Clanovi tima', icon: <Users size={20} /> },
]

interface SidebarProps {
  onClose?: () => void
  isAdmin?: boolean
}

export function Sidebar({ onClose, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const { currentOrganization, isOwner } = useOrganization()

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    if (onClose) {
      onClose()
    }
  }

  return (
    <aside className="w-64 bg-steel-800 border-r border-steel-700 min-h-screen flex flex-col">
      {/* Logo & Organization Header */}
      <div className="p-4 border-b border-steel-700">
        {/* SERVICEX Logo */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 relative">
            <img src="/logo.png" alt="SERVICEX" className="w-10 h-10 object-contain" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">SERVICEX</span>
        </div>

        {/* Organization Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-steel-700 rounded-lg flex items-center justify-center flex-shrink-0 border border-steel-600">
              {currentOrganization?.logo_url ? (
                <img
                  src={currentOrganization.logo_url}
                  alt={currentOrganization.name}
                  className="w-9 h-9 rounded-lg object-cover"
                />
              ) : (
                <Building className="w-4 h-4 text-accent-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {currentOrganization?.name || 'Firma'}
              </p>
              <p className="text-xs text-steel-300 truncate">
                {isOwner ? 'Vlasnik' : 'Clan'}
              </p>
            </div>
          </div>
          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-steel-700 rounded-lg transition-colors lg:hidden"
            >
              <X size={20} className="text-steel-400" />
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="mb-2">
          <p className="px-3 text-xs font-semibold text-steel-400 uppercase tracking-wider">
            Glavni meni
          </p>
        </div>
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              pathname === item.href
                ? 'bg-gradient-to-r from-accent-500/20 to-steel-500/10 text-accent-400 border-l-2 border-accent-500'
                : 'text-steel-300 hover:bg-steel-700 hover:text-white'
            )}
          >
            <span className={pathname === item.href ? 'text-accent-400' : 'text-steel-400'}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}

        {/* Settings Section - Only for owners */}
        {isOwner && (
          <>
            <div className="pt-6 pb-2">
              <p className="px-3 text-xs font-semibold text-steel-400 uppercase tracking-wider">
                Podesavanja
              </p>
            </div>
            {settingsNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-gradient-to-r from-accent-500/20 to-steel-500/10 text-accent-400 border-l-2 border-accent-500'
                    : 'text-steel-300 hover:bg-steel-700 hover:text-white'
                )}
              >
                <span className={pathname === item.href || pathname.startsWith(item.href + '/') ? 'text-accent-400' : 'text-steel-400'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-steel-700">
        <div className="flex items-center gap-2 text-xs text-steel-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Invoice Manager v1.0</span>
        </div>
      </div>
    </aside>
  )
}
