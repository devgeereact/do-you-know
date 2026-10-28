// `pnpm dev`: starts the local PHP API (when a local config exists) and Vite together.
// Ctrl+C stops both. `pnpm dev:web` starts the frontend only.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const API_PORT = '55439'; // vite.config.ts proxies /api here (override with DYK_DEV_API)
const config = resolve('.local-test/dev-env.php');
const children = [];

function start(command, args, label, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  child.on('exit', (code) => {
    console.log(`[dev] ${label} stopped (exit ${code ?? 'signal'})`);
    shutdown(code ?? 0);
  });
  children.push(child);
}

function shutdown(code) {
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const hasPhp = spawnSync('php', ['--version'], { stdio: 'ignore' }).status === 0;
if (!hasPhp) {
  console.warn('[dev] PHP not found (brew install php) — starting the frontend only.');
} else if (!existsSync(config)) {
  console.warn(
    '[dev] No local API config at .local-test/dev-env.php — starting the frontend only.\n' +
      '      See backend/README.md → Local development.',
  );
} else {
  start(
    'php',
    ['-S', `127.0.0.1:${API_PORT}`, '-t', 'public', 'public/api.php'],
    `PHP API :${API_PORT}`,
    {
      cwd: 'backend',
      env: { ...process.env, DYK_CONFIG: config },
    },
  );
}
start('pnpm', ['exec', 'vite'], 'Vite');
