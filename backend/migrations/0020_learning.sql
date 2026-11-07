-- Adaptive learning sessions (P5). A "learn" attempt is a hand of 10 questions dealt from the child's level and
-- step in one area (literacy, numeracy, science, humanities), with up to 2 questions the child got wrong before.
-- Everything here hangs off the child's profile and holds ids, counts and dates only: no names, no text.
-- Relaxes the attempt mode check (old code only ever writes the old modes) and adds new tables.
ALTER TABLE attempts DROP CONSTRAINT attempt_mode;
ALTER TABLE attempts
 ADD CONSTRAINT attempt_mode CHECK (mode IN ('practice','ranked','daily','challenge','learn')),
 ADD COLUMN learn_area VARCHAR(16) NULL,
 ADD COLUMN learn_result JSON NULL;

-- Where each question of a learn hand came from: position => the immutable quiz version that held it.
CREATE TABLE IF NOT EXISTS learn_cards (
 attempt_id CHAR(36) NOT NULL,
 position INT NOT NULL,
 quiz_version_id CHAR(36) NOT NULL,
 question_id CHAR(36) NOT NULL,
 source VARCHAR(8) NOT NULL DEFAULT 'fresh',
 PRIMARY KEY (attempt_id,position),
 KEY learn_cards_question (question_id),
 CONSTRAINT learn_cards_source CHECK (source IN ('fresh','retry')),
 FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The skill record: one row per child and area. step 1 to 5 inside the child's level.
CREATE TABLE IF NOT EXISTS skills (
 profile_id CHAR(36) NOT NULL,
 area VARCHAR(16) NOT NULL,
 step TINYINT NOT NULL DEFAULT 2,
 high_run TINYINT NOT NULL DEFAULT 0,
 step_changed_on DATE NULL,
 sessions INT NOT NULL DEFAULT 0,
 recent JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY (profile_id,area),
 CONSTRAINT skills_step CHECK (step BETWEEN 1 AND 5),
 CONSTRAINT skills_area CHECK (area IN ('literacy','numeracy','science','humanities')),
 FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Questions a child got wrong, waiting to come back (at most 2 a session, gone after one right answer).
CREATE TABLE IF NOT EXISTS retry_questions (
 profile_id CHAR(36) NOT NULL,
 question_id CHAR(36) NOT NULL,
 area VARCHAR(16) NOT NULL,
 quiz_id CHAR(36) NOT NULL,
 added_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY (profile_id,question_id),
 KEY retry_area (profile_id,area,added_at),
 FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stickers (
 profile_id CHAR(36) NOT NULL,
 sticker_id VARCHAR(32) NOT NULL,
 earned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY (profile_id,sticker_id),
 FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
