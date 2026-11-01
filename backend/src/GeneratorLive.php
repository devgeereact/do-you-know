<?php
declare(strict_types=1);
namespace Dyk;

use Anthropic\Beta\Messages\BetaWebSearchTool20260209;
use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;

/**
 * Live calls for the generator. Keys come only from the private config; nothing about players is
 * ever sent.
 *
 * - Writing: the Claude API (official PHP SDK) first; if Anthropic fails or is not configured,
 *   the same request goes to OpenRouter (chat completions with a JSON schema).
 * - Searching: Bright Data's SERP API when configured, otherwise Claude's web search limited to
 *   the trusted sites, then OpenRouter's web search with the same domain filter as the backup.
 * - Reading pages: Bright Data's Web Unlocker when configured, otherwise a direct HTTPS fetch that
 *   only follows redirects within the trusted sites.
 */
final class GeneratorLive implements GeneratorTransport
{
    private const BRIGHT_DATA = 'https://api.brightdata.com/request';
    private const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
    private string $engine = '';

    public function __construct(private readonly array $settings) {}

    public function engine(): string
    {
        return $this->engine;
    }

    // ---- Search ----

    public function search(string $topic, array $domains): array
    {
        if ($this->hasBrightData()) {
            $this->engine = 'brightdata';
            $sites = implode(' OR ', array_map(static fn(string $d): string => "site:$d", $domains));
            $url = 'https://www.google.com/search?' . http_build_query(['q' => "$topic $sites", 'hl' => 'en', 'gl' => 'gb', 'num' => 10]) . '&brd_json=1';
            $data = json_decode($this->brightData((string) $this->settings['brightdata_serp_zone'], $url), true);
            if (!is_array($data)) { throw new ApiError('generator_search_failed', 502); }
            $out = [];
            foreach (is_array($data['organic'] ?? null) ? $data['organic'] : [] as $item) {
                if (is_string($item['link'] ?? null)) { $out[] = ['link' => $item['link'], 'title' => (string) ($item['title'] ?? '')]; }
            }
            return $out;
        }
        $ask = "Find up to 8 pages that explain this topic well for school children: $topic. Search only the allowed sites.";
        if ($this->settings['anthropic_api_key'] !== '') {
            try {
                $this->engine = 'claude';
                return $this->claudeSearch($ask, $domains);
            } catch (ApiError $e) {
                if ($this->settings['openrouter_api_key'] === '') { throw $e; }
            }
        }
        if ($this->settings['openrouter_api_key'] !== '') {
            $this->engine = 'openrouter';
            return $this->openRouterSearch($ask, $domains);
        }
        throw new ApiError('generator_off', 409);
    }

    private function claudeSearch(string $ask, array $domains): array
    {
        try {
            $message = $this->claude()->beta->messages->create(
                maxTokens: 4000,
                messages: [['role' => 'user', 'content' => $ask]],
                model: (string) $this->settings['model'],
                outputConfig: ['effort' => 'low'],
                tools: [BetaWebSearchTool20260209::with(allowedDomains: array_values($domains), maxUses: 3)],
            );
        } catch (APIStatusException | APIConnectionException) {
            throw new ApiError('generator_search_failed', 502);
        }
        $out = [];
        foreach ($message->content as $block) {
            if (($block->type ?? null) !== 'web_search_tool_result' || !is_array($block->content)) { continue; }
            foreach ($block->content as $result) {
                if (($result->type ?? null) === 'web_search_result') { $out[] = ['link' => $result->url, 'title' => $result->title]; }
            }
        }
        if (!$out) { throw new ApiError('generator_search_failed', 502); }
        return $out;
    }

    private function openRouterSearch(string $ask, array $domains): array
    {
        $data = $this->openRouter([
            'model' => $this->settings['openrouter_model'],
            'messages' => [['role' => 'user', 'content' => $ask]],
            'plugins' => [['id' => 'web', 'max_results' => 8, 'include_domains' => array_values($domains)]],
            'max_tokens' => 1500,
        ]);
        $out = [];
        foreach ($data['choices'][0]['message']['annotations'] ?? [] as $a) {
            $c = $a['url_citation'] ?? null;
            if (($a['type'] ?? null) === 'url_citation' && is_string($c['url'] ?? null)) { $out[] = ['link' => $c['url'], 'title' => (string) ($c['title'] ?? '')]; }
        }
        if (!$out) { throw new ApiError('generator_search_failed', 502); }
        return $out;
    }

    // ---- Pages ----

