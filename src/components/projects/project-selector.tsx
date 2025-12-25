'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { FolderOpen, ChevronDown, Check, Plus } from 'lucide-react'

interface Project {
  id: string
  name: string
  code: string | null
  color: string
}

interface ProjectSelectorProps {
  value: string | null
  onChange: (projectId: string | null) => void
  disabled?: boolean
  showNone?: boolean
  className?: string
}

export function ProjectSelector({
  value,
  onChange,
  disabled = false,
  showNone = true,
  className = '',
}: ProjectSelectorProps) {
  const supabase = createClient()
  const { currentOrganization } = useOrganization()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    async function loadProjects() {
      if (!currentOrganization?.id) return

      setLoading(true)
      const { data } = await supabase
        .from('projects')
        .select('id, name, code, color')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name')

      if (data) {
        setProjects(data)
      }
      setLoading(false)
    }

    loadProjects()
  }, [currentOrganization?.id, supabase])

  const selectedProject = projects.find((p) => p.id === value)

  const handleSelect = (projectId: string | null) => {
    onChange(projectId)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Ucitavanje...</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'
        }`}
      >
        <div className="flex items-center gap-2">
          {selectedProject ? (
            <>
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: selectedProject.color }}
              />
              <span className="text-sm font-medium">
                {selectedProject.code ? `[${selectedProject.code}] ` : ''}
                {selectedProject.name}
              </span>
            </>
          ) : (
            <>
              <FolderOpen size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">Izaberite projekat</span>
            </>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {showNone && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-200" />
                  <span className="text-gray-500">Bez projekta</span>
                </div>
                {value === null && <Check size={16} className="text-primary-600" />}
              </button>
            )}

            {projects.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-gray-500">Nemate projekata</p>
                <a
                  href="/dashboard/projects"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary-600 hover:underline"
                >
                  <Plus size={14} />
                  Kreiraj projekat
                </a>
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: project.color }}
                    />
                    <span>
                      {project.code ? (
                        <>
                          <span className="text-gray-500">[{project.code}]</span>{' '}
                        </>
                      ) : null}
                      {project.name}
                    </span>
                  </div>
                  {value === project.id && <Check size={16} className="text-primary-600" />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
