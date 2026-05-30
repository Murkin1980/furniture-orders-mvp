CREATE TABLE IF NOT EXISTS calculator_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calculator_id INTEGER NOT NULL,
  category_code TEXT NOT NULL,
  label TEXT NOT NULL,
  base_price INTEGER NOT NULL DEFAULT 0,
  unit_label TEXT NOT NULL DEFAULT 'unit',
  unit_price INTEGER NOT NULL DEFAULT 0,
  min_units REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'draft',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calculator_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calculator_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calculator_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calculator_id INTEGER NOT NULL,
  field_code TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  default_value TEXT,
  min_value REAL,
  max_value REAL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_prices_unique_state
  ON calculator_prices(calculator_id, category_code, state);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_rules_unique_state
  ON calculator_rules(calculator_id, code, state);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_fields_unique
  ON calculator_fields(calculator_id, field_code);

CREATE INDEX IF NOT EXISTS idx_calculator_prices_calculator_state
  ON calculator_prices(calculator_id, state);

CREATE INDEX IF NOT EXISTS idx_calculator_rules_calculator_state
  ON calculator_rules(calculator_id, state);
