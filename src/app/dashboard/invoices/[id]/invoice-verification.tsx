'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Send,
  Edit2,
  Save,
  X,
  AlertTriangle,
  Building,
  Calendar,
  Receipt,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Invoice {
  id: string
  invoice_number: string | null
  invoice_date: string | null
  vendor_name: string | null
  vendor_address: string | null
  vendor_tax_id: string | null
  vendor_pdv: string | null
  buyer_name: string | null
  buyer_address: string | null
  buyer_tax_id: string | null
  subtotal: number | null
  tax_amount: number | null
  total_amount: number | null
  currency: string
  line_items: any[] | null
  notes: string | null
  file_url: string | null
  file_type: string
  status: string
  created_at: string
  user_id: string
}

interface Props {
  invoice: Invoice
}

type InvoiceStatus = 'pending' | 'processed' | 'verified' | 'sent_to_accountant' | 'error'

const statusConfig: Record<InvoiceStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Na cekanju', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  processed: { label: 'Obradeno - ceka provjeru', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  verified: { label: 'Provjereno', color: 'text-lime-400', bgColor: 'bg-lime-500/20' },
  sent_to_accountant: { label: 'Poslano racunovodji', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  error: { label: 'Greska', color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

// Helper to safely parse line_items (can be array or JSON string)
function parseLineItems(lineItems: any): any[] {
  if (!lineItems) return []
  if (Array.isArray(lineItems)) return lineItems
  if (typeof lineItems === 'string') {
    try {
      const parsed = JSON.parse(lineItems)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function InvoiceVerification({ invoice }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { currentOrganization } = useOrganization()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Parse line_items safely
  const lineItems = parseLineItems(invoice.line_items)

  // Get company data from organization settings
  const companyData = {
    name: currentOrganization?.name || '',
    pib: currentOrganization?.settings?.pib || '',
    pdv_number: currentOrganization?.settings?.pdv_number || '',
    address: currentOrganization?.settings?.address || '',
    email: currentOrganization?.settings?.email || '',
    phone: currentOrganization?.settings?.phone || '',
  }

  const [formData, setFormData] = useState({
    invoice_number: invoice.invoice_number || '',
    invoice_date: invoice.invoice_date || '',
    vendor_name: invoice.vendor_name || '',
    vendor_address: invoice.vendor_address || '',
    vendor_tax_id: invoice.vendor_tax_id || '',
    vendor_pdv: invoice.vendor_pdv || '',
    buyer_name: invoice.buyer_name || '',
    buyer_address: invoice.buyer_address || '',
    buyer_tax_id: invoice.buyer_tax_id || '',
    subtotal: invoice.subtotal || 0,
    tax_amount: invoice.tax_amount || 0,
    total_amount: invoice.total_amount || 0,
    currency: invoice.currency || 'EUR',
    notes: invoice.notes || '',
  })

  const currentStatus = (invoice.status as InvoiceStatus) || 'pending'
  const statusInfo = statusConfig[currentStatus] || statusConfig.pending

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Auto-fill buyer info from company settings
  const fillBuyerFromCompany = () => {
    setFormData((prev) => ({
      ...prev,
      buyer_name: companyData.name,
      buyer_address: companyData.address,
      buyer_tax_id: companyData.pib,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          ...formData,
          subtotal: Number(formData.subtotal),
          tax_amount: Number(formData.tax_amount),
          total_amount: Number(formData.total_amount),
        })
        .eq('id', invoice.id)

      if (error) throw error

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Greska pri spremanju')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerify = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'verified' })
        .eq('id', invoice.id)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error('Error verifying:', error)
      alert('Greska pri verifikaciji')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendToAccountant = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent_to_accountant' })
        .eq('id', invoice.id)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error('Error sending:', error)
      alert('Greska pri slanju')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard/invoices"
            className="p-2 hover:bg-navy-700 rounded-lg transition-colors text-navy-400 hover:text-white flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
              Faktura {invoice.invoice_number || '#' + invoice.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-navy-400">Uploadovano {formatDate(invoice.created_at)}</p>
          </div>
        </div>
        <span className={`self-start sm:self-auto px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Status Banner */}
      {currentStatus === 'processed' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-blue-400 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-blue-400">Provjeri izvucene podatke</p>
            <p className="text-sm text-blue-400/80">
              AI je izvukao podatke iz fakture. Molimo te da provjeri da li su svi podaci tacni
              prije nego sto posaljes racunovodji.
            </p>
          </div>
        </div>
      )}

      {currentStatus === 'verified' && (
        <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="text-lime-400 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-lime-400">Podaci su provjereni</p>
            <p className="text-sm text-lime-400/80">
              Mozete sada poslati fakturu racunovodji.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Invoice Preview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-white">Originalna faktura</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.file_url ? (
                invoice.file_type === 'pdf' ? (
                  <div className="space-y-4">
                    <div className="aspect-[3/4] bg-navy-900/50 rounded-lg flex items-center justify-center">
                      <FileText className="text-navy-500" size={64} />
                    </div>
                    <a
                      href={invoice.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
                    >
                      Otvori PDF
                    </a>
                  </div>
                ) : (
                  <a
                    href={invoice.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={invoice.file_url}
                      alt="Faktura"
                      className="w-full rounded-lg border border-navy-600 hover:opacity-90 transition-opacity"
                    />
                  </a>
                )
              ) : (
                <div className="aspect-[3/4] bg-navy-900/50 rounded-lg flex items-center justify-center">
                  <p className="text-navy-500">Nema pregleda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Extracted Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving} className="w-full sm:w-auto">
                  <X size={16} className="mr-2" />
                  Otkazi
                </Button>
                <Button onClick={handleSave} loading={isSaving} className="w-full sm:w-auto">
                  <Save size={16} className="mr-2" />
                  Spremi izmjene
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                  <Edit2 size={16} className="mr-2" />
                  Uredi
                </Button>
                {currentStatus === 'processed' && (
                  <Button onClick={handleVerify} loading={isSaving} className="w-full sm:w-auto">
                    <CheckCircle size={16} className="mr-2" />
                    Potvrdi podatke
                  </Button>
                )}
                {currentStatus === 'verified' && (
                  <Button onClick={handleSendToAccountant} loading={isSaving} className="w-full sm:w-auto">
                    <Send size={16} className="mr-2" />
                    Posalji racunovodji
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Receipt size={20} className="text-teal-400" />
                Osnovni podaci
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-400 mb-1">
                  Broj fakture
                </label>
                {isEditing ? (
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                  />
                ) : (
                  <p className="text-white font-medium">{formData.invoice_number || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-400 mb-1">
                  Datum fakture
                </label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                  />
                ) : (
                  <p className="text-white font-medium">
                    {formData.invoice_date ? formatDate(formData.invoice_date) : '-'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vendor Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Building size={20} className="text-teal-400" />
                Dobavljac (prodavac)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-400 mb-1">
                  Naziv firme
                </label>
                {isEditing ? (
                  <Input
                    value={formData.vendor_name}
                    onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                  />
                ) : (
                  <p className="text-white font-medium">{formData.vendor_name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-400 mb-1">
                  Adresa
                </label>
                {isEditing ? (
                  <Input
                    value={formData.vendor_address}
                    onChange={(e) => handleInputChange('vendor_address', e.target.value)}
                  />
                ) : (
                  <p className="text-navy-300">{formData.vendor_address || '-'}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-400 mb-1">
                    PIB
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.vendor_tax_id}
                      onChange={(e) => handleInputChange('vendor_tax_id', e.target.value)}
                      placeholder="Poreski identifikacioni broj"
                    />
                  ) : (
                    <p className="text-navy-300">{formData.vendor_tax_id || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-400 mb-1">
                    PDV broj
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.vendor_pdv}
                      onChange={(e) => handleInputChange('vendor_pdv', e.target.value)}
                      placeholder="PDV registracioni broj"
                    />
                  ) : (
                    <p className="text-navy-300">{formData.vendor_pdv || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info Card */}
          {(companyData.pib || companyData.address || companyData.email) && (
            <Card className="bg-gradient-to-r from-teal-500/10 to-lime-500/5 border-teal-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Building size={20} className="text-teal-400" />
                  Podaci vase firme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-navy-400 mb-1">Naziv</p>
                    <p className="text-white font-medium">{companyData.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-navy-400 mb-1">PIB</p>
                    <p className="text-white font-medium">{companyData.pib || '-'}</p>
                  </div>
                  <div>
                    <p className="text-navy-400 mb-1">PDV broj</p>
                    <p className="text-white font-medium">{companyData.pdv_number || '-'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-navy-400 mb-1">Adresa</p>
                    <p className="text-white">{companyData.address || '-'}</p>
                  </div>
                  {companyData.email && (
                    <div>
                      <p className="text-navy-400 mb-1">Email</p>
                      <p className="text-teal-400">{companyData.email}</p>
                    </div>
                  )}
                  {companyData.phone && (
                    <div>
                      <p className="text-navy-400 mb-1">Telefon</p>
                      <p className="text-white">{companyData.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Buyer Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Building size={20} className="text-teal-400" />
                  Kupac (vasa firma)
                </CardTitle>
                {isEditing && companyData.name && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fillBuyerFromCompany}
                  >
                    <RefreshCw size={14} className="mr-2" />
                    Popuni iz postavki
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-400 mb-1">
                  Naziv firme
                </label>
                {isEditing ? (
                  <Input
                    value={formData.buyer_name}
                    onChange={(e) => handleInputChange('buyer_name', e.target.value)}
                  />
                ) : (
                  <p className="text-white font-medium">{formData.buyer_name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-400 mb-1">
                  Adresa
                </label>
                {isEditing ? (
                  <Input
                    value={formData.buyer_address}
                    onChange={(e) => handleInputChange('buyer_address', e.target.value)}
                  />
                ) : (
                  <p className="text-navy-300">{formData.buyer_address || '-'}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-400 mb-1">
                    PIB
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.buyer_tax_id}
                      onChange={(e) => handleInputChange('buyer_tax_id', e.target.value)}
                      placeholder="Poreski identifikacioni broj"
                    />
                  ) : (
                    <p className="text-navy-300">{formData.buyer_tax_id || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-400 mb-1">
                    PDV broj
                  </label>
                  <p className="text-navy-300">{companyData.pdv_number || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <DollarSign size={20} className="text-teal-400" />
                Iznosi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-400 mb-1">
                    Osnovica (bez PDV)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => handleInputChange('subtotal', e.target.value)}
                    />
                  ) : (
                    <p className="text-white font-medium">
                      {formatCurrency(formData.subtotal, formData.currency)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-400 mb-1">
                    PDV
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.tax_amount}
                      onChange={(e) => handleInputChange('tax_amount', e.target.value)}
                    />
                  ) : (
                    <p className="text-white font-medium">
                      {formatCurrency(formData.tax_amount, formData.currency)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-400 mb-1">
                    Ukupno
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => handleInputChange('total_amount', e.target.value)}
                    />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-teal-400">
                      {formatCurrency(formData.total_amount, formData.currency)}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-400 mb-1">
                  Valuta
                </label>
                {isEditing ? (
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="EUR">EUR</option>
                    <option value="BAM">BAM</option>
                    <option value="RSD">RSD</option>
                    <option value="HRK">HRK</option>
                    <option value="USD">USD</option>
                  </select>
                ) : (
                  <p className="text-navy-300">{formData.currency}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-white">Stavke</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile Card View */}
                <div className="space-y-3 lg:hidden">
                  {lineItems.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-navy-700/50 border border-navy-600 rounded-lg p-3"
                    >
                      <p className="font-medium text-white mb-2">
                        {item.description || 'Bez opisa'}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-navy-400 text-xs">Kolicina</p>
                          <p className="text-navy-300">{item.quantity || '-'}</p>
                        </div>
                        <div>
                          <p className="text-navy-400 text-xs">Cijena</p>
                          <p className="text-navy-300">
                            {item.unit_price ? formatCurrency(item.unit_price, formData.currency) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-navy-400 text-xs">Iznos</p>
                          <p className="font-medium text-teal-400">
                            {item.amount ? formatCurrency(item.amount, formData.currency) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden lg:block">
                  <table className="w-full text-sm">
                    <thead className="bg-navy-700/50 border-b border-navy-600">
                      <tr>
                        <th className="px-4 py-2 text-left text-navy-400">Opis</th>
                        <th className="px-4 py-2 text-right text-navy-400">Kolicina</th>
                        <th className="px-4 py-2 text-right text-navy-400">Cijena</th>
                        <th className="px-4 py-2 text-right text-navy-400">Iznos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-700">
                      {lineItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-navy-700/50">
                          <td className="px-4 py-2 text-navy-300">{item.description || '-'}</td>
                          <td className="px-4 py-2 text-right text-navy-300">{item.quantity || '-'}</td>
                          <td className="px-4 py-2 text-right text-navy-300">
                            {item.unit_price ? formatCurrency(item.unit_price, formData.currency) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-white">
                            {item.amount ? formatCurrency(item.amount, formData.currency) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-white">Napomene</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  rows={3}
                  placeholder="Dodajte napomene za racunovodju..."
                />
              ) : (
                <p className="text-navy-300">{formData.notes || 'Nema napomena'}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
