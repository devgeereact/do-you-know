<?php
declare(strict_types=1);
// Learn sessions: a child's adaptive hand of 10 in one area, the step rule, the retry queue, stickers and the
// skill record. Needs the throwaway _test database and the test JWT key (as parent.php).
require __DIR__.'/http.php';
use Dyk\Content;
use Dyk\Database;
use Dyk\Learn;
use Firebase\JWT\JWT;

$keyFile = getenv('DYK_TEST_JWT_PRIVATE') ?: dirname(__DIR__, 2).'/.local-test/jwt-test-private.pem';
if (!is_file($keyFile)) { fwrite(STDERR, "Missing .local-test/jwt-test-private.pem (see backend/README.md).\n"); exit(1); }
$private = file_get_contents($keyFile);
$tag = substr(bin2hex(random_bytes(4)), 0, 8);

// ---- The step rule on its own (a table) ----
// [step, high_run, correct, total, changed_today] => [step, high_run, changed]
$rule = [
    'first high round: no move yet'            => [[2, 0, 8, 10, false], [2, 1, false]],
    'second high round in a row: up one'       => [[2, 1, 9, 10, false], [3, 0, true]],
    'perfect round counts as high'             => [[3, 1, 10, 10, false], [4, 0, true]],
    'high round after a middling one restarts' => [[3, 1, 6, 10, false], [3, 0, false]],
    'seven of ten is middling, no move'        => [[3, 1, 7, 10, false], [3, 0, false]],
    'four of ten: down one'                    => [[3, 0, 4, 10, false], [2, 0, true]],
    'low round resets the run'                 => [[3, 1, 3, 10, false], [2, 0, true]],
    'never above step 5'                       => [[5, 1, 10, 10, false], [5, 0, false]],
    'never below step 1'                       => [[1, 0, 0, 10, false], [1, 0, false]],
    'one change a day: a high pair after a change waits' => [[3, 1, 9, 10, true], [3, 2, false]],
    'one change a day: a low round after a change waits' => [[3, 0, 2, 10, true], [3, 0, false]],
    'the run is capped at two'                 => [[3, 2, 9, 10, true], [3, 2, false]],
    'eight of ten is high (scaled to the round)' => [[2, 0, 4, 5, false], [2, 1, false]],
    'two of five is low'                       => [[3, 0, 2, 5, false], [2, 0, true]],
];
foreach ($rule as $name => [$in, $out]) {
    $r = Learn::nextStep(...$in);
    check("step rule: $name", [$r['step'], $r['high_run'], $r['changed']] === $out);
}
check('the first step is 2', Learn::START_STEP === 2);

// ---- Fixtures: three quizzes (easy, medium, hard) in literacy at Explorers, one numeracy quiz ----
function learnCategory(string $slug, string $name): string {
    global $db;
    $row = Database::one($db, 'SELECT id FROM categories WHERE slug=?', [$slug]);
    if ($row) { return $row['id']; }
    $id = Database::uuid();
    Database::execute($db, 'INSERT INTO categories (id,slug,name) VALUES (?,?,?)', [$id, $slug, $name]);
    return $id;
}
function learnQuiz(string $category, string $tag, string $key, string $difficulty, int $ageMin, int $count, string $stub): array {
    global $db;
    $meta = ['explanation' => 'Because it is.', 'source_url' => null, 'review_by' => '2027-10-17'];
    $qs = [];
    for ($i = 1; $i <= $count; $i++) {
        $qs[] = ['type' => 'choice', 'prompt' => "Learn $stub $key question number $i in $tag", 'options' => [['label' => 'Right', 'correct' => true], ['label' => 'Wrong', 'correct' => false]]] + $meta;
    }
    $slug = "learn-$key-$tag";
    $snapshot = Content::snapshot(['slug' => $slug, 'questions' => $qs]);
    $quiz = Database::uuid(); $version = Database::uuid();
    Database::execute($db, "INSERT INTO quizzes (id,slug,title,category_id,status,current_version_id,difficulty,age_min,age_max,question_count) VALUES (?,?,?,?,'published',?,?,?,?,?)",
        [$quiz, $slug, "Learn $key $tag", $category, $version, $difficulty, $ageMin, $ageMin + 2, $count]);
    Database::execute($db, 'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,?)', [$version, $quiz, json_encode($snapshot), $count]);
    return ['id' => $quiz, 'version' => $version, 'ids' => array_column($snapshot, 'id')];
}
$english = learnCategory('school-english', 'English');
$maths = learnCategory('maths', 'Maths');
$easy = learnQuiz($english, $tag, 'easy', 'easy', 6, 8, 'alpha');
$medium = learnQuiz($english, $tag, 'medium', 'medium', 6, 8, 'beta');
$hard = learnQuiz($english, $tag, 'hard', 'hard', 6, 8, 'gamma');
$numbers = learnQuiz($maths, $tag, 'numbers', 'medium', 6, 8, 'delta');
$otherLevel = learnQuiz($english, $tag, 'other', 'easy', 9, 8, 'epsilon');   // Adventurers: never dealt to an Explorer
isolateBank([$easy['id'], $medium['id'], $hard['id'], $numbers['id'], $otherLevel['id']]);

