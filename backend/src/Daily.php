<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Daily challenge activator, run by cron (bin/daily.php). Idempotent: running it
 * twice in one London day changes nothing the second time.
 */
final class Daily
{
    public function __construct(private readonly \PDO $db) {}

    /** @return array{date:string,closed:int,action:string,quiz_slug:?string} */
    public function activate(?string $today = null): array
    {
        $today ??= Competition::londonDate();
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', $today)) {
            throw new \InvalidArgumentException('invalid_date');
        }
        return Database::transaction($this->db, function () use ($today): array {
            // Earlier days close, including scheduled rows that never went live.
            $close = $this->db->prepare(
                "UPDATE daily_challenges SET status='done' WHERE challenge_date<? AND status IN ('scheduled','live')");
            $close->execute([$today]);
            $closed = $close->rowCount();

            $row = Database::one($this->db,
                "SELECT d.id,d.status,q.slug,(" . Catalog::LIVE . ") AS quiz_live FROM daily_challenges d
                 JOIN quizzes q ON q.id=d.quiz_id WHERE d.challenge_date=? FOR UPDATE", [$today]);

            if ($row && $row['status'] === 'live') {
                return $this->summary($today, $closed, 'already_live', $row['slug']);
            }
            if ($row && $row['status'] === 'scheduled' && (int) $row['quiz_live'] === 1) {
                Database::execute($this->db, "UPDATE daily_challenges SET status='live' WHERE id=?", [$row['id']]);
                return $this->summary($today, $closed, 'activated', $row['slug']);
            }
            if ($row && $row['status'] === 'done') {
                // An owner closed today's challenge by hand; respect it.
                return $this->summary($today, $closed, 'closed_today', $row['slug']);
            }

            $pick = $this->pick($today);
            if ($pick === null) {
                return $this->summary($today, $closed, 'none_available', null);
            }
            if ($row) {
                // Scheduled quiz was unpublished (or is not live yet). Scheduled rows have no attempts, so swap it.
                Database::execute($this->db,
                    "UPDATE daily_challenges SET quiz_id=?,quiz_version_id=?,status='live' WHERE id=?",
                    [$pick['id'], $pick['current_version_id'], $row['id']]);
                return $this->summary($today, $closed, 'replaced', $pick['slug']);
            }
            Database::execute($this->db,
                "INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')",
                [Database::uuid(), $today, $pick['id'], $pick['current_version_id']]);
            return $this->summary($today, $closed, 'auto_picked', $pick['slug']);
        });
    }

    /** Least recently used published quiz; ties break by a hash of the date so picks vary. */
    private function pick(string $today): ?array
    {
        return Database::one($this->db,
            "SELECT q.id,q.slug,q.current_version_id FROM quizzes q
             JOIN quiz_versions v ON v.id=q.current_version_id AND v.quiz_id=q.id
             LEFT JOIN (SELECT quiz_id,MAX(challenge_date) AS last_used FROM daily_challenges GROUP BY quiz_id) u
               ON u.quiz_id=q.id
             WHERE " . Catalog::LIVE . "
             ORDER BY u.last_used IS NOT NULL, u.last_used, SHA2(CONCAT(?,q.id),256)
             LIMIT 1", [$today]);
    }

    private function summary(string $date, int $closed, string $action, ?string $slug): array
    {
        return ['date' => $date, 'closed' => $closed, 'action' => $action, 'quiz_slug' => $slug];
    }
}
