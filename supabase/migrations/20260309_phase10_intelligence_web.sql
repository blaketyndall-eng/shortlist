-- Phase 10: AI Intelligence Web enhancements

-- Add previous_enrichment column for vendor change detection
ALTER TABLE vendor_library ADD COLUMN IF NOT EXISTS previous_enrichment jsonb;

-- Add index for active projects lookup (used by health check & change alerts)
CREATE INDEX IF NOT EXISTS idx_projects_status_active ON projects(status) WHERE status = 'active';

-- Add index for activity_log by verb (used for vendor_changed lookups)
CREATE INDEX IF NOT EXISTS idx_activity_log_verb ON activity_log(verb, project_id);
