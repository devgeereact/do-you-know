<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Content;
use Dyk\Database;

// Validator, importer and publish gate for backend/content. Fixtures are original test content.
$root = dirname(__DIR__);
$cli = function (array $args, ?string $configFile = null) use ($root): array {
    $env = $configFile ? 'DYK_CONFIG='.escapeshellarg($configFile).' ' : '';
    exec($env.escapeshellarg(PHP_BINARY).' '.escapeshellarg($root.'/bin/import-content.php').' '.implode(' ', array_map('escapeshellarg', $args)).' 2>&1', $out, $code);
    return ['code' => $code, 'out' => implode("\n", $out)];
};

// ---- Validator rejects bad files ----
$good = ['slug' => 'fixture-quiz', 'title' => 'Fixture quiz', 'intro' => 'Original fixture.', 'category' => 'fixture-cat',
    'difficulty' => 'easy', 'age_min' => 7, 'age_max' => 11, 'curriculum_tags' => ['uk-ks2'], 'time_limit_seconds' => 20,
    'questions' => [
        ['type' => 'choice', 'prompt' => 'Fixture choice?', 'options' => [['label' => 'A', 'correct' => true], ['label' => 'B', 'correct' => false]],
            'explanation' => 'Because A.', 'source_url' => 'https://example.org/a', 'review_by' => '2027-10-17'],
        ['type' => 'boolean', 'prompt' => 'Fixture boolean?', 'answer' => true, 'explanation' => 'True.', 'source_url' => 'https://example.org/b', 'review_by' => '2027-10-17'],
        ['type' => 'slider', 'prompt' => 'Fixture slider?', 'slider' => ['min' => 0, 'max' => 10, 'step' => 1, 'unit' => null, 'correct' => 5, 'accept_min' => 4, 'accept_max' => 6],
            'explanation' => 'Five.', 'source_url' => 'https://example.org/c', 'review_by' => '2027-10-17'],
    ]];
$validate = fn(array $quiz): array => Content::validateQuiz($quiz, ['fixture-cat'], ['uk-ks2'], 'fixture');
check('validator accepts a well-formed quiz', $validate($good) === []);
$bad = [
    'one option' => function (array $q): array { $q['questions'][0]['options'] = [['label' => 'A', 'correct' => true]]; return $q; },
    'seven options' => function (array $q): array { $q['questions'][0]['options'] = array_map(fn(int $i): array => ['label' => "O$i", 'correct' => $i === 0], range(0, 6)); return $q; },
    'two correct options' => function (array $q): array { $q['questions'][0]['options'][1]['correct'] = true; return $q; },
    'no correct option' => function (array $q): array { $q['questions'][0]['options'][0]['correct'] = false; return $q; },
    'duplicate option labels' => function (array $q): array { $q['questions'][0]['options'][1]['label'] = 'a'; return $q; },
    'boolean without answer' => function (array $q): array { unset($q['questions'][1]['answer']); return $q; },
    'slider min above max' => function (array $q): array { $q['questions'][2]['slider']['min'] = 20; return $q; },
    'slider correct outside accepted range' => function (array $q): array { $q['questions'][2]['slider']['correct'] = 9; return $q; },
    'slider accepted range outside scale' => function (array $q): array { $q['questions'][2]['slider']['accept_max'] = 11; return $q; },
    'slider zero step' => function (array $q): array { $q['questions'][2]['slider']['step'] = 0; return $q; },
    'slider correct off the step grid' => function (array $q): array { $q['questions'][2]['slider']['step'] = 2; $q['questions'][2]['slider']['correct'] = 5; return $q; },
    'missing explanation' => function (array $q): array { unset($q['questions'][0]['explanation']); return $q; },
    'missing source' => function (array $q): array { unset($q['questions'][1]['source_url']); return $q; },
    'http source' => function (array $q): array { $q['questions'][1]['source_url'] = 'http://example.org/b'; return $q; },
    'missing review date' => function (array $q): array { unset($q['questions'][2]['review_by']); return $q; },
    'impossible review date' => function (array $q): array { $q['questions'][2]['review_by'] = '2027-02-30'; return $q; },
    'unknown question type' => function (array $q): array { $q['questions'][0]['type'] = 'essay'; return $q; },
    'unknown key (typo)' => function (array $q): array { $q['questions'][0]['explaination'] = 'x'; return $q; },
    'unknown category' => function (array $q): array { $q['category'] = 'nope'; return $q; },
    'unknown curriculum tag' => function (array $q): array { $q['curriculum_tags'] = ['us-6-8']; return $q; },
    'reserved slug trending' => function (array $q): array { $q['slug'] = 'trending'; return $q; },
    'non-kebab slug' => function (array $q): array { $q['slug'] = 'Fixture_Quiz'; return $q; },
    'too few questions' => function (array $q): array { $q['questions'] = array_slice($q['questions'], 0, 2); return $q; },
    'duplicate prompt' => function (array $q): array { $q['questions'][1]['prompt'] = 'fixture choice?'; return $q; },
    'timer out of range' => function (array $q): array { $q['time_limit_seconds'] = 500; return $q; },
    'age range reversed' => function (array $q): array { $q['age_min'] = 12; return $q; },
    'round larger than the bank' => function (array $q): array { $q['round_size'] = 4; return $q; },
    'round below three' => function (array $q): array { $q['round_size'] = 2; return $q; },
    'reworded duplicate prompt' => function (array $q): array { $q['questions'][1]['prompt'] = 'Fixture  choice!'; return $q; },
];
foreach ($bad as $name => $mutate) {
    check('validator rejects '.$name, $validate($mutate($good)) !== []);
}

