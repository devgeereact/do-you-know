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

/**
 * A parent with one child who already holds a session under $token. $flags is 'on' (every switch on), 'off' (the
 * default) or 'social' (only Public boards and Challenge a friend: the journeys that need boards and challenges).
 */
$makeChild = static function (string $name, string $token, string $flags) use ($db): void {
    $parentId = Database::uuid();
    $childId = Database::uuid();
    Database::execute($db, "INSERT INTO profiles (id,role,nickname) VALUES (?, 'player', ?)", [$parentId, 'E2EParent' . substr(md5($name), 0, 10)]);
    Database::execute($db, "INSERT INTO profiles (id,role,nickname,avatar_id) VALUES (?, 'guest', ?, 'fox')", [$childId, 'E2EChild' . substr(md5($name), 0, 10)]);
    Database::execute($db, "INSERT INTO children (profile_id,parent_profile_id,level) VALUES (?,?,'explorers')", [$childId, $parentId]);
    Database::execute($db, 'INSERT INTO guest_sessions (token_hash,profile_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 30 DAY))', [hash('sha256', $token), $childId]);
    if ($flags === 'on') {
        Database::execute($db, 'INSERT INTO parent_settings (parent_profile_id,public_boards,challenge_friend,beat_clock,slider_questions,trivia_sets,sound,easy_read) VALUES (?,1,1,1,1,1,1,1)', [$parentId]);
    } elseif ($flags === 'social') {
        Database::execute($db, 'INSERT INTO parent_settings (parent_profile_id,public_boards,challenge_friend) VALUES (?,1,1)', [$parentId]);
    }
};

if ($command === 'child') {
    // php fixture.php child on|off|social <token>: one fresh child per test, so parallel tests never share a player.
    if (!in_array($argv[2] ?? '', ['on', 'off', 'social'], true) || !preg_match('/^guest_e2e_[a-z0-9_]{8,60}$/D', $argv[3] ?? '')) {
        fwrite(STDERR, "Usage: php fixture.php child on|off guest_e2e_<token>\n");
        exit(1);
    }
    $makeChild($argv[3], $argv[3], $argv[2]);
    exit(0);
}

