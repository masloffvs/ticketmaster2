import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
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
