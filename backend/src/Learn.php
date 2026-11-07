<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Adaptive learning sessions for a child (P5): the hand of ten, the step rule, the retry queue, stickers and the
 * skill record. A session is an ordinary attempt (mode 'learn'); this class deals its hand and, when it finishes,
 * updates what the child has learned. Everything stored here is ids, counts and dates.
 */
final class Learn
{
    public const AREAS = ['literacy', 'numeracy', 'science', 'humanities'];
    public const ROUND = 10;
    public const MAX_RETRY = 2;
    public const START_STEP = 2;
    /** Step to the quiz difficulty it prefers: 1-2 easy, 3 medium, 4-5 hard (the nearest available is used). */
    private const WANTED = [1 => 0, 2 => 0, 3 => 1, 4 => 2, 5 => 2];
    private const DIFFICULTY = ['easy' => 0, 'medium' => 1, 'hard' => 2];

    /** The stickers a child can earn, in the order they are shown. Keep identical to src/lib/stickers.ts. */
    public const STICKERS = [
        'first-session' => 'First session',
        'area-literacy' => 'Word wizard',
        'area-numeracy' => 'Number ninja',
        'area-science' => 'Little scientist',
        'area-humanities' => 'Time traveller',
        'perfect' => 'Perfect round',
        'step-up' => 'Level up',
        'comeback' => 'Comeback',
        'five-sessions' => 'Five sessions',
    ];
    /** When several are earned together, the one shown first. */
    private const SHOW_FIRST = ['step-up', 'perfect', 'comeback', 'five-sessions', 'first-session'];

    /**
     * The step rule (docs/LEARNING-DESIGN.md section 3). 8 in 10 right (or the same share of a shorter round) twice
     * running moves up one step; 4 in 10 or fewer moves down one; the middle changes nothing and restarts the run.
     * At most one change a day, and steps stay between 1 and 5.
     *
     * @return array{step:int,high_run:int,changed:bool}
     */
    public static function nextStep(int $step, int $highRun, int $correct, int $total, bool $changedToday): array
    {
        $high = $total > 0 && $correct * 10 >= 8 * $total;
        $low = $total > 0 && $correct * 10 <= 4 * $total;
        if ($high) {
            $run = min(2, $highRun + 1);
            if ($run >= 2 && !$changedToday) {
                // At the top step there is nowhere to go, so the run simply starts again.
                return $step < 5 ? ['step' => $step + 1, 'high_run' => 0, 'changed' => true] : ['step' => $step, 'high_run' => 0, 'changed' => false];
            }
            return ['step' => $step, 'high_run' => $run, 'changed' => false];
        }
        if ($low && !$changedToday && $step > 1) { return ['step' => $step - 1, 'high_run' => 0, 'changed' => true]; }
        return ['step' => $step, 'high_run' => 0, 'changed' => false];
    }

    public static function stars(int $correct, int $total): int
    {
        if ($total <= 0 || $correct <= 0) { return 0; }
        return $correct * 10 >= 9 * $total ? 3 : ($correct * 10 >= 7 * $total ? 2 : 1);
    }

    public static function step(\PDO $db, string $profileId, string $area): int
    {
        return (int) (Database::one($db, 'SELECT step FROM skills WHERE profile_id=? AND area=?', [$profileId, $area])['step'] ?? self::START_STEP);
    }

