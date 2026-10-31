<?php
declare(strict_types=1);
namespace Dyk;

/**
 * Recorded answers for the generator, read from a folder: search.json (the organic list),
 * pages.json ({url: html}) and draft.json ({"questions": [...]}). Generator only builds this
 * when the config says environment "test".
 */
final class GeneratorFixtures implements GeneratorTransport
{
    public function __construct(private readonly string $dir) {}

    public function search(string $query): array
    {
        return $this->read('search.json');
    }

    public function fetch(string $url): string
    {
        $pages = $this->read('pages.json');
        if (!is_string($pages[$url] ?? null)) { throw new ApiError('generator_fetch_failed', 502, ['status' => 404]); }
        return $pages[$url];
    }

    public function draft(string $model, string $system, string $user, array $schema): array
    {
        $draft = $this->read('draft.json');
        if (($draft['refuse'] ?? false) === true) { throw new ApiError('generator_refused', 422); }
        return ['questions' => $draft['questions'], 'input_tokens' => strlen($system . $user) >> 2, 'output_tokens' => 900];
    }

    private function read(string $name): array
    {
        $data = json_decode((string) @file_get_contents($this->dir . '/' . $name), true);
        if (!is_array($data)) { throw new \RuntimeException("generator fixture $name missing"); }
        return $data;
    }
}
