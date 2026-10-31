<?php
declare(strict_types=1);
// Admin content studio, daily calendar, rounds, subjects, feedback inbox and the overall board.
// Needs the throwaway _test database, a server whose config lists 'user_TestAdmin0000000001' in
// admin_subjects, and .local-test/jwt-test-private.pem (or DYK_TEST_JWT_PRIVATE), as admin.php.
require __DIR__.'/http.php';
use Dyk\Competition;
use Dyk\Database;
use Firebase\JWT\JWT;

$keyFile = getenv('DYK_TEST_JWT_PRIVATE') ?: dirname(__DIR__, 2).'/.local-test/jwt-test-private.pem';
if (!is_file($keyFile)) { fwrite(STDERR, "Missing .local-test/jwt-test-private.pem (see backend/README.md).\n"); exit(1); }
$private = file_get_contents($keyFile);
function cmsToken(string $subject, string $private): string {
    return JWT::encode(['sub' => $subject, 'sid' => 'sess_fixture', 'iss' => 'https://clerk.example.test', 'azp' => 'http://localhost:5202',
        'iat' => time(), 'nbf' => time() - 1, 'exp' => time() + 900], $private, 'RS256', 'fixture');
}
function cmsProfile(string $subject): string {
    global $db;
    $row = Database::one($db, "SELECT profile_id FROM identities WHERE provider='clerk' AND subject=?", [$subject]);
    if ($row) { return $row['profile_id']; }
    $id = Database::uuid();
    Database::execute($db, "INSERT INTO profiles (id,role,nickname) VALUES (?, 'player', ?)", [$id, 'Cms '.substr($id, 0, 6)]);
    Database::execute($db, "INSERT INTO identities (provider,subject,profile_id) VALUES ('clerk',?,?)", [$subject, $id]);
    return $id;
}
/** Admin call; the throttle buckets of this disposable database are reset so a long suite is not limited. */
function admin(string $method, string $path, ?array $body = null): array {
    global $db, $admin;
    $db->exec('DELETE FROM rate_limits');
    return request($method, '/admin'.$path, $body, $admin);
}
$tag = substr(bin2hex(random_bytes(4)), 0, 8);
// Prompts use a letters-only copy of the tag, so no digit pulls the default scene to "city".
$word = strtr($tag, '0123456789', 'ghijklmnop');
cmsProfile('user_TestAdmin0000000001');
$admin = cmsToken('user_TestAdmin0000000001', $private);
$playerSubject = 'user_TestCms000000'.$tag;
cmsProfile($playerSubject);
$playerToken = cmsToken($playerSubject, $private);
$guest = request('POST', '/guest-sessions', [])['body'];
Database::execute($db, "INSERT IGNORE INTO curriculum_tags (code,label,system,sort_order) VALUES ('uk-ks2','Key Stage 2','England',2)");
$today = Competition::londonDate();
$question = fn(string $prompt, bool $right = true): array => ['type' => 'boolean', 'prompt' => $prompt, 'answer' => $right,
    'explanation' => 'Original fixture explanation.', 'source_url' => 'https://example.org/fixture', 'review_by' => '2099-01-01'];

// ---- Access ----
check('content studio is closed to guests', request('GET', '/admin/quizzes', null, $guest['token'])['status'] === 403);
check('content studio is closed to signed-in players', request('GET', '/admin/quizzes', null, $playerToken)['status'] === 403);
check('content writes are closed to players', request('POST', '/admin/quizzes', ['title' => 'x'], $playerToken)['status'] === 403);
check('feedback inbox is closed to players', request('GET', '/admin/feedback', null, $playerToken)['status'] === 403);
check('wrong methods on admin routes are 404', admin('DELETE', '/quizzes')['status'] === 404 || admin('DELETE', '/quizzes')['status'] === 405);

