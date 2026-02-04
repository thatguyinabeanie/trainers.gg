-- Tighten the action_url constraint on notifications to block
-- protocol-relative URLs (//evil.com) and backslash bypasses (/\).
-- The old CHECK only required LIKE '/%' which matched those patterns.

ALTER TABLE notifications
  DROP CONSTRAINT notifications_action_url_relative,
  ADD CONSTRAINT notifications_action_url_relative
    CHECK (action_url IS NULL OR action_url ~ '^/[^/\\]');
