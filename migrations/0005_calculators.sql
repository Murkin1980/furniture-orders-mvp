CREATE TABLE IF NOT EXISTS calculators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_name TEXT NOT NULL,
  owner_phone TEXT,
  title TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'KZT',
  is_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calculator_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calculator_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  base_price INTEGER NOT NULL DEFAULT 0,
  unit_label TEXT NOT NULL DEFAULT 'unit',
  unit_price INTEGER NOT NULL DEFAULT 0,
  min_units REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calculator_embed_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calculator_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calculator_categories_calculator_id ON calculator_categories(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_embed_tokens_calculator_id ON calculator_embed_tokens(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_embed_tokens_token ON calculator_embed_tokens(token);
