import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  accountant_email: string | null
  settings: Record<string, any>
  created_at: string
}

interface OrganizationWithRole extends Organization {
  role: 'owner' | 'employee'
}

async function getOrganizations(userId: string): Promise<OrganizationWithRole[]> {
  const supabase = await createClient()

  const { data: memberships } = await supabase
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
    .eq('user_id', userId)

  if (!memberships) return []

  return memberships
    .filter(m => m.organization)
    .map(m => {
      // Supabase returns relations as arrays, get first element
      const org = Array.isArray(m.organization) ? m.organization[0] : m.organization
      return {
        ...(org as Organization),
        role: m.role as 'owner' | 'employee'
      }
    })
}

async function getProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch organizations and profile
  const [organizations, profile] = await Promise.all([
    getOrganizations(user.id),
    getProfile(user.id),
  ])

  // If no organizations, redirect to onboarding
  if (organizations.length === 0) {
    redirect('/onboarding')
  }

  // Determine current organization
  let currentOrganization = organizations.find(
    org => org.id === profile?.current_organization_id
  )

  // If no current org set, use first one
  if (!currentOrganization) {
    currentOrganization = organizations[0]
  }

  return (
    <DashboardShell
      user={{
        id: user.id,
        email: user.email || '',
        fullName: profile?.full_name,
      }}
      organizations={organizations}
      currentOrganization={currentOrganization}
    >
      {children}
    </DashboardShell>
  )
}
