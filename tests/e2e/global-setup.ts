import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, openSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  API_PORT,
  API_URL,
  CONFIG_PATH,
  DB_HOST,
  DB_NAME,
  DB_PORT,
  DB_USER,
  DB_USER_HOST,
  FIXTURE_PHP,
  REPO_ROOT,
  WEB_ORIGIN,
  WORK_DIR,
} from './support/env';

/**
 * Starts a real PHP API against a fresh disposable MariaDB database, migrates and seeds it.
 * Playwright's webServer (see playwright.config.ts) serves the frontend pointing at it.
 *
 * Admin access to MariaDB comes from the usual client environment: by default the local
 * `mysql` client with its own login (a developer machine), or E2E_DB_ADMIN_HOST,
 * E2E_DB_ADMIN_USER and E2E_DB_ADMIN_PASSWORD, which switch to PDO over TCP (CI service).
 */

function mysqlAdmin(sql: string): void {
  const host = process.env.E2E_DB_ADMIN_HOST;
  if (host) {
    // CI: the PHP already installed for the API talks to the service container over TCP.
    execFileSync(
      'php',
      [
        '-r',
        `$pdo = new PDO('mysql:host=' . getenv('E2E_DB_ADMIN_HOST') . ';port=' . (getenv('E2E_DB_ADMIN_PORT') ?: '3306'),
           getenv('E2E_DB_ADMIN_USER') ?: 'root', getenv('E2E_DB_ADMIN_PASSWORD') ?: '',
           [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
         foreach (array_filter(array_map('trim', explode(';', getenv('E2E_ADMIN_SQL')))) as $statement) { $pdo->exec($statement); }`,
      ],
      { env: { ...process.env, E2E_ADMIN_SQL: sql }, stdio: ['ignore', 'ignore', 'inherit'] },
    );
    return;
  }
  // Developer machine: the local client with its own login (socket, no password).
  execFileSync('mysql', ['--batch', '-e', sql], { stdio: ['ignore', 'ignore', 'inherit'] });
}

const php = (args: string[], env: NodeJS.ProcessEnv): string =>
  execFileSync('php', args, { cwd: REPO_ROOT, env, encoding: 'utf8' });

async function waitForHealth(url: string, server: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error('The PHP API server exited early.');
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The PHP API did not answer at ${url}`);
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true, mode: 0o700 });

  // 1. A fresh database and a user that can only touch it.
  const password = randomBytes(16).toString('hex');
  mysqlAdmin(
    `DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME}; ` +
      `CREATE USER IF NOT EXISTS '${DB_USER}'@'${DB_USER_HOST}' IDENTIFIED BY '${password}'; ` +
      `ALTER USER '${DB_USER}'@'${DB_USER_HOST}' IDENTIFIED BY '${password}'; ` +
      `GRANT ALL ON ${DB_NAME}.* TO '${DB_USER}'@'${DB_USER_HOST}'; FLUSH PRIVILEGES;`,
  );

  // 2. A test config that allows only the Vite origin of this suite.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DYK_CONFIG: CONFIG_PATH,
    E2E_CFG_ORIGIN: WEB_ORIGIN,
    E2E_CFG_DB: JSON.stringify({
      host: DB_HOST,
      port: DB_PORT,
      name: DB_NAME,
      user: DB_USER,
      password,
    }),
  };
  php(
    [
      '-r',
      `$config = require 'backend/config.example.php';
       $config['environment'] = 'test';
       $config['allowed_origins'] = [getenv('E2E_CFG_ORIGIN')];
       $config['database'] = json_decode(getenv('E2E_CFG_DB'), true);
       $config['rate_limit_key'] = bin2hex(random_bytes(32));
       file_put_contents(getenv('DYK_CONFIG'), '<?php return ' . var_export($config, true) . ';');`,
    ],
    env,
  );
  chmodSync(CONFIG_PATH, 0o600);

  // 3. Migrate (twice, to prove it is idempotent) and seed.
  php(['backend/bin/migrate.php'], env);
  php(['backend/bin/migrate.php'], env);
  php([FIXTURE_PHP, 'seed'], env);

  // 4. The API, as the cPanel entry point serves it. A server left over from another checkout
  // would answer health checks with old code, so refuse to run rather than test the wrong API.
  if (
    await fetch(`${API_URL}/health`).then(
      () => true,
      () => false,
    )
  ) {
    throw new Error(`Port ${API_PORT} is already serving an API. Stop that process and retry.`);
  }
  const log = openSync(path.join(WORK_DIR, 'php.log'), 'w');
  const server = spawn(
    'php',
    ['-S', `127.0.0.1:${API_PORT}`, '-t', 'backend/public', 'backend/public/api.php'],
    {
      cwd: REPO_ROOT,
      env: { ...env, PHP_CLI_SERVER_WORKERS: '4' },
      stdio: ['ignore', log, log],
      // Own process group, so teardown also stops the PHP_CLI_SERVER_WORKERS children.
      detached: true,
    },
  );
  await waitForHealth(`${API_URL}/health`, server);

  // Workers inherit these, so fixtures can clear throttling between tests.
  process.env.DYK_CONFIG = CONFIG_PATH;

  return async () => {
    try {
      if (server.pid !== undefined) process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
    try {
      mysqlAdmin(
        `DROP DATABASE IF EXISTS ${DB_NAME}; DROP USER IF EXISTS '${DB_USER}'@'${DB_USER_HOST}';`,
      );
    } catch {
      /* best effort: the next run drops and recreates it anyway */
    }
    rmSync(WORK_DIR, { recursive: true, force: true });
  };
}
