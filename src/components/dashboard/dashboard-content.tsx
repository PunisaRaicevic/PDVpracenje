'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useOrganization } from '@/lib/organization-context'
import { useInvoiceRealtime, Invoice } from '@/hooks/use-invoice-realtime'
import { ConfirmationModal } from '@/components/invoices/confirmation-modal'
import { PDVSummary } from '@/components/dashboard/pdv-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Upload, DollarSign, Clock, Bell, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  uploading: { label: 'Uploading', color: 'text-navy-300', bgColor: 'bg-navy-700' },
  processing: { label: 'Obrada', color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  processed: { label: 'Ceka provjeru', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  confirmed: { label: 'Potvrdeno', color: 'text-lime-400', bgColor: 'bg-lime-500/20' },
  sent_to_accountant: { label: 'Poslano', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  error: { label: 'Greska', color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

interface DashboardStats {
  total: number
  pending: number
  totalAmount: number
  thisMonth: number
}

interface DashboardContentProps {
  initialStats: DashboardStats
  initialInvoices: Invoice[]
}

export function DashboardContent({ initialStats, initialInvoices }: DashboardContentProps) {
  const { currentOrganization } = useOrganization()
  const [stats, setStats] = useState(initialStats)
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>(initialInvoices)
  const [pendingConfirmations, setPendingConfirmations] = useState<Invoice[]>([])
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Subscribe to realtime invoice updates
  useInvoiceRealtime({
    organizationId: currentOrganization?.id || null,
    enabled: !!currentOrganization?.id,
    onInvoiceProcessed: (invoice) => {
      console.log('Invoice processed notification:', invoice.id)
      setPendingConfirmations((prev) => [...prev, invoice])
      toast.success(`Nova faktura obradena: ${invoice.vendor_name || 'Nepoznat dobavljac'}`, {
        duration: 5000,
        icon: '📄',
      })
    },
    onInvoiceUpdated: (invoice) => {
      // Update recent invoices list
      setRecentInvoices((prev) => {
        const index = prev.findIndex((i) => i.id === invoice.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = invoice
          return updated
        }
        // New invoice, add to top
        return [invoice, ...prev.slice(0, 4)]
      })

      // Update stats
      updateStats()
    },
    onInvoiceError: (invoice) => {
      toast.error(`Greska pri obradi fakture: ${invoice.notes || 'Nepoznata greska'}`, {
        duration: 5000,
      })
    },
  })

  // Simple stats recalculation
  const updateStats = () => {
    const total = recentInvoices.length
    const pending = recentInvoices.filter(
      (i) => i.status === 'processing' || i.status === 'processed'
    ).length
    const totalAmount = recentInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0)

    const now = new Date()
    const thisMonth = recentInvoices.filter((i) => {
      const date = new Date(i.created_at)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length

    setStats({ total, pending, totalAmount, thisMonth })
  }

  const handleOpenConfirmation = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowConfirmationModal(true)
  }

  const handleConfirmationComplete = (confirmed: boolean) => {
    setShowConfirmationModal(false)
    if (confirmed && selectedInvoice) {
      setPendingConfirmations((prev) =>
        prev.filter((i) => i.id !== selectedInvoice.id)
      )
      toast.success('Faktura uspjesno potvrdena!')
    }
    setSelectedInvoice(null)
  }

  const statCards = [
    {
      title: 'Ukupno faktura',
      value: stats.total,
      icon: <FileText className="text-teal-400" size={24} />,
      href: '/dashboard/invoices',
      gradient: 'from-teal-500/20 to-teal-500/5',
    },
    {
      title: 'Na cekanju',
      value: stats.pending,
      icon: <Clock className="text-yellow-400" size={24} />,
      href: '/dashboard/invoices?status=pending',
      gradient: 'from-yellow-500/20 to-yellow-500/5',
    },
    {
      title: 'Ukupan iznos',
      value: formatCurrency(stats.totalAmount),
      icon: <DollarSign className="text-lime-400" size={24} />,
      href: '/dashboard/reports',
      gradient: 'from-lime-500/20 to-lime-500/5',
    },
    {
      title: 'Ovaj mjesec',
      value: stats.thisMonth,
      icon: <Upload className="text-teal-400" size={24} />,
      href: '/dashboard/invoices',
      gradient: 'from-teal-500/20 to-teal-500/5',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Pending Confirmations Banner */}
      {pendingConfirmations.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Bell className="text-yellow-400" size={24} />
              </div>
              <div>
                <p className="font-medium text-yellow-300">
                  {pendingConfirmations.length} faktura ceka potvrdu
                </p>
                <p className="text-sm text-yellow-400/70">
                  Pregledajte i potvrdite ekstrahovane podatke
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenConfirmation(pendingConfirmations[0])}
              className="px-4 py-2 bg-yellow-500 text-navy-900 font-medium rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Pregledaj
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-sm sm:text-base text-navy-400">Pregled vasih faktura i statistika</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className={`hover:border-teal-500/50 transition-all duration-300 cursor-pointer bg-gradient-to-br ${card.gradient}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-navy-400">{card.title}</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold mt-1 text-white">{card.value}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-navy-700/50 rounded-xl flex items-center justify-center">
                    {card.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* PDV Summary */}
      <PDVSummary />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nedavne fakture</CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-navy-400 text-center py-8">
                Nemate faktura.{' '}
                <Link
                  href="/dashboard/upload"
                  className="text-teal-400 hover:text-teal-300 hover:underline"
                >
                  Upload-ujte prvu fakturu
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentInvoices.slice(0, 5).map((invoice) => {
                  const status = statusConfig[invoice.status] || statusConfig.processing
                  const needsConfirmation =
                    invoice.status === 'processed' && invoice.requires_confirmation
                  const isIncoming = invoice.invoice_type === 'incoming'
                  return (
                    <div
                      key={invoice.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                        needsConfirmation
                          ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 cursor-pointer'
                          : 'bg-navy-700/50 hover:bg-navy-700 border border-navy-600'
                      }`}
                      onClick={() =>
                        needsConfirmation
                          ? handleOpenConfirmation(invoice)
                          : null
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isIncoming ? 'bg-red-500/20' : 'bg-lime-500/20'
                        }`}>
                          {isIncoming ? (
                            <ArrowDownCircle className="text-red-400" size={16} />
                          ) : (
                            <ArrowUpCircle className="text-lime-400" size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {invoice.vendor_name || 'Nepoznat'}
                          </p>
                          <p className="text-sm text-navy-400">
                            {invoice.invoice_number || 'Bez broja'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">
                          {formatCurrency(invoice.total_amount || 0, invoice.currency)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${status.bgColor} ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brze akcije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/upload?type=incoming"
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-500/20 to-red-500/5 border border-red-500/30 rounded-xl hover:border-red-400/50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <ArrowDownCircle className="text-red-400" size={24} />
              </div>
              <div>
                <p className="font-medium text-red-300">Ulazna faktura</p>
                <p className="text-sm text-red-400/70">
                  Faktura od dobavljaca
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/upload?type=outgoing"
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-lime-500/20 to-lime-500/5 border border-lime-500/30 rounded-xl hover:border-lime-400/50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-lime-500/20 rounded-lg flex items-center justify-center">
                <ArrowUpCircle className="text-lime-400" size={24} />
              </div>
              <div>
                <p className="font-medium text-lime-300">Izlazna faktura</p>
                <p className="text-sm text-lime-400/70">
                  Faktura koju ste izdali
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/invoices"
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-500/20 to-teal-500/5 border border-teal-500/30 rounded-xl hover:border-teal-400/50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <FileText className="text-teal-400" size={24} />
              </div>
              <div>
                <p className="font-medium text-teal-300">Pregledaj fakture</p>
                <p className="text-sm text-teal-400/70">Pogledajte sve vase fakture</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && selectedInvoice && (
        <ConfirmationModal
          invoice={selectedInvoice}
          isOpen={showConfirmationModal}
          onClose={() => handleConfirmationComplete(false)}
          onConfirmed={() => handleConfirmationComplete(true)}
        />
      )}
    </div>
  )
}
