-- Maths and school maths are the same subject, so the live site showed two Maths tiles.
-- Keep the older `maths` category: move every quiz from `school-maths` into it, then hide
-- `school-maths` (not deleted, so this can be undone). Does nothing where `maths` is missing.
-- 0009 is held by the stashed AI generator branch.
UPDATE quizzes q
  JOIN categories s ON s.id = q.category_id AND s.slug = 'school-maths'
  JOIN categories m ON m.slug = 'maths'
  SET q.category_id = m.id;
UPDATE categories s
  JOIN categories m ON m.slug = 'maths'
  SET s.is_active = 0
  WHERE s.slug = 'school-maths';