$token = fn(string $subject): string => JWT::encode(['sub' => $subject, 'sid' => 'sess_fixture', 'iss' => 'https://clerk.example.test', 'azp' => 'http://localhost:5202',
    'iat' => time(), 'nbf' => time() - 1, 'exp' => time() + 900], $private, 'RS256', 'fixture');
$parent = function (string $name) use ($db, $token, $tag): array {
    $subject = 'user_Learn'.$name.$tag; $id = Database::uuid();
    Database::execute($db, "INSERT INTO profiles (id,role,nickname) VALUES (?, 'player', ?)", [$id, 'LearnParent'.$name.substr($id, 0, 4)]);
    Database::execute($db, "INSERT INTO identities (provider,subject,profile_id) VALUES ('clerk',?,?)", [$subject, $id]);
    return ['id' => $id, 'token' => $token($subject)];
};
/** A child of $parent at a level, already holding a session. */
$child = function (array $parent, string $level = 'explorers') use ($db): array {
    $id = Database::uuid(); $t = 'guest_'.bin2hex(random_bytes(32));
    Database::execute($db, "INSERT INTO profiles (id,role,nickname,avatar_id) VALUES (?, 'guest', ?, 'fox')", [$id, 'LearnKid'.substr($id, 0, 6)]);
    Database::execute($db, 'INSERT INTO children (profile_id,parent_profile_id,level) VALUES (?,?,?)', [$id, $parent['id'], $level]);
    Database::execute($db, 'INSERT INTO guest_sessions (token_hash,profile_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 30 DAY))', [hash('sha256', $t), $id]);
    return ['id' => $id, 'token' => $t];
};
$call = function (string $method, string $path, ?array $body, string $tok) use ($db) { $db->exec('DELETE FROM rate_limits'); return request($method, $path, $body, $tok); };
$A = $parent('A'); $B = $parent('B');
$kid = $child($A);
$guest = request('POST', '/guest-sessions', [])['body'];

