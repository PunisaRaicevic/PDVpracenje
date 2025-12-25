'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { useSingleInvoiceRealtime, Invoice } from '@/hooks/use-invoice-realtime'
import { ConfirmationModal } from '@/components/invoices/confirmation-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  FolderKanban,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt
} from 'lucide-react'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'awaiting_confirmation' | 'success' | 'error'
type InvoiceType = 'incoming' | 'outgoing' | null

interface UploadedFile {
  file: File
  preview: string
}

interface Project {
  id: string
  name: string
  code: string | null
  color: string
}

export default function UploadPage() {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(null)
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [isGeneralExpense, setIsGeneralExpense] = useState(false)
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null)
  const [processedInvoice, setProcessedInvoice] = useState<Invoice | null>(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { currentOrganization } = useOrganization()

  // Subscribe to realtime updates for the current invoice
  useSingleInvoiceRealtime({
    invoiceId: currentInvoiceId,
    enabled: status === 'processing',
    onUpdate: (invoice) => {
      console.log('Invoice update received:', invoice.status)
      if (invoice.status === 'processed' && invoice.requires_confirmation) {
        setProcessedInvoice(invoice)
        setStatus('awaiting_confirmation')
        setMessage('Faktura obradena. Pregledajte podatke.')
        setShowConfirmationModal(true)
      } else if (invoice.status === 'error') {
        setStatus('error')
        setMessage(invoice.notes || 'Greska pri obradi fakture')
      }
    },
  })

  // Load projects for the current organization
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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type)) {
      setMessage('Dozvoljeni formati: PDF, JPG, PNG')
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage('Maksimalna velicina fajla je 10MB')
      return false
    }
    return true
  }

  const handleFile = (file: File) => {
    if (!validateFile(file)) return

    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : ''

    setSelectedFile({ file, preview })
    setMessage('')
    setStatus('idle')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview)
    }
    setSelectedFile(null)
    setStatus('idle')
    setMessage('')
    setSelectedProjectId('')
    setIsGeneralExpense(false)
  }

  const resetAll = () => {
    removeFile()
    setInvoiceType(null)
  }

  const uploadFile = async () => {
    if (!selectedFile || !invoiceType) return

    setStatus('uploading')
    setMessage('Upload u toku...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niste prijavljeni')

      // 1. Upload to Supabase Storage
      const fileExt = selectedFile.file.name.split('.').pop()
      const fileName = `${currentOrganization?.id}/${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, selectedFile.file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName)

      setStatus('processing')
      setMessage('Obrada fakture u toku... Sacekajte.')

      // 2. Send to API route (handles pre-create + n8n)
      const apiFormData = new FormData()
      apiFormData.append('file', selectedFile.file)
      apiFormData.append('file_url', publicUrl)
      apiFormData.append('filename', selectedFile.file.name)
      apiFormData.append('invoice_type', invoiceType)
      if (selectedProjectId) {
        apiFormData.append('project_id', selectedProjectId)
      }
      apiFormData.append('is_general_expense', isGeneralExpense.toString())

      const apiResponse = await fetch('/api/upload', {
        method: 'POST',
        body: apiFormData,
      })

      const result = await apiResponse.json()

      if (!apiResponse.ok) {
        throw new Error(result.error || 'Greska pri obradi')
      }

      // Store the invoice ID to subscribe to realtime updates
      setCurrentInvoiceId(result.invoice_id)
      setMessage('Obrada u toku... AI analizira fakturu.')

    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'Greska pri uploadu')
    }
  }

  const handleConfirmationComplete = (confirmed: boolean) => {
    setShowConfirmationModal(false)
    if (confirmed) {
      setStatus('success')
      setMessage('Faktura potvrdena!')
      setTimeout(() => {
        router.push('/dashboard/invoices')
      }, 1500)
    } else {
      // User cancelled, allow them to retry or go to invoices
      setStatus('idle')
      setMessage('')
      setSelectedFile(null)
      setCurrentInvoiceId(null)
      setProcessedInvoice(null)
    }
  }

  // Step 1: Select invoice type
  if (!invoiceType) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Upload fakture</h1>
          <p className="text-navy-400">Odaberite tip fakture koju zelite da uploadujete</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incoming Invoice */}
          <button
            onClick={() => setInvoiceType('incoming')}
            className="group relative p-6 bg-navy-800/60 border-2 border-navy-600 rounded-xl hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                <ArrowDownCircle className="text-red-400" size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors">
                  Ulazna faktura
                </h3>
                <p className="text-sm text-navy-400 mt-1">
                  Faktura koju ste primili od dobavljaca i koju trebate platiti
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                  <Receipt size={14} />
                  <span>Ulazni PDV (mozete odbiti)</span>
                </div>
              </div>
            </div>
          </button>

          {/* Outgoing Invoice */}
          <button
            onClick={() => setInvoiceType('outgoing')}
            className="group relative p-6 bg-navy-800/60 border-2 border-navy-600 rounded-xl hover:border-lime-500/50 hover:shadow-lg hover:shadow-lime-500/10 transition-all text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-lime-500/20 rounded-xl flex items-center justify-center group-hover:bg-lime-500/30 transition-colors">
                <ArrowUpCircle className="text-lime-400" size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white group-hover:text-lime-400 transition-colors">
                  Izlazna faktura
                </h3>
                <p className="text-sm text-navy-400 mt-1">
                  Faktura koju ste izdali kupcu i za koju ocekujete uplatu
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-lime-400">
                  <Receipt size={14} />
                  <span>Izlazni PDV (dugujete drzavi)</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Info box */}
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4">
          <h4 className="font-medium text-teal-300 mb-2">Zasto je ovo vazno?</h4>
          <p className="text-sm text-teal-400/80">
            Razlikovanje ulaznih i izlaznih faktura omogucava pracenje PDV-a.
            Na kraju mjeseca mozete vidjeti koliko PDV-a ste naplatili (izlazni)
            i koliko mozete odbiti (ulazni), te izracunati obavezu prema drzavi.
          </p>
        </div>
      </div>
    )
  }

  // Step 2: Upload file
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetAll}
              className="p-2 hover:bg-navy-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-navy-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {invoiceType === 'incoming' ? 'Ulazna faktura' : 'Izlazna faktura'}
              </h1>
              <p className="text-navy-400">
                {invoiceType === 'incoming'
                  ? 'Faktura od dobavljaca'
                  : 'Faktura koju ste izdali kupcu'}
              </p>
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          invoiceType === 'incoming'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
        }`}>
          {invoiceType === 'incoming' ? 'Ulazni PDV' : 'Izlazni PDV'}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Odaberite fajl</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? invoiceType === 'incoming'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-lime-500 bg-lime-500/10'
                  : 'border-navy-600 hover:border-navy-500 bg-navy-800/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-navy-500" />
              <p className="mt-4 text-lg font-medium text-white">
                Prevucite fajl ovdje
              </p>
              <p className="mt-1 text-sm text-navy-400">ili</p>
              <label className="mt-4 inline-block">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleInputChange}
                />
                <span className={`cursor-pointer inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors ${
                  invoiceType === 'incoming'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-lime-600 hover:bg-lime-500 text-navy-900'
                }`}>
                  Odaberite fajl
                </span>
              </label>
              <p className="mt-4 text-xs text-navy-500">
                PDF, JPG ili PNG do 10MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File preview */}
              <div className="flex items-center gap-4 p-4 bg-navy-700/50 border border-navy-600 rounded-xl">
                {selectedFile.preview ? (
                  <img
                    src={selectedFile.preview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="text-red-400" size={32} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-white">{selectedFile.file.name}</p>
                  <p className="text-sm text-navy-400">
                    {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {status === 'idle' && (
                  <button
                    onClick={removeFile}
                    className="p-2 hover:bg-navy-600 rounded-full transition-colors"
                  >
                    <X size={20} className="text-navy-400" />
                  </button>
                )}
              </div>

              {/* Project selection (only for incoming invoices) */}
              {status === 'idle' && invoiceType === 'incoming' && (
                <div className="space-y-4 p-4 bg-navy-700/50 border border-navy-600 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-2">
                      <FolderKanban size={16} className="inline mr-2" />
                      Projekat (opciono)
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value)
                        if (e.target.value) {
                          setIsGeneralExpense(false)
                        }
                      }}
                      disabled={isGeneralExpense}
                      className="w-full px-4 py-2.5 bg-navy-800 border border-navy-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-navy-900 disabled:text-navy-500"
                    >
                      <option value="">-- Bez projekta --</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code ? `[${project.code}] ` : ''}{project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="generalExpense"
                      checked={isGeneralExpense}
                      onChange={(e) => {
                        setIsGeneralExpense(e.target.checked)
                        if (e.target.checked) {
                          setSelectedProjectId('')
                        }
                      }}
                      className="w-4 h-4 text-teal-500 bg-navy-800 border-navy-600 rounded focus:ring-teal-500"
                    />
                    <label htmlFor="generalExpense" className="text-sm text-navy-300">
                      Opsti trosak (nije vezan za projekat)
                    </label>
                  </div>
                </div>
              )}

              {/* Status message */}
              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl ${
                    status === 'error'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : status === 'success'
                      ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30'
                      : status === 'awaiting_confirmation'
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                      : 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                  }`}
                >
                  {status === 'success' ? (
                    <CheckCircle size={20} />
                  ) : status === 'error' ? (
                    <AlertCircle size={20} />
                  ) : status === 'awaiting_confirmation' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                  )}
                  {message}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={uploadFile}
                  disabled={status !== 'idle'}
                  loading={status === 'uploading' || status === 'processing'}
                  className={`flex-1 ${
                    invoiceType === 'incoming'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-navy-900'
                  }`}
                >
                  <Upload size={16} className="mr-2" />
                  Upload i obradi
                </Button>
                {status === 'idle' && (
                  <Button variant="secondary" onClick={removeFile}>
                    Otkazi
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing info */}
      {(status === 'processing' || status === 'awaiting_confirmation') && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {status === 'processing' ? (
                <>
                  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                    invoiceType === 'incoming' ? 'border-red-500' : 'border-lime-500'
                  }`} />
                  <div>
                    <p className="font-medium text-white">AI obrada u toku</p>
                    <p className="text-sm text-navy-400">
                      Ekstrahujemo podatke sa fakture...
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className={`h-8 w-8 ${
                    invoiceType === 'incoming' ? 'text-red-400' : 'text-lime-400'
                  }`} />
                  <div>
                    <p className="font-medium text-white">Obrada zavrsena</p>
                    <p className="text-sm text-navy-400">
                      Pregledajte i potvrdite ekstrahovane podatke
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && processedInvoice && (
        <ConfirmationModal
          invoice={processedInvoice}
          isOpen={showConfirmationModal}
          onClose={() => handleConfirmationComplete(false)}
          onConfirmed={() => handleConfirmationComplete(true)}
        />
      )}
    </div>
  )
}
