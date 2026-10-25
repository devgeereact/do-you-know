// Prepare frontend + public API entry only; never copy config/vendor/private backend.
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('.release-public',{recursive:true});
await cp('dist','.release-public',{recursive:true,filter:p=>!p.endsWith('.map')&&!p.endsWith('.md')});
await cp('.htaccess','.release-public/.htaccess');
await mkdir('.release-public/api',{recursive:true});
await cp('backend/public/api.php','.release-public/api/api.php');
const build=process.env.GITHUB_SHA||'local-review';
const file='.release-public/index.html';
await writeFile(file,(await readFile(file,'utf8')).replace('</head>',`<meta name="dyk-build" content="${build}"></head>`));
process.stdout.write('Public release prepared. Private backend/config/database are NOT included.\n');
