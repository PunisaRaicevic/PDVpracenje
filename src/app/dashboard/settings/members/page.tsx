'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { Button } from '@/components/ui/button'
import { Users, UserPlus, Mail, Shield, ShieldCheck, Trash2, X, User, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

interface Member {
  id: string
  user_id: string
  role: 'owner' | 'employee'
  created_at: string
  user: {
    email: string
    full_name: string | null
  }
}

export default function TeamMembersPage() {
  const supabase = createClient()
  const { currentOrganization, isOwner } = useOrganization()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteRole, setInviteRole] = useState<'employee' | 'owner'>('employee')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [currentOrganization?.id])

  const loadMembers = async () => {
    if (!currentOrganization?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            full_name
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get user emails from auth (we need to do this separately)
      const { data: { user } } = await supabase.auth.getUser()

      const membersWithEmail = (data || []).map((m: any) => ({
        ...m,
        user: {
          email: m.user_id === user?.id ? user?.email : 'korisnik@email.com',
          full_name: m.profiles?.full_name || null
        }
      }))

      setMembers(membersWithEmail)
    } catch (error: any) {
      toast.error('Greska pri ucitavanju clanova')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      // For now, just show a message that invitations are coming soon
      toast.success(`Pozivnica za ${inviteName || inviteEmail} ce biti poslana (funkcionalnost u izradi)`)
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteName('')
      setInvitePhone('')
    } catch (error: any) {
      toast.error(error.message || 'Greska pri slanju pozivnice')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (member: Member) => {
    if (member.role === 'owner') {
      toast.error('Ne mozete ukloniti vlasnika')
      return
    }

    if (!confirm(`Da li ste sigurni da zelite ukloniti ovog clana?`)) return

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', member.id)

      if (error) throw error

      toast.success('Clan uspjesno uklonjen')
      loadMembers()
    } catch (error: any) {
      toast.error(error.message || 'Greska pri uklanjanju clana')
    }
  }

  const getRoleIcon = (role: string) => {
    return role === 'owner' ? (
      <ShieldCheck className="text-yellow-400" size={16} />
    ) : (
      <Shield className="text-teal-400" size={16} />
    )
  }

  const getRoleLabel = (role: string) => {
    return role === 'owner' ? 'Vlasnik' : 'Clan'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center border border-navy-600">
            <Users className="text-teal-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Clanovi tima</h1>
            <p className="text-navy-400">Upravljajte clanovima vase organizacije</p>
          </div>
        </div>

        {isOwner && (
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus size={16} className="mr-2" />
            Pozovi clana
          </Button>
        )}
      </div>

      {/* Members List */}
      <div className="bg-navy-800/60 backdrop-blur-sm border border-navy-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-navy-600 mb-4" size={48} />
            <p className="text-navy-400">Nema clanova</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-700">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 hover:bg-navy-700/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-navy-700 rounded-full flex items-center justify-center border border-navy-600">
                    <span className="text-white font-medium">
                      {(member.user.full_name || member.user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {member.user.full_name || 'Nepoznato ime'}
                    </p>
                    <p className="text-sm text-navy-400">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-navy-700 rounded-full">
                    {getRoleIcon(member.role)}
                    <span className="text-sm text-navy-300">{getRoleLabel(member.role)}</span>
                  </div>

                  {isOwner && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      className="p-2 text-navy-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-navy-800 rounded-xl shadow-xl max-w-md w-full mx-4 border border-navy-700">
            <div className="flex items-center justify-between p-4 border-b border-navy-700">
              <h2 className="text-lg font-semibold text-white">Pozovi novog clana</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-navy-700 rounded-lg transition-colors text-navy-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">
                  Ime i prezime
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={18} />
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Ime Prezime"
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">
                  Email adresa *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={18} />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@primjer.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">
                  Broj telefona
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={18} />
                  <input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="+382 XX XXX XXX"
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">
                  Uloga
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'employee' | 'owner')}
                  className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="employee">Clan (moze uploadati fakture)</option>
                  <option value="owner">Vlasnik (puni pristup)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                >
                  Otkazi
                </Button>
                <Button type="submit" loading={inviting} className="flex-1">
                  <Mail size={16} className="mr-2" />
                  Posalji poziv
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
