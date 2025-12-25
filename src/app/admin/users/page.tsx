'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, UserPlus, Mail, Shield, User } from 'lucide-react'

interface Profile {
  id: string
  full_name: string | null
  company_name: string | null
  role: string
  created_at: string
}

interface UserWithEmail extends Profile {
  email?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    setUsers(data || [])
    setLoading(false)
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      // Call API route to create user (needs service role key)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newName,
          role: newRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Greška pri kreiranju korisnika')
      }

      setMessage('Korisnik uspješno kreiran')
      setShowAddForm(false)
      setNewEmail('')
      setNewPassword('')
      setNewName('')
      setNewRole('user')
      loadUsers()
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Korisnici</h1>
          <p className="text-gray-500">Upravljanje korisničkim nalozima</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus size={16} className="mr-2" />
          Dodaj korisnika
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Novi korisnik</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="korisnik@email.com"
                  required
                />
                <Input
                  id="password"
                  label="Lozinka"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimalno 6 karaktera"
                  minLength={6}
                  required
                />
                <Input
                  id="name"
                  label="Puno ime"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ime i prezime"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uloga
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="user">Korisnik</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg ${
                    message.includes('uspješno')
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" loading={saving}>
                  Kreiraj korisnika
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Otkaži
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Mobile Card View */}
      <div className="space-y-3 lg:hidden">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-primary-600" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {user.full_name || 'Bez imena'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email || user.id.slice(0, 8)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.role === 'admin' ? (
                        <Shield size={12} />
                      ) : (
                        <User size={12} />
                      )}
                      {user.role === 'admin' ? 'Admin' : 'Korisnik'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {user.company_name || 'Bez firme'}
                    </span>
                    <span className="text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('sr-Latn')}
                    </span>
                  </div>
                </div>
              </div>
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
                    Firma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Uloga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Datum kreiranja
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="text-primary-600" size={20} />
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || 'Bez imena'}</p>
                          <p className="text-sm text-gray-500">{user.email || user.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.company_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role === 'admin' ? (
                          <Shield size={12} />
                        ) : (
                          <User size={12} />
                        )}
                        {user.role === 'admin' ? 'Admin' : 'Korisnik'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('sr-Latn')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
