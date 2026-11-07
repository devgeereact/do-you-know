<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Reads and validates the reviewed content files in backend/content and turns each quiz
 * into the snapshot shape Game reads. No database access here: --dry-run uses this alone.
 */
final class Content
{
    public const TYPES = ['choice', 'boolean', 'slider', 'build', 'assign'];
    public const DIFFICULTIES = ['easy', 'medium', 'hard'];
    private const SLUG = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/D';
    /** Quiz slugs that clash with API routes such as GET /quizzes/trending. */
    public const RESERVED_SLUGS = ['trending'];
    private const QUIZ_KEYS = ['slug', 'title', 'intro', 'category', 'difficulty', 'age_min', 'age_max',
        'curriculum_tags', 'time_limit_seconds', 'shuffle_options', 'is_ranked', 'round_size', 'questions'];
    /** Questions in one round when a quiz file does not set round_size. */
    public const DEFAULT_ROUND = 10;
    private const QUESTION_KEYS = ['type', 'prompt', 'options', 'answer', 'slider', 'build', 'assign', 'explanation', 'source_url', 'review_by', 'scene'];
    public const BUILD_VARIANTS = ['spell', 'gap', 'order'];
    private const BUILD_KEYS = ['variant', 'tiles', 'answers', 'speak', 'template'];
    public const ASSIGN_VARIANTS = ['match', 'sort'];
    private const ASSIGN_KEYS = ['variant', 'targets', 'items'];
    /** Cosmetic backdrops a question (or a category) may name. Keep identical to the frontend list. */
    public const SCENES = ['ocean', 'space', 'jungle', 'desert', 'arctic', 'body', 'past', 'city'];
    private const SLIDER_KEYS = ['min', 'max', 'step', 'unit', 'correct', 'accept_min', 'accept_max'];

    /**
     * Loads categories.json and every other *.json file in the directory.
     * Returns categories, tags, quizzes keyed by slug, errors and warnings.
     */
    public static function load(string $dir, ?string $today = null): array
    {
        $today ??= (new \DateTimeImmutable('now', new \DateTimeZone('Europe/London')))->format('Y-m-d');
        $out = ['categories' => [], 'tags' => [], 'quizzes' => [], 'errors' => [], 'warnings' => []];
        if (!is_dir($dir)) {
            $out['errors'][] = 'content directory not found';
            return $out;
        }
        $catalogue = self::readJson($dir . '/categories.json', $out['errors']);
        if ($catalogue !== null) {
            $out['errors'] = array_merge($out['errors'], self::validateCatalogue($catalogue));
            $out['categories'] = array_column(is_array($catalogue['categories'] ?? null) ? $catalogue['categories'] : [], null, 'slug');
            $out['tags'] = array_column(is_array($catalogue['curriculum_tags'] ?? null) ? $catalogue['curriculum_tags'] : [], null, 'code');
        }
        $files = glob($dir . '/*.json') ?: [];
        sort($files);
        $seen = [];
        foreach ($files as $file) {
            $name = basename($file);
            if ($name === 'categories.json') {
                continue;
            }
            $quiz = self::readJson($file, $out['errors']);
            if ($quiz === null) {
                continue;
            }
            $errors = self::validateQuiz($quiz, array_keys($out['categories']), array_keys($out['tags']), $name);
            $slug = is_string($quiz['slug'] ?? null) ? $quiz['slug'] : null;
            if ($slug !== null && $name !== $slug . '.json') {
                $errors[] = "$name: file name must be <slug>.json";
            }
            if ($slug !== null && isset($out['quizzes'][$slug])) {
                $errors[] = "$name: duplicate quiz slug $slug";
            }
            if (!$errors) {
                // A prompt may appear in only one quiz, so a player never meets the same question twice.
                foreach ($quiz['questions'] as $i => $q) {
                    $key = self::promptKey($q['prompt']);
                    if (isset($seen[$key])) {
                        $errors[] = "$name: question " . ($i + 1) . " repeats a prompt from {$seen[$key]}";
                    }
                    $seen[$key] ??= $name;
                }
            }
            if ($errors) {
                $out['errors'] = array_merge($out['errors'], $errors);
                continue;
            }
            foreach ($quiz['questions'] as $i => $q) {
                if ($q['review_by'] < $today) {
                    $out['warnings'][] = "$name: question " . ($i + 1) . " passed its review-by date {$q['review_by']}";
                }
            }
            $out['quizzes'][$slug] = $quiz;
        }
        if (!$out['quizzes'] && !$out['errors']) {
            $out['errors'][] = 'no quiz files found';
        }
        return $out;
    }

