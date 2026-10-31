<?php
declare(strict_types=1);
namespace Dyk;

/**
 * Sourced question generator for the Studio (Super Admin only, behind Admin::guard).
 *
 * GET  /admin/generator                 status: switched on?, keys present?, model, sources, daily cap, recent runs, 30-day usage
 * POST /admin/generator/runs            {topic, ages, count, category?} -> 201 run       409 generator_off | 429 generator_daily_cap
 * GET  /admin/generator/runs/{id}       run with its sources and drafts
 * POST /admin/generator/runs/{id}/step  does the next piece of work and returns the run:
 *        search (one Google query limited to the trusted sites) -> fetch (one page per step)
 *        -> draft (one model call, questions written only from the page text) -> check -> done
 * POST /admin/generator/drafts/{id}     {decision: approved|rejected|pending}
 * POST /admin/generator/runs/{id}/send  {quiz_id, draft_ids} approved drafts are appended to a
 *        draft or live quiz's work copy, which still needs Check & publish. Nothing publishes itself.
 *
 * A draft is only offered as "kept" when its quote really appears in the page it cites, that page
 * is on the trusted list, Content::validateQuestion passes and the prompt is not already in use.
 */
final class Generator
{
    public const AGES = ['5-7', '7-11', '11-14', '14-16', '16+'];
    public const DEFAULT_SOURCES = [
        'bbc.co.uk', 'britannica.com', 'nasa.gov', 'nhm.ac.uk', 'natgeokids.com', 'metoffice.gov.uk',
        'nhs.uk', 'rmg.co.uk', 'sciencemuseum.org.uk', 'nationalarchives.gov.uk', 'bl.uk', 'oxfordreference.com',
    ];
    private const MAX_PAGES = 4;
    private const PAGE_CHARS = 15000;

    private ?GeneratorTransport $transport = null;

    public function __construct(
        private readonly \PDO $db,
        private readonly array $config,
        private readonly Admin $admin,
        private readonly AdminContent $content,
    ) {}

    // ---- Settings ----

    private function settings(): array
    {
        $g = is_array($this->config['generator'] ?? null) ? $this->config['generator'] : [];
        // Recorded answers instead of live calls: test environment only, from the config or DYK_GENERATOR_FIXTURES.
        $fixtures = null;
        if (($this->config['environment'] ?? '') === 'test') {
            $fixtures = getenv('DYK_GENERATOR_FIXTURES') ?: ($g['fixtures'] ?? null);
            $fixtures = is_string($fixtures) && is_dir($fixtures) ? $fixtures : null;
        }
        $sources = array_values(array_filter($g['sources'] ?? self::DEFAULT_SOURCES, static fn($d): bool => is_string($d) && preg_match('/^[a-z0-9-]+(\.[a-z0-9-]+)+$/D', $d) === 1));
        return [
            'enabled' => ($g['enabled'] ?? false) === true || $fixtures !== null,
            'model' => is_string($g['model'] ?? null) && $g['model'] !== '' ? $g['model'] : 'claude-opus-5-5',
            'daily_runs' => is_int($g['daily_runs'] ?? null) ? max(0, $g['daily_runs']) : 20,
            'sources' => $sources ?: self::DEFAULT_SOURCES,
            'fixtures' => $fixtures,
            'anthropic_api_key' => (string) ($g['anthropic_api_key'] ?? ''),
            'brightdata_api_key' => (string) ($g['brightdata_api_key'] ?? ''),
            'brightdata_serp_zone' => (string) ($g['brightdata_serp_zone'] ?? ''),
            'brightdata_unlocker_zone' => (string) ($g['brightdata_unlocker_zone'] ?? ''),
        ];
    }

    private function configured(array $s): array
    {
        return [
            'claude' => $s['fixtures'] !== null || $s['anthropic_api_key'] !== '',
            'bright_data' => $s['fixtures'] !== null || ($s['brightdata_api_key'] !== '' && $s['brightdata_serp_zone'] !== '' && $s['brightdata_unlocker_zone'] !== ''),
        ];
    }

    private function transport(array $s): GeneratorTransport
    {
        return $this->transport ??= $s['fixtures'] !== null ? new GeneratorFixtures($s['fixtures']) : new GeneratorLive($s);
    }

    // ---- Routes ----

