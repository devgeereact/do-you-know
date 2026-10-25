CREATE TABLE daily_challenges (
 id CHAR(36) PRIMARY KEY,
 challenge_date DATE NOT NULL UNIQUE,
 quiz_id CHAR(36) NOT NULL,
 quiz_version_id CHAR(36) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
 FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
 FOREIGN KEY (quiz_version_id) REFERENCES quiz_versions(id),
 CONSTRAINT daily_status CHECK (status IN ('scheduled','live','done'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE friend_challenges (
 id CHAR(36) PRIMARY KEY,
 code VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 quiz_id CHAR(36) NOT NULL,
 quiz_version_id CHAR(36) NOT NULL,
 creator_id CHAR(36) NOT NULL,
 creator_attempt_id CHAR(36) NOT NULL,
 expires_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY challenge_creator (creator_attempt_id,expires_at),
 FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
 FOREIGN KEY (quiz_version_id) REFERENCES quiz_versions(id),
 FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY (creator_attempt_id) REFERENCES attempts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE attempts
 ADD COLUMN daily_challenge_id CHAR(36) NULL,
 ADD COLUMN friend_challenge_id CHAR(36) NULL,
 ADD COLUMN time_limit_seconds INT NULL,
 ADD COLUMN shuffle_options BOOLEAN NOT NULL DEFAULT TRUE,
 ADD UNIQUE KEY one_daily_per_player (user_id,daily_challenge_id),
 ADD FOREIGN KEY (daily_challenge_id) REFERENCES daily_challenges(id),
 ADD FOREIGN KEY (friend_challenge_id) REFERENCES friend_challenges(id) ON DELETE SET NULL,
 ADD CONSTRAINT attempt_mode CHECK (mode IN ('practice','ranked','daily','challenge')),
 ADD CONSTRAINT attempt_status CHECK (status IN ('in_progress','finished','abandoned'));

UPDATE attempts a JOIN quizzes q ON q.id=a.quiz_id
 SET a.time_limit_seconds=q.time_limit_seconds,a.shuffle_options=q.shuffle_options;

CREATE TABLE leaderboard_entries (
 board VARCHAR(16) NOT NULL,
 quiz_id CHAR(36) NOT NULL,
 period_start DATE NOT NULL,
 user_id CHAR(36) NOT NULL,
 attempt_id CHAR(36) NOT NULL,
 correct_count INT NOT NULL,
 total INT NOT NULL,
 answer_time_ms INT NOT NULL,
 achieved_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY (board,quiz_id,period_start,user_id),
 KEY board_order (board,quiz_id,period_start,correct_count,answer_time_ms,achieved_at),
 FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
 FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
 CONSTRAINT board_type CHECK (board IN ('all_time','weekly','daily')),
 CONSTRAINT board_score CHECK (correct_count BETWEEN 0 AND total AND total BETWEEN 3 AND 50),
 CONSTRAINT board_time CHECK (answer_time_ms >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
