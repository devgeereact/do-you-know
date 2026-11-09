<?php
declare(strict_types=1);

namespace Dyk;

/**
 * The house rules as warnings (docs/CONTENT-PIPELINE-DESIGN.md, slice 1). They show beside a quiz in the
 * Studio and never block anything: blocking errors stay in Content::validateQuiz and AdminContent::problems.
 * The word lists live in backend/rules/house-rules.json, shared with src/lib/houseRules.ts.
 */
final class HouseRules
{
    private static ?array $rules = null;

    private static function rules(): array
    {
        return self::$rules ??= json_decode((string) file_get_contents(dirname(__DIR__) . '/rules/house-rules.json'), true, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * @param array $quiz a quiz in content shape: title, category (slug), age_min, age_max, questions
     * @return list<array{index:?int,field:string,level:string,code:string,message:string}> quiz-level first, then by question
     */
    public static function check(array $quiz): array
    {
        $out = [];
        $min = isset($quiz['age_min']) && is_int($quiz['age_min']) ? $quiz['age_min'] : null;
        $max = isset($quiz['age_max']) && is_int($quiz['age_max']) ? $quiz['age_max'] : null;
        if ($min === null) {
            $out[] = self::warn(null, 'ages', 'no_min_age', 'No minimum age is set. Set one, and 18 for an adult set, so children are not shown it by mistake.');
        } elseif ($max !== null && Areas::level($min) !== Areas::level($max)) {
            $a = ucfirst((string) Areas::level($min));
            $b = ucfirst((string) Areas::level($max));
            $out[] = self::warn(null, 'ages', 'age_spans_levels', "Ages $min to $max span more than one level ($a and $b). It shows at $a.");
        }
        $religious = in_array($quiz['category'] ?? null, self::rules()['religious_categories'], true);
        foreach (($quiz['questions'] ?? []) as $i => $q) {
            if (!is_array($q)) { continue; }
            $parts = self::parts($q);
            $us = self::usSpelling($parts);
            if ($us) {
                $out[] = self::warn($i, $us['field'], 'us_spelling', 'US spelling: ' . implode(', ', $us['hits']) . '. Use UK spelling.');
            }
            if ($religious) {
                $faith = self::find($parts, self::rules()['other_faith']);
                if ($faith) {
                    $out[] = self::warn($i, $faith['field'], 'other_faith', 'Names another faith (' . implode(', ', $faith['hits']) . '). Religious questions are Christian only.');
                }
                $sacrament = self::find($parts, self::rules()['sacrament']);
                if ($sacrament) {
                    $out[] = self::warn($i, $sacrament['field'], 'sacrament', 'Mentions ' . implode(', ', $sacrament['hits']) . '. Leave out sacraments, saints and denominational practice, or check it only states what the Bible says.');
                }
            }
        }
        return $out;
    }

    private static function warn(?int $index, string $field, string $code, string $message): array
    {
        return ['index' => $index, 'field' => $field, 'level' => 'warning', 'code' => $code, 'message' => $message];
    }

    /** The text of a question by place: prompt, explanation, answers, tiles. */
    private static function parts(array $q): array
    {
        $options = [];
        foreach (($q['options'] ?? []) as $o) { if (is_array($o) && is_string($o['label'] ?? null)) { $options[] = $o['label']; } }
        $tiles = [];
        foreach (['build', 'assign', 'slider'] as $key) { if (isset($q[$key]) && is_array($q[$key])) { self::strings($q[$key], $tiles); } }
        return [
            'prompt' => is_string($q['prompt'] ?? null) ? $q['prompt'] : '',
            'explanation' => is_string($q['explanation'] ?? null) ? $q['explanation'] : '',
            'options' => implode(' ', $options),
            'tiles' => implode(' ', $tiles),
        ];
    }

    private static function strings(array $node, array &$into): void
    {
        foreach ($node as $v) {
            if (is_string($v)) { $into[] = $v; } elseif (is_array($v)) { self::strings($v, $into); }
        }
    }

    /** @return ?array{field:string,hits:list<string>} */
    private static function usSpelling(array $parts): ?array
    {
        $map = self::rules()['us_spelling'];
        $re = '/\b(' . implode('|', array_map(static fn(string $w): string => preg_quote($w, '/'), array_keys($map))) . ')\b/iu';
        $field = null;
        $hits = [];
        foreach ($parts as $name => $text) {
            if ($text !== '' && preg_match_all($re, $text, $m)) {
                $field ??= $name;
                foreach ($m[1] as $w) { $hits['“' . $w . '” (' . $map[mb_strtolower($w)] . ')'] = true; }
            }
        }
        return $field === null ? null : ['field' => $field, 'hits' => array_keys($hits)];
    }

    /** @param list<string> $words @return ?array{field:string,hits:list<string>} */
    private static function find(array $parts, array $words): ?array
    {
        $re = '/\b(' . implode('|', array_map(static fn(string $w): string => preg_quote($w, '/'), $words)) . ')\b/iu';
        $field = null;
        $hits = [];
        foreach ($parts as $name => $text) {
            if ($text !== '' && preg_match_all($re, $text, $m)) {
                $field ??= $name;
                foreach ($m[1] as $w) { $hits['“' . mb_strtolower($w) . '”'] = true; }
            }
        }
        return $field === null ? null : ['field' => $field, 'hits' => array_keys($hits)];
    }
}
