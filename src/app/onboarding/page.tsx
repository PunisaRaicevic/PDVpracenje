'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, ArrowRight, ArrowLeft, Check, MapPin, Phone, FileText } from 'lucide-react'

interface CompanyData {
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  pib: string
  pdvNumber: string
  isPdvRegistered: boolean
  ownerName: string
  accountantEmail: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Crna Gora',
    phone: '',
    email: '',
    pib: '',
    pdvNumber: '',
    isPdvRegistered: false,
    ownerName: '',
    accountantEmail: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const updateField = (field: keyof CompanyData, value: string | boolean) => {
    setCompanyData(prev => ({ ...prev, [field]: value }))
  }

  // Generate slug from company name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }

  const validateStep1 = () => {
    if (!companyData.name.trim()) {
      setError('Unesite naziv firme')
      return false
    }
    if (!companyData.pib.trim()) {
      setError('Unesite PIB')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!companyData.address.trim()) {
      setError('Unesite adresu')
      return false
    }
    if (!companyData.city.trim()) {
      setError('Unesite grad')
      return false
    }
    return true
  }

  const handleNextStep = () => {
    setError('')
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handlePrevStep = () => {
    setError('')
    setStep(prev => prev - 1)
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Niste prijavljeni')
        router.push('/login')
        return
      }

      // Generate unique slug
      let slug = generateSlug(companyData.name)
      let slugSuffix = 0

      // Check if slug exists
      while (true) {
        const testSlug = slugSuffix === 0 ? slug : `${slug}-${slugSuffix}`
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', testSlug)
          .single()

        if (!existing) {
          slug = testSlug
          break
        }
        slugSuffix++
      }

      // Create organization with all details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: companyData.name.trim(),
          slug,
          address: companyData.address.trim() || null,
          city: companyData.city.trim() || null,
          postal_code: companyData.postalCode.trim() || null,
          country: companyData.country.trim() || 'Crna Gora',
          phone: companyData.phone.trim() || null,
          email: companyData.email.trim() || null,
          pib: companyData.pib.trim() || null,
          pdv_number: companyData.pdvNumber.trim() || null,
          is_pdv_registered: companyData.isPdvRegistered,
          owner_name: companyData.ownerName.trim() || null,
          accountant_email: companyData.accountantEmail.trim() || null,
        })
        .select()
        .single()

      if (orgError) {
        console.error('Org creation error:', orgError)
        setError('Greska pri kreiranju firme: ' + orgError.message)
        return
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
        })

      if (memberError) {
        console.error('Member creation error:', memberError)
        // Try to delete the org
        await supabase.from('organizations').delete().eq('id', org.id)
        setError('Greska pri dodavanju korisnika')
        return
      }

      // Update profile with current organization
      await supabase
        .from('profiles')
        .update({ current_organization_id: org.id })
        .eq('id', user.id)

      // Success! Go to final step
      setStep(4)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Doslo je do greske')
    } finally {
      setIsLoading(false)
    }
  }

  const totalSteps = 4

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step > s ? 'bg-green-500 text-white' :
                step === s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <Check size={18} /> : s}
              </div>
              {i < 3 && (
                <div className={`w-12 lg:w-16 h-1 transition-colors ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-primary-600" />
              </div>
              <CardTitle className="text-2xl">Osnovni podaci</CardTitle>
              <p className="text-gray-500 mt-2">
                Unesite osnovne informacije o vasoj firmi
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="Naziv firme *"
                  type="text"
                  placeholder="npr. A.C.E. Engineer d.o.o."
                  value={companyData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />

                <Input
                  label="PIB (Poreski identifikacioni broj) *"
                  type="text"
                  placeholder="npr. 03635520"
                  value={companyData.pib}
                  onChange={(e) => updateField('pib', e.target.value)}
                  required
                />

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={companyData.isPdvRegistered}
                      onChange={(e) => updateField('isPdvRegistered', e.target.checked)}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Firma je u sistemu PDV-a</span>
                  </label>
                </div>

                {companyData.isPdvRegistered && (
                  <Input
                    label="PDV registracioni broj"
                    type="text"
                    placeholder="npr. 30/31-09100-3"
                    value={companyData.pdvNumber}
                    onChange={(e) => updateField('pdvNumber', e.target.value)}
                  />
                )}

                <Input
                  label="Ime vlasnika / direktora"
                  type="text"
                  placeholder="npr. Punisa Raicevic"
                  value={companyData.ownerName}
                  onChange={(e) => updateField('ownerName', e.target.value)}
                />

                <Button onClick={handleNextStep} className="w-full">
                  Dalje
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Address */}
        {step === 2 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Adresa i kontakt</CardTitle>
              <p className="text-gray-500 mt-2">
                Unesite adresu i kontakt informacije
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="Adresa *"
                  type="text"
                  placeholder="npr. Dubovica 2"
                  value={companyData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Postanski broj"
                    type="text"
                    placeholder="npr. 85310"
                    value={companyData.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                  />
                  <Input
                    label="Grad *"
                    type="text"
                    placeholder="npr. Budva"
                    value={companyData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Drzava"
                  type="text"
                  placeholder="Crna Gora"
                  value={companyData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                />

                <Input
                  label="Telefon"
                  type="tel"
                  placeholder="npr. +382 68 831 305"
                  value={companyData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />

                <Input
                  label="Email firme"
                  type="email"
                  placeholder="npr. info@aceengineer.me"
                  value={companyData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                    <ArrowLeft size={16} className="mr-2" />
                    Nazad
                  </Button>
                  <Button onClick={handleNextStep} className="flex-1">
                    Dalje
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Additional Info */}
        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">Dodatne informacije</CardTitle>
              <p className="text-gray-500 mt-2">
                Opciono - mozete dodati kasnije
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="Email racunovodje"
                  type="email"
                  placeholder="racunovodja@email.com"
                  value={companyData.accountantEmail}
                  onChange={(e) => updateField('accountantEmail', e.target.value)}
                />
                <p className="text-xs text-gray-500 -mt-2">
                  Na ovu adresu cemo slati izvjestaje
                </p>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Pregled podataka:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Naziv:</span>
                      <span className="font-medium">{companyData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">PIB:</span>
                      <span className="font-medium">{companyData.pib}</span>
                    </div>
                    {companyData.pdvNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">PDV broj:</span>
                        <span className="font-medium">{companyData.pdvNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Adresa:</span>
                      <span className="font-medium text-right">
                        {companyData.address}, {companyData.postalCode} {companyData.city}
                      </span>
                    </div>
                    {companyData.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Telefon:</span>
                        <span className="font-medium">{companyData.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handlePrevStep} className="flex-1">
                    <ArrowLeft size={16} className="mr-2" />
                    Nazad
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    loading={isLoading}
                  >
                    Kreiraj firmu
                    <Check size={16} className="ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Firma je kreirana!
              </h2>
              <p className="text-gray-500 mb-4">
                Uspjesno ste registrovali <strong>{companyData.name}</strong>
              </p>
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-left mb-6">
                <p><strong>PIB:</strong> {companyData.pib}</p>
                {companyData.pdvNumber && <p><strong>PDV:</strong> {companyData.pdvNumber}</p>}
                <p><strong>Adresa:</strong> {companyData.address}, {companyData.city}</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-primary-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                <span>Preusmeravamo vas na dashboard...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features preview - only on step 1 */}
        {step === 1 && (
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Upload faktura</p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">AI ekstrakcija</p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Izvjestaji</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
