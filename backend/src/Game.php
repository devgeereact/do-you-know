<?php
declare(strict_types=1);
namespace Dyk;
final class Game
{
    /**
     * $handleKey is a server secret. Players see option handles keyed on it and the attempt, never the
     * snapshot ids, which are an unkeyed hash of the authored position (and so of the right answer).
     */
    public function __construct(private readonly \PDO $db, private readonly string $userId, private readonly string $handleKey) {}

    /** The id a player sees for one option in one attempt. */
    private function handle(string $attemptId, string $optionId): string
    {
        $h = hash_hmac('sha256', $attemptId . '|' . $optionId, $this->handleKey);
        return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' . substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20, 12);
    }

    /** What a player may see before answering. $categoryScene feeds the cosmetic scene only. */
    public static function publicQuestion(array $q, ?string $categoryScene = null, ?string $quizTitle = null): array
    {
        $slider = $q['slider'] ?? null;
        $out = [
            'id' => $q['id'], 'type' => $q['type'], 'prompt' => $q['prompt'],
            'image_url' => $q['image_url'] ?? null, 'scene' => Content::sceneFor($q, $categoryScene, $q['id'], $quizTitle),
            'options' => array_map(fn(array $o): array => ['id' => $o['id'], 'label' => $o['label']], $q['options'] ?? []),
            'slider' => $slider ? ['min' => $slider['min'], 'max' => $slider['max'], 'step' => $slider['step'], 'unit' => $slider['unit'] ?? null] : null,
        ];
        if ($q['type'] === 'build') {
            // Slots and tiles only. The accepted sequences stay on the server; the spoken word is sent only for dictation.
            $b = $q['build'];
            $out['build'] = ['variant' => $b['variant'], 'slots' => count($b['answers'][0]),
                'tiles' => array_map(static fn(array $t): array => ['id' => $t['id'], 'label' => $t['label']], $b['tiles'])]
                + (isset($b['template']) ? ['template' => $b['template']] : [])
                + (isset($b['speak']) ? ['speak' => $b['speak']] : []);
        }
        if ($q['type'] === 'assign') {
            // Items and targets only. Which item belongs to which target (the key) stays on the server.
            $a = $q['assign'];
            $out['assign'] = ['variant' => $a['variant'],
                'items' => array_map(static fn(array $i): array => ['id' => $i['id'], 'label' => $i['label']], $a['items']),
                'targets' => array_map(static fn(array $t): array => ['id' => $t['id'], 'label' => $t['label']], $a['targets'])];
        }
        return $out;
    }

    private function transaction(callable $fn): array
    {
        return Database::transaction($this->db, function () use ($fn): array {
            // Consistent profile-before-attempt lock order across every game action.
            $profile = Database::one($this->db, 'SELECT id FROM profiles WHERE id=? FOR UPDATE', [$this->userId]);
            if (!$profile) { throw new ApiError('not_signed_in', 401); }
            return $fn();
        });
    }

    private function attempt(string $id): array
    {
        $a = Database::one($this->db, 'SELECT * FROM attempts WHERE id=? AND user_id=? FOR UPDATE', [$id, $this->userId]);
        if (!$a) { throw new ApiError('attempt_not_found', 404); }
        return $a;
    }

    /**
     * Where each question of a daily hand came from: position => the immutable version that held it. A
     * daily hand mixes quizzes, so the attempt's own version is only the day's anchor. Empty for every
     * other mode (and for a daily started before hands were dealt), which read the attempt's version.
     *
     * @return array<int,string>
     */
    private function dealtVersions(array $a): array
    {
        if ($a['daily_challenge_id'] === null) { return []; }
        $s = $this->db->prepare('SELECT position,quiz_version_id FROM daily_deals WHERE attempt_id=?');
        $s->execute([$a['id']]);
        return array_column($s->fetchAll(), 'quiz_version_id', 'position');
    }

    private function currentVersion(array $a): string
    {
        return $this->dealtVersions($a)[(int) $a['current_index'] + 1] ?? $a['quiz_version_id'];
    }