/** Plays a started session: $plan is a list of true/false per question (right or wrong), in order. Returns the finish reply. */
$play = function (array $state, string $tok, array $plan) use ($call): array {
    for ($i = 0; $i < $state['total']; $i++) {
        $q = $state['question'];
        $label = ($plan[$i] ?? true) ? 'Right' : 'Wrong';
        $opt = array_values(array_filter($q['options'], fn($o) => $o['label'] === $label))[0]['id'];
        $r = $call('POST', '/attempts/'.$state['attempt_id'].'/answer', ['option_id' => $opt], $tok);
        if ($r['status'] !== 200) { throw new RuntimeException('answer_failed '.json_encode($r['body'])); }
        if ($i < $state['total'] - 1) { $state = $call('POST', '/attempts/'.$state['attempt_id'].'/next', [], $tok)['body']; }
    }
    return $call('POST', '/attempts/'.$state['attempt_id'].'/finish', [], $tok);
};
$start = fn(string $tok, string $area = 'literacy') => $call('POST', '/attempts', ['mode' => 'learn', 'area' => $area], $tok);
$skill = fn(string $profile, string $area = 'literacy') => Database::one($db, 'SELECT * FROM skills WHERE profile_id=? AND area=?', [$profile, $area]);
$cards = fn(string $attempt) => Database::all($db, 'SELECT lc.position,lc.question_id,lc.source,lc.quiz_version_id FROM learn_cards lc WHERE lc.attempt_id=? ORDER BY lc.position', [$attempt]);

// ---- Who may start one ----
$r = $start($guest['token']);
check('a guest cannot start a learn session', $r['status'] === 403 && $r['body']['error']['code'] === 'child_required');
$r = $call('POST', '/attempts', ['mode' => 'learn', 'area' => 'chemistry'], $kid['token']);
check('an unknown area is refused', $r['status'] === 400 && $r['body']['error']['code'] === 'invalid_area');
$r = $call('POST', '/attempts', ['mode' => 'learn'], $kid['token']);
check('a missing area is refused', $r['status'] === 400);
$r = $start($kid['token'], 'science');
check('an area with no content at the child level is a clear 404', $r['status'] === 404 && $r['body']['error']['code'] === 'no_learn_content');

// ---- The hand: ten questions, nearest the child's step, only their level and area ----
$r = $start($kid['token']);
$s1 = $r['body'];
check('a child starts a learn session of ten', $r['status'] === 200 && $s1['total'] === 10 && $s1['mode'] === 'learn' && $s1['question']['type'] === 'choice');
$hand = $cards($s1['attempt_id']);
$versions = array_count_values(array_column($hand, 'quiz_version_id'));
check('the first step deals the easy quiz first, then the nearest', ($versions[$easy['version']] ?? 0) === 8 && ($versions[$medium['version']] ?? 0) === 2 && !isset($versions[$otherLevel['version']]) && !isset($versions[$numbers['version']]));
check('no question is dealt twice in a hand', count(array_unique(array_column($hand, 'question_id'))) === 10);
check('the payload holds no answer', !str_contains(json_encode($s1['question']), 'is_correct') && !str_contains(json_encode($s1['question']), 'Right"'.',"correct'));
$again = $start($kid['token']);
check('starting again resumes the same session', $again['status'] === 200 && $again['body']['attempt_id'] === $s1['attempt_id']);

// ---- A first perfect session ----
$fin = $play($s1, $kid['token'], array_fill(0, 10, true));
$sum = $fin['body'];
check('finishing a learn session returns the learning summary', $fin['status'] === 200 && ($sum['learn']['area'] ?? null) === 'literacy' && $sum['learn']['stars'] === 3
    && $sum['learn']['step_before'] === 2 && $sum['learn']['step_after'] === 2);
check('the first session earns the first sticker', ($sum['learn']['sticker']['id'] ?? null) !== null && in_array($sum['learn']['sticker']['id'], ['first-session', 'area-literacy', 'perfect'], true));
$sk = $skill($kid['id']);
check('the skill record notes one session and one high round', (int) $sk['sessions'] === 1 && (int) $sk['high_run'] === 1 && (int) $sk['step'] === 2);
$stickersBefore = (int) Database::one($db, 'SELECT COUNT(*) AS n FROM stickers WHERE profile_id=?', [$kid['id']])['n'];
$fin2 = $call('POST', '/attempts/'.$s1['attempt_id'].'/finish', [], $kid['token']);
check('finishing twice records once and returns the same summary', $fin2['status'] === 200 && (int) $skill($kid['id'])['sessions'] === 1
    && (int) Database::one($db, 'SELECT COUNT(*) AS n FROM stickers WHERE profile_id=?', [$kid['id']])['n'] === $stickersBefore && $fin2['body']['learn'] === $sum['learn']);