    public function status(): array
    {
        $s = $this->settings();
        $configured = $this->configured($s);
        $usage = Database::one($this->db, "SELECT COUNT(*) AS runs, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens,
            COALESCE(SUM(serp_calls),0) AS serp_calls, COALESCE(SUM(page_calls),0) AS page_calls
            FROM generator_runs WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 30 DAY)");
        $drafts = Database::one($this->db, "SELECT COUNT(*) AS drafts, COALESCE(SUM(d.decision='sent'),0) AS sent FROM generator_drafts d
            JOIN generator_runs r ON r.id=d.run_id WHERE r.created_at >= DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 30 DAY)");
        $runs = $this->db->query('SELECT r.*, (SELECT COUNT(*) FROM generator_drafts d WHERE d.run_id=r.id) AS drafts FROM generator_runs r ORDER BY r.created_at DESC LIMIT 15')->fetchAll();
        return [
            'enabled' => $s['enabled'],
            'configured' => $configured,
            'ready' => $s['enabled'] && $configured['claude'] && $configured['bright_data'],
            'model' => $s['model'],
            'sources' => $s['sources'],
            'ages' => self::AGES,
            'cap' => ['used' => $this->runsToday(), 'limit' => $s['daily_runs']],
            'usage_30d' => [
                'runs' => (int) $usage['runs'], 'drafts' => (int) $drafts['drafts'], 'sent' => (int) $drafts['sent'],
                'input_tokens' => (int) $usage['input_tokens'], 'output_tokens' => (int) $usage['output_tokens'],
                'search_calls' => (int) $usage['serp_calls'], 'page_calls' => (int) $usage['page_calls'],
            ],
            'runs' => array_map(fn(array $r): array => $this->summary($r) + ['drafts' => (int) $r['drafts']], $runs),
        ];
    }

    public function create(array $body): array
    {
        if ($extra = array_diff(array_keys($body), ['topic', 'ages', 'count', 'category'])) {
            throw ApiError::invalid('invalid_run', [['field' => 'body', 'message' => 'unknown keys ' . implode(', ', $extra)]]);
        }
        $topic = is_string($body['topic'] ?? null) ? trim(preg_replace('/\s+/u', ' ', $body['topic']) ?? '') : '';
        $problems = [];
        if (mb_strlen($topic) < 3 || mb_strlen($topic) > 300) { $problems[] = ['field' => 'topic', 'message' => 'Say what the questions should cover (3 to 300 characters).']; }
        if (!in_array($body['ages'] ?? null, self::AGES, true)) { $problems[] = ['field' => 'ages', 'message' => 'Pick an age group.']; }
        $count = $body['count'] ?? null;
        if (!is_int($count) || $count < 3 || $count > 15) { $problems[] = ['field' => 'count', 'message' => 'Ask for 3 to 15 questions.']; }
        $category = $body['category'] ?? null;
        if ($category !== null && (!is_string($category) || !Database::one($this->db, 'SELECT id FROM categories WHERE slug=?', [$category]))) {
            $problems[] = ['field' => 'category', 'message' => 'Unknown subject.'];
        }
        if ($problems) { throw ApiError::invalid('invalid_run', $problems); }
        $s = $this->settings();
        $configured = $this->configured($s);
        if (!$s['enabled'] || !$configured['claude'] || !$configured['bright_data']) { throw new ApiError('generator_off', 409); }
        if ($this->runsToday() >= $s['daily_runs']) { throw new ApiError('generator_daily_cap', 429, ['limit' => $s['daily_runs']]); }
        $id = Database::uuid();
        Database::execute($this->db, 'INSERT INTO generator_runs (id,created_by,topic,category_slug,ages,wanted,model) VALUES (?,?,?,?,?,?,?)',
            [$id, $this->admin->profileId(), $topic, $category, $body['ages'], $count, $s['model']]);
        $this->admin->audit('generator.run', 'generator_run', $id, ['topic' => $topic, 'count' => $count]);
        return $this->detail($id);
    }

    public function detail(string $id): array
    {
        $run = $this->run($id);
        $drafts = Database::all($this->db, 'SELECT * FROM generator_drafts WHERE run_id=? ORDER BY position', [$id]);
        return $this->summary($run) + [
            'sources' => json_decode((string) ($run['sources'] ?? '[]'), true) ?: [],
            'drafts' => array_map(fn(array $d): array => $this->draftOut($d), $drafts),
        ];
    }

