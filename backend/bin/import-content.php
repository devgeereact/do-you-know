<?php
declare(strict_types=1);
// CLI only. Validates backend/content, imports it as DRAFT quizzes, and publishes only an
// explicit, human-reviewed list. See backend/README.md (Content review and publishing).
//
//   php bin/import-content.php --dry-run                 validate files, no database
//   php bin/import-content.php                           import drafts (test database)
//   php bin/import-content.php --publish=a,b --reviewed-by="Name"
//   add --confirm-production when the configured environment is not test
//   --dir=<path> reads another content folder (tests use this)
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/vendor/autoload.php';

$opts = getopt('', ['dry-run', 'publish:', 'reviewed-by:', 'confirm-production', 'dir:', 'help']);
$known = ['--dry-run', '--publish', '--reviewed-by', '--confirm-production', '--dir', '--help'];
foreach (array_slice($argv, 1) as $arg) {
    if (!in_array(explode('=', $arg, 2)[0], $known, true)) { fwrite(STDERR, "Unknown option: $arg\n"); exit(64); }
}
if (isset($opts['help'])) { fwrite(STDOUT, "Usage: import-content.php [--dry-run] [--publish=slug,... --reviewed-by=\"Name\"] [--confirm-production] [--dir=path]\n"); exit(0); }
foreach (['publish', 'reviewed-by', 'dir'] as $single) {
    if (is_array($opts[$single] ?? null)) { fwrite(STDERR, "--$single may be given once.\n"); exit(64); }
}

$today = (new DateTimeImmutable('now', new DateTimeZone('Europe/London')))->format('Y-m-d');
$dir = $opts['dir'] ?? dirname(__DIR__).'/content';
$content = Dyk\Content::load($dir, $today);
foreach ($content['warnings'] as $w) { fwrite(STDOUT, "WARN $w\n"); }
if ($content['errors']) {
    foreach ($content['errors'] as $e) { fwrite(STDERR, "ERROR $e\n"); }
    fwrite(STDERR, count($content['errors'])." problem(s); nothing was imported.\n");
    exit(2);
}
$types = ['choice' => 0, 'boolean' => 0, 'slider' => 0];
$byKind = ['general' => 0, 'school' => 0];
$questions = 0;
foreach ($content['quizzes'] as $quiz) {
    $byKind[$content['categories'][$quiz['category']]['kind']]++;
    foreach ($quiz['questions'] as $q) { $types[$q['type']]++; $questions++; }
}
fwrite(STDOUT, sprintf("Valid: %d categories, %d curriculum tags, %d quizzes (%d general, %d school), %d questions (%d choice, %d boolean, %d slider).\n",
    count($content['categories']), count($content['tags']), count($content['quizzes']), $byKind['general'], $byKind['school'],
    $questions, $types['choice'], $types['boolean'], $types['slider']));
if (isset($opts['dry-run'])) {
    if (isset($opts['publish'])) { fwrite(STDERR, "--dry-run cannot be combined with --publish.\n"); exit(64); }
    fwrite(STDOUT, "Dry run: no database was touched.\n");
    exit(0);
}

$publish = null;
if (array_key_exists('publish', $opts)) {
    $publish = array_values(array_filter(array_map('trim', explode(',', (string) $opts['publish'])), 'strlen'));
    if (!$publish) { fwrite(STDERR, "--publish needs an explicit comma-separated list of slugs.\n"); exit(64); }
    if (!is_string($opts['reviewed-by'] ?? null) || trim($opts['reviewed-by']) === '') {
        fwrite(STDERR, "--publish needs --reviewed-by=\"<the person who reviewed these quizzes>\".\n"); exit(64);
    }
} elseif (isset($opts['reviewed-by'])) {
    fwrite(STDERR, "--reviewed-by is only used with --publish.\n"); exit(64);
}

try {
    $config = Dyk\Config::load(dirname(__DIR__));
} catch (Throwable $error) {
    fwrite(STDERR, "Content import failed; check private configuration.\n"); exit(1);
}
if ($config['environment'] !== 'test' && !isset($opts['confirm-production'])) {
    fwrite(STDERR, "Refusing: environment is {$config['environment']}, not test. Back up the database, then rerun with --confirm-production.\n");
    exit(3);
}
try {
    $db = Dyk\Database::connect($config);
    $importer = new Dyk\ContentImporter($db);
    if ($publish !== null) {
        foreach ($importer->publish($content, $publish, $opts['reviewed-by'], $today) as $line) { fwrite(STDOUT, "$line\n"); }
        exit(0);
    }
    $report = $importer->import($content);
    foreach ($report['lines'] as $line) { fwrite(STDOUT, "$line\n"); }
    $c = $report['counts'];
    fwrite(STDOUT, sprintf("Imported as drafts: %d created, %d updated, %d unchanged, %d published kept as they are; %d categories and %d tags added. Nothing was published.\n",
        $c['created'], $c['draft_updated'], $c['unchanged'], $c['published_kept'], $c['categories_added'], $c['tags_added']));
} catch (InvalidArgumentException $error) {
    fwrite(STDERR, 'Refused: '.$error->getMessage().". Nothing was published.\n"); exit(2);
} catch (Throwable $error) {
    fwrite(STDERR, "Content import failed; check private configuration and migration state.\n"); exit(1);
}
