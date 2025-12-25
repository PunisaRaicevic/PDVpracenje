'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Users, Check } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  role: 'owner' | 'employee'
  user: {
    email: string
    full_name: string | null
  }
}

interface Project {
  id?: string
  name: string
  code: string
  description: string
  color: string
  is_active?: boolean
  member_ids?: string[]
}

interface ProjectFormProps {
  project?: Project
  members?: Member[]
  onSubmit: (data: Omit<Project, 'id'>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const colorOptions = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#ef4444', label: 'Crvena' },
  { value: '#f97316', label: 'Narandzasta' },
  { value: '#eab308', label: 'Zuta' },
  { value: '#22c55e', label: 'Zelena' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#0ea5e9', label: 'Plava' },
  { value: '#64748b', label: 'Siva' },
]

export function ProjectForm({ project, members = [], onSubmit, onCancel, isLoading }: ProjectFormProps) {
  const [name, setName] = useState(project?.name || '')
  const [code, setCode] = useState(project?.code || '')
  const [description, setDescription] = useState(project?.description || '')
  const [color, setColor] = useState(project?.color || '#6366f1')
  const [selectedMembers, setSelectedMembers] = useState<string[]>(project?.member_ids || [])
  const [error, setError] = useState('')

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllMembers = () => {
    setSelectedMembers(members.map((m) => m.user_id))
  }

  const deselectAllMembers = () => {
    setSelectedMembers([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Naziv projekta je obavezan')
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim(),
        description: description.trim(),
        color,
        member_ids: selectedMembers,
      })
    } catch (err: any) {
      setError(err.message || 'Greska pri cuvanju projekta')
    }
  }

  return (
    <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-navy-800 rounded-xl shadow-xl max-w-md w-full mx-4 border border-navy-700">
        <div className="flex items-center justify-between p-4 border-b border-navy-700">
          <h2 className="text-lg font-semibold text-white">
            {project ? 'Uredi projekat' : 'Novi projekat'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-navy-700 rounded-lg transition-colors text-navy-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-1">
              Naziv projekta *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Renovacija stana"
              className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-1">
              Sifra projekta
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="npr. REN-2024"
              maxLength={20}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
            />
            <p className="text-xs text-navy-500 mt-1">
              Kratka oznaka za brzu identifikaciju
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-1">
              Opis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcioni opis projekta..."
              rows={3}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-2">
              Boja
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === opt.value ? 'ring-2 ring-offset-2 ring-offset-navy-800 ring-teal-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Team Members */}
          {members.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-navy-300">
                  <Users size={14} className="inline mr-1" />
                  Clanovi tima koji mogu uploadovati
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllMembers}
                    className="text-xs text-teal-400 hover:text-teal-300"
                  >
                    Odaberi sve
                  </button>
                  <span className="text-navy-600">|</span>
                  <button
                    type="button"
                    onClick={deselectAllMembers}
                    className="text-xs text-navy-400 hover:text-navy-300"
                  >
                    Ponisti
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-navy-900/50 rounded-lg p-2 border border-navy-700">
                {members.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => toggleMember(member.user_id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      selectedMembers.includes(member.user_id)
                        ? 'bg-teal-500/20 border border-teal-500/50'
                        : 'bg-navy-800 border border-navy-600 hover:bg-navy-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-navy-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {(member.user.full_name || member.user.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-white">
                          {member.user.full_name || member.user.email}
                        </p>
                        {member.user.full_name && (
                          <p className="text-xs text-navy-400">{member.user.email}</p>
                        )}
                      </div>
                    </div>
                    {selectedMembers.includes(member.user_id) && (
                      <Check size={16} className="text-teal-400" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-navy-500 mt-1">
                {selectedMembers.length === 0
                  ? 'Svi clanovi mogu uploadovati (nema ogranicenja)'
                  : `Odabrano: ${selectedMembers.length} clanova`}
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="p-3 bg-navy-900/50 rounded-lg border border-navy-700">
            <p className="text-xs text-navy-500 mb-2">Pregled:</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: color }}
              >
                {code ? code.substring(0, 2) : name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-white">{name || 'Naziv projekta'}</p>
                {code && <p className="text-sm text-navy-400">{code}</p>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Otkazi
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              {project ? 'Sacuvaj' : 'Kreiraj'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
