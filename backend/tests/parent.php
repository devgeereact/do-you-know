<?php
declare(strict_types=1);
// The parent area: children (profiles with a preset name, avatar and level), the parent's switches, hand-over
// and erasure. Needs the throwaway _test database and the test JWT key, as admin.php.
require __DIR__.'/http.php';
use Dyk\Database;
use Firebase\JWT\JWT;

$keyFile = getenv('DYK_TEST_JWT_PRIVATE') ?: dirname(__DIR__, 2).'/.local-test/jwt-test-private.pem';
if (!is_file($keyFile)) { fwrite(STDERR, "Missing .local-test/jwt-test-private.pem (see backend/README.md).\n"); exit(1); }
$private = file_get_contents($keyFile);
$token = fn(string $subject): string => JWT::encode(['sub' => $subject, 'sid' => 'sess_fixture', 'iss' => 'https://clerk.example.test', 'azp' => 'http://localhost:5202',
    'iat' => time(), 'nbf' => time() - 1, 'exp' => time() + 900], $private, 'RS256', 'fixture');
$tag = substr(bin2hex(random_bytes(4)), 0, 8);
$parent = function (string $name) use ($db, $token, $tag): array {
    $subject = 'user_Parent'.$name.$tag; $id = Database::uuid();
    Database::execute($db, "INSERT INTO profiles (id,role,nickname) VALUES (?, 'player', ?)", [$id, 'Parent'.$name.substr($id, 0, 4)]);
    Database::execute($db, "INSERT INTO identities (provider,subject,profile_id) VALUES ('clerk',?,?)", [$subject, $id]);
    return ['id' => $id, 'token' => $token($subject)];
};
$A = $parent('A'); $B = $parent('B');
$guest = request('POST', '/guest-sessions', [])['body'];
$call = function (string $method, string $path, ?array $body, string $tok) use ($db) { $db->exec('DELETE FROM rate_limits'); return request($method, $path, $body, $tok); };
$flags = ['public_boards', 'challenge_friend', 'beat_clock', 'slider_questions', 'trivia_sets', 'sound', 'easy_read'];

// ---- Who may call: only a verified grown-up sign-in ----
$r = request('GET', '/parent/children');
check('the parent area needs a sign-in', $r['status'] === 401);
$r = $call('GET', '/parent/children', null, $guest['token']);
check('a guest is refused', $r['status'] === 403 && $r['body']['error']['code'] === 'parent_sign_in_required');
$unlinked = $token('user_Unlinked'.$tag);
$r = $call('GET', '/parent/children', null, $unlinked);
check('a Clerk sign-in with no linked profile is refused', $r['status'] === 401);
$r = $call('GET', '/parent/children', null, 'not-a-token');
check('a made-up token is refused', in_array($r['status'], [401, 403], true));

// ---- Adding a child: presets only, nothing typed ----
$r = $call('GET', '/parent/children', null, $A['token']);
check('a new parent has no children', $r['status'] === 200 && $r['body'] === ['children' => []]);
$r = $call('POST', '/parent/children', ['avatar_id' => 'fox', 'level' => 'explorers'], $A['token']);
$kid = $r['body']['child'] ?? [];
check('a parent adds a child with a generated nickname, a preset avatar and a level', $r['status'] === 201
    && preg_match('/^[A-Z][a-z]+[A-Z][a-z]+\d\d$/D', (string) ($kid['nickname'] ?? '')) === 1 && $kid['avatar_id'] === 'fox' && $kid['level'] === 'explorers');
