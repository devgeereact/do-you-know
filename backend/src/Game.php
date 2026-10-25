<?php
declare(strict_types=1);
namespace Dyk;
final class Game
{
    public function __construct(private readonly \PDO $db, private readonly string $userId) {}

    public static function publicQuestion(array $q): array
    {
        $slider = $q['slider'] ?? null;
        return [
            'id' => $q['id'], 'type' => $q['type'], 'prompt' => $q['prompt'],
            'image_url' => $q['image_url'] ?? null,
            'options' => array_map(fn(array $o): array => ['id' => $o['id'], 'label' => $o['label']], $q['options'] ?? []),
            'slider' => $slider ? ['min' => $slider['min'], 'max' => $slider['max'], 'step' => $slider['step'], 'unit' => $slider['unit'] ?? null] : null,
        ];
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

    private function question(array $a): array
    {
        $version = Database::one($this->db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$a['quiz_version_id']]);
        $questions = json_decode($version['snapshot'], true, 512, JSON_THROW_ON_ERROR);
        $order = json_decode($a['question_order'], true, 512, JSON_THROW_ON_ERROR);
        $qid = $order[(int)$a['current_index']] ?? null;
        foreach ($questions as $q) { if ($q['id'] === $qid) { return $q; } }
        throw new \RuntimeException('snapshot_question_missing');
    }

