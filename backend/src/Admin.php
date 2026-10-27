<?php
declare(strict_types=1);
namespace Dyk;

/**
 * Staff API under /admin. Every request must come from a verified Clerk session whose subject is
 * listed in the private config key `admin_subjects`. Guests and ordinary players get 403.
 * Every write goes through audit().
 */
final class Admin
{
    public function __construct(
        private readonly \PDO $db,
        private readonly array $config,
        private readonly array $profile,
    ) {}

    /** Clerk subjects allowed in, from the private config. Anything that is not a Clerk id is ignored. */
    public static function subjects(array $config): array
    {
        $list = $config['admin_subjects'] ?? [];
        return is_array($list) ? array_values(array_filter($list, static fn($s): bool => is_string($s) && str_starts_with($s, 'user_'))) : [];
    }

    private function guard(): void
    {
        $identity = Database::one($this->db,
            "SELECT subject FROM identities WHERE profile_id=? AND provider='clerk'", [$this->profile['id']]);
        if (!$identity || !in_array($identity['subject'], self::subjects($this->config), true)) {
            throw new ApiError('forbidden', 403);
        }
        RateLimit::check($this->db, $this->config, 'admin', $this->profile['id'], 300, 60);
    }

    public function audit(string $action, ?string $targetType = null, ?string $targetId = null, ?array $detail = null): void
    {
        Database::execute($this->db,
            'INSERT INTO admin_audit (actor_id,action,target_type,target_id,detail) VALUES (?,?,?,?,?)',
            [$this->profile['id'], $action, $targetType, $targetId,
             $detail === null ? null : json_encode($detail, JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES)]);
    }

    /** @return array|object the JSON reply for the route */
    public function handle(string $method, string $path, array $body): array|object
    {
        $this->guard();
        if ($method === 'GET' && $path === '/admin/me') {
            return ['is_admin' => true];
        }
        if ($method === 'GET' && $path === '/admin/audit') {
            return $this->recentAudit();
        }
        throw new ApiError('not_found', 404);
    }

    private function recentAudit(): array
    {
        $rows = $this->db->query(
            'SELECT a.id,a.action,a.target_type,a.target_id,a.detail,a.created_at FROM admin_audit a ORDER BY a.id DESC LIMIT 50')->fetchAll();
        return array_map(static fn(array $r): array => [
            'id' => (int) $r['id'], 'action' => $r['action'], 'target_type' => $r['target_type'], 'target_id' => $r['target_id'],
            'detail' => $r['detail'] === null ? null : json_decode($r['detail'], true), 'at' => Database::utc($r['created_at']),
        ], $rows);
    }
}
