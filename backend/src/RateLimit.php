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

    /** Cloudflare edge ranges from https://www.cloudflare.com/ips (checked 17 October 2026). */
    private const CLOUDFLARE = [
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
        '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
        '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
        '2a06:98c0::/29', '2c0f:f248::/32',
    ];

    /**
     * The visitor's address for throttling. Behind the proxied Cloudflare record every request
     * arrives from an edge address, so without this all players would share a few buckets.
     * CF-Connecting-IP is trusted only when the connection itself comes from Cloudflare.
     */
    public static function clientIp(array $server): string
    {
        $remote = is_string($server['REMOTE_ADDR'] ?? null) ? $server['REMOTE_ADDR'] : 'unknown';
        $forwarded = $server['HTTP_CF_CONNECTING_IP'] ?? null;
        if (is_string($forwarded) && filter_var($forwarded, FILTER_VALIDATE_IP) && self::fromCloudflare($remote)) {
            return $forwarded;
        }
        return $remote;
    }

    private static function fromCloudflare(string $ip): bool
    {
        $packed = @inet_pton($ip);
        if ($packed === false) { return false; }
        foreach (self::CLOUDFLARE as $range) {
            [$net, $bits] = explode('/', $range);
            $netPacked = inet_pton($net);
            if (strlen($netPacked) !== strlen($packed)) { continue; }
            $bytes = intdiv((int) $bits, 8);
            $rest = (int) $bits % 8;
            if (substr($packed, 0, $bytes) !== substr($netPacked, 0, $bytes)) { continue; }
            if ($rest === 0) { return true; }
            $mask = (0xff << (8 - $rest)) & 0xff;
            if ((ord($packed[$bytes]) & $mask) === (ord($netPacked[$bytes]) & $mask)) { return true; }
        }
        return false;
    }
}
