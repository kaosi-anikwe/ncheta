-- Ncheta Magazine Store — initial schema
-- Apply with: wrangler d1 execute ncheta-store --file=./migrations/0001_create_store_tables.sql

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  reference       TEXT UNIQUE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  order_type      TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  subtotal        INTEGER NOT NULL,
  shipping_cost   INTEGER NOT NULL DEFAULT 0,
  tax_amount      INTEGER NOT NULL DEFAULT 0,
  total_amount    INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'NGN',
  ship_line1      TEXT,
  ship_line2      TEXT,
  ship_city       TEXT,
  ship_state      TEXT,
  ship_country    TEXT,
  ship_postal     TEXT,
  dhl_quote_json          TEXT,
  dhl_origin_snapshot_json TEXT,
  tracking_number  TEXT,
  dispatched_at    TEXT,
  paystack_reference   TEXT,
  paystack_access_code TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id     TEXT NOT NULL,
  book_title  TEXT NOT NULL,
  book_slug   TEXT NOT NULL,
  format      TEXT NOT NULL,
  unit_price  INTEGER NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  r2_key      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS download_tokens (
  id              TEXT PRIMARY KEY,
  order_item_id   TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  r2_key          TEXT NOT NULL,
  book_title      TEXT NOT NULL,
  format          TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  download_count  INTEGER NOT NULL DEFAULT 0,
  max_downloads   INTEGER NOT NULL DEFAULT 3,
  expires_at      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id            TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,
  payload_json  TEXT NOT NULL,
  processed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS book_inventory (
  id          TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL,
  book_slug   TEXT NOT NULL,
  format      TEXT NOT NULL DEFAULT 'physical',
  stock       INTEGER NOT NULL DEFAULT 0,
  reserved    INTEGER NOT NULL DEFAULT 0,
  sold        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(book_id, format)
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code        TEXT NOT NULL,
  email_token TEXT,
  expires_at  TEXT NOT NULL,
  verified_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_reference       ON orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email  ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_order  ON download_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_ev_email               ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_inventory_book         ON book_inventory(book_id, format);
