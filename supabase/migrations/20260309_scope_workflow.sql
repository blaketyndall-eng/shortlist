-- SCOPE Workflow: Pre-purchase diagnostic flow
-- Signal → Cause → Options → Prepare → Endorse

CREATE TABLE IF NOT EXISTS scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_step text NOT NULL DEFAULT 'signal',
  data jsonb NOT NULL DEFAULT '{}',
  decision text,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scopes_user_id ON scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_scopes_status ON scopes(status);
ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scopes_own ON scopes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add sponsor approval threshold to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sponsor_approval_threshold numeric;