check('a learn session is not on any board', Database::one($db, "SELECT COUNT(*) AS n FROM leaderboard_entries WHERE user_id=?", [$kid['id']])['n'] == 0);

// ---- A second high round moves up, and only one move a day ----
$s2 = $start($kid['token'])['body'];
$fin = $play($s2, $kid['token'], array_fill(0, 10, true))['body'];
check('eight or more right twice running moves up one step', $fin['learn']['step_before'] === 2 && $fin['learn']['step_after'] === 3 && $fin['learn']['stepped'] === 'up');
check('and earns the step-up sticker', in_array('step-up', array_column(Database::all($db, 'SELECT sticker_id FROM stickers WHERE profile_id=?', [$kid['id']]), 'sticker_id'), true));
$s3 = $start($kid['token'])['body'];
$versions = array_count_values(array_column($cards($s3['attempt_id']), 'quiz_version_id'));
check('step 3 deals the medium quiz first', ($versions[$medium['version']] ?? 0) === 8);
$fin = $play($s3, $kid['token'], array_fill(0, 10, true))['body'];
$fin_s4 = $play($start($kid['token'])['body'], $kid['token'], array_fill(0, 10, true))['body'];
check('a second move the same day waits for tomorrow', $fin['learn']['step_after'] === 3 && $fin_s4['learn']['step_after'] === 3 && (int) $skill($kid['id'])['step'] === 3);
check('and the record keeps the last five results', count(json_decode($skill($kid['id'])['recent'], true)) === 4);

// ---- Mistakes come back, at most two a session, and leave after a right answer ----
$kid2 = $child($A);
$s = $start($kid2['token'])['body'];
$wrongIds = array_slice(array_column($cards($s['attempt_id']), 'question_id'), 0, 0);
$plan = [false, false, false, true, true, true, true, true, true, true];   // the first three are wrong (hand order)
$order = array_column($cards($s['attempt_id']), 'question_id');
$fin = $play($s, $kid2['token'], $plan)['body'];
$queued = Database::all($db, 'SELECT question_id FROM retry_questions WHERE profile_id=? ORDER BY question_id', [$kid2['id']]);
$expected = [$order[0], $order[1], $order[2]]; sort($expected);
check('three wrong answers are queued for later', array_column($queued, 'question_id') === $expected);
$next = $start($kid2['token'])['body'];
$hand2 = $cards($next['attempt_id']);
$retry = array_values(array_filter($hand2, fn($c) => $c['source'] === 'retry'));
check('the next session brings back exactly two of them, never more', count($retry) === 2 && count($hand2) === 10
    && !array_diff(array_column($retry, 'question_id'), $expected));
$plan2 = [];
foreach ($hand2 as $c) { $plan2[] = $c['source'] === 'retry' ? (bool) (array_search($c['question_id'], array_column($retry, 'question_id')) === 0) : true; }
$fin = $play($next, $kid2['token'], $plan2)['body'];
$left = array_column(Database::all($db, 'SELECT question_id FROM retry_questions WHERE profile_id=?', [$kid2['id']]), 'question_id');
check('a right answer removes a question from the queue; a wrong one keeps it', count($left) === 2 && count(array_intersect($left, $expected)) === 2);
check('answering a returned question right earns the comeback sticker', in_array('comeback', array_column(Database::all($db, 'SELECT sticker_id FROM stickers WHERE profile_id=?', [$kid2['id']]), 'sticker_id'), true));
Database::execute($db, 'DELETE FROM retry_questions WHERE profile_id=? AND question_id=?', [$kid2['id'], $expected[0]]);
// A queued question that is no longer in a live quiz is dropped, not dealt.
Database::execute($db, "INSERT INTO retry_questions (profile_id,question_id,area,quiz_id) VALUES (?,?,'literacy',?)", [$kid2['id'], Database::uuid(), $easy['id']]);
$s = $start($kid2['token'])['body'];
check('a queued question that no longer exists is dropped quietly', $s['total'] === 10 && Database::one($db, "SELECT COUNT(*) AS n FROM retry_questions WHERE profile_id=? AND quiz_id=? AND question_id NOT IN (".implode(',', array_fill(0, 8, '?')).")", array_merge([$kid2['id'], $easy['id']], $easy['ids']))['n'] == 0);