    /**
     * Deals a hand: up to MAX_RETRY earlier mistakes first, then fresh questions from the quizzes of this area and
     * level nearest the child's step, least recently seen first. Throws no_learn_content when fewer than three exist.
     *
     * @return list<array{version:string,quiz:string,question:string,source:string}>
     */
    public static function hand(\PDO $db, string $profileId, string $area, string $level, int $step): array
    {
        $rows = Database::all($db,
            'SELECT q.id,q.title,q.difficulty,q.age_min,q.current_version_id AS version,c.slug AS category FROM quizzes q
             LEFT JOIN categories c ON c.id=q.category_id WHERE ' . Catalog::LIVE . ' AND q.current_version_id IS NOT NULL ORDER BY q.id');
        $wanted = self::WANTED[$step] ?? 0;
        $pool = [];
        foreach ($rows as $row) {
            if (Areas::area($row['category'], (string) $row['title']) !== $area || Areas::level($row['age_min'] === null ? null : (int) $row['age_min']) !== $level) { continue; }
            $pool[] = $row + ['gap' => abs((self::DIFFICULTY[$row['difficulty'] ?? 'medium'] ?? 1) - $wanted)];
        }
        if ($pool === []) { throw new ApiError('no_learn_content', 404); }

        $seen = [];
        foreach (Database::all($db,
            'SELECT lc.question_id,MAX(a.started_at) AS last FROM learn_cards lc JOIN attempts a ON a.id=lc.attempt_id WHERE a.user_id=? GROUP BY lc.question_id', [$profileId]) as $r) {
            $seen[$r['question_id']] = $r['last'];
        }

        $snapshots = [];
        $load = static function (string $versionId) use ($db, &$snapshots): array {
            if (!isset($snapshots[$versionId])) {
                $v = Database::one($db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$versionId]);
                $snapshots[$versionId] = $v ? array_column(json_decode($v['snapshot'], true, 512, JSON_THROW_ON_ERROR), null, 'id') : [];
            }
            return $snapshots[$versionId];
        };

        // Earlier mistakes, oldest first. One whose quiz or question has gone is dropped quietly.
        $hand = [];
        $taken = [];
        foreach (Database::all($db, 'SELECT question_id,quiz_id FROM retry_questions WHERE profile_id=? AND area=? ORDER BY added_at,question_id', [$profileId, $area]) as $r) {
            $quiz = array_values(array_filter($pool, static fn(array $p): bool => $p['id'] === $r['quiz_id']))[0] ?? null;
            if ($quiz === null || !isset($load($quiz['version'])[$r['question_id']])) {
                Database::execute($db, 'DELETE FROM retry_questions WHERE profile_id=? AND question_id=?', [$profileId, $r['question_id']]);
                continue;
            }
            // A queued question waits for its turn as a retry; it is never dealt as a fresh one meanwhile.
            $taken[$r['question_id']] = true;
            if (count($hand) < self::MAX_RETRY) {
                $hand[] = ['version' => $quiz['version'], 'quiz' => $quiz['id'], 'question' => $r['question_id'], 'source' => 'retry'];
            }
        }

        $fresh = [];
        foreach ($pool as $quiz) {
            foreach (array_keys($load($quiz['version'])) as $qid) {
                if (isset($taken[$qid]) || isset($fresh[$qid])) { continue; }
                $fresh[$qid] = ['version' => $quiz['version'], 'quiz' => $quiz['id'], 'question' => $qid, 'source' => 'fresh',
                    'gap' => $quiz['gap'], 'last' => $seen[$qid] ?? '', 'tie' => random_int(0, PHP_INT_MAX)];
            }
        }
        $fresh = array_values($fresh);
        usort($fresh, static fn(array $a, array $b): int => [$a['gap'], $a['last'], $a['tie']] <=> [$b['gap'], $b['last'], $b['tie']]);
        foreach (array_slice($fresh, 0, self::ROUND - count($hand)) as $card) {
            unset($card['gap'], $card['last'], $card['tie']);
            $hand[] = $card;
        }
        if (count($hand) < 3) { throw new ApiError('no_learn_content', 404); }
        shuffle($hand);
        return $hand;
    }

