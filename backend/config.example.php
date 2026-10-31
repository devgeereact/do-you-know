<?php
declare(strict_types=1);

// Copy to ~/do-you-know-private/shared/config.php (runtime user) and, for migrations only,
// ~/do-you-know-private/shared/migration.php (migration user). OUTSIDE EVERY WEBROOT, chmod 600.
// Never commit real values. Browsers reach this API over HTTPS, never MySQL.
return [
    'environment' => 'production', // 'development' only for a local test server
    'allowed_origins' => ['https://doyouknow.space'],
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
        'authorized_parties' => ['https://doyouknow.space'],
    ],
    // Public site origin used for absolute links in /sitemap.xml (no trailing slash).
    'site_url' => 'https://doyouknow.space',
    'guest_ttl_seconds' => 604800, // 7 days, renewed while the player keeps playing
    // Clerk user ids allowed into /admin (the Super Admin). Server-side only; never in the browser.
    'admin_subjects' => [],
    // Sender address for admin replies to adult feedback (PHP mail()). Empty: replies are saved in
    // the admin inbox but not emailed. Use an address on this domain, for example hello@doyouknow.space.
    'mail_from' => '',
    // Random server key for hashing rate-limit identifiers, at least 32 characters.
    'rate_limit_key' => '',
];
