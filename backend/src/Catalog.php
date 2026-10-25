<?php
declare(strict_types=1);

namespace Dyk;

/** Published metadata only. Version snapshots and author identities stay private. */
final class Catalog
{
    /** The one public quiz column list. Never add current_version_id or anything from quiz_versions. */
    private const QUIZ_COLUMNS = 'q.id,q.slug,q.title,q.intro,q.category_id,q.difficulty,q.age_min,q.age_max,q.curriculum_tags,
        q.cover_image_url,q.question_count,q.time_limit_seconds,q.shuffle_options,q.is_ranked,q.status,
        q.publish_at,q.seo_title,q.seo_description,q.created_at,q.updated_at';

    public function __construct(private readonly \PDO $db) {}

    public function categories(?string $slug = null): array
    {
        $sql = 'SELECT id,slug,name,description,kind,icon,scene,sort_order,is_active,created_at,updated_at FROM categories WHERE is_active=1';
        $args = [];
        if ($slug !== null) {
            $sql .= ' AND slug=?';
            $args[] = $slug;
        }
        $statement = $this->db->prepare($sql . ' ORDER BY sort_order,name LIMIT 100');
        $statement->execute($args);
        return array_map(static function (array $row): array {
            $row['sort_order'] = (int) $row['sort_order'];
            $row['is_active'] = (bool) $row['is_active'];
            $row['created_at'] = Database::utc($row['created_at']);
            $row['updated_at'] = Database::utc($row['updated_at']);
            return $row;
        }, $statement->fetchAll());
    }

    public function tags(): array
    {
        return $this->db->query('SELECT code,label,system,age_min,age_max,sort_order FROM curriculum_tags ORDER BY sort_order,code LIMIT 200')->fetchAll();
    }

