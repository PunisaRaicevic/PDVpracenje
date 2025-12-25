'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { ProjectForm } from '@/components/projects/project-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

interface Project {
  id: string
  name: string
  code: string | null
  description: string | null
  color: string
  is_active: boolean
  created_at: string
  invoice_count: number
  member_ids?: string[]
}

interface ProjectFormData {
  name: string
  code: string
  description: string
  color: string
  member_ids?: string[]
}

interface Member {
  id: string
  user_id: string
  role: 'owner' | 'employee'
  user: {
    email: string
    full_name: string | null
  }
}

export default function ProjectsPage() {
  const supabase = createClient()
  const { currentOrganization } = useOrganization()
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadProjects = async () => {
    if (!currentOrganization?.id) return

    setLoading(true)
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()

      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Greska pri ucitavanju projekata')
    }
    setLoading(false)
  }

  const loadMembers = async () => {
    if (!currentOrganization?.id) return

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            full_name
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      const membersWithEmail = (data || []).map((m: any) => ({
        ...m,
        user: {
          email: m.user_id === user?.id ? user?.email : 'korisnik@email.com',
          full_name: m.profiles?.full_name || null
        }
      }))

      setMembers(membersWithEmail)
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  useEffect(() => {
    loadProjects()
    loadMembers()
  }, [currentOrganization?.id])

  const handleCreateProject = async (projectData: ProjectFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      toast.success('Projekat uspjesno kreiran')
      setShowForm(false)
      loadProjects()
    } catch (error: any) {
      toast.error(error.message || 'Greska pri kreiranju projekta')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateProject = async (projectData: ProjectFormData) => {
    if (!editingProject) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update project')
      }

      toast.success('Projekat uspjesno azuriran')
      setEditingProject(null)
      loadProjects()
    } catch (error: any) {
      toast.error(error.message || 'Greska pri azuriranju projekta')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Da li ste sigurni da zelite da obrisete projekat "${project.name}"?`)) {
      return
    }

    setDeletingId(project.id)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete project')
      }

      if (data.deactivated) {
        toast.success('Projekat deaktiviran (ima fakture)')
      } else {
        toast.success('Projekat uspjesno obrisan')
      }
      loadProjects()
    } catch (error: any) {
      toast.error(error.message || 'Greska pri brisanju projekta')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (project: Project) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !project.is_active }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      toast.success(project.is_active ? 'Projekat deaktiviran' : 'Projekat aktiviran')
      loadProjects()
    } catch (error) {
      toast.error('Greska pri promjeni statusa')
    }
  }

  const filteredProjects = showInactive
    ? projects
    : projects.filter((p) => p.is_active)

  const activeCount = projects.filter((p) => p.is_active).length
  const inactiveCount = projects.filter((p) => !p.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projekti</h1>
          <p className="text-navy-400">Upravljajte projektima za klasifikaciju faktura</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} className="mr-2" />
          Novi projekat
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-navy-300">
          <FolderOpen size={16} className="text-teal-400" />
          <span>{activeCount} aktivnih projekata</span>
        </div>
        {inactiveCount > 0 && (
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors"
          >
            {showInactive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            <span>
              {showInactive ? 'Sakrij' : 'Prikazi'} neaktivne ({inactiveCount})
            </span>
          </button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </CardContent>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-navy-600" />
            <p className="mt-4 text-lg font-medium text-white">
              {showInactive ? 'Nemate projekata' : 'Nemate aktivnih projekata'}
            </p>
            <p className="mt-1 text-navy-400">
              Kreirajte projekat za organizovanje faktura
            </p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              <Plus size={18} className="mr-2" />
              Kreiraj prvi projekat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className={`relative overflow-hidden hover:border-teal-500/50 transition-colors ${
                !project.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: project.color }}
              />

              <CardContent className="p-4 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.code
                        ? project.code.substring(0, 2)
                        : project.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{project.name}</h3>
                      {project.code && (
                        <p className="text-sm text-navy-400">{project.code}</p>
                      )}
                    </div>
                  </div>

                  {!project.is_active && (
                    <span className="text-xs px-2 py-1 bg-navy-700 text-navy-400 rounded-full">
                      Neaktivan
                    </span>
                  )}
                </div>

                {project.description && (
                  <p className="mt-3 text-sm text-navy-300 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-sm text-navy-400">
                  <div className="flex items-center gap-1">
                    <FileText size={14} className="text-teal-400" />
                    <span>{project.invoice_count} faktura</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-navy-700 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(project)}
                    className={`text-sm flex items-center gap-1 transition-colors ${
                      project.is_active
                        ? 'text-navy-400 hover:text-white'
                        : 'text-lime-400 hover:text-lime-300'
                    }`}
                  >
                    {project.is_active ? (
                      <>
                        <ToggleRight size={16} />
                        Deaktiviraj
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={16} />
                        Aktiviraj
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingProject(project)}
                      className="p-2 text-navy-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
                      title="Uredi"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project)}
                      disabled={deletingId === project.id}
                      className="p-2 text-navy-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Obrisi"
                    >
                      {deletingId === project.id ? (
                        <div className="w-4 h-4 border-2 border-navy-600 border-t-teal-400 rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <ProjectForm
          members={members}
          onSubmit={handleCreateProject}
          onCancel={() => setShowForm(false)}
          isLoading={isSubmitting}
        />
      )}

      {/* Edit Form Modal */}
      {editingProject && (
        <ProjectForm
          project={{
            ...editingProject,
            code: editingProject.code || '',
            description: editingProject.description || '',
          }}
          members={members}
          onSubmit={handleUpdateProject}
          onCancel={() => setEditingProject(null)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  )
}
