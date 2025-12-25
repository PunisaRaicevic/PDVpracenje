import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  generateExcelReport,
  generateCSVReport,
  generatePDFReport,
  getReportExtension,
} from '@/lib/report-generator'

export const dynamic = 'force-dynamic'

// GET - List reports for the organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_organization_id) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    // Get reports for the organization
    const { data: reports, error } = await supabase
      .from('reports')
      .select(`
        *,
        project:projects(name, code)
      `)
      .eq('organization_id', profile.current_organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_organization_id) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const body = await request.json()
    const { name, type, date_from, date_to, project_id, status_filter } = body

    if (!name || !type || !date_from || !date_to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['pdf', 'excel', 'csv'].includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    // Get organization info
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.current_organization_id)
      .single()

    // Create report record
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        organization_id: profile.current_organization_id,
        created_by: user.id,
        name,
        type,
        date_from,
        date_to,
        project_id: project_id || null,
        status: 'generating',
      })
      .select()
      .single()

    if (insertError || !report) {
      console.error('Error creating report:', insertError)
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
    }

    // Build invoice query - fetch all then filter by date on client side
    // This handles cases where invoice_date is null (falls back to created_at)
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        invoice_type,
        created_at,
        vendor_name,
        vendor_tax_id,
        buyer_name,
        buyer_tax_id,
        subtotal,
        tax_amount,
        total_amount,
        currency,
        status,
        project:projects(name, code)
      `)
      .eq('organization_id', profile.current_organization_id)

    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    if (status_filter && status_filter !== 'all') {
      query = query.eq('status', status_filter)
    }

    const { data: allInvoices, error: invoicesError } = await query.order('created_at', { ascending: false })

    // Filter invoices by date - use invoice_date if available, otherwise created_at
    const dateFromObj = new Date(date_from)
    const dateToObj = new Date(date_to)
    dateToObj.setHours(23, 59, 59, 999) // Include the entire end day

    const invoices = allInvoices?.filter((inv) => {
      const dateStr = inv.invoice_date || inv.created_at
      if (!dateStr) return false
      const invoiceDate = new Date(dateStr)
      return invoiceDate >= dateFromObj && invoiceDate <= dateToObj
    }) || []

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError)
      await supabase
        .from('reports')
        .update({ status: 'error' })
        .eq('id', report.id)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    // Generate report
    let reportBuffer: Buffer

    // Map invoices to flatten the project array (Supabase returns arrays for relations)
    const mappedInvoices = (invoices || []).map((inv: any) => ({
      ...inv,
      project: Array.isArray(inv.project) && inv.project.length > 0
        ? inv.project[0]
        : inv.project || null
    }))

    const reportOptions = {
      invoices: mappedInvoices,
      dateFrom: new Date(date_from),
      dateTo: new Date(date_to),
      organizationName: org?.name || 'Unknown',
      reportName: name,
    }

    try {
      switch (type) {
        case 'excel':
          reportBuffer = await generateExcelReport(reportOptions)
          break
        case 'csv':
          reportBuffer = await generateCSVReport(reportOptions)
          break
        case 'pdf':
        default:
          reportBuffer = await generatePDFReport(reportOptions)
          break
      }
    } catch (genError) {
      console.error('Error generating report:', genError)
      await supabase
        .from('reports')
        .update({ status: 'error' })
        .eq('id', report.id)
      return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }

    // Upload report to storage using admin client (bypasses RLS)
    const adminClient = createAdminClient()
    const extension = getReportExtension(type)
    const fileName = `${profile.current_organization_id}/${report.id}.${extension}`

    const { error: uploadError } = await adminClient.storage
      .from('reports')
      .upload(fileName, reportBuffer, {
        contentType: type === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : type === 'csv'
          ? 'text/csv'
          : 'text/html',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading report:', uploadError)
      await supabase
        .from('reports')
        .update({ status: 'error' })
        .eq('id', report.id)
      return NextResponse.json({ error: 'Failed to upload report' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = adminClient.storage
      .from('reports')
      .getPublicUrl(fileName)

    // Update report with file URL
    await supabase
      .from('reports')
      .update({
        status: 'completed',
        file_url: publicUrl,
      })
      .eq('id', report.id)

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        status: 'completed',
        file_url: publicUrl,
      },
    })
  } catch (error) {
    console.error('Reports POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
