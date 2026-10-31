-- Sourced question generator (Studio). Additive only; safe to run again after a partial failure.
--  * generator_runs: one request from a Super Admin ("10 questions on the water cycle, ages 7-11"),
--    advanced step by step (search, fetch, draft, check) so no single web request runs long.
--  * generator_pages: the text read from each trusted page, kept so every quote can be checked.
--  * generator_drafts: questions written only from those pages. A draft never publishes itself:
--    a human approves it, then sends it into a draft quiz that still goes through Check & publish.
-- No player data is stored here.
SET @dyk_collation = (SELECT collation_name FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'profiles' AND column_name = 'id');

SET @dyk_sql = CONCAT('CREATE TABLE IF NOT EXISTS generator_runs (
 id CHAR(36) PRIMARY KEY,
 created_by CHAR(36) NULL,
 topic VARCHAR(300) NOT NULL,
 category_slug VARCHAR(100) NULL,
 ages VARCHAR(10) NOT NULL,
 wanted TINYINT UNSIGNED NOT NULL,
 model VARCHAR(60) NOT NULL,
 stage VARCHAR(10) NOT NULL DEFAULT ''search'',
 sources JSON NULL,
 error VARCHAR(300) NULL,
 serp_calls SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 page_calls SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
 output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 KEY generator_runs_recent (created_at),
 FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
 CONSTRAINT generator_stage CHECK (stage IN (''search'',''fetch'',''draft'',''check'',''done'',''failed''))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=', @dyk_collation);
PREPARE dyk_stmt FROM @dyk_sql;
EXECUTE dyk_stmt;
DEALLOCATE PREPARE dyk_stmt;

SET @dyk_sql = CONCAT('CREATE TABLE IF NOT EXISTS generator_pages (
 run_id CHAR(36) NOT NULL,
 url VARCHAR(500) NOT NULL,
 text MEDIUMTEXT NOT NULL,
 fetched_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY (run_id, url),
 FOREIGN KEY (run_id) REFERENCES generator_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=', @dyk_collation);
PREPARE dyk_stmt FROM @dyk_sql;
EXECUTE dyk_stmt;
DEALLOCATE PREPARE dyk_stmt;

SET @dyk_sql = CONCAT('CREATE TABLE IF NOT EXISTS generator_drafts (
 id CHAR(36) PRIMARY KEY,
 run_id CHAR(36) NOT NULL,
 position TINYINT UNSIGNED NOT NULL,
 question JSON NOT NULL,
 quote TEXT NOT NULL,
 quote_found TINYINT(1) NOT NULL DEFAULT 0,
 on_allowlist TINYINT(1) NOT NULL DEFAULT 0,
 duplicate TINYINT(1) NOT NULL DEFAULT 0,
 problems JSON NOT NULL,
 decision VARCHAR(10) NOT NULL DEFAULT ''pending'',
 decided_by CHAR(36) NULL,
 decided_at DATETIME(6) NULL,
 sent_quiz_id CHAR(36) NULL,
 KEY generator_drafts_run (run_id, position),
 FOREIGN KEY (run_id) REFERENCES generator_runs(id) ON DELETE CASCADE,
 FOREIGN KEY (decided_by) REFERENCES profiles(id) ON DELETE SET NULL,
 FOREIGN KEY (sent_quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL,
 CONSTRAINT generator_decision CHECK (decision IN (''pending'',''approved'',''rejected'',''sent''))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=', @dyk_collation);
PREPARE dyk_stmt FROM @dyk_sql;
EXECUTE dyk_stmt;
DEALLOCATE PREPARE dyk_stmt;
