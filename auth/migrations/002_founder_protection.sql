-- Run after auth/schema.sql. Founder status is set only during verified provisioning.
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS one_founder_account ON staff_users (is_founder) WHERE is_founder = TRUE;
CREATE OR REPLACE FUNCTION protect_founder_account() RETURNS trigger AS $$
BEGIN
 IF TG_OP = 'DELETE' AND OLD.is_founder THEN
  RAISE EXCEPTION 'Founder account cannot be deleted through normal account management';
 END IF;
 IF TG_OP = 'UPDATE' AND OLD.is_founder AND
    (NEW.is_founder IS DISTINCT FROM TRUE OR NEW.role IS DISTINCT FROM 'administrator'
      OR NEW.active IS DISTINCT FROM TRUE OR NEW.email IS DISTINCT FROM OLD.email) THEN
  RAISE EXCEPTION 'Founder account cannot be deactivated, demoted or reassigned';
 END IF;
 RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS founder_account_guard ON staff_users;
CREATE TRIGGER founder_account_guard BEFORE UPDATE OR DELETE ON staff_users
 FOR EACH ROW EXECUTE FUNCTION protect_founder_account();
