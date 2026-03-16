-- 001_init.sql — Initial schema
-- Creates users, artists, events tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(128),
  image_url TEXT,
  external_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(512) NOT NULL,
  description TEXT,
  artist_id UUID REFERENCES artists(id),
  venue VARCHAR(512),
  city VARCHAR(255),
  country VARCHAR(128),
  date TIMESTAMPTZ,
  image_url TEXT,
  ticket_url TEXT,
  min_price INTEGER,
  max_price INTEGER,
  currency VARCHAR(8) DEFAULT 'USD',
  is_sold_out BOOLEAN DEFAULT FALSE,
  external_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);