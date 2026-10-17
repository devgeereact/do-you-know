<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Writes validated content (see Content) to MySQL. Quizzes always land as drafts; only
 * publish() makes one public, for an explicit list of slugs and a named reviewer.
 * A quiz that is already published is never changed by an import.
 */
final class ContentImporter
{
    public function __construct(private readonly \PDO $db) {}

    /** Upserts categories, curriculum tags and draft quizzes. Returns report lines and counts. */
    public function import(array $content): array
    {
        $report = ['lines' => [], 'counts' => ['categories_added' => 0, 'tags_added' => 0, 'created' => 0,
            'draft_updated' => 0, 'unchanged' => 0, 'published_kept' => 0]];
        Database::transaction($this->db, function () use ($content, &$report): void {
            foreach ($content['categories'] as $c) {
                if (Database::one($this->db, 'SELECT id FROM categories WHERE slug=? FOR UPDATE', [$c['slug']])) {
                    continue;
                }
                // New categories stay hidden until a quiz in them is published.
                Database::execute($this->db,
                    'INSERT INTO categories (id,slug,name,description,kind,sort_order,is_active) VALUES (?,?,?,?,?,?,0)',
                    [Database::uuid(), $c['slug'], $c['name'], $c['description'], $c['kind'], $c['sort_order']]);
                $report['counts']['categories_added']++;
                $report['lines'][] = "category added (hidden until a quiz is published): {$c['slug']}";
            }
            foreach ($content['tags'] as $t) {
                if (Database::one($this->db, 'SELECT code FROM curriculum_tags WHERE code=? FOR UPDATE', [$t['code']])) {
                    continue;
                }
                Database::execute($this->db,
                    'INSERT INTO curriculum_tags (code,label,system,age_min,age_max,sort_order) VALUES (?,?,?,?,?,?)',
                    [$t['code'], $t['label'], $t['system'], $t['age_min'], $t['age_max'], $t['sort_order']]);
                $report['counts']['tags_added']++;
                $report['lines'][] = "curriculum tag added: {$t['code']}";
            }
        });
        foreach ($content['quizzes'] as $slug => $quiz) {
            $result = Database::transaction($this->db, fn(): string => $this->importQuiz($quiz));
            $report['counts'][$result]++;
            $report['lines'][] = str_replace('_', ' ', $result) . ": $slug";
        }
        return $report;
    }

