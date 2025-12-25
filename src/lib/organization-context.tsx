'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase-browser'

// Types
export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  accountant_email: string | null
  settings: Record<string, any>
  created_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'employee'
  created_at: string
}

export interface OrganizationWithRole extends Organization {
  role: 'owner' | 'employee'
}

interface OrganizationContextType {
  // Current organization
  currentOrganization: OrganizationWithRole | null
  setCurrentOrganization: (org: OrganizationWithRole | null) => void

  // All user's organizations
  organizations: OrganizationWithRole[]

  // Loading state
  isLoading: boolean

  // Current user's role in current org
  role: 'owner' | 'employee' | null

  // Helper functions
  switchOrganization: (orgId: string) => Promise<void>
  refreshOrganizations: () => Promise<void>

  // Permissions
  isOwner: boolean
  canManageMembers: boolean
  canManageProjects: boolean
  canExportReports: boolean
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

interface OrganizationProviderProps {
  children: ReactNode
  initialOrganization?: OrganizationWithRole | null
  initialOrganizations?: OrganizationWithRole[]
}

export function OrganizationProvider({
  children,
  initialOrganization = null,
  initialOrganizations = [],
}: OrganizationProviderProps) {
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(
    initialOrganization
  )
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>(initialOrganizations)
  const [isLoading, setIsLoading] = useState(!initialOrganization)

  const supabase = createClient()

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organizations (
            id,
            name,
            slug,
            logo_url,
            accountant_email,
            settings,
            created_at
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      const orgs: OrganizationWithRole[] = (memberships || [])
        .filter(m => m.organization)
        .map(m => {
          // Supabase returns relations as arrays, get first element
          const org = Array.isArray(m.organization) ? m.organization[0] : m.organization
          return {
            ...(org as Organization),
            role: m.role as 'owner' | 'employee'
          }
        })

      return orgs
    } catch (error) {
      console.error('Error fetching organizations:', error)
      return []
    }
  }

  // Get current organization from profile
  const getCurrentOrgFromProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      return profile?.current_organization_id || null
    } catch {
      return null
    }
  }

  // Save current organization to profile
  const saveCurrentOrgToProfile = async (orgId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('profiles')
        .update({ current_organization_id: orgId })
        .eq('id', user.id)
    } catch (error) {
      console.error('Error saving current org:', error)
    }
  }

  // Initialize organizations
  const refreshOrganizations = async () => {
    setIsLoading(true)
    try {
      const orgs = await fetchOrganizations()
      setOrganizations(orgs)

      if (orgs.length > 0) {
        // Get saved current org from profile
        const savedOrgId = await getCurrentOrgFromProfile()
        const savedOrg = orgs.find(o => o.id === savedOrgId)

        if (savedOrg) {
          setCurrentOrganization(savedOrg)
        } else {
          // Default to first organization
          setCurrentOrganization(orgs[0])
          await saveCurrentOrgToProfile(orgs[0].id)
        }
      } else {
        setCurrentOrganization(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Switch to different organization
  const switchOrganization = async (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrganization(org)
      await saveCurrentOrgToProfile(orgId)
    }
  }

  // Load organizations on mount
  useEffect(() => {
    if (!initialOrganization) {
      refreshOrganizations()
    }
  }, [])

  // Derived values
  const role = currentOrganization?.role || null
  const isOwner = role === 'owner'
  const canManageMembers = isOwner
  const canManageProjects = true // Both roles can manage projects
  const canExportReports = true // Both roles can export reports

  const value: OrganizationContextType = {
    currentOrganization,
    setCurrentOrganization,
    organizations,
    isLoading,
    role,
    switchOrganization,
    refreshOrganizations,
    isOwner,
    canManageMembers,
    canManageProjects,
    canExportReports,
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

// Hook to use organization context
export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

// Hook to require organization (redirects if none)
export function useRequireOrganization() {
  const context = useOrganization()

  if (!context.isLoading && !context.currentOrganization && context.organizations.length === 0) {
    // User has no organizations - should be redirected to onboarding
    if (typeof window !== 'undefined') {
      window.location.href = '/onboarding'
    }
  }

  return context
}