    private function question(array $a): array
    {
        $version = Database::one($this->db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$this->currentVersion($a)]);
        $questions = json_decode($version['snapshot'], true, 512, JSON_THROW_ON_ERROR);
        $order = json_decode($a['question_order'], true, 512, JSON_THROW_ON_ERROR);
        $qid = $order[(int)$a['current_index']] ?? null;
        foreach ($questions as $q) { if ($q['id'] === $qid) { return $q; } }
        throw new \RuntimeException('snapshot_question_missing');
    }

    private function state(array $a): array
    {
        $quiz = Database::one($this->db, 'SELECT q.slug,q.title,c.scene FROM quizzes q LEFT JOIN categories c ON c.id=q.category_id WHERE q.id=?', [$a['quiz_id']]);
        $total = count(json_decode($a['question_order'], true, 512, JSON_THROW_ON_ERROR));
        $complete = (int)$a['answered_count'] >= $total;
        $q = null;
        if (!$complete && $a['current_sent_at'] !== null) {
            // A daily question wears the scene of the quiz it came from, not the day's anchor quiz.
            $source = $a['daily_challenge_id'] === null ? $quiz : (Database::one($this->db,
                'SELECT q.title,c.scene FROM quiz_versions v JOIN quizzes q ON q.id=v.quiz_id LEFT JOIN categories c ON c.id=q.category_id WHERE v.id=?',
                [$this->currentVersion($a)]) ?? $quiz);
            $q = self::publicQuestion($this->question($a), $source['scene'], $source['title']);
        }
        if ($q) {
            foreach ($q['options'] as $i => $o) { $q['options'][$i]['id'] = $this->handle($a['id'], $o['id']); }
            // Ordering by the keyed handle: a player cannot recompute it from what they are sent.
            if ($a['shuffle_options']) { usort($q['options'], static fn(array $left, array $right): int => strcmp($left['id'], $right['id'])); }
            if (isset($q['build'])) {
                // Tiles are always in handle order, whatever the quiz says: the file lists them in an order a child could read.
                foreach ($q['build']['tiles'] as $i => $t) { $q['build']['tiles'][$i]['id'] = $this->handle($a['id'], $t['id']); }
                usort($q['build']['tiles'], static fn(array $left, array $right): int => strcmp($left['id'], $right['id']));
            }
            if (isset($q['assign'])) {
                // Items and targets get keyed handles and are always in handle order, so neither the order nor the ids give the key away.
                foreach (['items', 'targets'] as $part) {
                    foreach ($q['assign'][$part] as $i => $x) { $q['assign'][$part][$i]['id'] = $this->handle($a['id'], $x['id']); }
                    usort($q['assign'][$part], static fn(array $left, array $right): int => strcmp($left['id'], $right['id']));
                }
            }
        }
        $deadline = $a['current_sent_at'] !== null && $a['time_limit_seconds'] !== null
            ? (new \DateTimeImmutable($a['current_sent_at'], new \DateTimeZone('UTC')))->modify('+' . (int) $a['time_limit_seconds'] . ' seconds')->format('Y-m-d\TH:i:s.v\Z')
            : null;
        $clock = Database::one($this->db, 'SELECT UTC_TIMESTAMP(6) AS now');
        return [
            'attempt_id' => $a['id'], 'mode' => $a['mode'], 'status' => $a['status'],
            'quiz' => ['slug' => $quiz['slug'], 'title' => $quiz['title']],
            'position' => min((int)$a['current_index']+1, $total), 'total' => $total,
            'answered' => (int)$a['answered_count'], 'correct' => (int)$a['correct_count'],
            'awaiting_next' => !$complete && $a['current_sent_at'] === null,
            'complete' => $complete, 'time_limit_seconds' => $a['time_limit_seconds'],
            'question' => $q, 'server_now' => Database::utc($clock['now']), 'question_deadline' => $deadline,
        ];
    }

    public function start(array $input): array
    {
        $mode = $input['mode'] ?? 'practice';
        if (!in_array($mode, ['practice', 'ranked', 'daily', 'challenge'], true)) {
            throw new ApiError('invalid_mode');
        }
        if ($mode === 'daily') {
            Daily::ensureToday($this->db);
        }
        return $this->transaction(function () use ($input, $mode): array {
            $daily = null;
            $challenge = null;
            $hand = null;
            if ($mode === 'daily') {
                // The lock keeps deals one at a time: two players starting together cannot take one question.
                $daily = Database::one($this->db,
                    "SELECT * FROM daily_challenges WHERE challenge_date=? AND status='live' FOR UPDATE", [Competition::londonDate()]);
                if (!$daily) { throw new ApiError('no_daily_today'); }
                $quizId = $daily['quiz_id'];
                $versionId = $daily['quiz_version_id'];
            } elseif ($mode === 'challenge') {
                $code = $input['challenge_code'] ?? null;
                if (!is_string($code) || !preg_match('/^[A-Za-z0-9]{8}$/D', $code)) {
                    throw new ApiError('challenge_not_found');
                }
                $challenge = Database::one($this->db,
                    'SELECT * FROM friend_challenges WHERE code=? AND expires_at>UTC_TIMESTAMP(6)', [$code]);
                if (!$challenge) { throw new ApiError('challenge_not_found'); }
                if ($challenge['creator_id'] === $this->userId) { throw new ApiError('own_challenge'); }
                $quizId = $challenge['quiz_id'];
                $versionId = $challenge['quiz_version_id'];
            } else {
                $slug = $input['quiz_slug'] ?? null;
                if (!is_string($slug) || !preg_match('/^[a-z0-9-]{1,100}$/D', $slug)) {
                    throw new ApiError('quiz_not_found', 404);
                }
                $found = Database::one($this->db, 'SELECT q.id,q.current_version_id FROM quizzes q WHERE q.slug=? AND ' . Catalog::LIVE, [$slug]);
                if (!$found || !$found['current_version_id']) { throw new ApiError('quiz_not_found', 404); }
                $quizId = $found['id'];
                $versionId = $found['current_version_id'];
            }
            $quiz = Database::one($this->db, 'SELECT q.* FROM quizzes q WHERE q.id=? AND ' . Catalog::LIVE, [$quizId]);
            if (!$quiz) { throw new ApiError('quiz_not_found', 404); }
            if ($mode === 'ranked' && !$quiz['is_ranked']) { $mode = 'practice'; }
            $existing = $daily
                ? Database::one($this->db, 'SELECT * FROM attempts WHERE user_id=? AND daily_challenge_id=? FOR UPDATE', [$this->userId, $daily['id']])
                : Database::one($this->db,
                    "SELECT * FROM attempts WHERE user_id=? AND quiz_version_id=? AND mode=? AND friend_challenge_id <=> ?
                     AND status='in_progress' AND started_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 24 HOUR) ORDER BY started_at DESC LIMIT 1 FOR UPDATE",
                    [$this->userId, $versionId, $mode, $challenge['id'] ?? null]);
            if ($existing) {
                if ($existing['status'] !== 'in_progress') { throw new ApiError('daily_already_played'); }
                if ($existing['current_sent_at'] === null && (int) $existing['current_index'] < count(json_decode($existing['question_order'], true))) {
                    Database::execute($this->db, 'UPDATE attempts SET current_sent_at=UTC_TIMESTAMP(6) WHERE id=?', [$existing['id']]);
                }
                return $this->state($this->attempt($existing['id']));
            }
            $count = Database::one($this->db, 'SELECT COUNT(*) AS n FROM attempts WHERE user_id=? AND started_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 MINUTE)', [$this->userId]);
            if ((int) $count['n'] >= 5) { throw new ApiError('too_many_attempts', 429); }
            $version = Database::one($this->db, 'SELECT * FROM quiz_versions WHERE id=? AND quiz_id=?', [$versionId, $quizId]);
            if (!$version) { throw new \RuntimeException('quiz_version_missing'); }
            $snapshot = json_decode($version['snapshot'], true, 512, JSON_THROW_ON_ERROR);
            if (count($snapshot) < (int) $version['question_count'] || (int) $version['question_count'] < 3 || (int) $version['question_count'] > 50) {
                throw new \RuntimeException('quiz_snapshot_invalid');
            }
            if ($challenge) {
                $creator = Database::one($this->db, "SELECT question_order,time_limit_seconds,shuffle_options FROM attempts WHERE id=? AND status='finished'", [$challenge['creator_attempt_id']]);
                if (!$creator) { throw new ApiError('challenge_not_found'); }
                $order = json_decode($creator['question_order'], true, 512, JSON_THROW_ON_ERROR);
                $timer = $creator['time_limit_seconds'];
                $shuffle = $creator['shuffle_options'];
            } else {
                // Dictation speaks its answer, so it is practice only: never in a ranked round (or the daily).
                $ids = array_column($mode === 'ranked' ? array_filter($snapshot, static fn(array $q): bool => !Content::isDictation($q)) : $snapshot, 'id');
                if (count($ids) < 3) { throw new \RuntimeException('quiz_snapshot_invalid'); }
                $hand = $daily ? $this->dealDaily($daily['id']) : null;
                $order = $hand !== null
                    ? array_column($hand, 'question')
                    : self::pickRound($ids, self::roundSize($mode, (int) $version['question_count'], count($ids)), $this->servedHistory($quizId));
                // Children are not timed by default. The quiz's timer applies only when the request asks for
                // it ("timed": true), which the parent switch "Beat the clock" will send (P4).
                $timer = ($input['timed'] ?? false) === true ? $quiz['time_limit_seconds'] : null;
                $shuffle = $quiz['shuffle_options'];
            }
            $id = Database::uuid();
            Database::execute($this->db,
                'INSERT INTO attempts (id,user_id,quiz_id,quiz_version_id,mode,daily_challenge_id,friend_challenge_id,time_limit_seconds,shuffle_options,question_order,current_sent_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',
                [$id, $this->userId, $quizId, $versionId, $mode, $daily['id'] ?? null, $challenge['id'] ?? null, $timer, (int) $shuffle, json_encode($order, JSON_THROW_ON_ERROR)]);
            foreach ($hand ?? [] as $i => $card) {
                Database::execute($this->db,
                    'INSERT INTO daily_deals (attempt_id,position,daily_challenge_id,quiz_version_id,question_id,deal_no) VALUES (?,?,?,?,?,?)',
                    [$id, $i + 1, $daily['id'], $card['version'], $card['question'], $card['deal']]);
            }
            return $this->state($this->attempt($id));
        });
    }

    /** Questions in one player's daily hand. */
    public const DAILY_ROUND = 10;

    /**
     * One player's hand for today's daily: DAILY_ROUND questions drawn from every live quiz that children
     * may see (adult 18+ quizzes are left out). The least-dealt questions go first, so no two players hold
     * the same question until the whole bank has been dealt once; after that a second lap begins. The
     * caller holds the day's row lock, which makes deals one at a time, and the unique key on
     * daily_deals refuses a duplicate even if that lock were ever skipped.
     *
     * @return list<array{version:string,question:string,deal:int}>
     */
    private function dealDaily(string $dailyId): array
    {
        // A bank question counts once even if two quizzes carry the same id. Only ids are read here,
        // so no prompt or answer leaves the database.
        $bank = $this->db->prepare(
            "SELECT q.current_version_id AS version_id,jt.qid FROM quizzes q
             JOIN quiz_versions v ON v.id=q.current_version_id AND v.quiz_id=q.id
             JOIN JSON_TABLE(v.snapshot,'$[*]' COLUMNS (qid CHAR(36) PATH '$.id', speak VARCHAR(80) PATH '$.build.speak')) AS jt
             WHERE " . Catalog::LIVE . ' AND jt.speak IS NULL AND (q.age_min IS NULL OR q.age_min<18) ORDER BY q.id,jt.qid');
        $bank->execute();
        $versionOf = [];
        foreach ($bank->fetchAll() as $row) { $versionOf[$row['qid']] ??= $row['version_id']; }
        if (count($versionOf) < 3) { throw new ApiError('no_daily_today'); }

        $dealt = $this->db->prepare('SELECT question_id,COUNT(*) AS n FROM daily_deals WHERE daily_challenge_id=? GROUP BY question_id');
        $dealt->execute([$dailyId]);
        $times = array_column($dealt->fetchAll(), 'n', 'question_id');

        $ids = array_keys($versionOf);
        shuffle($ids);
        // Stable sort: least dealt first, and the shuffle decides between equals.
        usort($ids, static fn(string $a, string $b): int => ((int) ($times[$a] ?? 0)) <=> ((int) ($times[$b] ?? 0)));
        $picked = array_slice($ids, 0, min(self::DAILY_ROUND, count($ids)));
        shuffle($picked);
        return array_map(static fn(string $qid): array => ['version' => $versionOf[$qid], 'question' => $qid, 'deal' => (int) ($times[$qid] ?? 0) + 1], $picked);
    }

    /**
     * The daily round used when every player got the same questions: sorted by a hash of the date and
     * question id. No longer used to deal a daily (see dealDaily); kept for the tests that pin its shape.
     *
     * @param list<string> $ids every question ID in the pinned version
     * @return list<string>
     */
    public static function dailyOrder(array $ids, string $date, int $size): array
    {
        usort($ids, static fn(string $a, string $b): int =>
            strcmp(hash('sha256', $date . '|' . $a), hash('sha256', $date . '|' . $b)) ?: strcmp($a, $b));
        return array_slice($ids, 0, $size);
    }

    /** Questions in a ranked round, drawn at random from the quiz's bank. */
    public const RANKED_ROUND = 20;

    /** Practice uses the quiz's own round size; ranked uses RANKED_ROUND, or the whole bank if smaller. */
    public static function roundSize(string $mode, int $quizRound, int $bank): int
    {
        return $mode === 'ranked' ? min(self::RANKED_ROUND, $bank) : $quizRound;
    }

    /**
     * Question IDs this player has already been shown for a quiz, one list per attempt, newest
     * attempt first. Only questions actually served count: the answered ones plus the one on screen.
     */
    private function servedHistory(string $quizId): array
    {
        $s = $this->db->prepare('SELECT question_order,answered_count,current_sent_at FROM attempts
            WHERE user_id=? AND quiz_id=? ORDER BY started_at DESC LIMIT 200');
        $s->execute([$this->userId, $quizId]);
        $history = [];
        foreach ($s->fetchAll() as $row) {
            $order = json_decode($row['question_order'], true, 512, JSON_THROW_ON_ERROR);
            $served = (int) $row['answered_count'] + ($row['current_sent_at'] !== null ? 1 : 0);
            $history[] = array_slice($order, 0, $served);
        }
        return $history;
    }

    /**
     * Picks one round: questions the player has never seen first, then the ones seen longest ago,
     * so nothing repeats until the whole bank has been played. The round itself is shuffled.
     *
     * @param list<string> $ids every question ID in the quiz version
     * @param list<list<string>> $history served IDs per earlier attempt, newest first
     * @return list<string>
     */
    public static function pickRound(array $ids, int $size, array $history): array
    {
        $lastSeen = [];
        foreach ($history as $age => $served) {
            foreach ($served as $qid) { $lastSeen[$qid] ??= $age; }
        }
        $unseen = [];
        $seen = [];
        foreach ($ids as $qid) {
            if (isset($lastSeen[$qid])) { $seen[] = $qid; } else { $unseen[] = $qid; }
        }
        shuffle($unseen);
        shuffle($seen);
        // Stable sort keeps the shuffle as the tie-break: oldest sighting first.
        usort($seen, static fn(string $a, string $b): int => $lastSeen[$b] <=> $lastSeen[$a]);
        $round = array_slice(array_merge($unseen, $seen), 0, $size);
        shuffle($round);
        return $round;
    }

    public function next(string $id): array
    {
        return $this->transaction(function () use ($id): array {
            $a = $this->attempt($id);
            if ($a['status'] !== 'in_progress') { throw new ApiError('attempt_closed'); }
            if ((int)$a['current_index'] >= count(json_decode($a['question_order'], true))) { throw new ApiError('no_more_questions'); }
            if ($a['current_sent_at'] === null) { Database::execute($this->db, 'UPDATE attempts SET current_sent_at=UTC_TIMESTAMP(6) WHERE id=?', [$id]); }
            return $this->state($this->attempt($id));
        });
    }

    /**
     * The labels a child tapped, in order. $given must be a list of exactly as many tile handles as there
     * are slots, each one a handle this attempt sent, none repeated. Anything else is a 400 invalid_tiles
     * and is never counted.
     *
     * @return list<string>
     */
    private function tappedLabels(string $attemptId, array $build, mixed $given): array
    {
        if (!is_array($given) || !array_is_list($given) || count($given) !== count($build['answers'][0])) {
            throw new ApiError('invalid_tiles');
        }
        $labelOf = [];
        foreach ($build['tiles'] as $t) { $labelOf[$this->handle($attemptId, $t['id'])] = $t['label']; }
        $labels = [];
        $used = [];
        foreach ($given as $handle) {
            if (!is_string($handle) || !isset($labelOf[$handle]) || isset($used[$handle])) { throw new ApiError('invalid_tiles'); }
            $used[$handle] = true;
            $labels[] = $labelOf[$handle];
        }
        return $labels;
    }

    /**
     * The (item label, target label) pairs a child tapped, in the stored item order. $given must be a list
     * with one [item handle, target handle] pair for every item, each handle one this attempt sent, no item
     * twice, and (for a match) no partner twice. Anything else is a 400 invalid_pairs and is never counted.
     *
     * @return list<array{0:string,1:string}>
     */
    private function tappedPairs(string $attemptId, array $assign, mixed $given): array
    {
        if (!is_array($given) || !array_is_list($given) || count($given) !== count($assign['items'])) {
            throw new ApiError('invalid_pairs');
        }
        $itemOf = [];
        foreach ($assign['items'] as $i) { $itemOf[$this->handle($attemptId, $i['id'])] = $i; }
        $targetOf = [];
        foreach ($assign['targets'] as $t) { $targetOf[$this->handle($attemptId, $t['id'])] = $t; }
        $to = [];
        $partners = [];
        foreach ($given as $pair) {
            if (!is_array($pair) || !array_is_list($pair) || count($pair) !== 2 || !is_string($pair[0]) || !is_string($pair[1])
                || !isset($itemOf[$pair[0]], $targetOf[$pair[1]]) || isset($to[$pair[0]])) {
                throw new ApiError('invalid_pairs');
            }
            if ($assign['variant'] === 'match' && isset($partners[$pair[1]])) { throw new ApiError('invalid_pairs'); }
            $to[$pair[0]] = $targetOf[$pair[1]];
            $partners[$pair[1]] = true;
        }
        $out = [];
        foreach ($assign['items'] as $i) {
            $handle = $this->handle($attemptId, $i['id']);
            $out[] = ['item' => $i, 'target' => $to[$handle]];
        }
        return $out;
    }

    public function answer(string $id, array $input): array
    {
        return $this->transaction(function () use ($id, $input): array {
            $a = $this->attempt($id);
            if ($a['status'] !== 'in_progress') { throw new ApiError('attempt_closed'); }
            if ($a['current_sent_at'] === null) { throw new ApiError('question_not_shown'); }
            $q = $this->question($a);
            $clock = Database::one($this->db, 'SELECT GREATEST(0,ROUND(TIMESTAMPDIFF(MICROSECOND,?,UTC_TIMESTAMP(6))/1000)) AS elapsed', [$a['current_sent_at']]);
            $elapsed = (int)$clock['elapsed'];
            $limit = $a['time_limit_seconds'] !== null ? (int)$a['time_limit_seconds']*1000 : null;
            $timedOut = $limit !== null && $elapsed > $limit+1500;
            $correct = false; $option = null; $value = null; $correctIds = []; $chosen = null; $correctTiles = null; $correctPairs = null;
            if (in_array($q['type'], ['choice','boolean'], true)) {
                foreach ($q['options'] as $o) { if ($o['is_correct']) { $correctIds[] = $this->handle($id, $o['id']); } }
                if (!$timedOut) {
                    if (!is_string($input['option_id'] ?? null)) { throw new ApiError('invalid_option'); }
                    foreach ($q['options'] as $o) { if (hash_equals($this->handle($id, $o['id']), $input['option_id'])) { $option = $o['id']; $correct = (bool)$o['is_correct']; } }
                    if ($option === null) { throw new ApiError('invalid_option'); }
                }
            } elseif ($q['type'] === 'slider') {
                if (!$timedOut) {
                    $value = $input['value'] ?? null;
                    if ((!is_int($value) && !is_float($value)) || !is_finite((float)$value) || $value < $q['slider']['min'] || $value > $q['slider']['max']) { throw new ApiError('invalid_value'); }
                    $correct = $value >= $q['slider']['accept_min'] && $value <= $q['slider']['accept_max'];
                }
            } elseif ($q['type'] === 'build') {
                $correctTiles = $q['build']['answers'][0];
                if (!$timedOut) {
                    $chosen = $this->tappedLabels($id, $q['build'], $input['tiles'] ?? null);
                    $norm = static fn(string $label): string => mb_strtolower(trim($label));
                    $got = array_map($norm, $chosen);
                    foreach ($q['build']['answers'] as $accepted) {
                        if (array_map($norm, $accepted) === $got) { $correct = true; break; }
                    }
                }
            } elseif ($q['type'] === 'assign') {
                $correctPairs = self::keyPairs($q['assign']);
                if (!$timedOut) {
                    $given = $this->tappedPairs($id, $q['assign'], $input['pairs'] ?? null);
                    $correct = true;
                    $chosen = [];
                    foreach ($given as $g) {
                        $chosen[] = [$g['item']['label'], $g['target']['label']];
                        if ($g['target']['id'] !== $g['item']['target']) { $correct = false; }
                    }
                }
            } else { throw new \RuntimeException('question_type_invalid'); }
            $position = (int)$a['current_index']+1;
            $total = count(json_decode($a['question_order'], true));
            $time = min($elapsed, $limit ?? 60000);
            Database::execute($this->db, 'INSERT INTO attempt_answers (attempt_id,position,question_id,chosen_option_id,chosen_value,chosen_json,is_correct,timed_out,time_ms) VALUES (?,?,?,?,?,?,?,?,?)', [$id,$position,$q['id'],$option,$value,$chosen === null ? null : json_encode($chosen, JSON_THROW_ON_ERROR),(int)$correct,(int)$timedOut,$time]);
            Database::execute($this->db, 'UPDATE attempts SET answered_count=answered_count+1,correct_count=correct_count+?,answer_time_ms=answer_time_ms+?,current_index=current_index+1,current_sent_at=NULL WHERE id=?', [(int)$correct,$time,$id]);
            return ['is_correct'=>$correct,'timed_out'=>$timedOut,'correct_option_ids'=>$correctIds,'correct_tiles'=>$correctTiles,'correct_pairs'=>$correctPairs,
                'correct_value'=>$q['slider']['correct']??null,'accept_min'=>$q['slider']['accept_min']??null,
                'accept_max'=>$q['slider']['accept_max']??null,'explanation'=>$q['explanation']??null,
                'source_url'=>$q['source_url']??null,'position'=>$position,'total'=>$total,'is_last'=>$position===$total];
        });
    }

    /** Tiles shown as a word or a phrase: letters run together, words and cards are spaced. */
    private static function joinTiles(string $variant, array $labels): string
    {
        return implode($variant === 'spell' ? '' : ' ', $labels);
    }

    /** The stored key as (item label, target label) pairs in item order. */
    private static function keyPairs(array $assign): array
    {
        $targetLabel = array_column($assign['targets'], 'label', 'id');
        return array_map(static fn(array $i): array => [$i['label'], $targetLabel[$i['target']]], $assign['items']);
    }

    /** Pairs shown as words: "Fish → Sea; Bird → Nest". */
    private static function joinPairs(array $pairs): string
    {
        return implode('; ', array_map(static fn(array $p): string => $p[0] . ' → ' . $p[1], $pairs));
    }

    public function finish(string $id): array
    {
        return $this->transaction(function () use ($id): array {
            $a = $this->attempt($id);
            $total = count(json_decode($a['question_order'], true));
            if ((int)$a['answered_count'] !== $total) { throw new ApiError('not_all_answered'); }
            if (!in_array($a['status'], ['in_progress','finished'], true)) { throw new ApiError('attempt_closed'); }
            if ($a['status'] === 'in_progress') {
                Database::execute($this->db, "UPDATE attempts SET status='finished',finished_at=UTC_TIMESTAMP(6) WHERE id=?", [$id]);
                (new Competition($this->db, $this->userId))->record($a, $total);
            }
            // A daily hand mixes quizzes: read each answered question from the version it was dealt from.
            $dealt = $this->dealtVersions($a);
            $byVersion = [];
            $s=$this->db->prepare('SELECT * FROM attempt_answers WHERE attempt_id=? ORDER BY position'); $s->execute([$id]);
            $review=[];
            foreach ($s->fetchAll() as $answer) {
                $versionId = $dealt[(int) $answer['position']] ?? $a['quiz_version_id'];
                if (!isset($byVersion[$versionId])) {
                    $version = Database::one($this->db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$versionId]);
                    $byVersion[$versionId] = array_column(json_decode($version['snapshot'], true), null, 'id');
                }
                $q=$byVersion[$versionId][$answer['question_id']]; $labels=array_column($q['options']??[], 'label', 'id');
                $right=array_values(array_filter($q['options']??[], fn(array $o): bool => (bool)$o['is_correct']));
                $review[]=['position'=>(int)$answer['position'],'prompt'=>$q['prompt'],'type'=>$q['type'],
                    'is_correct'=>(bool)$answer['is_correct'],'timed_out'=>(bool)$answer['timed_out'],
                    'your_answer'=>$q['type']==='build'
                        ? ($answer['chosen_json']!==null ? self::joinTiles($q['build']['variant'], json_decode($answer['chosen_json'], true)) : null)
                        : ($q['type']==='assign'
                        ? ($answer['chosen_json']!==null ? self::joinPairs(json_decode($answer['chosen_json'], true)) : null)
                        : ($answer['chosen_option_id'] ? ($labels[$answer['chosen_option_id']]??null) : ($answer['chosen_value']!==null?(float)$answer['chosen_value']:null))),
                    'correct_answer'=>$q['type']==='build' ? self::joinTiles($q['build']['variant'], $q['build']['answers'][0])
                        : ($q['type']==='assign' ? self::joinPairs(self::keyPairs($q['assign']))
                        : ($q['type']==='slider'?($q['slider']['correct']??null):implode(', ',array_column($right,'label')))),
                    'explanation'=>$q['explanation']??null,'source_url'=>$q['source_url']??null,'time_ms'=>(int)$answer['time_ms']];
            }
            $profile=Database::one($this->db,'SELECT nickname,streak_current FROM profiles WHERE id=?',[$this->userId]);
            $competition = new Competition($this->db, $this->userId);
            $ranks = [];
            // A daily hand is a private mix of quizzes, so it is ranked on the day's board only.
            if ($a['mode'] === 'ranked') {
                $ranks['all_time'] = $competition->rank('all_time', $a['quiz_id'], '1970-01-01');
                $ranks['weekly'] = $competition->rank('weekly', $a['quiz_id'], Competition::weekStart());
            }
            if ($a['mode'] === 'daily' && $a['daily_challenge_id']) {
                $daily = Database::one($this->db, 'SELECT challenge_date FROM daily_challenges WHERE id=?', [$a['daily_challenge_id']]);
                $ranks['daily'] = $competition->rank('daily', $a['quiz_id'], $daily['challenge_date']);
            }
            $versus = null;
            if ($a['friend_challenge_id']) {
                $creator = Database::one($this->db,
                    'SELECT p.nickname,c.correct_count,c.answer_time_ms FROM friend_challenges f JOIN attempts c ON c.id=f.creator_attempt_id JOIN profiles p ON p.id=f.creator_id WHERE f.id=?',
                    [$a['friend_challenge_id']]);
                if ($creator) {
                    $versus = ['creator_nickname' => $creator['nickname'] ?? 'Your friend',
                        'creator_correct' => (int) $creator['correct_count'], 'creator_time_ms' => (int) $creator['answer_time_ms'],
                        'you_won' => (int) $a['correct_count'] > (int) $creator['correct_count'] || ((int) $a['correct_count'] === (int) $creator['correct_count'] && (int) $a['answer_time_ms'] < (int) $creator['answer_time_ms']),
                        'tie' => (int) $a['correct_count'] === (int) $creator['correct_count'] && (int) $a['answer_time_ms'] === (int) $creator['answer_time_ms']];
                }
            }
            return ['attempt_id'=>$id,'mode'=>$a['mode'],'correct'=>(int)$a['correct_count'],'total'=>$total,
                'answer_time_ms'=>(int)$a['answer_time_ms'],'review'=>$review,'ranks'=>(object)$ranks,
                'versus'=>$versus,'needs_nickname'=>$profile['nickname']===null,'streak'=>(int)$profile['streak_current']];
        });
    }
}
