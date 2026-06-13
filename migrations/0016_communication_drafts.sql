CREATE TABLE IF NOT EXISTS communication_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  channel TEXT NOT NULL DEFAULT 'messenger',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  source TEXT NOT NULL DEFAULT 'ai',
  provider TEXT,
  model TEXT,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL DEFAULT 'ai',
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_communication_drafts_order_id ON communication_drafts(order_id);
CREATE INDEX IF NOT EXISTS idx_communication_drafts_status ON communication_drafts(status);
