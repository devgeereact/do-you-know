<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $db=Dyk\Database::connect(Dyk\Config::load(dirname(__DIR__)));
    // Remove expired credentials and throttle buckets only, never player profiles.
    // Short batches, repeated until one comes back smaller than the limit, so a busy hour
    // never leaves rows behind.
    $drain = static function (string $sql) use ($db): int {
        $total = 0;
        for ($batch = 0; $batch < 500; $batch++) {
            $n = $db->exec($sql.' LIMIT 1000');
            $total += $n;
            if ($n < 1000) { break; }
        }
        return $total;
    };
    $drain('DELETE FROM rate_limits WHERE expires_at<=UTC_TIMESTAMP()');
    // An expired device code no longer signs anyone in, but its row is kept for 30 days as the
    // record of when the player last played (owner decision, 17 October 2026).
    $drain('DELETE FROM guest_sessions WHERE expires_at<=UTC_TIMESTAMP() - INTERVAL 30 DAY');
    // A guest with no device code left has not played for 30 days and can never be reached
    // again: remove the player and, by cascade, their games and board rows. Anyone with an
    // adult sign-in identity is kept, as are staff roles.
    $removed = $drain("DELETE FROM profiles WHERE role IN ('guest','player')
        AND created_at<=UTC_TIMESTAMP() - INTERVAL 30 DAY
        AND NOT EXISTS (SELECT 1 FROM guest_sessions s WHERE s.profile_id=profiles.id)
        AND NOT EXISTS (SELECT 1 FROM identities i WHERE i.profile_id=profiles.id)");
    fwrite(STDOUT,"Cleaned expired buckets and codes; removed $removed unused guest players.\n");
} catch (Throwable $error) { fwrite(STDERR,"Cleanup failed; check private configuration.\n");exit(1); }
