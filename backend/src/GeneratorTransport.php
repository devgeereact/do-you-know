<?php
declare(strict_types=1);
namespace Dyk;

/**
 * The three outside calls the sourced generator makes. GeneratorLive talks to Claude (Anthropic
 * first, OpenRouter as the backup) and, when configured, Bright Data; GeneratorFixtures replays
 * recorded answers and only exists in the test environment, so no test ever spends money or
 * touches the network.
 */
interface GeneratorTransport
{
    /**
     * Pages about a topic on the trusted sites only: list of ['link' => string, 'title' => string].
     * Also returns the engine used under the key 'engine' of the last call (see engine()).
     */
    public function search(string $topic, array $domains): array;

    /** The raw HTML of one trusted page. */
    public function fetch(string $url, array $domains): string;

    /**
     * Ask the model for questions. Returns ['questions' => list, 'input_tokens' => int,
     * 'output_tokens' => int, 'model' => "provider:model" actually used]. Throws
     * ApiError('generator_refused') when every provider declines.
     */
    public function draft(string $system, string $user, array $schema): array;

    /** Which search engine answered the last search() ("brightdata", "claude", "openrouter", "fixtures"). */
    public function engine(): string;
}