    public function step(string $id): array
    {
        $run = $this->run($id);
        $s = $this->settings();
        if (in_array($run['stage'], ['done', 'failed'], true)) { return $this->detail($id); }
        if (!$s['enabled']) { throw new ApiError('generator_off', 409); }
        // Claim the run for this step; a parallel request that loses just reports the current state.
        $claim = $this->db->prepare('UPDATE generator_runs SET busy_until=DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 3 MINUTE)
            WHERE id=? AND stage=? AND (busy_until IS NULL OR busy_until < UTC_TIMESTAMP(6))');
        $claim->execute([$id, $run['stage']]);
        if ($claim->rowCount() !== 1) { return $this->detail($id) + ['busy' => true]; }
        $run = $this->run($id);
        if ($run['stage'] === 'draft') { @set_time_limit(150); }
        try {
            match ($run['stage']) {
                'search' => $this->doSearch($run, $s),
                'fetch' => $this->doFetch($run, $s),
                'draft' => $this->doDraft($run, $s),
                'check' => $this->doCheck($run, $s),
            };
        } catch (ApiError $e) {
            // A refusal or an outside failure ends the run with a reason the Studio can show.
            $this->fail($id, $e->errorCode);
        } finally {
            Database::execute($this->db, 'UPDATE generator_runs SET busy_until=NULL WHERE id=?', [$id]);
        }
        return $this->detail($id);
    }

    public function decide(string $draftId, array $body): array
    {
        $decision = $body['decision'] ?? null;
        if (array_diff(array_keys($body), ['decision']) || !in_array($decision, ['approved', 'rejected', 'pending'], true)) {
            throw ApiError::invalid('invalid_decision', [['field' => 'decision', 'message' => 'approved, rejected or pending']]);
        }
        $draft = Database::one($this->db, 'SELECT * FROM generator_drafts WHERE id=?', [$draftId]);
        if (!$draft) { throw new ApiError('draft_not_found', 404); }
        if ($draft['decision'] === 'sent') { throw new ApiError('draft_already_sent', 409); }
        $problems = json_decode($draft['problems'], true) ?: [];
        if ($decision === 'approved' && $problems) { throw ApiError::invalid('draft_has_problems', $problems); }
        Database::execute($this->db, 'UPDATE generator_drafts SET decision=?,decided_by=?,decided_at=UTC_TIMESTAMP(6) WHERE id=?',
            [$decision, $decision === 'pending' ? null : $this->admin->profileId(), $draftId]);
        $this->admin->audit('generator.decide', 'generator_draft', $draftId, ['decision' => $decision]);
        return $this->draftOut(Database::one($this->db, 'SELECT * FROM generator_drafts WHERE id=?', [$draftId]));
    }

    public function send(string $runId, array $body): array
    {
        $this->run($runId);
        $quizId = $body['quiz_id'] ?? null;
        $ids = $body['draft_ids'] ?? null;
        if (!is_string($quizId) || !Admin::isUuid($quizId) || !is_array($ids) || !array_is_list($ids) || !$ids
            || array_filter($ids, static fn($d): bool => !is_string($d) || !Admin::isUuid($d))) {
            throw ApiError::invalid('invalid_send', [['field' => 'draft_ids', 'message' => 'Pick a quiz and at least one approved draft.']]);
        }
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $drafts = Database::all($this->db, "SELECT * FROM generator_drafts WHERE run_id=? AND id IN ($marks) ORDER BY position", array_merge([$runId], $ids));
        if (count($drafts) !== count(array_unique($ids)) || array_filter($drafts, static fn(array $d): bool => $d['decision'] !== 'approved')) {
            throw ApiError::invalid('drafts_not_approved', [['field' => 'draft_ids', 'message' => 'Only approved drafts from this run can be sent.']]);
        }
        $questions = array_map(static fn(array $d): array => json_decode($d['question'], true), $drafts);
        $quiz = $this->content->append($quizId, ['questions' => $questions]);
        Database::execute($this->db, "UPDATE generator_drafts SET decision='sent',sent_quiz_id=? WHERE run_id=? AND id IN ($marks)", array_merge([$quizId, $runId], $ids));
        $this->admin->audit('generator.send', 'quiz', $quizId, ['run' => $runId, 'drafts' => count($drafts)]);
        return ['sent' => count($drafts), 'quiz' => $quiz['quiz'] ?? null, 'run' => $this->detail($runId)];
    }

    // ---- Steps ----

    private function doSearch(array $run, array $s): void
    {
        $sites = implode(' OR ', array_map(static fn(string $d): string => "site:$d", $s['sources']));
        $results = $this->transport($s)->search($run['topic'] . ' ' . $sites);
        $sources = [];
        foreach ($results as $r) {
            $host = self::host($r['link'] ?? '');
            if ($host === null || !self::trusted($host, $s['sources']) || isset($sources[$r['link']])) { continue; }
            $sources[$r['link']] = ['url' => $r['link'], 'title' => mb_substr((string) ($r['title'] ?? ''), 0, 200), 'domain' => $host, 'state' => 'waiting'];
            if (count($sources) >= self::MAX_PAGES) { break; }
        }
        Database::execute($this->db, 'UPDATE generator_runs SET serp_calls=serp_calls+1, sources=?, stage=? WHERE id=?',
            [json_encode(array_values($sources)), $sources ? 'fetch' : 'failed', $run['id']]);
        if (!$sources) { $this->fail($run['id'], 'no_trusted_sources'); }
    }

    private function doFetch(array $run, array $s): void
    {
        $sources = json_decode((string) $run['sources'], true) ?: [];
        foreach ($sources as $i => $source) {
            if ($source['state'] !== 'waiting') { continue; }
            $text = '';
            try {
                $text = self::pageText($this->transport($s)->fetch($source['url']));
            } catch (ApiError) {
                $text = '';
            }
            $sources[$i]['state'] = mb_strlen($text) >= 400 ? 'read' : 'unreadable';
            if ($sources[$i]['state'] === 'read') {
                Database::execute($this->db, 'REPLACE INTO generator_pages (run_id,url,text) VALUES (?,?,?)', [$run['id'], $source['url'], $text]);
            }
            $left = array_filter($sources, static fn(array $x): bool => $x['state'] === 'waiting');
            $read = array_filter($sources, static fn(array $x): bool => $x['state'] === 'read');
            $stage = $left ? 'fetch' : ($read ? 'draft' : 'failed');
            Database::execute($this->db, 'UPDATE generator_runs SET page_calls=page_calls+1, sources=?, stage=? WHERE id=?', [json_encode($sources), $stage, $run['id']]);
            if ($stage === 'failed') { $this->fail($run['id'], 'no_readable_pages'); }
            return;
        }
    }

    private function doDraft(array $run, array $s): void
    {
        $pages = Database::all($this->db, 'SELECT url,text FROM generator_pages WHERE run_id=? ORDER BY fetched_at', [$run['id']]);
        $docs = implode("\n\n", array_map(static fn(array $p): string => '<page url="' . htmlspecialchars($p['url'], ENT_QUOTES) . "\">\n" . $p['text'] . "\n</page>", $pages));
        $system = "You write multiple-choice quiz questions for Do You Know, a UK quiz site played by children and families.\n"
            . "Use only facts stated in the pages you are given. Do not use anything you know from elsewhere, even if you are sure it is true. "
            . "If the pages do not support enough good questions, return fewer.\n"
            . "For every question, copy one exact sentence or phrase from the page that proves the right answer into \"quote\" (word for word, at least 6 words), "
            . "and put that page's url in \"source_url\".\n"
            . "Write in plain UK English for the age group given, kind and clear. One right answer and three wrong answers that are believable but clearly wrong "
            . "according to the page. The explanation is one or two short sentences a child can follow. No trick questions, no 'all of the above'.";
        $user = "Write {$run['wanted']} questions about: {$run['topic']}\nAge group: {$run['ages']}\n\n$docs";
        $schema = [
            'type' => 'object', 'additionalProperties' => false, 'required' => ['questions'],
            'properties' => ['questions' => ['type' => 'array', 'items' => [
                'type' => 'object', 'additionalProperties' => false,
                'required' => ['prompt', 'right_answer', 'wrong_answers', 'explanation', 'source_url', 'quote'],
                'properties' => [
                    'prompt' => ['type' => 'string'], 'right_answer' => ['type' => 'string'],
                    'wrong_answers' => ['type' => 'array', 'items' => ['type' => 'string']],
                    'explanation' => ['type' => 'string'], 'source_url' => ['type' => 'string'], 'quote' => ['type' => 'string'],
                ],
            ]]],
        ];
        $out = $this->transport($s)->draft($run['model'], $system, $user, $schema);
        Database::transaction($this->db, function () use ($run, $out): void {
            Database::execute($this->db, 'DELETE FROM generator_drafts WHERE run_id=?', [$run['id']]);
            $reviewBy = (new \DateTimeImmutable(Competition::londonDate()))->modify('+12 months')->format('Y-m-d');
            foreach (array_slice($out['questions'], 0, 15) as $i => $q) {
                $right = is_string($q['right_answer'] ?? null) ? trim($q['right_answer']) : '';
                $wrong = array_values(array_filter(array_map(static fn($w): string => is_string($w) ? trim($w) : '', is_array($q['wrong_answers'] ?? null) ? $q['wrong_answers'] : []), static fn(string $w): bool => $w !== ''));
                $options = array_map(static fn(string $l): array => ['label' => $l, 'correct' => false], array_slice($wrong, 0, 5));
                // The right answer goes in a fixed slot chosen by position; play shuffles anyway.
                array_splice($options, $i % (count($options) + 1), 0, [['label' => $right, 'correct' => true]]);
                $question = ['type' => 'choice', 'prompt' => trim((string) ($q['prompt'] ?? '')), 'options' => $options,
                    'explanation' => trim((string) ($q['explanation'] ?? '')), 'source_url' => trim((string) ($q['source_url'] ?? '')), 'review_by' => $reviewBy];
                Database::execute($this->db, "INSERT INTO generator_drafts (id,run_id,position,question,quote,problems) VALUES (?,?,?,?,?,'[]')",
                    [Database::uuid(), $run['id'], $i, json_encode($question, JSON_UNESCAPED_UNICODE), mb_substr(trim((string) ($q['quote'] ?? '')), 0, 2000)]);
            }
            Database::execute($this->db, "UPDATE generator_runs SET input_tokens=input_tokens+?, output_tokens=output_tokens+?, stage='check' WHERE id=?",
                [$out['input_tokens'], $out['output_tokens'], $run['id']]);
        });
    }

    private function doCheck(array $run, array $s): void
    {
        $pages = array_column(Database::all($this->db, 'SELECT url,text FROM generator_pages WHERE run_id=?', [$run['id']]), 'text', 'url');
        $used = [];
        foreach ($this->db->query('SELECT v.snapshot,q.draft FROM quizzes q LEFT JOIN quiz_versions v ON v.id=q.current_version_id')->fetchAll() as $r) {
            foreach (array_merge(json_decode((string) $r['snapshot'], true) ?: [], (json_decode((string) $r['draft'], true) ?: [])['questions'] ?? []) as $q) {
                if (is_string($q['prompt'] ?? null)) { $used[Content::promptKey($q['prompt'])] = true; }
            }
        }
        $seen = [];
        foreach (Database::all($this->db, 'SELECT * FROM generator_drafts WHERE run_id=? ORDER BY position', [$run['id']]) as $d) {
            $q = json_decode($d['question'], true);
            $problems = array_map(static fn(string $m): array => ['field' => 'question', 'message' => preg_replace('/^draft: /', '', $m)], Content::validateQuestion($q, 'draft'));
            $host = self::host($q['source_url']);
            $onList = $host !== null && self::trusted($host, $s['sources']) && isset($pages[$q['source_url']]);
            $quoteFound = $onList && self::quoteIn($d['quote'], $pages[$q['source_url']]);
            $key = Content::promptKey($q['prompt']);
            $duplicate = $key === '' || isset($used[$key]) || isset($seen[$key]);
            $seen[$key] = true;
            if (!$onList) { $problems[] = ['field' => 'source_url', 'message' => 'The source is not one of the trusted pages read for this run.']; }
            if ($onList && !$quoteFound) { $problems[] = ['field' => 'quote', 'message' => 'The quote was not found word for word in the page.']; }
            if ($duplicate) { $problems[] = ['field' => 'prompt', 'message' => 'This question is already in a quiz.']; }
            Database::execute($this->db, 'UPDATE generator_drafts SET quote_found=?,on_allowlist=?,duplicate=?,problems=? WHERE id=?',
                [(int) $quoteFound, (int) $onList, (int) $duplicate, json_encode($problems, JSON_UNESCAPED_UNICODE), $d['id']]);
        }
        Database::execute($this->db, "UPDATE generator_runs SET stage='done' WHERE id=?", [$run['id']]);
    }

    // ---- Helpers ----

    private function run(string $id): array
    {
        $run = Database::one($this->db, 'SELECT * FROM generator_runs WHERE id=?', [$id]);
        if (!$run) { throw new ApiError('run_not_found', 404); }
        return $run;
    }

    private function fail(string $id, string $reason): void
    {
        Database::execute($this->db, "UPDATE generator_runs SET stage='failed', error=? WHERE id=?", [mb_substr($reason, 0, 300), $id]);
    }

    private function runsToday(): int
    {
        $start = Overall::periodStart('day');
        return (int) Database::one($this->db, 'SELECT COUNT(*) AS n FROM generator_runs WHERE created_at >= ?', [$start])['n'];
    }

    private function summary(array $r): array
    {
        return [
            'id' => $r['id'], 'topic' => $r['topic'], 'category' => $r['category_slug'], 'ages' => $r['ages'], 'wanted' => (int) $r['wanted'],
            'model' => $r['model'], 'stage' => $r['stage'], 'error' => $r['error'],
            'usage' => ['search_calls' => (int) $r['serp_calls'], 'page_calls' => (int) $r['page_calls'], 'input_tokens' => (int) $r['input_tokens'], 'output_tokens' => (int) $r['output_tokens']],
            'created_at' => Database::utc($r['created_at']),
        ];
    }

    private function draftOut(array $d): array
    {
        $problems = json_decode($d['problems'], true) ?: [];
        return [
            'id' => $d['id'], 'position' => (int) $d['position'], 'question' => json_decode($d['question'], true), 'quote' => $d['quote'],
            'checks' => ['quote_found' => (bool) $d['quote_found'], 'on_allowlist' => (bool) $d['on_allowlist'], 'new_prompt' => !$d['duplicate']],
            'problems' => $problems, 'kept' => $problems === [], 'decision' => $d['decision'], 'sent_quiz_id' => $d['sent_quiz_id'],
        ];
    }

    public static function host(string $url): ?string
    {
        if (!preg_match('~^https://~i', $url)) { return null; }
        $host = parse_url($url, PHP_URL_HOST);
        return is_string($host) ? strtolower($host) : null;
    }

    public static function trusted(string $host, array $sources): bool
    {
        foreach ($sources as $d) {
            if ($host === $d || str_ends_with($host, '.' . $d)) { return true; }
        }
        return false;
    }

    /** Readable text of a page: the main or article element when there is one, without scripts, menus or footers. */
    public static function pageText(string $html): string
    {
        if (trim($html) === '') { return ''; }
        $doc = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="utf-8"?>' . $html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        foreach (['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside', 'form', 'svg', 'template'] as $tag) {
            foreach (iterator_to_array($doc->getElementsByTagName($tag)) as $node) { $node->parentNode?->removeChild($node); }
        }
        $root = $doc->getElementsByTagName('main')->item(0) ?? $doc->getElementsByTagName('article')->item(0) ?? $doc->getElementsByTagName('body')->item(0);
        $text = $root?->textContent ?? '';
        $text = trim(preg_replace('/\s+/u', ' ', html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');
        return mb_substr($text, 0, self::PAGE_CHARS);
    }

    /** True when the quote (six words or more) appears in the page, ignoring case, spacing and quote marks. */
    public static function quoteIn(string $quote, string $page): bool
    {
        $norm = static function (string $s): string {
            $s = mb_strtolower(strtr($s, ['’' => "'", '‘' => "'", '“' => '"', '”' => '"', '–' => '-', '—' => '-', "\u{00A0}" => ' ']));
            return trim(preg_replace('/\s+/u', ' ', $s) ?? '');
        };
        $q = trim($norm($quote), " .\"'");
        return count(preg_split('/\s+/u', $q) ?: []) >= 6 && str_contains($norm($page), $q);
    }
}
