<?php
declare(strict_types=1);
// Sourced question generator. The API server must run with DYK_GENERATOR_FIXTURES pointing at
// backend/tests/fixtures/generator (scripts/test-backend.sh and CI set it), so every outside call
// is a recorded answer: no Bright Data or Claude request, no cost. Same admin setup as cms.php.
require __DIR__.'/http.php';
use Dyk\Admin;
use Dyk\AdminContent;
use Dyk\ApiError;
use Dyk\Database;
use Dyk\Generator;
use Firebase\JWT\JWT;

$keyFile = getenv('DYK_TEST_JWT_PRIVATE') ?: dirname(__DIR__, 2).'/.local-test/jwt-test-private.pem';
if (!is_file($keyFile)) { fwrite(STDERR, "Missing .local-test/jwt-test-private.pem (see backend/README.md).\n"); exit(1); }
$private = file_get_contents($keyFile);
$token = JWT::encode(['sub' => 'user_TestAdmin0000000001', 'sid' => 'sess_fixture', 'iss' => 'https://clerk.example.test', 'azp' => 'http://localhost:5202',
    'iat' => time(), 'nbf' => time() - 1, 'exp' => time() + 900], $private, 'RS256', 'fixture');
function gen(string $method, string $path, ?array $body = null): array {
    global $db, $token;
    $db->exec('DELETE FROM rate_limits');
    return request($method, '/admin'.$path, $body, $token);
}
// Earlier runs of this suite may have left fixture drafts in a quiz; start clean.
foreach (Database::all($db, "SELECT id FROM quizzes WHERE slug LIKE 'generator-fixture-%'") as $old) {
    Database::execute($db, 'DELETE FROM quizzes WHERE id=?', [$old['id']]);
}

$subject = Database::one($db, 'SELECT slug FROM categories ORDER BY sort_order LIMIT 1')['slug'] ?? '';
if ($subject === '') { fwrite(STDERR, "The test database has no subjects; run the content suite first.\n"); exit(1); }

// ---- Pure helpers ----
check('trusted hosts include subdomains only of listed sites', Generator::trusted('www.bbc.co.uk', ['bbc.co.uk']) && !Generator::trusted('evilbbc.co.uk', ['bbc.co.uk']));
check('only https links count as a source', Generator::host('http://www.bbc.co.uk/x') === null && Generator::host('https://www.bbc.co.uk/x') === 'www.bbc.co.uk');
$text = Generator::pageText('<html><body><nav>Menu</nav><main><p>Real   words&nbsp;here.</p><script>alert(1)</script></main><footer>F</footer></body></html>');
check('page text keeps the main content without menus, scripts or footers', $text === 'Real words here.');
check('a quote matches ignoring case, spacing and curly quotes', Generator::quoteIn('The  Sun’s heat turns water into VAPOUR', "Fixture: the sun's heat turns water into vapour quickly."));
check('a short quote is not enough', !Generator::quoteIn('water vapour', 'water vapour is a gas'));
check('a made-up quote does not match', !Generator::quoteIn('clouds are mostly made of candyfloss', 'Clouds are made of drops of water.'));

