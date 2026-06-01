ALTER TABLE calculator_fields ADD COLUMN state TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE calculator_fields ADD COLUMN role TEXT NOT NULL DEFAULT 'pricing_input';
ALTER TABLE calculator_fields ADD COLUMN binding TEXT;
ALTER TABLE calculator_fields ADD COLUMN options_source TEXT;
ALTER TABLE calculator_fields ADD COLUMN is_required INTEGER NOT NULL DEFAULT 0;

UPDATE calculator_fields
SET
  role = CASE
    WHEN field_code IN ('name', 'phone', 'city', 'comment') THEN 'lead_input'
    ELSE 'pricing_input'
  END,
  binding = CASE
    WHEN field_code = 'categorycode' THEN 'categoryCode'
    WHEN field_code = 'materialrulecode' THEN 'materialRuleCode'
    ELSE field_code
  END,
  options_source = CASE
    WHEN field_code = 'categorycode' THEN 'prices'
    WHEN field_code = 'materialrulecode' THEN 'multiplier_rules'
    ELSE NULL
  END,
  is_required = CASE
    WHEN field_code IN ('categorycode', 'units', 'materialrulecode', 'name', 'phone') THEN 1
    ELSE 0
  END
WHERE state = 'draft';

DROP INDEX IF EXISTS idx_calculator_fields_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_fields_unique_state
  ON calculator_fields(calculator_id, field_code, state);