// ---- Subjects ----
$r = admin('POST', '/subjects', ['name' => 'Cms Fixture '.$tag, 'kind' => 'general', 'scene' => 'space', 'icon' => 'rocket']);
$subject = $r['body']['slug'] ?? '';
check('a subject is created with a kebab slug', $r['status'] === 201 && $subject === 'cms-fixture-'.$tag && $r['body']['scene'] === 'space' && $r['body']['live_quizzes'] === 0);
check('a subject needs a known scene', admin('POST', '/subjects', ['name' => 'Bad scene', 'kind' => 'general', 'scene' => 'mars'])['body']['error']['code'] === 'invalid_subject');
check('a subject needs a kind', admin('POST', '/subjects', ['name' => 'No kind'])['status'] === 422);
$r = admin('POST', '/subjects/'.$subject, ['sort_order' => 5, 'icon' => null, 'description' => 'Fixture subject']);
check('a subject can be updated', $r['status'] === 200 && $r['body']['sort_order'] === 5 && $r['body']['icon'] === null && $r['body']['description'] === 'Fixture subject');
check('updating an unknown subject is 404', admin('POST', '/subjects/no-such-subject-'.$tag, ['sort_order' => 1])['status'] === 404);
check('a subject cannot take unknown fields', admin('POST', '/subjects/'.$subject, ['slug' => 'x'])['status'] === 422);
$r = admin('GET', '/subjects');
check('subjects list counts quizzes', in_array($subject, array_column($r['body']['items'], 'slug'), true));
check('a subject without a live quiz is not in the public list', !in_array($subject, array_column(request('GET', '/categories')['body'], 'slug'), true));

// ---- Create and edit a draft ----
check('creating needs a title', admin('POST', '/quizzes', ['category' => $subject])['body']['error']['details'][0]['field'] === 'title');
check('creating needs a known subject', admin('POST', '/quizzes', ['title' => 'X', 'category' => 'nope-'.$tag])['status'] === 422);
$r = admin('POST', '/quizzes', ['title' => 'Cms Fixture Quiz '.$tag, 'category' => $subject, 'ks' => 'KS2']);
$id = $r['body']['id'] ?? ''; $slug = $r['body']['slug'] ?? '';
check('a draft quiz is created with a unique slug', $r['status'] === 201 && $slug === 'cms-fixture-quiz-'.$tag);
$r = admin('POST', '/quizzes', ['title' => 'Cms Fixture Quiz '.$tag, 'category' => $subject]);
check('a second quiz with the same title gets another slug', $r['body']['slug'] === $slug.'-2');
$second = $r['body']['id'];
$r = admin('GET', '/quizzes/'.$id);
$fields = array_column($r['body']['problems'], 'field');
check('a new draft lists its problems', $r['status'] === 200 && in_array('intro', $fields, true) && in_array('questions', $fields, true) && $r['body']['quiz']['ks'] === 'KS2');
check('a new draft is invisible to players', request('GET', '/quizzes/'.$slug)['status'] === 404);
check('unknown quiz ids are 404', admin('GET', '/quizzes/'.Database::uuid())['status'] === 404);
$prompts = ["Cms fixture $word one?", "Cms fixture $word two?", "Cms fixture $word three?"];
$r = admin('POST', '/quizzes/'.$id, ['meta' => ['intro' => 'An original fixture quiz.'], 'questions' => array_map($question, $prompts)]);
$detail = $r['body'];
check('saving returns no problems for a valid work copy', $r['status'] === 200 && $detail['problems'] === [] && count($detail['questions']) === 3);
check('saved questions start unchecked with ids and a default scene', !in_array(true, array_column($detail['questions'], 'checked'), true)
    && count(array_filter(array_column($detail['questions'], 'id'))) === 3 && $detail['questions'][0]['scene'] === null && $detail['questions'][0]['scene_default'] === 'space');
$r = admin('POST', '/quizzes/'.$id, ['questions' => [['type' => 'essay']]]);
check('saving keeps problems instead of refusing', $r['status'] === 200 && in_array('type', array_column($r['body']['problems'], 'field'), true));
check('a problem names its question', $r['body']['problems'][array_search('type', array_column($r['body']['problems'], 'field'))]['index'] === 0);
check('questions must be a list of objects', admin('POST', '/quizzes/'.$id, ['questions' => ['x']])['body']['error']['code'] === 'invalid_questions');
check('at most 50 questions', admin('POST', '/quizzes/'.$id, ['questions' => array_fill(0, 51, [])])['body']['error']['code'] === 'too_many_questions');
$r = admin('POST', '/quizzes/'.$id, ['questions' => array_map($question, $prompts)]);
$ids = array_column($r['body']['questions'], 'id');

