'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { Button } from '@/components/ui/button'
import { Settings, Building, Save, Upload, Mail, Phone, MapPin, FileText, Trash2, Image } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const supabase = createClient()
  const { currentOrganization, refreshOrganizations } = useOrganization()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    pib: '',
    pdv_number: '',
    address: '',
    email: '',
    phone: '',
    accountant_email: '',
  })

  useEffect(() => {
    if (currentOrganization) {
      const settings = currentOrganization.settings || {}
      setFormData({
        name: currentOrganization.name || '',
        pib: settings.pib || '',
        pdv_number: settings.pdv_number || '',
        address: settings.address || '',
        email: settings.email || '',
        phone: settings.phone || '',
        accountant_email: currentOrganization.accountant_email || '',
      })
    }
  }, [currentOrganization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrganization?.id) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          accountant_email: formData.accountant_email,
          settings: {
            ...(currentOrganization.settings || {}),
            pib: formData.pib,
            pdv_number: formData.pdv_number,
            address: formData.address,
            email: formData.email,
            phone: formData.phone,
          },
        })
        .eq('id', currentOrganization.id)

      if (error) throw error

      toast.success('Postavke uspjesno sacuvane')
      refreshOrganizations?.()
    } catch (error: any) {
      toast.error(error.message || 'Greska pri cuvanju')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Dozvoljeni formati: PNG, JPG, WEBP')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Maksimalna velicina je 2MB')
      return
    }

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      toast.success('Logo uspjesno uploadovan')
      refreshOrganizations?.()
    } catch (error: any) {
      toast.error(error.message || 'Greska pri uploadu')
    } finally {
      setUploadingLogo(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Da li ste sigurni da zelite ukloniti logo?')) return

    setUploadingLogo(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', currentOrganization?.id)

      if (error) throw error

      toast.success('Logo uklonjen')
      refreshOrganizations?.()
    } catch (error: any) {
      toast.error(error.message || 'Greska pri uklanjanju')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center border border-navy-600">
          <Settings className="text-teal-400" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Podesavanja</h1>
          <p className="text-navy-400">Upravljajte postavkama organizacije</p>
        </div>
      </div>

      {/* Organization Settings */}
      <div className="bg-navy-800/60 backdrop-blur-sm border border-navy-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building className="text-teal-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Podaci o firmi</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Organization Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-navy-300 mb-1">
                Naziv firme *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Naziv vase firme"
                required
              />
            </div>

            {/* PIB */}
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">
                <FileText size={14} className="inline mr-1" />
                PIB (Poreski identifikacioni broj)
              </label>
              <input
                type="text"
                value={formData.pib}
                onChange={(e) => setFormData({ ...formData, pib: e.target.value })}
                className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="123456789"
                maxLength={15}
              />
            </div>

            {/* PDV Number */}
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">
                <FileText size={14} className="inline mr-1" />
                PDV broj
              </label>
              <input
                type="text"
                value={formData.pdv_number}
                onChange={(e) => setFormData({ ...formData, pdv_number: e.target.value })}
                className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="ME12345678"
                maxLength={20}
              />
            </div>
          </div>

          {/* Contact Info Section */}
          <div className="border-t border-navy-700 pt-6">
            <h3 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-4">
              Kontakt informacije
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-navy-300 mb-1">
                  <MapPin size={14} className="inline mr-1" />
                  Adresa
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Ulica i broj, Grad, Postanski broj"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">
                  <Mail size={14} className="inline mr-1" />
                  Email firme
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="info@firma.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">
                  <Phone size={14} className="inline mr-1" />
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="+382 XX XXX XXX"
                />
              </div>
            </div>
          </div>

          {/* Accountant Section */}
          <div className="border-t border-navy-700 pt-6">
            <h3 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-4">
              Racunovodstvo
            </h3>
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">
                <Mail size={14} className="inline mr-1" />
                Email racunovodje
              </label>
              <input
                type="email"
                value={formData.accountant_email}
                onChange={(e) => setFormData({ ...formData, accountant_email: e.target.value })}
                className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="racunovodja@email.com"
              />
              <p className="text-xs text-navy-500 mt-1">
                Na ovu adresu ce se slati fakture za knjizenje
              </p>
            </div>
          </div>

          {/* Logo Upload Section */}
          <div className="border-t border-navy-700 pt-6">
            <h3 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-4">
              Branding
            </h3>
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-2">
                Logo firme
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-navy-700 rounded-xl flex items-center justify-center border-2 border-dashed border-navy-600 overflow-hidden">
                  {currentOrganization?.logo_url ? (
                    <img
                      src={currentOrganization.logo_url}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Image className="text-navy-500 mx-auto mb-1" size={24} />
                      <p className="text-xs text-navy-500">Bez loga</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploadingLogo}
                    disabled={uploadingLogo}
                  >
                    <Upload size={16} className="mr-2" />
                    {currentOrganization?.logo_url ? 'Promijeni logo' : 'Upload logo'}
                  </Button>
                  {currentOrganization?.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Ukloni logo
                    </Button>
                  )}
                  <p className="text-xs text-navy-500">
                    PNG, JPG, WEBP do 2MB. Preporucena velicina 200x200px
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-navy-700 pt-6">
            <Button type="submit" loading={loading} disabled={loading}>
              <Save size={16} className="mr-2" />
              Sacuvaj promjene
            </Button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Opasna zona</h3>
        <p className="text-sm text-red-300/70 mb-4">
          Brisanje organizacije ce trajno ukloniti sve podatke, fakture i clanove.
        </p>
        <Button variant="danger" disabled>
          Obrisi organizaciju (uskoro)
        </Button>
      </div>
    </div>
  )
}