    private static function readJson(string $file, array &$errors): ?array
    {
        $name = basename($file);
        if (!is_file($file)) {
            $errors[] = "$name: missing";
            return null;
        }
        try {
            $data = json_decode((string) file_get_contents($file), true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            $errors[] = "$name: not valid JSON";
            return null;
        }
        if (!is_array($data) || array_is_list($data)) {
            $errors[] = "$name: must be a JSON object";
            return null;
        }
        return $data;
    }

    public static function validateCatalogue(array $data): array
    {
        $errors = [];
        $unknown = array_diff(array_keys($data), ['categories', 'curriculum_tags']);
        if ($unknown) {
            $errors[] = 'categories.json: unknown keys ' . implode(', ', $unknown);
        }
        $categories = $data['categories'] ?? null;
        if (!is_array($categories) || !array_is_list($categories) || !$categories) {
            return array_merge($errors, ['categories.json: categories must be a non-empty list']);
        }
        $seen = [];
        foreach ($categories as $i => $c) {
            $at = 'categories.json: category ' . ($i + 1);
            if (!is_array($c)) {
                $errors[] = "$at: must be an object";
                continue;
            }
            if ($extra = array_diff(array_keys($c), ['slug', 'name', 'description', 'kind', 'sort_order'])) {
                $errors[] = "$at: unknown keys " . implode(', ', $extra);
            }
            if (!self::slug($c['slug'] ?? null)) {
                $errors[] = "$at: slug must be kebab-case ASCII";
            } elseif (isset($seen[$c['slug']])) {
                $errors[] = "$at: duplicate slug {$c['slug']}";
            } else {
                $seen[$c['slug']] = true;
            }
            if (!self::text($c['name'] ?? null, 160)) {
                $errors[] = "$at: name required (up to 160 characters)";
            }
            if (!self::text($c['description'] ?? null, 300)) {
                $errors[] = "$at: description required (up to 300 characters)";
            }
            if (!in_array($c['kind'] ?? null, ['general', 'school'], true)) {
                $errors[] = "$at: kind must be general or school";
            }
            if (!is_int($c['sort_order'] ?? null)) {
                $errors[] = "$at: sort_order must be an integer";
            }
        }
        $tags = $data['curriculum_tags'] ?? [];
        if (!is_array($tags) || !array_is_list($tags)) {
            return array_merge($errors, ['categories.json: curriculum_tags must be a list']);
        }
        $codes = [];
        foreach ($tags as $i => $t) {
            $at = 'categories.json: curriculum tag ' . ($i + 1);
            if (!is_array($t)) {
                $errors[] = "$at: must be an object";
                continue;
            }
            if ($extra = array_diff(array_keys($t), ['code', 'label', 'system', 'age_min', 'age_max', 'sort_order'])) {
                $errors[] = "$at: unknown keys " . implode(', ', $extra);
            }
            if (!self::slug($t['code'] ?? null)) {
                $errors[] = "$at: code must be kebab-case, for example uk-ks2";
            } elseif (isset($codes[$t['code']])) {
                $errors[] = "$at: duplicate code {$t['code']}";
            } else {
                $codes[$t['code']] = true;
            }
            if (!self::text($t['label'] ?? null, 160) || !self::text($t['system'] ?? null, 100)) {
                $errors[] = "$at: label and system required";
            }
            if (!self::ages($t['age_min'] ?? null, $t['age_max'] ?? null) || !is_int($t['sort_order'] ?? null)) {
                $errors[] = "$at: age range or sort_order invalid";
            }
        }
        return $errors;
    }

    /** Every problem with one quiz file, as readable lines. Empty means valid. */
    public static function validateQuiz(array $quiz, array $categorySlugs, array $tagCodes, string $label = 'quiz'): array
    {
        $e = [];
        if ($extra = array_diff(array_keys($quiz), self::QUIZ_KEYS)) {
            $e[] = "$label: unknown keys " . implode(', ', $extra);
        }
        if (!self::slug($quiz['slug'] ?? null) || strlen($quiz['slug']) > 100) {
            $e[] = "$label: slug must be kebab-case ASCII up to 100 characters";
        } elseif (in_array($quiz['slug'], self::RESERVED_SLUGS, true)) {
            $e[] = "$label: slug {$quiz['slug']} is reserved by an API route";
        }
        if (!self::text($quiz['title'] ?? null, 255)) {
            $e[] = "$label: title required";
        }
        if (!self::text($quiz['intro'] ?? null, 400)) {
            $e[] = "$label: intro required (up to 400 characters)";
        }
        if (!in_array($quiz['category'] ?? null, $categorySlugs, true)) {
            $e[] = "$label: category must be a slug from categories.json";
        }
        if (!in_array($quiz['difficulty'] ?? null, self::DIFFICULTIES, true)) {
            $e[] = "$label: difficulty must be easy, medium or hard";
        }
        if (!self::ages($quiz['age_min'] ?? null, $quiz['age_max'] ?? null)) {
            $e[] = "$label: age_min and age_max must be null or 0-120 with min <= max";
        }
        $tags = $quiz['curriculum_tags'] ?? [];
        if (!is_array($tags) || !array_is_list($tags) || count($tags) !== count(array_unique($tags, SORT_REGULAR))) {
            $e[] = "$label: curriculum_tags must be a list of distinct codes";
        } else {
            foreach ($tags as $tag) {
                if (!in_array($tag, $tagCodes, true)) {
                    $e[] = "$label: unknown curriculum tag " . (is_string($tag) ? $tag : json_encode($tag));
                }
            }
        }
        $timer = $quiz['time_limit_seconds'] ?? null;
        if ($timer !== null && (!is_int($timer) || $timer < 5 || $timer > 120)) {
            $e[] = "$label: time_limit_seconds must be null or 5-120";
        }
        foreach (['shuffle_options', 'is_ranked'] as $flag) {
            if (array_key_exists($flag, $quiz) && !is_bool($quiz[$flag])) {
                $e[] = "$label: $flag must be true or false";
            }
        }
        $questions = $quiz['questions'] ?? null;
        if (!is_array($questions) || !array_is_list($questions) || count($questions) < 3 || count($questions) > 50) {
            return array_merge($e, ["$label: questions must be a list of 3-50 questions"]);
        }
        $round = $quiz['round_size'] ?? null;
        if ($round !== null && (!is_int($round) || $round < 3 || $round > count($questions))) {
            $e[] = "$label: round_size must be null or 3 up to the number of questions";
        }
        if (($quiz['is_ranked'] ?? true) === true) {
            $spoken = count(array_filter($questions, static fn($q): bool => is_array($q) && isset($q['build']['speak'])));
            if (count($questions) - $spoken < 3) {
                $e[] = "$label: a ranked quiz needs at least 3 questions that are not dictation";
            }
        }
        $prompts = [];
        foreach ($questions as $i => $q) {
            $at = "$label: question " . ($i + 1);
            if (!is_array($q)) {
                $e[] = "$at: must be an object";
                continue;
            }
            $e = array_merge($e, self::validateQuestion($q, $at));
            if (is_string($q['prompt'] ?? null)) {
                $key = self::promptKey($q['prompt']);
                if (isset($prompts[$key])) {
                    $e[] = "$at: duplicate prompt";
                }
                $prompts[$key] = true;
            }
        }
        return $e;
    }

    public static function validateQuestion(array $q, string $at): array
    {
        $e = [];
        if ($extra = array_diff(array_keys($q), self::QUESTION_KEYS)) {
            $e[] = "$at: unknown keys " . implode(', ', $extra);
        }
        if (array_key_exists('scene', $q) && !in_array($q['scene'], self::SCENES, true)) {
            $e[] = "$at: scene must be one of " . implode(', ', self::SCENES);
        }
        $type = $q['type'] ?? null;
        if (!in_array($type, self::TYPES, true)) {
            return array_merge($e, ["$at: type must be choice, boolean, slider, build or assign"]);
        }
        if (!self::text($q['prompt'] ?? null, 300)) {
            $e[] = "$at: prompt required (up to 300 characters)";
        }
        if (!self::text($q['explanation'] ?? null, 400)) {
            $e[] = "$at: explanation required (up to 400 characters)";
        }
        // Optional (owner decision, 1 November 2026, ADR-019); a source that is given must be https.
        $url = $q['source_url'] ?? null;
        if ($url !== null && $url !== '' && (!is_string($url) || strlen($url) > 500
            || !preg_match('~^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s"<>]*)?$~iD', $url))) {
            $e[] = "$at: source_url must be an https URL when given";
        }
        $date = $q['review_by'] ?? null;
        $parsed = is_string($date) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $date) : false;
        if (!$parsed || $parsed->format('Y-m-d') !== $date) {
            $e[] = "$at: review_by must be a date like 2027-10-17";
        }
        if ($type === 'choice') {
            if (isset($q['answer']) || isset($q['slider']) || isset($q['build']) || isset($q['assign'])) {
                $e[] = "$at: choice questions use options only";
            }
            $options = $q['options'] ?? null;
            if (!is_array($options) || !array_is_list($options) || count($options) < 2 || count($options) > 6) {
                return array_merge($e, ["$at: choice needs 2-6 options"]);
            }
            $correct = 0;
            $labels = [];
            foreach ($options as $j => $o) {
                if (!is_array($o) || array_diff(array_keys($o), ['label', 'correct']) || !self::text($o['label'] ?? null, 120) || !is_bool($o['correct'] ?? null)) {
                    $e[] = "$at: option " . ($j + 1) . ' needs a label (up to 120 characters) and correct true/false';
                    continue;
                }
                $correct += $o['correct'] ? 1 : 0;
                $labels[] = strtolower(trim($o['label']));
            }
            if ($correct !== 1) {
                $e[] = "$at: exactly one option must be correct";
            }
            if (count($labels) !== count(array_unique($labels))) {
                $e[] = "$at: option labels must be distinct";
            }
        } elseif ($type === 'boolean') {
            if (isset($q['options']) || isset($q['slider']) || isset($q['build']) || isset($q['assign'])) {
                $e[] = "$at: boolean questions use answer only";
            }
            if (!is_bool($q['answer'] ?? null)) {
                $e[] = "$at: boolean needs answer true or false";
            }
        } elseif ($type === 'slider') {
            if (isset($q['options']) || isset($q['answer']) || isset($q['build']) || isset($q['assign'])) {
                $e[] = "$at: slider questions use slider only";
            }
            $e = array_merge($e, self::validateSlider($q['slider'] ?? null, $at));
        } elseif ($type === 'build') {
            if (isset($q['options']) || isset($q['answer']) || isset($q['slider']) || isset($q['assign'])) {
                $e[] = "$at: build questions use build only";
            }
            $e = array_merge($e, self::validateBuild($q['build'] ?? null, $at));
        } else {
            if (isset($q['options']) || isset($q['answer']) || isset($q['slider']) || isset($q['build'])) {
                $e[] = "$at: assign questions use assign only";
            }
            $e = array_merge($e, self::validateAssign($q['assign'] ?? null, $at));
        }
        return $e;
    }

