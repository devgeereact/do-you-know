<?php
declare(strict_types=1);

namespace Dyk;

/**
 * The parent area: children, hand-over and switches. Every method belongs to one verified grown-up
 * (a Clerk sign-in with a linked profile); the router refuses guest and child tokens before it gets here.
 * A child is a profile with a generated nickname, a preset avatar and one of five level names, plus a row
 * in `children`. Nothing about a child is ever typed, so there is no name, birthday or free text to store.
 */
final class Family
{
    public const LEVELS = ['starters', 'explorers', 'adventurers', 'challengers', 'scholars'];
    public const MAX_CHILDREN = 5;
    /** The switches a parent controls. All off until turned on. Keep identical to src/types (ParentSwitches). */
    public const SWITCHES = ['public_boards', 'challenge_friend', 'beat_clock', 'slider_questions', 'trivia_sets', 'sound', 'easy_read'];

    public function __construct(private readonly \PDO $db, private readonly string $parentId, private readonly array $config) {}

    /** The switches that apply to this profile: its parent's if it is a child, its own otherwise, all off for a guest. */
    public static function switchesFor(\PDO $db, string $profileId): array
    {
        $owner = Database::one($db, 'SELECT parent_profile_id FROM children WHERE profile_id=?', [$profileId])['parent_profile_id'] ?? $profileId;
        $row = Database::one($db, 'SELECT ' . implode(',', self::SWITCHES) . ' FROM parent_settings WHERE parent_profile_id=?', [$owner]);
        $out = [];
        foreach (self::SWITCHES as $key) { $out[$key] = $row !== null && (int) $row[$key] === 1; }
        return $out;
    }

    /** The level of a child profile, or null when the profile is not a child. */
    public static function levelOf(\PDO $db, string $profileId): ?string
    {
        return Database::one($db, 'SELECT level FROM children WHERE profile_id=?', [$profileId])['level'] ?? null;
    }

    public static function isChild(\PDO $db, string $profileId): bool
    {
        return Database::one($db, 'SELECT 1 AS ok FROM children WHERE profile_id=?', [$profileId]) !== null;
    }

    public function children(): array
    {
        $rows = $this->db->prepare('SELECT p.id,p.nickname,p.avatar_id,c.level,c.created_at FROM children c JOIN profiles p ON p.id=c.profile_id WHERE c.parent_profile_id=? ORDER BY c.created_at,p.id');
        $rows->execute([$this->parentId]);
        return ['children' => array_map(self::row(...), $rows->fetchAll())];
    }

    public function add(array $input): array
    {
        $this->only($input, ['avatar_id', 'level']);
        $level = $this->level($input['level'] ?? null);
        $avatar = array_key_exists('avatar_id', $input) ? $this->avatar($input['avatar_id']) : Player::AVATARS[random_int(0, count(Player::AVATARS) - 1)];
        $id = Database::uuid();
        Database::transaction($this->db, function () use ($id, $level, $avatar): array {
            // The parent's row is the lock, so two quick adds cannot pass the limit together.
            if (!Database::one($this->db, 'SELECT id FROM profiles WHERE id=? FOR UPDATE', [$this->parentId])) { throw new ApiError('not_signed_in', 401); }
            $count = (int) Database::one($this->db, 'SELECT COUNT(*) AS n FROM children WHERE parent_profile_id=?', [$this->parentId])['n'];
            if ($count >= self::MAX_CHILDREN) { throw new ApiError('child_limit', 409); }
            Database::execute($this->db, "INSERT INTO profiles (id,role,nickname,avatar_id) VALUES (?, 'guest', ?, ?)", [$id, Player::generateNickname(), $avatar]);
            Database::execute($this->db, 'INSERT INTO children (profile_id,parent_profile_id,level) VALUES (?,?,?)', [$id, $this->parentId, $level]);
            return [];
        });
        return ['child' => $this->one($id)];
    }