$row = Database::one($db, 'SELECT p.role,p.age_band,p.avatar_id,c.parent_profile_id,c.level FROM profiles p JOIN children c ON c.profile_id=p.id WHERE p.id=?', [$kid['id']]);
check('the child is a guest-role profile linked to the parent, with no age band', $row['role'] === 'guest' && $row['age_band'] === null && $row['parent_profile_id'] === $A['id'] && $row['level'] === 'explorers');
check('nothing identifying is stored for a child', Database::one($db, "SELECT COUNT(*) AS n FROM identities WHERE profile_id=?", [$kid['id']])['n'] === '0' || (int) Database::one($db, "SELECT COUNT(*) AS n FROM identities WHERE profile_id=?", [$kid['id']])['n'] === 0);
foreach ([
    'a typed nickname' => ['nickname' => 'RealName', 'level' => 'starters'],
    'a name field' => ['name' => 'Sam', 'level' => 'starters'],
    'a birthday' => ['birthday' => '2018-01-01', 'level' => 'starters'],
    'an unknown level' => ['level' => 'genius'],
    'a missing level' => ['avatar_id' => 'fox'],
    'an avatar that is not a preset' => ['avatar_id' => 'https://x.test/a.png', 'level' => 'starters'],
    'a number for the level' => ['level' => 3],
] as $name => $body) {
    $r = $call('POST', '/parent/children', $body, $A['token']);
    check("adding a child is refused with $name", $r['status'] === 400);
}
check('refused adds created nothing', (int) Database::one($db, 'SELECT COUNT(*) AS n FROM children WHERE parent_profile_id=?', [$A['id']])['n'] === 1);
$r = $call('POST', '/parent/children', ['level' => 'starters'], $A['token']);
check('an avatar is chosen for the child when none is given', $r['status'] === 201 && in_array($r['body']['child']['avatar_id'], \Dyk\Player::AVATARS, true));
for ($i = 0; $i < 3; $i++) { $call('POST', '/parent/children', ['level' => 'scholars'], $A['token']); }
$r = $call('POST', '/parent/children', ['level' => 'starters'], $A['token']);
check('a parent can have at most 5 children', $r['status'] === 409 && $r['body']['error']['code'] === 'child_limit');
$list = $call('GET', '/parent/children', null, $A['token'])['body']['children'];
check('the list holds five children with only safe fields', count($list) === 5 && !array_diff(array_keys($list[0]), ['id', 'nickname', 'avatar_id', 'level', 'created_at']));

// ---- Scope: parent B cannot see or touch parent A's child ----
$r = $call('GET', '/parent/children', null, $B['token']);
check("parent B does not see parent A's children", $r['body'] === ['children' => []]);
$r = $call('POST', '/parent/children/'.$kid['id'], ['level' => 'scholars'], $B['token']);
check("parent B cannot change parent A's child", $r['status'] === 404 && $r['body']['error']['code'] === 'child_not_found');
$r = $call('POST', '/parent/children/'.$kid['id'].'/delete', ['confirmed' => true], $B['token']);
check("parent B cannot remove parent A's child", $r['status'] === 404);
$r = $call('POST', '/parent/children/'.$kid['id'].'/hand-over', [], $B['token']);
check("parent B cannot hand over parent A's child", $r['status'] === 404);
check("parent A's child is untouched", Database::one($db, 'SELECT level FROM children WHERE profile_id=?', [$kid['id']])['level'] === 'explorers');
$r = $call('POST', '/parent/children/not-an-id', ['level' => 'scholars'], $A['token']);
check('a malformed child id is not found, never a 500', in_array($r['status'], [404, 400], true));

// ---- Changing a child ----
$old = $kid['nickname'];
$r = $call('POST', '/parent/children/'.$kid['id'], ['level' => 'adventurers', 'avatar_id' => 'owl'], $A['token']);
check('level and avatar can be changed', $r['status'] === 200 && $r['body']['child']['level'] === 'adventurers' && $r['body']['child']['avatar_id'] === 'owl');
$r = $call('POST', '/parent/children/'.$kid['id'], ['new_nickname' => true], $A['token']);
check('the nickname can be re-rolled to another generated one, never typed', $r['status'] === 200 && $r['body']['child']['nickname'] !== $old
    && preg_match('/^[A-Z][a-z]+[A-Z][a-z]+\d\d$/D', $r['body']['child']['nickname']) === 1);
