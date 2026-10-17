<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $db=Dyk\Database::connect(Dyk\Config::load(dirname(__DIR__)));
    // Remove expired credentials and throttle buckets only, never player profiles.
    // Short batches, repeated until one comes back smaller than the limit, so a busy hour
    // never leaves expired rows behind.
    foreach (['guest_sessions', 'rate_limits'] as $table) {
        for ($batch = 0; $batch < 500; $batch++) {
            if ($db->exec("DELETE FROM $table WHERE expires_at<=UTC_TIMESTAMP() LIMIT 1000") < 1000) { break; }
        }
    }
    fwrite(STDOUT,"Expired sessions and rate-limit buckets cleaned.\n");
} catch (Throwable $error) { fwrite(STDERR,"Cleanup failed; check private configuration.\n");exit(1); }