// ---- Review, checks and publish ----
check('submitting a draft with too few questions fails', admin('POST', '/quizzes/'.$second.'/submit')['body']['error']['code'] === 'not_enough_questions');
$r = admin('POST', '/quizzes/'.$id.'/submit');
check('a clean draft goes to review', $r['status'] === 200 && $r['body']['quiz']['status'] === 'review' && $r['body']['quiz']['in_review'] === true);
$r = admin('GET', '/quizzes?status=review&q='.$tag);
check('the list filters by review', in_array($id, array_column($r['body']['items'], 'id'), true));
$r = admin('POST', '/quizzes/'.$id.'/publish');
check('publishing needs every question checked', $r['status'] === 422 && $r['body']['error']['code'] === 'unchecked_questions' && $r['body']['error']['details']['indexes'] === [0, 1, 2]);
foreach ([0, 1, 2] as $i) { $r = admin('POST', '/quizzes/'.$id.'/check', ['index' => $i, 'checked' => true]); }
check('checks are stored on the work copy', $r['status'] === 200 && array_column($r['body']['questions'], 'checked') === [true, true, true]);
check('a check needs a valid index', admin('POST', '/quizzes/'.$id.'/check', ['index' => 9, 'checked' => true])['body']['error']['code'] === 'invalid_index');
$edited = $r['body']['questions'];
$edited[1]['prompt'] = "Cms fixture $word two, reworded?";
$r = admin('POST', '/quizzes/'.$id, ['questions' => $edited]);
check('editing a question clears only its check', array_column($r['body']['questions'], 'checked') === [true, false, true] && array_column($r['body']['questions'], 'id') === $ids);
check('editing moves a quiz in review back to draft', $r['body']['quiz']['status'] === 'draft');
$r = admin('POST', '/quizzes/'.$id, ['questions' => $r['body']['questions']]);
check('saving unchanged questions keeps their checks', array_column($r['body']['questions'], 'checked') === [true, false, true]);
admin('POST', '/quizzes/'.$id.'/check', ['index' => 1, 'checked' => true]);
check('a past publish date is refused', admin('POST', '/quizzes/'.$id.'/publish', ['publish_at' => '2020-01-01'])['body']['error']['code'] === 'invalid_publish_at');
check('a malformed publish date is refused', admin('POST', '/quizzes/'.$id.'/publish', ['publish_at' => '1 Jan'])['status'] === 422);
$r = admin('POST', '/quizzes/'.$id.'/publish');
check('publishing makes version 1 live and clears the work copy', $r['status'] === 200 && $r['body']['quiz']['status'] === 'published' && $r['body']['quiz']['version'] === 1
    && $r['body']['quiz']['live'] === true && $r['body']['quiz']['has_draft'] === false && $r['body']['versions'][0]['live'] === true);
$review = Database::one($db, "SELECT reviewed_by FROM content_reviews WHERE quiz_id=? AND action='published'", [$id]);
check('publishing records the reviewer', $review !== null && $review['reviewed_by'] !== '');
check('the published quiz is public', request('GET', '/quizzes/'.$slug)['status'] === 200);
check('its subject now shows in the public list', in_array($subject, array_column(request('GET', '/categories')['body'], 'slug'), true));
$audit = Database::one($db, "SELECT detail FROM admin_audit WHERE action='quiz.publish' AND target_id=? ORDER BY id DESC LIMIT 1", [$id]);
check('publishing is audited', $audit !== null && isset(json_decode($audit['detail'], true)['version_id']));
$r = request('POST', '/attempts', ['quiz_slug' => $slug, 'mode' => 'practice'], $guest['token']);
check('players can start the published quiz and see a scene', $r['status'] === 200 && in_array($r['body']['question']['scene'], Dyk\Content::SCENES, true));