foreach (['a typed nickname' => ['nickname' => 'Bob'], 'an unknown level' => ['level' => 'x'], 'an unknown key' => ['age' => 7], 'an empty change' => []] as $name => $body) {
    check("changing a child is refused with $name", $call('POST', '/parent/children/'.$kid['id'], $body, $A['token'])['status'] === 400);
}

// ---- Hand-over: the child gets a session of their own ----
$r = $call('POST', '/parent/children/'.$kid['id'].'/hand-over', [], $A['token']);
$kidToken = $r['body']['token'] ?? '';
check('hand-over returns a guest token for the child', $r['status'] === 200 && str_starts_with($kidToken, 'guest_') && $r['body']['child']['id'] === $kid['id']);
$me = request('GET', '/me', null, $kidToken)['body'];
check("the child's own profile shows their level and no switches on", ($me['id'] ?? null) === $kid['id'] && ($me['child']['level'] ?? null) === 'adventurers'
    && count(array_filter($me['switches'])) === 0 && array_keys($me['switches']) === $flags);
$r = $call('POST', '/parent/children/'.$kid['id'].'/hand-over', [], $A['token']);
check('a second hand-over replaces the first token', $r['status'] === 200 && request('GET', '/me', null, $kidToken)['status'] === 401
    && request('GET', '/me', null, $r['body']['token'])['status'] === 200);
$kidToken = $r['body']['token'];
foreach ([['GET', '/parent/children'], ['POST', '/parent/children'], ['GET', '/parent/switches'], ['POST', '/parent/switches'], ['POST', '/parent/children/'.$kid['id']], ['POST', '/parent/children/'.$kid['id'].'/hand-over'], ['POST', '/parent/children/'.$kid['id'].'/delete']] as [$m, $p]) {
    $r = $call($m, $p, $m === 'POST' ? ['level' => 'starters'] : null, $kidToken);
    check("a child's token is refused by $m $p", $r['status'] === 403 && $r['body']['error']['code'] === 'parent_sign_in_required');
}
$r = $call('POST', '/me/delete', ['confirmed' => true], $kidToken);
check('a child device cannot erase the child; the parent does', $r['status'] === 403 && $r['body']['error']['code'] === 'child_managed_by_parent');
check('the child is still there', Database::one($db, 'SELECT id FROM profiles WHERE id=?', [$kid['id']]) !== null);
$r = $call('POST', '/me/age-band', ['band' => '18_plus'], $kidToken);
check('a child cannot claim an adult band', $r['status'] === 403);

// ---- Switches: the parent decides, all off to begin with ----
$r = $call('GET', '/parent/switches', null, $A['token']);
check('every switch starts off', $r['status'] === 200 && array_keys($r['body']['switches']) === $flags && count(array_filter($r['body']['switches'])) === 0);
$r = $call('POST', '/parent/switches', ['public_boards' => true, 'sound' => true], $A['token']);
check('switches can be turned on one at a time or together', $r['status'] === 200 && $r['body']['switches']['public_boards'] === true && $r['body']['switches']['sound'] === true && $r['body']['switches']['beat_clock'] === false);
$r = $call('POST', '/parent/switches', ['sound' => false], $A['token']);
check('a switch can be turned off again and the others stay', $r['body']['switches']['sound'] === false && $r['body']['switches']['public_boards'] === true);
foreach (['an unknown switch' => ['music' => true], 'a number' => ['sound' => 1], 'a string' => ['sound' => 'yes'], 'an empty body' => []] as $name => $body) {
    $r = $call('POST', '/parent/switches', $body, $A['token']);
    check("switches are refused with $name", $r['status'] === 400);
}
check('refused changes did not change anything', $call('GET', '/parent/switches', null, $A['token'])['body']['switches']['public_boards'] === true);
check("parent B's switches are separate", count(array_filter($call('GET', '/parent/switches', null, $B['token'])['body']['switches'])) === 0);
$me = request('GET', '/me', null, $kidToken)['body'];
check("a child sees their parent's switches", $me['switches']['public_boards'] === true && $me['switches']['sound'] === false);
$mine = request('GET', '/me', null, $A['token'])['body'];
check("a parent playing as themselves sees their own switches", $mine['switches']['public_boards'] === true && !isset($mine['child']));
$g = request('GET', '/me', null, $guest['token'])['body'];
check('a guest sees every switch off', array_keys($g['switches']) === $flags && count(array_filter($g['switches'])) === 0);
$call('POST', '/parent/switches', ['beat_clock' => true], $B['token']);
check("another parent's switches never leak into this child", request('GET', '/me', null, $kidToken)['body']['switches']['beat_clock'] === false);

