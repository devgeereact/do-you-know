<?php
declare(strict_types=1);

// Copy to config.php OUTSIDE EVERY WEBROOT and chmod 600. Never commit values.
// Both computers use the API over HTTPS, not this database connection directly.
return [
    'environment' => 'production', // use development only for a local test server
    'allowed_origins' => ['https://YOUR-DEVELOPMENT-DOMAIN'],
    // Development may additionally allow http://localhost:5202 explicitly.
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'CPANEL_PREFIX_dyk_dev',
        'user' => 'CPANEL_PREFIX_dyk_api',
        'password' => '',
    ],
    'clerk' => [
        'issuer' => 'https://YOUR-INSTANCE.clerk.accounts.dev',
        // Use the SAME development instance already selected for the React app.
        // Either provide its PEM public key (networkless) or its backend secret.
        'jwt_key' => '',
        'secret_key' => '',
        'authorized_parties' => ['https://YOUR-DEVELOPMENT-DOMAIN'],
    ],
    'guest_ttl_seconds' => 604800,
    // Unique random server key for hashing rate-limit identifiers (>=32 chars).
    'rate_limit_key' => '',
    // Future avatar worker configuration; private keys never enter VITE_*.
    'openrouter' => ['api_key' => '', 'image_model' => 'google/gemini-3.1-flash-image', 'safety_model' => 'openai/gpt-4o-mini'],
    'imagekit' => ['private_key' => '', 'url_endpoint' => 'https://ik.imagekit.io/YOUR_ID'],
];
