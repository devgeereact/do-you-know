<?php
declare(strict_types=1);
namespace Dyk;

/**
 * Recorded answers for the generator, read from a folder: search.json (the organic list),
 * pages.json ({url: html}), draft.json ({"questions": [...]}), write.json and review.json. Generator only builds this
 * when the config says environment "test".
 */
final class GeneratorFixtures implements GeneratorTransport
{
    public function __construct(private readonly string $dir) {}

    public function engine(): string
    {
        return 'fixtures';
    }

    public function search(string $topic, array $domains): array
    {
        return $this->read('search.json');
    }

    public function fetch(string $url, array $domains): string
    {
        $pages = $this->read('pages.json');
        if (!is_string($pages[$url] ?? null)) { throw new ApiError('generator_fetch_failed', 502, ['status' => 404]); }
        return $pages[$url];
    }

    public function draft(string $system, string $user, array $schema): array
    {
        $draft = $this->read('draft.json');
        if (($draft['refuse'] ?? false) === true) { throw new ApiError('generator_refused', 422); }
        return ['questions' => $draft['questions'], 'input_tokens' => strlen($system . $user) >> 2, 'output_tokens' => 900, 'model' => 'fixtures:recorded'];
    }

    public function write(string $kind, string $system, string $user): array
    {
        $texts = $this->read('write.json');
        if (!is_string($texts[$kind] ?? null)) { throw new ApiError('generator_bad_output', 502); }
        return ['text' => $texts[$kind], 'input_tokens' => strlen($system . $user) >> 2, 'output_tokens' => 40, 'model' => 'fixtures:recorded'];
    }

    /** review.json maps a prompt to its recorded verdict; a prompt not in it comes back "ok". */
    public function review(string $system, string $user, array $schema, array $questions): array
    {
        $recorded = $this->read('review.json');
        $items = [];
        foreach (array_values($questions) as $i => $q) {
            $items[] = ['index' => $i] + ($recorded[$q['prompt'] ?? ''] ?? ['verdict' => 'ok', 'reason' => '', 'prompt' => '', 'options' => [], 'explanation' => '']);
        }
        return ['items' => $items, 'input_tokens' => strlen($system . $user) >> 2, 'output_tokens' => 60 * count($items), 'model' => 'fixtures:recorded'];
    }

    private function read(string $name): array
    {
        $data = json_decode((string) @file_get_contents($this->dir . '/' . $name), true);
        if (!is_array($data)) { throw new \RuntimeException("generator fixture $name missing"); }
        return $data;
    }
}