// ---- Editing a live quiz keeps the live version ----
$r = admin('GET', '/quizzes/'.$id);
check('a live quiz with no work copy shows its version as checked', array_column($r['body']['questions'], 'checked') === [true, true, true]);
$work = $r['body']['questions'];
$work[0]['explanation'] = 'A better original explanation.';
$work[0]['scene'] = 'ocean';
$r = admin('POST', '/quizzes/'.$id, ['questions' => $work]);
check('a live quiz gets a work copy and stays published', $r['body']['quiz']['status'] === 'published' && $r['body']['quiz']['has_draft'] === true && $r['body']['questions'][0]['checked'] === false);
$live = json_decode(Database::one($db, 'SELECT v.snapshot FROM quizzes q JOIN quiz_versions v ON v.id=q.current_version_id WHERE q.id=?', [$id])['snapshot'], true);
check('players keep the live version while it is edited', $live[0]['explanation'] === 'Original fixture explanation.' && !isset($live[0]['scene']));
$r = admin('POST', '/quizzes/'.$id.'/submit');
check('a live quiz can be submitted without going offline', $r['body']['quiz']['status'] === 'published' && $r['body']['quiz']['in_review'] === true);
$r = admin('GET', '/quizzes?status=review&q='.$tag);
$row = array_values(array_filter($r['body']['items'], fn ($i) => $i['id'] === $id))[0] ?? null;
check('a live quiz with edits to check is listed as in review', $row !== null && $row['in_review'] === true && $row['status'] === 'published');
$r = admin('POST', '/quizzes/'.$id.'/unsubmit');
check('unsubmitting a live quiz keeps it published', $r['body']['quiz']['status'] === 'published' && $r['body']['quiz']['in_review'] === false);
admin('POST', '/quizzes/'.$id.'/check', ['index' => 0, 'checked' => true]);
$future = (new DateTimeImmutable($today))->modify('+20 days')->format('Y-m-d');
check('only live quizzes can be booked as a daily', admin('POST', '/daily', ['date' => $future, 'quiz_id' => $second])['body']['error']['code'] === 'quiz_not_live');
$r = admin('POST', '/daily', ['date' => $future, 'quiz_id' => $id]);
check('a future daily can be booked', $r['status'] === 200 && $r['body']['status'] === 'scheduled' && $r['body']['quiz_id'] === $id);
$v1 = Database::one($db, 'SELECT current_version_id FROM quizzes WHERE id=?', [$id])['current_version_id'];
$r = admin('POST', '/quizzes/'.$id.'/publish');
check('republishing an edit makes version 2', $r['body']['quiz']['version'] === 2 && count($r['body']['versions']) === 2 && $r['body']['questions'][0]['scene'] === 'ocean');
$v2 = Database::one($db, 'SELECT current_version_id FROM quizzes WHERE id=?', [$id])['current_version_id'];
check('booked dailies move to the new version', Database::one($db, 'SELECT quiz_version_id FROM daily_challenges WHERE challenge_date=?', [$future])['quiz_version_id'] === $v2 && $v1 !== $v2);
$r = admin('POST', '/quizzes/'.$id.'/publish');
check('publishing again with nothing changed adds no version', $r['body']['quiz']['version'] === 2);

// ---- Append, problems, discard ----
$r = admin('POST', '/quizzes/'.$id.'/append', ['questions' => [$question($prompts[0])]]);
$appended = array_values(array_filter($r['body']['problems'], fn($p) => $p['index'] === 3));
check('appending adds unchecked questions to the work copy', count($r['body']['questions']) === 4 && $r['body']['questions'][3]['checked'] === false);
check('a repeated prompt is a problem', in_array('prompt', array_column($appended, 'field'), true));
$r = admin('POST', '/quizzes/'.$second, ['meta' => ['intro' => 'Second fixture.'], 'questions' => [$question($prompts[0])] + [1 => $question("Cms fixture $word four?"), 2 => $question("Cms fixture $word five?")]]);
check('a prompt already live in another quiz is a problem', in_array(['index' => 0, 'field' => 'prompt', 'message' => 'this question is already in another quiz'], $r['body']['problems'], true));
$old = $question("Cms fixture $word six?"); $old['review_by'] = '2020-01-01';
$r = admin('POST', '/quizzes/'.$second, ['questions' => [$old, $question("Cms fixture $word four?"), $question("Cms fixture $word five?")]]);
check('a passed review-by date is a problem', in_array('review_by', array_column($r['body']['problems'], 'field'), true));
check('a draft with problems cannot be submitted', admin('POST', '/quizzes/'.$second.'/submit')['body']['error']['code'] === 'has_problems');
$r = admin('POST', '/quizzes/'.$id.'/discard');
check('discarding drops the work copy', $r['body']['quiz']['has_draft'] === false && count($r['body']['questions']) === 3);
$r = admin('GET', '/quizzes?category='.$subject.'&ks=KS2');
$row = array_values(array_filter($r['body']['items'], fn($i) => $i['id'] === $id))[0] ?? null;
check('the list filters by subject and key stage', $row !== null && $row['version'] === 2 && $row['question_count'] === 3 && $row['category']['slug'] === $subject && $row['ks'] === 'KS2');
check('the list rejects unknown filters', admin('GET', '/quizzes?status=live')['status'] === 422);