    public function fetch(string $url, array $domains): string
    {
        if ($this->hasBrightData()) {
            return $this->brightData((string) $this->settings['brightdata_unlocker_zone'], $url);
        }
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_MAXFILESIZE => 3_000_000,
            CURLOPT_USERAGENT => 'DoYouKnowBot/1.0 (+https://doyouknow.space/about; questions for a children\'s quiz)',
            CURLOPT_HTTPHEADER => ['Accept: text/html', 'Accept-Language: en-GB,en;q=0.8'],
        ]);
        $body = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $final = (string) curl_getinfo($curl, CURLINFO_EFFECTIVE_URL);
        curl_close($curl);
        $host = Generator::host($final);
        // A redirect off the trusted list is treated as a failed read.
        if (!is_string($body) || $status < 200 || $status >= 300 || $host === null || !Generator::trusted($host, $domains)) {
            throw new ApiError('generator_fetch_failed', 502, ['status' => $status]);
        }
        return $body;
    }

    // ---- Writing ----

    public function draft(string $system, string $user, array $schema): array
    {
        $refused = false;
        if ($this->settings['anthropic_api_key'] !== '') {
            try {
                return $this->claudeDraft($system, $user, $schema);
            } catch (ApiError $e) {
                // Any Anthropic failure, refusal included, gets one try on the backup.
                if ($this->settings['openrouter_api_key'] === '') { throw $e; }
                $refused = $e->errorCode === 'generator_refused';
            }
        }
        if ($this->settings['openrouter_api_key'] !== '') {
            $data = $this->openRouter([
                'model' => $this->settings['openrouter_model'],
                'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $user]],
                'response_format' => ['type' => 'json_schema', 'json_schema' => ['name' => 'quiz_questions', 'strict' => true, 'schema' => $schema]],
                'max_tokens' => 16000,
            ]);
            $choice = $data['choices'][0] ?? [];
            if (($choice['finish_reason'] ?? '') === 'content_filter') { throw new ApiError('generator_refused', 422); }
            $json = json_decode((string) ($choice['message']['content'] ?? ''), true);
            if (!is_array($json) || !is_array($json['questions'] ?? null)) { throw new ApiError($refused ? 'generator_refused' : 'generator_bad_output', $refused ? 422 : 502); }
            return ['questions' => $json['questions'], 'input_tokens' => (int) ($data['usage']['prompt_tokens'] ?? 0),
                'output_tokens' => (int) ($data['usage']['completion_tokens'] ?? 0), 'model' => 'openrouter:' . $this->settings['openrouter_model']];
        }
        throw new ApiError('generator_off', 409);
    }

    private function claudeDraft(string $system, string $user, array $schema): array
    {
        try {
            $message = $this->claude()->beta->messages->create(
                maxTokens: 16000,
                messages: [['role' => 'user', 'content' => $user]],
                model: (string) $this->settings['model'],
                system: $system,
                outputConfig: ['effort' => 'medium', 'format' => ['type' => 'json_schema', 'schema' => $schema]],
                // On a policy decline the API retries on its default fallback model in the same call.
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );
        } catch (APIStatusException $e) {
            throw new ApiError(($e->status ?? 0) === 429 ? 'generator_busy' : 'generator_model_error', 502);
        } catch (APIConnectionException) {
            throw new ApiError('generator_model_unreachable', 502);
        }
        if ($message->stopReason === 'refusal') { throw new ApiError('generator_refused', 422); }
        if ($message->stopReason === 'max_tokens') { throw new ApiError('generator_too_long', 502); }
        $json = null;
        foreach ($message->content as $block) {
            if (($block->type ?? null) === 'text') { $json = json_decode($block->text, true); break; }
        }
        if (!is_array($json) || !is_array($json['questions'] ?? null)) { throw new ApiError('generator_bad_output', 502); }
        return ['questions' => $json['questions'], 'input_tokens' => $message->usage->inputTokens,
            'output_tokens' => $message->usage->outputTokens, 'model' => 'anthropic:' . $message->model];
    }

    // ---- Clients ----

    private function claude(): Client
    {
        return new Client(apiKey: (string) $this->settings['anthropic_api_key'], requestOptions: ['timeout' => 110.0, 'maxRetries' => 1]);
    }

    private function openRouter(array $body): array
    {
        $curl = curl_init(self::OPENROUTER);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 110,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $this->settings['openrouter_api_key'],
                'HTTP-Referer: https://doyouknow.space', 'X-Title: Do You Know Studio'],
            CURLOPT_POSTFIELDS => json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
        ]);
        $raw = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        $data = is_string($raw) ? json_decode($raw, true) : null;
        if ($status === 429) { throw new ApiError('generator_busy', 503); }
        if (!is_array($data) || $status < 200 || $status >= 300 || isset($data['error'])) {
            throw new ApiError('generator_model_error', 502, ['status' => $status]);
        }
        return $data;
    }

    private function hasBrightData(): bool
    {
        return $this->settings['brightdata_api_key'] !== '' && $this->settings['brightdata_serp_zone'] !== '' && $this->settings['brightdata_unlocker_zone'] !== '';
    }

    private function brightData(string $zone, string $url): string
    {
        $curl = curl_init(self::BRIGHT_DATA);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 45,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $this->settings['brightdata_api_key']],
            CURLOPT_POSTFIELDS => json_encode(['zone' => $zone, 'url' => $url, 'format' => 'raw'], JSON_THROW_ON_ERROR),
        ]);
        $body = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if (!is_string($body) || $status < 200 || $status >= 300) {
            throw new ApiError('generator_fetch_failed', 502, ['status' => $status]);
        }
        return $body;
    }
}
