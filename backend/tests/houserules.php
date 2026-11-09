<?php
declare(strict_types=1);
// House rules: the non-blocking checks the Studio shows beside a quiz (docs/CONTENT-PIPELINE-DESIGN.md, slice 1).
// Pure functions, no database.
require dirname(__DIR__).'/vendor/autoload.php';
use Dyk\HouseRules;

$count = 0;
function check(string $name, bool $ok): void {
    global $count; $count++;
    if (!$ok) { fwrite(STDERR, 'FAIL '.$name.PHP_EOL); exit(1); }
    fwrite(STDOUT, 'PASS '.$name.PHP_EOL);
}
function q(string $prompt, string $why = 'A reason.', array $labels = ['One', 'Two'], array $extra = []): array {
    $options = [];
    foreach ($labels as $i => $l) { $options[] = ['label' => $l, 'correct' => $i === 0]; }
    return $extra + ['type' => 'choice', 'prompt' => $prompt, 'explanation' => $why, 'options' => $options, 'review_by' => '2027-01-01'];
}
function quiz(array $questions, array $over = []): array {
    return $over + ['title' => 'A quiz', 'category' => 'maths', 'difficulty' => 'medium', 'age_min' => 9, 'age_max' => 11, 'questions' => $questions];
}
function codes(array $w): array { return array_map(static fn(array $x): string => $x['code'].'@'.($x['index'] ?? 'quiz'), $w); }

// a clean quiz says nothing
check('a clean quiz has no warnings', HouseRules::check(quiz([q('What is half of 18?', 'Nine.', ['9', '8'])])) === []);

// UK spelling
$w = HouseRules::check(quiz([q('What color is the sky?'), q('Name a colour.')]));
check('US spelling is flagged on the question that has it', codes($w) === ['us_spelling@0']);
check('the message names the UK word', str_contains($w[0]['message'], 'colour'));
check('every warning is level warning with a field', $w[0]['level'] === 'warning' && $w[0]['field'] === 'prompt');
check('whole words only: Colorado is not "color"', HouseRules::check(quiz([q('Which river carved the Grand Canyon in Colorado?')])) === []);
check('US spelling in the reason is found too', codes(HouseRules::check(quiz([q('Fine?', 'It is the favorite.')]))) === ['us_spelling@0']);
check('US spelling in an answer label is found', codes(HouseRules::check(quiz([q('Fine?', 'Ok.', ['gray', 'blue'])]))) === ['us_spelling@0']);
check('"math" is flagged but "maths" is not', codes(HouseRules::check(quiz([q('I like math.'), q('I like maths.')]))) === ['us_spelling@0']);

// tile questions are read too
$assign = ['type' => 'assign', 'prompt' => 'Match.', 'explanation' => 'Ok.', 'review_by' => '2027-01-01', 'assign' => ['items' => ['color', 'size'], 'targets' => ['a', 'b']]];
check('words inside tile questions are read', codes(HouseRules::check(quiz([$assign]))) === ['us_spelling@0']);

// Christian only, in the religious subject only
$faith = ['category' => 'bible-faith'];
check('another faith is flagged in the religious subject', codes(HouseRules::check(quiz([q('Which holy book do Muslims read?')], $faith))) === ['other_faith@0']);
check('the same words are fine in another subject', HouseRules::check(quiz([q('Which holy book do Muslims read?')], ['category' => 'history'])) === []);
check('sacraments and saints are flagged in the religious subject', codes(HouseRules::check(quiz([q('Who was baptised in the Jordan?')], $faith))) === ['sacrament@0']);
check('the Last Supper is flagged too', codes(HouseRules::check(quiz([q('At the Last Supper, what was shared?')], $faith))) === ['sacrament@0']);
check('the same words are fine in history', HouseRules::check(quiz([q('Who was baptised in the Jordan?')], ['category' => 'history'])) === []);
check('plain Bible questions are clean', HouseRules::check(quiz([q('Who built the ark?', 'Noah.', ['Noah', 'Moses'])], $faith)) === []);

// ages
check('no minimum age is flagged once, for the quiz', codes(HouseRules::check(quiz([q('Fine?')], ['age_min' => null, 'age_max' => null]))) === ['no_min_age@quiz']);
$span = HouseRules::check(quiz([q('Fine?')], ['age_min' => 11, 'age_max' => 14]));
check('an age band across two levels is flagged', codes($span) === ['age_spans_levels@quiz']);
check('the message names both levels', str_contains($span[0]['message'], 'Adventurers') && str_contains($span[0]['message'], 'Challengers'));
check('a band inside one level is fine', HouseRules::check(quiz([q('Fine?')], ['age_min' => 12, 'age_max' => 14])) === []);
check('an adult set is fine', HouseRules::check(quiz([q('Fine?')], ['age_min' => 18, 'age_max' => null])) === []);

// order and shape
$mixed = HouseRules::check(quiz([q('A color?'), q('Fine?'), q('A favorite?')], ['age_min' => null, 'age_max' => null]));
check('quiz-level warnings come first, then questions in order', codes($mixed) === ['no_min_age@quiz', 'us_spelling@0', 'us_spelling@2']);
check('a question with two US words is still one warning', count(HouseRules::check(quiz([q('Your favorite color?')]))) === 1);

// the same cases the TypeScript rules are tested against (tests/unit/lib/houseRules.test.ts)
$golden = json_decode((string) file_get_contents(__DIR__.'/fixtures/house-rules-cases.json'), true);
foreach ($golden as $case) {
    check('shared case: '.$case['name'], codes(HouseRules::check($case['quiz'])) === $case['expect']);
}

// the shared word list is the single source
$rules = json_decode((string) file_get_contents(dirname(__DIR__).'/content/house-rules.json'), true);
check('the word list file has the three lists', isset($rules['us_spelling'], $rules['other_faith'], $rules['sacrament']));

fwrite(STDOUT, $count.' house-rule checks passed'.PHP_EOL);
