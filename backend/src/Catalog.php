<?php
declare(strict_types=1);

namespace Dyk;

/** Published metadata only. Version snapshots and author identities stay private. */
final class Catalog
{
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
        $sql = "SELECT id,slug,title,intro,category_id,difficulty,age_min,age_max,curriculum_tags,
            cover_image_url,question_count,time_limit_seconds,shuffle_options,is_ranked,status,
            publish_at,seo_title,seo_description,created_at,updated_at FROM quizzes WHERE status='published'";
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
        $statement = $this->db->prepare($sql . ' ORDER BY updated_at DESC,id LIMIT 100');
        $statement->execute($args);
        return array_map(static function (array $row): array {
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
        }, $statement->fetchAll());
    }
}