    /**
     * The `assign` question: a child taps each item, then the target it belongs to. `match` pairs each item
     * with its own target; `sort` puts items into 2 or 3 groups. The key (which item belongs to which
     * target) is stored here and never sent before answering. Labels are compared without case.
     */
    private static function validateAssign(mixed $a, string $at): array
    {
        if (!is_array($a) || array_is_list($a)) {
            return ["$at: assign needs variant, targets and items"];
        }
        $e = [];
        if ($extra = array_diff(array_keys($a), self::ASSIGN_KEYS)) {
            $e[] = "$at: assign has unknown keys " . implode(', ', $extra);
        }
        $variant = $a['variant'] ?? null;
        if (!in_array($variant, self::ASSIGN_VARIANTS, true)) {
            return array_merge($e, ["$at: assign variant must be match or sort"]);
        }
        $match = $variant === 'match';
        $targets = $a['targets'] ?? null;
        $items = $a['items'] ?? null;
        [$tMin, $tMax, $iMin, $iMax] = $match ? [2, 5, 2, 5] : [2, 3, 3, 6];
        if (!is_array($targets) || !array_is_list($targets) || count($targets) < $tMin || count($targets) > $tMax) {
            return array_merge($e, ["$at: assign: a $variant question needs $tMin to $tMax " . ($match ? 'partners' : 'groups')]);
        }
        if (!is_array($items) || !array_is_list($items) || count($items) < $iMin || count($items) > $iMax) {
            return array_merge($e, ["$at: assign: a $variant question needs $iMin to $iMax items"]);
        }
        $norm = static fn(string $t): string => mb_strtolower(trim($t));
        $names = [];
        foreach ($targets as $t) {
            if (!self::tileLabel($t)) {
                return array_merge($e, ["$at: assign: every " . ($match ? 'partner' : 'group') . ' needs a label of up to 24 characters']);
            }
            $names[$norm($t)] = true;
        }
        if (count($names) !== count($targets)) {
            $e[] = "$at: assign: " . ($match ? 'partners' : 'groups') . ' must have different names';
        }
        $labels = [];
        $used = [];
        foreach ($items as $item) {
            if (!is_array($item) || array_is_list($item) || array_diff(array_keys($item), ['label', 'to'])
                || !self::tileLabel($item['label'] ?? null) || !self::tileLabel($item['to'] ?? null)) {
                return array_merge($e, ["$at: assign: every item needs a label and a target, each up to 24 characters"]);
            }
            $labels[$norm($item['label'])] = true;
            if (!isset($names[$norm($item['to'])])) {
                $e[] = "$at: assign: item '{$item['label']}' goes to '{$item['to']}', which is not one of the " . ($match ? 'partners' : 'groups');
                continue;
            }
            $used[$norm($item['to'])] = ($used[$norm($item['to'])] ?? 0) + 1;
        }
        if (count($labels) !== count($items)) {
            $e[] = "$at: assign: items must have different labels";
        }
        if (count($items) !== count($targets) && $match) {
            $e[] = "$at: assign: a match question has one item for each partner";
        }
        foreach ($names as $name => $_) {
            $n = $used[$name] ?? 0;
            if ($n < 1 || ($match && $n > 1)) {
                $e[] = "$at: assign: " . ($match ? "partner '$name' must be used by exactly one item" : "group '$name' needs at least one item");
                break;
            }
        }
        return $e;
    }

