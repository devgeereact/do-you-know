<?php
declare(strict_types=1);
// Refuses to let the DB-backed tests run against anything but a disposable local database.
// Pure (no database access), so tests/unit.php can check it directly.

/**
 * @param string|false $configFile the DYK_CONFIG value (never fall back to backend/config.php)
 * @return list<string> reasons the config is not a disposable test setup; empty when it is
 */
function testDatabaseProblems(array $config, string|false $configFile, string $localTestDir): array
{
    $problems = [];
    $real = is_string($configFile) && $configFile !== '' ? realpath($configFile) : false;
    $root = realpath($localTestDir);
    if ($real === false || $root === false || !str_starts_with($real, $root.DIRECTORY_SEPARATOR)) {
        $problems[] = 'DYK_CONFIG must name a file inside the gitignored .local-test/ folder';
    }
    if (($config['environment'] ?? null) !== 'test') { $problems[] = 'environment must be "test"'; }
    $db = $config['database'] ?? [];
    $name = (string) ($db['name'] ?? '');
    if (!preg_match('/^[a-z0-9]+(_[a-z0-9]+)*_test$/D', $name)) { $problems[] = 'database name must end in _test'; }
    if (preg_match('/doyouknow|dykspace|devgeereact/i', $name.' '.($db['user'] ?? ''))) { $problems[] = 'database or user looks like production'; }
    if (!in_array($db['host'] ?? '', ['127.0.0.1', 'localhost', '::1'], true)) { $problems[] = 'database host must be this machine'; }
    foreach ($config['allowed_origins'] ?? [] as $origin) {
        if (!is_string($origin) || !preg_match('~^http://(localhost|127\.0\.0\.1)(:\d+)?$~D', $origin)) { $problems[] = 'allowed_origins must be local http origins'; break; }
    }
    return $problems;
}