    public function quizzes(array $filters, ?string $slug = null): array
    {
        $sql = 'SELECT ' . self::QUIZ_COLUMNS . " FROM quizzes q WHERE q.status='published'";
        $args = [];
        if ($slug !== null) {
            $sql .= ' AND slug=?';
            $args[] = $slug;
        }
        foreach (['category_id', 'age', 'curriculum_tag', 'search'] as $key) {
            if (isset($filters[$key]) && (!is_string($filters[$key]) || strlen($filters[$key]) > 100)) {
                throw new ApiError('invalid_filter');
            }
        }
        if (isset($filters['category_id'])) {
            if (!preg_match('/^[0-9a-f-]{36}$/D', $filters['category_id'])) {
                throw new ApiError('invalid_filter');
            }
            $sql .= ' AND category_id=?';
            $args[] = $filters['category_id'];
        }
        if (isset($filters['age'])) {
            if (!preg_match('/^[0-9]{1,3}$/D', $filters['age']) || (int) $filters['age'] > 120) {
                throw new ApiError('invalid_filter');
            }
            $sql .= ' AND (age_min IS NULL OR age_min<=?) AND (age_max IS NULL OR age_max>=?)';
            $args[] = (int) $filters['age'];
            $args[] = (int) $filters['age'];
        }
        if (isset($filters['curriculum_tag'])) {
            if (!preg_match('/^[a-z0-9-]{1,100}$/D', $filters['curriculum_tag'])) {
                throw new ApiError('invalid_filter');
            }
            $sql .= ' AND JSON_CONTAINS(COALESCE(curriculum_tags,JSON_ARRAY()),JSON_QUOTE(?))';
            $args[] = $filters['curriculum_tag'];
        }
        if (isset($filters['search'])) {
            $sql .= " AND title LIKE ? ESCAPE '!'";
            $args[] = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], trim($filters['search'])) . '%';
        }
        $statement = $this->db->prepare($sql . ' ORDER BY q.updated_at DESC,q.id LIMIT 100');
        $statement->execute($args);
        return array_map(self::quizRow(...), $statement->fetchAll());
    }

    /**
     * Up to six published quizzes, most finished plays in the last 7 days first. Quizzes with
     * no recent plays fill the rest newest first, so a quiet week still shows something.
     * Only an aggregate count is read from attempts; no player data leaves this query.
     */
    public function trending(): array
    {
        $statement = $this->db->query('SELECT ' . self::QUIZ_COLUMNS . " FROM quizzes q
            LEFT JOIN (SELECT quiz_id,COUNT(*) AS plays FROM attempts
                WHERE status='finished' AND finished_at>DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 7 DAY) GROUP BY quiz_id) p
            ON p.quiz_id=q.id WHERE q.status='published'
            ORDER BY COALESCE(p.plays,0) DESC,q.updated_at DESC,q.id LIMIT 6");
        return array_map(self::quizRow(...), $statement->fetchAll());
    }

    /** Pages that are always public. Play, challenge and personal routes stay out (robots.txt). */
    public const SITEMAP_PAGES = [
        ['/', 'daily'], ['/daily', 'daily'], ['/leaderboards', 'daily'], ['/how-to-play', 'monthly'],
        ['/about', 'monthly'], ['/privacy', 'monthly'], ['/terms', 'monthly'], ['/contact', 'monthly'],
    ];

    /**
     * sitemap.xml for search engines: the fixed pages, active categories and published quizzes.
     * Drafts, archived quizzes and inactive categories never appear; only slugs and dates are read.
     */
    public function sitemapXml(string $origin): string
    {
        $entries = [];
        foreach (self::SITEMAP_PAGES as [$path, $frequency]) {
            $entries[] = ['loc' => $path, 'lastmod' => null, 'changefreq' => $frequency];
        }
        $categories = $this->db->query('SELECT slug,updated_at FROM categories WHERE is_active=1 ORDER BY sort_order,name LIMIT 1000');
        foreach ($categories->fetchAll() as $row) {
            $entries[] = ['loc' => '/c/' . $row['slug'], 'lastmod' => $row['updated_at'], 'changefreq' => 'weekly'];
        }
        $quizzes = $this->db->query("SELECT slug,updated_at FROM quizzes WHERE status='published' ORDER BY updated_at DESC,id LIMIT 45000");
        foreach ($quizzes->fetchAll() as $row) {
            $entries[] = ['loc' => '/q/' . $row['slug'], 'lastmod' => $row['updated_at'], 'changefreq' => 'weekly'];
        }
        return self::sitemap($origin, $entries);
    }

    /** @param list<array{loc:string,lastmod:?string,changefreq:string}> $entries paths relative to $origin */
    public static function sitemap(string $origin, array $entries): string
    {
        $escape = static fn (string $value): string => htmlspecialchars($value, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($entries as $entry) {
            $xml .= '  <url><loc>' . $escape(rtrim($origin, '/') . $entry['loc']) . '</loc>';
            if ($entry['lastmod'] !== null) {
                $xml .= '<lastmod>' . (new \DateTimeImmutable($entry['lastmod'], new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z') . '</lastmod>';
            }
            $xml .= '<changefreq>' . $escape($entry['changefreq']) . '</changefreq></url>' . "\n";
        }
        return $xml . '</urlset>' . "\n";
    }

    private static function quizRow(array $row): array
    {
        $row['question_count'] = (int) $row['question_count'];
        $row['time_limit_seconds'] = $row['time_limit_seconds'] === null ? null : (int) $row['time_limit_seconds'];
        $row['shuffle_options'] = (bool) $row['shuffle_options'];
        $row['is_ranked'] = (bool) $row['is_ranked'];
        $row['age_min'] = $row['age_min'] === null ? null : (int) $row['age_min'];
        $row['age_max'] = $row['age_max'] === null ? null : (int) $row['age_max'];
        $row['curriculum_tags'] = $row['curriculum_tags'] === null ? [] : json_decode($row['curriculum_tags'], true, 16, JSON_THROW_ON_ERROR);
        foreach (['created_at', 'updated_at', 'publish_at'] as $field) {
            $row[$field] = Database::utc($row[$field]);
        }
        return $row;
    }
}