    public function change(string $id, array $input): array
    {
        $this->owned($id);
        $this->only($input, ['avatar_id', 'level', 'new_nickname']);
        if ($input === []) { throw new ApiError('invalid_child'); }
        if (array_key_exists('level', $input)) {
            Database::execute($this->db, 'UPDATE children SET level=? WHERE profile_id=?', [$this->level($input['level']), $id]);
        }
        if (array_key_exists('avatar_id', $input)) {
            Database::execute($this->db, 'UPDATE profiles SET avatar_id=? WHERE id=?', [$this->avatar($input['avatar_id']), $id]);
        }
        if (array_key_exists('new_nickname', $input)) {
            if ($input['new_nickname'] !== true) { throw new ApiError('invalid_child'); }
            // Always a generated name: a parent re-rolls it, nobody types one for a child.
            $name = (new Player($this->db, $id))->suggestions()[0] ?? Player::generateNickname();
            Database::execute($this->db, 'UPDATE profiles SET nickname=? WHERE id=?', [$name, $id]);
        }
        return ['child' => $this->one($id)];
    }

    public function remove(string $id, array $input): void
    {
        $this->owned($id);
        if (($input['confirmed'] ?? false) !== true) { throw new ApiError('deletion_confirmation_required'); }
        Player::erase($this->db, [$id]);
    }

    /** A fresh guest session for the child. Any earlier one is revoked, so only the latest device keeps playing. */
    public function handOver(string $id): array
    {
        $this->owned($id);
        $token = 'guest_' . bin2hex(random_bytes(32));
        $expires = gmdate('Y-m-d H:i:s', time() + (int) $this->config['guest_ttl_seconds']);
        Database::transaction($this->db, function () use ($id, $token, $expires): array {
            Database::execute($this->db, 'DELETE FROM guest_sessions WHERE profile_id=?', [$id]);
            Database::execute($this->db, 'INSERT INTO guest_sessions (token_hash,profile_id,expires_at) VALUES (?,?,?)', [hash('sha256', $token), $id, $expires]);
            return [];
        });
        return ['token' => $token, 'expires_at' => gmdate('c', strtotime($expires . ' UTC')), 'child' => $this->one($id)];
    }

    /** One child's skill map and stickers, for their parent. */
    public function skills(string $id): array
    {
        $this->owned($id);
        return ['child' => $this->one($id)] + Learn::record($this->db, $id);
    }

    public function switches(): array
    {
        return ['switches' => self::switchesFor($this->db, $this->parentId)];
    }

    public function setSwitches(array $input): array
    {
        if ($input === [] || array_diff(array_keys($input), self::SWITCHES)) { throw new ApiError('invalid_switches'); }
        foreach ($input as $value) { if (!is_bool($value)) { throw new ApiError('invalid_switches'); } }
        Database::execute($this->db, 'INSERT IGNORE INTO parent_settings (parent_profile_id) VALUES (?)', [$this->parentId]);
        // Independent columns, so two quick changes of different switches do not undo each other.
        foreach ($input as $key => $value) {
            Database::execute($this->db, "UPDATE parent_settings SET `$key`=? WHERE parent_profile_id=?", [(int) $value, $this->parentId]);
        }
        return $this->switches();
    }

    private function only(array $input, array $allowed): void
    {
        if (array_diff(array_keys($input), $allowed)) { throw new ApiError('invalid_child'); }
    }

    private function level(mixed $level): string
    {
        if (!is_string($level) || !in_array($level, self::LEVELS, true)) { throw new ApiError('invalid_level'); }
        return $level;
    }

    private function avatar(mixed $avatar): string
    {
        if (!is_string($avatar) || !in_array($avatar, Player::AVATARS, true)) { throw new ApiError('invalid_avatar'); }
        return $avatar;
    }

    /** The child must belong to this parent; anyone else's is simply not found. */
    private function owned(string $id): void
    {
        if (!preg_match('/^[0-9a-f-]{36}$/D', $id)
            || Database::one($this->db, 'SELECT 1 AS ok FROM children WHERE profile_id=? AND parent_profile_id=?', [$id, $this->parentId]) === null) {
            throw new ApiError('child_not_found', 404);
        }
    }

    private function one(string $id): array
    {
        return self::row(Database::one($this->db, 'SELECT p.id,p.nickname,p.avatar_id,c.level,c.created_at FROM children c JOIN profiles p ON p.id=c.profile_id WHERE c.profile_id=?', [$id]) ?? []);
    }

    private static function row(array $row): array
    {
        return ['id' => $row['id'], 'nickname' => $row['nickname'], 'avatar_id' => $row['avatar_id'], 'level' => $row['level'], 'created_at' => Database::utc($row['created_at'])];
    }
}
