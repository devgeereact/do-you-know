<?php
declare(strict_types=1);

namespace Dyk;

/** Scores are written only by Game::finish inside its owner-locked transaction. */
final class Competition
{
    public function __construct(private readonly \PDO $db, private readonly ?string $userId) {}

    public static function londonDate(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('Europe/London')))->format('Y-m-d');
    }

    public static function weekStart(): string
    {
        $today = new \DateTimeImmutable('today', new \DateTimeZone('Europe/London'));
        return $today->modify('-' . ((int) $today->format('N')-1) . ' days')->format('Y-m-d');
    }

    public function daily(): ?array
    {
        $row = Database::one($this->db,
            "SELECT d.id,d.challenge_date,q.slug,q.title,q.cover_image_url FROM daily_challenges d
             JOIN quizzes q ON q.id=d.quiz_id AND q.status='published'
             WHERE d.challenge_date=? AND d.status='live'", [self::londonDate()]);
        return $row === null ? null : [
            'id' => $row['id'], 'date' => $row['challenge_date'],
            'quiz' => ['slug' => $row['slug'], 'title' => $row['title'], 'cover_image_url' => $row['cover_image_url']],
        ];
    }

    public function dailyFinished(string $id): bool
    {
        return Database::one($this->db,
            "SELECT id FROM attempts WHERE user_id=? AND daily_challenge_id=? AND status='finished' LIMIT 1",
            [$this->userId, $id]) !== null;
    }

    public function challenge(string $code): ?array
    {
        if (!preg_match('/^[A-Za-z0-9]{8}$/D', $code)) {
            return null;
        }
        $row = Database::one($this->db,
            "SELECT f.code,f.expires_at,p.nickname,q.slug,q.title,q.cover_image_url,
             a.correct_count,a.answered_count,a.answer_time_ms FROM friend_challenges f
             JOIN profiles p ON p.id=f.creator_id JOIN attempts a ON a.id=f.creator_attempt_id
             JOIN quizzes q ON q.id=f.quiz_id AND q.status='published' WHERE f.code=?", [$code]);
        if (!$row) {
            return null;
        }
        return [
            'code' => $row['code'], 'expired' => strtotime($row['expires_at'] . ' UTC') <= time(),
            'quiz' => ['slug' => $row['slug'], 'title' => $row['title'], 'cover_image_url' => $row['cover_image_url']],
            'creator' => ['nickname' => $row['nickname'] ?? 'A friend', 'avatar_url' => null],
            'creator_correct' => (int) $row['correct_count'], 'total' => (int) $row['answered_count'],
            'creator_time_ms' => (int) $row['answer_time_ms'],
        ];
    }

    public function createChallenge(string $attemptId): array
    {
        return Database::transaction($this->db, function () use ($attemptId): array {
            Database::one($this->db, 'SELECT id FROM profiles WHERE id=? FOR UPDATE', [$this->userId]);
            $attempt = Database::one($this->db, 'SELECT * FROM attempts WHERE id=? AND user_id=? FOR UPDATE', [$attemptId, $this->userId]);
            if (!$attempt) {
                throw new ApiError('attempt_not_found', 404);
            }
            if ($attempt['status'] !== 'finished') {
                throw new ApiError('attempt_not_finished');
            }
            $existing = Database::one($this->db,
                'SELECT code,expires_at FROM friend_challenges WHERE creator_attempt_id=? AND expires_at>UTC_TIMESTAMP(6) ORDER BY created_at DESC LIMIT 1',
                [$attemptId]);
            if (!$existing) {
                $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
                for ($tries = 0; $tries < 5; $tries++) {
                    $code = '';
                    for ($i = 0; $i < 8; $i++) {
                        $code .= $alphabet[random_int(0, strlen($alphabet)-1)];
                    }
                    try {
                        Database::execute($this->db,
                            'INSERT INTO friend_challenges (id,code,quiz_id,quiz_version_id,creator_id,creator_attempt_id,expires_at)
                             VALUES (?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 30 DAY))',
                            [Database::uuid(), $code, $attempt['quiz_id'], $attempt['quiz_version_id'], $this->userId, $attemptId]);
                        $existing = Database::one($this->db, 'SELECT code,expires_at FROM friend_challenges WHERE code=?', [$code]);
                        break;
                    } catch (\PDOException $error) {
                        if (($error->errorInfo[1] ?? null) !== 1062 || $tries === 4) {
                            throw $error;
                        }
                    }
                }
            }
            return ['code' => $existing['code'], 'expires_at' => Database::utc($existing['expires_at'])];
        });
    }

    private function best(string $board, string $period, array $attempt, int $total): void
    {
        $params = [$board, $attempt['quiz_id'], $period, $attempt['user_id']];
        $old = Database::one($this->db,
            'SELECT correct_count,answer_time_ms FROM leaderboard_entries WHERE board=? AND quiz_id=? AND period_start=? AND user_id=? FOR UPDATE', $params);
        $correct = (int) $attempt['correct_count'];
        $time = (int) $attempt['answer_time_ms'];
        if ($old && ($correct < (int) $old['correct_count'] || ($correct === (int) $old['correct_count'] && $time >= (int) $old['answer_time_ms']))) {
            return;
        }
        if ($old) {
            Database::execute($this->db,
                'UPDATE leaderboard_entries SET attempt_id=?,correct_count=?,total=?,answer_time_ms=?,achieved_at=UTC_TIMESTAMP(6) WHERE board=? AND quiz_id=? AND period_start=? AND user_id=?',
                [$attempt['id'], $correct, $total, $time, ...$params]);
        } else {
            Database::execute($this->db,
                'INSERT INTO leaderboard_entries (attempt_id,correct_count,total,answer_time_ms,board,quiz_id,period_start,user_id) VALUES (?,?,?,?,?,?,?,?)',
                [$attempt['id'], $correct, $total, $time, ...$params]);
        }
    }

    /** Caller holds the player's row and attempt row locks. */
    public function record(array $attempt, int $total): void
    {
        if (in_array($attempt['mode'], ['ranked', 'daily'], true)) {
            $this->best('all_time', '1970-01-01', $attempt, $total);
            $this->best('weekly', self::weekStart(), $attempt, $total);
        }
        if ($attempt['mode'] === 'daily') {
            $daily = Database::one($this->db, 'SELECT challenge_date FROM daily_challenges WHERE id=?', [$attempt['daily_challenge_id']]);
            $this->best('daily', $daily['challenge_date'], $attempt, $total);
            $today = self::londonDate();
            $yesterday = (new \DateTimeImmutable($today))->modify('-1 day')->format('Y-m-d');
            Database::execute($this->db,
                'UPDATE profiles SET streak_current=CASE WHEN last_daily_date=? THEN streak_current WHEN last_daily_date=? THEN streak_current+1 ELSE 1 END,last_daily_date=? WHERE id=?',
                [$today, $yesterday, $today, $attempt['user_id']]);
            Database::execute($this->db, 'UPDATE profiles SET streak_best=GREATEST(streak_best,streak_current) WHERE id=?', [$attempt['user_id']]);
        }
    }

    public function rank(string $board, string $quizId, string $period): ?int
    {
        $row = Database::one($this->db,
            'SELECT 1+(SELECT COUNT(*) FROM leaderboard_entries e JOIN profiles p ON p.id=e.user_id
             WHERE e.board=m.board AND e.quiz_id=m.quiz_id AND e.period_start=m.period_start AND e.is_hidden=0 AND p.nickname IS NOT NULL
             AND (e.correct_count>m.correct_count OR (e.correct_count=m.correct_count AND e.answer_time_ms<m.answer_time_ms)
             OR (e.correct_count=m.correct_count AND e.answer_time_ms=m.answer_time_ms AND e.achieved_at<m.achieved_at))) AS place
             FROM leaderboard_entries m WHERE m.board=? AND m.quiz_id=? AND m.period_start=? AND m.user_id=?',
            [$board, $quizId, $period, $this->userId]);
        return $row ? (int) $row['place'] : null;
    }

    public function leaderboard(?string $slug, string $board, int $limit): array
    {
        if (!in_array($board, ['all_time', 'weekly', 'daily'], true)) {
            throw new ApiError('invalid_board');
        }
        $daily = $board === 'daily' ? $this->daily() : null;
        $slug ??= $daily['quiz']['slug'] ?? null;
        $quiz = Database::one($this->db, "SELECT id FROM quizzes WHERE slug=? AND status='published'", [$slug]);
        if (!$quiz || ($board === 'daily' && (!$daily || $daily['quiz']['slug'] !== $slug))) {
            return ['top' => [], 'me' => null];
        }
        $period = $board === 'daily' ? $daily['date'] : ($board === 'weekly' ? self::weekStart() : '1970-01-01');
        $statement = $this->db->prepare(
            'SELECT RANK() OVER (ORDER BY e.correct_count DESC,e.answer_time_ms,e.achieved_at) AS place,
             p.nickname,e.user_id,e.correct_count,e.total,e.answer_time_ms,e.achieved_at FROM leaderboard_entries e
             JOIN profiles p ON p.id=e.user_id WHERE e.board=? AND e.quiz_id=? AND e.period_start=? AND e.is_hidden=0 AND p.nickname IS NOT NULL
             ORDER BY e.correct_count DESC,e.answer_time_ms,e.achieved_at,e.user_id LIMIT ?');
        $statement->bindValue(1, $board);
        $statement->bindValue(2, $quiz['id']);
        $statement->bindValue(3, $period);
        $statement->bindValue(4, max(1, min(100, $limit)), \PDO::PARAM_INT);
        $statement->execute();
        $top = array_map(fn(array $row): array => [
            'rank' => (int) $row['place'], 'nickname' => $row['nickname'], 'avatar_url' => null,
            'correct' => (int) $row['correct_count'], 'total' => (int) $row['total'],
            'answer_time_ms' => (int) $row['answer_time_ms'], 'achieved_at' => Database::utc($row['achieved_at']),
            'is_me' => $row['user_id'] === $this->userId,
        ], $statement->fetchAll());
        $mine = Database::one($this->db,
            'SELECT correct_count,total,answer_time_ms FROM leaderboard_entries WHERE board=? AND quiz_id=? AND period_start=? AND user_id=?',
            [$board, $quiz['id'], $period, $this->userId]);
        return ['top' => $top, 'me' => $mine ? [
            'rank' => $this->rank($board, $quiz['id'], $period), 'correct' => (int) $mine['correct_count'],
            'total' => (int) $mine['total'], 'answer_time_ms' => (int) $mine['answer_time_ms'],
        ] : null];
    }
}
