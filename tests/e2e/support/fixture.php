<?php
declare(strict_types=1);

/**
 * Disposable-database helper for the Playwright suite (tests/e2e).
 *
 *   php fixture.php seed          one category, one published quiz, today's live daily challenge
 *   php fixture.php reset-limits  clear the throttling table so a long run never trips 429s
 *
 * Refuses to run unless the config says environment=test and the database name ends _test,
 * exactly like backend/tests/http.php. Reads the config path from DYK_CONFIG.
 */

$backend = dirname(__DIR__, 3) . '/backend';
require $backend . '/vendor/autoload.php';

use Dyk\Competition;
use Dyk\Config;
use Dyk\Database;

$config = Config::load($backend);
if ($config['environment'] !== 'test' || !str_ends_with($config['database']['name'], '_test')) {
    fwrite(STDERR, "E2E fixtures require environment=test and a database ending _test.\n");
    exit(1);
}
$db = Database::connect($config);
$command = $argv[1] ?? '';

if ($command === 'reset-limits') {
    $db->exec('DELETE FROM rate_limits');
    exit(0);
}

if ($command !== 'seed') {
    fwrite(STDERR, "Usage: php fixture.php seed|reset-limits\n");
    exit(1);
}

$category = Database::uuid();
$quiz = Database::uuid();
$version = Database::uuid();

$snapshot = [
    [
        'id' => Database::uuid(), 'type' => 'choice', 'prompt' => 'Which city is the capital of France?',
        'explanation' => 'Paris has been the capital of France for centuries.',
        'image_url' => null, 'source_url' => 'https://example.org/e2e/france', 'slider' => null,
        'options' => [
            ['id' => Database::uuid(), 'label' => 'Paris', 'is_correct' => true],
            ['id' => Database::uuid(), 'label' => 'Lyon', 'is_correct' => false],
            ['id' => Database::uuid(), 'label' => 'Nice', 'is_correct' => false],
        ],
    ],
    [
        'id' => Database::uuid(), 'type' => 'boolean', 'prompt' => 'The sun is a star.',
        'explanation' => 'The sun is the star at the centre of our solar system.',
        'image_url' => null, 'source_url' => null, 'slider' => null,
        'options' => [
            ['id' => Database::uuid(), 'label' => 'True', 'is_correct' => true],
            ['id' => Database::uuid(), 'label' => 'False', 'is_correct' => false],
        ],
    ],
    [
        'id' => Database::uuid(), 'type' => 'slider', 'prompt' => 'How many sides does a pentagon have?',
        'explanation' => 'Penta means five.',
        'image_url' => null, 'source_url' => null, 'options' => [],
        'slider' => ['min' => 0, 'max' => 10, 'step' => 1, 'unit' => null, 'correct' => 5, 'accept_min' => 5, 'accept_max' => 5],
    ],
];

Database::execute($db, 'INSERT INTO categories (id,slug,name,sort_order) VALUES (?,?,?,0)', [$category, 'e2e-general', 'E2E General']);
Database::execute(
    $db,
    "INSERT INTO quizzes (id,slug,title,intro,category_id,status,current_version_id,question_count,difficulty) VALUES (?,?,?,?,?,'published',?,3,'easy')",
    [$quiz, 'e2e-quick-quiz', 'E2E Quick Quiz', 'Three original questions used only by the browser tests.', $category, $version],
);
Database::execute(
    $db,
    'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',
    [$version, $quiz, json_encode($snapshot)],
);

// Today's challenge on the same London calendar the API uses.
$today = Competition::londonDate();
Database::execute($db, 'DELETE FROM daily_challenges WHERE challenge_date=?', [$today]);
Database::execute(
    $db,
    "INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')",
    [Database::uuid(), $today, $quiz, $version],
);
echo "seeded e2e-quick-quiz and the daily challenge for $today\n";
