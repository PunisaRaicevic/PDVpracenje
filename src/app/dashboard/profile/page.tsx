'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { User, Mail, Save, Lock, Eye, EyeOff, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
  })

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Get profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        setFormData({
          email: user.email || '',
          full_name: profile?.full_name || '',
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niste prijavljeni')

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: formData.full_name })
        .eq('id', user.id)

      if (profileError) throw profileError

      toast.success('Profil uspjesno azuriran')
    } catch (error: any) {
      toast.error(error.message || 'Greska pri cuvanju')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Lozinke se ne podudaraju')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Lozinka mora imati najmanje 6 karaktera')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      toast.success('Lozinka uspjesno promijenjena')
      setShowPasswordForm(false)
      setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      toast.error(error.message || 'Greska pri promjeni lozinke')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center border border-navy-600">
          <User className="text-teal-400" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Moj profil</h1>
          <p className="text-navy-400">Upravljajte vasim podacima</p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-navy-800/60 backdrop-blur-sm border border-navy-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Osnovni podaci</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-1">
              Email adresa
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={18} />
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full pl-10 pr-4 py-2.5 bg-navy-900/50 border border-navy-700 rounded-lg text-navy-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-navy-500 mt-1">
              Email adresa se ne moze mijenjati
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-1">
              Ime i prezime
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={18} />
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Vase ime i prezime"
                className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button type="submit" loading={saving} disabled={saving}>
              <Save size={16} className="mr-2" />
              Sacuvaj promjene
            </Button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-navy-800/60 backdrop-blur-sm border border-navy-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="text-teal-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Sigurnost</h2>
          </div>
          {!showPasswordForm && (
            <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
              Promijeni lozinku
            </Button>
          )}
        </div>

        {showPasswordForm ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">
                Nova lozinka
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Unesite novu lozinku"
                  className="w-full pl-10 pr-12 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">
                Potvrdite lozinku
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Ponovite novu lozinku"
                  className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordForm(false)
                  setPasswordData({ newPassword: '', confirmPassword: '' })
                }}
              >
                Otkazi
              </Button>
              <Button type="submit" loading={changingPassword}>
                <Lock size={16} className="mr-2" />
                Promijeni lozinku
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-navy-400">
            Preporucujemo redovnu promjenu lozinke radi sigurnosti vaseg racuna.
          </p>
        )}
      </div>
    </div>
  )
}
