CREATE TABLE IF NOT EXISTS content_reviews (
 id CHAR(36) PRIMARY KEY,
 quiz_id CHAR(36) NOT NULL,
 quiz_version_id CHAR(36) NOT NULL,
 reviewed_by VARCHAR(100) NOT NULL,
 action VARCHAR(16) NOT NULL,
 reviewed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY review_quiz (quiz_id,reviewed_at),
 FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
 FOREIGN KEY (quiz_version_id) REFERENCES quiz_versions(id) ON DELETE CASCADE,
 CONSTRAINT review_action CHECK (action IN ('published'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
