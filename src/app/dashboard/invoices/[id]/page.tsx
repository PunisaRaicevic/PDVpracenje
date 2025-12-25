import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { InvoiceVerification } from './invoice-verification'

interface Invoice {
  id: string
  invoice_number: string | null
  invoice_date: string | null
  vendor_name: string | null
  vendor_address: string | null
  vendor_tax_id: string | null
  vendor_pdv: string | null
  buyer_name: string | null
  buyer_address: string | null
  buyer_tax_id: string | null
  subtotal: number | null
  tax_amount: number | null
  total_amount: number | null
  currency: string
  line_items: any[] | null
  notes: string | null
  file_url: string | null
  file_type: string
  status: string
  created_at: string
  user_id: string
}

async function getInvoice(id: string, userId: string): Promise<Invoice | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  return data
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const invoice = await getInvoice(id, user.id)

  if (!invoice) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <InvoiceVerification invoice={invoice} />
    </div>
  )
}
