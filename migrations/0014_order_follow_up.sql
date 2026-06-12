ALTER TABLE orders ADD COLUMN follow_up_at TEXT;
ALTER TABLE orders ADD COLUMN follow_up_task TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_follow_up_at ON orders(follow_up_at);
