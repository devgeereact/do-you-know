<?php
declare(strict_types=1);

namespace Dyk;

/** Owner-only profile actions. Identity always comes from the verified session. */
final class Player
{
    /** Preset avatars. Keep identical to src/lib/avatars.ts. */
    public const AVATARS = ['fox', 'owl', 'panda', 'lion', 'frog', 'octopus', 'penguin', 'unicorn', 'dragon', 'robot', 'rocket', 'star'];

    /** Generated nickname parts. backend/tests/feeds.php proves no combination is blocked. */
    public const ADJECTIVES = ['Brave','Clever','Happy','Swift','Bright','Lucky','Mighty','Sunny','Jolly','Witty',
        'Calm','Bold','Cosmic','Curious','Gentle','Quick','Sharp','Speedy','Super','Wise'];
    public const ANIMALS = ['Otter','Panda','Falcon','Tiger','Koala','Dolphin','Fox','Owl','Lion','Zebra',
        'Eagle','Gecko','Rhino','Puffin','Turtle','Lynx','Bison','Hedgehog','Penguin','Whale'];

    public function __construct(private readonly \PDO $db, private readonly string $userId) {}

    public function own(): array
    {
        $row = Database::one($this->db,
            'SELECT id,role,nickname,age_band,avatar_id,streak_current,streak_best,last_daily_date,created_at,updated_at FROM profiles WHERE id=?',
            [$this->userId]);
        if (!$row) {
            throw new ApiError('not_signed_in', 401);
        }
        $row['streak_current'] = (int) $row['streak_current'];
        $row['streak_best'] = (int) $row['streak_best'];
        $row['created_at'] = Database::utc($row['created_at']);
        $row['updated_at'] = Database::utc($row['updated_at']);
        return $row;
    }

    public function ageBand(mixed $band): void
    {
        if (!in_array($band, ['under_13', '13_17', '18_plus'], true)) {
            throw new ApiError('invalid_age_band');
        }
        // The condition is atomic: two concurrent requests cannot change a set band.
        Database::execute($this->db,
            'UPDATE profiles SET age_band=? WHERE id=? AND (age_band IS NULL OR age_band=?)',
            [$band, $this->userId, $band]);
        if ($this->own()['age_band'] !== $band) {
            throw new ApiError('age_band_locked');
        }
    }

    /** A safe generated nickname such as "BraveOtter42". New profiles start with one. */
    public static function generateNickname(): string
    {
        return self::ADJECTIVES[random_int(0, count(self::ADJECTIVES)-1)]
            . self::ANIMALS[random_int(0, count(self::ANIMALS)-1)] . random_int(10, 99);
    }

    public function randomNickname(): string
    {
        $nickname = self::generateNickname();
        Database::execute($this->db, 'UPDATE profiles SET nickname=? WHERE id=?', [$nickname, $this->userId]);
        return $nickname;
    }

