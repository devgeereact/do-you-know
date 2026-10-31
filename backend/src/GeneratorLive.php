<?php
declare(strict_types=1);
namespace Dyk;

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\RateLimitException;

/**
 * Live calls for the generator. Bright Data (SERP API and Web Unlocker) through its REST
 * endpoint, the Claude API through the official PHP SDK. Keys come only from the private
 * config; nothing about players is ever sent.
 */
final class GeneratorLive implements GeneratorTransport
{
    private const BRIGHT_DATA = 'https://api.brightdata.com/request';

    public function __construct(private readonly array $settings) {}

    public function search(string $query): array
    {
        $url = 'https://www.google.com/search?' . http_build_query(['q' => $query, 'hl' => 'en', 'gl' => 'gb', 'num' => 10]) . '&brd_json=1';
        $body = $this->brightData((string) $this->settings['brightdata_serp_zone'], $url);
        $data = json_decode($body, true);
        if (!is_array($data)) { throw new ApiError('generator_search_failed', 502); }
        $out = [];
        foreach (is_array($data['organic'] ?? null) ? $data['organic'] : [] as $item) {
            if (is_string($item['link'] ?? null)) {
                $out[] = ['link' => $item['link'], 'title' => is_string($item['title'] ?? null) ? $item['title'] : ''];
            }
        }
        return $out;
    }

    public function fetch(string $url): string
    {
        return $this->brightData((string) $this->settings['brightdata_unlocker_zone'], $url);
    }

    public function draft(string $model, string $system, string $user, array $schema): array
    {
        $client = new Client(apiKey: (string) $this->settings['anthropic_api_key'], requestOptions: ['timeout' => 110.0, 'maxRetries' => 1]);
        try {
            $message = $client->beta->messages->create(
                maxTokens: 16000,
                messages: [['role' => 'user', 'content' => $user]],
                model: $model,
                system: $system,
                outputConfig: ['effort' => 'medium', 'format' => ['type' => 'json_schema', 'schema' => $schema]],
                // On a policy decline the API retries on its default fallback model in the same call.
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );
        } catch (RateLimitException) {
            throw new ApiError('generator_busy', 503);
        } catch (APIStatusException $e) {
            throw new ApiError('generator_model_error', 502, ['status' => $e->status ?? null]);
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
        return ['questions' => $json['questions'], 'input_tokens' => $message->usage->inputTokens, 'output_tokens' => $message->usage->outputTokens];
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
