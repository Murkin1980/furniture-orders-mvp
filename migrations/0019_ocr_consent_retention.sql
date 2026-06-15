ALTER TABLE ocr_recognitions ADD COLUMN consent_status TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE ocr_recognitions ADD COLUMN consent_policy_version TEXT;
ALTER TABLE ocr_recognitions ADD COLUMN consent_confirmed_by TEXT;
ALTER TABLE ocr_recognitions ADD COLUMN consent_confirmed_at TEXT;
ALTER TABLE ocr_recognitions ADD COLUMN retention_until TEXT;
ALTER TABLE ocr_recognitions ADD COLUMN deleted_by TEXT;
ALTER TABLE ocr_recognitions ADD COLUMN deleted_at TEXT;
ALTER TABLE ocr_recognitions ADD COLUMN deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_ocr_recognitions_retention_until
  ON ocr_recognitions(retention_until);
