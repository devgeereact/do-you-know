-- Clerk subjects are case-sensitive; the database must not merge different IDs.
ALTER TABLE identities
 MODIFY provider VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 MODIFY subject VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;
