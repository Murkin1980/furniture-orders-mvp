CREATE TABLE IF NOT EXISTS sketchup_render_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  job_id TEXT NOT NULL,
  artifact_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  primary_storage_key TEXT NOT NULL,
  model_storage_key TEXT,
  manifest_json TEXT NOT NULL,
  reported_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES sketchup_jobs(job_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sketchup_render_artifacts_job_id
  ON sketchup_render_artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_sketchup_render_artifacts_order_id
  ON sketchup_render_artifacts(order_id);