// ---- Scheduled publishing ----
$r = admin('POST', '/quizzes/'.$second, ['questions' => [$question("Cms fixture $word six?"), $question("Cms fixture $word four?"), $question("Cms fixture $word five?")]]);
foreach ([0, 1, 2] as $i) { admin('POST', '/quizzes/'.$second.'/check', ['index' => $i, 'checked' => true]); }
$tomorrow = (new DateTimeImmutable($today))->modify('+1 day')->format('Y-m-d');
$r = admin('POST', '/quizzes/'.$second.'/publish', ['publish_at' => $tomorrow]);
check('a quiz can be published for a later date', $r['status'] === 200 && $r['body']['quiz']['status'] === 'published' && $r['body']['quiz']['live'] === false);
check('a quiz published for later is not public yet', request('GET', '/quizzes/'.$slug.'-2')['status'] === 404
    && !in_array($slug.'-2', array_column(request('GET', '/quizzes?search='.$tag)['body'], 'slug'), true));
check('a quiz published for later cannot be played', request('POST', '/attempts', ['quiz_slug' => $slug.'-2'], $guest['token'])['status'] === 404);
check('a quiz published for later has no board', request('GET', '/leaderboards?quiz_slug='.$slug.'-2')['body'] === ['top' => [], 'me' => null]);
check('a quiz published for later is not in the sitemap', !str_contains(request('GET', '/sitemap.xml')['raw'], '/q/'.$slug.'-2<'));

// ---- Daily calendar ----
$r = admin('GET', '/daily?month='.substr($future, 0, 7));
$day = array_values(array_filter($r['body']['days'], fn($d) => $d['date'] === $future))[0];
check('the calendar shows a booked day', $r['status'] === 200 && $day['status'] === 'scheduled' && $day['quiz_id'] === $id);
check('the calendar previews automatic days', in_array('auto', array_column($r['body']['days'], 'status'), true) || substr($future, 0, 7) < substr($today, 0, 7));
check('the calendar needs a valid month', admin('GET', '/daily?month=2026-13')['status'] === 422);
check('a past day cannot be booked', admin('POST', '/daily', ['date' => '2020-01-01', 'quiz_id' => $id])['body']['error']['code'] === 'invalid_date');
$r = admin('POST', '/daily', ['date' => $future, 'quiz_id' => null]);
check('a booked day can be cleared', $r['status'] === 200 && !Database::one($db, 'SELECT id FROM daily_challenges WHERE challenge_date=?', [$future]));
admin('POST', '/daily', ['date' => $future, 'quiz_id' => $id]);

// ---- Retire and restore ----
$r = admin('POST', '/quizzes/'.$id.'/retire');
check('retiring hides the quiz from players', $r['body']['quiz']['status'] === 'retired' && request('GET', '/quizzes/'.$slug)['status'] === 404);
check('retiring removes its booked dailies', !Database::one($db, 'SELECT id FROM daily_challenges WHERE challenge_date=?', [$future]));
check('a retired quiz cannot be published', admin('POST', '/quizzes/'.$id.'/publish')['status'] === 409);
$r = admin('POST', '/quizzes/'.$id.'/restore');
check('restoring brings a quiz with a version back live', $r['body']['quiz']['status'] === 'published' && request('GET', '/quizzes/'.$slug)['status'] === 200);
check('restoring twice is refused', admin('POST', '/quizzes/'.$id.'/restore')['body']['error']['code'] === 'not_retired');
check('retire and restore are recorded as reviews', (int) Database::one($db, "SELECT COUNT(*) AS n FROM content_reviews WHERE quiz_id=? AND action IN ('retired','restored')", [$id])['n'] === 2);

