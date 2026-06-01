ALTER TABLE portfolio_images ADD COLUMN storage_key TEXT;
ALTER TABLE portfolio_images ADD COLUMN mime_type TEXT;
ALTER TABLE portfolio_images ADD COLUMN size_bytes INTEGER;

CREATE INDEX IF NOT EXISTS idx_portfolio_images_storage_key
  ON portfolio_images(storage_key);