// ---- Erasure ----
$kid2 = $list[1]['id'];
$tok2 = $call('POST', '/parent/children/'.$kid2.'/hand-over', [], $A['token'])['body']['token'];
$quiz = Database::one($db, "SELECT slug FROM quizzes WHERE status='published' LIMIT 1")['slug'] ?? null;
$attemptId = null;
if ($quiz) { $attemptId = request('POST', '/attempts', ['quiz_slug' => $quiz, 'mode' => 'practice'], $tok2)['body']['attempt_id'] ?? null; }
$r = $call('POST', '/parent/children/'.$kid2.'/delete', [], $A['token']);
check('removing a child needs explicit confirmation', $r['status'] === 400);
$r = $call('POST', '/parent/children/'.$kid2.'/delete', ['confirmed' => true], $A['token']);
check('a parent removes a child', $r['status'] === 200 && Database::one($db, 'SELECT id FROM profiles WHERE id=?', [$kid2]) === null
    && request('GET', '/me', null, $tok2)['status'] === 401 && count($call('GET', '/parent/children', null, $A['token'])['body']['children']) === 4);
if ($attemptId) { check("and the child's games go with them", Database::one($db, 'SELECT id FROM attempts WHERE id=?', [$attemptId]) === null); }
$remaining = array_column($call('GET', '/parent/children', null, $A['token'])['body']['children'], 'id');
$tok3 = $call('POST', '/parent/children/'.$remaining[0].'/hand-over', [], $A['token'])['body']['token'];
$attempt3 = $quiz ? (request('POST', '/attempts', ['quiz_slug' => $quiz, 'mode' => 'practice'], $tok3)['body']['attempt_id'] ?? null) : null;
$r = $call('POST', '/me/delete', ['confirmed' => true], $A['token']);
check('a parent erases their own data', $r['status'] === 200 && Database::one($db, 'SELECT id FROM profiles WHERE id=?', [$A['id']]) === null);
check('every child profile went with the parent', (int) Database::one($db, 'SELECT COUNT(*) AS n FROM profiles WHERE id IN ('.implode(',', array_fill(0, count($remaining), '?')).')', $remaining)['n'] === 0
    && (int) Database::one($db, 'SELECT COUNT(*) AS n FROM children WHERE parent_profile_id=?', [$A['id']])['n'] === 0);
check("and their sessions, switches and games", request('GET', '/me', null, $tok3)['status'] === 401
    && (int) Database::one($db, 'SELECT COUNT(*) AS n FROM parent_settings WHERE parent_profile_id=?', [$A['id']])['n'] === 0
    && ($attempt3 === null || Database::one($db, 'SELECT id FROM attempts WHERE id=?', [$attempt3]) === null));
check("parent B's data is untouched", (int) Database::one($db, 'SELECT COUNT(*) AS n FROM parent_settings WHERE parent_profile_id=?', [$B['id']])['n'] === 1);
fwrite(STDOUT, "$count parent checks passed\n");