    /** A tile label: plain text, 1 to 24 characters, no control characters. */
    private static function tileLabel(mixed $v): bool
    {
        return self::text($v, 24);
    }

    /**
     * The `build` question (spell, gap, order): a child taps tiles into slots. The tiles may include
     * decoys; the accepted answers are lists of tile labels in order. Everything the child could use
     * to cheat stays on the server (see Game::state for what is sent).
     */
    private static function validateBuild(mixed $b, string $at): array
    {
        if (!is_array($b) || array_is_list($b)) {
            return ["$at: build needs variant, tiles and answers"];
        }
        $e = [];
        if ($extra = array_diff(array_keys($b), self::BUILD_KEYS)) {
            $e[] = "$at: build has unknown keys " . implode(', ', $extra);
        }
        $variant = $b['variant'] ?? null;
        if (!in_array($variant, self::BUILD_VARIANTS, true)) {
            return array_merge($e, ["$at: build variant must be spell, gap or order"]);
        }
        $tiles = $b['tiles'] ?? null;
        if (!is_array($tiles) || !array_is_list($tiles) || count($tiles) < 2 || count($tiles) > 20) {
            return array_merge($e, ["$at: build needs 2 to 20 tiles"]);
        }
        foreach ($tiles as $tile) {
            if (!self::tileLabel($tile)) {
                return array_merge($e, ["$at: build: every tile needs a label of up to 24 characters"]);
            }
        }
        $answers = $b['answers'] ?? null;
        if (!is_array($answers) || !array_is_list($answers) || count($answers) < 1 || count($answers) > 4) {
            return array_merge($e, ["$at: build needs 1 to 4 accepted answers"]);
        }
        $slots = null;
        $seen = [];
        $available = array_count_values(array_map(static fn(string $t): string => mb_strtolower(trim($t)), $tiles));
        foreach ($answers as $answer) {
            if (!is_array($answer) || !array_is_list($answer) || count($answer) < 1 || count($answer) > 12) {
                return array_merge($e, ["$at: build: each accepted answer is a list of 1 to 12 tiles"]);
            }
            $slots ??= count($answer);
            if (count($answer) !== $slots) {
                $e[] = "$at: build: every accepted answer must have the same number of tiles";
            }
            $need = [];
            foreach ($answer as $label) {
                if (!self::tileLabel($label)) {
                    return array_merge($e, ["$at: build: every answer tile needs a label of up to 24 characters"]);
                }
                $key = mb_strtolower(trim($label));
                $need[$key] = ($need[$key] ?? 0) + 1;
            }
            foreach ($need as $key => $count) {
                if (($available[$key] ?? 0) < $count) {
                    $e[] = "$at: build: an accepted answer needs the tile '$key' more often than the tiles provide";
                    break;
                }
            }
            $fingerprint = implode("\x1f", array_map(static fn(string $t): string => mb_strtolower(trim($t)), $answer));
            if (isset($seen[$fingerprint])) {
                $e[] = "$at: build: the same accepted answer is listed twice";
            }
            $seen[$fingerprint] = true;
        }
        if ($variant === 'spell') {
            foreach ($tiles as $tile) {
                if (mb_strlen(trim($tile)) !== 1) {
                    $e[] = "$at: build: spell tiles are single letters";
                    break;
                }
            }
        }
        if ($variant === 'order') {
            if (count($tiles) !== $slots || count($available) !== count($tiles)) {
                $e[] = "$at: build: order uses every tile exactly once, with no decoys and no repeats";
            }
        }
        $template = $b['template'] ?? null;
        if ($variant === 'gap') {
            if (!self::text($template, 200) || ($slots !== null && substr_count($template, '___') !== $slots)) {
                $e[] = "$at: build: a gap question needs a sentence with one ___ for each tile in the answer";
            }
        } elseif (array_key_exists('template', $b)) {
            $e[] = "$at: build: only a gap question has a sentence template";
        }
        if (array_key_exists('speak', $b)) {
            $speak = $b['speak'];
            if ($variant !== 'spell') {
                $e[] = "$at: build: only a spell question can be read aloud as dictation";
            } elseif (!self::text($speak, 60) || mb_strtolower(trim($speak)) !== mb_strtolower(implode('', $answers[0]))) {
                $e[] = "$at: build: spoken text must be the word being spelled";
            }
        }
        return $e;
    }

