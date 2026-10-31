<?php
declare(strict_types=1);
namespace Dyk;

/**
 * The three outside calls the sourced generator makes. GeneratorLive talks to Bright Data and
 * the Claude API; GeneratorFixtures replays recorded answers and only exists in the test
 * environment, so no test ever spends money or touches the network.
 */
interface GeneratorTransport
{
    /** Google results for a query: list of ['link' => string, 'title' => string]. */
    public function search(string $query): array;

    /** The raw HTML of one page. */
    public function fetch(string $url): string;

    /**
     * Ask the model for questions. Returns ['questions' => list, 'input_tokens' => int,
     * 'output_tokens' => int]. Throws ApiError('generator_refused') when the model declines.
     */
    public function draft(string $model, string $system, string $user, array $schema): array;
}
