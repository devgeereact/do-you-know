<?php
declare(strict_types=1);
namespace Dyk;
final class Database
{
    public static function transaction(\PDO $db, callable $action): mixed
    {
        $db->beginTransaction();
        try {
            $result = $action();
            $db->commit();
            return $result;
        } catch (\Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
    }

    public static function utc(?string $value): ?string
    {
        return $value === null ? null : (new \DateTimeImmutable($value, new \DateTimeZone('UTC')))
            ->format('Y-m-d\TH:i:s.v\Z');
    }

    public static function connect(array $config): \PDO
    {
        $d = $config['database'];
        foreach (['host', 'name'] as $key) {
            if (!is_string($d[$key] ?? null) || !preg_match('/^[A-Za-z0-9_.-]+$/D', $d[$key])) {
                throw new \RuntimeException('database_config_invalid');
            }
        }
        $db = new \PDO(
            sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $d['host'], $d['port'] ?? 3306, $d['name']),
            $d['user'], $d['password'],
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION, \PDO::ATTR_EMULATE_PREPARES => false,
             \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC, (defined("Pdo\\Mysql::ATTR_MULTI_STATEMENTS") ? constant("Pdo\\Mysql::ATTR_MULTI_STATEMENTS") : constant("PDO::MYSQL_ATTR_MULTI_STATEMENTS")) => false],
        );
        $db->exec("SET time_zone = '+00:00'");
        return $db;
    }

    public static function one(\PDO $db, string $sql, array $args = []): ?array
    {
        $s = $db->prepare($sql); $s->execute($args);
        return $s->fetch() ?: null;
    }

    public static function all(\PDO $db, string $sql, array $args = []): array
    {
        $s = $db->prepare($sql); $s->execute($args);
        return $s->fetchAll();
    }

    public static function execute(\PDO $db, string $sql, array $args = []): void
    {
        $s = $db->prepare($sql); $s->execute($args);
    }

    public static function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $h = bin2hex($bytes);
        return substr($h, 0, 8).'-'.substr($h, 8, 4).'-'.substr($h, 12, 4).'-'.substr($h, 16, 4).'-'.substr($h, 20);
    }
}
