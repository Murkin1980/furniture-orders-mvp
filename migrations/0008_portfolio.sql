CREATE TABLE IF NOT EXISTS portfolio_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_code) REFERENCES portfolio_categories(code)
);

CREATE TABLE IF NOT EXISTS portfolio_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_item_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_item_id) REFERENCES portfolio_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_categories_code
  ON portfolio_categories(code);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_status_category
  ON portfolio_items(status, category_code);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_item
  ON portfolio_images(portfolio_item_id, sort_order);

INSERT OR IGNORE INTO portfolio_categories (code, name, sort_order, is_active)
VALUES
  ('kitchens', 'Kitchens', 10, 1),
  ('wardrobes', 'Wardrobes', 20, 1),
  ('dressers', 'Dressers', 30, 1),
  ('hallways', 'Hallways', 40, 1),
  ('closets', 'Walk-in closets', 50, 1),
  ('cabinets', 'Cabinets', 60, 1),
  ('kids', 'Kids furniture', 70, 1),
  ('office', 'Office furniture', 80, 1),
  ('tables', 'Tables', 90, 1),
  ('other', 'Other', 100, 1);
