import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface N8nCallbackPayload {
  invoice_id: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  vendor_name?: string
  vendor_address?: string
  vendor_tax_id?: string
  vendor_pdv?: string
  buyer_name?: string
  buyer_address?: string
  buyer_tax_id?: string
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total_amount?: number
  currency?: string
  line_items?: any[]
  extraction_confidence?: Record<string, number>
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (optional but recommended)
    const webhookSecret = request.headers.get('x-webhook-secret')
    if (process.env.N8N_WEBHOOK_SECRET && webhookSecret !== process.env.N8N_WEBHOOK_SECRET) {
      console.error('Invalid webhook secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: N8nCallbackPayload = await request.json()
    console.log('n8n callback received:', payload.invoice_id)

    if (!payload.invoice_id) {
      return NextResponse.json(
        { error: 'invoice_id is required' },
        { status: 400 }
      )
    }

    // Check if there was an error during extraction
    if (payload.error) {
      const { error: updateError } = await supabaseAdmin
        .from('invoices')
        .update({
          status: 'error',
          notes: payload.error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.invoice_id)

      if (updateError) {
        console.error('Failed to update invoice status to error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update invoice' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, status: 'error' })
    }

    // Calculate confidence scores if not provided
    const confidence = payload.extraction_confidence || calculateConfidence(payload)

    // Update invoice with extracted data
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        invoice_number: payload.invoice_number,
        invoice_date: payload.invoice_date,
        due_date: payload.due_date,
        vendor_name: payload.vendor_name,
        vendor_address: payload.vendor_address,
        vendor_tax_id: payload.vendor_tax_id,
        vendor_pdv: payload.vendor_pdv,
        buyer_name: payload.buyer_name,
        buyer_address: payload.buyer_address,
        buyer_tax_id: payload.buyer_tax_id,
        subtotal: payload.subtotal,
        tax_rate: payload.tax_rate,
        tax_amount: payload.tax_amount,
        total_amount: payload.total_amount,
        currency: payload.currency || 'EUR',
        line_items: payload.line_items || [],
        extraction_confidence: confidence,
        status: 'processed',
        requires_confirmation: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.invoice_id)

    if (updateError) {
      console.error('Failed to update invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      )
    }

    console.log('Invoice updated successfully:', payload.invoice_id)

    return NextResponse.json({
      success: true,
      invoice_id: payload.invoice_id,
      status: 'processed',
    })
  } catch (error) {
    console.error('n8n callback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Calculate confidence scores based on field presence and format
function calculateConfidence(payload: N8nCallbackPayload): Record<string, number> {
  const confidence: Record<string, number> = {}

  // Invoice number - high confidence if present and formatted
  if (payload.invoice_number) {
    confidence.invoice_number = payload.invoice_number.length > 3 ? 0.9 : 0.7
  } else {
    confidence.invoice_number = 0
  }

  // Date fields
  if (payload.invoice_date) {
    confidence.invoice_date = isValidDate(payload.invoice_date) ? 0.95 : 0.6
  } else {
    confidence.invoice_date = 0
  }

  if (payload.due_date) {
    confidence.due_date = isValidDate(payload.due_date) ? 0.95 : 0.6
  } else {
    confidence.due_date = 0
  }

  // Vendor info
  if (payload.vendor_name) {
    confidence.vendor_name = payload.vendor_name.length > 2 ? 0.85 : 0.5
  } else {
    confidence.vendor_name = 0
  }

  if (payload.vendor_tax_id) {
    confidence.vendor_tax_id = isValidTaxId(payload.vendor_tax_id) ? 0.95 : 0.7
  } else {
    confidence.vendor_tax_id = 0
  }

  // Amounts - high confidence if they're valid numbers
  if (payload.total_amount !== undefined && payload.total_amount > 0) {
    confidence.total_amount = 0.9
  } else {
    confidence.total_amount = 0
  }

  if (payload.subtotal !== undefined && payload.subtotal > 0) {
    confidence.subtotal = 0.85
  } else {
    confidence.subtotal = 0
  }

  if (payload.tax_amount !== undefined && payload.tax_amount >= 0) {
    confidence.tax_amount = 0.85
  } else {
    confidence.tax_amount = 0
  }

  return confidence
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

function isValidTaxId(taxId: string): boolean {
  // Basic validation - adjust for your country's tax ID format
  return /^[A-Z0-9]{8,15}$/i.test(taxId.replace(/[\s-]/g, ''))
}
