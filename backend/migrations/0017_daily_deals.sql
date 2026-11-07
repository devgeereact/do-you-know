-- The daily challenge deals each player a private hand of questions from every live quiz. This ledger
-- records which question went to which attempt, so that no two players are dealt the same question
-- until every question in the bank has been dealt once (deal_no counts the laps: 1, then 2, ...).
-- The unique key is the guarantee: even two requests at the same instant cannot both take one question.
-- quiz_version_id remembers which immutable version held the question when it was dealt. Rows go with
-- their attempt, so erasing a player erases their hands. Additive only; no existing table changes.
CREATE TABLE daily_deals (
 attempt_id CHAR(36) NOT NULL,
 position INT NOT NULL,
 daily_challenge_id CHAR(36) NOT NULL,
 quiz_version_id CHAR(36) NOT NULL,
 question_id CHAR(36) NOT NULL,
 deal_no INT NOT NULL DEFAULT 1,
 PRIMARY KEY (attempt_id,position),
 UNIQUE KEY one_player_per_question (daily_challenge_id,question_id,deal_no),
 FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
 FOREIGN KEY (daily_challenge_id) REFERENCES daily_challenges(id),
 FOREIGN KEY (quiz_version_id) REFERENCES quiz_versions(id),
 CONSTRAINT deal_positive CHECK (position >= 1 AND deal_no >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
