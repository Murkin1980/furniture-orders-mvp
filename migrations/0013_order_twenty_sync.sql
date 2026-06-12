ALTER TABLE orders ADD COLUMN crm_sync_status TEXT;
ALTER TABLE orders ADD COLUMN crm_person_id TEXT;
ALTER TABLE orders ADD COLUMN crm_opportunity_id TEXT;
ALTER TABLE orders ADD COLUMN crm_note_id TEXT;
ALTER TABLE orders ADD COLUMN crm_error TEXT;
ALTER TABLE orders ADD COLUMN crm_last_attempt_at TEXT;
ALTER TABLE orders ADD COLUMN crm_synced_at TEXT;
