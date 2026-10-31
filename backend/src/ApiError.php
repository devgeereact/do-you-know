<?php
declare(strict_types=1);
namespace Dyk;
final class ApiError extends \RuntimeException
{
    /** $details is optional machine-readable context (validation problems); never personal data. */
    public function __construct(public readonly string $errorCode, public readonly int $status = 400, public readonly ?array $details = null)
    {
        parent::__construct($errorCode);
    }

    /** 422 with {error:{code,details}} for input that is well-formed JSON but not acceptable. */
    public static function invalid(string $code, array $details = []): self
    {
        return new self($code, 422, $details);
    }
}
