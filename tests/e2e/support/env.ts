import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Shared constants for the browser suite. Ports follow the dev-server registry notes in the brief. */
export const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5304);
export const API_PORT = Number(process.env.E2E_API_PORT ?? 55503);
export const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
export const API_URL = `http://127.0.0.1:${API_PORT}/api/v1`;

/** Disposable database and user. The name must end _test (the fixtures insist on it). */
export const DB_NAME = process.env.E2E_DB_NAME ?? 'dyk_e2e_test';
export const DB_USER = process.env.E2E_DB_USER ?? 'dyke2e';
/** Host part of the account. '127.0.0.1' avoids anonymous localhost accounts; CI uses '%'. */
export const DB_USER_HOST = process.env.E2E_DB_USER_HOST ?? '127.0.0.1';
export const DB_HOST = process.env.E2E_DB_HOST ?? '127.0.0.1';
export const DB_PORT = Number(process.env.E2E_DB_PORT ?? 3306);

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
/** Where the generated test config and server log live (gitignored .local-test/ folder). */
export const WORK_DIR = path.join(REPO_ROOT, '.local-test', `e2e-${API_PORT}`);
export const CONFIG_PATH = path.join(WORK_DIR, 'config.php');
export const FIXTURE_PHP = path.join(REPO_ROOT, 'tests/e2e/support/fixture.php');
