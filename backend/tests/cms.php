<?php
declare(strict_types=1);
// Admin content studio, daily calendar, rounds, subjects, feedback inbox and the overall board.
// Needs the throwaway _test database, a server whose config lists 'user_TestAdmin0000000001' in
// admin_subjects, and .local-test/jwt-test-private.pem (or DYK_TEST_JWT_PRIVATE), as admin.php.
require __DIR__.'/http.php';
use Dyk\Competition;
use Dyk\Content;
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
// The calendar's auto-pick preview must match what the activator really picks on that day.
$probe = null;
foreach ([0, 1] as $ahead) {
    $month = (new DateTimeImmutable(Competition::londonDate()))->modify('first day of this month')->modify("+$ahead month")->format('Y-m');
    foreach (admin('GET', '/daily?month='.$month)['body']['days'] as $d) {
        if ($d['status'] === 'auto' && $d['quiz_id'] !== null && $d['date'] > Competition::londonDate()) { $probe = $d; break 2; }
    }
}
if ($probe !== null) {
    $before = Database::all($db, 'SELECT id,status FROM daily_challenges WHERE challenge_date>=?', [Competition::londonDate()]);
    $picked = (new Dyk\Daily($db))->activate($probe['date']);
    $real = Database::one($db, 'SELECT quiz_id FROM daily_challenges WHERE challenge_date=?', [$probe['date']]);
    check('the calendar preview names the quiz the activator really picks', $picked['action'] === 'auto_picked' && $real['quiz_id'] === $probe['quiz_id']);
    Database::execute($db, 'DELETE FROM daily_challenges WHERE challenge_date=?', [$probe['date']]);
    foreach ($before as $b) { Database::execute($db, 'UPDATE daily_challenges SET status=? WHERE id=?', [$b['status'], $b['id']]); }
}
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
        request('POST', '/attempts/'.$state['attempt_id'].'/answer', ['option_id' => servedId($state['question'], $pick)], $token);
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
isolateBank([$id]); // the daily deals from every live quiz; here the bank is this quiz
$daily = request('GET', '/daily')['body'];
check('the daily lists ten cosmetic scene stops', $daily['quiz']['slug'] === $slug && count($daily['stops']) === 10 && array_diff($daily['stops'], Dyk\Content::SCENES) === []);
check('the daily stops hold no prompts or answers', !str_contains(json_encode($daily), 'prompt') && !str_contains(json_encode($daily), 'is_correct'));
check('the daily starts with an empty board', $daily['stats'] === ['played' => 0, 'average' => null, 'perfect' => 0]);
$state = request('POST', '/attempts', ['mode' => 'daily'], $star['token'])['body'];
check('the daily deals a question from the live bank', isset($snapshot[$state['question']['id']]));
for ($i = 0; $i < 3; $i++) {
    $pick = array_values(array_filter($snapshot[$state['question']['id']]['options'], fn($o) => $o['is_correct']))[0];
    request('POST', '/attempts/'.$state['attempt_id'].'/answer', ['option_id' => servedId($state['question'], $pick)], $star['token']);
    if ($i < 2) { $state = request('POST', '/attempts/'.$state['attempt_id'].'/next', [], $star['token'])['body']; }
}
request('POST', '/attempts/'.$state['attempt_id'].'/finish', [], $star['token']);
$stats = request('GET', '/daily')['body']['stats'];
check('the daily stats count the board', $stats['played'] === 1 && $stats['perfect'] === 1 && $stats['average'] == 3);