// ---- Off unless switched on and configured ----
$adminRow = Database::one($db, "SELECT profile_id FROM identities WHERE provider='clerk' AND subject='user_TestAdmin0000000001'");
$offAdmin = new Admin($db, ['environment' => 'production', 'admin_subjects' => []], ['id' => $adminRow['profile_id'] ?? '']);
$off = new Generator($db, ['environment' => 'production'], $offAdmin, new AdminContent($db, $offAdmin));
$status = $off->status();
check('the generator is off by default and says why', $status['enabled'] === false && $status['ready'] === false && $status['configured'] === ['anthropic' => false, 'openrouter' => false, 'bright_data' => false, 'writer' => false, 'search' => false]);
try { $off->create(['topic' => 'The water cycle', 'ages' => '7-11', 'count' => 5]); $refused = false; } catch (ApiError $e) { $refused = $e->errorCode === 'generator_off' && $e->status === 409; }
check('a run cannot start while it is off', $refused);
$keys = new Generator($db, ['environment' => 'production', 'generator' => ['enabled' => true, 'anthropic_api_key' => 'x', 'fixtures' => __DIR__.'/fixtures/generator']], $offAdmin, new AdminContent($db, $offAdmin));
check('recorded answers are never used outside the test environment', $keys->status()['configured']['openrouter'] === false && $keys->status()['configured']['bright_data'] === false);
$only = fn(array $g) => (new Generator($db, ['environment' => 'production', 'generator' => ['enabled' => true] + $g], $offAdmin, new AdminContent($db, $offAdmin)))->status();
check('an Anthropic key alone is enough: Claude searches and writes', $only(['anthropic_api_key' => 'x'])['ready'] === true);
check('an OpenRouter key alone is enough as the backup', $only(['openrouter_api_key' => 'x'])['ready'] === true);
check('Bright Data alone cannot write questions', $only(['brightdata_api_key' => 'x', 'brightdata_serp_zone' => 'z', 'brightdata_unlocker_zone' => 'u'])['ready'] === false);
check('keys switched off stay off', (new Generator($db, ['environment' => 'production', 'generator' => ['enabled' => false, 'anthropic_api_key' => 'x']], $offAdmin, new AdminContent($db, $offAdmin)))->status()['ready'] === false);
check('the backup model defaults to Opus 5.5 on OpenRouter', $status['backup_model'] === 'anthropic/claude-opus-5.5');
check('the default model is claude-opus-5-5', $status['model'] === 'claude-opus-5-5');

// ---- Through the API with recorded answers ----
$r = gen('GET', '/generator');
check('status lists trusted sources, caps and usage', $r['status'] === 200 && $r['body']['ready'] === true && in_array('bbc.co.uk', $r['body']['sources'], true) && isset($r['body']['cap']['limit'], $r['body']['usage_30d']['runs']));
check('a player cannot reach the generator', request('GET', '/admin/generator')['status'] === 401);
$r = gen('POST', '/generator/runs', ['topic' => 'x', 'ages' => '9', 'count' => 50, 'category' => 'no-such-subject']);
check('a run checks topic, ages, count and subject', $r['status'] === 422 && array_column($r['body']['error']['details'], 'field') === ['topic', 'ages', 'count', 'category']);
check('a run refuses unknown fields', gen('POST', '/generator/runs', ['topic' => 'Water', 'ages' => '7-11', 'count' => 5, 'publish' => true])['status'] === 422);