// ---- Rounds, fairness and the overall board ----
$snapshot = array_column(json_decode(Database::one($db, 'SELECT v.snapshot FROM quizzes q JOIN quiz_versions v ON v.id=q.current_version_id WHERE q.id=?', [$id])['snapshot'], true), null, 'id');
$play = function (string $token, bool $right) use ($slug, $snapshot): array {
    $state = request('POST', '/attempts', ['quiz_slug' => $slug, 'mode' => 'ranked'], $token)['body'];
    for ($i = 0; $i < $state['total']; $i++) {
        $q = $snapshot[$state['question']['id']];
        $pick = array_values(array_filter($q['options'], fn($o) => $o['is_correct'] === $right))[0];
        request('POST', '/attempts/'.$state['attempt_id'].'/answer', ['option_id' => $pick['id']], $token);
        if ($i < $state['total'] - 1) { $state = request('POST', '/attempts/'.$state['attempt_id'].'/next', [], $token)['body']; }
    }
    return request('POST', '/attempts/'.$state['attempt_id'].'/finish', [], $token)['body'];
};
$star = request('POST', '/guest-sessions', [])['body'];
$nick = request('POST', '/me/nickname/random', [], $star['token'])['body']['nickname'];
$best = $play($star['token'], true);
$play($star['token'], false);
$r = request('GET', '/leaderboards/overall?period=day', null, $star['token']);
check('the overall board counts the best round per quiz', $r['status'] === 200 && $r['body']['me']['points'] === 30 && $r['body']['me']['rounds'] === 2
    && $r['body']['me']['accuracy'] === 50 && $r['body']['me']['quizzes'] === 1 && $r['body']['me']['is_me'] === true);
check('the overall board is cached privately for a short time', (bool) preg_match('~^cache-control: private, max-age=30\r?$~mi', $r['headers']));
$points = array_column($r['body']['rows'], 'points');
$sorted = $points; rsort($sorted);
check('the overall board is ordered by points', $points === $sorted && $r['body']['rows'][0]['rank'] === 1);
check('overall rows carry no ids', !str_contains($r['raw'], 'user_id') && !str_contains($r['raw'], $star['profile_id']));
check('overall facts are filled in', is_int($r['body']['facts']['rounds']) && $r['body']['facts']['rounds'] >= 2 && $r['body']['facts']['top_category'] !== null);
$anon = request('GET', '/leaderboards/overall?period=week&limit=5');
check('the overall board is public without me', $anon['status'] === 200 && $anon['body']['me'] === null && count($anon['body']['rows']) <= 5 && $anon['body']['period'] === 'week');
check('the overall board rejects an unknown period', request('GET', '/leaderboards/overall?period=year')['status'] === 422);
check('the overall board rejects a bad limit', request('GET', '/leaderboards/overall?limit=0')['status'] === 422);
foreach (['month', 'all'] as $period) {
    check("the $period board includes the round", request('GET', '/leaderboards/overall?period='.$period, null, $star['token'])['body']['me']['points'] >= 30);
}
// Fair replace: a better share right wins even with fewer correct answers.
Database::execute($db, "UPDATE leaderboard_entries SET correct_count=9,total=20 WHERE user_id=? AND quiz_id=? AND board='all_time'", [$star['profile_id'], $id]);
$attempt = Database::one($db, 'SELECT * FROM attempts WHERE id=?', [$best['attempt_id']]);
$db->beginTransaction();
(new Competition($db, $star['profile_id']))->record(array_merge($attempt, ['correct_count' => 6, 'answer_time_ms' => 999999]), 10);
$db->commit();
$entry = Database::one($db, "SELECT correct_count,total FROM leaderboard_entries WHERE user_id=? AND quiz_id=? AND board='all_time'", [$star['profile_id'], $id]);
check('a board entry is replaced by a higher share right, not a higher count', (int) $entry['correct_count'] === 6 && (int) $entry['total'] === 10);
$db->beginTransaction();
(new Competition($db, $star['profile_id']))->record(array_merge($attempt, ['correct_count' => 11, 'answer_time_ms' => 1]), 20);
$db->commit();
$entry = Database::one($db, "SELECT correct_count,total FROM leaderboard_entries WHERE user_id=? AND quiz_id=? AND board='all_time'", [$star['profile_id'], $id]);
check('a lower share right never replaces an entry', (int) $entry['correct_count'] === 6);

