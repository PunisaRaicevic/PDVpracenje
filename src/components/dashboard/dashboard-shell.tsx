'use client'

import { ReactNode, useState } from 'react'
import { OrganizationProvider, OrganizationWithRole } from '@/lib/organization-context'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileNav } from './mobile-nav'

interface User {
  id: string
  email: string
  fullName?: string
}

interface DashboardShellProps {
  children: ReactNode
  user: User
  organizations: OrganizationWithRole[]
  currentOrganization: OrganizationWithRole
}

export function DashboardShell({
  children,
  user,
  organizations,
  currentOrganization,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <OrganizationProvider
      initialOrganization={currentOrganization}
      initialOrganizations={organizations}
    >
      <div className="flex min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-64 z-50">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </OrganizationProvider>
  )
}