// A daily hand mixes quizzes. The Studio credits each answer to the quiz its question came from, not to
// the day's anchor quiz: three quizzes of three questions, anchored on the first of the new ones.
$mixCategory = Database::one($db, 'SELECT id FROM categories WHERE slug=?', [$subject])['id'];
$mixKeys = []; $mixQuiz = []; $mixIds = [];
foreach ($snapshot as $qid => $q) { $mixKeys[$qid] = $q; $mixQuiz[$qid] = $id; }
foreach (['b', 'c'] as $n) {
    $quizId = Database::uuid(); $versionId = Database::uuid(); $questions = [];
    for ($i = 0; $i < 3; $i++) {
        $q = ['id' => Database::uuid(), 'type' => 'choice', 'prompt' => 'Mixed daily '.$n.' '.$word.' '.($i + 1), 'explanation' => 'Because.',
            'image_url' => null, 'source_url' => null, 'slider' => null,
            'options' => [['id' => Database::uuid(), 'label' => 'Right', 'is_correct' => true], ['id' => Database::uuid(), 'label' => 'Wrong', 'is_correct' => false]]];
        $questions[] = $q; $mixKeys[$q['id']] = $q; $mixQuiz[$q['id']] = $quizId;
    }
    Database::execute($db, "INSERT INTO quizzes (id,slug,title,category_id,status) VALUES (?,?,?,?,'published')", [$quizId, 'cms-mix-'.$n.'-'.$tag, 'Mixed daily '.$n, $mixCategory]);
    Database::execute($db, 'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)', [$versionId, $quizId, json_encode($questions)]);
    Database::execute($db, 'UPDATE quizzes SET current_version_id=? WHERE id=?', [$versionId, $quizId]);
    $mixIds[$n] = ['quiz' => $quizId, 'version' => $versionId];
}
Database::execute($db, 'DELETE FROM attempts WHERE daily_challenge_id IN (SELECT id FROM daily_challenges WHERE challenge_date=?)', [$today]);
Database::execute($db, 'DELETE FROM daily_challenges WHERE challenge_date=?', [$today]);
Database::execute($db, "INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')", [Database::uuid(), $today, $mixIds['b']['quiz'], $mixIds['b']['version']]);
$mixer = request('POST', '/guest-sessions', [])['body'];
$state = request('POST', '/attempts', ['mode' => 'daily'], $mixer['token'])['body'];
check('a daily hand spans every live quiz in the bank', $state['total'] === 9);
for ($i = 0; $i < 9; $i++) {
    $pick = array_values(array_filter($mixKeys[$state['question']['id']]['options'], fn($o) => $o['is_correct']))[0];
    request('POST', '/attempts/'.$state['attempt_id'].'/answer', ['option_id' => servedId($state['question'], $pick)], $mixer['token']);
    if ($i < 8) { $state = request('POST', '/attempts/'.$state['attempt_id'].'/next', [], $mixer['token'])['body']; }
}
request('POST', '/attempts/'.$state['attempt_id'].'/finish', [], $mixer['token']);
$cDetail = admin('GET', '/quizzes/'.$mixIds['c']['quiz'])['body']['questions'];
check('the Studio credits mixed daily answers to the quiz each question came from, not the anchor', array_sum(array_map(fn($q) => $q['stats']['answered'], $cDetail)) === 3);

// A published quiz holding `build` questions opens in the Studio with its tiles intact and survives a save
// (the editing forms come in the next step; until then nothing may be lost).
$buildFile = ['slug' => 'cms-build-'.$tag, 'title' => 'Cms build '.$tag, 'questions' => [
    ['type' => 'build', 'prompt' => 'Spell the yellow fruit '.$word.'.', 'build' => ['variant' => 'spell', 'tiles' => ['b', 'a', 'n', 'a', 'n', 'a', 'x'], 'answers' => [['b', 'a', 'n', 'a', 'n', 'a']], 'speak' => 'banana'],
        'explanation' => 'Because.', 'source_url' => null, 'review_by' => '2027-10-17'],
    ['type' => 'build', 'prompt' => 'Finish it '.$word.'.', 'build' => ['variant' => 'gap', 'template' => 'The cat ___ on the ___.', 'tiles' => ['sat', 'mat', 'dog'], 'answers' => [['sat', 'mat']]],
        'explanation' => 'Because.', 'source_url' => null, 'review_by' => '2027-10-17'],
    ['type' => 'build', 'prompt' => 'Order the day '.$word.'.', 'build' => ['variant' => 'order', 'tiles' => ['morning', 'noon', 'night'], 'answers' => [['morning', 'noon', 'night']]],
        'explanation' => 'Because.', 'source_url' => null, 'review_by' => '2027-10-17'],
]];
$buildId = Database::uuid(); $buildVersion = Database::uuid();
Database::execute($db, "INSERT INTO quizzes (id,slug,title,intro,category_id,status,current_version_id,is_ranked) VALUES (?,?,?,?,?,'published',?,0)", [$buildId, $buildFile['slug'], $buildFile['title'], 'Tap the tiles.', $mixCategory, $buildVersion]);
Database::execute($db, 'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)', [$buildVersion, $buildId, json_encode(Content::snapshot($buildFile))]);
$detail = admin('GET', '/quizzes/'.$buildId)['body'];
$first = $detail['questions'][0] ?? [];
check('a build question opens in the Studio with its tiles, answers and spoken word', ($first['type'] ?? null) === 'build'
    && ($first['build']['tiles'] ?? null) === ['b', 'a', 'n', 'a', 'n', 'a', 'x'] && ($first['build']['answers'] ?? null) === [['b', 'a', 'n', 'a', 'n', 'a']]
    && ($first['build']['speak'] ?? null) === 'banana' && ($detail['questions'][1]['build']['template'] ?? null) === 'The cat ___ on the ___.');