    private function importQuiz(array $quiz): string
    {
        $snapshot = Content::snapshot($quiz);
        $category = Database::one($this->db, 'SELECT id FROM categories WHERE slug=?', [$quiz['category']]);
        $meta = [
            'title' => $quiz['title'], 'intro' => $quiz['intro'], 'category_id' => $category['id'],
            'difficulty' => $quiz['difficulty'], 'time_limit_seconds' => $quiz['time_limit_seconds'] ?? null,
            'shuffle_options' => (int) ($quiz['shuffle_options'] ?? true), 'question_count' => count($snapshot),
            'age_min' => $quiz['age_min'] ?? null, 'age_max' => $quiz['age_max'] ?? null,
            'curriculum_tags' => json_encode($quiz['curriculum_tags'] ?? [], JSON_THROW_ON_ERROR),
            'is_ranked' => (int) ($quiz['is_ranked'] ?? true),
        ];
        $row = Database::one($this->db, 'SELECT * FROM quizzes WHERE slug=? FOR UPDATE', [$quiz['slug']]);
        if (!$row) {
            $id = Database::uuid();
            Database::execute($this->db,
                "INSERT INTO quizzes (id,slug,status,title,intro,category_id,difficulty,time_limit_seconds,shuffle_options,question_count,age_min,age_max,curriculum_tags,is_ranked)
                 VALUES (?,?,'draft',?,?,?,?,?,?,?,?,?,?,?)",
                array_merge([$id, $quiz['slug']], array_values($meta)));
            $this->addVersion($id, 1, $snapshot);
            return 'created';
        }
        if ($row['status'] !== 'draft') {
            // Published (or retired) content is frozen here; edits go through a new review.
            return 'published_kept';
        }
        $changed = false;
        foreach ($meta as $key => $value) {
            $current = $row[$key];
            $same = $key === 'curriculum_tags'
                ? json_decode((string) $current, true) === json_decode($value, true)
                : (string) $current === (string) $value && ($current === null) === ($value === null);
            $changed = $changed || !$same;
        }
        if ($changed) {
            $sets = implode(',', array_map(fn(string $k): string => "$k=?", array_keys($meta)));
            Database::execute($this->db, "UPDATE quizzes SET $sets,updated_at=CURRENT_TIMESTAMP(6) WHERE id=? AND status='draft'",
                array_merge(array_values($meta), [$row['id']]));
        }
        $version = $row['current_version_id']
            ? Database::one($this->db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$row['current_version_id']])
            : null;
        if (!$version || !Content::same(json_decode($version['snapshot'], true, 512, JSON_THROW_ON_ERROR), $snapshot)) {
            $next = Database::one($this->db, 'SELECT COALESCE(MAX(version),0)+1 AS v FROM quiz_versions WHERE quiz_id=?', [$row['id']]);
            $this->addVersion($row['id'], (int) $next['v'], $snapshot);
            $changed = true;
        }
        return $changed ? 'draft_updated' : 'unchanged';
    }

    private function addVersion(string $quizId, int $number, array $snapshot): void
    {
        $id = Database::uuid();
        Database::execute($this->db, 'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,?,?,?)',
            [$id, $quizId, $number, json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), count($snapshot)]);
        Database::execute($this->db, "UPDATE quizzes SET current_version_id=? WHERE id=? AND status='draft'", [$id, $quizId]);
    }

    /**
     * Publishes the listed drafts only. All or nothing: every slug must be a draft whose stored
     * version matches its reviewed file and has no passed review-by date.
     */
    public function publish(array $content, array $slugs, string $reviewer, string $today): array
    {
        $reviewer = trim($reviewer);
        if (mb_strlen($reviewer) < 2 || mb_strlen($reviewer) > 100 || preg_match('/[\x00-\x1F\x7F]/', $reviewer)) {
            throw new \InvalidArgumentException('reviewed-by must be 2-100 characters');
        }
        if (!$slugs) {
            throw new \InvalidArgumentException('publish needs at least one slug');
        }
        return Database::transaction($this->db, function () use ($content, $slugs, $reviewer, $today): array {
            $lines = [];
            $todo = [];
            foreach ($slugs as $slug) {
                $quiz = $content['quizzes'][$slug] ?? null;
                if ($quiz === null) {
                    throw new \InvalidArgumentException("$slug: no content file with this slug");
                }
                $row = Database::one($this->db, 'SELECT id,status,current_version_id,category_id FROM quizzes WHERE slug=? FOR UPDATE', [$slug]);
                if (!$row) {
                    throw new \InvalidArgumentException("$slug: not imported yet, run the import first");
                }
                if ($row['status'] === 'published') {
                    $lines[] = "already published, unchanged: $slug";
                    continue;
                }
                if ($row['status'] !== 'draft' || !$row['current_version_id']) {
                    throw new \InvalidArgumentException("$slug: not a draft with a version");
                }
                $version = Database::one($this->db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$row['current_version_id']]);
                if (!Content::same(json_decode($version['snapshot'], true, 512, JSON_THROW_ON_ERROR), Content::snapshot($quiz))) {
                    throw new \InvalidArgumentException("$slug: draft differs from its file, run the import first");
                }
                foreach ($quiz['questions'] as $q) {
                    if ($q['review_by'] < $today) {
                        throw new \InvalidArgumentException("$slug: a question passed its review-by date, review and update it first");
                    }
                }
                $todo[] = [$slug, $row];
            }
            foreach ($todo as [$slug, $row]) {
                Database::execute($this->db, "UPDATE quizzes SET status='published',publish_at=UTC_TIMESTAMP(6),updated_at=CURRENT_TIMESTAMP(6) WHERE id=? AND status='draft'", [$row['id']]);
                if ($row['category_id']) {
                    Database::execute($this->db, 'UPDATE categories SET is_active=1 WHERE id=? AND is_active=0', [$row['category_id']]);
                }
                Database::execute($this->db, "INSERT INTO content_reviews (id,quiz_id,quiz_version_id,reviewed_by,action) VALUES (?,?,?,?,'published')",
                    [Database::uuid(), $row['id'], $row['current_version_id'], $reviewer]);
                $lines[] = "published: $slug";
            }
            return $lines;
        });
    }
}
