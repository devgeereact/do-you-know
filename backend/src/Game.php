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
        $this->db->beginTransaction();
        try { $value = $fn(); $this->db->commit(); return $value; }
        catch (\Throwable $error) { if ($this->db->inTransaction()) { $this->db->rollBack(); } throw $error; }
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
        $quiz = Database::one($this->db, 'SELECT slug,title,time_limit_seconds FROM quizzes WHERE id=?', [$a['quiz_id']]);
        $total = count(json_decode($a['question_order'], true, 512, JSON_THROW_ON_ERROR));
        $complete = (int)$a['answered_count'] >= $total;
        $q = (!$complete && $a['current_sent_at'] !== null) ? self::publicQuestion($this->question($a)) : null;
        return [
            'attempt_id' => $a['id'], 'mode' => $a['mode'], 'status' => $a['status'],
            'quiz' => ['slug' => $quiz['slug'], 'title' => $quiz['title']],
            'position' => min((int)$a['current_index']+1, $total), 'total' => $total,
            'answered' => (int)$a['answered_count'], 'correct' => (int)$a['correct_count'],
            'awaiting_next' => !$complete && $a['current_sent_at'] === null,
            'complete' => $complete, 'time_limit_seconds' => $quiz['time_limit_seconds'],
            'question' => $q, 'server_now' => gmdate('c'),
        ];
    }

    public function start(array $input): array
    {
        if (($input['mode'] ?? 'practice') !== 'practice') {
            throw new ApiError('mode_not_migrated', 501);
        }
        $slug = $input['quiz_slug'] ?? null;
        if (!is_string($slug) || !preg_match('/^[a-z0-9-]{1,100}$/D', $slug)) { throw new ApiError('quiz_not_found', 404); }
        return $this->transaction(function () use ($slug): array {
            // Serialise starts per player, including starts for different quizzes.
            Database::one($this->db, 'SELECT id FROM profiles WHERE id=? FOR UPDATE', [$this->userId]);
            $quiz = Database::one($this->db, "SELECT * FROM quizzes WHERE slug=? AND status='published'", [$slug]);
            if (!$quiz || !$quiz['current_version_id']) { throw new ApiError('quiz_not_found', 404); }
            $existing = Database::one($this->db, "SELECT * FROM attempts WHERE user_id=? AND quiz_version_id=? AND mode='practice' AND status='in_progress' AND started_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 24 HOUR) ORDER BY started_at DESC LIMIT 1 FOR UPDATE", [$this->userId, $quiz['current_version_id']]);
            if ($existing) {
                if ($existing['current_sent_at'] === null && (int)$existing['current_index'] < count(json_decode($existing['question_order'], true))) {
                    Database::execute($this->db, 'UPDATE attempts SET current_sent_at=UTC_TIMESTAMP(6) WHERE id=?', [$existing['id']]);
                }
                return $this->state($this->attempt($existing['id']));
            }
            $count = Database::one($this->db, 'SELECT COUNT(*) AS n FROM attempts WHERE user_id=? AND started_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 MINUTE)', [$this->userId]);
            if ((int)$count['n'] >= 5) { throw new ApiError('too_many_attempts', 429); }
            $version = Database::one($this->db, 'SELECT * FROM quiz_versions WHERE id=? AND quiz_id=?', [$quiz['current_version_id'], $quiz['id']]);
            if (!$version) { throw new \RuntimeException('quiz_version_missing'); }
            $snapshot = json_decode($version['snapshot'], true, 512, JSON_THROW_ON_ERROR);
            if (count($snapshot) < (int)$version['question_count'] || (int)$version['question_count'] < 3) { throw new \RuntimeException('quiz_snapshot_invalid'); }
            shuffle($snapshot);
            $order = array_column(array_slice($snapshot, 0, (int)$version['question_count']), 'id');
            $id = Database::uuid();
            Database::execute($this->db, "INSERT INTO attempts (id,user_id,quiz_id,quiz_version_id,question_order,current_sent_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))", [$id,$this->userId,$quiz['id'],$version['id'],json_encode($order, JSON_THROW_ON_ERROR)]);
            return $this->state($this->attempt($id));
        });
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
            $quiz = Database::one($this->db, 'SELECT time_limit_seconds FROM quizzes WHERE id=?', [$a['quiz_id']]);
            $clock = Database::one($this->db, 'SELECT GREATEST(0,ROUND(TIMESTAMPDIFF(MICROSECOND,?,UTC_TIMESTAMP(6))/1000)) AS elapsed', [$a['current_sent_at']]);
            $elapsed = (int)$clock['elapsed'];
            $limit = $quiz['time_limit_seconds'] !== null ? (int)$quiz['time_limit_seconds']*1000 : null;
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
            return ['attempt_id'=>$id,'mode'=>'practice','correct'=>(int)$a['correct_count'],'total'=>$total,
                'answer_time_ms'=>(int)$a['answer_time_ms'],'review'=>$review,'ranks'=>(object)[],
                'versus'=>null,'needs_nickname'=>$profile['nickname']===null,'streak'=>(int)$profile['streak_current']];
        });
    }
}
