-- ============================================================
-- Vendor Engine Schema Migration
-- Extends vendor_library, creates vendor_categories + enrichment queue
-- ============================================================

-- 1. Extend vendor_library with columns needed by UI + enrichment engine
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS size text; -- startup/mid-market/enterprise
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS avg_rating numeric(3,1);
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS enrichment_status text DEFAULT 'pending';
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- AI-generated intelligence fields
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_overview text;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_strengths jsonb DEFAULT '[]';
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_concerns jsonb DEFAULT '[]';
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_pricing text;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_impl_complexity text;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_impl_note text;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_g2_position text;
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_watch_out_for jsonb DEFAULT '[]';
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS ai_competitors jsonb DEFAULT '[]';
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}';
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS data_sources jsonb DEFAULT '[]';

-- 2. Create vendor_categories table
CREATE TABLE IF NOT EXISTS vendor_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  vendor_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. Create vendor_enrichment_queue table
CREATE TABLE IF NOT EXISTS vendor_enrichment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_library(id) ON DELETE CASCADE,
  source text NOT NULL,
  field_name text NOT NULL,
  proposed_value jsonb NOT NULL,
  confidence numeric(4,2) NOT NULL,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- 4. Add category_id FK to vendor_library if not exists
-- (category_id already exists on the table, just ensure it references vendor_categories)
-- Note: category_id column already exists. We add the FK constraint only if vendor_categories is new.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vendor_library_category_id_fkey_vc'
    AND table_name = 'vendor_library'
  ) THEN
    ALTER TABLE vendor_library
      ADD CONSTRAINT vendor_library_category_id_fkey_vc
      FOREIGN KEY (category_id) REFERENCES vendor_categories(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_library_slug ON vendor_library(slug);
CREATE INDEX IF NOT EXISTS idx_vendor_library_category ON vendor_library(category_id);
CREATE INDEX IF NOT EXISTS idx_vendor_library_enrichment_status ON vendor_library(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_vendor_enrichment_queue_status ON vendor_enrichment_queue(status);
CREATE INDEX IF NOT EXISTS idx_vendor_enrichment_queue_vendor ON vendor_enrichment_queue(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_slug ON vendor_categories(slug);

-- 6. RLS Policies

-- vendor_categories: read for all authenticated, mutations via service role only
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_categories_read ON vendor_categories
  FOR SELECT TO authenticated USING (true);

-- vendor_enrichment_queue: read + update for authenticated, insert via service role
ALTER TABLE vendor_enrichment_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_enrichment_queue_read ON vendor_enrichment_queue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY vendor_enrichment_queue_review ON vendor_enrichment_queue
  FOR UPDATE TO authenticated USING (true);

-- vendor_library: ensure SELECT is open to authenticated
-- (existing policies may already cover this, add only if needed)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_library' AND policyname = 'vendor_library_read_all'
  ) THEN
    EXECUTE 'CREATE POLICY vendor_library_read_all ON vendor_library FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 7. Seed categories
INSERT INTO vendor_categories (name, slug, description, icon) VALUES
  ('CRM & Sales', 'crm-sales', 'Customer relationship management and sales tools', '💼'),
  ('HR & People', 'hr-people', 'Human resources, payroll, and people operations', '👥'),
  ('DevOps & Engineering', 'devops-engineering', 'Developer tools, CI/CD, and infrastructure', '⚙️'),
  ('Security & Compliance', 'security-compliance', 'Cybersecurity, identity, and compliance tools', '🔒'),
  ('Marketing & Analytics', 'marketing-analytics', 'Marketing automation, analytics, and CDP', '📊'),
  ('Finance & Accounting', 'finance-accounting', 'Expense management, billing, and accounting', '💰'),
  ('Project Management', 'project-management', 'Task management, collaboration, and productivity', '📋'),
  ('Integration & Data', 'integration-data', 'iPaaS, ETL, data warehousing, and reverse ETL', '🔗')
ON CONFLICT (slug) DO NOTHING;
