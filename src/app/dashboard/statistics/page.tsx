import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, FileText, DollarSign } from 'lucide-react'

interface MonthlyStats {
  month: string
  count: number
  total: number
}

async function getStatistics(organizationId: string) {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', organizationId)
    .in('status', ['processed', 'confirmed', 'sent_to_accountant'])

  if (!invoices || invoices.length === 0) {
    return {
      totalInvoices: 0,
      totalAmount: 0,
      totalTax: 0,
      avgAmount: 0,
      monthlyStats: [],
      topVendors: [],
    }
  }

  const totalInvoices = invoices.length
  const totalAmount = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0)
  const avgAmount = totalAmount / totalInvoices

  // Monthly statistics
  const monthlyMap = new Map<string, { count: number; total: number }>()
  invoices.forEach((inv) => {
    const date = new Date(inv.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const current = monthlyMap.get(key) || { count: 0, total: 0 }
    monthlyMap.set(key, {
      count: current.count + 1,
      total: current.total + (inv.total_amount || 0),
    })
  })

  const monthlyStats: MonthlyStats[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6)

  // Top vendors
  const vendorMap = new Map<string, { count: number; total: number }>()
  invoices.forEach((inv) => {
    const vendor = inv.vendor_name || 'Nepoznato'
    const current = vendorMap.get(vendor) || { count: 0, total: 0 }
    vendorMap.set(vendor, {
      count: current.count + 1,
      total: current.total + (inv.total_amount || 0),
    })
  })

  const topVendors = Array.from(vendorMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return {
    totalInvoices,
    totalAmount,
    avgAmount,
    monthlyStats,
    topVendors,
  }
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
    'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'
  ]
  return `${months[parseInt(month) - 1]} ${year}`
}

export default async function StatisticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's current organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_organization_id) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nema odabrane organizacije
      </div>
    )
  }

  const stats = await getStatistics(profile.current_organization_id)

  const summaryCards = [
    {
      title: 'Ukupno faktura',
      value: stats.totalInvoices,
      icon: <FileText className="text-primary-600" size={24} />,
    },
    {
      title: 'Ukupan iznos',
      value: formatCurrency(stats.totalAmount),
      icon: <DollarSign className="text-green-600" size={24} />,
    },
    {
      title: 'Prosječan iznos',
      value: formatCurrency(stats.avgAmount),
      icon: <TrendingUp className="text-orange-600" size={24} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistike</h1>
        <p className="text-gray-500">Pregled vaših finansijskih podataka</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                {card.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mjesečni pregled</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlyStats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nema podataka</p>
            ) : (
              <div className="space-y-3">
                {stats.monthlyStats.map((month) => (
                  <div
                    key={month.month}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{formatMonth(month.month)}</p>
                      <p className="text-sm text-gray-500">{month.count} faktura</p>
                    </div>
                    <p className="font-bold text-lg">
                      {formatCurrency(month.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top dobavljači</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topVendors.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nema podataka</p>
            ) : (
              <div className="space-y-3">
                {stats.topVendors.map((vendor, index) => (
                  <div
                    key={vendor.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-sm text-gray-500">{vendor.count} faktura</p>
                      </div>
                    </div>
                    <p className="font-bold">{formatCurrency(vendor.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