// Directory-level checks: duplicate slugs and file naming.
$tmp = sys_get_temp_dir().'/dyk-content-'.bin2hex(random_bytes(4));
$writeDir = function (string $dir, array $quizzes) use ($root): void {
    @mkdir($dir, 0700, true);
    foreach (glob($dir.'/*.json') ?: [] as $old) { unlink($old); }
    copy($root.'/content/categories.json', $dir.'/categories.json');
    foreach ($quizzes as $file => $quiz) { file_put_contents($dir.'/'.$file, json_encode($quiz, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); }
};
register_shutdown_function(function () use ($tmp): void { foreach (glob($tmp.'/*') ?: [] as $f) { unlink($f); } @rmdir($tmp); });
$sample = json_decode((string) file_get_contents($root.'/content/everyday-know-how.json'), true);
$writeDir($tmp, ['everyday-know-how.json' => $sample, 'copy.json' => $sample]);
$loaded = Content::load($tmp);
// File names must equal slugs, so a copied file under another name can never become a duplicate quiz.
check('loader rejects a file not named after its slug', count($loaded['errors']) === 1 && str_contains($loaded['errors'][0], 'file name must be') && count($loaded['quizzes']) === 1);
$other = $good;
$other['slug'] = 'fixture-other';
$writeDir($tmp, ['everyday-know-how.json' => $sample,
    'fixture-other.json' => array_merge($other, ['category' => 'general-knowledge', 'curriculum_tags' => []])]);
$other['questions'][0]['prompt'] = $sample['questions'][0]['prompt'];
$writeDir($tmp, ['everyday-know-how.json' => $sample,
    'fixture-other.json' => array_merge($other, ['category' => 'general-knowledge', 'curriculum_tags' => []])]);
$loaded = Content::load($tmp);
check('loader rejects a prompt already used in another quiz', count($loaded['errors']) === 1 && str_contains($loaded['errors'][0], 'repeats a prompt from everyday-know-how.json'));
$writeDir($tmp, ['everyday-know-how.json' => $sample, 'copy.json' => $sample]);
$r = $cli(['--dry-run', '--dir='.$tmp]);
check('dry run exits non-zero on invalid content', $r['code'] === 2 && str_contains($r['out'], 'nothing was imported'));

// ---- Real content validates ----
$content = Content::load($root.'/content');
check('shipped content has no validation errors', $content['errors'] === []);
$quizCount = count($content['quizzes']);
check('shipped content keeps at least the 28 launch quizzes', $quizCount >= 28);
$r = $cli(['--dry-run']);
check('dry run reports counts without a database', $r['code'] === 0 && str_contains($r['out'], "$quizCount quizzes") && str_contains($r['out'], 'no database was touched'));
// Every age from 5 to adult has enough questions for many rounds without a repeat.
foreach ([5, 6, 8, 10, 13, 15, 17, 30] as $age) {
    $fit = array_filter($content['quizzes'], fn(array $q): bool => ($q['age_min'] ?? 0) <= $age && ($q['age_max'] ?? 120) >= $age);
    $questions = array_sum(array_map(fn(array $q): int => count($q['questions']), $fit));
    check("age $age has at least 5 quizzes and 150 questions (has ".count($fit)." and $questions)", count($fit) >= 5 && $questions >= 150);
}
$short = array_keys(array_filter($content['quizzes'], fn(array $q): bool => count($q['questions']) < 3 * Content::roundSize($q)));
check('every quiz holds at least three rounds of fresh questions'.($short ? ' (short: '.implode(', ', $short).')' : ''), $short === []);
check('snapshots are deterministic', Content::snapshot($sample) === Content::snapshot($sample));

// ---- Flags ----
$r = $cli(['--publish=everyday-know-how']);
check('publish without reviewer is refused', $r['code'] === 64 && str_contains($r['out'], '--reviewed-by'));
$r = $cli(['--publish=', '--reviewed-by=Test Reviewer']);
check('publish needs an explicit list', $r['code'] === 64);
$r = $cli(['--dry-run', '--publish=everyday-know-how', '--reviewed-by=Test Reviewer']);
check('dry run cannot publish', $r['code'] === 64);
$r = $cli(['--nonsense']);
check('unknown options are refused', $r['code'] === 64);

// ---- Environment guard ----
$dev = sys_get_temp_dir().'/dyk-dev-'.bin2hex(random_bytes(4)).'.php';
$devConfig = $config; $devConfig['environment'] = 'development';
file_put_contents($dev, '<?php return '.var_export($devConfig, true).';'); chmod($dev, 0600);
register_shutdown_function(fn() => @unlink($dev));
$before = (int) Database::one($db, 'SELECT COUNT(*) AS n FROM quizzes')['n'];
$r = $cli([], $dev);
check('refuses a non-test environment without --confirm-production', $r['code'] === 3 && (int) Database::one($db, 'SELECT COUNT(*) AS n FROM quizzes')['n'] === $before);

// ---- Import: drafts, idempotent, invisible ----
$slugs = array_keys($content['quizzes']);
$in = implode(',', array_fill(0, count($slugs), '?'));
// Fresh start for this suite's rows only (they are content slugs in this disposable database).
Database::execute($db, "DELETE FROM content_reviews WHERE quiz_id IN (SELECT id FROM quizzes WHERE slug IN ($in))", $slugs);
foreach ($slugs as $slug) {
    $row = Database::one($db, 'SELECT id FROM quizzes WHERE slug=?', [$slug]);
    if ($row && !Database::one($db, 'SELECT 1 AS x FROM attempts WHERE quiz_id=? LIMIT 1', [$row['id']])) {
        Database::execute($db, 'UPDATE quizzes SET current_version_id=NULL WHERE id=?', [$row['id']]);
        Database::execute($db, 'DELETE FROM quizzes WHERE id=?', [$row['id']]);
    }
}
$cats = array_keys($content['categories']);
Database::execute($db, 'UPDATE categories SET is_active=0 WHERE slug IN ('.implode(',', array_fill(0, count($cats), '?')).')', $cats);
$r = $cli([]);
check('import succeeds against the test database', $r['code'] === 0 && str_contains($r['out'], 'Nothing was published'));
$rows = $db->prepare("SELECT status,COUNT(*) AS n FROM quizzes WHERE slug IN ($in) GROUP BY status"); $rows->execute($slugs);
$byStatus = array_column($rows->fetchAll(), 'n', 'status');
check('every imported quiz is a draft', ($byStatus['draft'] ?? 0) == $quizCount && count($byStatus) === 1);
$versions = fn(): int => (int) Database::one($db, "SELECT COUNT(*) AS n FROM quiz_versions v JOIN quizzes q ON q.id=v.quiz_id WHERE q.slug IN ($in)", $slugs)['n'];
$v1 = $versions();
$r = $cli([]);
check('second import changes nothing', $r['code'] === 0 && str_contains($r['out'], "0 created, 0 updated, $quizCount unchanged") && $versions() === $v1);
$stored = Database::one($db, 'SELECT v.snapshot,v.question_count,q.question_count AS qc,q.curriculum_tags FROM quizzes q JOIN quiz_versions v ON v.id=q.current_version_id WHERE q.slug=?', ['times-tables-and-number-ks2']);
$snap = json_decode($stored['snapshot'], true);
check('snapshot keeps every question with explanation, source and review date; a round is ten', isset($snap[0]['explanation'], $snap[0]['source_url'], $snap[0]['review_by']) && (int) $stored['qc'] === Content::DEFAULT_ROUND && (int) $stored['question_count'] === Content::DEFAULT_ROUND && count($snap) === 30);
check('school quiz carries its curriculum tag', json_decode($stored['curriculum_tags'], true) === ['uk-ks2']);
$cat = Database::one($db, "SELECT is_active FROM categories WHERE slug='maths'");
check('new categories stay hidden until something is published', (int) $cat['is_active'] === 0);
$r = request('GET', '/quizzes/everyday-know-how');
check('draft is invisible in quiz detail', $r['status'] === 404);
$r = request('GET', '/quizzes?search=Everyday');
check('draft is invisible in the catalogue list', $r['status'] === 200 && !in_array('everyday-know-how', array_column($r['body'], 'slug'), true));
$r = request('GET', '/categories');
check('hidden category is not listed', !in_array('maths', array_column($r['body'], 'slug'), true));
$guest = request('POST', '/guest-sessions', [])['body'];
$r = request('POST', '/attempts', ['quiz_slug' => 'everyday-know-how'], $guest['token']);
check('draft cannot be played', $r['status'] === 404);

// Editing a draft's file creates a new version; nothing else moves.
$edited = $sample; $edited['questions'][0]['explanation'] .= ' Edited.';
$writeDir($tmp, ['everyday-know-how.json' => $edited]);
$r = $cli(['--dir='.$tmp]);
check('changed draft gets a new version', $r['code'] === 0 && str_contains($r['out'], '1 updated') && $versions() === $v1 + 1);
$r = $cli(['--publish=everyday-know-how', '--reviewed-by=Test Reviewer']);
check('publish refuses a draft that differs from its reviewed file', $r['code'] === 2 && str_contains($r['out'], 'differs from its file'));
$r = $cli([]);
check('re-import restores the reviewed file as a new version', $r['code'] === 0 && str_contains($r['out'], '1 updated'));

// ---- Publish flips only the listed slugs ----
$r = $cli(['--publish=everyday-know-how,not-a-real-quiz', '--reviewed-by=Test Reviewer']);
check('publish is all or nothing on an unknown slug', $r['code'] === 2 && Database::one($db, "SELECT status FROM quizzes WHERE slug='everyday-know-how'")['status'] === 'draft');
$r = $cli(['--publish=everyday-know-how,times-tables-and-number-ks2', '--reviewed-by=Test Reviewer']);
$rows = $db->prepare("SELECT slug FROM quizzes WHERE slug IN ($in) AND status='published' ORDER BY slug"); $rows->execute($slugs);
check('publish flips exactly the listed drafts', $r['code'] === 0 && $rows->fetchAll(PDO::FETCH_COLUMN) === ['everyday-know-how', 'times-tables-and-number-ks2']);
$review = Database::one($db, "SELECT r.reviewed_by,r.quiz_version_id=q.current_version_id AS same FROM content_reviews r JOIN quizzes q ON q.id=r.quiz_id WHERE q.slug='everyday-know-how'");
check('publish records who reviewed which version', $review && $review['reviewed_by'] === 'Test Reviewer' && (int) $review['same'] === 1);
check('publishing activates the quiz category', (int) Database::one($db, "SELECT is_active FROM categories WHERE slug='maths'")['is_active'] === 1);
$r = $cli(['--publish=everyday-know-how', '--reviewed-by=Test Reviewer']);
check('publishing again is a no-op', $r['code'] === 0 && str_contains($r['out'], 'already published') && (int) Database::one($db, "SELECT COUNT(*) AS n FROM content_reviews r JOIN quizzes q ON q.id=r.quiz_id WHERE q.slug='everyday-know-how'")['n'] === 1);

// Published content is frozen by later imports.
$publishedVersion = Database::one($db, "SELECT current_version_id FROM quizzes WHERE slug='everyday-know-how'")['current_version_id'];
$writeDir($tmp, ['everyday-know-how.json' => $edited]);
$r = $cli(['--dir='.$tmp]);
check('import never changes a published quiz version', $r['code'] === 0 && str_contains($r['out'], '1 published kept')
    && Database::one($db, "SELECT current_version_id FROM quizzes WHERE slug='everyday-know-how'")['current_version_id'] === $publishedVersion);

// ---- Published quiz plays through the API without leaking answers ----
$r = request('GET', '/quizzes/everyday-know-how');
check('published quiz appears in the catalogue', $r['status'] === 200 && !str_contains(json_encode($r['body']), 'review_by') && !array_key_exists('snapshot', $r['body']));
$snapshot = array_column(json_decode(Database::one($db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$publishedVersion])['snapshot'], true), null, 'id');
$guest = request('POST', '/guest-sessions', [])['body'];
$r = request('POST', '/attempts', ['quiz_slug' => 'everyday-know-how', 'mode' => 'practice'], $guest['token']);
$state = $r['body'];
$round = Content::roundSize(json_decode((string) file_get_contents($root.'/content/everyday-know-how.json'), true));
check('published quiz starts a round of its round size from a bigger bank', $r['status'] === 200 && $state['total'] === $round && count($snapshot) >= 3 * $round);
$served = [];
$leaks = ['is_correct', 'accept_min', 'accept_max', 'explanation', 'source_url', 'review_by', '"correct"'];
$clean = true; $graded = true;
for ($i = 0; $i < $state['total']; $i++) {
    $json = json_encode($state['question']);
    $served[] = $state['question']['id'];
    foreach ($leaks as $leak) { $clean = $clean && !str_contains($json, $leak); }
    $q = $snapshot[$state['question']['id']];
    if ($q['type'] === 'slider') { $body = ['value' => $q['slider']['correct']]; }
    else { $body = ['option_id' => array_values(array_filter($q['options'], fn(array $o): bool => $o['is_correct']))[0]['id']]; }
    $a = request('POST', '/attempts/'.$state['attempt_id'].'/answer', $body, $guest['token']);
    $graded = $graded && $a['status'] === 200 && $a['body']['is_correct'] === true && $a['body']['explanation'] === $q['explanation'] && $a['body']['source_url'] === $q['source_url'];
    if ($i < $state['total'] - 1) { $state = request('POST', '/attempts/'.$state['attempt_id'].'/next', [], $guest['token'])['body']; }
}
check('no answer fields are sent before answering', $clean);
check('server grades imported questions and then reveals explanation and source', $graded);
$r = request('POST', '/attempts/'.$state['attempt_id'].'/finish', [], $guest['token']);
check('finished imported quiz scores full marks', $r['status'] === 200 && $r['body']['correct'] === $r['body']['total']);