    public function nickname(mixed $value): string
    {
        if (!is_string($value)) {
            throw new ApiError('invalid_nickname');
        }
        $band = $this->own()['age_band'];
        if ($band === null) {
            throw new ApiError('age_band_required');
        }
        if ($band === 'under_13') {
            throw new ApiError('kids_use_generated_nickname');
        }
        $nickname = trim(preg_replace('/\s+/', ' ', $value));
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9 ._-]{1,18}[A-Za-z0-9]$/D', $nickname)) {
            throw new ApiError('invalid_nickname');
        }
        if (self::isBlocked($this->db, $nickname)) {
            throw new ApiError('nickname_not_allowed');
        }
        Database::execute($this->db, 'UPDATE profiles SET nickname=? WHERE id=?', [$nickname, $this->userId]);
        return $nickname;
    }

    /**
     * Substring match against blocked_words on the lower-cased letters and digits, and again
     * on a leetspeak reading so "sh1t" or "4dmin" are caught too.
     */
    public static function isBlocked(\PDO $db, string $nickname): bool
    {
        $normal = preg_replace('/[^a-z0-9]/', '', strtolower($nickname));
        $leet = strtr($normal, '013457', 'oieast');
        return Database::one($db,
            'SELECT word FROM blocked_words WHERE LOCATE(word,?)>0 OR LOCATE(word,?)>0 LIMIT 1', [$normal, $leet]) !== null;
    }

    public function avatar(mixed $id): void
    {
        if (!is_string($id) || !in_array($id, self::AVATARS, true)) {
            throw new ApiError('invalid_avatar');
        }
        Database::execute($this->db, 'UPDATE profiles SET avatar_id=? WHERE id=?', [$id, $this->userId]);
    }

    public function settings(): array
    {
        Database::execute($this->db, 'INSERT IGNORE INTO app_settings (id,user_id) VALUES (?,?)',
            [Database::uuid(), $this->userId]);
        $row = Database::one($this->db,
            'SELECT id,user_id,theme,notifications_enabled,created_at,updated_at FROM app_settings WHERE user_id=?',
            [$this->userId]);
        if (!$row) {
            throw new ApiError('not_signed_in', 401);
        }
        $row['notifications_enabled'] = (bool) $row['notifications_enabled'];
        $row['created_at'] = Database::utc($row['created_at']);
        $row['updated_at'] = Database::utc($row['updated_at']);
        return $row;
    }

    public function updateSettings(array $input): array
    {
        if (array_diff(array_keys($input), ['theme', 'notifications_enabled'])) {
            throw new ApiError('invalid_settings');
        }
        if (array_key_exists('theme', $input) && !in_array($input['theme'], ['light', 'dark'], true)) {
            throw new ApiError('invalid_settings');
        }
        if (array_key_exists('notifications_enabled', $input) && !is_bool($input['notifications_enabled'])) {
            throw new ApiError('invalid_settings');
        }
        $this->settings();
        // Independent columns prevent lost updates between concurrent preferences.
        if (array_key_exists('theme', $input)) {
            Database::execute($this->db, 'UPDATE app_settings SET theme=? WHERE user_id=?', [$input['theme'], $this->userId]);
        }
        if (array_key_exists('notifications_enabled', $input)) {
            Database::execute($this->db, 'UPDATE app_settings SET notifications_enabled=? WHERE user_id=?',
                [(int) $input['notifications_enabled'], $this->userId]);
        }
        return $this->settings();
    }

    public function history(int $limit): array
    {
        $limit = max(1, min(100, $limit));
        $statement = $this->db->prepare(
            "SELECT a.id,a.mode,a.correct_count,a.answered_count,a.answer_time_ms,a.finished_at,
                q.slug,q.title FROM attempts a LEFT JOIN quizzes q ON q.id=a.quiz_id AND q.status='published'
                WHERE a.user_id=? AND a.status='finished' ORDER BY a.finished_at DESC,a.id DESC LIMIT ?");
        $statement->bindValue(1, $this->userId);
        $statement->bindValue(2, $limit, \PDO::PARAM_INT);
        $statement->execute();
        return array_map(static fn(array $row): array => [
            'attemptId' => $row['id'], 'mode' => $row['mode'],
            'correct' => (int) $row['correct_count'], 'total' => (int) $row['answered_count'],
            'answerTimeMs' => (int) $row['answer_time_ms'],
            'finishedAt' => gmdate('c', strtotime($row['finished_at'] . ' UTC')),
            'quiz' => $row['slug'] === null ? null : ['slug' => $row['slug'], 'title' => $row['title']],
        ], $statement->fetchAll());
    }

    /**
     * Own unfinished attempts that POST /attempts would still resume, newest first, max 5.
     * Mirrors Game::start: practice and ranked need the same published version within 24 hours,
     * daily needs today's live challenge, and a friend challenge must not have expired.
     */
    public function continuing(): array
    {
        $statement = $this->db->prepare(
            "SELECT a.id,a.mode,a.current_index,JSON_LENGTH(a.question_order) AS total,a.started_at,
                q.slug,q.title,f.code FROM attempts a
                JOIN quizzes q ON q.id=a.quiz_id AND q.status='published'
                LEFT JOIN daily_challenges d ON d.id=a.daily_challenge_id
                LEFT JOIN friend_challenges f ON f.id=a.friend_challenge_id
                WHERE a.user_id=? AND a.status='in_progress' AND (
                    (a.mode IN ('practice','ranked') AND a.daily_challenge_id IS NULL AND a.friend_challenge_id IS NULL
                        AND q.current_version_id=a.quiz_version_id AND a.started_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 24 HOUR))
                    OR (a.mode='daily' AND d.challenge_date=? AND d.status='live')
                    OR (a.mode='challenge' AND f.expires_at>UTC_TIMESTAMP(6) AND a.started_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 24 HOUR)))
                ORDER BY a.started_at DESC,a.id DESC LIMIT 5");
        $statement->execute([$this->userId, Competition::londonDate()]);
        return array_map(static fn(array $row): array => [
            'attemptId' => $row['id'], 'mode' => $row['mode'],
            'quiz' => ['slug' => $row['slug'], 'title' => $row['title']],
            'position' => min((int) $row['current_index'] + 1, (int) $row['total']), 'total' => (int) $row['total'],
            'startedAt' => gmdate('c', strtotime($row['started_at'] . ' UTC')),
            'challengeCode' => $row['mode'] === 'challenge' ? $row['code'] : null,
        ], $statement->fetchAll());
    }

    /** Own best finished result per published quiz: most correct, then fastest, then earliest. Max 50. */
    public function best(): array
    {
        $statement = $this->db->prepare(
            "SELECT b.correct_count,b.answered_count,b.answer_time_ms,b.finished_at,q.slug,q.title FROM (
                SELECT a.quiz_id,a.correct_count,a.answered_count,a.answer_time_ms,a.finished_at,
                    ROW_NUMBER() OVER (PARTITION BY a.quiz_id ORDER BY a.correct_count DESC,a.answer_time_ms,a.finished_at,a.id) AS pick
                FROM attempts a WHERE a.user_id=? AND a.status='finished') b
                JOIN quizzes q ON q.id=b.quiz_id AND q.status='published'
                WHERE b.pick=1 ORDER BY b.finished_at DESC,q.slug LIMIT 50");
        $statement->execute([$this->userId]);
        return array_map(static fn(array $row): array => [
            'quiz' => ['slug' => $row['slug'], 'title' => $row['title']],
            'correct' => (int) $row['correct_count'], 'total' => (int) $row['answered_count'],
            'answerTimeMs' => (int) $row['answer_time_ms'],
            'finishedAt' => gmdate('c', strtotime($row['finished_at'] . ' UTC')),
        ], $statement->fetchAll());
    }

    public function delete(array $input): void
    {
        if (($input['confirmed'] ?? false) !== true) {
            throw new ApiError('deletion_confirmation_required');
        }
        // Cascades revoke every guest session and remove owned attempts/settings.
        // The Clerk account itself is separate and must be deleted through Clerk.
        // Feedback stays for the owner's records, but anything personal in it (a written message
        // and a reply address) goes with the player. The row keeps only its type and presets.
        Database::execute($this->db, 'UPDATE feedback SET message=NULL, email=NULL, question_prompt=NULL WHERE profile_id=?', [$this->userId]);
        Database::execute($this->db, 'DELETE FROM profiles WHERE id=?', [$this->userId]);
    }
}
