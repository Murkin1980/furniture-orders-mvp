CREATE TABLE IF NOT EXISTS project_pdf_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  file_name TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  page_count INTEGER,
  manifest_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  error TEXT,
  created_by TEXT NOT NULL DEFAULT 'manager',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pdf_drafts_order_id ON project_pdf_drafts(order_id);
CREATE INDEX IF NOT EXISTS idx_pdf_drafts_status ON project_pdf_drafts(status);
