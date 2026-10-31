<?php
declare(strict_types=1);

namespace Dyk;

/**
 * Player feedback and the admin inbox.
 *
 * POST /feedback (guest or Clerk session; 10 per hour per profile, then 429 rate_limited)
 *   body {"type":"feedback"|"question"|"idea"|"problem","presets":[string],
 *         "quiz_slug"?:string,"question_id"?:uuid,"message"?:string,"email"?:string}
 *   201 {"id":uuid}
 *   422 invalid_feedback {details:[{field,message}]} | free_text_not_allowed | quiz_not_found | question_not_found
 * Presets come only from PRESETS for the type. Without free text at least one preset is needed.
 * Free text (message 10-1000 characters AND a valid email) is accepted only from a profile with a
 * Clerk identity or an age band of 13_17 or 18_plus: children never send free text or an email.
 * question_id must be in the current version of quiz_slug; its prompt is stored with the feedback.
 *
 * Admin (under /admin, see Admin):
 *   GET  /admin/feedback?status=new|open|resolved&type=...&limit=1..200 (default 100)
 *        200 {"items":[{id,kind,type,presets,message,has_email,quiz:{slug,title}|null,question_id,
 *                        question_prompt,status,created_at,updated_at,messages}]}  newest first
 *   GET  /admin/feedback/{id}  200 {..same fields.., "email":string|null,
 *        "thread":[{id,kind:"reply"|"note",body,emailed,author:nickname|null,created_at}]}   404 feedback_not_found
 *   POST /admin/feedback/{id}/reply {body}  adult feedback only (422 not_adult_feedback); emails the
 *        player with mail() only when config mail_from is set. Moves new to open.
 *        200 {"id":uuid,"emailed":bool,"status":"open"|"resolved"}
 *   POST /admin/feedback/{id}/note {body}  private note. 200 {"id":uuid}
 *   POST /admin/feedback/{id}/status {status:new|open|resolved}  200 {"status":...}
 *   body: 1-5000 characters (422 invalid_body).
 */
final class Feedback
{
    public const TYPES = ['feedback', 'question', 'idea', 'problem'];
    public const STATUSES = ['new', 'open', 'resolved'];
    /** Copy exactly in the frontend: these strings are the stored values. */
    public const PRESETS = [
        'feedback' => ['I loved it', 'Too hard', 'Too easy', 'More space quizzes please', 'More animal quizzes please'],
        'question' => ['The answer looks wrong', 'The question is confusing', 'There’s a spelling mistake'],
        'problem' => ['Something isn’t working', 'The page is slow', 'I can’t find my score'],
        'idea' => ['A new subject', 'More daily challenges', 'More characters'],
    ];

    public function __construct(private readonly \PDO $db) {}

