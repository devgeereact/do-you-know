<?php
declare(strict_types=1);

// Copy to ~/dyk-backend/shared/config.php (runtime user) and, for migrations only,
// ~/dyk-backend/shared/migration.php (migration user). OUTSIDE EVERY WEBROOT, chmod 600.
// Never commit real values. Browsers reach this API over HTTPS, never MySQL.
return [
    'environment' => 'production', // 'development' only for a local test server
    'allowed_origins' => ['https://doyouknow.soulrefresh.net'],
    // A development server may also list http://localhost:5202.
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'CPANEL_PREFIX_dyk_dev',
        'user' => 'CPANEL_PREFIX_dyk_api', // runtime user: SELECT, INSERT, UPDATE, DELETE only
        'password' => '',
    ],
    'clerk' => [
        // Must match the instance of VITE_CLERK_PUBLISHABLE_KEY (pk_live_ = production).
        'issuer' => 'https://clerk.YOUR-DOMAIN',
        // Provide the instance's PEM public key (no network call) or its secret key.
        'jwt_key' => '',
        'secret_key' => '',
        'authorized_parties' => ['https://doyouknow.soulrefresh.net'],
    ],
    'guest_ttl_seconds' => 604800, // 7 days, renewed while the player keeps playing
    // Random server key for hashing rate-limit identifiers, at least 32 characters.
    'rate_limit_key' => '',
];
