'use client'

import { format } from 'date-fns'
import { FileText, FileSpreadsheet, Download, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface ReportCardProps {
  report: Report
  onDownload: (report: Report) => void
  onDelete: (report: Report) => void
}

const typeIcons = {
  pdf: <FileText className="text-red-400" size={24} />,
  excel: <FileSpreadsheet className="text-lime-400" size={24} />,
  csv: <FileText className="text-teal-400" size={24} />,
}

const typeLabels = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
}

const statusConfig = {
  pending: { icon: <Clock className="text-navy-400" size={16} />, label: 'Na cekanju', color: 'text-navy-400' },
  generating: { icon: <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500" />, label: 'Generisanje...', color: 'text-teal-400' },
  completed: { icon: <CheckCircle className="text-lime-400" size={16} />, label: 'Zavrseno', color: 'text-lime-400' },
  error: { icon: <AlertCircle className="text-red-400" size={16} />, label: 'Greska', color: 'text-red-400' },
}

export function ReportCard({ report, onDownload, onDelete }: ReportCardProps) {
  const status = statusConfig[report.status]

  return (
    <div className="flex items-center justify-between p-4 bg-navy-800/60 border border-navy-700 rounded-lg hover:border-teal-500/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Type Icon */}
        <div className="w-12 h-12 bg-navy-700 rounded-lg flex items-center justify-center">
          {typeIcons[report.type]}
        </div>

        {/* Info */}
        <div>
          <h3 className="font-medium text-white">{report.name}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-navy-400">
            <span>
              {format(new Date(report.date_from), 'dd.MM.yyyy')} - {format(new Date(report.date_to), 'dd.MM.yyyy')}
            </span>
            <span className="text-navy-600">|</span>
            <span>{typeLabels[report.type]}</span>
            {report.project && (
              <>
                <span className="text-navy-600">|</span>
                <span className="text-teal-400">
                  {report.project.code ? `[${report.project.code}] ` : ''}{report.project.name}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {status.icon}
            <span className={`text-xs ${status.color}`}>{status.label}</span>
            <span className="text-xs text-navy-500">
              {format(new Date(report.created_at), 'dd.MM.yyyy HH:mm')}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {report.status === 'completed' && report.file_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(report)}
          >
            <Download size={16} className="mr-2" />
            Preuzmi
          </Button>
        )}
        <button
          onClick={() => onDelete(report)}
          className="p-2 text-navy-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}
