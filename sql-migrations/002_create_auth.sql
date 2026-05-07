CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_user (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE NOT NULL,
  must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  lockout_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_password (
  user_id TEXT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL
);

CREATE TABLE user_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  ua_hash TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active_expires TIMESTAMPTZ NOT NULL,
  idle_expires TIMESTAMPTZ NOT NULL
);

WITH new_admin AS (
  INSERT INTO app_user (username, must_reset_password)
  VALUES ('admin', TRUE)
  RETURNING id
)
INSERT INTO user_password (user_id, password_hash)
SELECT id, '$argon2id$v=19$m=19456,t=2,p=1$ZKuK7enn8148fPruT0Jf9A$PCG/cjaf8jRt/YggEoUFZIbn049XOdxmoRDpLKPZ3tI'
FROM new_admin;
