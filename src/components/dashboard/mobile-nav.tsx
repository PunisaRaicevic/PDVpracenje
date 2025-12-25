'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Upload,
  FileText,
  FolderKanban,
  BarChart3,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Pregled', icon: LayoutDashboard },
  { href: '/dashboard/invoices', label: 'Fakture', icon: FileText },
  { href: '/dashboard/upload', label: 'Upload', icon: Upload, highlight: true },
  { href: '/dashboard/projects', label: 'Projekti', icon: FolderKanban },
  { href: '/dashboard/reports', label: 'Izvjestaji', icon: BarChart3 },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-navy-900/95 backdrop-blur-sm border-t border-navy-700 lg:hidden z-30">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors',
                item.highlight
                  ? 'relative -mt-4'
                  : '',
                isActive && !item.highlight
                  ? 'text-teal-400'
                  : 'text-navy-400'
              )}
            >
              {item.highlight ? (
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30',
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600'
                    : 'bg-gradient-to-r from-teal-600 to-teal-700'
                )}>
                  <Icon size={24} className="text-white" />
                </div>
              ) : (
                <>
                  <Icon
                    size={22}
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-teal-400' : 'text-navy-500'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] mt-1 font-medium',
                      isActive ? 'text-teal-400' : 'text-navy-500'
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-navy-900" />
    </nav>
  )
}
