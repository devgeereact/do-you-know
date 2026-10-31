<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Content studio under /admin (Admin guards every call). A quiz keeps its live version in
 * quiz_versions and an editable work copy in quizzes.draft:
 *   {"meta":{title,intro,category,difficulty,age_min,age_max,curriculum_tags,time_limit_seconds,
 *            shuffle_options,is_ranked,round_size},"questions":[question...],"review":bool}
 * Questions use the content-file shape (Content::validateQuestion) plus "id" (a stable handle) and
 * "checked" (server-owned). Publishing turns the work copy into a new version; players never see a
 * work copy. Every write returns the same shape as GET /admin/quizzes/{id}, except create.
 *
 * GET  /admin/quizzes?status=draft|review|published|retired&category=<slug>&ks=KS1..KS4&q=<text>
 *      200 {"items":[{id,slug,title,category:{slug,name}|null,ks,status,in_review,version,question_count,
 *                      plays,right_rate,updated_at,publish_at,has_draft}]}
 * GET  /admin/quizzes/{id}      200 {"quiz":{...},"questions":[...],"versions":[...],"problems":[...]}
 * POST /admin/quizzes           {title,category,ks?,intro?,difficulty?,time_limit_seconds?,questions?} 201 {id,slug}
 * POST /admin/quizzes/{id}      {meta?,questions?}  save the work copy
 * POST /admin/quizzes/{id}/append   {questions:[...]}
 * POST /admin/quizzes/{id}/submit | /unsubmit | /check {index,checked} | /publish {publish_at?:Y-m-d}
 * POST /admin/quizzes/{id}/retire | /restore | /discard
 * Errors: 404 quiz_not_found; 409 quiz_retired | not_retired; 422 invalid_quiz | invalid_questions |
 * too_many_questions | invalid_index | invalid_publish_at | not_enough_questions | has_problems |
 * unchecked_questions | nothing_to_submit, each with details.
 */
final class AdminContent
{
    public const KS = ['KS1' => 'uk-ks1', 'KS2' => 'uk-ks2', 'KS3' => 'uk-ks3', 'KS4' => 'uk-ks4'];
    private const META_KEYS = ['title', 'intro', 'category', 'difficulty', 'age_min', 'age_max', 'curriculum_tags',
        'time_limit_seconds', 'shuffle_options', 'is_ranked', 'round_size'];
    private const STATUSES = ['draft', 'review', 'published', 'retired'];
    private const MAX_QUESTIONS = 50;

    /** Cached lookups for problem checks: category slugs, tag codes, prompt key => quiz ids. */
    private ?array $context = null;

    public function __construct(private readonly \PDO $db, private readonly Admin $admin) {}

    // ---- Reads ----

