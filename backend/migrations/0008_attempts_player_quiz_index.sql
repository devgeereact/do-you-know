-- Starting a round reads this player's earlier attempts at the same quiz so unseen questions
-- come first. Without this index that read scans every attempt the player has made. Additive only.
ALTER TABLE attempts ADD INDEX attempts_player_quiz (user_id, quiz_id, started_at);