    /** A dictation question speaks its answer, so it is practice only (never ranked, never the daily). */
    public static function isDictation(array $question): bool
    {
        return $question['type'] === 'build' && isset($question['build']['speak']);
    }

    private static function validateSlider(mixed $s, string $at): array
    {
        if (!is_array($s) || array_is_list($s)) {
            return ["$at: slider needs min, max, step, correct, accept_min and accept_max"];
        }
        $e = [];
        if ($extra = array_diff(array_keys($s), self::SLIDER_KEYS)) {
            $e[] = "$at: unknown slider keys " . implode(', ', $extra);
        }
        foreach (['min', 'max', 'step', 'correct', 'accept_min', 'accept_max'] as $key) {
            if (!is_int($s[$key] ?? null) && !is_float($s[$key] ?? null)) {
                return array_merge($e, ["$at: slider $key must be a number"]);
            }
        }
        if (isset($s['unit']) && !self::text($s['unit'], 20)) {
            $e[] = "$at: slider unit must be short text or null";
        }
        [$min, $max, $step] = [(float) $s['min'], (float) $s['max'], (float) $s['step']];
        if ($min >= $max || $step <= 0) {
            return array_merge($e, ["$at: slider needs min < max and step > 0"]);
        }
        $steps = ($max - $min) / $step;
        if ($steps > 1000 || abs($steps - round($steps)) > 1e-9) {
            $e[] = "$at: slider range must divide into at most 1000 whole steps";
        }
        if (!($min <= $s['accept_min'] && $s['accept_min'] <= $s['correct'] && $s['correct'] <= $s['accept_max'] && $s['accept_max'] <= $max)) {
            $e[] = "$at: slider must satisfy min <= accept_min <= correct <= accept_max <= max";
        }
        $offset = ((float) $s['correct'] - $min) / $step;
        if (abs($offset - round($offset)) > 1e-9) {
            $e[] = "$at: slider correct value must sit on a step";
        }
        if ($s['accept_max'] - $s['accept_min'] > ($max - $min) / 2) {
            $e[] = "$at: slider accepted range is wider than half the scale";
        }
        return $e;
    }

