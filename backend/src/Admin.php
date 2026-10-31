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

    /** HTTP status for the last handled route (201 for creates). */
    public int $status = 200;

    public function profileId(): string
    {
        return $this->profile['id'];
    }

    /** Name recorded in content_reviews: the admin's nickname, else "Site owner". */
    public function reviewerName(): string
    {
        $name = is_string($this->profile['nickname'] ?? null) && trim($this->profile['nickname']) !== '' ? trim($this->profile['nickname']) : 'Site owner';
        return mb_substr($name, 0, 100);
    }

    public static function isUuid(string $value): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/D', $value) === 1;
    }

    /** An optional enum query parameter; 422 for anything outside the list. */
    public static function queryEnum(array $query, string $key, array $allowed): ?string
    {
        if (!isset($query[$key]) || $query[$key] === '') { return null; }
        if (!is_string($query[$key]) || !in_array($query[$key], $allowed, true)) {
            throw ApiError::invalid('invalid_filter', ['field' => $key, 'allowed' => $allowed]);
        }
        return $query[$key];
    }

    /** limit=1..$max, default $default. The result is a safe integer for a LIMIT clause. */
    public static function queryLimit(array $query, int $default, int $max): int
    {
        $limit = $query['limit'] ?? (string) $default;
        if (!is_string($limit) || !preg_match('/^[0-9]{1,4}$/D', $limit) || (int) $limit < 1 || (int) $limit > $max) {
            throw ApiError::invalid('invalid_limit', ['min' => 1, 'max' => $max]);
        }
        return (int) $limit;
    }

    /**
     * Routes: GET for reads, POST for writes. See AdminContent, AdminOps and Feedback for shapes.
     * Unknown routes and wrong methods are 404, so the admin surface cannot be probed by method.
     * @return array|object the JSON reply for the route
     */
    public function handle(string $method, string $path, array $body, array $query = []): array|object
    {
        $this->guard();
        $get = $method === 'GET';
        $post = $method === 'POST';
        if ($get && $path === '/admin/me') {
            return ['is_admin' => true];
        }
        if ($get && $path === '/admin/audit') {
            return $this->recentAudit();
        }
        $content = new AdminContent($this->db, $this);
        $ops = new AdminOps($this->db, $this);
        $feedback = new Feedback($this->db);
        $uuid = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';
        if ($path === '/admin/quizzes') {
            if ($get) { return $content->list($query); }
            if ($post) { $this->status = 201; return $content->create($body); }
        }
        if (preg_match("~^/admin/quizzes/$uuid(?:/(append|submit|unsubmit|check|publish|retire|restore|discard))?$~D", $path, $m)) {
            $action = $m[2] ?? '';
            if ($get && $action === '') { return $content->detail($m[1]); }
            if ($post) {
                return match ($action) {
                    '' => $content->save($m[1], $body), 'append' => $content->append($m[1], $body),
                    'submit' => $content->submit($m[1]), 'unsubmit' => $content->unsubmit($m[1]),
                    'check' => $content->check($m[1], $body), 'publish' => $content->publish($m[1], $body),
                    'retire' => $content->retire($m[1]), 'restore' => $content->restore($m[1]), 'discard' => $content->discard($m[1]),
                };
            }
        }
        if ($get && $path === '/admin/todo') { return $ops->todo(); }
        if ($get && $path === '/admin/stats') { return $ops->stats(); }
        if ($path === '/admin/daily') {
            if ($get) { return $ops->dailyMonth($query); }
            if ($post) { return $ops->setDaily($body); }
        }
        if ($get && $path === '/admin/rounds') { return $ops->rounds($query); }
        if ($post && preg_match("~^/admin/rounds/$uuid/hide$~D", $path, $m)) { return $ops->hideRound($m[1], $body); }
        if ($path === '/admin/subjects') {
            if ($get) { return $ops->subjects(); }
            if ($post) { $this->status = 201; return $ops->createSubject($body); }
        }
        if ($post && preg_match('~^/admin/subjects/([a-z0-9-]{1,100})$~D', $path, $m)) { return $ops->updateSubject($m[1], $body); }
        $generator = new Generator($this->db, $this->config, $this, $content);
        if ($get && $path === '/admin/generator') { return $generator->status(); }
        if ($post && $path === '/admin/generator/runs') { $this->status = 201; return $generator->create($body); }
        if (preg_match("~^/admin/generator/runs/$uuid(?:/(step|send))?$~D", $path, $m)) {
            $action = $m[2] ?? '';
            if ($get && $action === '') { return $generator->detail($m[1]); }
            if ($post && $action === 'step') { return $generator->step($m[1]); }
            if ($post && $action === 'send') { return $generator->send($m[1], $body); }
        }
        if ($post && preg_match("~^/admin/generator/drafts/$uuid$~D", $path, $m)) { return $generator->decide($m[1], $body); }
        if ($get && $path === '/admin/feedback') { return $feedback->adminList($query); }
        if (preg_match("~^/admin/feedback/$uuid(?:/(reply|note|status))?$~D", $path, $m)) {
            $action = $m[2] ?? '';
            if ($get && $action === '') { return $feedback->adminDetail($m[1]); }
            if ($post && $action === 'reply') { return $feedback->reply($this, $this->config, $m[1], $body); }
            if ($post && $action === 'note') { return $feedback->note($this, $m[1], $body); }
            if ($post && $action === 'status') { return $feedback->setStatus($this, $m[1], $body); }
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