    public function submit(array $profile, array $input): array
    {
        $problems = [];
        if ($extra = array_diff(array_keys($input), ['type', 'presets', 'quiz_slug', 'question_id', 'message', 'email'])) {
            $problems[] = ['field' => 'body', 'message' => 'unknown keys ' . implode(', ', $extra)];
        }
        $type = $input['type'] ?? null;
        if (!is_string($type) || !in_array($type, self::TYPES, true)) {
            throw ApiError::invalid('invalid_feedback', [['field' => 'type', 'message' => 'type must be one of ' . implode(', ', self::TYPES)]]);
        }
        $presets = $input['presets'] ?? [];
        if (!is_array($presets) || !array_is_list($presets) || count($presets) > count(self::PRESETS[$type])
            || count($presets) !== count(array_unique($presets, SORT_REGULAR))) {
            $problems[] = ['field' => 'presets', 'message' => 'presets must be a list of distinct choices'];
            $presets = [];
        }
        foreach ($presets as $preset) {
            if (!is_string($preset) || !in_array($preset, self::PRESETS[$type], true)) {
                $problems[] = ['field' => 'presets', 'message' => 'unknown choice for this type'];
                break;
            }
        }
        $message = $input['message'] ?? null;
        $email = $input['email'] ?? null;
        $freeText = $message !== null || $email !== null;
        if ($freeText && !$this->mayWrite($profile)) {
            // Checked before anything about the text itself, so nothing typed by a child is examined.
            throw ApiError::invalid('free_text_not_allowed');
        }
        if ($freeText) {
            $message = is_string($message) ? trim($message) : null;
            if ($message === null || mb_strlen($message) < 10 || mb_strlen($message) > 1000 || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $message)) {
                $problems[] = ['field' => 'message', 'message' => 'message must be 10-1000 characters'];
            }
            $email = is_string($email) ? trim($email) : null;
            if ($email === null || strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                $problems[] = ['field' => 'email', 'message' => 'a valid email address is needed for a reply'];
            }
        } elseif (!$presets) {
            $problems[] = ['field' => 'presets', 'message' => 'choose at least one option'];
        }
        $slug = $input['quiz_slug'] ?? null;
        $questionId = $input['question_id'] ?? null;
        if ($slug !== null && (!is_string($slug) || !preg_match('/^[a-z0-9-]{1,100}$/D', $slug))) {
            $problems[] = ['field' => 'quiz_slug', 'message' => 'quiz_slug must be a quiz slug'];
        }
        if ($questionId !== null && (!is_string($questionId) || !Admin::isUuid($questionId) || $slug === null)) {
            $problems[] = ['field' => 'question_id', 'message' => 'question_id must be a question id with its quiz_slug'];
        }
        if ($problems) {
            throw ApiError::invalid('invalid_feedback', $problems);
        }
        $quizId = null;
        $prompt = null;
        if ($slug !== null) {
            $quiz = Database::one($this->db, 'SELECT q.id,v.snapshot FROM quizzes q LEFT JOIN quiz_versions v ON v.id=q.current_version_id
                WHERE q.slug=? AND ' . Catalog::LIVE, [$slug]);
            if (!$quiz) { throw ApiError::invalid('quiz_not_found'); }
            $quizId = $quiz['id'];
            if ($questionId !== null) {
                foreach (json_decode((string) $quiz['snapshot'], true) ?: [] as $q) {
                    if (($q['id'] ?? null) === $questionId) { $prompt = mb_substr((string) $q['prompt'], 0, 300); }
                }
                if ($prompt === null) { throw ApiError::invalid('question_not_found'); }
            }
        }
        $id = Database::uuid();
        Database::execute($this->db,
            'INSERT INTO feedback (id,profile_id,kind,type,presets,message,email,quiz_id,question_id,question_prompt) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [$id, $profile['id'], $freeText ? 'adult' : 'player', $type, json_encode($presets, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
             $freeText ? $message : null, $freeText ? $email : null, $quizId, $prompt === null ? null : $questionId, $prompt]);
        return ['id' => $id];
    }

    /** Adults (a Clerk identity) and teenagers or adults by age band may write; nobody else. */
    private function mayWrite(array $profile): bool
    {
        if (in_array($profile['age_band'] ?? null, ['13_17', '18_plus'], true)) {
            return true;
        }
        return Database::one($this->db, "SELECT 1 AS ok FROM identities WHERE profile_id=? AND provider='clerk'", [$profile['id']]) !== null;
    }

    // ---- Admin ----

    public function adminList(array $query): array
    {
        $sql = 'SELECT f.*,q.slug AS quiz_slug,q.title AS quiz_title,(SELECT COUNT(*) FROM feedback_messages m WHERE m.feedback_id=f.id) AS messages
            FROM feedback f LEFT JOIN quizzes q ON q.id=f.quiz_id WHERE 1=1';
        $args = [];
        $status = Admin::queryEnum($query, 'status', self::STATUSES);
        $type = Admin::queryEnum($query, 'type', self::TYPES);
        if ($status !== null) { $sql .= ' AND f.status=?'; $args[] = $status; }
        if ($type !== null) { $sql .= ' AND f.type=?'; $args[] = $type; }
        $statement = $this->db->prepare($sql . ' ORDER BY f.created_at DESC,f.id LIMIT ' . Admin::queryLimit($query, 100, 200));
        $statement->execute($args);
        return ['items' => array_map(fn(array $r): array => $this->row($r), $statement->fetchAll())];
    }

    public function adminDetail(string $id): array
    {
        $row = $this->find($id);
        $out = $this->row($row);
        $out['email'] = $row['email'];
        $statement = $this->db->prepare('SELECT m.id,m.kind,m.body,m.emailed,m.created_at,p.nickname FROM feedback_messages m
            LEFT JOIN profiles p ON p.id=m.author_id WHERE m.feedback_id=? ORDER BY m.created_at,m.id');
        $statement->execute([$id]);
        $out['thread'] = array_map(static fn(array $m): array => ['id' => $m['id'], 'kind' => $m['kind'], 'body' => $m['body'],
            'emailed' => (bool) $m['emailed'], 'author' => $m['nickname'], 'created_at' => Database::utc($m['created_at'])], $statement->fetchAll());
        return $out;
    }

    public function reply(Admin $admin, array $config, string $id, array $body): array
    {
        $text = self::body($body);
        return Database::transaction($this->db, function () use ($admin, $config, $id, $text): array {
            $row = $this->find($id, true);
            if ($row['kind'] !== 'adult' || $row['email'] === null) { throw ApiError::invalid('not_adult_feedback'); }
            $from = $config['mail_from'] ?? '';
            $emailed = false;
            if (is_string($from) && $from !== '' && filter_var($from, FILTER_VALIDATE_EMAIL) !== false) {
                // Both addresses are validated, so no header can be injected. Plain text only.
                $emailed = mail($row['email'], 'Reply from Do You Know', $text . "\n\n— Do You Know (doyouknow.space)\n",
                    ['From' => $from, 'Content-Type' => 'text/plain; charset=utf-8']);
            }
            $messageId = Database::uuid();
            Database::execute($this->db, "INSERT INTO feedback_messages (id,feedback_id,kind,body,author_id,emailed) VALUES (?,?,'reply',?,?,?)",
                [$messageId, $id, $text, $admin->profileId(), (int) $emailed]);
            $status = $row['status'] === 'new' ? 'open' : $row['status'];
            Database::execute($this->db, 'UPDATE feedback SET status=?,updated_at=CURRENT_TIMESTAMP(6) WHERE id=?', [$status, $id]);
            // The feedback id only: never the address.
            $admin->audit('feedback.reply', 'feedback', $id, ['emailed' => $emailed]);
            return ['id' => $messageId, 'emailed' => $emailed, 'status' => $status];
        });
    }

    public function note(Admin $admin, string $id, array $body): array
    {
        $text = self::body($body);
        return Database::transaction($this->db, function () use ($admin, $id, $text): array {
            $this->find($id, true);
            $messageId = Database::uuid();
            Database::execute($this->db, "INSERT INTO feedback_messages (id,feedback_id,kind,body,author_id) VALUES (?,?,'note',?,?)",
                [$messageId, $id, $text, $admin->profileId()]);
            Database::execute($this->db, 'UPDATE feedback SET updated_at=CURRENT_TIMESTAMP(6) WHERE id=?', [$id]);
            $admin->audit('feedback.note', 'feedback', $id, null);
            return ['id' => $messageId];
        });
    }

    public function setStatus(Admin $admin, string $id, array $body): array
    {
        $status = $body['status'] ?? null;
        if (!is_string($status) || !in_array($status, self::STATUSES, true)) {
            throw ApiError::invalid('invalid_status', ['allowed' => self::STATUSES]);
        }
        return Database::transaction($this->db, function () use ($admin, $id, $status): array {
            $row = $this->find($id, true);
            Database::execute($this->db, 'UPDATE feedback SET status=?,updated_at=CURRENT_TIMESTAMP(6) WHERE id=?', [$status, $id]);
            $admin->audit('feedback.status', 'feedback', $id, ['from' => $row['status'], 'to' => $status]);
            return ['status' => $status];
        });
    }

    private static function body(array $body): string
    {
        $text = $body['body'] ?? null;
        $text = is_string($text) ? trim($text) : '';
        if ($text === '' || mb_strlen($text) > 5000 || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $text)) {
            throw ApiError::invalid('invalid_body', ['max' => 5000]);
        }
        return $text;
    }

    private function find(string $id, bool $lock = false): array
    {
        $row = Database::one($this->db, $lock ? 'SELECT * FROM feedback WHERE id=? FOR UPDATE'
            : 'SELECT f.*,q.slug AS quiz_slug,q.title AS quiz_title,
            (SELECT COUNT(*) FROM feedback_messages m WHERE m.feedback_id=f.id) AS messages
            FROM feedback f LEFT JOIN quizzes q ON q.id=f.quiz_id WHERE f.id=?', [$id]);
        if (!$row) { throw new ApiError('feedback_not_found', 404); }
        return $row;
    }

    private function row(array $r): array
    {
        return ['id' => $r['id'], 'kind' => $r['kind'], 'type' => $r['type'],
            'presets' => json_decode($r['presets'], true, 8, JSON_THROW_ON_ERROR), 'message' => $r['message'],
            'has_email' => $r['email'] !== null,
            'quiz' => $r['quiz_slug'] === null ? null : ['slug' => $r['quiz_slug'], 'title' => $r['quiz_title']],
            'question_id' => $r['question_id'], 'question_prompt' => $r['question_prompt'], 'status' => $r['status'],
            'created_at' => Database::utc($r['created_at']), 'updated_at' => Database::utc($r['updated_at']),
            'messages' => (int) $r['messages']];
    }
}
