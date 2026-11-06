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
    // Sourced question generator in the Studio. Set with scripts/set-generator-keys.sh (never by hand).
    // Off until 'enabled' is true and an Anthropic or OpenRouter key is set. Anthropic writes and
    // searches by default; OpenRouter is the backup when Anthropic fails. Bright Data is optional
    // (used for search and page reading when all three of its settings are present). Each run costs
    // money: one web search, up to four page reads and one model call. Drafts never publish themselves.
    'generator' => [
        'enabled' => false,
        'anthropic_api_key' => '',
        'model' => 'claude-sonnet-5-5',
        'openrouter_api_key' => '',
        'openrouter_model' => 'anthropic/claude-sonnet-5.5',
        'brightdata_api_key' => '',        // optional
        'brightdata_serp_zone' => '',      // optional: a SERP API zone name
        'brightdata_unlocker_zone' => '',  // optional: a Web Unlocker zone name
        'daily_runs' => 20,                // runs allowed per London day
        // 'sources' => ['bbc.co.uk', ...], // optional; defaults to Generator::DEFAULT_SOURCES
    ],
];
