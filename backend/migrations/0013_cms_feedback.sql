-- Admin content studio, fair overall boards and player feedback. Additive only; every statement
-- is written to be safe if it is run again after a partial failure.
--  * quizzes.draft holds the CMS work copy {"meta":{...},"questions":[...]} beside the live version.
--  * quiz_versions.created_at dates each version (rows that already exist get the migration time).
--  * content_reviews now also records checks, retirements, restores and unpublishing.
--  * attempts.is_hidden lets the owner hide a round from every board, and attempts_period serves
--    the overall leaderboard (finished ranked and daily rounds in a period).
--  * feedback and feedback_messages hold player feedback. Free text and an email address are only
--    ever stored for adults and teenagers (enforced in Feedback.php), never for children.
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS draft JSON NULL;

ALTER TABLE quiz_versions ADD COLUMN IF NOT EXISTS created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);

ALTER TABLE content_reviews DROP CONSTRAINT IF EXISTS review_action,
 ADD CONSTRAINT review_action CHECK (action IN ('published','checked','retired','restored','unpublished'));

ALTER TABLE attempts
 ADD COLUMN IF NOT EXISTS is_hidden TINYINT(1) NOT NULL DEFAULT 0,
 ADD KEY IF NOT EXISTS attempts_period (status, mode, finished_at);

-- New tables take the collation of profiles.id, so their foreign keys match the existing tables
-- whatever the server's default collation for utf8mb4 is.
SET @dyk_collation = (SELECT collation_name FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'profiles' AND column_name = 'id');

SET @dyk_sql = CONCAT('CREATE TABLE IF NOT EXISTS feedback (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NULL,
 kind VARCHAR(8) NOT NULL,
 type VARCHAR(16) NOT NULL,
 presets JSON NOT NULL,
 message TEXT NULL,
 email VARCHAR(254) NULL,
 quiz_id CHAR(36) NULL,
 question_id CHAR(36) NULL,
 question_prompt VARCHAR(300) NULL,
 status VARCHAR(10) NOT NULL DEFAULT ''new'',
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY feedback_queue (status, created_at),
 FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
 FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL,
 CONSTRAINT feedback_kind CHECK (kind IN (''player'',''adult'')),
 CONSTRAINT feedback_type CHECK (type IN (''feedback'',''question'',''idea'',''problem'')),
 CONSTRAINT feedback_status CHECK (status IN (''new'',''open'',''resolved''))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=', @dyk_collation);
PREPARE dyk_stmt FROM @dyk_sql;
EXECUTE dyk_stmt;
DEALLOCATE PREPARE dyk_stmt;

SET @dyk_sql = CONCAT('CREATE TABLE IF NOT EXISTS feedback_messages (
 id CHAR(36) PRIMARY KEY,
 feedback_id CHAR(36) NOT NULL,
 kind VARCHAR(8) NOT NULL,
 body TEXT NOT NULL,
 author_id CHAR(36) NULL,
 emailed TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY feedback_thread (feedback_id, created_at),
 FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
 FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL,
 CONSTRAINT feedback_message_kind CHECK (kind IN (''reply'',''note''))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=', @dyk_collation);
PREPARE dyk_stmt FROM @dyk_sql;
EXECUTE dyk_stmt;
DEALLOCATE PREPARE dyk_stmt;