$r = gen('POST', '/generator/runs', ['topic' => 'The water cycle', 'ages' => '7-11', 'count' => 4, 'category' => $subject]);
$run = $r['body']['id'] ?? '';
check('a run starts at the search step', $r['status'] === 201 && $r['body']['stage'] === 'search' && $r['body']['model'] === 'claude-opus-5-5');
Database::execute($db, 'UPDATE generator_runs SET busy_until=DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 1 MINUTE) WHERE id=?', [$run]);
$r = gen('POST', "/generator/runs/$run/step");
check('a step already running elsewhere is not repeated', $r['body']['busy'] === true && $r['body']['stage'] === 'search' && $r['body']['usage']['search_calls'] === 0);
Database::execute($db, 'UPDATE generator_runs SET busy_until=NULL WHERE id=?', [$run]);
$r = gen('POST', "/generator/runs/$run/step");
$urls = array_column($r['body']['sources'], 'url');
check('search keeps only https pages on the trusted list, once each', $r['body']['stage'] === 'fetch' && $urls === ['https://www.bbc.co.uk/bitesize/fixture-water-cycle', 'https://www.metoffice.gov.uk/fixture-clouds', 'https://www.nhm.ac.uk/fixture-missing']);
for ($i = 0; $i < 3; $i++) { $r = gen('POST', "/generator/runs/$run/step"); }
check('each page is read in its own step; a page that fails is marked unreadable', $r['body']['stage'] === 'draft' && array_column($r['body']['sources'], 'state') === ['read', 'read', 'unreadable'] && $r['body']['usage']['page_calls'] === 3);
$page = Database::one($db, 'SELECT text FROM generator_pages WHERE run_id=? AND url=?', [$run, 'https://www.bbc.co.uk/bitesize/fixture-water-cycle'])['text'] ?? '';
check('stored page text has no menus or scripts', str_contains($page, 'called evaporation') && !str_contains($page, 'Menu Home') && !str_contains($page, 'var x'));
$r = gen('POST', "/generator/runs/$run/step");
check('the draft step records drafts, token use and the model that wrote them', $r['body']['stage'] === 'check' && count($r['body']['drafts']) === 4 && $r['body']['usage']['output_tokens'] > 0 && $r['body']['model'] === 'fixtures:recorded');
$r = gen('POST', "/generator/runs/$run/step");
$d = $r['body']['drafts'];
check('the run is done after the checks', $r['body']['stage'] === 'done');
check('a draft whose quote is in its trusted page is kept', $d[0]['kept'] === true && $d[0]['checks'] === ['quote_found' => true, 'on_allowlist' => true, 'new_prompt' => true]);
check('a draft is in our question format with one right answer', $d[0]['question']['type'] === 'choice' && count($d[0]['question']['options']) === 4
    && count(array_filter($d[0]['question']['options'], fn($o) => $o['correct'])) === 1 && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d[0]['question']['review_by']) === 1);
check('a made-up quote is caught', $d[1]['kept'] === false && $d[1]['checks']['quote_found'] === false && in_array('quote', array_column($d[1]['problems'], 'field'), true));
check('a source off the trusted list is caught', $d[2]['kept'] === false && $d[2]['checks']['on_allowlist'] === false);
check('a draft that breaks the question rules is caught', $d[3]['kept'] === false && $d[3]['problems'] !== []);
check('stepping a finished run changes nothing', gen('POST', "/generator/runs/$run/step")['body']['stage'] === 'done');

// ---- Human decisions ----
check('a draft with problems cannot be approved', gen('POST', '/generator/drafts/'.$d[1]['id'], ['decision' => 'approved'])['body']['error']['code'] === 'draft_has_problems');
check('a decision must be known', gen('POST', '/generator/drafts/'.$d[0]['id'], ['decision' => 'publish'])['status'] === 422);
$r = gen('POST', '/generator/drafts/'.$d[0]['id'], ['decision' => 'approved']);
check('a kept draft can be approved', $r['status'] === 200 && $r['body']['decision'] === 'approved');
check('a draft can be rejected', gen('POST', '/generator/drafts/'.$d[1]['id'], ['decision' => 'rejected'])['body']['decision'] === 'rejected');

$quiz = gen('POST', '/quizzes', ['title' => 'Generator fixture '.substr($run, 0, 8), 'category' => $subject])['body']['id'] ?? '';
check('only approved drafts can be sent', gen('POST', "/generator/runs/$run/send", ['quiz_id' => $quiz, 'draft_ids' => [$d[1]['id']]])['body']['error']['code'] === 'drafts_not_approved');
$r = gen('POST', "/generator/runs/$run/send", ['quiz_id' => $quiz, 'draft_ids' => [$d[0]['id']]]);
check('approved drafts go into the quiz work copy', $r['status'] === 200 && $r['body']['sent'] === 1 && $r['body']['run']['drafts'][0]['decision'] === 'sent');
$detail = gen('GET', "/quizzes/$quiz")['body'];
check('the quiz is still a draft that needs Check & publish', $detail['quiz']['status'] === 'draft' && count($detail['questions']) === 1 && $detail['questions'][0]['prompt'] === $d[0]['question']['prompt']);
check('a sent draft cannot be decided again', gen('POST', '/generator/drafts/'.$d[0]['id'], ['decision' => 'rejected'])['status'] === 409);
$audit = Database::all($db, "SELECT action FROM admin_audit WHERE target_id IN (?,?) OR (target_type='generator_draft' AND target_id=?)", [$run, $quiz, $d[0]['id']]);
check('runs, decisions and sends are in the audit log', count(array_intersect(['generator.run', 'generator.decide', 'generator.send'], array_column($audit, 'action'))) === 3);
$r = gen('GET', '/generator');
check('usage counts the run and the sent draft', $r['body']['usage_30d']['runs'] >= 1 && $r['body']['usage_30d']['sent'] >= 1 && $r['body']['runs'][0]['id'] === $run);

