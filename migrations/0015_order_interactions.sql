CREATE TABLE IF NOT EXISTS order_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_interactions_order_id ON order_interactions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_interactions_created_at ON order_interactions(created_at);
