import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Users ──────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Artists ────────────────────────────────────────────────────
export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 128 }),
  imageUrl: text("image_url"),
  externalId: varchar("external_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Events ─────────────────────────────────────────────────────
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 512 }).notNull(),
  description: text("description"),
  artistId: uuid("artist_id").references(() => artists.id),
  venue: varchar("venue", { length: 512 }),
  city: varchar("city", { length: 255 }),
  country: varchar("country", { length: 128 }),
  date: timestamp("date", { withTimezone: true }),
  imageUrl: text("image_url"),
  ticketUrl: text("ticket_url"),
  minPrice: integer("min_price"),
  maxPrice: integer("max_price"),
  currency: varchar("currency", { length: 8 }).default("USD"),
  isSoldOut: boolean("is_sold_out").default(false),
  externalId: varchar("external_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Email Deliveries ───────────────────────────────────────────
export const emailDeliveries = pgTable("email_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: varchar("provider", { length: 64 }).notNull(),
  messageId: varchar("message_id", { length: 255 }),
  toEmails: text("to_emails").array().notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  responseStatus: integer("response_status"),
  requestPayload: text("request_payload"),
  responseBody: text("response_body"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Partners ───────────────────────────────────────────────────
export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  publicKeyJwk: text("public_key_jwk").notNull(),
  publicKeyFingerprint: varchar("public_key_fingerprint", {
    length: 128,
  }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const partnerDomains = pgTable(
  "partner_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    domain: varchar("domain", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    partnerDomainUidx: uniqueIndex("partner_domains_domain_uidx").on(
      table.domain,
    ),
    partnerDomainPartnerIdx: index("partner_domains_partner_idx").on(
      table.partnerId,
    ),
  }),
);

export const partnerChallenges = pgTable("partner_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id),
  nonce: varchar("nonce", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const partnerSessions = pgTable("partner_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

// ─── Checkout Sessions ──────────────────────────────────────────
export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: varchar("channel", { length: 32 }).notNull(),
    userId: uuid("user_id").references(() => users.id),
    partnerId: uuid("partner_id").references(() => partners.id),
    eventId: uuid("event_id").references(() => events.id),
    externalEventId: varchar("external_event_id", { length: 128 }),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    buyerEmail: varchar("buyer_email", { length: 255 }),
    selectedOfferSnapshot: jsonb("selected_offer_snapshot"),
    pricingSnapshot: jsonb("pricing_snapshot"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    checkoutSessionStatusCreatedIdx: index(
      "checkout_sessions_status_created_idx",
    ).on(table.status, table.createdAt),
    checkoutSessionPartnerCreatedIdx: index(
      "checkout_sessions_partner_created_idx",
    ).on(table.partnerId, table.createdAt),
  }),
);

// ─── Orders ─────────────────────────────────────────────────────
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicOrderNo: varchar("public_order_no", { length: 32 }).notNull(),
    checkoutSessionId: uuid("checkout_session_id").references(
      () => checkoutSessions.id,
    ),
    channel: varchar("channel", { length: 32 }).notNull(),
    userId: uuid("user_id").references(() => users.id),
    partnerId: uuid("partner_id").references(() => partners.id),
    eventId: uuid("event_id").references(() => events.id),
    externalEventId: varchar("external_event_id", { length: 128 }),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    currencyCode: varchar("currency_code", { length: 8 })
      .notNull()
      .default("USD"),
    subtotalMinor: integer("subtotal_minor").notNull().default(0),
    feesMinor: integer("fees_minor").notNull().default(0),
    taxMinor: integer("tax_minor").notNull().default(0),
    discountMinor: integer("discount_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull().default(0),
    buyerEmail: varchar("buyer_email", { length: 255 }),
    buyerName: varchar("buyer_name", { length: 255 }),
    eventSnapshot: jsonb("event_snapshot"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orderPublicNoUidx: uniqueIndex("orders_public_order_no_uidx").on(
      table.publicOrderNo,
    ),
    orderCheckoutSessionUidx: uniqueIndex("orders_checkout_session_uidx").on(
      table.checkoutSessionId,
    ),
    orderPartnerCreatedIdx: index("orders_partner_created_idx").on(
      table.partnerId,
      table.createdAt,
    ),
    orderStatusCreatedIdx: index("orders_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

// ─── Order Items ────────────────────────────────────────────────
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    lineNo: integer("line_no").notNull(),
    itemType: varchar("item_type", { length: 32 }).notNull().default("ticket"),
    description: text("description"),
    externalOfferId: varchar("external_offer_id", { length: 255 }),
    externalInventoryType: varchar("external_inventory_type", { length: 64 }),
    externalPlaceIds: jsonb("external_place_ids"),
    section: varchar("section", { length: 128 }),
    rowLabel: varchar("row_label", { length: 128 }),
    seatFrom: varchar("seat_from", { length: 64 }),
    seatTo: varchar("seat_to", { length: 64 }),
    quantity: integer("quantity").notNull().default(1),
    currencyCode: varchar("currency_code", { length: 8 })
      .notNull()
      .default("USD"),
    unitPriceMinor: integer("unit_price_minor").notNull().default(0),
    feesMinor: integer("fees_minor").notNull().default(0),
    taxMinor: integer("tax_minor").notNull().default(0),
    discountMinor: integer("discount_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull().default(0),
    ticketSnapshot: jsonb("ticket_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orderItemOrderLineUidx: uniqueIndex("order_items_order_line_uidx").on(
      table.orderId,
      table.lineNo,
    ),
    orderItemOrderIdx: index("order_items_order_idx").on(table.orderId),
  }),
);

// ─── Reservation Holds ──────────────────────────────────────────
export const reservationHolds = pgTable(
  "reservation_holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerHoldId: varchar("provider_hold_id", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (table) => ({
    reservationHoldOrderIdx: index("reservation_holds_order_idx").on(
      table.orderId,
    ),
    reservationHoldProviderRefUidx: uniqueIndex(
      "reservation_holds_provider_ref_uidx",
    ).on(table.provider, table.providerHoldId),
  }),
);

// ─── Payment Transactions ───────────────────────────────────────
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerPaymentId: varchar("provider_payment_id", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    amountMinor: integer("amount_minor").notNull(),
    currencyCode: varchar("currency_code", { length: 8 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
  },
  (table) => ({
    paymentTransactionIdempotencyUidx: uniqueIndex(
      "payment_transactions_idempotency_uidx",
    ).on(table.idempotencyKey),
    paymentTransactionOrderCreatedIdx: index(
      "payment_transactions_order_created_idx",
    ).on(table.orderId, table.createdAt),
  }),
);

// ─── Order Events ───────────────────────────────────────────────
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    actorType: varchar("actor_type", { length: 32 }).notNull(),
    actorId: varchar("actor_id", { length: 128 }),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orderEventOrderCreatedIdx: index("order_events_order_created_idx").on(
      table.orderId,
      table.createdAt,
    ),
    orderEventTypeCreatedIdx: index("order_events_type_created_idx").on(
      table.eventType,
      table.createdAt,
    ),
  }),
);
