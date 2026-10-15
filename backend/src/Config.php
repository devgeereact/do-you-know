<?php
declare(strict_types=1);
namespace Dyk;
final class Config
{
    public static function load(string $directory): array
    {
        $file = getenv('DYK_CONFIG') ?: $directory . '/config.php';
        if (!is_file($file)) {
            throw new \RuntimeException('config_missing');
        }
        $config = require $file;
        if (!is_array($config) || !in_array($config['environment'] ?? '', ['production', 'development', 'test'], true)) {
            throw new \RuntimeException('config_invalid');
        }
        foreach (['allowed_origins', 'database', 'clerk'] as $key) {
            if (empty($config[$key]) || !is_array($config[$key])) {
                throw new \RuntimeException('config_invalid');
            }
        }
        if (strlen($config['rate_limit_key'] ?? '') < 32) {
            throw new \RuntimeException('rate_limit_key_missing');
        }
        foreach ($config['allowed_origins'] as $origin) {
            if (!is_string($origin) || !preg_match('~^https?://[^/]+$~D', $origin) || str_contains($origin, '*')) {
                throw new \RuntimeException('origin_invalid');
            }
            if ($config['environment'] === 'production' && !str_starts_with($origin, 'https://')) {
                throw new \RuntimeException('https_required');
            }
        }
        $ttl = $config['guest_ttl_seconds'] ?? 604800;
        if (!is_int($ttl) || $ttl < 60 || $ttl > 2592000) {
            throw new \RuntimeException('guest_ttl_invalid');
        }
        $config['guest_ttl_seconds'] = $ttl;
        return $config;
    }
}
