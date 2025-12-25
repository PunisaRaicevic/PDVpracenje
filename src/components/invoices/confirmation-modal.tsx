'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  X,
  CheckCircle,
  AlertTriangle,
  FileText,
  Edit2,
  Save,
  Building,
  Calendar,
  DollarSign,
  Loader2,
} from 'lucide-react'
import type { Invoice } from '@/hooks/use-invoice-realtime'

interface ConfirmationModalProps {
  invoice: Invoice
  isOpen: boolean
  onClose: () => void
  onConfirmed?: (invoice: Invoice) => void
}

// Confidence level colors
const getConfidenceColor = (confidence: number | undefined) => {
  if (!confidence) return 'bg-navy-700 text-navy-400'
  if (confidence >= 0.9) return 'bg-lime-500/20 text-lime-400'
  if (confidence >= 0.7) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

const getConfidenceLabel = (confidence: number | undefined) => {
  if (!confidence) return 'Nepoznato'
  if (confidence >= 0.9) return 'Visoka'
  if (confidence >= 0.7) return 'Srednja'
  return 'Niska'
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

export function ConfirmationModal({
  invoice,
  isOpen,
  onClose,
  onConfirmed,
}: ConfirmationModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Parse line_items safely
  const lineItems = parseLineItems(invoice.line_items)

  const [formData, setFormData] = useState({
    invoice_number: invoice.invoice_number || '',
    invoice_date: invoice.invoice_date || '',
    vendor_name: invoice.vendor_name || '',
    vendor_address: invoice.vendor_address || '',
    vendor_tax_id: invoice.vendor_tax_id || '',
    subtotal: invoice.subtotal || 0,
    tax_rate: invoice.tax_rate || 0,
    tax_amount: invoice.tax_amount || 0,
    total_amount: invoice.total_amount || 0,
    currency: invoice.currency || 'EUR',
  })

  // Update form when invoice changes
  useEffect(() => {
    setFormData({
      invoice_number: invoice.invoice_number || '',
      invoice_date: invoice.invoice_date || '',
      vendor_name: invoice.vendor_name || '',
      vendor_address: invoice.vendor_address || '',
      vendor_tax_id: invoice.vendor_tax_id || '',
      subtotal: invoice.subtotal || 0,
      tax_rate: invoice.tax_rate || 0,
      tax_amount: invoice.tax_amount || 0,
      total_amount: invoice.total_amount || 0,
      currency: invoice.currency || 'EUR',
    })
  }, [invoice])

  if (!isOpen) return null

  const confidence = invoice.extraction_confidence || {}

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleConfirm = async () => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('invoices')
        .update({
          ...formData,
          subtotal: Number(formData.subtotal),
          tax_rate: Number(formData.tax_rate),
          tax_amount: Number(formData.tax_amount),
          total_amount: Number(formData.total_amount),
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id,
          requires_confirmation: false,
        })
        .eq('id', invoice.id)
        .select()
        .single()

      if (error) throw error

      onConfirmed?.(data)
      onClose()
      router.refresh()
    } catch (error) {
      console.error('Error confirming invoice:', error)
      alert('Greska pri potvrdi fakture')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEdits = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          ...formData,
          subtotal: Number(formData.subtotal),
          tax_rate: Number(formData.tax_rate),
          tax_amount: Number(formData.tax_amount),
          total_amount: Number(formData.total_amount),
        })
        .eq('id', invoice.id)

      if (error) throw error

      setIsEditing(false)
    } catch (error) {
      console.error('Error saving edits:', error)
      alert('Greska pri spremanju')
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: formData.currency,
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-navy-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4 border border-navy-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Potvrdi podatke fakture</h2>
              <p className="text-sm text-navy-400">
                Provjeri izvucene podatke i potvrdi ako su tacni
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-navy-700 rounded-lg transition-colors text-navy-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Invoice Preview */}
            <div>
              <h3 className="font-semibold text-white mb-3">Originalna faktura</h3>
              <div className="border border-navy-600 rounded-xl overflow-hidden bg-navy-900/50">
                {invoice.file_url ? (
                  invoice.file_type === 'pdf' ? (
                    <div className="aspect-[3/4] flex flex-col items-center justify-center p-8">
                      <FileText className="w-16 h-16 text-navy-500 mb-4" />
                      <a
                        href={invoice.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-colors"
                      >
                        Otvori PDF
                      </a>
                    </div>
                  ) : (
                    <img
                      src={invoice.file_url}
                      alt="Faktura"
                      className="w-full h-auto"
                    />
                  )
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center">
                    <p className="text-navy-500">Nema pregleda</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Extracted Data */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Izvuceni podaci</h3>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 size={14} className="mr-1" />
                    Uredi
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveEdits}
                    loading={isSaving}
                  >
                    <Save size={14} className="mr-1" />
                    Spremi
                  </Button>
                )}
              </div>

              {/* Warning for low confidence */}
              {Object.values(confidence).some((c: any) => c < 0.7) && (
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400">Niska pouzdanost</p>
                    <p className="text-sm text-yellow-400/80">
                      Neki podaci imaju nisku pouzdanost ekstrakcije. Molimo provjerite.
                    </p>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="bg-navy-700/50 rounded-xl p-4 space-y-3 border border-navy-600">
                <div className="flex items-center gap-2 text-sm font-medium text-navy-300">
                  <Calendar size={16} className="text-teal-400" />
                  Osnovni podaci
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-navy-400">Broj fakture</label>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(confidence.invoice_number)}`}>
                        {getConfidenceLabel(confidence.invoice_number)}
                      </span>
                    </div>
                    {isEditing ? (
                      <Input
                        value={formData.invoice_number}
                        onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                        className="h-9"
                      />
                    ) : (
                      <p className="font-medium text-white">{formData.invoice_number || '-'}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-navy-400">Datum</label>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(confidence.invoice_date)}`}>
                        {getConfidenceLabel(confidence.invoice_date)}
                      </span>
                    </div>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={formData.invoice_date}
                        onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                        className="h-9"
                      />
                    ) : (
                      <p className="font-medium text-white">{formData.invoice_date || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Vendor Info */}
              <div className="bg-navy-700/50 rounded-xl p-4 space-y-3 border border-navy-600">
                <div className="flex items-center gap-2 text-sm font-medium text-navy-300">
                  <Building size={16} className="text-teal-400" />
                  Dobavljac
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-navy-400">Naziv</label>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(confidence.vendor_name)}`}>
                      {getConfidenceLabel(confidence.vendor_name)}
                    </span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={formData.vendor_name}
                      onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                      className="h-9"
                    />
                  ) : (
                    <p className="font-medium text-white">{formData.vendor_name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-navy-400 mb-1 block">Adresa</label>
                  {isEditing ? (
                    <Input
                      value={formData.vendor_address}
                      onChange={(e) => handleInputChange('vendor_address', e.target.value)}
                      className="h-9"
                    />
                  ) : (
                    <p className="text-sm text-navy-300">{formData.vendor_address || '-'}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-navy-400">PIB</label>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(confidence.vendor_tax_id)}`}>
                      {getConfidenceLabel(confidence.vendor_tax_id)}
                    </span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={formData.vendor_tax_id}
                      onChange={(e) => handleInputChange('vendor_tax_id', e.target.value)}
                      className="h-9"
                    />
                  ) : (
                    <p className="font-medium text-white">{formData.vendor_tax_id || '-'}</p>
                  )}
                </div>
              </div>

              {/* Amounts */}
              <div className="bg-navy-700/50 rounded-xl p-4 space-y-3 border border-navy-600">
                <div className="flex items-center gap-2 text-sm font-medium text-navy-300">
                  <DollarSign size={16} className="text-teal-400" />
                  Iznosi
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-navy-400 mb-1 block">Osnovica</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.subtotal}
                        onChange={(e) => handleInputChange('subtotal', e.target.value)}
                        className="h-9"
                      />
                    ) : (
                      <p className="font-medium text-white">{formatCurrency(Number(formData.subtotal))}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-navy-400 mb-1 block">PDV ({formData.tax_rate}%)</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.tax_amount}
                        onChange={(e) => handleInputChange('tax_amount', e.target.value)}
                        className="h-9"
                      />
                    ) : (
                      <p className="font-medium text-white">{formatCurrency(Number(formData.tax_amount))}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-navy-400">Ukupno</label>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(confidence.total_amount)}`}>
                        {getConfidenceLabel(confidence.total_amount)}
                      </span>
                    </div>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.total_amount}
                        onChange={(e) => handleInputChange('total_amount', e.target.value)}
                        className="h-9"
                      />
                    ) : (
                      <p className="text-lg font-bold text-teal-400">
                        {formatCurrency(Number(formData.total_amount))}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items Preview */}
              {lineItems.length > 0 && (
                <div className="bg-navy-700/50 rounded-xl p-4 border border-navy-600">
                  <p className="text-sm font-medium text-navy-300 mb-2">
                    Stavke ({lineItems.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {lineItems.slice(0, 5).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-navy-300 truncate flex-1">
                          {item.description || `Stavka ${idx + 1}`}
                        </span>
                        <span className="font-medium text-white ml-2">
                          {formatCurrency(item.amount || 0)}
                        </span>
                      </div>
                    ))}
                    {lineItems.length > 5 && (
                      <p className="text-xs text-navy-500">
                        + {lineItems.length - 5} vise stavki
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-navy-700 bg-navy-900/50">
          <Button variant="outline" onClick={onClose}>
            Zatvori
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
            >
              Vidi detalje
            </Button>
            <Button
              onClick={handleConfirm}
              loading={isSaving}
              disabled={isEditing}
            >
              <CheckCircle size={16} className="mr-2" />
              Potvrdi podatke
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
