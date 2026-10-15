<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $db=Dyk\Database::connect(Dyk\Config::load(dirname(__DIR__)));
    // Remove expired credentials and throttle buckets only, never player profiles.
    $db->exec('DELETE FROM guest_sessions WHERE expires_at<=UTC_TIMESTAMP() LIMIT 1000');
    $db->exec('DELETE FROM rate_limits WHERE expires_at<=UTC_TIMESTAMP() LIMIT 1000');
    fwrite(STDOUT,"Expired session and rate-limit batch cleaned.\n");
} catch (Throwable $error) { fwrite(STDERR,"Cleanup failed; check private configuration.\n");exit(1); }
