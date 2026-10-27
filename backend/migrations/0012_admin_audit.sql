-- Admin area audit log: one row per admin write. Holds no personal data (ids and small
-- JSON details only). The actor is kept as NULL if that profile is later deleted. Additive only.
CREATE TABLE admin_audit (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 actor_id CHAR(36) NULL,
 action VARCHAR(64) NOT NULL,
 target_type VARCHAR(32) NULL,
 target_id VARCHAR(64) NULL,
 detail JSON NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY audit_recent (created_at),
 FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
