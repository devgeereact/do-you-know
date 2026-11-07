-- The `build` question (spell, gap, order): a child taps tiles into slots. The answer given is a short
-- list of tile labels (for example ["b","a","n","a","n","a"]), kept beside the right/wrong mark so a
-- finished game can show what was tapped. Labels only: no ids, no text typed by a child. Rows go with
-- their attempt. Additive only; no existing column or row changes.
ALTER TABLE attempt_answers ADD COLUMN chosen_json JSON NULL AFTER chosen_value;
