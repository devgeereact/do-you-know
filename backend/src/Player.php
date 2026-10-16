<?php
declare(strict_types=1);

namespace Dyk;

/** Owner-only profile actions. Identity always comes from the verified session. */
final class Player
{
    /** Preset avatars. Keep identical to src/lib/avatars.ts. */
    public const AVATARS = ['fox', 'owl', 'panda', 'lion', 'frog', 'octopus', 'penguin', 'unicorn', 'dragon', 'robot', 'rocket', 'star'];

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

    public function randomNickname(): string
    {
        $adjectives = ['Brave','Clever','Happy','Swift','Bright','Lucky','Mighty','Sunny','Jolly','Witty',
            'Calm','Bold','Cosmic','Curious','Gentle','Quick','Sharp','Speedy','Super','Wise'];
        $animals = ['Otter','Panda','Falcon','Tiger','Koala','Dolphin','Fox','Owl','Lion','Zebra',
            'Eagle','Gecko','Rhino','Puffin','Turtle','Lynx','Bison','Hedgehog','Penguin','Whale'];
        $nickname = $adjectives[random_int(0, count($adjectives)-1)]
            . $animals[random_int(0, count($animals)-1)] . random_int(10, 99);
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
        $normal = preg_replace('/[^a-z0-9]/', '', strtolower($nickname));
        $blocked = Database::one($this->db,
            'SELECT word FROM blocked_words WHERE LOCATE(word,?)>0 LIMIT 1', [$normal]);
        if ($blocked) {
            throw new ApiError('nickname_not_allowed');
        }
        Database::execute($this->db, 'UPDATE profiles SET nickname=? WHERE id=?', [$nickname, $this->userId]);
        return $nickname;
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

    public function delete(array $input): void
    {
        if (($input['confirmed'] ?? false) !== true) {
            throw new ApiError('deletion_confirmation_required');
        }
        // Cascades revoke every guest session and remove owned attempts/settings.
        // The Clerk account itself is separate and must be deleted through Clerk.
        Database::execute($this->db, 'DELETE FROM profiles WHERE id=?', [$this->userId]);
    }
}
