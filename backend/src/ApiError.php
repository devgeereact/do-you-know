<?php
declare(strict_types=1);
namespace Dyk;
final class ApiError extends \RuntimeException
{
    public function __construct(public readonly string $errorCode, public readonly int $status = 400)
    {
        parent::__construct($errorCode);
    }
}
