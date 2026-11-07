-- Parent area (P4). A child is an ordinary profile (it plays through a guest session) plus one row here that
-- links it to its parent's profile and holds the level the parent chose. Nothing typed is stored: the
-- nickname is generated, the avatar is one of the presets, the level is one of five names.
-- The parent's switches live in parent_settings, one row per parent, all off until the parent turns one on.
-- Deleting a parent profile removes these rows; Player::delete also removes the child profiles themselves.
-- Additive only; no existing table or row changes.
CREATE TABLE IF NOT EXISTS children (
 profile_id CHAR(36) NOT NULL PRIMARY KEY,
 parent_profile_id CHAR(36) NOT NULL,
 level VARCHAR(16) NOT NULL DEFAULT 'starters',
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY children_parent (parent_profile_id),
 CONSTRAINT children_level CHECK (level IN ('starters','explorers','adventurers','challengers','scholars')),
 FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY (parent_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parent_settings (
 parent_profile_id CHAR(36) NOT NULL PRIMARY KEY,
 public_boards BOOLEAN NOT NULL DEFAULT FALSE,
 challenge_friend BOOLEAN NOT NULL DEFAULT FALSE,
 beat_clock BOOLEAN NOT NULL DEFAULT FALSE,
 slider_questions BOOLEAN NOT NULL DEFAULT FALSE,
 trivia_sets BOOLEAN NOT NULL DEFAULT FALSE,
 sound BOOLEAN NOT NULL DEFAULT FALSE,
 easy_read BOOLEAN NOT NULL DEFAULT FALSE,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 FOREIGN KEY (parent_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