if ($command !== 'seed') {
    fwrite(STDERR, "Usage: php fixture.php seed|reset-limits|child\n");
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
// A second quiz of build questions (spell, gap, order). It is for 18 and over only so the daily, which deals
// from every live quiz for children, never picks it up; the build journey plays it by its own address.
$meta = ['explanation' => 'Because it is.', 'source_url' => null, 'review_by' => '2027-10-17'];
$buildFile = ['slug' => 'e2e-build-quiz', 'questions' => [
    ['type' => 'build', 'prompt' => 'Spell the pet that purrs.', 'build' => ['variant' => 'spell', 'tiles' => ['c', 'a', 't', 'x'], 'answers' => [['c', 'a', 't']]]] + $meta,
    ['type' => 'build', 'prompt' => 'Finish the sentence.', 'build' => ['variant' => 'gap', 'template' => 'The cat ___ on the ___.', 'tiles' => ['sat', 'mat', 'dog'], 'answers' => [['sat', 'mat']]]] + $meta,
    ['type' => 'build', 'prompt' => 'Put the day in order.', 'build' => ['variant' => 'order', 'tiles' => ['morning', 'noon', 'night'], 'answers' => [['morning', 'noon', 'night']]]] + $meta,
]];
$buildQuiz = Database::uuid();
$buildVersion = Database::uuid();
Database::execute(
    $db,
    "INSERT INTO quizzes (id,slug,title,intro,category_id,status,current_version_id,question_count,difficulty,age_min,is_ranked) VALUES (?,?,?,?,?,'published',?,3,'easy',18,0)",
    [$buildQuiz, 'e2e-build-quiz', 'E2E Build Quiz', 'Tap tiles to spell, fill gaps and put cards in order.', $category, $buildVersion],
);
Database::execute(
    $db,
    'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',
    [$buildVersion, $buildQuiz, json_encode(Dyk\Content::snapshot($buildFile))],
);
// A third quiz, of assign questions (match, sort). Also 18 and over, for the same reason.
$assignFile = ['slug' => 'e2e-assign-quiz', 'questions' => [
    ['type' => 'assign', 'prompt' => 'Match each animal to its home.', 'assign' => ['variant' => 'match', 'targets' => ['Sea', 'Nest', 'Burrow'], 'items' => [['label' => 'Fish', 'to' => 'Sea'], ['label' => 'Bird', 'to' => 'Nest'], ['label' => 'Rabbit', 'to' => 'Burrow']]]] + $meta,
    ['type' => 'assign', 'prompt' => 'Sort the numbers.', 'assign' => ['variant' => 'sort', 'targets' => ['Odd', 'Even'], 'items' => [['label' => '3', 'to' => 'Odd'], ['label' => '8', 'to' => 'Even'], ['label' => '5', 'to' => 'Odd'], ['label' => '12', 'to' => 'Even']]]] + $meta,
    ['type' => 'assign', 'prompt' => 'Sort the things by how hot they are.', 'assign' => ['variant' => 'sort', 'targets' => ['Hot', 'Cold', 'Warm'], 'items' => [['label' => 'Fire', 'to' => 'Hot'], ['label' => 'Ice', 'to' => 'Cold'], ['label' => 'Tea', 'to' => 'Warm']]]] + $meta,
]];
$assignQuiz = Database::uuid();
$assignVersion = Database::uuid();
Database::execute(
    $db,
    "INSERT INTO quizzes (id,slug,title,intro,category_id,status,current_version_id,question_count,difficulty,age_min,is_ranked) VALUES (?,?,?,?,?,'published',?,3,'easy',18,0)",
    [$assignQuiz, 'e2e-assign-quiz', 'E2E Assign Quiz', 'Tap things into the right place.', $category, $assignVersion],
);
Database::execute(
    $db,
    'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',
    [$assignVersion, $assignQuiz, json_encode(Dyk\Content::snapshot($assignFile))],
);
// A fourth quiz whose questions carry a short reading passage (a long prompt). 18 and over, for the same reason.
$passage = 'Maya\'s grandfather kept bees at the bottom of his garden. Every summer she helped him collect the honey. She wore a net hat so the bees could not sting her face.';
$passageFile = ['slug' => 'e2e-passage-quiz', 'questions' => [
    ['type' => 'choice', 'prompt' => $passage.' Why did Maya wear a net hat?', 'options' => [['label' => 'To stop the bees stinging her face', 'correct' => true], ['label' => 'To keep her hair tidy', 'correct' => false], ['label' => 'Because it was raining', 'correct' => false]]] + $meta,
    ['type' => 'choice', 'prompt' => $passage.' Who helped Maya collect the honey?', 'options' => [['label' => 'Her grandfather', 'correct' => false], ['label' => 'Nobody', 'correct' => false], ['label' => 'She helped her grandfather', 'correct' => true]]] + $meta,
    ['type' => 'choice', 'prompt' => $passage.' Where were the bees kept?', 'options' => [['label' => 'At the bottom of the garden', 'correct' => true], ['label' => 'In the kitchen', 'correct' => false], ['label' => 'At school', 'correct' => false]]] + $meta,
]];
$passageQuiz = Database::uuid();
$passageVersion = Database::uuid();
Database::execute(
    $db,
    "INSERT INTO quizzes (id,slug,title,intro,category_id,status,current_version_id,question_count,difficulty,age_min,is_ranked) VALUES (?,?,?,?,?,'published',?,3,'easy',18,0)",
    [$passageQuiz, 'e2e-passage-quiz', 'E2E Passage Quiz', 'Read a short passage, then answer.', $category, $passageVersion],
);
Database::execute(
    $db,
    'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',
    [$passageVersion, $passageQuiz, json_encode(Dyk\Content::snapshot($passageFile))],
);
// A literacy quiz for Explorers (ages 6 to 8) so a child's learning session has questions to deal. It sits in the
// school-english category, which is what makes it a literacy quiz.
$learnCategory = Database::one($db, "SELECT id FROM categories WHERE slug='school-english'")['id'] ?? null;
if ($learnCategory === null) {
    $learnCategory = Database::uuid();
    Database::execute($db, 'INSERT INTO categories (id,slug,name,sort_order) VALUES (?,?,?,0)', [$learnCategory, 'school-english', 'English']);
}
$learnQuestions = [];
for ($i = 1; $i <= 12; $i++) {
    $learnQuestions[] = ['type' => 'choice', 'prompt' => "Which word is number $i in the learning quiz?", 'options' => [['label' => "Word $i", 'correct' => true], ['label' => 'Other', 'correct' => false], ['label' => 'Another', 'correct' => false]]] + $meta;
}
$learnQuiz = Database::uuid();
$learnVersion = Database::uuid();
Database::execute(
    $db,
    "INSERT INTO quizzes (id,slug,title,intro,category_id,status,current_version_id,question_count,difficulty,age_min,age_max,is_ranked) VALUES (?,?,?,?,?,'published',?,12,'easy',6,8,1)",
    [$learnQuiz, 'e2e-learn-quiz', 'E2E Learn Quiz', 'Twelve questions for the learning session.', $learnCategory, $learnVersion],
);
Database::execute(
    $db,
    'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,12)',
    [$learnVersion, $learnQuiz, json_encode(Dyk\Content::snapshot(['slug' => 'e2e-learn-quiz', 'questions' => $learnQuestions]))],
);

// Two children who already hold a session (known tokens, see tests/e2e/parent.spec.ts): one whose parent has
// every switch off (the default) and one whose parent has every switch on.
foreach (['off', 'on'] as $name) {
    $makeChild($name, 'guest_e2e_child_' . $name, $name);
}
echo "seeded e2e-quick-quiz, e2e-build-quiz, e2e-assign-quiz, e2e-passage-quiz, two children and the daily challenge for $today\n";
