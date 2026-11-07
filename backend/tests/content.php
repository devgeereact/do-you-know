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
// A source is optional (ADR-019): leaving it out is valid; a given one must still be https (above).
$noSource = $good; unset($noSource['questions'][1]['source_url']);
check('validator accepts a question with no source', $validate($noSource) === []);

// ---- The `build` question: spell, fill the gap, order the cards (all tapped, never typed) ----
$meta = ['explanation' => 'Because.', 'source_url' => 'https://example.org/d', 'review_by' => '2027-10-17'];
$spell = ['type' => 'build', 'prompt' => 'Spell the yellow fruit monkeys like.', 'build' => ['variant' => 'spell',
    'tiles' => ['b', 'a', 'n', 'a', 'n', 'a', 'x'], 'answers' => [['b', 'a', 'n', 'a', 'n', 'a']]]] + $meta;
$gap = ['type' => 'build', 'prompt' => 'Finish the sentence.', 'build' => ['variant' => 'gap', 'template' => 'The cat ___ on the ___.',
    'tiles' => ['sat', 'mat', 'dog', 'ran'], 'answers' => [['sat', 'mat']]]] + $meta;
$order = ['type' => 'build', 'prompt' => 'Put these in order.', 'build' => ['variant' => 'order',
    'tiles' => ['first', 'then', 'last'], 'answers' => [['first', 'then', 'last']]]] + $meta;
$withBuild = $good; $withBuild['questions'] = [...$good['questions'], $spell, $gap, $order];
check('validator accepts spell, gap and order questions', $validate($withBuild) === []);
$dictation = $spell; $dictation['prompt'] = 'Listen and spell the word.'; $dictation['build']['speak'] = 'banana';
$withDictation = $good; $withDictation['questions'] = [...$good['questions'], $dictation];
check('validator accepts a dictation question in a practice quiz', $validate($withDictation) === []);
$twoAnswers = $withBuild; $twoAnswers['questions'][3]['build']['answers'][] = ['b', 'a', 'n', 'a', 'n', 'x'];
$twoAnswers['questions'][3]['build']['tiles'][] = 'x';
$bq = fn(callable $m): array => $m($withBuild);
$badBuild = [
    'unknown variant' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build']['variant'] = 'drag'),
    'no tiles' => fn(array $q) => tap($q, function (&$x) { unset($x['questions'][3]['build']['tiles']); }),
    'one tile' => fn(array $q) => tap($q, function (&$x) { $x['questions'][5]['build'] = ['variant' => 'order', 'tiles' => ['only'], 'answers' => [['only']]]; }),
    'answer uses a tile that is not there' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build']['answers'] = [['b', 'a', 'n', 'a', 'n', 'z']]),
    'answer needs more of a letter than the tiles hold' => fn(array $q) => tap($q, function (&$x) { $x['questions'][3]['build']['tiles'] = ['b', 'a', 'n', 'x']; }),
    'accepted answers of different lengths' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build']['answers'][] = ['b', 'a', 'n']),
    'no answers' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build']['answers'] = []),
    'five accepted answers' => fn(array $q) => tap($q, function (&$x) { $x['questions'][3]['build']['answers'] = array_fill(0, 5, ['b', 'a', 'n', 'a', 'n', 'a']); }),
    'the same accepted answer twice' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build']['answers'][] = ['b', 'a', 'n', 'a', 'n', 'a']),
    'a spell tile of two letters' => fn(array $q) => tap($q, function (&$x) { $x['questions'][3]['build']['tiles'] = ['ba', 'n', 'a', 'n', 'a']; $x['questions'][3]['build']['answers'] = [['ba', 'n', 'a', 'n', 'a']]; }),
    'order with a decoy tile' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][5]['build']['tiles'][] = 'extra'),
    'order with repeated tiles' => fn(array $q) => tap($q, function (&$x) { $x['questions'][5]['build']['tiles'] = ['first', 'first', 'last']; $x['questions'][5]['build']['answers'] = [['first', 'first', 'last']]; }),
    'gap template with the wrong number of gaps' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][4]['build']['template'] = 'The cat ___ on the mat.'),
    'gap without a template' => fn(array $q) => tap($q, function (&$x) { unset($x['questions'][4]['build']['template']); }),
    'a template on a spell question' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build']['template'] = 'Spell ___.'),
    'spoken text on a gap question' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][4]['build']['speak'] = 'sat mat'),
    'spoken text that is not the word' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build']['speak'] = 'bandana'),
    'thirteen slots' => fn(array $q) => tap($q, function (&$x) { $w = array_fill(0, 13, 'a'); $x['questions'][3]['build']['tiles'] = $w; $x['questions'][3]['build']['answers'] = [$w]; }),
    'a tile label of 25 characters' => fn(array $q) => tap($q, function (&$x) { $x['questions'][4]['build']['tiles'][2] = str_repeat('w', 25); }),
    'twenty-one tiles' => fn(array $q) => tap($q, function (&$x) { $x['questions'][4]['build']['tiles'] = array_map(fn($i) => "w$i", range(0, 20)); $x['questions'][4]['build']['answers'] = [['w0', 'w1']]; }),
    'a control character in a tile' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][4]['build']['tiles'][2] = "do\x07g"),
    'build data on a choice question' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][0]['build'] = $x['questions'][3]['build']),
    'options on a build question' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['options'] = $x['questions'][0]['options']),
    'a build question with no build data' => fn(array $q) => tap($q, function (&$x) { unset($x['questions'][3]['build']); }),
    'an unknown key inside build' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build']['hint'] = 'x'),
];
function tap(array $q, callable $f): array { $f($q); return $q; }
foreach ($badBuild as $name => $mutate) {
    check('validator rejects a build question with '.$name, $validate($mutate($withBuild)) !== []);
}
$dict = fn(string $prompt, string $word): array => ['type' => 'build', 'prompt' => $prompt, 'build' => ['variant' => 'spell',
    'tiles' => [...str_split($word), 'x'], 'answers' => [str_split($word)], 'speak' => $word]] + $meta;
