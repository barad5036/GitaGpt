-- GitaGPT Production PostgreSQL 16 + pgvector Schema (with Row-Level Security & Envelope Encryption)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. users (Stores wrapped per-user DEK and encrypted PII)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_blind_index VARCHAR(64) UNIQUE NOT NULL,
  encrypted_email TEXT NOT NULL,
  encrypted_name TEXT NOT NULL,
  wrapped_dek TEXT NOT NULL,
  dek_version INTEGER NOT NULL DEFAULT 1,
  daily_quota_used INTEGER NOT NULL DEFAULT 0,
  quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_blind ON users(email_blind_index);

-- 2. auth_identities (Google OAuth & Email OTP links)
CREATE TABLE IF NOT EXISTS auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL, -- 'google' | 'email_otp'
  provider_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);

-- 3. refresh_tokens (Hashed rotating refresh tokens with reuse-detection family_id)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  family_id UUID NOT NULL,
  replaced_by_hash VARCHAR(64),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);

-- 4. conversations (Encrypted titles + per-user HMAC blind index tokens)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_title TEXT NOT NULL,
  title_blind_index TEXT[] NOT NULL DEFAULT '{}',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_blind_gin ON conversations USING GIN(title_blind_index);

-- 5. messages (AES-256-GCM encrypted message content with AAD = user_id|id|content)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  encrypted_content TEXT NOT NULL,
  search_blind_index TEXT[] NOT NULL DEFAULT '{}',
  verse_ref VARCHAR(16),
  feedback VARCHAR(8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_search_gin ON messages USING GIN(search_blind_index);

-- 6. memories (Opt-in AES-256-GCM encrypted friend memories)
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_memory_text TEXT NOT NULL,
  category VARCHAR(32) NOT NULL DEFAULT 'personal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, created_at DESC);

-- 7. settings (Per-user UI & privacy preferences)
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(16) NOT NULL DEFAULT 'hi',
  theme VARCHAR(24) NOT NULL DEFAULT 'peacock',
  auto_read BOOLEAN NOT NULL DEFAULT TRUE,
  voice_engine VARCHAR(24) NOT NULL DEFAULT 'piper',
  piper_voice_id VARCHAR(64) NOT NULL DEFAULT 'en_US-hfc_male-medium',
  speech_rate REAL NOT NULL DEFAULT 1.0,
  memory_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. consent_log (Immutable record of user privacy/memory opt-in & terms consent)
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(64) NOT NULL, -- 'privacy_terms_v1' | 'memory_opt_in'
  granted BOOLEAN NOT NULL,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user ON consent_log(user_id, created_at DESC);

-- 9. verses (Canonical Bhagavad Gita scripture corpus)
CREATE TABLE IF NOT EXISTS verses (
  id SERIAL PRIMARY KEY,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  shlok TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  meaning_hi TEXT NOT NULL,
  meaning_en TEXT NOT NULL,
  daily_life_hi TEXT NOT NULL,
  daily_life_en TEXT NOT NULL,
  source_url TEXT NOT NULL,
  UNIQUE(chapter, verse)
);

-- 10. verse_embeddings (pgvector 384-dim semantic embeddings for RAG)
CREATE TABLE IF NOT EXISTS verse_embeddings (
  verse_id INTEGER PRIMARY KEY REFERENCES verses(id) ON DELETE CASCADE,
  embedding vector(384) NOT NULL,
  model_name VARCHAR(128) NOT NULL DEFAULT 'all-MiniLM-L6-v2'
);

CREATE INDEX IF NOT EXISTS idx_verse_embeddings_hnsw
  ON verse_embeddings USING hnsw (embedding vector_cosine_ops);

-- 11. audit_log (Security audit trail — NEVER logs plaintext messages or keys)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);

-- ============================================================================
-- PostgreSQL Row-Level Security (RLS) for Strict Per-User Isolation
-- Backend sets `SET LOCAL app.current_user_id = '<uuid>';` inside transactions
-- ============================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_conversations ON conversations
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY user_isolation_messages ON messages
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY user_isolation_memories ON memories
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY user_isolation_settings ON settings
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY user_isolation_consent ON consent_log
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY user_isolation_refresh_tokens ON refresh_tokens
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
