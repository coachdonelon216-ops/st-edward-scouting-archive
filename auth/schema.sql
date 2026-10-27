CREATE TABLE IF NOT EXISTS staff_users (
 id BIGSERIAL PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('administrator','coach','read_only')),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS staff_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS staff_sessions_expiry ON staff_sessions(expires_at);
