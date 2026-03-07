-- SCOPE Workflow: Pre-SOLVE diagnostic for purchase intelligence
-- Signal → Cause → Options → Prepare → Endorse

CREATE TABLE IF NOT EXISTS scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',        -- active | completed | abandoned
  current_step text NOT NULL DEFAULT 'signal',  -- signal | cause | options | prepare | endorse
  data jsonb NOT NULL DEFAULT '{}',
  decision text,                                -- buy | build | fix | partner | do_nothing
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scopes_user_id ON scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_scopes_status ON scopes(status) WHERE status = 'active';

ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scopes_own ON scopes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Leadership approval threshold for SCOPE Endorse step
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sponsor_approval_threshold numeric;
