<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Batches (slice 3 of docs/CONTENT-PIPELINE-DESIGN.md): the quizzes one Add made, sorted into ready and
 * needs a look, and published together at a chosen pace. Everything here goes through AdminContent, so a quiz
 * is published by exactly the same rules as one published by hand.
 */
final class AdminBatches
{
    private const MAX_PER_DAY = 200;

    public function __construct(private readonly \PDO $db, private readonly Admin $admin, private readonly AdminContent $content) {}

    /** The latest batches, newest first. */
    public function list(): array
    {
        $rows = $this->db->query(
            "SELECT batch_id,MIN(created_at) AS started,COUNT(*) AS quizzes,
                    SUM(status IN ('draft','review')) AS drafts,SUM(status='published') AS published,SUM(status='retired') AS retired
             FROM quizzes WHERE batch_id IS NOT NULL GROUP BY batch_id ORDER BY started DESC LIMIT 20")->fetchAll();
        return ['items' => array_map(static fn(array $r): array => [
            'id' => $r['batch_id'], 'started_at' => Database::utc($r['started']), 'quizzes' => (int) $r['quizzes'],
            'drafts' => (int) $r['drafts'], 'published' => (int) $r['published'], 'retired' => (int) $r['retired'],
        ], $rows)];
    }

    /** Every quiz of a batch with its state: ready, look (needs a person), scheduled, live or retired. */
    public function detail(string $batch): array
    {
        $ids = $this->ids($batch);
        $quizzes = [];
        $counts = ['total' => 0, 'ready' => 0, 'look' => 0, 'scheduled' => 0, 'live' => 0, 'retired' => 0, 'questions' => 0];
        foreach ($ids as $id) {
            $d = $this->content->detail($id);
            $q = $d['quiz'];
            $problems = count($d['problems']);
            $warnings = count($d['warnings']);
            $state = match (true) {
                $q['status'] === 'retired' => 'retired',
                $q['status'] === 'published' && $q['live'] => 'live',
                $q['status'] === 'published' => 'scheduled',
                $problems + $warnings > 0 => 'look',
                default => 'ready',
            };
            $counts['total']++;
            $counts[$state]++;
            $counts['questions'] += count($d['questions']);
            $min = isset($q['age_min']) ? (int) $q['age_min'] : null;
            $quizzes[] = [
                'id' => $q['id'], 'slug' => $q['slug'], 'title' => $q['title'],
                'category' => ['slug' => $q['category'], 'name' => $q['category_name']],
                'level' => Areas::level($min), 'age_min' => $q['age_min'], 'age_max' => $q['age_max'],
                'difficulty' => $q['difficulty'], 'is_ranked' => (bool) ($q['is_ranked'] ?? true),
                'questions' => count($d['questions']), 'status' => $q['status'], 'publish_at' => $q['publish_at'],
                'state' => $state, 'problems' => $problems, 'warnings' => $warnings,
                'reasons' => array_merge(array_map(static fn(array $p): string => (string) $p['message'], $d['problems']),
                    array_map(static fn(array $w): string => (string) $w['message'], $d['warnings'])),
            ];
        }
        usort($quizzes, static fn(array $a, array $b): int => [$a['category']['name'], $a['title']] <=> [$b['category']['name'], $b['title']]);
        return ['id' => $batch, 'counts' => $counts, 'quizzes' => $quizzes];
    }

    /**
     * Publishes the batch's ready quizzes: per_day at a time from the start date (0 or missing: all now).
     * Quizzes that need a look are left as drafts and listed as skipped. The owner's one click per batch.
     */
    public function publish(string $batch, array $body): array
    {
        if ($extra = array_diff(array_keys($body), ['per_day', 'start'])) {
            throw ApiError::invalid('invalid_pace', [['field' => 'body', 'message' => 'unknown keys ' . implode(', ', $extra)]]);
        }
        $perDay = $body['per_day'] ?? 0;
        if (!is_int($perDay) || $perDay < 0 || $perDay > self::MAX_PER_DAY) {
            throw ApiError::invalid('invalid_pace', [['field' => 'per_day', 'message' => 'per_day must be a whole number from 0 to ' . self::MAX_PER_DAY]]);
        }
        $today = Competition::londonDate();
        $start = $body['start'] ?? $today;
        $parsed = is_string($start) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $start, new \DateTimeZone('Europe/London')) : false;
        if (!$parsed || $parsed->format('Y-m-d') !== $start || $start < $today) {
            throw ApiError::invalid('invalid_pace', [['field' => 'start', 'message' => 'start must be today or later, like ' . $today]]);
        }
        $summary = $this->detail($batch);
        $ready = array_values(array_filter($summary['quizzes'], static fn(array $q): bool => $q['state'] === 'ready'));
        $skipped = [];
        foreach ($summary['quizzes'] as $q) {
            if ($q['state'] === 'look') { $skipped[] = ['id' => $q['id'], 'title' => $q['title'], 'reason' => 'needs a look']; }
        }
        $published = 0;
        $first = null;
        $last = null;
        foreach ($ready as $i => $q) {
            $date = $parsed->modify('+' . ($perDay === 0 ? 0 : intdiv($i, $perDay)) . ' days')->format('Y-m-d');
            try {
                $this->content->publish($q['id'], $date === $today ? [] : ['publish_at' => $date]);
            } catch (ApiError $e) {
                $skipped[] = ['id' => $q['id'], 'title' => $q['title'], 'reason' => $e->errorCode];
                continue;
            }
            $published++;
            $first ??= $date;
            $last = $date;
        }
        $this->admin->audit('batch.publish', 'batch', $batch, ['published' => $published, 'per_day' => $perDay, 'skipped' => count($skipped)]);
        return ['published' => $published, 'per_day' => $perDay, 'first' => $first, 'last' => $last, 'skipped' => $skipped];
    }

    /** Takes back what has not gone live yet. Quizzes already live are left alone. */
    public function undo(string $batch): array
    {
        $undone = 0;
        $kept = 0;
        foreach ($this->detail($batch)['quizzes'] as $q) {
            if ($q['state'] === 'scheduled') {
                $this->content->retire($q['id']);
                $undone++;
            } elseif ($q['state'] === 'live') {
                $kept++;
            }
        }
        $this->admin->audit('batch.undo', 'batch', $batch, ['undone' => $undone, 'kept_live' => $kept]);
        return ['undone' => $undone, 'kept_live' => $kept];
    }

    /** @return list<string> */
    private function ids(string $batch): array
    {
        $statement = $this->db->prepare('SELECT id FROM quizzes WHERE batch_id=? ORDER BY created_at,id');
        $statement->execute([$batch]);
        $ids = array_column($statement->fetchAll(), 'id');
        if (!$ids) { throw new ApiError('batch_not_found', 404); }
        return $ids;
    }
}