    /**
     * Called once, when a learn attempt finishes (the caller holds the profile and attempt locks). Updates the skill
     * record, the retry queue and the stickers, stores the summary on the attempt and returns it.
     */
    public static function complete(\PDO $db, array $attempt): array
    {
        $profile = $attempt['user_id'];
        $area = (string) $attempt['learn_area'];
        $cards = Database::all($db, 'SELECT lc.position,lc.question_id,lc.source,v.quiz_id FROM learn_cards lc JOIN quiz_versions v ON v.id=lc.quiz_version_id WHERE lc.attempt_id=? ORDER BY lc.position', [$attempt['id']]);
        $right = array_column(Database::all($db, 'SELECT position,is_correct FROM attempt_answers WHERE attempt_id=?', [$attempt['id']]), 'is_correct', 'position');
        $total = count($cards);
        $correct = (int) $attempt['correct_count'];
        $today = Competition::londonDate();

        Database::execute($db, "INSERT IGNORE INTO skills (profile_id,area,step,recent) VALUES (?,?,?,'[]')", [$profile, $area, self::START_STEP]);
        $skill = Database::one($db, 'SELECT * FROM skills WHERE profile_id=? AND area=? FOR UPDATE', [$profile, $area]);
        $before = (int) $skill['step'];
        $next = self::nextStep($before, (int) $skill['high_run'], $correct, $total, $skill['step_changed_on'] === $today);
        $recent = json_decode((string) $skill['recent'], true) ?: [];
        $recent[] = ['date' => $today, 'correct' => $correct, 'total' => $total];
        Database::execute($db, 'UPDATE skills SET step=?,high_run=?,step_changed_on=?,sessions=sessions+1,recent=? WHERE profile_id=? AND area=?',
            [$next['step'], $next['high_run'], $next['changed'] ? $today : $skill['step_changed_on'], json_encode(array_slice($recent, -5), JSON_THROW_ON_ERROR), $profile, $area]);

        // Mistakes wait; a right answer lets a question go.
        $comeback = false;
        foreach ($cards as $card) {
            if ((int) ($right[(int) $card['position']] ?? 0) === 1) {
                Database::execute($db, 'DELETE FROM retry_questions WHERE profile_id=? AND question_id=?', [$profile, $card['question_id']]);
                $comeback = $comeback || $card['source'] === 'retry';
            } else {
                Database::execute($db, 'INSERT IGNORE INTO retry_questions (profile_id,question_id,area,quiz_id) VALUES (?,?,?,?)', [$profile, $card['question_id'], $area, $card['quiz_id']]);
            }
        }

        $sessions = (int) Database::one($db, 'SELECT SUM(sessions) AS n FROM skills WHERE profile_id=?', [$profile])['n'];
        $stepped = $next['changed'] ? ($next['step'] > $before ? 'up' : 'down') : null;
        $candidates = array_filter([
            'first-session' => (int) $skill['sessions'] === 0 && $sessions === 1,
            "area-$area" => true,
            'perfect' => $total > 0 && $correct === $total,
            'step-up' => $stepped === 'up',
            'comeback' => $comeback,
            'five-sessions' => $sessions >= 5,
        ]);
        $new = [];
        foreach (array_keys($candidates) as $id) {
            if (!isset(self::STICKERS[$id])) { continue; }
            $s = $db->prepare('INSERT IGNORE INTO stickers (profile_id,sticker_id) VALUES (?,?)');
            $s->execute([$profile, $id]);
            if ($s->rowCount() === 1) { $new[] = $id; }
        }
        $shown = null;
        foreach (array_merge(self::SHOW_FIRST, $new) as $id) { if (in_array($id, $new, true)) { $shown = $id; break; } }

        $summary = ['area' => $area, 'correct' => $correct, 'total' => $total, 'stars' => self::stars($correct, $total),
            'step_before' => $before, 'step_after' => $next['step'], 'stepped' => $stepped,
            'sticker' => $shown === null ? null : ['id' => $shown, 'label' => self::STICKERS[$shown]],
            'new_stickers' => $new, 'next_area' => self::nextArea($db, $profile)];
        Database::execute($db, 'UPDATE attempts SET learn_result=? WHERE id=?', [json_encode($summary, JSON_THROW_ON_ERROR), $attempt['id']]);
        return $summary;
    }

    /** Where to practise next: the area with the lowest step, then the fewest sessions, then the longest gap. */
    public static function nextArea(\PDO $db, string $profileId): string
    {
        $by = array_column(Database::all($db, 'SELECT area,step,sessions,updated_at FROM skills WHERE profile_id=?', [$profileId]), null, 'area');
        $order = self::AREAS;
        usort($order, static function (string $a, string $b) use ($by): int {
            $key = static fn(string $x): array => [(int) ($by[$x]['step'] ?? self::START_STEP), (int) ($by[$x]['sessions'] ?? 0), (string) ($by[$x]['updated_at'] ?? '')];
            return $key($a) <=> $key($b);
        });
        return $order[0];
    }

    /** The skill map and stickers for one child, for the child (`/me/learn`) and their parent. Ids, counts and dates only. */
    public static function record(\PDO $db, string $profileId): array
    {
        $by = array_column(Database::all($db, 'SELECT area,step,sessions,recent,updated_at FROM skills WHERE profile_id=?', [$profileId]), null, 'area');
        $areas = [];
        foreach (self::AREAS as $area) {
            $row = $by[$area] ?? null;
            $recent = $row ? (json_decode((string) $row['recent'], true) ?: []) : [];
            $areas[] = ['area' => $area, 'step' => (int) ($row['step'] ?? self::START_STEP), 'sessions' => (int) ($row['sessions'] ?? 0),
                'recent' => $recent, 'last_played' => $row ? Database::utc($row['updated_at']) : null];
        }
        $earned = array_column(Database::all($db, 'SELECT sticker_id,earned_at FROM stickers WHERE profile_id=?', [$profileId]), 'earned_at', 'sticker_id');
        $stickers = [];
        $book = [];
        foreach (self::STICKERS as $id => $label) {
            $book[] = ['id' => $id, 'label' => $label, 'earned' => isset($earned[$id])];
            if (isset($earned[$id])) { $stickers[] = ['id' => $id, 'label' => $label, 'earned_at' => Database::utc($earned[$id])]; }
        }
        return ['areas' => $areas, 'stickers' => $stickers, 'sticker_book' => $book, 'next_area' => self::nextArea($db, $profileId)];
    }
}
