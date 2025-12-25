-- ============================================
-- Invoice Manager - Multi-Tenant Schema v2
-- Fresh start - run this on clean Supabase project
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ORGANIZATIONS (Tenants/Companies)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  accountant_email TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- 2. ORGANIZATION MEMBERS
-- ============================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================
-- 3. PROFILES (User profiles)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PROJECTS (Expense classification)
-- ============================================
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

-- Index for org lookups
CREATE INDEX idx_projects_org ON projects(organization_id);

-- ============================================
-- 5. INVOICES
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  is_general_expense BOOLEAN DEFAULT false,

  -- File info
  file_url TEXT,
  file_type TEXT,
  original_filename TEXT,

  -- Extracted data (from n8n/AI)
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,

  -- Vendor (seller)
  vendor_name TEXT,
  vendor_address TEXT,
  vendor_tax_id TEXT,
  vendor_pdv TEXT,

  -- Buyer (company)
  buyer_name TEXT,
  buyer_address TEXT,
  buyer_tax_id TEXT,

  -- Amounts
  subtotal DECIMAL(12,2),
  tax_rate DECIMAL(5,2),
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  currency TEXT DEFAULT 'EUR',

  -- Line items (JSON array)
  line_items JSONB DEFAULT '[]',

  -- Processing status
  status TEXT DEFAULT 'uploading' CHECK (status IN (
    'uploading',      -- File being uploaded
    'processing',     -- Sent to n8n, waiting for extraction
    'processed',      -- n8n extracted data, needs confirmation
    'confirmed',      -- User confirmed data is correct
    'sent_to_accountant', -- Sent to accountant
    'error'           -- Processing failed
  )),

  -- Human-in-the-loop validation
  requires_confirmation BOOLEAN DEFAULT true,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  extraction_confidence JSONB DEFAULT '{}',

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);

-- ============================================
-- 6. REPORTS
-- ============================================
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

-- Index
CREATE INDEX idx_reports_org ON reports(organization_id);

-- ============================================
-- 7. NOTIFICATIONS (In-app only)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'invoice_processed',
    'invoice_confirmed',
    'invoice_error',
    'report_ready',
    'member_joined'
  )),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- ============================================
-- 8. ORGANIZATION INVITATIONS (for future use)
-- ============================================
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

-- Index
CREATE INDEX idx_invitations_token ON organization_invitations(token);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is member of organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is owner of organization
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Organizations Policies
-- ============================================
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (is_org_owner(id));

CREATE POLICY "Owners can delete their organizations"
  ON organizations FOR DELETE
  USING (is_org_owner(id));

-- ============================================
-- Organization Members Policies
-- ============================================
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Users can insert themselves as owner"
  ON organization_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can manage members"
  ON organization_members FOR UPDATE
  USING (is_org_owner(organization_id));

CREATE POLICY "Owners can remove members"
  ON organization_members FOR DELETE
  USING (is_org_owner(organization_id) OR user_id = auth.uid());

-- ============================================
-- Profiles Policies
-- ============================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Org members can view each other profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT om.user_id FROM organization_members om
      WHERE om.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Projects Policies
-- ============================================
CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Members can create projects"
  ON projects FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "Members can update projects"
  ON projects FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "Owners can delete projects"
  ON projects FOR DELETE
  USING (is_org_owner(organization_id));

-- ============================================
-- Invoices Policies
-- ============================================
CREATE POLICY "Members can view org invoices"
  ON invoices FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Members can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "Members can update invoices"
  ON invoices FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "Owners can delete invoices"
  ON invoices FOR DELETE
  USING (is_org_owner(organization_id));

-- ============================================
-- Reports Policies
-- ============================================
CREATE POLICY "Members can view reports"
  ON reports FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Members can create reports"
  ON reports FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "Members can update reports"
  ON reports FOR UPDATE
  USING (is_org_member(organization_id));

-- ============================================
-- Notifications Policies
-- ============================================
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- Invitations Policies
-- ============================================
CREATE POLICY "Members can view org invitations"
  ON organization_invitations FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Owners can create invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (is_org_owner(organization_id));

CREATE POLICY "Anyone can view invitation by token"
  ON organization_invitations FOR SELECT
  USING (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Run this in Supabase Dashboard > Storage > Create bucket
-- Bucket name: invoices
-- Public: false (or true if you want public URLs)

-- Storage policies (run in SQL editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

-- ============================================
-- REALTIME
-- ============================================
-- Enable realtime for invoices table (for human-in-the-loop)
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- DONE!
-- ============================================
-- After running this SQL:
-- 1. Create storage buckets: 'invoices' (public) and 'reports' (private)
-- 2. Set up storage policies for the buckets
-- 3. Enable Realtime in Supabase dashboard
