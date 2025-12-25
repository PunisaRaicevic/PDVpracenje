'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { format, subDays } from 'date-fns'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { DateRangePicker } from '@/components/reports/date-range-picker'
import { ReportCard } from '@/components/reports/report-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, FileSpreadsheet, Download, Plus, FolderKanban } from 'lucide-react'

interface Report {
  id: string
  name: string
  type: 'pdf' | 'excel' | 'csv'
  date_from: string
  date_to: string
  status: 'pending' | 'generating' | 'completed' | 'error'
  file_url: string | null
  created_at: string
  project?: {
    name: string
    code: string | null
  } | null
}

interface Project {
  id: string
  name: string
  code: string | null
}

export default function ReportsPage() {
  const supabase = createClient()
  const { currentOrganization } = useOrganization()

  const [reports, setReports] = useState<Report[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Form state
  const [reportName, setReportName] = useState('')
  const [reportType, setReportType] = useState<'pdf' | 'excel' | 'csv'>('excel')
  const [startDate, setStartDate] = useState(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState(new Date())
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Load reports and projects
  useEffect(() => {
    async function loadData() {
      if (!currentOrganization?.id) return

      setLoading(true)

      // Load reports
      const { data: reportsData } = await fetch('/api/reports').then((r) => r.json())
      if (reportsData) {
        setReports(reportsData)
      }

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, code')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name')

      if (projectsData) {
        setProjects(projectsData)
      }

      setLoading(false)
    }

    loadData()
  }, [currentOrganization?.id, supabase])

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
  }

  const handleGenerateReport = async () => {
    if (!reportName.trim()) {
      toast.error('Unesite naziv izvjestaja')
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName,
          type: reportType,
          date_from: format(startDate, 'yyyy-MM-dd'),
          date_to: format(endDate, 'yyyy-MM-dd'),
          project_id: selectedProjectId || null,
          status_filter: statusFilter,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Greska pri generisanju')
      }

      toast.success('Izvjestaj uspjesno generisan!')
      setReports((prev) => [result.report, ...prev])
      setReportName('')
    } catch (error: any) {
      toast.error(error.message || 'Greska pri generisanju izvjestaja')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = (report: Report) => {
    if (report.file_url) {
      window.open(report.file_url, '_blank')
    }
  }

  const handleDelete = async (report: Report) => {
    if (!confirm('Da li ste sigurni da zelite obrisati ovaj izvjestaj?')) {
      return
    }

    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      toast.success('Izvjestaj obrisan')
      setReports((prev) => prev.filter((r) => r.id !== report.id))
    } catch (error) {
      toast.error('Greska pri brisanju izvjestaja')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Izvjestaji</h1>
        <p className="text-navy-400">Generisi izvjestaje o fakturama</p>
      </div>

      {/* Generate Report Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Plus size={20} className="text-teal-400" />
            Novi izvjestaj
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report Name */}
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-2">
              Naziv izvjestaja
            </label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="npr. Mjesecni izvjestaj - Decembar 2024"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-2">
              Period
            </label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-2">
                Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setReportType('excel')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    reportType === 'excel'
                      ? 'bg-lime-500/20 border-lime-500 text-lime-400'
                      : 'border-navy-600 text-navy-300 hover:bg-navy-700'
                  }`}
                >
                  <FileSpreadsheet size={18} />
                  Excel
                </button>
                <button
                  onClick={() => setReportType('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    reportType === 'csv'
                      ? 'bg-teal-500/20 border-teal-500 text-teal-400'
                      : 'border-navy-600 text-navy-300 hover:bg-navy-700'
                  }`}
                >
                  <FileText size={18} />
                  CSV
                </button>
                <button
                  onClick={() => setReportType('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    reportType === 'pdf'
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'border-navy-600 text-navy-300 hover:bg-navy-700'
                  }`}
                >
                  <FileText size={18} />
                  PDF
                </button>
              </div>
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-2">
                <FolderKanban size={16} className="inline mr-1 text-teal-400" />
                Projekat
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Svi projekti</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code ? `[${project.code}] ` : ''}{project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-2">
                Status faktura
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">Sve</option>
                <option value="confirmed">Potvrdene</option>
                <option value="processed">Obradene</option>
                <option value="sent_to_accountant">Poslane racunovodji</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleGenerateReport}
              loading={generating}
              disabled={generating || !reportName.trim()}
            >
              <Download size={16} className="mr-2" />
              Generisi izvjestaj
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Generisani izvjestaji</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-navy-400 py-8">
              Nemate generisanih izvjestaja. Kreirajte prvi izvjestaj iznad.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
