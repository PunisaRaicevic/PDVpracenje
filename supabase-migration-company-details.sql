-- Migration: Add company details to organizations table
-- Run this in Supabase SQL Editor

-- Add new columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Crna Gora',
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS pib TEXT,  -- Poreski identifikacioni broj
ADD COLUMN IF NOT EXISTS pdv_number TEXT,  -- PDV registracioni broj
ADD COLUMN IF NOT EXISTS is_pdv_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_name TEXT,  -- Ime vlasnika/direktora
ADD COLUMN IF NOT EXISTS bank_account TEXT,  -- Broj racuna
ADD COLUMN IF NOT EXISTS bank_name TEXT;  -- Naziv banke

-- Create index on PIB for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_pib ON organizations(pib);

-- Comment on columns for documentation
COMMENT ON COLUMN organizations.pib IS 'Poreski identifikacioni broj';
COMMENT ON COLUMN organizations.pdv_number IS 'PDV registracioni broj (ako je u sistemu PDV-a)';
COMMENT ON COLUMN organizations.is_pdv_registered IS 'Da li je firma u sistemu PDV-a';
