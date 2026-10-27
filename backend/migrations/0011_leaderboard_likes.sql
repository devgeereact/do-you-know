-- Likes on leaderboard entries. One like per player per entry; a player cannot like their own
-- entry; a like can be taken back (the row is deleted). Only counts are ever shown to players.
-- Rows go when either player is deleted or the entry is removed. Additive only.
-- 0009 is held by the stashed AI generator branch.
CREATE TABLE leaderboard_likes (
 board VARCHAR(16) NOT NULL,
 quiz_id CHAR(36) NOT NULL,
 period_start DATE NOT NULL,
 entry_user_id CHAR(36) NOT NULL,
 liker_id CHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY (board,quiz_id,period_start,entry_user_id,liker_id),
 KEY likes_by_liker (liker_id),
 FOREIGN KEY (board,quiz_id,period_start,entry_user_id)
  REFERENCES leaderboard_entries (board,quiz_id,period_start,user_id) ON DELETE CASCADE,
 FOREIGN KEY (liker_id) REFERENCES profiles(id) ON DELETE CASCADE,
 CONSTRAINT like_not_own CHECK (liker_id <> entry_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
