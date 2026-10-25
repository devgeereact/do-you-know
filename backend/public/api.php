<?php
declare(strict_types=1);

// On cPanel set DYK_BACKEND_DIR in this API directory's Apache configuration:
// SetEnv DYK_BACKEND_DIR /home/CPANEL_USER/do-you-know-private
$private = getenv('DYK_BACKEND_DIR') ?: dirname(__DIR__);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
try {
    if (!is_file($private . '/vendor/autoload.php')) {
        throw new RuntimeException('backend_dependencies_missing');
    }
    require $private . '/vendor/autoload.php';
    Dyk\Api::run(Dyk\Config::load($private));
} catch (Throwable $error) {
    // No paths, SQL, tokens, provider responses or credentials in public errors.
    http_response_code(503);
    echo json_encode(['error' => ['code' => 'service_unavailable']]);
}
