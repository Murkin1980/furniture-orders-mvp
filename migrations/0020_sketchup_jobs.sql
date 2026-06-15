CREATE TABLE IF NOT EXISTS sketchup_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  recognition_id INTEGER NOT NULL,
  job_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  model_version TEXT NOT NULL,
  plan_version TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  node_job_id TEXT,
  error TEXT,
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (recognition_id) REFERENCES ocr_recognitions(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sketchup_jobs_order_id ON sketchup_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_sketchup_jobs_status ON sketchup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sketchup_jobs_recognition_id ON sketchup_jobs(recognition_id);
