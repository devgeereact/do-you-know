<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Overall leaderboard across every quiz. Public; a session token only adds is_me and "me".
 *
 * GET /leaderboards/overall?period=day|week|month|all&limit=1..100 (default week, 50)
 *   200 {"period":"week",
 *        "rows":[{"rank":1,"nickname":"BraveOtter42","avatar_id":"fox"|null,"points":180,"accuracy":90,
 *                 "rounds":3,"quizzes":2,"is_me":false}],
 *        "me": row|null,            (the viewer's row even when outside the limit; null when not ranked)
 *        "facts":{"rounds":12,"accuracy":71,"top_category":{"slug":"history","name":"History"}|null,
 *                 "gap":30|null}}
 *   422 invalid_period | invalid_limit. Cache-Control: private, max-age=30.
 *
 * Rounds counted: finished ranked and daily attempts, not hidden by the owner, by players with a
 * nickname, finished inside the period (Europe/London: today, since Monday 00:00, since the 1st).
 * Per player and quiz the best round counts (highest share right, then lowest time): points are the
 * sum of those best correct answers x 10. Accuracy is right/answered over all their rounds in the
 * period. Order: points, accuracy, average ms per answer, nickname. Equal points, accuracy and pace
 * share a rank. facts.rounds/accuracy/top_category describe everyone in the period; facts.gap is
 * the points the viewer needs to draw level with the player just above them (null if not ranked or first).
 */
final class Overall
{
    public const PERIODS = ['day', 'week', 'month', 'all'];

    public function __construct(private readonly \PDO $db) {}

    /** UTC start of the London period, or null for all time. */
    public static function periodStart(string $period, ?\DateTimeImmutable $now = null): ?string
    {
        $london = new \DateTimeZone('Europe/London');
        $today = ($now ?? new \DateTimeImmutable('now'))->setTimezone($london)->setTime(0, 0);
        $start = match ($period) {
            'day' => $today,
            'week' => $today->modify('-' . ((int) $today->format('N') - 1) . ' days'),
            'month' => $today->modify('first day of this month')->setTime(0, 0),
            'all' => null,
            default => throw new ApiError('invalid_period', 422),
        };
        return $start?->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
    }

    public function board(string $period, int $limit, ?string $viewerId): array
    {
        $start = self::periodStart($period);
        $limit = max(1, min(100, $limit));
        $args = $start === null ? [] : [$start];
        // Uses attempts_period (status, mode, finished_at).
        $rounds = "a AS (SELECT a.id,a.user_id,a.quiz_id,a.correct_count,a.answered_count,a.answer_time_ms
            FROM attempts a JOIN profiles pr ON pr.id=a.user_id
            WHERE a.status='finished' AND a.mode IN ('ranked','daily') AND a.is_hidden=0 AND a.answered_count>0
            AND pr.nickname IS NOT NULL" . ($start === null ? '' : ' AND a.finished_at>=?') . ')';
        $sql = "WITH $rounds,
            b AS (SELECT user_id,correct_count,ROW_NUMBER() OVER (PARTITION BY user_id,quiz_id
                ORDER BY correct_count/answered_count DESC,answer_time_ms,id) AS pick FROM a),
            p AS (SELECT user_id,SUM(correct_count)*10 AS points,COUNT(*) AS quizzes FROM b WHERE pick=1 GROUP BY user_id),
            t AS (SELECT user_id,SUM(correct_count) AS c,SUM(answered_count) AS n,SUM(answer_time_ms) AS ms,COUNT(*) AS rounds FROM a GROUP BY user_id),
            r AS (SELECT t.user_id,pr.nickname,pr.avatar_id,p.points,p.quizzes,t.rounds,ROUND(100*t.c/t.n) AS accuracy,t.ms/t.n AS pace
                FROM t JOIN p ON p.user_id=t.user_id JOIN profiles pr ON pr.id=t.user_id),
            ranked AS (SELECT r.*,RANK() OVER (ORDER BY points DESC,accuracy DESC,pace) AS place,
                ROW_NUMBER() OVER (ORDER BY points DESC,accuracy DESC,pace,nickname,user_id) AS pos FROM r),
            gaps AS (SELECT ranked.*,LAG(points) OVER (ORDER BY pos) AS above FROM ranked)
            SELECT user_id,nickname,avatar_id,points,quizzes,rounds,accuracy,place,pos,above FROM gaps
            WHERE pos<=? OR user_id=? ORDER BY pos";
        $statement = $this->db->prepare($sql);
        $i = 1;
        foreach ($args as $arg) { $statement->bindValue($i++, $arg); }
        $statement->bindValue($i++, $limit, \PDO::PARAM_INT);
        $statement->bindValue($i, $viewerId ?? '');
        $statement->execute();
        $rows = [];
        $me = null;
        $gap = null;
        foreach ($statement->fetchAll() as $row) {
            $out = ['rank' => (int) $row['place'], 'nickname' => $row['nickname'], 'avatar_id' => $row['avatar_id'],
                'points' => (int) $row['points'], 'accuracy' => (int) $row['accuracy'], 'rounds' => (int) $row['rounds'],
                'quizzes' => (int) $row['quizzes'], 'is_me' => $viewerId !== null && $row['user_id'] === $viewerId];
            if ((int) $row['pos'] <= $limit) { $rows[] = $out; }
            if ($out['is_me']) {
                $me = $out;
                $gap = $row['above'] === null ? null : (int) $row['above'] - (int) $row['points'];
            }
        }
        $totals = Database::one($this->db, "WITH $rounds SELECT COUNT(*) AS rounds,SUM(correct_count) AS c,SUM(answered_count) AS n FROM a", $args);
        $top = Database::one($this->db, "WITH $rounds SELECT c.slug,c.name,COUNT(*) AS n FROM a
            JOIN quizzes q ON q.id=a.quiz_id JOIN categories c ON c.id=q.category_id
            GROUP BY c.id,c.slug,c.name,c.sort_order ORDER BY n DESC,c.sort_order,c.slug LIMIT 1", $args);
        return ['period' => $period, 'rows' => $rows, 'me' => $me, 'facts' => [
            'rounds' => (int) $totals['rounds'],
            'accuracy' => (int) $totals['n'] > 0 ? (int) round(100 * (int) $totals['c'] / (int) $totals['n']) : null,
            'top_category' => $top ? ['slug' => $top['slug'], 'name' => $top['name']] : null,
            'gap' => $gap,
        ]];
    }
}
