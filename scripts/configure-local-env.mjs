/* eslint-env node */
import { existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (existsSync('.env.local')) {
  process.stdout.write('Existing .env.local preserved.\n');
} else {
  const result = spawnSync('npx', ['--yes', 'supabase@2.121.0', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) throw new Error('Could not read local backend status.');
  const status = JSON.parse(result.stdout);
  if (status.API_URL !== 'http://127.0.0.1:55321' || typeof status.ANON_KEY !== 'string') {
    throw new Error('Unexpected local backend; environment was not written.');
  }
  writeFileSync('.env.local', [
    'VITE_APP_NAME="Do You Know"',
    'VITE_APP_URL="http://localhost:5202"',
    `VITE_SUPABASE_URL=${JSON.stringify(status.API_URL)}`,
    `VITE_SUPABASE_ANON_KEY=${JSON.stringify(status.ANON_KEY)}`,
    '',
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  process.stdout.write('Created ignored local environment with browser-safe anon credentials only.\n');
}
