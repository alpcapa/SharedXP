-- Allow 'banned' as a cm_applications status for hosts permanently
-- barred from applying (e.g. illegal activity). The banner and login
-- popup will never show again for users with this status.

ALTER TABLE cm_applications
  DROP CONSTRAINT IF EXISTS cm_applications_status_check;

ALTER TABLE cm_applications
  ADD CONSTRAINT cm_applications_status_check
  CHECK (status IN ('pending', 'interview', 'accepted', 'declined', 'banned'));
