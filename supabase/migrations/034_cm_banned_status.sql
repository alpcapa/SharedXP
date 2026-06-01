-- Allow 'banned' as a cm_profiles status for CMs permanently barred
-- due to illegal activity. Banner and login popup never show again
-- for users whose cm_profiles.status is 'banned'.

ALTER TABLE cm_profiles
  DROP CONSTRAINT IF EXISTS cm_profiles_status_check;

ALTER TABLE cm_profiles
  ADD CONSTRAINT cm_profiles_status_check
  CHECK (status IN ('active', 'paused', 'revoked', 'banned'));
