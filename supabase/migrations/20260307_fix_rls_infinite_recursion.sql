-- Fix: Infinite recursion in RLS policies between projects and project_members
-- The old is_project_member() and is_project_owner() functions were regular SQL functions
-- that triggered RLS on the tables they queried, creating circular policy evaluation.
-- The old project_admin_manage_members policy self-referenced project_members.
-- The old project_admin_update policy on projects queried project_members.
-- This caused: UPDATE projects → project_admin_update → query project_members →
--   project_admin_manage_members → query project_members → INFINITE RECURSION
--
-- Fix: Make helper functions SECURITY DEFINER (bypasses RLS), clean up redundant policies.

-- 1. Recreate helper functions as SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_project_member(proj_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = proj_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_project_owner(proj_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = proj_id AND owner_id = auth.uid()
  );
$$;

-- 2. Drop problematic policies
DROP POLICY IF EXISTS project_admin_manage_members ON project_members;
DROP POLICY IF EXISTS project_admin_update ON projects;
DROP POLICY IF EXISTS members_admin_all ON project_members;

-- 3. Create clean policy for project_members using SECURITY DEFINER function
CREATE POLICY project_admin_manage_members ON project_members
  FOR ALL
  USING (
    is_project_owner(project_id) OR (user_id = auth.uid())
  );