$rankedDictation = $good;
$rankedDictation['is_ranked'] = true;
$rankedDictation['questions'] = [$dict('Spell the yellow fruit.', 'banana'), $dict('Spell the green hopper.', 'frog'), $dict('Spell the cold white stuff.', 'snow')];
check('a ranked quiz needs at least three questions that are not dictation', $validate($rankedDictation) !== []);
$rankedDictation['is_ranked'] = false;
check('the same dictation quiz is fine for practice', $validate($rankedDictation) === []);
$snap = Content::snapshot($withBuild)[3];
check('a build snapshot holds keyed tiles and the accepted sequences', $snap['type'] === 'build' && count($snap['build']['tiles']) === 7
    && $snap['build']['answers'] === [['b', 'a', 'n', 'a', 'n', 'a']] && count(array_unique(array_column($snap['build']['tiles'], 'id'))) === 7);
check('build snapshots are deterministic', Content::snapshot($withBuild) === Content::snapshot($withBuild));

// ---- The `assign` question: match pairs, sort into groups (each item is tapped to its target) ----
$match = ['type' => 'assign', 'prompt' => 'Match each animal to its home.', 'assign' => ['variant' => 'match',
    'targets' => ['Sea', 'Nest', 'Burrow'], 'items' => [['label' => 'Fish', 'to' => 'Sea'], ['label' => 'Bird', 'to' => 'Nest'], ['label' => 'Rabbit', 'to' => 'Burrow']]]] + $meta;
$sort = ['type' => 'assign', 'prompt' => 'Sort the numbers.', 'assign' => ['variant' => 'sort',
    'targets' => ['Odd', 'Even'], 'items' => [['label' => '3', 'to' => 'Odd'], ['label' => '8', 'to' => 'Even'], ['label' => '5', 'to' => 'Odd'], ['label' => '12', 'to' => 'Even']]]] + $meta;
