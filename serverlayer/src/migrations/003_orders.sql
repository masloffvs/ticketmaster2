CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(32) NOT NULL,
  user_id UUID REFERENCES users(id),
  partner_id UUID REFERENCES partners(id),
  event_id UUID REFERENCES events(id),
  external_event_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  buyer_email VARCHAR(255),
  selected_offer_snapshot JSONB,
  pricing_snapshot JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checkout_sessions_status_created_idx
  ON checkout_sessions (status, created_at);

CREATE INDEX IF NOT EXISTS checkout_sessions_partner_created_idx
  ON checkout_sessions (partner_id, created_at);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_order_no VARCHAR(32) NOT NULL,
  checkout_session_id UUID REFERENCES checkout_sessions(id),
  channel VARCHAR(32) NOT NULL,
  user_id UUID REFERENCES users(id),
  partner_id UUID REFERENCES partners(id),
  event_id UUID REFERENCES events(id),
  external_event_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  currency_code VARCHAR(8) NOT NULL DEFAULT 'USD',
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  fees_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  buyer_email VARCHAR(255),
  buyer_name VARCHAR(255),
  event_snapshot JSONB,
  expires_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_public_order_no_uidx
  ON orders (public_order_no);

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_session_uidx
  ON orders (checkout_session_id);

CREATE INDEX IF NOT EXISTS orders_partner_created_idx
  ON orders (partner_id, created_at);

CREATE INDEX IF NOT EXISTS orders_status_created_idx
  ON orders (status, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  line_no INTEGER NOT NULL,
  item_type VARCHAR(32) NOT NULL DEFAULT 'ticket',
  description TEXT,
  external_offer_id VARCHAR(255),
  external_inventory_type VARCHAR(64),
  external_place_ids JSONB,
  section VARCHAR(128),
  row_label VARCHAR(128),
  seat_from VARCHAR(64),
  seat_to VARCHAR(64),
  quantity INTEGER NOT NULL DEFAULT 1,
  currency_code VARCHAR(8) NOT NULL DEFAULT 'USD',
  unit_price_minor INTEGER NOT NULL DEFAULT 0,
  fees_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  ticket_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS order_items_order_line_uidx
  ON order_items (order_id, line_no);

CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON order_items (order_id);

CREATE TABLE IF NOT EXISTS reservation_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  provider VARCHAR(64) NOT NULL,
  provider_hold_id VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reservation_holds_order_idx
  ON reservation_holds (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS reservation_holds_provider_ref_uidx
  ON reservation_holds (provider, provider_hold_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  provider VARCHAR(64) NOT NULL,
  provider_payment_id VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  amount_minor INTEGER NOT NULL,
  currency_code VARCHAR(8) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_idempotency_uidx
  ON payment_transactions (idempotency_key);

CREATE INDEX IF NOT EXISTS payment_transactions_order_created_idx
  ON payment_transactions (order_id, created_at);

CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  event_type VARCHAR(64) NOT NULL,
  actor_type VARCHAR(32) NOT NULL,
  actor_id VARCHAR(128),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_events_order_created_idx
  ON order_events (order_id, created_at);

CREATE INDEX IF NOT EXISTS order_events_type_created_idx
  ON order_events (event_type, created_at);
