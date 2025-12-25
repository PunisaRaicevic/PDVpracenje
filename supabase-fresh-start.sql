-- ============================================
-- FRESH START - Safe version
-- ============================================

-- Drop in correct order (ignore errors)
DROP TABLE IF EXISTS organization_invitations;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS organizations;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS is_org_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_owner(UUID) CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

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

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  status TEXT DEFAULT 'uploading',
  requires_confirmation BOOLEAN DEFAULT true,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  extraction_confidence JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  filters JSONB DEFAULT '{}',
  file_url TEXT,
  status TEXT DEFAULT 'pending',
  invoice_count INTEGER DEFAULT 0,
  total_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_pib ON organizations(pib);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_type ON invoices(invoice_type);
CREATE INDEX idx_reports_org ON reports(organization_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================
-- RLS
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
CREATE FUNCTION is_org_member(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM organization_members WHERE organization_id = org_id AND user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION is_org_owner(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM organization_members WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'owner');
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies
CREATE POLICY "p1" ON organizations FOR SELECT USING (is_org_member(id));
CREATE POLICY "p2" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "p3" ON organizations FOR UPDATE USING (is_org_owner(id));
CREATE POLICY "p4" ON organizations FOR DELETE USING (is_org_owner(id));

CREATE POLICY "p5" ON organization_members FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "p6" ON organization_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "p7" ON organization_members FOR UPDATE USING (is_org_owner(organization_id));
CREATE POLICY "p8" ON organization_members FOR DELETE USING (is_org_owner(organization_id) OR user_id = auth.uid());

CREATE POLICY "p9" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "p10" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "p11" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "p12" ON projects FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "p13" ON projects FOR INSERT WITH CHECK (is_org_member(organization_id));
CREATE POLICY "p14" ON projects FOR UPDATE USING (is_org_member(organization_id));
CREATE POLICY "p15" ON projects FOR DELETE USING (is_org_owner(organization_id));

CREATE POLICY "p16" ON invoices FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "p17" ON invoices FOR INSERT WITH CHECK (is_org_member(organization_id));
CREATE POLICY "p18" ON invoices FOR UPDATE USING (is_org_member(organization_id));
CREATE POLICY "p19" ON invoices FOR DELETE USING (is_org_owner(organization_id));

CREATE POLICY "p20" ON reports FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "p21" ON reports FOR INSERT WITH CHECK (is_org_member(organization_id));
CREATE POLICY "p22" ON reports FOR UPDATE USING (is_org_member(organization_id));

CREATE POLICY "p23" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "p24" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "p25" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "p26" ON organization_invitations FOR SELECT USING (true);
CREATE POLICY "p27" ON organization_invitations FOR INSERT WITH CHECK (is_org_owner(organization_id));

-- ============================================
-- TRIGGER: Auto-create profile
-- ============================================
CREATE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- DONE!
-- ============================================