    private function state(array $a): array
    {
        $quiz = Database::one($this->db, 'SELECT slug,title FROM quizzes WHERE id=?', [$a['quiz_id']]);
        $total = count(json_decode($a['question_order'], true, 512, JSON_THROW_ON_ERROR));
        $complete = (int)$a['answered_count'] >= $total;
        $q = (!$complete && $a['current_sent_at'] !== null) ? self::publicQuestion($this->question($a)) : null;
        if ($q && $a['shuffle_options']) {
            usort($q['options'], static fn(array $left, array $right): int =>
                strcmp(hash('sha256', $a['id'] . $left['id']), hash('sha256', $a['id'] . $right['id'])));
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
        return $this->transaction(function () use ($input, $mode): array {
            $daily = null;
            $challenge = null;
            if ($mode === 'daily') {
                $daily = Database::one($this->db,
                    "SELECT * FROM daily_challenges WHERE challenge_date=? AND status='live'", [Competition::londonDate()]);
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
                $found = Database::one($this->db, "SELECT id,current_version_id FROM quizzes WHERE slug=? AND status='published'", [$slug]);
                if (!$found || !$found['current_version_id']) { throw new ApiError('quiz_not_found', 404); }
                $quizId = $found['id'];
                $versionId = $found['current_version_id'];
            }
            $quiz = Database::one($this->db, "SELECT * FROM quizzes WHERE id=? AND status='published'", [$quizId]);
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
                $ids = array_column($snapshot, 'id');
                $order = $daily
                    ? array_slice($ids, 0, (int) $version['question_count'])
                    : self::pickRound($ids, (int) $version['question_count'], $this->servedHistory($quizId));
                $timer = $quiz['time_limit_seconds'];
                $shuffle = $quiz['shuffle_options'];
            }
            $id = Database::uuid();
            Database::execute($this->db,
                'INSERT INTO attempts (id,user_id,quiz_id,quiz_version_id,mode,daily_challenge_id,friend_challenge_id,time_limit_seconds,shuffle_options,question_order,current_sent_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',
                [$id, $this->userId, $quizId, $versionId, $mode, $daily['id'] ?? null, $challenge['id'] ?? null, $timer, (int) $shuffle, json_encode($order, JSON_THROW_ON_ERROR)]);
            return $this->state($this->attempt($id));
        });
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
            $correct = false; $option = null; $value = null; $correctIds = [];
            if (in_array($q['type'], ['choice','boolean'], true)) {
                foreach ($q['options'] as $o) { if ($o['is_correct']) { $correctIds[] = $o['id']; } }
                if (!$timedOut) {
                    if (!is_string($input['option_id'] ?? null)) { throw new ApiError('invalid_option'); }
                    foreach ($q['options'] as $o) { if ($o['id'] === $input['option_id']) { $option = $o['id']; $correct = (bool)$o['is_correct']; } }
                    if ($option === null) { throw new ApiError('invalid_option'); }
                }
            } elseif ($q['type'] === 'slider') {
                if (!$timedOut) {
                    $value = $input['value'] ?? null;
                    if ((!is_int($value) && !is_float($value)) || !is_finite((float)$value) || $value < $q['slider']['min'] || $value > $q['slider']['max']) { throw new ApiError('invalid_value'); }
                    $correct = $value >= $q['slider']['accept_min'] && $value <= $q['slider']['accept_max'];
                }
            } else { throw new \RuntimeException('question_type_invalid'); }
            $position = (int)$a['current_index']+1;
            $total = count(json_decode($a['question_order'], true));
            $time = min($elapsed, $limit ?? 60000);
            Database::execute($this->db, 'INSERT INTO attempt_answers (attempt_id,position,question_id,chosen_option_id,chosen_value,is_correct,timed_out,time_ms) VALUES (?,?,?,?,?,?,?,?)', [$id,$position,$q['id'],$option,$value,(int)$correct,(int)$timedOut,$time]);
            Database::execute($this->db, 'UPDATE attempts SET answered_count=answered_count+1,correct_count=correct_count+?,answer_time_ms=answer_time_ms+?,current_index=current_index+1,current_sent_at=NULL WHERE id=?', [(int)$correct,$time,$id]);
            return ['is_correct'=>$correct,'timed_out'=>$timedOut,'correct_option_ids'=>$correctIds,
                'correct_value'=>$q['slider']['correct']??null,'accept_min'=>$q['slider']['accept_min']??null,
                'accept_max'=>$q['slider']['accept_max']??null,'explanation'=>$q['explanation']??null,
                'source_url'=>$q['source_url']??null,'position'=>$position,'total'=>$total,'is_last'=>$position===$total];
        });
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
            $version = Database::one($this->db, 'SELECT snapshot FROM quiz_versions WHERE id=?', [$a['quiz_version_id']]);
            $questions = array_column(json_decode($version['snapshot'], true), null, 'id');
            $s=$this->db->prepare('SELECT * FROM attempt_answers WHERE attempt_id=? ORDER BY position'); $s->execute([$id]);
            $review=[];
            foreach ($s->fetchAll() as $answer) {
                $q=$questions[$answer['question_id']]; $labels=array_column($q['options']??[], 'label', 'id');
                $right=array_values(array_filter($q['options']??[], fn(array $o): bool => (bool)$o['is_correct']));
                $review[]=['position'=>(int)$answer['position'],'prompt'=>$q['prompt'],'type'=>$q['type'],
                    'is_correct'=>(bool)$answer['is_correct'],'timed_out'=>(bool)$answer['timed_out'],
                    'your_answer'=>$answer['chosen_option_id'] ? ($labels[$answer['chosen_option_id']]??null) : ($answer['chosen_value']!==null?(float)$answer['chosen_value']:null),
                    'correct_answer'=>$q['type']==='slider'?($q['slider']['correct']??null):implode(', ',array_column($right,'label')),
                    'explanation'=>$q['explanation']??null,'source_url'=>$q['source_url']??null,'time_ms'=>(int)$answer['time_ms']];
            }
            $profile=Database::one($this->db,'SELECT nickname,streak_current FROM profiles WHERE id=?',[$this->userId]);
            $competition = new Competition($this->db, $this->userId);
            $ranks = [];
            if (in_array($a['mode'], ['ranked', 'daily'], true)) {
                $ranks['all_time'] = $competition->rank('all_time', $a['quiz_id'], '1970-01-01');
                $ranks['weekly'] = $competition->rank('weekly', $a['quiz_id'], Competition::weekStart());
                if ($a['daily_challenge_id']) {
                    $daily = Database::one($this->db, 'SELECT challenge_date FROM daily_challenges WHERE id=?', [$a['daily_challenge_id']]);
                    $ranks['daily'] = $competition->rank('daily', $a['quiz_id'], $daily['challenge_date']);
                }
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
