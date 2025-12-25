import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient()

    // Get user's current organization
    const { data: profile } = await adminClient
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_organization_id) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      )
    }

    // Verify user is actually a member of this organization
    const { data: membership } = await adminClient
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', profile.current_organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileUrl = formData.get('file_url') as string
    const fileName = formData.get('filename') as string
    const projectId = formData.get('project_id') as string | null
    const isGeneralExpense = formData.get('is_general_expense') === 'true'
    const invoiceType = (formData.get('invoice_type') as string) || 'incoming'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!['incoming', 'outgoing'].includes(invoiceType)) {
      return NextResponse.json({ error: 'Invalid invoice type' }, { status: 400 })
    }

    // Determine file type
    const fileType = file.type.includes('pdf') ? 'pdf' :
      file.type.includes('png') ? 'png' : 'jpg'

    // Pre-create invoice record with status 'uploading'
    const { data: invoice, error: insertError } = await adminClient
      .from('invoices')
      .insert({
        organization_id: profile.current_organization_id,
        user_id: user.id,
        project_id: projectId || null,
        is_general_expense: isGeneralExpense,
        invoice_type: invoiceType,
        file_url: fileUrl,
        file_type: fileType,
        original_filename: fileName,
        status: 'uploading',
        requires_confirmation: true,
        currency: 'EUR',
        line_items: [],
        extraction_confidence: {},
      })
      .select()
      .single()

    if (insertError || !invoice) {
      console.error('Failed to create invoice record:', insertError)
      return NextResponse.json(
        { error: 'Failed to create invoice record' },
        { status: 500 }
      )
    }

    console.log('Pre-created invoice:', invoice.id)

    // Update status to 'processing'
    await adminClient
      .from('invoices')
      .update({ status: 'processing' })
      .eq('id', invoice.id)

    // Send to n8n webhook with invoice_id and callback URL
    const webhookUrl = process.env.N8N_WEBHOOK_URL ||
      'https://punisa.app.n8n.cloud/webhook/1265e465-0c04-4691-9bb3-77c9eacfadcf'

    // Callback URL for n8n to send results back
    const callbackUrl = process.env.N8N_CALLBACK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/n8n-callback`

    try {
      // Convert File to Buffer for server-side fetch
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const blob = new Blob([buffer], { type: file.type })

      const n8nFormData = new FormData()
      n8nFormData.append('Invoice File', blob, fileName)
      n8nFormData.append('invoice_id', invoice.id)
      n8nFormData.append('organization_id', profile.current_organization_id)
      n8nFormData.append('user_id', user.id)
      n8nFormData.append('user_email', user.email || '')
      n8nFormData.append('file_url', fileUrl)
      n8nFormData.append('file_type', fileType)
      n8nFormData.append('filename', fileName)
      n8nFormData.append('invoice_type', invoiceType)
      n8nFormData.append('callback_url', callbackUrl)

      console.log('Sending to n8n:', webhookUrl)
      console.log('Invoice ID:', invoice.id)
      console.log('Callback URL:', callbackUrl)

      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        body: n8nFormData,
      })

      console.log('n8n response status:', n8nResponse.status)

      if (n8nResponse.ok) {
        const text = await n8nResponse.text()
        console.log('n8n response:', text)

        return NextResponse.json({
          success: true,
          message: 'Invoice sent to processing',
          invoice_id: invoice.id,
        })
      } else {
        const errorText = await n8nResponse.text()
        console.error('n8n error:', errorText)

        // Update invoice status to error
        await adminClient
          .from('invoices')
          .update({
            status: 'error',
            notes: `n8n error: ${errorText}`,
          })
          .eq('id', invoice.id)

        return NextResponse.json({
          error: 'Failed to process invoice',
          details: errorText,
          invoice_id: invoice.id,
        }, { status: 500 })
      }
    } catch (n8nError: any) {
      console.error('n8n webhook error:', n8nError)

      // Update invoice status to error
      await adminClient
        .from('invoices')
        .update({
          status: 'error',
          notes: `n8n webhook error: ${n8nError.message}`,
        })
        .eq('id', invoice.id)

      return NextResponse.json({
        error: 'Failed to send to processing',
        details: n8nError.message,
        invoice_id: invoice.id,
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
