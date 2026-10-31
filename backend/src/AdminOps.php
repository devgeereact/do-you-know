<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Owner dashboard, daily calendar, round moderation and subjects, under /admin (Admin guards).
 *
 * GET  /admin/todo     200 {"items":[{key,count,label}]} keys, always all six in this order:
 *      feedback_new, review_questions, draft_problems, review_due, hard_questions, daily_gaps
 * GET  /admin/stats    200 {"plays":{"today","d7","d30"},"finish_rate_7d":int|null,"new_guests_7d",
 *      "modes_7d":{"practice","ranked","daily","challenge"},"top_quizzes_7d":[{slug,title,plays}],
 *      "hardest":[{quiz_slug,quiz_title,question_id,prompt,answered,right_rate}]}
 * GET  /admin/daily?month=YYYY-MM (default this London month)
 *      200 {"month","today","days":[{date,quiz_id,slug,title,status}]} status scheduled|live|done|auto|none
 *      (auto = what the cron would pick, previewed day by day; none = a past day with no daily)
 * POST /admin/daily {date:"Y-m-d" (today or later),quiz_id:uuid|null}  200 the day object
 *      409 daily_locked (live or done); 422 invalid_date | quiz_not_live
 * GET  /admin/rounds?q=&hidden=0|1&limit=1..200 (default 50)
 *      200 {"items":[{id,nickname,avatar_id,quiz_title,correct,total,ms,finished_at,mode,hidden}]}
 * POST /admin/rounds/{id}/hide {hidden:bool}  200 {"id","hidden","entries"}   404 round_not_found
 * GET  /admin/subjects 200 {"items":[{slug,name,description,kind,scene,icon,sort_order,is_active,live_quizzes,quizzes}]}
 * POST /admin/subjects {name,kind,scene?,icon?,description?}   201 subject
 * POST /admin/subjects/{slug} any of {name,kind,scene,icon,description,sort_order,is_active}  200 subject  404 subject_not_found
 */
final class AdminOps
{
    private const MODES = ['practice', 'ranked', 'daily', 'challenge'];

    public function __construct(private readonly \PDO $db, private readonly Admin $admin) {}

    // ---- Dashboard ----

    public function todo(): array
    {
        $content = new AdminContent($this->db, $this->admin);
        $feedback = (int) Database::one($this->db, "SELECT COUNT(*) AS n FROM feedback WHERE status='new'")['n'];
        $review = $content->uncheckedInReview();
        $problems = $content->draftsWithProblems();
        $soon = (new \DateTimeImmutable(Competition::londonDate()))->modify('+30 days')->format('Y-m-d');
        $due = 0;
        foreach ($this->liveSnapshots() as $snapshot) {
            foreach ($snapshot as $q) {
                if (is_string($q['review_by'] ?? null) && $q['review_by'] <= $soon) { $due++; }
            }
        }
        $hard = count($this->questionStats(100, 30, 1000));
        $today = new \DateTimeImmutable(Competition::londonDate());
        $statement = $this->db->prepare("SELECT COUNT(*) AS n FROM daily_challenges WHERE challenge_date BETWEEN ? AND ? AND status IN ('scheduled','live')");
        $statement->execute([$today->format('Y-m-d'), $today->modify('+13 days')->format('Y-m-d')]);
        $gaps = 14 - (int) $statement->fetch()['n'];
        return ['items' => [
            ['key' => 'feedback_new', 'count' => $feedback, 'label' => self::plural($feedback, 'new feedback message', 'new feedback messages')],
            ['key' => 'review_questions', 'count' => $review['questions'],
                'label' => self::plural($review['questions'], 'question to check', 'questions to check') . ' in ' . self::plural($review['quizzes'], 'quiz', 'quizzes') . ' waiting for review'],
            ['key' => 'draft_problems', 'count' => $problems, 'label' => self::plural($problems, 'draft has problems', 'drafts have problems')],
            ['key' => 'review_due', 'count' => $due, 'label' => self::plural($due, 'live question is', 'live questions are') . ' due a fact check within 30 days'],
            ['key' => 'hard_questions', 'count' => $hard, 'label' => self::plural($hard, 'live question is', 'live questions are') . ' answered right by under 30% of players'],
            ['key' => 'daily_gaps', 'count' => $gaps, 'label' => self::plural($gaps, 'day', 'days') . ' in the next 14 without a chosen daily'],
        ]];
    }

