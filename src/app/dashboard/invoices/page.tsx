'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  FolderOpen,
  X,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  code: string | null
  color: string
}

interface Invoice {
  id: string
  invoice_number: string | null
  invoice_date: string | null
  invoice_type: 'incoming' | 'outgoing'
  vendor_name: string | null
  buyer_name: string | null
  total_amount: number | null
  tax_amount: number | null
  currency: string
  file_url: string | null
  file_type: string
  status: string
  created_at: string
  project_id: string | null
  project?: {
    id: string
    name: string
    code: string | null
    color: string
  } | null
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  uploading: { label: 'Upload', color: 'text-navy-300', bgColor: 'bg-navy-700', icon: <Clock size={14} /> },
  processing: { label: 'Obrada', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <Clock size={14} /> },
  processed: { label: 'Ceka provjeru', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: <AlertCircle size={14} /> },
  confirmed: { label: 'Potvrdeno', color: 'text-lime-400', bgColor: 'bg-lime-500/20', icon: <CheckCircle size={14} /> },
  sent_to_accountant: { label: 'Poslano', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: <Send size={14} /> },
  error: { label: 'Greska', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: <AlertCircle size={14} /> },
}

type TypeFilter = 'all' | 'incoming' | 'outgoing'

export default function InvoicesPage() {
  const supabase = createClient()
  const { currentOrganization } = useOrganization()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Load projects for filter
  useEffect(() => {
    async function loadProjects() {
      if (!currentOrganization?.id) return

      const { data } = await supabase
        .from('projects')
        .select('id, name, code, color')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name')

      if (data) {
        setProjects(data)
      }
    }

    loadProjects()
  }, [currentOrganization?.id, supabase])

  useEffect(() => {
    async function loadInvoices() {
      if (!currentOrganization?.id) return

      setLoading(true)

      let query = supabase
        .from('invoices')
        .select(`
          *,
          project:projects(id, name, code, color)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })

      if (typeFilter !== 'all') {
        query = query.eq('invoice_type', typeFilter)
      }

      if (projectFilter) {
        query = query.eq('project_id', projectFilter)
      }

      const { data } = await query

      if (data) {
        setInvoices(data)
      }

      setLoading(false)
    }

    loadInvoices()
  }, [currentOrganization?.id, typeFilter, projectFilter, supabase])

  const filteredInvoices = invoices

  // Stats
  const incomingCount = invoices.filter((i) => i.invoice_type === 'incoming').length
  const outgoingCount = invoices.filter((i) => i.invoice_type === 'outgoing').length

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Fakture</h1>
          <p className="text-sm text-navy-400 hidden sm:block">Pregled svih vasih faktura</p>
        </div>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center px-3 lg:px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm rounded-lg hover:from-teal-600 hover:to-teal-700 shadow-lg hover:shadow-glow-teal transition-all"
        >
          <span className="hidden sm:inline">+ Nova faktura</span>
          <span className="sm:hidden">+ Nova</span>
        </Link>
      </div>

      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-navy-300 lg:hidden"
      >
        <Filter size={16} />
        <span>Filteri</span>
        {(typeFilter !== 'all' || projectFilter) && (
          <span className="px-1.5 py-0.5 bg-teal-500/20 text-teal-400 text-xs rounded-full">
            {(typeFilter !== 'all' ? 1 : 0) + (projectFilter ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Filter Tabs */}
      <div className={`flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3 lg:gap-4 ${showFilters ? 'block' : 'hidden lg:flex'}`}>
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-navy-500 hidden lg:block" />
          <div className="flex bg-navy-800 rounded-lg p-1 w-full lg:w-auto border border-navy-700">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 lg:flex-none px-3 lg:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                typeFilter === 'all'
                  ? 'bg-navy-700 text-white shadow-sm'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              Sve ({invoices.length})
            </button>
            <button
              onClick={() => setTypeFilter('incoming')}
              className={`flex-1 lg:flex-none px-3 lg:px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 lg:gap-2 ${
                typeFilter === 'incoming'
                  ? 'bg-red-500/20 text-red-400 shadow-sm'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              <ArrowDownCircle size={16} />
              <span className="hidden sm:inline">Ulazne</span> ({incomingCount})
            </button>
            <button
              onClick={() => setTypeFilter('outgoing')}
              className={`flex-1 lg:flex-none px-3 lg:px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 lg:gap-2 ${
                typeFilter === 'outgoing'
                  ? 'bg-lime-500/20 text-lime-400 shadow-sm'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              <ArrowUpCircle size={16} />
              <span className="hidden sm:inline">Izlazne</span> ({outgoingCount})
            </button>
          </div>
        </div>

        {/* Project Filter */}
        <div className="flex items-center gap-2">
          <FolderOpen size={18} className="text-navy-500 hidden lg:block" />
          <div className="relative flex-1 lg:flex-none">
            <select
              value={projectFilter || ''}
              onChange={(e) => setProjectFilter(e.target.value || null)}
              className="w-full lg:w-auto appearance-none bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Svi projekti</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code ? `[${project.code}] ` : ''}{project.name}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {projectFilter && (
            <button
              onClick={() => setProjectFilter(null)}
              className="p-1.5 text-navy-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
              title="Ponisti filter"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-navy-600" />
            <p className="mt-4 text-lg font-medium text-white">
              {typeFilter === 'all' ? 'Nemate faktura' : `Nemate ${typeFilter === 'incoming' ? 'ulaznih' : 'izlaznih'} faktura`}
            </p>
            <p className="mt-1 text-navy-400">Uploadujte prvu fakturu da biste poceli</p>
            <Link
              href="/dashboard/upload"
              className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 shadow-lg hover:shadow-glow-teal transition-all"
            >
              Upload fakture
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 lg:hidden">
            {filteredInvoices.map((invoice) => {
              const status = statusConfig[invoice.status] || statusConfig.processing
              const isIncoming = invoice.invoice_type === 'incoming'
              const partnerName = isIncoming ? invoice.vendor_name : invoice.buyer_name

              return (
                <Link
                  key={invoice.id}
                  href={`/dashboard/invoices/${invoice.id}`}
                  className="block"
                >
                  <Card className="hover:border-teal-500/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Type Icon */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isIncoming ? 'bg-red-500/20' : 'bg-lime-500/20'
                          }`}
                        >
                          {isIncoming ? (
                            <ArrowDownCircle className="text-red-400" size={20} />
                          ) : (
                            <ArrowUpCircle className="text-lime-400" size={20} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">
                                {partnerName || 'Nepoznat partner'}
                              </p>
                              <p className="text-sm text-navy-400">
                                {invoice.invoice_number || 'Bez broja'}
                              </p>
                            </div>
                            <ChevronRight size={20} className="text-navy-500 flex-shrink-0" />
                          </div>

                          {/* Project Badge */}
                          {invoice.project && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: invoice.project.color }}
                              />
                              <span className="text-xs text-navy-400">
                                {invoice.project.code ? `[${invoice.project.code}]` : invoice.project.name}
                              </span>
                            </div>
                          )}

                          {/* Amount and Status Row */}
                          <div className="flex items-center justify-between mt-3">
                            <div>
                              <p className="font-semibold text-white">
                                {invoice.total_amount
                                  ? formatCurrency(invoice.total_amount, invoice.currency)
                                  : '-'}
                              </p>
                              {invoice.tax_amount && (
                                <p className={`text-xs ${isIncoming ? 'text-red-400' : 'text-lime-400'}`}>
                                  PDV: {formatCurrency(invoice.tax_amount, invoice.currency)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
                              >
                                {status.icon}
                                {status.label}
                              </span>
                              <p className="text-xs text-navy-500 mt-1">
                                {invoice.invoice_date
                                  ? formatDate(invoice.invoice_date)
                                  : formatDate(invoice.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-navy-700/50 border-b border-navy-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        Tip
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        Pregled
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        Broj fakture
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        Partner
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        Iznos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        PDV
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        Datum
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-navy-400 uppercase tracking-wider">
                        Akcije
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-700">
                    {filteredInvoices.map((invoice) => {
                      const status = statusConfig[invoice.status] || statusConfig.processing
                      const isIncoming = invoice.invoice_type === 'incoming'
                      const partnerName = isIncoming ? invoice.vendor_name : invoice.buyer_name

                      return (
                        <tr key={invoice.id} className="hover:bg-navy-700/50 transition-colors">
                          {/* Type */}
                          <td className="px-4 py-4">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isIncoming ? 'bg-red-500/20' : 'bg-lime-500/20'
                              }`}
                              title={isIncoming ? 'Ulazna faktura' : 'Izlazna faktura'}
                            >
                              {isIncoming ? (
                                <ArrowDownCircle className="text-red-400" size={18} />
                              ) : (
                                <ArrowUpCircle className="text-lime-400" size={18} />
                              )}
                            </div>
                          </td>
                          {/* Preview */}
                          <td className="px-4 py-4">
                            <Link href={`/dashboard/invoices/${invoice.id}`} className="block">
                              {invoice.file_type === 'pdf' ? (
                                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-colors">
                                  <FileText className="text-red-400" size={24} />
                                </div>
                              ) : invoice.file_url ? (
                                <img
                                  src={invoice.file_url}
                                  alt="Faktura"
                                  className="w-12 h-12 object-cover rounded-lg border border-navy-600 hover:opacity-80 transition-opacity"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-navy-700 rounded-lg flex items-center justify-center">
                                  <FileText className="text-navy-500" size={24} />
                                </div>
                              )}
                            </Link>
                          </td>
                          {/* Invoice Number */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="font-medium text-white hover:text-teal-400 transition-colors"
                            >
                              {invoice.invoice_number || '-'}
                            </Link>
                            {invoice.project && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: invoice.project.color }}
                                />
                                <span className="text-xs text-navy-400">
                                  {invoice.project.code ? `[${invoice.project.code}]` : invoice.project.name}
                                </span>
                              </div>
                            )}
                          </td>
                          {/* Partner */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-navy-300">{partnerName || '-'}</span>
                          </td>
                          {/* Amount */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-medium text-white">
                              {invoice.total_amount
                                ? formatCurrency(invoice.total_amount, invoice.currency)
                                : '-'}
                            </span>
                          </td>
                          {/* VAT */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`text-sm ${isIncoming ? 'text-red-400' : 'text-lime-400'}`}>
                              {invoice.tax_amount
                                ? formatCurrency(invoice.tax_amount, invoice.currency)
                                : '-'}
                            </span>
                          </td>
                          {/* Date */}
                          <td className="px-4 py-4 whitespace-nowrap text-navy-300">
                            {invoice.invoice_date
                              ? formatDate(invoice.invoice_date)
                              : formatDate(invoice.created_at)}
                          </td>
                          {/* Status */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
                            >
                              {status.icon}
                              {status.label}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
                            >
                              <Eye size={16} />
                              Detalji
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
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
