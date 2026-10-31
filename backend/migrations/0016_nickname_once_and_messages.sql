-- Owner request, 31 October 2026. Additive; safe to run again.
--  * profiles.nickname_changed_at: a player may change the nickname they were given exactly once,
--    so friends can always tell who they are playing with. NULL = the one change is still unused.
--  * feedback.player_seen_at: when the player last opened their messages, for the unread dot.
--  * feedback_messages kind 'player': a written answer from a teenager or adult, shown to staff in
--    the Studio inbox. Replies and answers stay on the site; no email is needed.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname_changed_at DATETIME(6) NULL;

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS player_seen_at DATETIME(6) NULL;

ALTER TABLE feedback_messages DROP CONSTRAINT IF EXISTS feedback_message_kind,
 ADD CONSTRAINT feedback_message_kind CHECK (kind IN ('reply','note','player'));
