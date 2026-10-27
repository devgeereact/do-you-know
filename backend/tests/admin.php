<?php
declare(strict_types=1);
// Admin API access rules. Needs the throwaway _test database, a server whose config lists
// 'user_TestAdmin0000000001' in admin_subjects, and the matching private key at
// .local-test/jwt-test-private.pem (or DYK_TEST_JWT_PRIVATE). See backend/README.md.
require __DIR__.'/http.php';
use Dyk\Database;
use Firebase\JWT\JWT;

$keyFile = getenv('DYK_TEST_JWT_PRIVATE') ?: dirname(__DIR__, 2).'/.local-test/jwt-test-private.pem';
if (!is_file($keyFile)) { fwrite(STDERR, "Missing .local-test/jwt-test-private.pem (see backend/README.md).\n"); exit(1); }
$private = file_get_contents($keyFile);

function clerkToken(string $subject, string $private): string {
    $claims = ['sub' => $subject, 'sid' => 'sess_fixture', 'iss' => 'https://clerk.example.test', 'azp' => 'http://localhost:5202',
        'iat' => time(), 'nbf' => time() - 1, 'exp' => time() + 120];
    return JWT::encode($claims, $private, 'RS256', 'fixture');
}
function clerkPlayer(string $subject): string {
    global $db;
    $id = Database::uuid();
    Database::execute($db, "INSERT INTO profiles (id,role,nickname) VALUES (?, 'player', ?)", [$id, 'Admin test '.substr($id, 0, 6)]);
    Database::execute($db, "INSERT INTO identities (provider,subject,profile_id) VALUES ('clerk',?,?)", [$subject, $id]);
    return $id;
}

$adminSubject = 'user_TestAdmin0000000001';
$playerSubject = 'user_TestPlayer000'.substr(bin2hex(random_bytes(4)), 0, 8);
$adminId = Database::one($db, "SELECT profile_id FROM identities WHERE provider='clerk' AND subject=?", [$adminSubject])['profile_id'] ?? clerkPlayer($adminSubject);
clerkPlayer($playerSubject);
$admin = clerkToken($adminSubject, $private);
$player = clerkToken($playerSubject, $private);
$guest = request('POST', '/guest-sessions', [])['body']['token'];

$r = request('GET', '/admin/me');
check('admin needs a token', $r['status'] === 401);
$r = request('GET', '/admin/me', null, $guest);
check('a guest is forbidden', $r['status'] === 403 && $r['body']['error']['code'] === 'forbidden');
$r = request('GET', '/admin/me', null, $player);
check('a signed-in player who is not listed is forbidden', $r['status'] === 403);
$r = request('GET', '/admin/me', null, 'not-a-real-token');
check('a bad token is rejected', $r['status'] === 401);
$r = request('GET', '/admin/me', null, $admin);
check('the Super Admin is let in', $r['status'] === 200 && $r['body']['is_admin'] === true);
check('the reply does not echo the Clerk id', !str_contains($r['raw'], $adminSubject));
$r = request('GET', '/admin/nope', null, $admin);
check('unknown admin routes are 404', $r['status'] === 404);
$r = request('GET', '/admin/audit', null, $player);
check('audit log is closed to players', $r['status'] === 403);
$r = request('GET', '/admin/audit', null, $admin);
check('audit log is readable by the admin', $r['status'] === 200 && is_array($r['body']));

Database::execute($db, 'INSERT INTO admin_audit (actor_id,action,target_type,target_id,detail) VALUES (?,?,?,?,?)',
    [$adminId, 'test.write', 'fixture', 'x1', json_encode(['note' => 'fixture'])]);
$r = request('GET', '/admin/audit', null, $admin);
check('audit rows come back newest first with details', $r['body'][0]['action'] === 'test.write' && $r['body'][0]['detail']['note'] === 'fixture');

$big = str_repeat('a', 40000);
$r = request('POST', '/admin/me', ['x' => $big], $admin);
check('admin routes accept bodies over the public 32 KB limit', $r['status'] !== 413);
$r = request('POST', '/attempts', ['x' => $big], $guest);
check('public routes keep the 32 KB body limit', $r['status'] === 413);

fwrite(STDOUT, "$count admin checks passed\n");
