import ExcelJS from 'exceljs'
import { format } from 'date-fns'

export interface InvoiceData {
  id: string
  invoice_number: string | null
  invoice_date: string | null
  invoice_type: 'incoming' | 'outgoing'
  created_at?: string
  vendor_name: string | null
  vendor_tax_id: string | null
  buyer_name: string | null
  buyer_tax_id: string | null
  subtotal: number | null
  tax_amount: number | null
  total_amount: number | null
  currency: string
  status: string
  project?: {
    name: string
    code: string | null
  } | null
}

export interface ReportOptions {
  invoices: InvoiceData[]
  dateFrom: Date
  dateTo: Date
  organizationName: string
  projectName?: string
  reportName: string
}

// Generate Excel report
export async function generateExcelReport(options: ReportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Invoice Manager'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Fakture')

  // Header styling
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  }

  // Add title
  worksheet.mergeCells('A1:I1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = options.reportName
  titleCell.font = { bold: true, size: 16 }
  titleCell.alignment = { horizontal: 'center' }

  // Add date range
  worksheet.mergeCells('A2:I2')
  const dateCell = worksheet.getCell('A2')
  dateCell.value = `Period: ${format(options.dateFrom, 'dd.MM.yyyy')} - ${format(options.dateTo, 'dd.MM.yyyy')}`
  dateCell.alignment = { horizontal: 'center' }

  // Add organization
  worksheet.mergeCells('A3:I3')
  const orgCell = worksheet.getCell('A3')
  orgCell.value = `Organizacija: ${options.organizationName}`
  orgCell.alignment = { horizontal: 'center' }

  // Empty row
  worksheet.addRow([])

  // Headers
  const headers = [
    'Tip',
    'Br. fakture',
    'Datum',
    'Partner',
    'PIB',
    'Projekat',
    'Osnovica',
    'PDV',
    'Ukupno',
  ]

  const headerRow = worksheet.addRow(headers)
  headerRow.eachCell((cell) => {
    Object.assign(cell, { style: headerStyle })
  })

  // Set column widths
  worksheet.columns = [
    { width: 10 },  // Tip
    { width: 15 },  // Br. fakture
    { width: 12 },  // Datum
    { width: 30 },  // Partner
    { width: 15 },  // PIB
    { width: 20 },  // Projekat
    { width: 12 },  // Osnovica
    { width: 12 },  // PDV
    { width: 12 },  // Ukupno
  ]

  // Data rows
  let totalSubtotal = 0
  let totalTax = 0
  let totalAmount = 0

  options.invoices.forEach((invoice) => {
    const isIncoming = invoice.invoice_type === 'incoming'
    const partnerName = isIncoming ? invoice.vendor_name : invoice.buyer_name
    const partnerTaxId = isIncoming ? invoice.vendor_tax_id : invoice.buyer_tax_id
    const dateStr = invoice.invoice_date || invoice.created_at

    const row = worksheet.addRow([
      isIncoming ? 'Ulazna' : 'Izlazna',
      invoice.invoice_number || '-',
      dateStr ? format(new Date(dateStr), 'dd.MM.yyyy') : '-',
      partnerName || '-',
      partnerTaxId || '-',
      invoice.project ? (invoice.project.code ? `[${invoice.project.code}] ${invoice.project.name}` : invoice.project.name) : 'Opsti trosak',
      invoice.subtotal || 0,
      invoice.tax_amount || 0,
      invoice.total_amount || 0,
    ])

    // Format currency cells
    row.getCell(7).numFmt = '#,##0.00'
    row.getCell(8).numFmt = '#,##0.00'
    row.getCell(9).numFmt = '#,##0.00'

    totalSubtotal += invoice.subtotal || 0
    totalTax += invoice.tax_amount || 0
    totalAmount += invoice.total_amount || 0
  })

  // Total row
  worksheet.addRow([])
  const totalRow = worksheet.addRow([
    '',
    '',
    '',
    '',
    '',
    'UKUPNO:',
    totalSubtotal,
    totalTax,
    totalAmount,
  ])

  totalRow.font = { bold: true }
  totalRow.getCell(7).numFmt = '#,##0.00'
  totalRow.getCell(8).numFmt = '#,##0.00'
  totalRow.getCell(9).numFmt = '#,##0.00'

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// Generate CSV report
export async function generateCSVReport(options: ReportOptions): Promise<Buffer> {
  const headers = [
    'Tip',
    'Broj fakture',
    'Datum',
    'Partner',
    'PIB',
    'Projekat',
    'Osnovica',
    'PDV',
    'Ukupno',
    'Valuta',
    'Status',
  ]

  const rows = options.invoices.map((invoice) => {
    const isIncoming = invoice.invoice_type === 'incoming'
    const partnerName = isIncoming ? invoice.vendor_name : invoice.buyer_name
    const partnerTaxId = isIncoming ? invoice.vendor_tax_id : invoice.buyer_tax_id
    const dateStr = invoice.invoice_date || invoice.created_at

    return [
      isIncoming ? 'Ulazna' : 'Izlazna',
      invoice.invoice_number || '',
      dateStr ? format(new Date(dateStr), 'dd.MM.yyyy') : '',
      partnerName || '',
      partnerTaxId || '',
      invoice.project ? (invoice.project.code ? `[${invoice.project.code}] ${invoice.project.name}` : invoice.project.name) : 'Opsti trosak',
      (invoice.subtotal || 0).toFixed(2),
      (invoice.tax_amount || 0).toFixed(2),
      (invoice.total_amount || 0).toFixed(2),
      invoice.currency,
      invoice.status,
    ]
  })

  // Escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')

  // Add BOM for Excel UTF-8 compatibility
  const bom = '\ufeff'
  return Buffer.from(bom + csvContent, 'utf-8')
}

// Generate simple PDF report (using HTML to PDF approach)
export async function generatePDFReport(options: ReportOptions): Promise<Buffer> {
  // For server-side PDF generation, we'll create HTML that can be converted
  // In production, you'd use a service like Puppeteer or a PDF API
  // For now, we'll generate a simple text-based PDF structure

  const { invoices, dateFrom, dateTo, organizationName, reportName } = options

  let totalSubtotal = 0
  let totalTax = 0
  let totalAmount = 0

  invoices.forEach((inv) => {
    totalSubtotal += inv.subtotal || 0
    totalTax += inv.tax_amount || 0
    totalAmount += inv.total_amount || 0
  })

  // Generate HTML content for PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #4F46E5; margin-bottom: 10px; }
    .meta { color: #666; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #4F46E5; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
    .total-row { font-weight: bold; background: #f0f0f0 !important; }
    .number { text-align: right; }
  </style>
</head>
<body>
  <h1>${reportName}</h1>
  <div class="meta">
    <p>Organizacija: ${organizationName}</p>
    <p>Period: ${format(dateFrom, 'dd.MM.yyyy')} - ${format(dateTo, 'dd.MM.yyyy')}</p>
    <p>Generisano: ${format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tip</th>
        <th>Br. fakture</th>
        <th>Datum</th>
        <th>Partner</th>
        <th>PIB</th>
        <th class="number">Osnovica</th>
        <th class="number">PDV</th>
        <th class="number">Ukupno</th>
      </tr>
    </thead>
    <tbody>
      ${invoices.map((inv) => {
        const isIncoming = inv.invoice_type === 'incoming'
        const partnerName = isIncoming ? inv.vendor_name : inv.buyer_name
        const partnerTaxId = isIncoming ? inv.vendor_tax_id : inv.buyer_tax_id
        const dateStr = inv.invoice_date || inv.created_at
        return `
        <tr>
          <td>${isIncoming ? 'Ulazna' : 'Izlazna'}</td>
          <td>${inv.invoice_number || '-'}</td>
          <td>${dateStr ? format(new Date(dateStr), 'dd.MM.yyyy') : '-'}</td>
          <td>${partnerName || '-'}</td>
          <td>${partnerTaxId || '-'}</td>
          <td class="number">${(inv.subtotal || 0).toFixed(2)}</td>
          <td class="number">${(inv.tax_amount || 0).toFixed(2)}</td>
          <td class="number">${(inv.total_amount || 0).toFixed(2)}</td>
        </tr>
      `}).join('')}
      <tr class="total-row">
        <td colspan="5">UKUPNO</td>
        <td class="number">${totalSubtotal.toFixed(2)}</td>
        <td class="number">${totalTax.toFixed(2)}</td>
        <td class="number">${totalAmount.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <p style="margin-top: 40px; color: #999; font-size: 12px;">
    Generisano pomocu Invoice Manager aplikacije
  </p>
</body>
</html>
  `

  // Return HTML as buffer - in production you'd convert this to PDF
  // using Puppeteer, wkhtmltopdf, or a cloud PDF service
  return Buffer.from(html, 'utf-8')
}

// Helper to get content type
export function getReportContentType(type: 'pdf' | 'excel' | 'csv'): string {
  switch (type) {
    case 'pdf':
      return 'text/html' // Would be 'application/pdf' with proper PDF generation
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'csv':
      return 'text/csv; charset=utf-8'
  }
}

// Helper to get file extension
export function getReportExtension(type: 'pdf' | 'excel' | 'csv'): string {
  switch (type) {
    case 'pdf':
      return 'html' // Would be 'pdf' with proper PDF generation
    case 'excel':
      return 'xlsx'
    case 'csv':
      return 'csv'
  }
}
