CREATE TABLE IF NOT EXISTS ocr_recognitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  media_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  result_json TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  processing_time_ms INTEGER,
  error TEXT,
  created_by TEXT NOT NULL DEFAULT 'manager',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ocr_recognitions_order_id ON ocr_recognitions(order_id);
CREATE INDEX IF NOT EXISTS idx_ocr_recognitions_status ON ocr_recognitions(status);
CREATE INDEX IF NOT EXISTS idx_ocr_recognitions_media_id ON ocr_recognitions(media_id);
