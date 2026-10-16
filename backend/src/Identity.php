<?php
declare(strict_types=1);
namespace Dyk;
use Clerk\Backend\Helpers\Jwks\AuthenticateRequest;
use Clerk\Backend\Helpers\Jwks\AuthenticateRequestOptions;
use GuzzleHttp\Psr7\Request;
final class Identity
{
    public static function clerkSubject(string $token, array $config): string
    {
        $c = $config['clerk'];
        if (empty($c['issuer']) || empty($c['authorized_parties']) || (empty($c['jwt_key']) && empty($c['secret_key']))) {
            throw new ApiError('clerk_not_configured', 503);
        }
        try {
            $state = AuthenticateRequest::authenticateRequest(
                new Request('GET', 'https://api.invalid/session', ['Authorization' => 'Bearer '.$token]),
                new AuthenticateRequestOptions(
                    secretKey: $c['secret_key'] ?: null,
                    jwtKey: $c['jwt_key'] ?: null,
                    authorizedParties: $c['authorized_parties'],
                    acceptsToken: ['session_token'],
                ),
            );
        } catch (\Throwable $error) {
            throw new ApiError('invalid_session', 401);
        }
        $claims = (array) ($state->getPayload() ?? []);
        if (!$state->isAuthenticated() || ($claims['iss'] ?? '') !== $c['issuer']
            || !in_array($claims['azp'] ?? '', $c['authorized_parties'], true)
            || !is_int($claims['exp'] ?? null) || $claims['exp'] <= time()
            || !is_int($claims['nbf'] ?? null) || $claims['nbf'] > time()+5
            || !is_int($claims['iat'] ?? null) || $claims['iat'] > time()+5
            || !is_string($claims['sub'] ?? null) || !str_starts_with($claims['sub'], 'user_')
            || !is_string($claims['sid'] ?? null) || !str_starts_with($claims['sid'], 'sess_')) {
            throw new ApiError('invalid_session', 401);
        }
        return $claims['sub'];
    }

    public static function profile(\PDO $db, array $config, string $token): array
    {
        if (str_starts_with($token, 'guest_')) {
            $row = Database::one($db, 'SELECT p.* FROM profiles p JOIN guest_sessions s ON s.profile_id=p.id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(6)', [hash('sha256', $token)]);
        } else {
            $subject = self::clerkSubject($token, $config);
            $row = Database::one($db, "SELECT p.* FROM profiles p JOIN identities i ON i.profile_id=p.id WHERE i.provider='clerk' AND i.subject=?", [$subject]);
        }
        if (!$row) { throw new ApiError('not_signed_in', 401); }
        return $row;
    }

    public static function guest(\PDO $db, array $config): array
    {
        $id = Database::uuid();
        $token = 'guest_'.bin2hex(random_bytes(32));
        $expires = gmdate('Y-m-d H:i:s', time() + $config['guest_ttl_seconds']);
        $db->beginTransaction();
        try {
            Database::execute($db, "INSERT INTO profiles (id,role) VALUES (?, 'guest')", [$id]);
            Database::execute($db, 'INSERT INTO guest_sessions (token_hash,profile_id,expires_at) VALUES (?,?,?)', [hash('sha256', $token), $id, $expires]);
            $db->commit();
        } catch (\Throwable $error) { $db->rollBack(); throw $error; }
        return ['token' => $token, 'expires_at' => gmdate('c', strtotime($expires.' UTC')), 'profile_id' => $id];
    }

    public static function adult(\PDO $db, array $config, string $token): array
    {
        // Called only after verified adult sign-in. No email/name/photo is stored.
        $subject = self::clerkSubject($token, $config);
        $db->beginTransaction();
        try {
            $row = Database::one($db, "SELECT profile_id FROM identities WHERE provider='clerk' AND subject=?", [$subject]);
            if (!$row) {
                $id = Database::uuid();
                Database::execute($db, "INSERT INTO profiles (id,role) VALUES (?, 'player')", [$id]);
                Database::execute($db, "INSERT INTO identities (provider,subject,profile_id) VALUES ('clerk',?,?)", [$subject, $id]);
            } else { $id = $row['profile_id']; }
            $db->commit();
        } catch (\PDOException $error) {
            $db->rollBack();
            // A concurrent first sign-in can win the unique identity constraint.
            if (($error->errorInfo[1] ?? null) !== 1062) { throw $error; }
            $row = Database::one($db, "SELECT profile_id FROM identities WHERE provider='clerk' AND subject=?", [$subject]);
            if (!$row) { throw $error; }
            $id = $row['profile_id'];
        }
        return ['profile_id' => $id, 'linked_game_history' => false];
    }
}
