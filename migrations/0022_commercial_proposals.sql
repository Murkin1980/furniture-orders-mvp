CREATE TABLE IF NOT EXISTS commercial_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'approved', 'sent', 'archived')),
  current_version INTEGER NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  approved_version INTEGER CHECK (approved_version IS NULL OR approved_version > 0),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commercial_proposal_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published')),
  payload_json TEXT NOT NULL,
  html_snapshot TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_by TEXT NOT NULL DEFAULT 'manager',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  FOREIGN KEY (proposal_id) REFERENCES commercial_proposals(id) ON DELETE CASCADE,
  UNIQUE (proposal_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_commercial_proposals_order_id
  ON commercial_proposals(order_id);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_status
  ON commercial_proposals(status);
CREATE INDEX IF NOT EXISTS idx_commercial_proposal_versions_proposal
  ON commercial_proposal_versions(proposal_id, version_number DESC);
