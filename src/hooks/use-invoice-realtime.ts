'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Invoice {
  id: string
  organization_id: string
  user_id: string
  project_id: string | null
  is_general_expense: boolean
  invoice_type: 'incoming' | 'outgoing'
  file_url: string | null
  file_type: string | null
  original_filename: string | null
  invoice_number: string | null
  invoice_date: string | null
  due_date: string | null
  vendor_name: string | null
  vendor_address: string | null
  vendor_tax_id: string | null
  vendor_pdv: string | null
  buyer_name: string | null
  buyer_address: string | null
  buyer_tax_id: string | null
  subtotal: number | null
  tax_rate: number | null
  tax_amount: number | null
  total_amount: number | null
  currency: string
  line_items: any[]
  status: 'uploading' | 'processing' | 'processed' | 'confirmed' | 'sent_to_accountant' | 'error'
  requires_confirmation: boolean
  confirmed_at: string | null
  confirmed_by: string | null
  extraction_confidence: Record<string, number>
  notes: string | null
  created_at: string
  updated_at: string
}

interface UseInvoiceRealtimeOptions {
  organizationId: string | null
  onInvoiceProcessed?: (invoice: Invoice) => void
  onInvoiceUpdated?: (invoice: Invoice) => void
  onInvoiceError?: (invoice: Invoice) => void
  enabled?: boolean
}

/**
 * Hook to subscribe to real-time invoice updates for an organization
 * Triggers callbacks when invoice status changes (especially when processing completes)
 */
export function useInvoiceRealtime({
  organizationId,
  onInvoiceProcessed,
  onInvoiceUpdated,
  onInvoiceError,
  enabled = true,
}: UseInvoiceRealtimeOptions) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  const handleChange = useCallback(
    (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload

      if (eventType === 'UPDATE' && newRecord) {
        const invoice = newRecord as Invoice
        const oldInvoice = oldRecord as Invoice | undefined

        // Check if status changed to 'processed' (AI extraction complete)
        if (
          oldInvoice?.status !== 'processed' &&
          invoice.status === 'processed' &&
          invoice.requires_confirmation
        ) {
          console.log('Invoice processed, needs confirmation:', invoice.id)
          onInvoiceProcessed?.(invoice)
        }

        // Check if status changed to 'error'
        if (oldInvoice?.status !== 'error' && invoice.status === 'error') {
          console.log('Invoice processing error:', invoice.id)
          onInvoiceError?.(invoice)
        }

        // General update callback
        onInvoiceUpdated?.(invoice)
      }

      if (eventType === 'INSERT' && newRecord) {
        onInvoiceUpdated?.(newRecord as Invoice)
      }
    },
    [onInvoiceProcessed, onInvoiceUpdated, onInvoiceError]
  )

  useEffect(() => {
    if (!enabled || !organizationId) {
      return
    }

    // Create channel with unique name
    const channelName = `invoices-${organizationId}-${Date.now()}`

    console.log('Setting up realtime subscription for org:', organizationId)

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `organization_id=eq.${organizationId}`,
        },
        handleChange
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Cleaning up realtime subscription')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [organizationId, enabled, handleChange, supabase])

  return {
    isSubscribed: !!channelRef.current,
  }
}

/**
 * Hook to subscribe to a single invoice's updates
 */
export function useSingleInvoiceRealtime({
  invoiceId,
  onUpdate,
  enabled = true,
  pollingInterval = 3000, // Fallback polling every 3 seconds
}: {
  invoiceId: string | null
  onUpdate?: (invoice: Invoice) => void
  enabled?: boolean
  pollingInterval?: number
}) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastStatusRef = useRef<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !invoiceId) {
      return
    }

    const channelName = `invoice-${invoiceId}-${Date.now()}`

    console.log('Setting up single invoice realtime for:', invoiceId)

    // Realtime subscription
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
          filter: `id=eq.${invoiceId}`,
        },
        (payload) => {
          console.log('Realtime update received:', payload)
          if (payload.new) {
            const invoice = payload.new as Invoice
            if (invoice.status !== lastStatusRef.current) {
              console.log('Status changed from', lastStatusRef.current, 'to', invoice.status)
              lastStatusRef.current = invoice.status
              onUpdate?.(invoice)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Single invoice subscription status:', status)
      })

    // Fallback polling (in case realtime doesn't work)
    const pollInvoice = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single()

        if (data && !error) {
          const invoice = data as Invoice
          if (invoice.status !== lastStatusRef.current) {
            console.log('Polling detected status change:', lastStatusRef.current, '->', invoice.status)
            lastStatusRef.current = invoice.status
            onUpdate?.(invoice)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    // Start polling as fallback
    pollingRef.current = setInterval(pollInvoice, pollingInterval)

    return () => {
      console.log('Cleaning up single invoice subscription')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [invoiceId, enabled, onUpdate, supabase, pollingInterval])

  return {
    isSubscribed: !!channelRef.current,
  }
}
