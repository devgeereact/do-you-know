// Build a fresh release package using explicit allowlists, never live configuration.
import { access, cp, mkdir, mkdtemp, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await access(path.join(root, 'dist/index.html'));
await access(path.join(root, 'backend/vendor/autoload.php'));
await mkdir(path.join(root, 'build'), { recursive: true });
const release = await mkdtemp(path.join(root, 'build/cpanel-'));
const publicDir = path.join(release, 'public');
const privateDir = path.join(release, 'private');
await mkdir(publicDir); await mkdir(privateDir);
for (const name of await readdir(path.join(root, 'dist'))) {
  await cp(path.join(root, 'dist', name), path.join(publicDir, name), {
    recursive: true,
    filter: (source) => !source.endsWith('.map'),
  });
}
await cp(path.join(root, '.htaccess'), path.join(publicDir, '.htaccess'));
await cp(path.join(root, 'backend/public'), path.join(publicDir, 'api'), { recursive: true });
for (const name of ['src', 'bin', 'migrations', 'vendor', 'composer.json', 'composer.lock', 'config.example.php', 'README.md', '.htaccess']) {
  await cp(path.join(root, 'backend', name), path.join(privateDir, name), { recursive: true });
}
// Generate only a blank private config, never copy the live backend/config.php.
await cp(path.join(root, 'backend/config.example.php'), path.join(privateDir, 'config.php'));
// Verify only public assets. Third-party dependency examples stay in private/.
async function verifyPublic(directory) {
  for (const name of await readdir(directory)) {
    const target = path.join(directory, name);
    if ((await stat(target)).isDirectory()) await verifyPublic(target);
    else if (/\.map$|^\.env|^config.*\.php$|^composer\.(json|lock)$|\.(sql|bak|zip|log)$/.test(name)) {
      throw new Error('Forbidden public release file: ' + path.relative(release, target));
    }
  }
}
await verifyPublic(publicDir);
process.stdout.write('cPanel release: ' + release + '\nPublic files and private backend must be deployed separately. Configure private/config.php before use.\n');
