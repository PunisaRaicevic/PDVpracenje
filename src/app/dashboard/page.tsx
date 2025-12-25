import { createClient } from '@/lib/supabase-server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { redirect } from 'next/navigation'

async function getDashboardData(organizationId: string) {
  const supabase = await createClient()

  // Get invoices for the organization
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (!invoices) {
    return {
      stats: { total: 0, pending: 0, totalAmount: 0, thisMonth: 0 },
      recentInvoices: [],
    }
  }

  const total = invoices.length
  const pending = invoices.filter(
    (i) => i.status === 'processing' || i.status === 'processed'
  ).length
  const totalAmount = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0)

  const now = new Date()
  const thisMonthInvoices = invoices.filter((i) => {
    const date = new Date(i.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  return {
    stats: { total, pending, totalAmount, thisMonth: thisMonthInvoices.length },
    recentInvoices: invoices.slice(0, 5),
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's current organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_organization_id) {
    redirect('/onboarding')
  }

  const { stats, recentInvoices } = await getDashboardData(profile.current_organization_id)

  return (
    <DashboardContent
      initialStats={stats}
      initialInvoices={recentInvoices}
    />
  )
}