    public function list(array $query): array
    {
        $sql = "SELECT q.id,q.slug,q.title,q.status,q.updated_at,q.publish_at,q.curriculum_tags,q.draft IS NOT NULL AS has_draft,
                JSON_VALUE(q.draft,'$.review') AS review,v.version,
                COALESCE(JSON_LENGTH(q.draft,'$.questions'),JSON_LENGTH(v.snapshot),0) AS bank,
                c.slug AS category_slug,c.name AS category_name,COALESCE(p.plays,0) AS plays,r.n AS answered,r.r AS right_answers
            FROM quizzes q LEFT JOIN quiz_versions v ON v.id=q.current_version_id LEFT JOIN categories c ON c.id=q.category_id
            LEFT JOIN (SELECT quiz_id,COUNT(*) AS plays FROM attempts WHERE status='finished' GROUP BY quiz_id) p ON p.quiz_id=q.id
            LEFT JOIN (SELECT a.quiz_id,COUNT(*) AS n,SUM(aa.is_correct) AS r FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id
                GROUP BY a.quiz_id) r ON r.quiz_id=q.id WHERE 1=1";
        $args = [];
        $status = Admin::queryEnum($query, 'status', self::STATUSES);
        if ($status === 'review') {
            $sql .= " AND (q.status='review' OR JSON_VALUE(q.draft,'$.review') IN ('true','1'))";
        } elseif ($status !== null) {
            $sql .= ' AND q.status=?';
            $args[] = $status;
        }
        if (isset($query['category'])) {
            if (!is_string($query['category']) || !preg_match('/^[a-z0-9-]{1,100}$/D', $query['category'])) {
                throw ApiError::invalid('invalid_filter', ['field' => 'category']);
            }
            $sql .= ' AND c.slug=?';
            $args[] = $query['category'];
        }
        $ks = Admin::queryEnum($query, 'ks', array_keys(self::KS));
        if ($ks !== null) {
            $sql .= ' AND JSON_CONTAINS(COALESCE(q.curriculum_tags,JSON_ARRAY()),JSON_QUOTE(?))';
            $args[] = self::KS[$ks];
        }
        if (isset($query['q'])) {
            if (!is_string($query['q']) || mb_strlen($query['q']) > 100) {
                throw ApiError::invalid('invalid_filter', ['field' => 'q']);
            }
            $like = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], trim($query['q'])) . '%';
            $sql .= " AND (q.title LIKE ? ESCAPE '!' OR q.slug LIKE ? ESCAPE '!')";
            array_push($args, $like, $like);
        }
        $statement = $this->db->prepare($sql . ' ORDER BY q.updated_at DESC,q.id LIMIT 500');
        $statement->execute($args);
        return ['items' => array_map(static fn(array $r): array => [
            'id' => $r['id'], 'slug' => $r['slug'], 'title' => $r['title'],
            'category' => $r['category_slug'] === null ? null : ['slug' => $r['category_slug'], 'name' => $r['category_name']],
            'ks' => self::ks(json_decode((string) $r['curriculum_tags'], true) ?: []),
            'status' => $r['status'], 'in_review' => $r['status'] === 'review' || in_array((string) $r['review'], ['true', '1'], true),
            'version' => $r['version'] === null ? null : (int) $r['version'], 'question_count' => (int) $r['bank'],
            'plays' => (int) $r['plays'],
            'right_rate' => (int) $r['answered'] > 0 ? (int) round(100 * (int) $r['right_answers'] / (int) $r['answered']) : null,
            'updated_at' => Database::utc($r['updated_at']), 'publish_at' => Database::utc($r['publish_at']),
            'has_draft' => (bool) $r['has_draft'],
        ], $statement->fetchAll())];
    }

    public function detail(string $id): array
    {
        $row = $this->find($id);
        $work = $this->workCopy($row);
        $stats = [];
        $statement = $this->db->prepare('SELECT aa.question_id,COUNT(*) AS n,SUM(aa.is_correct) AS r FROM attempt_answers aa
            JOIN attempts a ON a.id=aa.attempt_id WHERE a.quiz_id=? GROUP BY aa.question_id');
        $statement->execute([$id]);
        foreach ($statement->fetchAll() as $s) {
            $stats[$s['question_id']] = ['answered' => (int) $s['n'], 'right' => (int) $s['r']];
        }
        $versions = $this->db->prepare('SELECT id,version,created_at,question_count FROM quiz_versions WHERE quiz_id=? ORDER BY version DESC');
        $versions->execute([$id]);
        $live = $row['status'] === 'published' ? $row['current_version_id'] : null;
        $meta = $work['meta'];
        $category = is_string($meta['category'] ?? null)
            ? Database::one($this->db, 'SELECT name,scene FROM categories WHERE slug=?', [$meta['category']]) : null;
        $current = $row['current_version_id']
            ? Database::one($this->db, 'SELECT version FROM quiz_versions WHERE id=?', [$row['current_version_id']]) : null;
        return [
            'quiz' => array_merge(['id' => $row['id'], 'slug' => $row['slug'], 'status' => $row['status'],
                'in_review' => $row['status'] === 'review' || ($work['review'] ?? false) === true,
                'has_draft' => $row['draft'] !== null, 'version' => $current ? (int) $current['version'] : null,
                'live' => $row['status'] === 'published' && $row['current_version_id'] !== null
                    && ($row['publish_at'] === null || strtotime($row['publish_at'] . ' UTC') <= time()),
                'publish_at' => Database::utc($row['publish_at']), 'created_at' => Database::utc($row['created_at']),
                'updated_at' => Database::utc($row['updated_at'])], $meta,
                ['category_name' => $category['name'] ?? null,
                 'ks' => self::ks(is_array($meta['curriculum_tags'] ?? null) ? $meta['curriculum_tags'] : [])]),
            // scene is the question's own choice (null when unset); scene_default is what players see then.
            'questions' => array_map(static fn(array $q): array => $q + [
                'scene_default' => Content::sceneFor(['prompt' => $q['prompt'] ?? null], $category['scene'] ?? null, $q['id']),
                'stats' => $stats[$q['id']] ?? ['answered' => 0, 'right' => 0]], $work['questions']),
            'versions' => array_map(static fn(array $v): array => ['version' => (int) $v['version'],
                'created_at' => Database::utc($v['created_at']), 'question_count' => (int) $v['question_count'],
                'live' => $v['id'] === $live], $versions->fetchAll()),
            'problems' => $this->problems($row, $work),
        ];
    }

    // ---- Writes ----

    public function create(array $body): array
    {
        $problems = [];
        $title = self::cleanText($body['title'] ?? null, 255);
        if ($title === null) { $problems[] = ['field' => 'title', 'message' => 'title required (up to 255 characters)']; }
        $categorySlug = $body['category'] ?? null;
        $category = is_string($categorySlug) && preg_match('/^[a-z0-9-]{1,100}$/D', $categorySlug)
            ? Database::one($this->db, 'SELECT id,slug FROM categories WHERE slug=?', [$categorySlug]) : null;
        if (!$category) { $problems[] = ['field' => 'category', 'message' => 'category must be an existing subject slug']; }
        $ks = $body['ks'] ?? null;
        if ($ks !== null && !isset(self::KS[$ks])) { $problems[] = ['field' => 'ks', 'message' => 'ks must be KS1, KS2, KS3, KS4 or null']; }
        $intro = $body['intro'] ?? '';
        if (!is_string($intro) || mb_strlen($intro) > 400) { $problems[] = ['field' => 'intro', 'message' => 'intro up to 400 characters']; }
        $difficulty = $body['difficulty'] ?? 'medium';
        if (!in_array($difficulty, Content::DIFFICULTIES, true)) { $problems[] = ['field' => 'difficulty', 'message' => 'difficulty must be easy, medium or hard']; }
        $timer = $body['time_limit_seconds'] ?? 20;
        if ($timer !== null && (!is_int($timer) || $timer < 5 || $timer > 120)) { $problems[] = ['field' => 'time_limit_seconds', 'message' => 'time_limit_seconds must be null or 5-120']; }
        if ($extra = array_diff(array_keys($body), ['title', 'category', 'ks', 'intro', 'difficulty', 'time_limit_seconds', 'questions'])) {
            $problems[] = ['field' => 'body', 'message' => 'unknown keys ' . implode(', ', $extra)];
        }
        if ($problems) { throw ApiError::invalid('invalid_quiz', $problems); }
        $questions = $this->incoming($body['questions'] ?? [], []);
        $tags = $ks === null ? [] : [self::KS[$ks]];
        $meta = ['title' => $title, 'intro' => trim($intro), 'category' => $category['slug'], 'difficulty' => $difficulty,
            'age_min' => null, 'age_max' => null, 'curriculum_tags' => $tags, 'time_limit_seconds' => $timer,
            'shuffle_options' => true, 'is_ranked' => true, 'round_size' => null];
        return Database::transaction($this->db, function () use ($title, $intro, $category, $difficulty, $timer, $tags, $meta, $questions): array {
            $id = Database::uuid();
            $slug = $this->uniqueSlug($title);
            Database::execute($this->db,
                "INSERT INTO quizzes (id,slug,status,title,intro,category_id,difficulty,time_limit_seconds,question_count,curriculum_tags,draft)
                 VALUES (?,?,'draft',?,?,?,?,?,3,?,?)",
                [$id, $slug, $title, trim($intro), $category['id'], $difficulty, $timer, json_encode($tags, JSON_THROW_ON_ERROR),
                 self::encode(['meta' => $meta, 'questions' => $questions, 'review' => false])]);
            $this->admin->audit('quiz.create', 'quiz', $id, ['slug' => $slug, 'questions' => count($questions)]);
            return ['id' => $id, 'slug' => $slug];
        });
    }

    public function save(string $id, array $body): array
    {
        if ($extra = array_diff(array_keys($body), ['meta', 'questions'])) {
            throw ApiError::invalid('invalid_quiz', [['field' => 'body', 'message' => 'unknown keys ' . implode(', ', $extra)]]);
        }
        return $this->write($id, 'quiz.save', function (array $row, array $work) use ($body): array {
            if (array_key_exists('meta', $body)) {
                if (!is_array($body['meta']) || ($body['meta'] && array_is_list($body['meta']))) {
                    throw ApiError::invalid('invalid_quiz', [['field' => 'meta', 'message' => 'meta must be an object']]);
                }
                $work['meta'] = self::cleanMeta($body['meta'] + $work['meta']);
            }
            if (array_key_exists('questions', $body)) {
                $work['questions'] = $this->incoming($body['questions'], $work['questions']);
            }
            $work['review'] = false;
            return [$work, ['questions' => count($work['questions'])]];
        });
    }

    public function append(string $id, array $body): array
    {
        $new = $body['questions'] ?? null;
        if (!is_array($new) || !array_is_list($new) || !$new) {
            throw ApiError::invalid('invalid_questions', [['field' => 'questions', 'message' => 'questions must be a non-empty list']]);
        }
        return $this->write($id, 'quiz.append', function (array $row, array $work) use ($new): array {
            $added = $this->incoming($new, []);
            if (count($work['questions']) + count($added) > self::MAX_QUESTIONS) {
                throw ApiError::invalid('too_many_questions', ['max' => self::MAX_QUESTIONS, 'have' => count($work['questions'])]);
            }
            $work['questions'] = array_merge($work['questions'], $added);
            $work['review'] = false;
            return [$work, ['added' => count($added)]];
        });
    }

    public function submit(string $id): array
    {
        return Database::transaction($this->db, function () use ($id): array {
            $row = $this->find($id, true);
            $this->notRetired($row);
            $work = $this->workCopy($row);
            if (count($work['questions']) < 3) { throw ApiError::invalid('not_enough_questions', ['min' => 3]); }
            if ($problems = $this->problems($row, $work)) { throw ApiError::invalid('has_problems', $problems); }
            if ($row['status'] === 'draft') {
                Database::execute($this->db, "UPDATE quizzes SET status='review',updated_at=CURRENT_TIMESTAMP(6) WHERE id=?", [$id]);
                if ($row['draft'] === null) { $this->storeDraft($id, $work); }
            } else {
                // A live quiz stays live while its work copy waits for review.
                if ($row['draft'] === null) { throw ApiError::invalid('nothing_to_submit'); }
                $work['review'] = true;
                $this->storeDraft($id, $work);
            }
            $this->admin->audit('quiz.submit', 'quiz', $id, null);
            return $this->detail($id);
        });
    }

    public function unsubmit(string $id): array
    {
        return Database::transaction($this->db, function () use ($id): array {
            $row = $this->find($id, true);
            if ($row['status'] === 'review') {
                Database::execute($this->db, "UPDATE quizzes SET status='draft',updated_at=CURRENT_TIMESTAMP(6) WHERE id=?", [$id]);
            } elseif ($row['draft'] !== null) {
                $work = $this->workCopy($row);
                $work['review'] = false;
                $this->storeDraft($id, $work);
            }
            $this->admin->audit('quiz.unsubmit', 'quiz', $id, null);
            return $this->detail($id);
        });
    }

    public function check(string $id, array $body): array
    {
        $index = $body['index'] ?? null;
        $checked = $body['checked'] ?? null;
        if (!is_int($index) || !is_bool($checked)) {
            throw ApiError::invalid('invalid_index', [['field' => 'index', 'message' => 'index (integer) and checked (true/false) required']]);
        }
        return Database::transaction($this->db, function () use ($id, $index, $checked): array {
            $row = $this->find($id, true);
            $work = $this->workCopy($row);
            if (!isset($work['questions'][$index])) { throw ApiError::invalid('invalid_index', ['count' => count($work['questions'])]); }
            if ($work['questions'][$index]['checked'] !== $checked) {
                $work['questions'][$index]['checked'] = $checked;
                $this->storeDraft($id, $work);
            }
            if ($checked && $row['current_version_id']) {
                $this->review($id, $row['current_version_id'], 'checked');
            }
            $this->admin->audit('quiz.check', 'quiz', $id, ['index' => $index, 'checked' => $checked]);
            return $this->detail($id);
        });
    }

    public function publish(string $id, array $body): array
    {
        $date = $body['publish_at'] ?? null;
        $today = Competition::londonDate();
        if ($date !== null) {
            $parsed = is_string($date) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $date, new \DateTimeZone('Europe/London')) : false;
            if (!$parsed || $parsed->format('Y-m-d') !== $date || $date < $today) {
                throw ApiError::invalid('invalid_publish_at', ['format' => 'Y-m-d', 'earliest' => $today]);
            }
        }
        return Database::transaction($this->db, function () use ($id, $date, $today): array {
            $row = $this->find($id, true);
            $this->notRetired($row);
            $work = $this->workCopy($row);
            if (count($work['questions']) < 3) { throw ApiError::invalid('not_enough_questions', ['min' => 3]); }
            $unchecked = array_keys(array_filter($work['questions'], static fn(array $q): bool => $q['checked'] !== true));
            if ($unchecked) { throw ApiError::invalid('unchecked_questions', ['indexes' => array_values($unchecked)]); }
            if ($problems = $this->problems($row, $work)) { throw ApiError::invalid('has_problems', $problems); }
            $quiz = $this->contentQuiz($row, $work);
            $categories = array_keys($this->context()['categories']);
            if (Content::validateQuiz($quiz, $categories, $this->context()['tags'], 'quiz')) {
                throw ApiError::invalid('has_problems', $this->problems($row, $work));
            }
            $snapshot = Content::snapshot($quiz);
            $round = Content::roundSize($quiz);
            $current = $row['current_version_id']
                ? Database::one($this->db, 'SELECT id,snapshot,question_count FROM quiz_versions WHERE id=?', [$row['current_version_id']]) : null;
            if ($current && (int) $current['question_count'] === $round
                && Content::same(json_decode($current['snapshot'], true, 512, JSON_THROW_ON_ERROR), $snapshot)) {
                $versionId = $current['id'];
            } else {
                $next = Database::one($this->db, 'SELECT COALESCE(MAX(version),0)+1 AS v FROM quiz_versions WHERE quiz_id=?', [$id]);
                $versionId = Database::uuid();
                Database::execute($this->db, 'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,?,?,?)',
                    [$versionId, $id, (int) $next['v'], json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $round]);
            }
            if ($date === null || $date === $today) {
                // Now, unless an already published quiz keeps its original publish time.
                $publishAt = $row['status'] === 'published' && $row['publish_at'] !== null && $date === null ? $row['publish_at'] : gmdate('Y-m-d H:i:s');
            } else {
                $publishAt = (new \DateTimeImmutable($date . ' 00:00:00', new \DateTimeZone('Europe/London')))
                    ->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s');
            }
            $category = $this->context()['categories'][$quiz['category']];
            Database::execute($this->db,
                "UPDATE quizzes SET title=?,intro=?,category_id=?,difficulty=?,time_limit_seconds=?,shuffle_options=?,question_count=?,
                 age_min=?,age_max=?,curriculum_tags=?,is_ranked=?,current_version_id=?,status='published',publish_at=?,draft=NULL,
                 updated_at=CURRENT_TIMESTAMP(6) WHERE id=?",
                [$quiz['title'], $quiz['intro'], $category, $quiz['difficulty'], $quiz['time_limit_seconds'] ?? null,
                 (int) ($quiz['shuffle_options'] ?? true), $round, $quiz['age_min'] ?? null, $quiz['age_max'] ?? null,
                 json_encode($quiz['curriculum_tags'] ?? [], JSON_THROW_ON_ERROR), (int) ($quiz['is_ranked'] ?? true), $versionId, $publishAt, $id]);
            // As the importer does: a subject shows once something in it is published.
            Database::execute($this->db, 'UPDATE categories SET is_active=1 WHERE id=? AND is_active=0', [$category]);
            // Future dailies already booked for this quiz serve the new version.
            Database::execute($this->db, "UPDATE daily_challenges SET quiz_version_id=? WHERE quiz_id=? AND status='scheduled'", [$versionId, $id]);
            $this->review($id, $versionId, 'published');
            $this->admin->audit('quiz.publish', 'quiz', $id, ['version_id' => $versionId, 'publish_at' => Database::utc($publishAt)]);
            return $this->detail($id);
        });
    }

    public function retire(string $id): array
    {
        return Database::transaction($this->db, function () use ($id): array {
            $row = $this->find($id, true);
            $this->notRetired($row);
            Database::execute($this->db, "UPDATE quizzes SET status='retired',updated_at=CURRENT_TIMESTAMP(6) WHERE id=?", [$id]);
            $dailies = $this->db->prepare("DELETE FROM daily_challenges WHERE quiz_id=? AND status='scheduled' AND challenge_date>=?");
            $dailies->execute([$id, Competition::londonDate()]);
            if ($row['current_version_id']) { $this->review($id, $row['current_version_id'], 'retired'); }
            $this->admin->audit('quiz.retire', 'quiz', $id, ['from' => $row['status'], 'dailies_removed' => $dailies->rowCount()]);
            return $this->detail($id);
        });
    }

    public function restore(string $id): array
    {
        return Database::transaction($this->db, function () use ($id): array {
            $row = $this->find($id, true);
            if ($row['status'] !== 'retired') { throw new ApiError('not_retired', 409); }
            $status = $row['current_version_id'] ? 'published' : 'draft';
            Database::execute($this->db, 'UPDATE quizzes SET status=?,updated_at=CURRENT_TIMESTAMP(6) WHERE id=?', [$status, $id]);
            if ($row['current_version_id']) { $this->review($id, $row['current_version_id'], 'restored'); }
            $this->admin->audit('quiz.restore', 'quiz', $id, ['to' => $status]);
            return $this->detail($id);
        });
    }

    public function discard(string $id): array
    {
        return Database::transaction($this->db, function () use ($id): array {
            $row = $this->find($id, true);
            Database::execute($this->db, "UPDATE quizzes SET draft=NULL,status=IF(status='review','draft',status),updated_at=CURRENT_TIMESTAMP(6) WHERE id=?", [$id]);
            $this->admin->audit('quiz.discard', 'quiz', $id, ['had_draft' => $row['draft'] !== null]);
            return $this->detail($id);
        });
    }

    // ---- Problems (used by Admin's to-do list too) ----

    /** @return list<array{index:?int,field:string,message:string}> */
    public function problems(array $row, array $work): array
    {
        $context = $this->context();
        $quiz = $this->contentQuiz($row, $work);
        $out = [];
        $lines = Content::validateQuiz($quiz, array_keys($context['categories']), $context['tags'], 'quiz');
        $count = count($quiz['questions']);
        if ($count < 3 || $count > self::MAX_QUESTIONS) {
            // validateQuiz stops at the question count; a draft being built still wants each question checked.
            foreach ($quiz['questions'] as $i => $q) {
                $lines = array_merge($lines, is_array($q) ? Content::validateQuestion($q, 'quiz: question ' . ($i + 1)) : []);
            }
        }
        foreach ($lines as $line) {
            $out[] = self::problem($line);
        }
        $today = Competition::londonDate();
        foreach ($quiz['questions'] as $i => $q) {
            if (is_string($q['review_by'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/D', $q['review_by']) && $q['review_by'] < $today) {
                $out[] = ['index' => $i, 'field' => 'review_by', 'message' => 'review-by date has passed; check the facts and set a new date'];
            }
            if (is_string($q['prompt'] ?? null)) {
                $others = array_diff($context['prompts'][Content::promptKey($q['prompt'])] ?? [], [$row['id']]);
                if ($others) {
                    $out[] = ['index' => $i, 'field' => 'prompt', 'message' => 'this question is already in another quiz'];
                }
            }
        }
        return $out;
    }

    /** Draft quiz ids with at least one problem. */
    public function draftsWithProblems(): int
    {
        $count = 0;
        foreach ($this->db->query('SELECT * FROM quizzes WHERE draft IS NOT NULL')->fetchAll() as $row) {
            $count += $this->problems($row, $this->workCopy($row)) ? 1 : 0;
        }
        return $count;
    }

    /** Unchecked questions across quizzes waiting for review. */
    public function uncheckedInReview(): array
    {
        $quizzes = 0;
        $questions = 0;
        foreach ($this->db->query("SELECT * FROM quizzes WHERE status='review' OR JSON_VALUE(draft,'$.review') IN ('true','1')")->fetchAll() as $row) {
            $quizzes++;
            foreach ($this->workCopy($row)['questions'] as $q) { $questions += $q['checked'] ? 0 : 1; }
        }
        return ['quizzes' => $quizzes, 'questions' => $questions];
    }

    private static function problem(string $line): array
    {
        $line = preg_replace('/^quiz: /', '', $line) ?? $line;
        if (preg_match('/^question (\d+): (.*)$/sD', $line, $m)) {
            $message = $m[2];
            $field = match (true) {
                (bool) preg_match('/^(unknown keys)/', $message) => 'question',
                (bool) preg_match('/^(choice|exactly one option|option)/', $message) => 'options',
                (bool) preg_match('/^boolean/', $message) => 'answer',
                (bool) preg_match('/^slider/', $message) => 'slider',
                (bool) preg_match('/^duplicate prompt/', $message) => 'prompt',
                (bool) preg_match('/^(prompt|explanation|source_url|review_by|scene|type)\b/', $message, $f) => $f[1],
                default => 'question',
            };
            return ['index' => (int) $m[1] - 1, 'field' => $field, 'message' => $message];
        }
        preg_match('/^(slug|title|intro|category|difficulty|age_min|curriculum_tags|unknown curriculum tag|time_limit_seconds|shuffle_options|is_ranked|round_size|questions|unknown keys)/', $line, $f);
        $field = match ($f[1] ?? '') {
            'unknown curriculum tag' => 'curriculum_tags', 'age_min' => 'ages', 'unknown keys', '' => 'meta', default => $f[1],
        };
        return ['index' => null, 'field' => $field, 'message' => $line];
    }

    private function context(): array
    {
        if ($this->context === null) {
            $categories = array_column($this->db->query('SELECT slug,id FROM categories')->fetchAll(), 'id', 'slug');
            $tags = $this->db->query('SELECT code FROM curriculum_tags')->fetchAll(\PDO::FETCH_COLUMN);
            $prompts = [];
            foreach ($this->db->query('SELECT q.id,v.snapshot FROM quizzes q JOIN quiz_versions v ON v.id=q.current_version_id')->fetchAll() as $r) {
                foreach (json_decode($r['snapshot'], true) ?: [] as $q) {
                    if (is_string($q['prompt'] ?? null)) { $prompts[Content::promptKey($q['prompt'])][] = $r['id']; }
                }
            }
            $this->context = ['categories' => $categories, 'tags' => $tags, 'prompts' => $prompts];
        }
        return $this->context;
    }

    // ---- Work copy ----

    /**
     * The stored work copy, or one built from the current version (whose questions count as
     * checked: they were reviewed when published), or an empty copy.
     */
    public function workCopy(array $row): array
    {
        if ($row['draft'] !== null) {
            $work = json_decode($row['draft'], true, 64, JSON_THROW_ON_ERROR);
            return ['meta' => self::cleanMeta($work['meta'] ?? []), 'questions' => $work['questions'] ?? [], 'review' => ($work['review'] ?? false) === true];
        }
        $questions = [];
        if ($row['current_version_id']) {
            $version = Database::one($this->db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$row['current_version_id']]);
            $questions = array_map(self::fromSnapshot(...), json_decode($version['snapshot'], true, 512, JSON_THROW_ON_ERROR));
        }
        $category = $row['category_id'] ? Database::one($this->db, 'SELECT slug FROM categories WHERE id=?', [$row['category_id']]) : null;
        $bank = count($questions);
        return ['meta' => [
            'title' => $row['title'], 'intro' => (string) $row['intro'], 'category' => $category['slug'] ?? null,
            'difficulty' => $row['difficulty'], 'age_min' => $row['age_min'] === null ? null : (int) $row['age_min'],
            'age_max' => $row['age_max'] === null ? null : (int) $row['age_max'],
            'curriculum_tags' => json_decode((string) $row['curriculum_tags'], true) ?: [],
            'time_limit_seconds' => $row['time_limit_seconds'] === null ? null : (int) $row['time_limit_seconds'],
            'shuffle_options' => (bool) $row['shuffle_options'], 'is_ranked' => (bool) $row['is_ranked'],
            'round_size' => (int) $row['question_count'] === min(Content::DEFAULT_ROUND, $bank) ? null : (int) $row['question_count'],
        ], 'questions' => $questions, 'review' => false];
    }

    /** A snapshot question back in the content-file shape, plus id and checked. */
    private static function fromSnapshot(array $q): array
    {
        $out = ['id' => $q['id'], 'type' => $q['type'], 'prompt' => $q['prompt']];
        if ($q['type'] === 'choice') {
            $out['options'] = array_map(static fn(array $o): array => ['label' => $o['label'], 'correct' => (bool) $o['is_correct']], $q['options'] ?? []);
        } elseif ($q['type'] === 'boolean') {
            $true = array_values(array_filter($q['options'] ?? [], static fn(array $o): bool => $o['label'] === 'True'))[0] ?? ($q['options'][0] ?? null);
            $out['answer'] = (bool) ($true['is_correct'] ?? false);
        } elseif ($q['type'] === 'slider') {
            $out['slider'] = $q['slider'];
        }
        $out['explanation'] = $q['explanation'] ?? null;
        $out['source_url'] = $q['source_url'] ?? null;
        $out['review_by'] = $q['review_by'] ?? null;
        $out['scene'] = $q['scene'] ?? null;
        $out['checked'] = true;
        return $out;
    }

    /** The content-file quiz Content validates and snapshots. */
    private function contentQuiz(array $row, array $work): array
    {
        $quiz = ['slug' => $row['slug']];
        foreach (self::META_KEYS as $key) {
            if (array_key_exists($key, $work['meta']) && !($key === 'round_size' && $work['meta'][$key] === null)) {
                $quiz[$key] = $work['meta'][$key];
            }
        }
        $quiz['questions'] = array_map(self::contentQuestion(...), $work['questions']);
        return $quiz;
    }

    private static function contentQuestion(array $q): array
    {
        unset($q['id'], $q['checked'], $q['stats'], $q['scene_default']);
        if (array_key_exists('scene', $q) && $q['scene'] === null) { unset($q['scene']); }
        return $q;
    }

    /**
     * Incoming questions for the work copy. A question keeps its checked flag only when it comes
     * back unchanged under its id; anything new or edited needs checking again.
     */
    private function incoming(mixed $questions, array $previous): array
    {
        if (!is_array($questions) || !array_is_list($questions)) {
            throw ApiError::invalid('invalid_questions', [['field' => 'questions', 'message' => 'questions must be a list']]);
        }
        if (count($questions) > self::MAX_QUESTIONS) {
            throw ApiError::invalid('too_many_questions', ['max' => self::MAX_QUESTIONS]);
        }
        $before = array_column($previous, null, 'id');
        $seen = [];
        $out = [];
        foreach ($questions as $i => $q) {
            if (!is_array($q) || ($q && array_is_list($q))) {
                throw ApiError::invalid('invalid_questions', [['index' => $i, 'field' => 'question', 'message' => 'each question must be an object']]);
            }
            $id = is_string($q['id'] ?? null) && Admin::isUuid($q['id']) && !isset($seen[$q['id']]) ? $q['id'] : Database::uuid();
            $seen[$id] = true;
            $clean = self::contentQuestion($q);
            $old = $before[$id] ?? null;
            $checked = $old !== null && $old['checked'] === true && Content::same($clean, self::contentQuestion($old));
            $out[] = ['id' => $id] + $clean + ['scene' => null, 'checked' => $checked];
        }
        return $out;
    }

    /** Keeps the known meta keys; their values are checked as problems, not refused. */
    private static function cleanMeta(array $meta): array
    {
        if (array_key_exists('ks', $meta)) {
            $tags = array_values(array_filter(is_array($meta['curriculum_tags'] ?? null) ? $meta['curriculum_tags'] : [],
                static fn($t): bool => !in_array($t, self::KS, true)));
            if (isset(self::KS[$meta['ks']])) { $tags[] = self::KS[$meta['ks']]; }
            $meta['curriculum_tags'] = $tags;
        }
        $out = [];
        foreach (self::META_KEYS as $key) { $out[$key] = $meta[$key] ?? null; }
        $out['curriculum_tags'] ??= [];
        return $out;
    }

    /** Runs one locked work-copy edit, stores it and returns the fresh detail. */
    private function write(string $id, string $action, callable $edit): array
    {
        return Database::transaction($this->db, function () use ($id, $action, $edit): array {
            $row = $this->find($id, true);
            [$work, $detail] = $edit($row, $this->workCopy($row));
            $this->storeDraft($id, $work);
            if ($row['status'] === 'review') {
                Database::execute($this->db, "UPDATE quizzes SET status='draft' WHERE id=?", [$id]);
            }
            if (in_array($row['status'], ['draft', 'review'], true)) {
                // Not live: keep the list columns in step so filters and titles show the work copy.
                $meta = $work['meta'];
                $category = is_string($meta['category']) ? ($this->context()['categories'][$meta['category']] ?? null) : null;
                $title = self::cleanText($meta['title'], 255);
                Database::execute($this->db, 'UPDATE quizzes SET title=COALESCE(?,title),category_id=COALESCE(?,category_id),curriculum_tags=? WHERE id=?',
                    [$title, $category, json_encode(array_values(array_filter(is_array($meta['curriculum_tags']) ? $meta['curriculum_tags'] : [], 'is_string')), JSON_THROW_ON_ERROR), $id]);
            }
            $this->admin->audit($action, 'quiz', $id, $detail);
            return $this->detail($id);
        });
    }

    private function storeDraft(string $id, array $work): void
    {
        Database::execute($this->db, 'UPDATE quizzes SET draft=?,updated_at=CURRENT_TIMESTAMP(6) WHERE id=?', [self::encode($work), $id]);
    }

    private function review(string $quizId, string $versionId, string $action): void
    {
        Database::execute($this->db, 'INSERT INTO content_reviews (id,quiz_id,quiz_version_id,reviewed_by,action) VALUES (?,?,?,?,?)',
            [Database::uuid(), $quizId, $versionId, $this->admin->reviewerName(), $action]);
    }

    private function find(string $id, bool $lock = false): array
    {
        $row = Database::one($this->db, 'SELECT * FROM quizzes WHERE id=?' . ($lock ? ' FOR UPDATE' : ''), [$id]);
        if (!$row) { throw new ApiError('quiz_not_found', 404); }
        return $row;
    }

    private function notRetired(array $row): void
    {
        if ($row['status'] === 'retired') { throw new ApiError('quiz_retired', 409); }
    }

    /** Unique kebab-case slug from a title, avoiding API routes and backend/content file names. */
    private function uniqueSlug(string $title): string
    {
        $base = strtolower(trim((string) preg_replace('/[^a-z0-9]+/i', '-', (string) iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $title)), '-'));
        $base = trim(substr($base === '' ? 'quiz' : $base, 0, 90), '-');
        $dir = dirname(__DIR__) . '/content/';
        for ($n = 1; $n < 1000; $n++) {
            $slug = $n === 1 ? $base : "$base-$n";
            if (in_array($slug, Content::RESERVED_SLUGS, true) || is_file($dir . $slug . '.json')) { continue; }
            if (!Database::one($this->db, 'SELECT id FROM quizzes WHERE slug=?', [$slug])) { return $slug; }
        }
        throw new ApiError('slug_unavailable', 409);
    }

    public static function ks(array $tags): ?string
    {
        foreach (self::KS as $label => $code) {
            if (in_array($code, $tags, true)) { return $label; }
        }
        return null;
    }

    public static function cleanText(mixed $v, int $max): ?string
    {
        if (!is_string($v)) { return null; }
        $v = trim($v);
        return $v === '' || mb_strlen($v) > $max || preg_match('/[\x00-\x1F\x7F]/', $v) ? null : $v;
    }

    private static function encode(array $work): string
    {
        return json_encode($work, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
