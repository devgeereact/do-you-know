-- Content pipeline, slice 2 (docs/CONTENT-PIPELINE-DESIGN.md): adding questions is safe to repeat, and a batch can be listed on its own.
-- content_hash is set only for quizzes made by Studio import: a fingerprint of the category and the questions, so the same
-- import pressed twice makes one quiz. The unique index also stops two requests racing. NULL (hand-written quizzes and
-- everything made before this) is never compared. batch_id groups the quizzes one Add action made.
ALTER TABLE quizzes
 ADD COLUMN content_hash CHAR(64) NULL,
 ADD COLUMN batch_id CHAR(36) NULL,
 ADD UNIQUE INDEX quizzes_content_hash (content_hash),
 ADD INDEX quizzes_batch (batch_id);