    /**
     * Lower case without spaces, quotes, brackets or sentence punctuation, so a reworded copy
     * still counts as a repeat. Maths symbols stay: "7 + 8" and "7 × 8" are different questions.
     */
    public static function promptKey(string $prompt): string
    {
        return preg_replace('/[\s.,!?;:\'"“”‘’()\[\]…]+/u', '', mb_strtolower($prompt)) ?? '';
    }

    /**
     * Prompt words that suggest a world, tried in this order; the first rule that matches wins.
     * Matching is case-insensitive on whole words (a plural s/es is allowed); "freez" and "multipl"
     * are stems, digits and the maths signs match anywhere.
     */
    private const SCENE_RULES = [
        'space' => '/\b(?:planet|moon|star|sun|space|astronaut|orbit|galaxy|galaxies|rocket|comet|mars|jupiter|saturn)(?:s|es)?\b/iu',
        'ocean' => '/\b(?:sea|ocean|fish|whale|shark|coral|octopus|octopuses|dolphin|wave|tide|beach|clownfish|crab|starfish)(?:s|es)?\b/iu',
        'arctic' => '/\b(?:ice|snow|polar|arctic|antarctic|antarctica|penguin|freez\w*|winter|cold|glacier)(?:s|es)?\b/iu',
        'body' => '/\b(?:body|bodies|heart|bone|blood|teeth|tooth|skin|brain|lung|muscle|skeleton|stomach)(?:s|es)?\b/iu',
        'past' => '/\b(?:ancient|history|king|queen|roman|viking|egypt|egyptian|pharaoh|tudor|victorian|war|century|centuries|castle|knight|medieval)(?:s|es)?\b/iu',
        'city' => '/\d|[×÷]|\b(?:number|maths|add|subtract|multipl\w*|divide|fraction|shape|triangle|square|circle|sum|total|count)(?:s|es)?\b/iu',
        'desert' => '/\b(?:desert|sand|camel|cactus|cacti|volcano|volcanoes|country|countries|continent|river|mountain|capital|map)(?:s|es)?\b/iu',
        'jungle' => '/\b(?:animal|jungle|forest|tree|plant|insect|bird|lion|tiger|monkey|leaf|leaves|flower)(?:s|es)?\b/iu',
    ];