check('a build quiz has no problems in the Studio', ($detail['problems'] ?? null) === []);
$saved = admin('POST', '/quizzes/'.$buildId, ['questions' => $detail['questions']]);
check('saving the questions back loses nothing', $saved['status'] === 200 && array_map(fn($q) => $q['build'], $saved['body']['questions']) === array_map(fn($q) => $q['build'], $detail['questions']) && $saved['body']['problems'] === []);
$broken = $detail['questions']; $broken[1]['build']['template'] = 'The cat ___ on the mat.';
$problems = admin('POST', '/quizzes/'.$buildId, ['questions' => $broken])['body']['problems'] ?? [];
check('a broken build question is a problem on its build field', count($problems) >= 1 && ($problems[0]['index'] ?? null) === 1 && ($problems[0]['field'] ?? null) === 'build');

// An `assign` question (match, sort) is edited like any other: it opens with its items and targets as labels,
// a new one can be added in the Studio, and a broken one is a problem on its assign field.
$assignQs = $detail['questions'];
$assignQs[1] = ['type' => 'assign', 'prompt' => 'Match the animal to its home '.$word.'.', 'assign' => ['variant' => 'match', 'targets' => ['Sea', 'Nest', 'Burrow'],
    'items' => [['label' => 'Fish', 'to' => 'Sea'], ['label' => 'Bird', 'to' => 'Nest'], ['label' => 'Rabbit', 'to' => 'Burrow']]],
    'explanation' => 'Because.', 'source_url' => null, 'review_by' => '2027-10-17', 'scene' => null, 'checked' => true];
$assignQs[2] = ['type' => 'assign', 'prompt' => 'Sort the numbers '.$word.'.', 'assign' => ['variant' => 'sort', 'targets' => ['Odd', 'Even'],
    'items' => [['label' => '3', 'to' => 'Odd'], ['label' => '8', 'to' => 'Even'], ['label' => '5', 'to' => 'Odd']]],
    'explanation' => 'Because.', 'source_url' => null, 'review_by' => '2027-10-17', 'scene' => null, 'checked' => true];
$withAssignQs = admin('POST', '/quizzes/'.$buildId, ['questions' => $assignQs]);
check('a new assign question is saved in the Studio with no problems', $withAssignQs['status'] === 200 && $withAssignQs['body']['problems'] === []
    && ($withAssignQs['body']['questions'][1]['assign'] ?? null) === $assignQs[1]['assign'] && ($withAssignQs['body']['questions'][2]['assign'] ?? null) === $assignQs[2]['assign']);
$reopened = admin('GET', '/quizzes/'.$buildId)['body'];
check('and it reopens with its items and targets as labels', ($reopened['questions'][1]['assign'] ?? null) === $assignQs[1]['assign']);
$brokenAssign = $assignQs; $brokenAssign[1]['assign']['items'][0]['to'] = 'Sky';
$problems = admin('POST', '/quizzes/'.$buildId, ['questions' => $brokenAssign])['body']['problems'] ?? [];
check('a broken assign question is a problem on its assign field', count($problems) >= 1 && ($problems[0]['index'] ?? null) === 1 && ($problems[0]['field'] ?? null) === 'assign');

// A question the author has only just added (nothing typed yet) is saved as a work-in-progress problem, never refused.
$blanks = $assignQs;
$blanks[] = ['type' => 'build', 'prompt' => '', 'build' => ['variant' => 'spell', 'tiles' => [], 'answers' => [[]]], 'explanation' => '', 'source_url' => null, 'review_by' => '2027-10-17', 'scene' => null];
$blanks[] = ['type' => 'assign', 'prompt' => '', 'assign' => ['variant' => 'match', 'targets' => ['', ''], 'items' => [['label' => '', 'to' => ''], ['label' => '', 'to' => '']]], 'explanation' => '', 'source_url' => null, 'review_by' => '2027-10-17', 'scene' => null];
$savedBlank = admin('POST', '/quizzes/'.$buildId, ['questions' => $blanks]);
$blankFields = array_map(fn($p) => $p['index'].':'.$p['field'], $savedBlank['body']['problems'] ?? []);
check('blank tile questions save as problems on their own fields', $savedBlank['status'] === 200 && in_array('3:build', $blankFields, true) && in_array('4:assign', $blankFields, true));