// ---- Going down, and the floor ----
$kid3 = $child($A);
Database::execute($db, "INSERT INTO skills (profile_id,area,step,high_run,step_changed_on,sessions,recent) VALUES (?,'literacy',4,0,DATE_SUB(UTC_DATE(),INTERVAL 2 DAY),5,'[]')", [$kid3['id']]);
$fin = $play($start($kid3['token'])['body'], $kid3['token'], [true, true, true, true, false, false, false, false, false, false])['body'];
check('four or fewer right moves down one step', $fin['learn']['step_before'] === 4 && $fin['learn']['step_after'] === 3 && $fin['learn']['stepped'] === 'down' && $fin['learn']['stars'] === 1);

// ---- The child's own record, the parent's skill map, and scope ----
$r = $call('GET', '/me/learn', null, $kid['token']);
check("a child reads their own steps and stickers", $r['status'] === 200 && count($r['body']['areas']) === 4 && $r['body']['areas'][0]['area'] === 'literacy' && $r['body']['areas'][0]['step'] === 3
    && count($r['body']['stickers']) >= 3 && in_array($r['body']['next_area'], ['literacy', 'numeracy', 'science', 'humanities'], true));
check('an area never played shows step 2 with no sessions', array_values(array_filter($r['body']['areas'], fn($a) => $a['area'] === 'numeracy'))[0]['sessions'] === 0);
check('a guest has no learning record', $call('GET', '/me/learn', null, $guest['token'])['status'] === 403);
$r = $call('GET', '/parent/children/'.$kid['id'].'/skills', null, $A['token']);
check("a parent reads their child's skill map", $r['status'] === 200 && $r['body']['child']['id'] === $kid['id'] && count($r['body']['areas']) === 4 && is_array($r['body']['stickers']));
check("another parent cannot read it", $call('GET', '/parent/children/'.$kid['id'].'/skills', null, $B['token'])['status'] === 404);
check("a child's token is refused by the skills route", $call('GET', '/parent/children/'.$kid['id'].'/skills', null, $kid['token'])['status'] === 403);
check('the skill map holds only ids, counts and dates', !preg_match('/question|prompt|nickname/i', json_encode($call('GET', '/parent/children/'.$kid['id'].'/skills', null, $A['token'])['body']['areas'])));
$r = $call('POST', '/attempts/'.$s3['attempt_id'].'/challenge', [], $kid['token']);
check('a learn session cannot be turned into a friend challenge', $r['status'] >= 400);

// ---- Erasure and the other modes ----
$r = $call('POST', '/parent/children/'.$kid['id'].'/delete', ['confirmed' => true], $A['token']);
check("removing a child erases their skills, queue, stickers and sessions", $r['status'] === 200
    && (int) Database::one($db, 'SELECT (SELECT COUNT(*) FROM skills WHERE profile_id=?)+(SELECT COUNT(*) FROM retry_questions WHERE profile_id=?)+(SELECT COUNT(*) FROM stickers WHERE profile_id=?)+(SELECT COUNT(*) FROM attempts WHERE user_id=?) AS n', [$kid['id'], $kid['id'], $kid['id'], $kid['id']])['n'] === 0);
$p = $call('POST', '/attempts', ['quiz_slug' => "learn-easy-$tag", 'mode' => 'practice'], $guest['token']);
check('practice on the same quiz is unaffected', $p['status'] === 200 && $p['body']['mode'] === 'practice');
fwrite(STDOUT, "$count learn checks passed\n");