    /**
     * Quiz-title words that put every question of the quiz in one world, before any prompt word:
     * a quiz about digestion stays in the body world even when a prompt says "waves" or "map".
     */
    private const TOPIC_RULES = [
        'body' => '/\b(?:body|bodies|human|anatomy|digestion|digestive|food|nutrition|bones?|skeleton|muscles?|movement|senses?|sight|hearing|brain|nerves?|nervous|heart|blood|circulation|breathing|lungs?|respiration|hormones?|growth|development|puberty|health|healthy|medical|medicine|teeth|tooth|skin)\b/iu',
    ];

    /**
     * The world a question is shown in (cosmetic only): its own scene, else the body world when the
     * quiz's title is about the body (TOPIC_RULES), else one inferred from the prompt, else the category's scene, else a
     * stable pick by question id. Always one of SCENES.
     */
    public static function sceneFor(array $question, ?string $categoryScene, string $questionId, ?string $quizTitle = null): string
    {
        if (in_array($question['scene'] ?? null, self::SCENES, true)) {
            return $question['scene'];
        }
        if (is_string($quizTitle) && $quizTitle !== '') {
            foreach (self::TOPIC_RULES as $scene => $pattern) {
                if (preg_match($pattern, $quizTitle) === 1) {
                    return $scene;
                }
            }
        }
        $prompt = is_string($question['prompt'] ?? null) ? $question['prompt'] : '';
        foreach (self::SCENE_RULES as $scene => $pattern) {
            if (preg_match($pattern, $prompt) === 1) {
                return $scene;
            }
        }
        if (in_array($categoryScene, self::SCENES, true)) {
            return $categoryScene;
        }
        return self::SCENES[hexdec(substr(hash('sha256', 'dyk-scene|' . $questionId), 0, 7)) % count(self::SCENES)];
    }

    /** Questions served per round: the file's round_size, or up to DEFAULT_ROUND. */
    public static function roundSize(array $quiz): int
    {
        return $quiz['round_size'] ?? min(self::DEFAULT_ROUND, count($quiz['questions']));
    }