// A quiz can be made practice-only from the Studio (needed for a set made of dictation questions).
$practiceOnly = admin('POST', '/quizzes/'.$buildId, ['meta' => ['is_ranked' => false]]);
check('the Studio can switch ranked rounds off for a quiz', $practiceOnly['status'] === 200 && ($practiceOnly['body']['quiz']['is_ranked'] ?? null) === false);

// ---- Feedback inbox ----
$adult = request('POST', '/guest-sessions', [])['body'];
linkAdult($adult['profile_id']);
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
$r = admin('POST', '/feedback/'.$child.'/reply', ['body' => 'Thank you, that is lovely to hear.']);
check('a child\'s feedback can be answered on the site, never by email', $r['status'] === 200 && $r['body']['emailed'] === false);
check('a reply needs a body', admin('POST', '/feedback/'.$sent.'/reply', ['body' => ''])['body']['error']['code'] === 'invalid_body');
check('a private note can be added', admin('POST', '/feedback/'.$child.'/note', ['body' => 'Lovely.'])['status'] === 200);
$r = admin('POST', '/feedback/'.$sent.'/status', ['status' => 'resolved']);
check('feedback can be resolved', $r['body']['status'] === 'resolved');
check('status must be known', admin('POST', '/feedback/'.$sent.'/status', ['status' => 'gone'])['status'] === 422);
$r = admin('GET', '/feedback/'.$sent);
check('the thread lists the reply', count($r['body']['thread']) === 1 && $r['body']['thread'][0]['kind'] === 'reply' && $r['body']['status'] === 'resolved');

// ---- Messages on the site ----
$me = request('GET', '/me', null, $adult['token'])['body'];
check('the player sees an unread reply count', $me['unread_messages'] === 1);
$r = request('GET', '/me/messages', null, $adult['token']);
$mine = array_values(array_filter($r['body']['items'], fn($i) => $i['id'] === $sent))[0] ?? null;
check('the player reads the staff reply on the site', $mine !== null && $mine['unread'] === true && $mine['thread'][0]['from'] === 'staff' && $mine['thread'][0]['body'] === 'Thank you, we have fixed it.');
check('internal notes are never shown to the player', !str_contains($r['raw'], 'Lovely.'));
check('a resolved thread cannot be answered', request('POST', '/me/messages/'.$sent.'/reply', ['body' => 'Thanks!'], $adult['token'])['status'] === 409);
admin('POST', '/feedback/'.$sent.'/status', ['status' => 'open']);
$r = request('POST', '/me/messages/'.$sent.'/reply', ['body' => 'Thanks, it looks right now.'], $adult['token']);
check('a grown-up answers in their thread', $r['status'] === 201);
$r = admin('GET', '/feedback/'.$sent);
check('the answer reaches the Studio inbox as new', $r['body']['status'] === 'new' && end($r['body']['thread'])['kind'] === 'player' && end($r['body']['thread'])['body'] === 'Thanks, it looks right now.');
$stranger = request('POST', '/guest-sessions', [])['body'];
linkAdult($stranger['profile_id']);
request('POST', '/me/age-band', ['band' => '18_plus'], $stranger['token']);
check('nobody else can answer in that thread', request('POST', '/me/messages/'.$sent.'/reply', ['body' => 'Hello there'], $stranger['token'])['status'] === 404);
check('a child cannot write an answer', request('POST', '/me/messages/'.$child.'/reply', ['body' => 'Hello there'], $guest['token'])['body']['error']['code'] === 'free_text_not_allowed');
$kid = request('GET', '/me/messages', null, $guest['token'])['body'];
check('a child reads replies but has no reply box', $kid['can_write'] === false && ($kid['items'][0]['can_reply'] ?? true) === false && ($kid['items'][0]['thread'][0]['from'] ?? '') === 'staff');
request('POST', '/me/messages/seen', [], $adult['token']);
check('opening messages clears the unread count', request('GET', '/me', null, $adult['token'])['body']['unread_messages'] === 0);

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

