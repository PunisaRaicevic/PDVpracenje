import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Users, FileText, DollarSign, TrendingUp } from 'lucide-react'
import Link from 'next/link'

async function getAdminStats() {
  const supabase = await createClient()

  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { data: invoices } = await supabase.from('invoices').select('*')

  const totalInvoices = invoices?.length || 0
  const totalAmount = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0
  const pendingCount = invoices?.filter((i) => i.status === 'pending').length || 0

  return {
    userCount: userCount || 0,
    totalInvoices,
    totalAmount,
    pendingCount,
  }
}

async function getRecentActivity() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('invoices')
    .select(`
      *,
      profiles:user_id (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return data || []
}

export default async function AdminPage() {
  const stats = await getAdminStats()
  const recentActivity = await getRecentActivity()

  const statCards = [
    {
      title: 'Ukupno korisnika',
      value: stats.userCount,
      icon: <Users className="text-primary-600" size={24} />,
      href: '/admin/users',
    },
    {
      title: 'Ukupno faktura',
      value: stats.totalInvoices,
      icon: <FileText className="text-blue-600" size={24} />,
      href: '/admin/all-invoices',
    },
    {
      title: 'Ukupan promet',
      value: formatCurrency(stats.totalAmount),
      icon: <DollarSign className="text-green-600" size={24} />,
      href: '/admin/all-invoices',
    },
    {
      title: 'Na čekanju',
      value: stats.pendingCount,
      icon: <TrendingUp className="text-yellow-600" size={24} />,
      href: '/admin/all-invoices?status=pending',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500">Upravljanje sistemom i korisnicima</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nedavna aktivnost</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nema aktivnosti</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {item.vendor_name || 'Nova faktura'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.profiles?.full_name || 'Korisnik'} - {item.invoice_number || 'Bez broja'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {item.total_amount ? formatCurrency(item.total_amount) : '-'}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'processed'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {item.status === 'processed'
                        ? 'Obrađeno'
                        : item.status === 'error'
                        ? 'Greška'
                        : 'Na čekanju'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