    public function stats(): array
    {
        $todayStart = Overall::periodStart('day');
        $plays = Database::one($this->db, "SELECT
            SUM(finished_at>=?) AS today,
            SUM(finished_at>=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 7 DAY)) AS d7,
            COUNT(*) AS d30 FROM attempts WHERE status='finished' AND finished_at>=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 30 DAY)", [$todayStart]);
        $started = Database::one($this->db, "SELECT COUNT(*) AS n,COALESCE(SUM(status='finished'),0) AS f FROM attempts WHERE started_at>=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 7 DAY)");
        $guests = Database::one($this->db, "SELECT COUNT(*) AS n FROM profiles WHERE role='guest' AND created_at>=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 7 DAY)");
        $modes = array_fill_keys(self::MODES, 0);
        foreach ($this->db->query("SELECT mode,COUNT(*) AS n FROM attempts WHERE status='finished' AND finished_at>=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 7 DAY) GROUP BY mode")->fetchAll() as $m) {
            if (isset($modes[$m['mode']])) { $modes[$m['mode']] = (int) $m['n']; }
        }
        $top = $this->db->query("SELECT q.slug,q.title,COUNT(*) AS plays FROM attempts a JOIN quizzes q ON q.id=a.quiz_id
            WHERE a.status='finished' AND a.finished_at>=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 7 DAY)
            GROUP BY q.id,q.slug,q.title ORDER BY plays DESC,q.slug LIMIT 5")->fetchAll();
        return [
            'plays' => ['today' => (int) $plays['today'], 'd7' => (int) $plays['d7'], 'd30' => (int) $plays['d30']],
            'finish_rate_7d' => (int) $started['n'] > 0 ? (int) round(100 * (int) $started['f'] / (int) $started['n']) : null,
            'new_guests_7d' => (int) $guests['n'],
            'modes_7d' => $modes,
            'top_quizzes_7d' => array_map(static fn(array $r): array => ['slug' => $r['slug'], 'title' => $r['title'], 'plays' => (int) $r['plays']], $top),
            'hardest' => array_slice($this->questionStats(50, 101, 5), 0, 5),
        ];
    }

    /**
     * Live questions in their quiz's current version with at least $min answers and a right rate
     * below $belowPercent, hardest first. Prompts come from the current version snapshot.
     */
    private function questionStats(int $min, int $belowPercent, int $limit): array
    {
        $statement = $this->db->prepare('SELECT a.quiz_id,aa.question_id,COUNT(*) AS n,SUM(aa.is_correct) AS r
            FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN quizzes q ON q.id=a.quiz_id AND ' . Catalog::LIVE . '
            GROUP BY a.quiz_id,aa.question_id HAVING COUNT(*)>=? AND 100*SUM(aa.is_correct)<?*COUNT(*)
            ORDER BY SUM(aa.is_correct)/COUNT(*),COUNT(*) DESC LIMIT 2000');
        $statement->execute([$min, $belowPercent]);
        $snapshots = $this->liveSnapshots(true);
        $out = [];
        foreach ($statement->fetchAll() as $r) {
            $quiz = $snapshots[$r['quiz_id']] ?? null;
            $q = $quiz['questions'][$r['question_id']] ?? null;
            if ($q === null) { continue; }
            $out[] = ['quiz_slug' => $quiz['slug'], 'quiz_title' => $quiz['title'], 'question_id' => $r['question_id'],
                'prompt' => $q['prompt'], 'answered' => (int) $r['n'], 'right_rate' => (int) round(100 * (int) $r['r'] / (int) $r['n'])];
            if (count($out) >= $limit) { break; }
        }
        return $out;
    }

    /** Current snapshots of live quizzes: lists of questions, or keyed by quiz id with meta. */
    private function liveSnapshots(bool $keyed = false): array
    {
        $out = [];
        foreach ($this->db->query('SELECT q.id,q.slug,q.title,v.snapshot FROM quizzes q JOIN quiz_versions v ON v.id=q.current_version_id WHERE ' . Catalog::LIVE)->fetchAll() as $r) {
            $snapshot = json_decode($r['snapshot'], true) ?: [];
            $out[$r['id']] = $keyed ? ['slug' => $r['slug'], 'title' => $r['title'], 'questions' => array_column($snapshot, null, 'id')] : $snapshot;
        }
        return $out;
    }

    // ---- Daily calendar ----

    public function dailyMonth(array $query): array
    {
        $month = $query['month'] ?? substr(Competition::londonDate(), 0, 7);
        $first = is_string($month) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $month . '-01') : false;
        if (!$first || $first->format('Y-m') !== $month || $first->format('Y') < '2020' || $first->format('Y') > '2100') {
            throw ApiError::invalid('invalid_month', ['format' => 'YYYY-MM']);
        }
        $today = Competition::londonDate();
        $last = $first->modify('last day of this month')->format('Y-m-d');
        $rows = [];
        $statement = $this->db->prepare('SELECT d.challenge_date,d.status,q.id,q.slug,q.title FROM daily_challenges d JOIN quizzes q ON q.id=d.quiz_id
            WHERE d.challenge_date BETWEEN ? AND ?');
        $statement->execute([min($first->format('Y-m-d'), $today), max($last, $today)]);
        foreach ($statement->fetchAll() as $r) { $rows[$r['challenge_date']] = $r; }
        // Preview the cron's least-recently-used choice from today forward, as Daily::pick would.
        $auto = [];
        if ($last >= $today) {
            $used = array_column($this->db->query('SELECT quiz_id,MAX(challenge_date) AS d FROM daily_challenges GROUP BY quiz_id')->fetchAll(), 'd', 'quiz_id');
            $pool = $this->db->query('SELECT q.id,q.slug,q.title,q.publish_at FROM quizzes q JOIN quiz_versions v ON v.id=q.current_version_id AND v.quiz_id=q.id
                WHERE q.status=\'published\'')->fetchAll();
            for ($day = new \DateTimeImmutable($today); $day->format('Y-m-d') <= $last; $day = $day->modify('+1 day')) {
                $date = $day->format('Y-m-d');
                if (isset($rows[$date])) { continue; }
                $end = (new \DateTimeImmutable($date . ' 23:59:59', new \DateTimeZone('Europe/London')))->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s');
                $live = array_filter($pool, static fn(array $q): bool => $q['publish_at'] === null || $q['publish_at'] <= $end);
                usort($live, static fn(array $a, array $b): int =>
                    [isset($used[$a['id']]), $used[$a['id']] ?? '', hash('sha256', $date . $a['id'])]
                    <=> [isset($used[$b['id']]), $used[$b['id']] ?? '', hash('sha256', $date . $b['id'])]);
                if ($live) {
                    $auto[$date] = $live[0];
                    $used[$live[0]['id']] = $date;
                }
            }
        }
        $days = [];
        for ($day = $first; $day->format('Y-m-d') <= $last; $day = $day->modify('+1 day')) {
            $days[] = $this->day($day->format('Y-m-d'), $rows, $auto, $today);
        }
        return ['month' => $month, 'today' => $today, 'days' => $days];
    }

    private function day(string $date, array $rows, array $auto, string $today): array
    {
        $r = $rows[$date] ?? null;
        if ($r) { return ['date' => $date, 'quiz_id' => $r['id'], 'slug' => $r['slug'], 'title' => $r['title'], 'status' => $r['status']]; }
        $a = $auto[$date] ?? null;
        if ($a && $date >= $today) { return ['date' => $date, 'quiz_id' => $a['id'], 'slug' => $a['slug'], 'title' => $a['title'], 'status' => 'auto']; }
        return ['date' => $date, 'quiz_id' => null, 'slug' => null, 'title' => null, 'status' => $date >= $today ? 'auto' : 'none'];
    }

    public function setDaily(array $body): array
    {
        $date = $body['date'] ?? null;
        $quizId = $body['quiz_id'] ?? null;
        $today = Competition::londonDate();
        $parsed = is_string($date) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $date) : false;
        if (!$parsed || $parsed->format('Y-m-d') !== $date || $date < $today || $date > (new \DateTimeImmutable($today))->modify('+400 days')->format('Y-m-d')) {
            throw ApiError::invalid('invalid_date', ['earliest' => $today]);
        }
        if ($quizId !== null && (!is_string($quizId) || !Admin::isUuid($quizId))) {
            throw ApiError::invalid('quiz_not_live');
        }
        $result = Database::transaction($this->db, function () use ($date, $quizId): array {
            $row = Database::one($this->db, 'SELECT id,status,quiz_id FROM daily_challenges WHERE challenge_date=? FOR UPDATE', [$date]);
            if ($row && $row['status'] !== 'scheduled') { throw new ApiError('daily_locked', 409); }
            if ($quizId === null) {
                if ($row) { Database::execute($this->db, 'DELETE FROM daily_challenges WHERE id=?', [$row['id']]); }
                $this->admin->audit('daily.clear', 'daily', $date, null);
                return ['action' => 'cleared'];
            }
            $quiz = Database::one($this->db, 'SELECT q.id,q.current_version_id FROM quizzes q
                JOIN quiz_versions v ON v.id=q.current_version_id AND v.quiz_id=q.id WHERE q.id=? AND ' . Catalog::LIVE, [$quizId]);
            if (!$quiz) { throw ApiError::invalid('quiz_not_live'); }
            if ($row) {
                Database::execute($this->db, 'UPDATE daily_challenges SET quiz_id=?,quiz_version_id=? WHERE id=?', [$quiz['id'], $quiz['current_version_id'], $row['id']]);
            } else {
                Database::execute($this->db, "INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'scheduled')",
                    [Database::uuid(), $date, $quiz['id'], $quiz['current_version_id']]);
            }
            $this->admin->audit('daily.set', 'daily', $date, ['quiz_id' => $quiz['id']]);
            return ['action' => 'set'];
        });
        if ($result['action'] === 'set' && $date === $today) {
            // The cron may already have run today: go live now rather than wait for tomorrow.
            (new Daily($this->db))->activate($today);
        }
        $month = $this->dailyMonth(['month' => substr($date, 0, 7)]);
        return array_values(array_filter($month['days'], static fn(array $d): bool => $d['date'] === $date))[0];
    }

    // ---- Rounds ----

    public function rounds(array $query): array
    {
        $sql = "SELECT a.id,p.nickname,p.avatar_id,q.title,a.correct_count,a.answered_count,a.answer_time_ms,a.finished_at,a.mode,a.is_hidden
            FROM attempts a JOIN profiles p ON p.id=a.user_id JOIN quizzes q ON q.id=a.quiz_id
            WHERE a.status='finished' AND a.mode IN ('ranked','daily')";
        $args = [];
        $hidden = $query['hidden'] ?? null;
        if ($hidden !== null) {
            if (!in_array($hidden, ['0', '1'], true)) { throw ApiError::invalid('invalid_filter', ['field' => 'hidden']); }
            $sql .= ' AND a.is_hidden=?';
            $args[] = (int) $hidden;
        }
        if (isset($query['q'])) {
            if (!is_string($query['q']) || mb_strlen($query['q']) > 100) { throw ApiError::invalid('invalid_filter', ['field' => 'q']); }
            $like = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], trim($query['q'])) . '%';
            $sql .= " AND (p.nickname LIKE ? ESCAPE '!' OR q.title LIKE ? ESCAPE '!')";
            array_push($args, $like, $like);
        }
        $statement = $this->db->prepare($sql . ' ORDER BY a.finished_at DESC,a.id LIMIT ' . Admin::queryLimit($query, 50, 200));
        $statement->execute($args);
        return ['items' => array_map(static fn(array $r): array => ['id' => $r['id'], 'nickname' => $r['nickname'], 'avatar_id' => $r['avatar_id'],
            'quiz_title' => $r['title'], 'correct' => (int) $r['correct_count'], 'total' => (int) $r['answered_count'],
            'ms' => (int) $r['answer_time_ms'], 'finished_at' => Database::utc($r['finished_at']), 'mode' => $r['mode'],
            'hidden' => (bool) $r['is_hidden']], $statement->fetchAll())];
    }

    public function hideRound(string $id, array $body): array
    {
        $hidden = $body['hidden'] ?? null;
        if (!is_bool($hidden)) { throw ApiError::invalid('invalid_hidden', ['field' => 'hidden']); }
        return Database::transaction($this->db, function () use ($id, $hidden): array {
            $round = Database::one($this->db, "SELECT id,user_id,quiz_id FROM attempts WHERE id=? AND status='finished' AND mode IN ('ranked','daily') FOR UPDATE", [$id]);
            if (!$round) { throw new ApiError('round_not_found', 404); }
            Database::execute($this->db, 'UPDATE attempts SET is_hidden=? WHERE id=?', [(int) $hidden, $id]);
            // Every board row this player holds on this quiz, whichever round set it.
            $entries = $this->db->prepare('UPDATE leaderboard_entries SET is_hidden=? WHERE user_id=? AND quiz_id=?');
            $entries->execute([(int) $hidden, $round['user_id'], $round['quiz_id']]);
            $this->admin->audit($hidden ? 'round.hide' : 'round.show', 'attempt', $id, ['entries' => $entries->rowCount()]);
            return ['id' => $id, 'hidden' => $hidden, 'entries' => $entries->rowCount()];
        });
    }

    // ---- Subjects ----

    public function subjects(): array
    {
        $rows = $this->db->query('SELECT c.*,(SELECT COUNT(*) FROM quizzes q WHERE q.category_id=c.id AND ' . Catalog::LIVE . ') AS live_quizzes,
            (SELECT COUNT(*) FROM quizzes q WHERE q.category_id=c.id) AS quizzes FROM categories c ORDER BY c.sort_order,c.name')->fetchAll();
        return ['items' => array_map(self::subjectRow(...), $rows)];
    }

    public function createSubject(array $body): array
    {
        $fields = $this->subjectFields($body, true);
        return Database::transaction($this->db, function () use ($fields): array {
            $base = trim(substr(strtolower(trim((string) preg_replace('/[^a-z0-9]+/i', '-', (string) iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $fields['name'])), '-')), 0, 90), '-') ?: 'subject';
            $slug = $base;
            for ($n = 2; Database::one($this->db, 'SELECT id FROM categories WHERE slug=?', [$slug]); $n++) { $slug = "$base-$n"; }
            $order = Database::one($this->db, 'SELECT COALESCE(MAX(sort_order),0)+10 AS n FROM categories');
            Database::execute($this->db, 'INSERT INTO categories (id,slug,name,description,kind,icon,scene,sort_order,is_active) VALUES (?,?,?,?,?,?,?,?,1)',
                [Database::uuid(), $slug, $fields['name'], $fields['description'] ?? null, $fields['kind'], $fields['icon'] ?? null, $fields['scene'] ?? null, (int) $order['n']]);
            $this->admin->audit('subject.create', 'category', $slug, ['kind' => $fields['kind']]);
            return $this->subject($slug);
        });
    }

    public function updateSubject(string $slug, array $body): array
    {
        $fields = $this->subjectFields($body, false);
        return Database::transaction($this->db, function () use ($slug, $fields): array {
            if (!Database::one($this->db, 'SELECT id FROM categories WHERE slug=? FOR UPDATE', [$slug])) { throw new ApiError('subject_not_found', 404); }
            if ($fields) {
                $sets = implode(',', array_map(static fn(string $k): string => "$k=?", array_keys($fields)));
                Database::execute($this->db, "UPDATE categories SET $sets WHERE slug=?", [...array_values($fields), $slug]);
            }
            $this->admin->audit('subject.update', 'category', $slug, ['fields' => array_keys($fields)]);
            return $this->subject($slug);
        });
    }

    /** Validated columns from a subject body; keys are fixed column names, never from input. */
    private function subjectFields(array $body, bool $create): array
    {
        $allowed = ['name', 'kind', 'scene', 'icon', 'description', 'sort_order', 'is_active'];
        $problems = [];
        if ($extra = array_diff(array_keys($body), $create ? ['name', 'kind', 'scene', 'icon', 'description'] : $allowed)) {
            $problems[] = ['field' => 'body', 'message' => 'unknown keys ' . implode(', ', $extra)];
        }
        $out = [];
        if ($create || array_key_exists('name', $body)) {
            $name = AdminContent::cleanText($body['name'] ?? null, 160);
            if ($name === null || mb_strlen($name) < 2) { $problems[] = ['field' => 'name', 'message' => 'name must be 2-160 characters']; }
            $out['name'] = $name;
        }
        if ($create || array_key_exists('kind', $body)) {
            if (!in_array($body['kind'] ?? null, ['general', 'school'], true)) { $problems[] = ['field' => 'kind', 'message' => 'kind must be general or school']; }
            $out['kind'] = $body['kind'] ?? null;
        }
        if (array_key_exists('scene', $body)) {
            if ($body['scene'] !== null && !in_array($body['scene'], Content::SCENES, true)) { $problems[] = ['field' => 'scene', 'message' => 'scene must be null or one of ' . implode(', ', Content::SCENES)]; }
            $out['scene'] = $body['scene'];
        }
        if (array_key_exists('icon', $body)) {
            if ($body['icon'] !== null && AdminContent::cleanText($body['icon'], 32) === null) { $problems[] = ['field' => 'icon', 'message' => 'icon must be null or up to 32 characters']; }
            $out['icon'] = $body['icon'] === null ? null : trim($body['icon']);
        }
        if (array_key_exists('description', $body)) {
            if ($body['description'] !== null && AdminContent::cleanText($body['description'], 300) === null) { $problems[] = ['field' => 'description', 'message' => 'description must be null or up to 300 characters']; }
            $out['description'] = $body['description'] === null ? null : trim($body['description']);
        }
        if (array_key_exists('sort_order', $body)) {
            if (!is_int($body['sort_order']) || $body['sort_order'] < -100000 || $body['sort_order'] > 100000) { $problems[] = ['field' => 'sort_order', 'message' => 'sort_order must be an integer']; }
            $out['sort_order'] = $body['sort_order'];
        }
        if (array_key_exists('is_active', $body)) {
            if (!is_bool($body['is_active'])) { $problems[] = ['field' => 'is_active', 'message' => 'is_active must be true or false']; }
            $out['is_active'] = (int) $body['is_active'];
        }
        if ($problems) { throw ApiError::invalid('invalid_subject', $problems); }
        return $out;
    }

    private function subject(string $slug): array
    {
        $row = Database::one($this->db, 'SELECT c.*,(SELECT COUNT(*) FROM quizzes q WHERE q.category_id=c.id AND ' . Catalog::LIVE . ') AS live_quizzes,
            (SELECT COUNT(*) FROM quizzes q WHERE q.category_id=c.id) AS quizzes FROM categories c WHERE c.slug=?', [$slug]);
        if (!$row) { throw new ApiError('subject_not_found', 404); }
        return self::subjectRow($row);
    }

    private static function subjectRow(array $r): array
    {
        return ['slug' => $r['slug'], 'name' => $r['name'], 'description' => $r['description'], 'kind' => $r['kind'],
            'scene' => $r['scene'], 'icon' => $r['icon'], 'sort_order' => (int) $r['sort_order'], 'is_active' => (bool) $r['is_active'],
            'live_quizzes' => (int) $r['live_quizzes'], 'quizzes' => (int) $r['quizzes']];
    }

    private static function plural(int $n, string $one, string $many): string
    {
        return $n . ' ' . ($n === 1 ? $one : $many);
    }
}
