CREATE TABLE IF NOT EXISTS partner_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  domain VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_domains_domain_uidx
  ON partner_domains (domain);

CREATE INDEX IF NOT EXISTS partner_domains_partner_idx
  ON partner_domains (partner_id);
