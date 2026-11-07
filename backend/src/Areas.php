<?php
declare(strict_types=1);

namespace Dyk;

/**
 * The learning area and level of a quiz, derived from where it already lives. Nothing is stored and
 * no quiz is changed: this is only a label (docs/LEARNING-DESIGN.md section 5, docs/DIRECTION.md).
 */
final class Areas
{
    /** @var array<string,string> category slug => area */
    private const BY_CATEGORY = [
        'school-english' => 'literacy',
        'maths' => 'numeracy',
        'science-nature' => 'science', 'school-science' => 'science', 'school-computing' => 'science',
        'tech' => 'science', 'technology-and-computing' => 'science',
        'geography' => 'humanities', 'school-geography' => 'humanities',
        'history' => 'humanities', 'school-history' => 'humanities',
        'bible-faith' => 'humanities', 'bible-and-faith' => 'humanities',
    ];

    /** General Knowledge is one category holding many topics; the topic is the start of the title. */
    private const GENERAL_TOPICS = [
        'language and literature' => 'literacy', 'words and language challenge' => 'literacy',
        'maths and logic' => 'numeracy', 'time and calendars' => 'numeracy',
        'science and space' => 'science', 'animals and nature' => 'science',
        'history' => 'humanities', 'geography' => 'humanities',
    ];

    /** literacy, numeracy, science, humanities, trivia (kept behind a parent switch), or null when unknown. */
    public static function area(?string $categorySlug, string $title): ?string
    {
        if ($categorySlug === null) {
            return null;
        }
        if ($categorySlug === 'general-knowledge') {
            $lower = mb_strtolower(trim($title));
            foreach (self::GENERAL_TOPICS as $topic => $area) {
                if (str_starts_with($lower, $topic)) {
                    return $area;
                }
            }
            return 'trivia';
        }
        return self::BY_CATEGORY[$categorySlug] ?? null;
    }

    /** starters (4-5), explorers (6-8), adventurers (9-11), challengers (12-14), scholars (15-16), adult (18+). */
    public static function level(?int $ageMin): ?string
    {
        return match (true) {
            $ageMin === null => null,
            $ageMin >= 18 => 'adult',
            $ageMin <= 5 => 'starters',
            $ageMin <= 8 => 'explorers',
            $ageMin <= 11 => 'adventurers',
            $ageMin <= 14 => 'challengers',
            default => 'scholars',
        };
    }
}