$r = admin('GET', '/rounds?q='.urlencode($nick));
$rounds = array_values(array_filter($r['body']['items'], fn($i) => $i['quiz_title'] === 'Cms Fixture Quiz '.$tag));
check('recent rounds can be searched by nickname', $r['status'] === 200 && count($rounds) === 2 && $rounds[0]['nickname'] === $nick && $rounds[0]['hidden'] === false);
check('rounds reject a bad hidden filter', admin('GET', '/rounds?hidden=2')['status'] === 422);
$r = admin('POST', '/rounds/'.$best['attempt_id'].'/hide', ['hidden' => true]);
check('a round can be hidden', $r['status'] === 200 && $r['body']['hidden'] === true && $r['body']['entries'] >= 2);
$board = request('GET', '/leaderboards?quiz_slug='.$slug.'&board=all_time')['body']['top'];
check('a hidden round leaves the quiz board', !in_array($nick, array_column($board, 'nickname'), true));
$r = request('GET', '/leaderboards/overall?period=day', null, $star['token']);
check('a hidden round leaves the overall board', $r['body']['me']['points'] === 0 && $r['body']['me']['rounds'] === 1);
check('hidden rounds are listed by the filter', in_array($best['attempt_id'], array_column(admin('GET', '/rounds?hidden=1&limit=200')['body']['items'], 'id'), true));
admin('POST', '/rounds/'.$best['attempt_id'].'/hide', ['hidden' => false]);
check('a round can be shown again', in_array($nick, array_column(request('GET', '/leaderboards?quiz_slug='.$slug.'&board=all_time')['body']['top'], 'nickname'), true));
check('hiding an unknown round is 404', admin('POST', '/rounds/'.Database::uuid().'/hide', ['hidden' => true])['status'] === 404);
check('hiding needs true or false', admin('POST', '/rounds/'.$best['attempt_id'].'/hide', ['hidden' => 'yes'])['status'] === 422);

// ---- Daily extras ----
// Today's disposable daily is replaced by this quiz, as competition.php does.
Database::execute($db, 'DELETE FROM attempts WHERE daily_challenge_id IN (SELECT id FROM daily_challenges WHERE challenge_date=?)', [$today]);
Database::execute($db, 'DELETE FROM daily_challenges WHERE challenge_date=?', [$today]);
$liveVersion = Database::one($db, 'SELECT current_version_id FROM quizzes WHERE id=?', [$id])['current_version_id'];
Database::execute($db, "INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')", [Database::uuid(), $today, $id, $liveVersion]);
$order = Dyk\Game::dailyOrder(array_keys($snapshot), $today, 3);
$expected = array_map(fn(string $qid): string => isset($snapshot[$qid]['scene']) ? $snapshot[$qid]['scene'] : 'space', $order);
$daily = request('GET', '/daily')['body'];
check('the daily lists one scene stop per question in round order', $daily['quiz']['slug'] === $slug && $daily['stops'] === $expected && in_array('ocean', $expected, true));
check('the daily stops hold no prompts or answers', !str_contains(json_encode($daily), 'prompt') && !str_contains(json_encode($daily), 'is_correct'));
check('the daily starts with an empty board', $daily['stats'] === ['played' => 0, 'average' => null, 'perfect' => 0]);
$state = request('POST', '/attempts', ['mode' => 'daily'], $star['token'])['body'];
check('the daily round follows the same order', $state['question']['id'] === $order[0]);
for ($i = 0; $i < 3; $i++) {
    $pick = array_values(array_filter($snapshot[$state['question']['id']]['options'], fn($o) => $o['is_correct']))[0];
    request('POST', '/attempts/'.$state['attempt_id'].'/answer', ['option_id' => $pick['id']], $star['token']);
    if ($i < 2) { $state = request('POST', '/attempts/'.$state['attempt_id'].'/next', [], $star['token'])['body']; }
}
request('POST', '/attempts/'.$state['attempt_id'].'/finish', [], $star['token']);
$stats = request('GET', '/daily')['body']['stats'];
check('the daily stats count the board', $stats['played'] === 1 && $stats['perfect'] === 1 && $stats['average'] == 3);

