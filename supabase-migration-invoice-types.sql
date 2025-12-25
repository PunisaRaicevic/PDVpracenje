-- ============================================
-- Migration: Add Invoice Types (Incoming/Outgoing)
-- For VAT/PDV tracking
-- ============================================

-- Add invoice_type column to invoices table
ALTER TABLE invoices
ADD COLUMN invoice_type TEXT DEFAULT 'incoming'
CHECK (invoice_type IN ('incoming', 'outgoing'));

-- Add index for filtering by type
CREATE INDEX idx_invoices_type ON invoices(invoice_type);

-- Add combined index for common queries
CREATE INDEX idx_invoices_org_type_date ON invoices(organization_id, invoice_type, invoice_date);

-- Comment for clarity
COMMENT ON COLUMN invoices.invoice_type IS 'incoming = supplier invoices (you pay), outgoing = customer invoices (you issue)';

-- ============================================
-- For incoming invoices:
--   vendor = supplier (who you pay)
--   buyer = your company
--   tax_amount = ulazni PDV (input VAT - you can claim back)
--
-- For outgoing invoices:
--   vendor = your company (who issues the invoice)
--   buyer = customer (who pays you)
--   tax_amount = izlazni PDV (output VAT - you owe to government)
--
-- PDV obligation = izlazni PDV - ulazni PDV
-- ============================================