// ---- Import (owner decision, 1 November 2026, ADR-019): imported questions arrive checked ----
$imported = [$question('Imported fixture one '.$word.'?'), $question('Imported fixture two '.$word.'?', false),
    ['type' => 'choice', 'prompt' => 'Imported fixture three '.$word.'?', 'options' => [['label' => 'Right one', 'correct' => true], ['label' => 'Wrong one', 'correct' => false]],
     'explanation' => 'No source on this one.', 'review_by' => '2099-01-01']];
$r = admin('POST', '/quizzes', ['title' => 'Imported fixture (ages 4–5) '.$tag, 'category' => $subject, 'age_min' => 4, 'age_max' => 5,
    'intro' => 'Three questions about the fixture, for ages 4–5.', 'imported' => true, 'questions' => $imported]);
$importId = $r['body']['id'] ?? '';
check('an import creates a draft', $r['status'] === 201);
$d = admin('GET', '/quizzes/'.$importId)['body'];
check('imported questions are already checked', count($d['questions']) === 3 && array_column($d['questions'], 'checked') === [true, true, true]);
check('an import sets the quiz age band', $d['quiz']['age_min'] === 4 && $d['quiz']['age_max'] === 5);
check('a question without a source is not a problem', !in_array('source_url', array_column($d['problems'], 'field'), true));
$audit = Database::one($db, "SELECT detail FROM admin_audit WHERE action='quiz.create' AND target_id=?", [$importId]);
check('the import is recorded in the audit log', $audit && (json_decode($audit['detail'], true)['imported'] ?? null) === true);
$r = admin('POST', '/quizzes/'.$importId.'/publish', []);
check('an imported quiz publishes without ticking each question', $r['status'] === 200 && $r['body']['quiz']['status'] === 'published');
check('the published quiz keeps its age band', (int) Database::one($db, 'SELECT age_min FROM quizzes WHERE id=?', [$importId])['age_min'] === 4);
$r = admin('POST', '/quizzes/'.$importId.'/append', ['questions' => [$question('Imported fixture four '.$word.'?')], 'imported' => true]);
check('questions appended by an import arrive checked too', $r['status'] === 200 && end($r['body']['questions'])['checked'] === true);
$r = admin('POST', '/quizzes', ['title' => 'Hand-made fixture '.$tag, 'category' => $subject, 'questions' => [$question('Hand-made fixture '.$word.'?')]]);
check('questions made by hand still need checking', admin('GET', '/quizzes/'.($r['body']['id'] ?? ''))['body']['questions'][0]['checked'] === false);
check('the imported flag must be true or false', admin('POST', '/quizzes', ['title' => 'Bad flag '.$tag, 'category' => $subject, 'imported' => 'yes'])['status'] === 422);
check('an age band must be in order', admin('POST', '/quizzes', ['title' => 'Bad ages '.$tag, 'category' => $subject, 'age_min' => 9, 'age_max' => 5])['status'] === 422);
check('an append flag must be true or false', admin('POST', '/quizzes/'.$importId.'/append', ['questions' => [$question('Flag fixture '.$word.'?')], 'imported' => 1])['status'] === 422);

// ---- Deleting a draft that was never published ----
$r = admin('POST', '/quizzes', ['title' => 'Delete fixture '.$tag, 'category' => $subject, 'questions' => [$question('Delete fixture '.$word.'?')]]);
$deleteId = $r['body']['id'] ?? '';
$r = admin('POST', '/quizzes/'.$deleteId.'/delete');
check('a draft that was never published can be deleted', $r['status'] === 200 && ($r['body']['deleted'] ?? null) === true && $r['body']['id'] === $deleteId);
check('a deleted draft is gone from the list and detail', admin('GET', '/quizzes/'.$deleteId)['status'] === 404
    && !in_array($deleteId, array_column(admin('GET', '/quizzes')['body']['items'], 'id'), true));
$audit = Database::one($db, "SELECT detail FROM admin_audit WHERE action='quiz.delete' AND target_id=?", [$deleteId]);
check('the deletion is recorded in the audit log', $audit && str_contains($audit['detail'], 'Delete fixture'));
check('deleting twice says the quiz is not found', admin('POST', '/quizzes/'.$deleteId.'/delete')['body']['error']['code'] === 'quiz_not_found');
$r = admin('POST', '/quizzes/'.$id.'/delete');
check('a quiz that has been published cannot be deleted', $r['status'] === 409 && $r['body']['error']['code'] === 'quiz_published');
check('the published quiz is still there after a refused delete', admin('GET', '/quizzes/'.$id)['status'] === 200);

fwrite(STDOUT, "$count cms checks passed\n");
