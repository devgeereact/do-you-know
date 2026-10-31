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
check('the generator is off by default and says why', $status['enabled'] === false && $status['ready'] === false && $status['configured'] === ['claude' => false, 'bright_data' => false]);
try { $off->create(['topic' => 'The water cycle', 'ages' => '7-11', 'count' => 5]); $refused = false; } catch (ApiError $e) { $refused = $e->errorCode === 'generator_off' && $e->status === 409; }
check('a run cannot start while it is off', $refused);
$keys = new Generator($db, ['environment' => 'production', 'generator' => ['enabled' => true, 'anthropic_api_key' => 'x', 'fixtures' => __DIR__.'/fixtures/generator']], $offAdmin, new AdminContent($db, $offAdmin));
check('recorded answers are never used outside the test environment', $keys->status()['configured'] === ['claude' => true, 'bright_data' => false] && $keys->status()['ready'] === false);
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
check('the draft step records drafts and token use', $r['body']['stage'] === 'check' && count($r['body']['drafts']) === 4 && $r['body']['usage']['output_tokens'] > 0);
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
fwrite(STDOUT, "$count generator checks passed\n");
