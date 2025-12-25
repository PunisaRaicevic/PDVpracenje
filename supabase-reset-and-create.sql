-- ============================================
-- RESET: Drop all existing tables and start fresh
-- WARNING: This will DELETE all data!
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS is_org_member(UUID);
DROP FUNCTION IF EXISTS is_org_owner(UUID);

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================
-- Now create everything fresh
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  accountant_email TEXT,
  settings JSONB DEFAULT '{}',
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Crna Gora',
  phone TEXT,
  email TEXT,
  pib TEXT,
  pdv_number TEXT,
  is_pdv_registered BOOLEAN DEFAULT false,
  owner_name TEXT,
  bank_account TEXT,
  bank_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_pib ON organizations(pib);

-- 2. ORGANIZATION MEMBERS
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- 3. PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROJECTS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_org ON projects(organization_id);

-- 5. INVOICES
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  is_general_expense BOOLEAN DEFAULT false,
  invoice_type TEXT DEFAULT 'incoming' CHECK (invoice_type IN ('incoming', 'outgoing')),
  file_url TEXT,
  file_type TEXT,
  original_filename TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  vendor_name TEXT,
  vendor_address TEXT,
  vendor_tax_id TEXT,
  vendor_pdv TEXT,
  buyer_name TEXT,
  buyer_address TEXT,
  buyer_tax_id TEXT,
  subtotal DECIMAL(12,2),
  tax_rate DECIMAL(5,2),
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  currency TEXT DEFAULT 'EUR',
  line_items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'uploading' CHECK (status IN (
    'uploading', 'processing', 'processed', 'confirmed', 'sent_to_accountant', 'error'
  )),
  requires_confirmation BOOLEAN DEFAULT true,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  extraction_confidence JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_type ON invoices(invoice_type);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);

-- 6. REPORTS
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'excel', 'csv')),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  filters JSONB DEFAULT '{}',
  file_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'error')),
  invoice_count INTEGER DEFAULT 0,
  total_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_org ON reports(organization_id);

-- 7. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'invoice_processed', 'invoice_confirmed', 'invoice_error', 'report_ready', 'member_joined'
  )),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- 8. ORGANIZATION INVITATIONS
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee')),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON organization_invitations(token);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations Policies
CREATE POLICY "org_select" ON organizations FOR SELECT USING (is_org_member(id));
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (is_org_owner(id));
CREATE POLICY "org_delete" ON organizations FOR DELETE USING (is_org_owner(id));

-- Organization Members Policies
CREATE POLICY "members_select" ON organization_members FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "members_insert" ON organization_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update" ON organization_members FOR UPDATE USING (is_org_owner(organization_id));
CREATE POLICY "members_delete" ON organization_members FOR DELETE USING (is_org_owner(organization_id) OR user_id = auth.uid());

-- Profiles Policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Projects Policies
CREATE POLICY "projects_select" ON projects FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (is_org_member(organization_id));
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (is_org_member(organization_id));
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (is_org_owner(organization_id));

-- Invoices Policies
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (is_org_member(organization_id));
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (is_org_member(organization_id));
CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (is_org_owner(organization_id));

-- Reports Policies
CREATE POLICY "reports_select" ON reports FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (is_org_member(organization_id));
CREATE POLICY "reports_update" ON reports FOR UPDATE USING (is_org_member(organization_id));

-- Notifications Policies
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Invitations Policies
CREATE POLICY "invitations_select" ON organization_invitations FOR SELECT USING (true);
CREATE POLICY "invitations_insert" ON organization_invitations FOR INSERT WITH CHECK (is_org_owner(organization_id));

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE (run this separately if it fails)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false) ON CONFLICT DO NOTHING;

-- ============================================
-- REALTIME
-- ============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- DONE! Database is ready.
-- ============================================
