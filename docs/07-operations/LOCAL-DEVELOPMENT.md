# Local development

The current backend is a persistent, isolated Supabase stack on Ubuntu, project ID `do-you-know`. It is not linked to a hosted project. Docker volumes retain development data across stops. Port 5202 remains the frontend port.

## Start and stop on Ubuntu

Prerequisites: Node/npm, Docker and internet access for the pinned CLI and initial image downloads.

```bash
npm ci
npm run backend:start
npm run dev
```

The startup script creates or checks a Docker network whose default host binding is `127.0.0.1`, starts Supabase CLI 2.121.0, verifies the API/database bindings and creates `.env.local` only if absent. It writes only the browser-safe anon key and local app/API URLs. Existing env files are preserved. Do not print CLI status/start output: it contains local credentials.

| Service | Ubuntu endpoint | Purpose |
|---|---|---|
| App | `http://localhost:5202` | Vite development UI |
| Supabase API | `http://127.0.0.1:55321` | Anonymous auth, public catalogue and game RPCs |
| Development Postgres | `127.0.0.1:55322` | App data, never the destructive test target |
| Scratch Postgres 16 | `127.0.0.1:55434` | Disposable behaviour checks only |

```bash
npm run backend:stop
```

Stopping retains Docker data. Do not reset or remove volumes without explicitly deciding to discard development data. Changes to numbered migrations follow the project migration policy; do not edit previously applied migrations.

## Development content

`supabase/seed.sql` contains one original, development-only quiz with all three question types. Factual explanations refer to [NASA Solar System Facts](https://science.nasa.gov/solar-system/solar-system-facts/), checked on 14 October 2026. This fixture does not count towards the 30 reviewed launch quizzes. The seed uses the normal server publishing function, so player requests still get questions without answer keys.

The seed runs on initial local creation or an explicitly approved local reset. Never run `db push --include-seed` on a hosted project. The synthetic fixture author has no password or sign-in flow. Seeding does not create a real user account or grant staff access to guests.

## Mac access through the private network

Keep backend ports on loopback. Use the existing Tailscale network and an SSH local forward from the Mac to Ubuntu. Machine addresses and SSH identities live in `~/.agents/gee-os/local-context/LOCAL-BACKEND.md` on Ubuntu. Set `DYK_UBUNTU_SSH` on the Mac to that Ubuntu SSH destination, using the Mac's own authorised SSH identity.

```bash
ssh -N -o ExitOnForwardFailure=yes \
  -L 5202:127.0.0.1:5202 \
  -L 55321:127.0.0.1:55321 \
  -L 55322:127.0.0.1:55322 \
  "$DYK_UBUNTU_SSH"
```

Then open `http://localhost:5202` on the Mac. The app and API both travel through SSH. Ubuntu must be awake, the backend and Vite must be running, and the Mac's forwarded ports must be free. The Mac needs SSH client access to Ubuntu; its own SSH server may remain off.

Env files, server keys and sessions do not travel between machines. Source changes travel through GitHub. For raw SQL tools, provision a separate restricted development database role for the Mac when needed; do not use the local admin credentials. A tunnel supplies connectivity, not database permissions.

Verification: loopback bindings and Tailscale reachability passed on Ubuntu. The Mac-origin SSH tunnel, browser and SQL-role check remain NOT TESTED until run on the Mac. No public listener or firewall rule was added.

## Independent database verification

The shim rebuilds a separate scratch database. Never point it at the development app database or a hosted project.

```bash
docker run -d --name dyk-tests-pg16 -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 127.0.0.1:55434:5432 postgres:16
python3 -m venv /tmp/dyk-test-venv
/tmp/dyk-test-venv/bin/pip install 'psycopg[binary]'
PATH=/tmp/dyk-test-venv/bin:$PATH PGHOST=127.0.0.1 PGPORT=55434 PGUSER=postgres \
  DYK_TEST_DB=dyk_test_local sh supabase/tests/run_tests.sh
```

If a scratch container already occupies 55434, reuse it after confirming its identity rather than starting a second one. The build session's scratch container is `dyk-tests-pg16-20261014`. Test databases must be `dyk_test` or have a `dyk_test_` prefix. The runner rejects remote hosts and stops on migration failure.

## Daily fixture and competition checks

Migration 0006 adds the server-dated daily preview. Apply pending migrations only to the local stack with `npx --yes supabase@2.121.0 migration up --local`.

The local seed now schedules the sample quiz for the server's current London day if no challenge is already scheduled, then invokes the normal activation function. On a later day, run the local seed again if you need a fresh development challenge:

```bash
docker exec -i supabase_db_do-you-know psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/seed.sql
```

This command is exclusively for the named local development stack. It preserves existing scheduled days and published sample versions. Never apply the development seed to a hosted project. Share links generated with localhost are suitable for isolated browser tests only; real devices need the configured app URL to be reachable through an authorised network or deployment. Native share/clipboard test adapters do not send messages.