Database::execute($db, 'DELETE FROM quizzes WHERE id=?', [$quiz]);
// ---- Writing helpers: a draft intro or explanation for the editor, never saved by the server ----
$s = gen('GET', '/generator')['body'];
check('status says whether the writing helpers can run', ($s['writer_ready'] ?? null) === true && is_array($s['writer_cap'] ?? null));
$before = (int) Database::one($db, "SELECT COUNT(*) AS n FROM admin_audit WHERE action='generator.write'")['n'];
$quizWrites = fn(): int => (int) Database::one($db, "SELECT COUNT(*) AS n FROM admin_audit WHERE action IN ('quiz.save','quiz.create','quiz.append')")['n'];
$writesBefore = $quizWrites();
$r = gen('POST', '/generator/write', ['kind' => 'intro', 'title' => 'Food and digestion (ages 4–5)', 'age_min' => 4, 'age_max' => 5]);
check('an intro is written from the title', $r['status'] === 200 && $r['body']['text'] === 'Find out what happens to your food after you take a bite, from your teeth to your tummy.');
check('the helper says which model wrote it', is_string($r['body']['model'] ?? null) && $r['body']['model'] !== '');
$r = gen('POST', '/generator/write', ['kind' => 'explanation', 'prompt' => 'What helps you bite an apple?', 'answer' => 'Teeth', 'age_min' => 4, 'age_max' => 5]);
check('an explanation is written from the question and answer', $r['status'] === 200 && str_starts_with($r['body']['text'], 'Your teeth'));
$after = (int) Database::one($db, "SELECT COUNT(*) AS n FROM admin_audit WHERE action='generator.write'")['n'];
check('each helper call is in the audit log', $after === $before + 2);
check('nothing is saved to a quiz by the helper', $quizWrites() === $writesBefore);
check('the helper needs a known kind', gen('POST', '/generator/write', ['kind' => 'poem', 'title' => 'x'])['status'] === 422);
check('an intro needs a title', gen('POST', '/generator/write', ['kind' => 'intro'])['status'] === 422);
check('an explanation needs the question and the answer', gen('POST', '/generator/write', ['kind' => 'explanation', 'prompt' => 'Why?'])['status'] === 422);
check('the helper refuses unknown fields', gen('POST', '/generator/write', ['kind' => 'intro', 'title' => 'x', 'url' => 'https://e.org'])['status'] === 422);
check('players cannot use the helper', request('POST', '/admin/generator/write', ['kind' => 'intro', 'title' => 'x'], request('POST', '/guest-sessions', [])['body']['token'])['status'] === 403);
// The daily cap counts helper calls from the audit log.
$actor = Database::one($db, "SELECT actor_id FROM admin_audit WHERE action='generator.write' ORDER BY created_at DESC LIMIT 1")['actor_id'];
$cap = (int) $s['writer_cap']['limit'];
$used = (int) $s['writer_cap']['used'] + 2;
for ($i = $used; $i < $cap; $i++) {
    Database::execute($db, "INSERT INTO admin_audit (actor_id,action,target_type,detail) VALUES (?, 'generator.write', 'cap-fixture', NULL)", [$actor]);
}
$r = gen('POST', '/generator/write', ['kind' => 'intro', 'title' => 'One too many']);
check('the helper stops at its daily cap', $r['status'] === 429 && $r['body']['error']['code'] === 'generator_daily_cap');
Database::execute($db, "DELETE FROM admin_audit WHERE target_type='cap-fixture'");