    /** Deterministic snapshot so an unchanged file always produces identical questions and IDs. */
    public static function snapshot(array $quiz): array
    {
        $out = [];
        foreach ($quiz['questions'] as $i => $q) {
            $qid = self::id($quiz['slug'], 'q', (string) $i, $q['prompt']);
            $options = [];
            if ($q['type'] === 'choice') {
                foreach ($q['options'] as $j => $o) {
                    $options[] = ['id' => self::id($qid, (string) $j, $o['label']), 'label' => $o['label'], 'is_correct' => $o['correct']];
                }
            } elseif ($q['type'] === 'boolean') {
                $options = [
                    ['id' => self::id($qid, 'true'), 'label' => 'True', 'is_correct' => $q['answer'] === true],
                    ['id' => self::id($qid, 'false'), 'label' => 'False', 'is_correct' => $q['answer'] === false],
                ];
            }
            $build = null;
            if ($q['type'] === 'build') {
                $b = $q['build'];
                $build = ['variant' => $b['variant'],
                    'tiles' => array_map(static fn(string $label, int $k): array => ['id' => self::id($qid, 'tile', (string) $k, $label), 'label' => $label], $b['tiles'], array_keys($b['tiles'])),
                    'answers' => $b['answers']];
                foreach (['template', 'speak'] as $key) {
                    if (isset($b[$key])) {
                        $build[$key] = $b[$key];
                    }
                }
            }
            $assign = null;
            if ($q['type'] === 'assign') {
                $a = $q['assign'];
                $norm = static fn(string $t): string => mb_strtolower(trim($t));
                $targets = [];
                foreach ($a['targets'] as $k => $label) {
                    $targets[] = ['id' => self::id($qid, 'target', (string) $k, $label), 'label' => $label];
                }
                $byName = [];
                foreach ($targets as $t) { $byName[$norm($t['label'])] = $t['id']; }
                $assign = ['variant' => $a['variant'], 'targets' => $targets, 'items' => array_map(
                    static fn(array $item, int $k): array => ['id' => self::id($qid, 'item', (string) $k, $item['label']), 'label' => $item['label'], 'target' => $byName[$norm($item['to'])]],
                    $a['items'], array_keys($a['items']))];
            }
            $s = $q['type'] === 'slider' ? $q['slider'] : null;
            $out[] = [
                'id' => $qid, 'type' => $q['type'], 'prompt' => $q['prompt'], 'image_url' => null,
                'options' => $options,
                'build' => $build,
                'assign' => $assign,
                'slider' => $s === null ? null : ['min' => $s['min'], 'max' => $s['max'], 'step' => $s['step'],
                    'unit' => $s['unit'] ?? null, 'correct' => $s['correct'], 'accept_min' => $s['accept_min'], 'accept_max' => $s['accept_max']],
                'explanation' => $q['explanation'], 'source_url' => ($q['source_url'] ?? '') === '' ? null : $q['source_url'], 'review_by' => $q['review_by'],
            ];
            // Only when set, so a file without scenes keeps its snapshot (and stored version) unchanged.
            if (isset($q['scene'])) {
                $out[array_key_last($out)]['scene'] = $q['scene'];
            }
        }
        return $out;
    }

    /** Order-insensitive comparison of two snapshots (MySQL may reorder JSON object keys). */
    public static function same(array $a, array $b): bool
    {
        return self::canonical($a) === self::canonical($b);
    }

    private static function canonical(mixed $v): mixed
    {
        if (is_array($v)) {
            if (!array_is_list($v)) {
                ksort($v);
            }
            return array_map([self::class, 'canonical'], $v);
        }
        return is_int($v) ? (float) $v : $v;
    }

    /** UUID-shaped identifier derived from its parts (version 8 layout). */
    public static function id(string ...$parts): string
    {
        $h = hash('sha256', 'dyk-content|' . implode('|', $parts));
        $h[12] = '8';
        $h[16] = dechex((hexdec($h[16]) & 0x3) | 0x8);
        return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' . substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20, 12);
    }

    private static function slug(mixed $v): bool
    {
        return is_string($v) && preg_match(self::SLUG, $v) === 1;
    }

    private static function text(mixed $v, int $max): bool
    {
        return is_string($v) && trim($v) !== '' && mb_strlen($v) <= $max && !preg_match('/[\x00-\x1F\x7F]/', $v);
    }

    private static function ages(mixed $min, mixed $max): bool
    {
        foreach ([$min, $max] as $v) {
            if ($v !== null && (!is_int($v) || $v < 0 || $v > 120)) {
                return false;
            }
        }
        return $min === null || $max === null || $max >= $min;
    }
}