$withAssign = $good; $withAssign['questions'] = [...$good['questions'], $match, $sort];
check('validator accepts match and sort questions', $validate($withAssign) === []);
$badAssign = [
    'an unknown variant' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['assign']['variant'] = 'drag'),
    'no assign data' => fn(array $q) => tap($q, function (&$x) { unset($x['questions'][3]['assign']); }),
    'an unknown key' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['assign']['hint'] = 'x'),
    'an item sent to a target that does not exist' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['assign']['items'][0]['to'] = 'Sky'),
    'an item with no target' => fn(array $q) => tap($q, function (&$x) { unset($x['questions'][3]['assign']['items'][0]['to']); }),
    'a match target used twice' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['assign']['items'][1]['to'] = 'Sea'),
    'a match with more items than targets' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['assign']['items'][] = ['label' => 'Bee', 'to' => 'Sea']),
    'a match of one pair' => fn(array $q) => tap($q, function (&$x) { $x['questions'][3]['assign']['targets'] = ['Sea']; $x['questions'][3]['assign']['items'] = [['label' => 'Fish', 'to' => 'Sea']]; }),
    'a match of six pairs' => fn(array $q) => tap($q, function (&$x) { $n = range(1, 6); $x['questions'][3]['assign']['targets'] = array_map(fn($i) => "T$i", $n); $x['questions'][3]['assign']['items'] = array_map(fn($i) => ['label' => "I$i", 'to' => "T$i"], $n); }),
    'a sort group left empty' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][4]['assign']['targets'][] = 'Neither'),
    'a sort with four groups' => fn(array $q) => tap($q, function (&$x) { $x['questions'][4]['assign']['targets'] = ['A', 'B', 'C', 'D']; $x['questions'][4]['assign']['items'] = [['label' => '1', 'to' => 'A'], ['label' => '2', 'to' => 'B'], ['label' => '3', 'to' => 'C'], ['label' => '4', 'to' => 'D']]; }),
    'a sort of seven items' => fn(array $q) => tap($q, function (&$x) { for ($i = 0; $i < 3; $i++) { $x['questions'][4]['assign']['items'][] = ['label' => 'n'.$i, 'to' => 'Odd']; } }),
    'a sort of two items' => fn(array $q) => tap($q, function (&$x) { $x['questions'][4]['assign']['items'] = [['label' => '3', 'to' => 'Odd'], ['label' => '8', 'to' => 'Even']]; }),
    'two items with the same label' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][4]['assign']['items'][2]['label'] = '3'),
    'two targets with the same name' => fn(array $q) => tap($q, function (&$x) { $x['questions'][4]['assign']['targets'] = ['Odd', 'odd']; $x['questions'][4]['assign']['items'][1]['to'] = 'odd'; $x['questions'][4]['assign']['items'][3]['to'] = 'odd'; }),
    'an item label of 25 characters' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['assign']['items'][0]['label'] = str_repeat('w', 25)),
    'a control character in a label' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['assign']['targets'][0] = "Se\x07a"),
    'an unknown key on an item' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['assign']['items'][0]['note'] = 'x'),
    'assign data on a choice question' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][0]['assign'] = $x['questions'][3]['assign']),
    'options on an assign question' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['options'] = $x['questions'][0]['options']),
    'build data on an assign question' => fn(array $q) => tap($q, fn(&$x) => $x['questions'][3]['build'] = $x['questions'][3]['assign']),
];
foreach ($badAssign as $name => $mutate) {
    check('validator rejects an assign question with '.$name, $validate($mutate($withAssign)) !== []);
}
$aSnap = Content::snapshot($withAssign)[4];
check('an assign snapshot holds keyed items and targets and a key that points at target ids', $aSnap['type'] === 'assign'
    && count($aSnap['assign']['items']) === 4 && count($aSnap['assign']['targets']) === 2
    && count(array_unique(array_merge(array_column($aSnap['assign']['items'], 'id'), array_column($aSnap['assign']['targets'], 'id')))) === 6
    && in_array($aSnap['assign']['items'][0]['target'], array_column($aSnap['assign']['targets'], 'id'), true)
    && $aSnap['assign']['items'][0]['label'] === '3');
check('assign snapshots are deterministic', Content::snapshot($withAssign) === Content::snapshot($withAssign));
check('an assign question is allowed in a ranked quiz (it is graded on the server)', $validate($withAssign + ['is_ranked' => true]) === []);

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
    else { $body = ['option_id' => servedId($state['question'], array_values(array_filter($q['options'], fn(array $o): bool => $o['is_correct']))[0])]; }
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