// ---- Feedback inbox ----
$adult = request('POST', '/guest-sessions', [])['body'];
request('POST', '/me/age-band', ['band' => '18_plus'], $adult['token']);
$sent = request('POST', '/feedback', ['type' => 'question', 'presets' => ['The answer looks wrong'], 'message' => 'Question one looks wrong to me.', 'email' => 'cms.'.$tag.'@example.org'], $adult['token'])['body']['id'];
$child = request('POST', '/feedback', ['type' => 'feedback', 'presets' => ['I loved it']], $guest['token'])['body']['id'];
$r = admin('GET', '/feedback?status=new&type=question');
$item = array_values(array_filter($r['body']['items'], fn($i) => $i['id'] === $sent))[0] ?? null;
check('new feedback is listed without the email address', $item !== null && $item['has_email'] === true && !str_contains($r['raw'], 'cms.'.$tag.'@example.org'));
check('the inbox rejects unknown filters', admin('GET', '/feedback?status=closed')['status'] === 422);
$r = admin('GET', '/feedback/'.$sent);
check('one feedback shows its email for a reply', $r['body']['email'] === 'cms.'.$tag.'@example.org' && $r['body']['thread'] === []);
check('unknown feedback is 404', admin('GET', '/feedback/'.Database::uuid())['status'] === 404);
$r = admin('POST', '/feedback/'.$sent.'/reply', ['body' => 'Thank you, we have fixed it.']);
check('replying without mail_from stores the reply unsent and opens it', $r['status'] === 200 && $r['body']['emailed'] === false && $r['body']['status'] === 'open');
$audit = Database::one($db, "SELECT detail FROM admin_audit WHERE action='feedback.reply' AND target_id=? ORDER BY id DESC LIMIT 1", [$sent]);
check('the reply audit holds the id only, never the address', $audit !== null && !str_contains($audit['detail'], '@'));
check('player feedback cannot be replied to', admin('POST', '/feedback/'.$child.'/reply', ['body' => 'Hello'])['body']['error']['code'] === 'not_adult_feedback');
check('a reply needs a body', admin('POST', '/feedback/'.$sent.'/reply', ['body' => ''])['body']['error']['code'] === 'invalid_body');
check('a private note can be added', admin('POST', '/feedback/'.$child.'/note', ['body' => 'Lovely.'])['status'] === 200);
$r = admin('POST', '/feedback/'.$sent.'/status', ['status' => 'resolved']);
check('feedback can be resolved', $r['body']['status'] === 'resolved');
check('status must be known', admin('POST', '/feedback/'.$sent.'/status', ['status' => 'gone'])['status'] === 422);
$r = admin('GET', '/feedback/'.$sent);
check('the thread lists the reply', count($r['body']['thread']) === 1 && $r['body']['thread'][0]['kind'] === 'reply' && $r['body']['status'] === 'resolved');

// ---- Dashboard ----
$problemsBefore = admin('GET', '/todo')['body']['items'][2]['count'];
$broken = admin('POST', '/quizzes', ['title' => 'Cms Broken Draft '.$tag, 'category' => $subject])['body']['id'];
admin('POST', '/quizzes/'.$broken, ['meta' => ['intro' => 'A draft that still has no questions.']]);
$r = admin('GET', '/todo');
check('the to-do list has its six items in order', $r['status'] === 200 && array_column($r['body']['items'], 'key') === ['feedback_new', 'review_questions', 'draft_problems', 'review_due', 'hard_questions', 'daily_gaps']);
check('to-do counts are numbers with labels', !array_filter($r['body']['items'], fn($i) => !is_int($i['count']) || !is_string($i['label'])));
check('drafts with problems are counted', $r['body']['items'][2]['count'] === $problemsBefore + 1);
$r = admin('GET', '/stats');
check('stats report plays, finish rate, guests, modes, top quizzes and hard questions', $r['status'] === 200 && $r['body']['plays']['today'] >= 2
    && array_keys($r['body']['modes_7d']) === ['practice', 'ranked', 'daily', 'challenge'] && is_array($r['body']['top_quizzes_7d']) && is_array($r['body']['hardest']));
check('stats carry no player identities', !str_contains($r['raw'], 'nickname') && !str_contains($r['raw'], 'user_id'));

fwrite(STDOUT, "$count cms checks passed\n");
