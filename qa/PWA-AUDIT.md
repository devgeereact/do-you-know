# PWA development evidence

Owner Codex, 14 October 2026. Local static production build at localhost:5202, fresh headless Chrome, real local Supabase.

PASS: actual service worker controls the page, caches published catalogue metadata and serves it offline. Game POSTs, auth, profiles and attempts are absent from Cache Storage. A seeded dummy legacy `supabase-api` cache is deleted on startup. Offline quiz details show disabled Play; offline `/me` shows an error and no cached private history.

PASS: direct `/play/solar-system-starter` loads in the static build after changing Vite base to `/`; the earlier relative-base 404 regression is recorded in ADR-002.

PASS: a changed local worker script creates a genuine waiting worker while the question is displayed. The update button stays hidden on `/play/`; the question remains unchanged. Leaving the game surfaces the update prompt. Explicit activation clears the waiting worker. The temporary change to the generated worker was restored after verification.

Evidence: `/tmp/dyk-pwa-cache-check.mjs`, `/tmp/dyk-pwa-update-check.mjs`.

NOT TESTED: installed iPhone/Android behaviour, an upgrade from a deployed production version, full offline/slow/intermittent/expired-auth matrix, real push/install prompts and release recovery. This is not a complete PWA release audit.

## Competition extension, 15 October 2026

PASS: direct `/daily`, `/leaderboards` and `/challenge/:code` links in the static build. With the actual service worker controlling the browser, daily/leaderboard/friend RPC responses, auth and identity/history reads are absent from Cache Storage. Offline board navigation shows an error and no stale personal result. Board layouts fit 375px portrait, 812px landscape and 320px.

Evidence: `/tmp/dyk-compete-static.mjs`. This does not replace installed-phone and deployed-upgrade checks.
