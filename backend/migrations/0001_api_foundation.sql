CREATE TABLE IF NOT EXISTS profiles (
 id CHAR(36) PRIMARY KEY,
 role VARCHAR(16) NOT NULL DEFAULT 'guest',
 nickname VARCHAR(20) NULL,
 age_band VARCHAR(16) NULL,
 streak_current INT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT profiles_role CHECK (role IN ('guest','player','editor','admin')),
 CONSTRAINT profiles_age CHECK (age_band IS NULL OR age_band IN ('under_13','13_17','18_plus'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS identities (
 provider VARCHAR(32) NOT NULL,
 subject VARCHAR(191) NOT NULL,
 profile_id CHAR(36) NOT NULL,
 PRIMARY KEY (provider,subject),
 UNIQUE KEY identities_profile_provider (profile_id,provider),
 FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS guest_sessions (
 token_hash CHAR(64) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 expires_at DATETIME(6) NOT NULL,
 KEY guest_expiry (expires_at),
 FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rate_limits (
 bucket_hash CHAR(64) PRIMARY KEY,
 hits INT NOT NULL,
 expires_at DATETIME NOT NULL,
 KEY rate_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS categories (
 id CHAR(36) PRIMARY KEY,
 slug VARCHAR(100) NOT NULL UNIQUE,
 name VARCHAR(160) NOT NULL,
 description TEXT NULL,
 kind VARCHAR(16) NOT NULL DEFAULT 'general',
 icon VARCHAR(255) NULL,
 scene VARCHAR(100) NULL,
 sort_order INT NOT NULL DEFAULT 0,
 is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS quizzes (
 id CHAR(36) PRIMARY KEY,
 slug VARCHAR(100) NOT NULL UNIQUE,
 title VARCHAR(255) NOT NULL,
 intro TEXT NULL,
 category_id CHAR(36) NULL,
 difficulty VARCHAR(16) NOT NULL DEFAULT 'medium',
 cover_image_url TEXT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'draft',
 current_version_id CHAR(36) NULL,
 time_limit_seconds INT NULL,
 shuffle_options BOOLEAN NOT NULL DEFAULT TRUE,
 question_count INT NOT NULL DEFAULT 3,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
 CONSTRAINT quiz_count CHECK (question_count BETWEEN 3 AND 50),
 CONSTRAINT quiz_timer CHECK (time_limit_seconds IS NULL OR time_limit_seconds BETWEEN 5 AND 120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS quiz_versions (
 id CHAR(36) PRIMARY KEY,
 quiz_id CHAR(36) NOT NULL,
 version INT NOT NULL,
 snapshot JSON NOT NULL,
 question_count INT NOT NULL,
 UNIQUE KEY quiz_version (quiz_id,version),
 FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS attempts (
 id CHAR(36) PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 quiz_id CHAR(36) NOT NULL,
 quiz_version_id CHAR(36) NOT NULL,
 mode VARCHAR(16) NOT NULL DEFAULT 'practice',
 status VARCHAR(16) NOT NULL DEFAULT 'in_progress',
 question_order JSON NOT NULL,
 current_index INT NOT NULL DEFAULT 0,
 answered_count INT NOT NULL DEFAULT 0,
 correct_count INT NOT NULL DEFAULT 0,
 answer_time_ms INT NOT NULL DEFAULT 0,
 started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 current_sent_at DATETIME(6) NULL,
 finished_at DATETIME(6) NULL,
 KEY attempts_owner (user_id,started_at),
 FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
 FOREIGN KEY (quiz_version_id) REFERENCES quiz_versions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS attempt_answers (
 attempt_id CHAR(36) NOT NULL,
 position INT NOT NULL,
 question_id CHAR(36) NOT NULL,
 chosen_option_id CHAR(36) NULL,
 chosen_value DOUBLE NULL,
 is_correct BOOLEAN NOT NULL,
 timed_out BOOLEAN NOT NULL,
 time_ms INT NOT NULL,
 PRIMARY KEY (attempt_id,position),
 FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