// ---- AI review of imported questions (advisory: nothing is saved) ----
$q = static fn(string $prompt, array $labels, int $right, string $why = 'Because it is.', ?string $src = null): array => ['type' => 'choice', 'prompt' => $prompt,
    'options' => array_map(static fn(string $l, int $i): array => ['label' => $l, 'correct' => $i === $right], $labels, array_keys($labels)),
    'explanation' => $why, 'source_url' => $src];
$batch = [
    $q('What helps you bite an apple?', ['Lips', 'Teeth', 'Ears', 'Eyelashes'], 1),
    $q('Which bone cells lay down new bone tissue?', ['Bone resorption', 'Oxygen transport', 'Bone formation', 'Insulin release'], 2, 'Osteoblasts build the bone matrix.', 'https://training.seer.cancer.gov/anatomy/skeletal/growth.html'),
    $q('What protects your brain?', ['Heel', 'Elbow', 'Wrist', 'Skull'], 3),
    $q('Which teeth are at the front of your mouth?', ['Front teeth', 'Back teeth', 'Kneecaps', 'Ribs'], 0),
    $q('Which part helps you taste food?', ['Teeth', 'Tongue', 'Lips only', 'Jawbone'], 1),
    $q('Which part bends in the middle of your arm?', ['Ankle', 'Elbow', 'Hip', 'Knee'], 1),
];
$reviewsBefore = (int) Database::one($db, "SELECT COUNT(*) AS n FROM admin_audit WHERE action='generator.review'")['n'];
$writesBefore = $quizWrites();
$r = gen('POST', '/import/review', ['subject' => 'Science', 'topic' => 'Bones and movement', 'age_min' => 18, 'age_max' => null, 'questions' => $batch]);
$items = array_column($r['body']['items'] ?? [], null, 'index');
check('the review answers every question in the batch', $r['status'] === 200 && count($items) === count($batch));
check('a fine question comes back ok with no fix', ($items[0]['verdict'] ?? '') === 'ok' && !isset($items[0]['fix']));
check('a question that does not fit its answer gets a fix with a reason',
    ($items[1]['verdict'] ?? '') === 'fix' && ($items[1]['fix']['prompt'] ?? '') === 'What do osteoblasts mainly do?' && ($items[1]['reason'] ?? '') !== '');
check('a fix keeps the same number of answers and one right one',
    count($items[1]['fix']['options'] ?? []) === 4 && count(array_filter($items[1]['fix']['options'] ?? [], static fn($o) => $o['correct'])) === 1);
