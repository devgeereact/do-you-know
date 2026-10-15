<?php
declare(strict_types=1);
namespace Dyk;
final class RateLimit
{
    public static function check(\PDO $db, array $config, string $scope, string $identifier, int $limit, int $seconds): void
    {
        $key = hash_hmac('sha256', $scope.':'.$identifier, $config['rate_limit_key']);
        Database::execute($db, 'INSERT INTO rate_limits (bucket_hash,hits,expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE hits=IF(expires_at<=UTC_TIMESTAMP(),1,hits+1), expires_at=IF(expires_at<=UTC_TIMESTAMP(),VALUES(expires_at),expires_at)', [$key, $seconds]);
        $row = Database::one($db, 'SELECT hits FROM rate_limits WHERE bucket_hash=?', [$key]);
        if ((int)$row['hits'] > $limit) { throw new ApiError('rate_limited', 429); }
    }
}
