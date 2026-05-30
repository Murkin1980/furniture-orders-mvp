CREATE TABLE IF NOT EXISTS project_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  furniture_type TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  step_code TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 1,
  default_assignee_role TEXT,
  FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  template_step_id INTEGER,
  step_code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TEXT,
  completed_by TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (template_step_id) REFERENCES template_steps(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_template_steps_template_id ON template_steps(template_id);
CREATE INDEX IF NOT EXISTS idx_order_steps_order_id ON order_steps(order_id);
CREATE INDEX IF NOT EXISTS idx_order_steps_status ON order_steps(status);
