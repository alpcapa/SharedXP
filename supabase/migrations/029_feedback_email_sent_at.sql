-- Tracks whether the post-event feedback email has been sent to the requester.
-- Null = not yet sent. Set to the current timestamp when the email fires,
-- preventing duplicate sends if multiple clients check simultaneously.
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS feedback_email_sent_at TIMESTAMPTZ;
