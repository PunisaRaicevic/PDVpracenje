'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from 'lucide-react'

interface PDVData {
  incoming: {
    count: number
    subtotal: number
    taxAmount: number
    total: number
  }
  outgoing: {
    count: number
    subtotal: number
    taxAmount: number
    total: number
  }
}

const monthPresets = [
  { label: 'Ovaj mjesec', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: 'Prosli mjesec', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Prije 2 mjeseca', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 2)), end: endOfMonth(subMonths(new Date(), 2)) }) },
]

export function PDVSummary() {
  const supabase = createClient()
  const { currentOrganization } = useOrganization()
  const [pdvData, setPdvData] = useState<PDVData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)

  const period = monthPresets[selectedPeriod].getValue()

  useEffect(() => {
    async function loadPDVData() {
      if (!currentOrganization?.id) return

      setLoading(true)

      // Fetch ALL invoices for the organization first (for debugging)
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('invoice_type, subtotal, tax_amount, total_amount, status, invoice_date, created_at')
        .eq('organization_id', currentOrganization.id)

      // Debug logging
      console.log('PDV Summary - Organization ID:', currentOrganization.id)
      console.log('PDV Summary - Query error:', error)
      console.log('PDV Summary - All invoices count:', invoices?.length || 0)
      console.log('PDV Summary - All invoices:', invoices?.map(i => ({
        status: i.status,
        invoice_type: i.invoice_type,
        tax_amount: i.tax_amount,
        total_amount: i.total_amount,
        invoice_date: i.invoice_date,
        created_at: i.created_at
      })))

      // Filter by status - include 'verified' which is set when user confirms invoice
      const statusFiltered = invoices?.filter(i =>
        ['processing', 'processed', 'confirmed', 'verified', 'sent_to_accountant'].includes(i.status)
      ) || []
      console.log('PDV Summary - After status filter:', statusFiltered.length)

      // Filter by date - use invoice_date if available, otherwise use created_at
      const filteredInvoices = statusFiltered.filter((i) => {
        // Use invoice_date if available, otherwise fall back to created_at
        const dateStr = i.invoice_date || i.created_at
        if (!dateStr) return false
        const invoiceDate = new Date(dateStr)
        const inRange = invoiceDate >= period.start && invoiceDate <= period.end
        console.log('PDV Summary - Date check:', { dateStr, invoiceDate, periodStart: period.start, periodEnd: period.end, inRange })
        return inRange
      })
      console.log('PDV Summary - After date filter:', filteredInvoices.length)

      if (filteredInvoices.length > 0 || invoices) {
        // Treat null/undefined invoice_type as 'incoming' (most common case)
        const incoming = filteredInvoices.filter((i) => i.invoice_type === 'incoming' || !i.invoice_type)
        const outgoing = filteredInvoices.filter((i) => i.invoice_type === 'outgoing')
        console.log('PDV Summary - Incoming:', incoming.length, 'Outgoing:', outgoing.length)

        setPdvData({
          incoming: {
            count: incoming.length,
            subtotal: incoming.reduce((sum, i) => sum + (i.subtotal || 0), 0),
            taxAmount: incoming.reduce((sum, i) => sum + (i.tax_amount || 0), 0),
            total: incoming.reduce((sum, i) => sum + (i.total_amount || 0), 0),
          },
          outgoing: {
            count: outgoing.length,
            subtotal: outgoing.reduce((sum, i) => sum + (i.subtotal || 0), 0),
            taxAmount: outgoing.reduce((sum, i) => sum + (i.tax_amount || 0), 0),
            total: outgoing.reduce((sum, i) => sum + (i.total_amount || 0), 0),
          },
        })
      }

      setLoading(false)
    }

    loadPDVData()
  }, [currentOrganization?.id, selectedPeriod, supabase])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-Latn-RS', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const netPDV = pdvData ? pdvData.outgoing.taxAmount - pdvData.incoming.taxAmount : 0
  const isPositive = netPDV >= 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <Calculator size={18} className="text-teal-400" />
            </div>
            <span>PDV Pregled</span>
          </CardTitle>

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-navy-700 hover:bg-navy-600 border border-navy-600 rounded-lg transition-colors text-white"
            >
              {monthPresets[selectedPeriod].label}
              <ChevronDown size={14} className="text-navy-400" />
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute top-full right-0 mt-1 w-40 bg-navy-800 rounded-lg shadow-xl border border-navy-600 z-20 py-1">
                  {monthPresets.map((preset, index) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setSelectedPeriod(index)
                        setShowDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-navy-700 transition-colors ${
                        selectedPeriod === index ? 'bg-teal-500/20 text-teal-400' : 'text-navy-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <p className="text-sm text-navy-400 mt-2">
          {format(period.start, 'dd.MM.yyyy')} - {format(period.end, 'dd.MM.yyyy')}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : pdvData ? (
          <div className="space-y-4">
            {/* Incoming VAT */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-500/20 to-red-500/5 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <ArrowDownCircle className="text-red-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-red-300 font-medium">Ulazni PDV</p>
                  <p className="text-xs text-red-400/70">{pdvData.incoming.count} faktura</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-300">
                  {formatCurrency(pdvData.incoming.taxAmount)}
                </p>
                <p className="text-xs text-red-400/70">mozete odbiti</p>
              </div>
            </div>

            {/* Outgoing VAT */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-lime-500/20 to-lime-500/5 border border-lime-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-lime-500/20 rounded-lg flex items-center justify-center">
                  <ArrowUpCircle className="text-lime-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-lime-300 font-medium">Izlazni PDV</p>
                  <p className="text-xs text-lime-400/70">{pdvData.outgoing.count} faktura</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-lime-300">
                  {formatCurrency(pdvData.outgoing.taxAmount)}
                </p>
                <p className="text-xs text-lime-400/70">naplaceno</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-navy-600 my-2" />

            {/* Net VAT */}
            <div className={`flex items-center justify-between p-4 rounded-xl ${
              isPositive
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border border-yellow-500/30'
                : 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 border border-teal-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isPositive ? 'bg-yellow-500/20' : 'bg-teal-500/20'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="text-yellow-400" size={20} />
                  ) : (
                    <TrendingDown className="text-teal-400" size={20} />
                  )}
                </div>
                <div>
                  <p className={`font-medium ${isPositive ? 'text-yellow-300' : 'text-teal-300'}`}>
                    {isPositive ? 'PDV Obaveza' : 'PDV Povrat'}
                  </p>
                  <p className={`text-xs ${isPositive ? 'text-yellow-400/70' : 'text-teal-400/70'}`}>
                    {isPositive ? 'dugujete drzavi' : 'drzava vam duguje'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${isPositive ? 'text-yellow-300' : 'text-teal-300'}`}>
                  {formatCurrency(Math.abs(netPDV))}
                </p>
              </div>
            </div>

            {/* Summary info */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 bg-navy-700/50 border border-navy-600 rounded-xl">
                <p className="text-xs text-navy-400">Ulazni promet</p>
                <p className="font-semibold text-white">{formatCurrency(pdvData.incoming.total)}</p>
              </div>
              <div className="text-center p-3 bg-navy-700/50 border border-navy-600 rounded-xl">
                <p className="text-xs text-navy-400">Izlazni promet</p>
                <p className="font-semibold text-white">{formatCurrency(pdvData.outgoing.total)}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-navy-400 py-4">Nema podataka za prikaz</p>
        )}
      </CardContent>
    </Card>
  )
}