check('a fix never touches the source', !array_key_exists('source_url', $items[1]['fix'] ?? []));
check('a doubtful question is flagged with a reason and no fix', ($items[2]['verdict'] ?? '') === 'flag' && !isset($items[2]['fix']) && ($items[2]['reason'] ?? '') !== '');
check('a fix with a different number of answers is turned into a flag', ($items[3]['verdict'] ?? '') === 'flag' && !isset($items[3]['fix']));
check('a fix with a link in it is turned into a flag', ($items[4]['verdict'] ?? '') === 'flag' && !isset($items[4]['fix']));
check('a fix with two right answers is turned into a flag', ($items[5]['verdict'] ?? '') === 'flag' && !isset($items[5]['fix']));
check('each review call is audited once', (int) Database::one($db, "SELECT COUNT(*) AS n FROM admin_audit WHERE action='generator.review'")['n'] === $reviewsBefore + 1);
check('the review saves nothing to any quiz', $quizWrites() === $writesBefore);
check('status says whether the review can run and its cap', ($s2 = gen('GET', '/generator')['body']) && ($s2['review_ready'] ?? null) === true && is_array($s2['review_cap'] ?? null));
check('the review takes at most 25 questions a call', gen('POST', '/import/review', ['questions' => array_fill(0, 26, $batch[0])])['status'] === 422);
check('the review needs at least one question', gen('POST', '/import/review', ['questions' => []])['status'] === 422);
check('only choice questions are reviewed', gen('POST', '/import/review', ['questions' => [['type' => 'boolean', 'prompt' => 'Is it?', 'answer' => true, 'explanation' => 'Yes.']]])['status'] === 422);
check('the review refuses unknown fields', gen('POST', '/import/review', ['questions' => [$batch[0]], 'model' => 'x'])['status'] === 422);
check('players cannot use the review', request('POST', '/admin/import/review', ['questions' => [$batch[0]]], request('POST', '/guest-sessions', [])['body']['token'])['status'] === 403);
try { $off->review(['questions' => [$batch[0]]]); $refused = false; } catch (ApiError $e) { $refused = $e->errorCode === 'generator_off' && $e->status === 409; }
check('the review cannot run while the generator is off', $refused);
$prompt = Generator::reviewPrompt([$batch[0]], 'Science', 'Bones', 4, 5);
check('the review prompt treats the questions as data, not instructions', str_contains($prompt['system'], 'untrusted') && str_contains($prompt['user'], '<questions>') && str_contains($prompt['system'], 'ages 4 to 5'));
// The import records how many AI fixes the person accepted.
$made = gen('POST', '/quizzes', ['title' => 'Generator fixture AI fixes', 'category' => $subject, 'intro' => 'Fixture.', 'imported' => true, 'ai_fixes' => 2,
    'questions' => array_map(static fn(array $x): array => $x + ['review_by' => '2027-11-06'], array_slice($batch, 0, 3))]);
$detail = json_decode((string) (Database::one($db, "SELECT detail FROM admin_audit WHERE action='quiz.create' AND target_id=?", [$made['body']['id'] ?? ''])['detail'] ?? 'null'), true);
check('an import records the AI fixes accepted', $made['status'] === 201 && ($detail['ai_fixes'] ?? null) === 2);
$appended = gen('POST', '/quizzes/'.($made['body']['id'] ?? '').'/append', ['questions' => [$batch[4] + ['review_by' => '2027-11-06']], 'imported' => true, 'ai_fixes' => 1]);
$detail = json_decode((string) (Database::one($db, "SELECT detail FROM admin_audit WHERE action='quiz.append' AND target_id=? ORDER BY created_at DESC LIMIT 1", [$made['body']['id'] ?? ''])['detail'] ?? 'null'), true);
check('adding to a quiz records the AI fixes accepted too', $appended['status'] === 200 && ($detail['ai_fixes'] ?? null) === 1);
check('ai_fixes must be a small whole number', gen('POST', '/quizzes', ['title' => 'Generator fixture bad', 'category' => $subject, 'ai_fixes' => -1])['status'] === 422);
Database::execute($db, "DELETE FROM quizzes WHERE slug LIKE 'generator-fixture-%'");
$reviewCap = (int) $s2['review_cap']['limit'];
for ($i = (int) $s2['review_cap']['used']; $i < $reviewCap; $i++) {
    Database::execute($db, "INSERT INTO admin_audit (actor_id,action,target_type,detail) VALUES (?, 'generator.review', 'cap-fixture', NULL)", [$actor]);
}
$r = gen('POST', '/import/review', ['questions' => [$batch[0]]]);
check('the review stops at its own daily cap', $r['status'] === 429 && $r['body']['error']['code'] === 'generator_daily_cap');
Database::execute($db, "DELETE FROM admin_audit WHERE target_type='cap-fixture'");

fwrite(STDOUT, "$count generator checks passed\n");
