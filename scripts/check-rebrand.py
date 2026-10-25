#!/usr/bin/env python3
"""Static identity/secret-boundary checks, never prints matching content."""
from pathlib import Path
import re,json,sys
ROOT=Path(__file__).resolve().parents[1]
SKIP={'.git','node_modules','vendor','dist','build','.cache','.release-public','__pycache__'}
legacy=[b'doyouknow.soulrefresh.net',b'doyouknow.example',b'github.com/devgeereact/do-you-know']
secret=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'gh[pousr]_[A-Za-z0-9]{30,}',rb'github_pat_[A-Za-z0-9_]{30,}',rb'AKIA[A-Z0-9]{16}',rb'sk_(?:live|test)_[A-Za-z0-9]{20,}']
problems=[]
for path in ROOT.rglob('*'):
 if not path.is_file() or path.is_symlink() or SKIP.intersection(path.relative_to(ROOT).parts):continue
 if path.resolve()==Path(__file__).resolve():continue
 if path.name.startswith('.env') and path.name!='.env.example':problems.append((str(path.relative_to(ROOT)),'real env file needs private review'));continue
 if path.name in {'config.php','settings.local.json'}:continue
 if path.suffix.lower() in {'.png','.jpg','.webp','.ico','.woff','.woff2','.pdf','.zip'}:continue
 body=path.read_bytes()
 if any(term in body for term in legacy):problems.append((str(path.relative_to(ROOT)),'legacy identity reference'))
 if any(re.search(pattern,body) for pattern in secret):problems.append((str(path.relative_to(ROOT)),'possible credential signature'))
assert json.loads((ROOT/'forge.config.json').read_text())['appUrl']=='https://doyouknow.space'
for workflow in (ROOT/'.github/workflows').glob('*.yml'):
 if re.search(r'(?m)^\s*(workflow_run|push|pull_request|schedule):',workflow.read_text()):problems.append((str(workflow.relative_to(ROOT)),'unexpected automatic workflow trigger'))
if problems:
 for name,reason in problems:print('FAIL:',name,'—',reason)
 sys.exit(1)
print('PASS: current-domain references, manual triggers and basic secret patterns checked. Not a complete security audit.')
