<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Reads and validates the reviewed content files in backend/content and turns each quiz
 * into the snapshot shape Game reads. No database access here: --dry-run uses this alone.
 */
final class Content
{
    public const TYPES = ['choice', 'boolean', 'slider'];
    public const DIFFICULTIES = ['easy', 'medium', 'hard'];
    private const SLUG = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/D';
    /** Quiz slugs that clash with API routes such as GET /quizzes/trending. */
    public const RESERVED_SLUGS = ['trending'];
    private const QUIZ_KEYS = ['slug', 'title', 'intro', 'category', 'difficulty', 'age_min', 'age_max',
        'curriculum_tags', 'time_limit_seconds', 'shuffle_options', 'is_ranked', 'round_size', 'questions'];
    /** Questions in one round when a quiz file does not set round_size. */
    public const DEFAULT_ROUND = 10;
    private const QUESTION_KEYS = ['type', 'prompt', 'options', 'answer', 'slider', 'explanation', 'source_url', 'review_by'];
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

    private static function validateQuestion(array $q, string $at): array
    {
        $e = [];
        if ($extra = array_diff(array_keys($q), self::QUESTION_KEYS)) {
            $e[] = "$at: unknown keys " . implode(', ', $extra);
        }
        $type = $q['type'] ?? null;
        if (!in_array($type, self::TYPES, true)) {
            return array_merge($e, ["$at: type must be choice, boolean or slider"]);
        }
        if (!self::text($q['prompt'] ?? null, 300)) {
            $e[] = "$at: prompt required (up to 300 characters)";
        }
        if (!self::text($q['explanation'] ?? null, 400)) {
            $e[] = "$at: explanation required (up to 400 characters)";
        }
        $url = $q['source_url'] ?? null;
        if (!is_string($url) || strlen($url) > 500 || !preg_match('~^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s"<>]*)?$~iD', $url)) {
            $e[] = "$at: source_url must be an https URL";
        }
        $date = $q['review_by'] ?? null;
        $parsed = is_string($date) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $date) : false;
        if (!$parsed || $parsed->format('Y-m-d') !== $date) {
            $e[] = "$at: review_by must be a date like 2027-10-17";
        }
        if ($type === 'choice') {
            if (isset($q['answer']) || isset($q['slider'])) {
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
            if (isset($q['options']) || isset($q['slider'])) {
                $e[] = "$at: boolean questions use answer only";
            }
            if (!is_bool($q['answer'] ?? null)) {
                $e[] = "$at: boolean needs answer true or false";
            }
        } else {
            if (isset($q['options']) || isset($q['answer'])) {
                $e[] = "$at: slider questions use slider only";
            }
            $e = array_merge($e, self::validateSlider($q['slider'] ?? null, $at));
        }
        return $e;
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
            $s = $q['type'] === 'slider' ? $q['slider'] : null;
            $out[] = [
                'id' => $qid, 'type' => $q['type'], 'prompt' => $q['prompt'], 'image_url' => null,
                'options' => $options,
                'slider' => $s === null ? null : ['min' => $s['min'], 'max' => $s['max'], 'step' => $s['step'],
                    'unit' => $s['unit'] ?? null, 'correct' => $s['correct'], 'accept_min' => $s['accept_min'], 'accept_max' => $s['accept_max']],
                'explanation' => $q['explanation'], 'source_url' => $q['source_url'], 'review_by' => $q['review_by'],
            ];
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
