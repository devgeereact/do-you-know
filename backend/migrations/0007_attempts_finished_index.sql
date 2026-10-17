-- Trending reads finished attempts from the last 7 days. Without this index the query scans
-- every attempt as the table grows. Additive only.
ALTER TABLE attempts ADD INDEX attempts_finished (status, finished_at, quiz_id);