// The same player's next two rounds bring only questions they have not seen yet.
for ($n = 2; $n <= 3; $n++) {
    $state = request('POST', '/attempts', ['quiz_slug' => 'everyday-know-how', 'mode' => 'practice'], $guest['token'])['body'];
    $ids = [];
    for ($i = 0; $i < $state['total']; $i++) {
        $ids[] = $state['question']['id'];
        $first = $state['question']['options'][0]['id'] ?? null;
        $body = $first ? ['option_id' => $first] : ['value' => $state['question']['slider']['min']];
        request('POST', '/attempts/'.$state['attempt_id'].'/answer', $body, $guest['token']);
        if ($i < $state['total'] - 1) { $state = request('POST', '/attempts/'.$state['attempt_id'].'/next', [], $guest['token'])['body']; }
    }
    request('POST', '/attempts/'.$state['attempt_id'].'/finish', [], $guest['token']);
    check("round $n repeats nothing this player has already seen", count($ids) === $round && !array_intersect($ids, $served) && count(array_unique($ids)) === $round);
    $served = array_merge($served, $ids);
}
$other = request('POST', '/guest-sessions', [])['body'];
$fresh = request('POST', '/attempts', ['quiz_slug' => 'everyday-know-how', 'mode' => 'practice'], $other['token'])['body'];
check('another player is not limited by the first player\'s history', $fresh['total'] === $round);

// Leave this disposable database as other suites expect: content quizzes back to draft.
Database::execute($db, "UPDATE quizzes SET status='draft' WHERE slug IN ($in)", $slugs);
fwrite(STDOUT, "$count content checks passed\n");
