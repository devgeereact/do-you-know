<?php
declare(strict_types=1);
// Local development only: prints a short-lived Clerk-style session token for the dev admin, signed
// with the test key in .local-test/. Refuses to run unless DYK_CONFIG is a .local-test config.
//   DYK_CONFIG=.local-test/dev-env.php php bin/dev-admin-token.php [user_Subject]
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/vendor/autoload.php';
use Dyk\Config;
use Dyk\Database;
use Firebase\JWT\JWT;

$localTest = dirname(__DIR__, 2).'/.local-test';
$file = getenv('DYK_CONFIG');
$real = $file ? realpath($file) : false;
$root = realpath($localTest);
if ($real === false || $root === false || !str_starts_with($real, $root.DIRECTORY_SEPARATOR)) {
    fwrite(STDERR, "Refusing: DYK_CONFIG must be a file inside .local-test/.\n"); exit(1);
}
$config = Config::load(dirname(__DIR__));
if (!in_array($config['environment'], ['development', 'test'], true) || !in_array($config['database']['host'], ['127.0.0.1', 'localhost'], true)) {
    fwrite(STDERR, "Refusing: not a local development or test config.\n"); exit(1);
}
$subject = $argv[1] ?? ($config['admin_subjects'][0] ?? null);
if (!is_string($subject) || !in_array($subject, $config['admin_subjects'] ?? [], true)) {
    fwrite(STDERR, "Subject must be listed in the config's admin_subjects.\n"); exit(1);
}
$keyFile = $localTest.'/jwt-test-private.pem';
if (!is_file($keyFile)) { fwrite(STDERR, "Missing $keyFile\n"); exit(1); }
$db = Database::connect($config);
if (!Database::one($db, "SELECT profile_id FROM identities WHERE provider='clerk' AND subject=?", [$subject])) {
    $id = Database::uuid();
    Database::execute($db, "INSERT INTO profiles (id,role,nickname) VALUES (?, 'player', ?)", [$id, 'Dev admin']);
    Database::execute($db, "INSERT INTO identities (provider,subject,profile_id) VALUES ('clerk',?,?)", [$subject, $id]);
}
$party = $config['clerk']['authorized_parties'][0];
fwrite(STDOUT, JWT::encode(['sub' => $subject, 'sid' => 'sess_dev', 'iss' => $config['clerk']['issuer'], 'azp' => $party,
    'iat' => time(), 'nbf' => time() - 1, 'exp' => time() + 3600], file_get_contents($keyFile), 'RS256', 'dev')."\n");
