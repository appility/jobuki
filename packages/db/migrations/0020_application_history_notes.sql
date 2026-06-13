-- Add application status history table
CREATE TABLE application_status_history (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status application_status NOT NULL,
  changed_by_user_id TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX application_status_history_app_idx ON application_status_history(application_id);

-- Add application notes table
CREATE TABLE application_notes (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX application_notes_app_idx ON application_notes(application_id);

-- Seed history records for existing applications
INSERT INTO application_status_history (id, application_id, status, changed_by_user_id, note, created_at)
SELECT
  SUBSTRING(MD5(id || RANDOM()::TEXT), 1, 20) as id,
  id,
  status,
  'system' as changed_by_user_id,
  'Initial status' as note,
  created_at
FROM applications;
