import { createClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, ExternalLink } from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string | null
  invoice_date: string | null
  vendor_name: string | null
  total_amount: number | null
  currency: string
  line_items: any | null
  user_email: string | null
  file_url: string | null
  file_type: string
  status: string
  created_at: string
  profiles: {
    full_name: string | null
  } | null
}

async function getAllInvoices(): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('invoices')
    .select(`
      *,
      profiles:user_id (full_name)
    `)
    .order('created_at', { ascending: false })

  return data || []
}

export default async function AllInvoicesPage() {
  const invoices = await getAllInvoices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sve fakture</h1>
        <p className="text-gray-500">Pregled svih faktura u sistemu</p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900">Nema faktura</p>
            <p className="mt-1 text-gray-500">Sistem nema zabilježenih faktura</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 lg:hidden">
            {invoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {invoice.invoice_number || 'Bez broja'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invoice.profiles?.full_name || 'Nepoznat korisnik'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        invoice.status === 'processed'
                          ? 'bg-green-100 text-green-700'
                          : invoice.status === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {invoice.status === 'processed'
                        ? 'Obrađeno'
                        : invoice.status === 'error'
                        ? 'Greška'
                        : 'Na čekanju'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dobavljač:</span>
                      <span className="text-gray-900">{invoice.vendor_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Iznos:</span>
                      <span className="font-medium text-gray-900">
                        {invoice.total_amount
                          ? formatCurrency(invoice.total_amount, invoice.currency)
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Datum:</span>
                      <span className="text-gray-900">
                        {invoice.invoice_date
                          ? formatDate(invoice.invoice_date)
                          : formatDate(invoice.created_at)}
                      </span>
                    </div>
                  </div>

                  {invoice.file_url && (
                    <a
                      href={invoice.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <ExternalLink size={14} />
                      Pogledaj {invoice.file_type.toUpperCase()}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Korisnik
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Broj fakture
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dobavljač
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Iznos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Datum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fajl
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium">
                            {invoice.profiles?.full_name || 'Nepoznat'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-900">
                            {invoice.invoice_number || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {invoice.vendor_name || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">
                            {invoice.total_amount
                              ? formatCurrency(invoice.total_amount, invoice.currency)
                              : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {invoice.invoice_date
                            ? formatDate(invoice.invoice_date)
                            : formatDate(invoice.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              invoice.status === 'processed'
                                ? 'bg-green-100 text-green-700'
                                : invoice.status === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {invoice.status === 'processed'
                              ? 'Obrađeno'
                              : invoice.status === 'error'
                              ? 'Greška'
                              : 'Na čekanju'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {invoice.file_url && (
                            <a
                              href={invoice.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                            >
                              <ExternalLink size={16} />
                              {invoice.file_type.toUpperCase()}
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
