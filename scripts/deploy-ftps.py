#!/usr/bin/env python3
"""Scoped explicit-FTPS public deployment. No delete/migration/private files."""
from pathlib import Path,PurePosixPath
import argparse,os,ssl,ftplib,urllib.request,urllib.parse,sys,re
ROOT=Path(__file__).resolve().parents[1]
DOMAIN='doyouknow.space'
MARKER='.do-you-know-deploy-target'
def payload(folder):
 folder=Path(folder).resolve();approved=[ROOT/'deployment/coming-soon',ROOT/'.release-public']
 if folder not in approved:raise ValueError('Payload must be an approved public staging directory')
 files=[]
 for f in sorted(folder.rglob('*')):
  if f.is_symlink():raise ValueError('Payload symlinks forbidden')
  if not f.is_file():continue
  rel=f.relative_to(folder)
  if f.name.startswith('.') and f.name!='.htaccess':raise ValueError('Hidden payload file forbidden')
  if any(part in {'node_modules','vendor','.git','backend','uploads','backups'} for part in rel.parts):raise ValueError('Private/runtime payload directory forbidden')
  if re.search(r'(^\.env|config.*\.php$|\.(map|sql|bak|zip|tgz|key|pem|log|ini|bundle)$|^composer\.)',f.name,re.I):raise ValueError('Private/generated payload file forbidden')
  if f.suffix=='.php' and str(rel)!='api/api.php':raise ValueError('Unapproved public PHP file')
  files.append((f,rel))
 if not (folder/'index.html').is_file():raise ValueError('Missing public index.html')
 return files
def remote_path(value):
 path=PurePosixPath(value)
 if not value.startswith('/') or '..' in path.parts or '\\' in value or any(ord(c)<32 for c in value):raise ValueError('Remote directory must be a verified absolute scoped FTPS path')
 return str(path)
def deploy(folder,expected_build):
 files=payload(folder);names=['FTPS_HOST','FTPS_USERNAME','FTPS_PASSWORD','FTPS_REMOTE_DIR']
 if any(not os.environ.get(k) for k in names):raise ValueError('Required FTPS secrets are missing; see setup guide')
 base=remote_path(os.environ['FTPS_REMOTE_DIR']);host=os.environ['FTPS_HOST']
 if '://' in host or '/' in host or any(c.isspace() for c in host):raise ValueError('FTPS_HOST must be a verified TLS hostname')
 port=int(os.environ.get('FTPS_PORT','21'))
 if not 1<=port<=65535:raise ValueError('Invalid FTPS port')
 ftp=ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=45)
 try:
  ftp.connect(host,port);ftp.auth();ftp.login(os.environ['FTPS_USERNAME'],os.environ['FTPS_PASSWORD']);ftp.prot_p();ftp.set_pasv(True);ftp.cwd(base)
  marker=[];ftp.retrbinary('RETR '+MARKER,marker.append)
  if b''.join(marker).decode().strip()!=DOMAIN:raise ValueError('Remote target marker does not match the approved domain')
  # Directory creation is scoped; no mirror, removal or remote shell command.
  directories=sorted({str(p.parent) for _,p in files if str(p.parent)!='.'},key=lambda p:(p.count('/'),p))
  for directory in directories:
   parts=PurePosixPath(directory).parts
   for i in range(1,len(parts)+1):
    sub='/'.join(parts[:i])
    try:ftp.mkd(sub)
    except ftplib.error_perm:ftp.cwd(sub);ftp.cwd(base)
  # Upload shared assets before entry documents. Never remove old hashed assets or unknown files.
  files.sort(key=lambda item:item[1].name in {'index.html','sw.js','manifest.webmanifest','.htaccess'})
  for file,rel in files:
   with file.open('rb') as stream:ftp.storbinary('STOR '+str(rel),stream)
 finally:
  try:ftp.quit()
  except Exception:ftp.close()
 request=urllib.request.Request('https://'+DOMAIN+'/',headers={'Cache-Control':'no-cache','User-Agent':'Do-You-Know-release-check'})
 with urllib.request.urlopen(request,timeout=30,context=ssl.create_default_context()) as response:
  if urllib.parse.urlsplit(response.url).hostname!=DOMAIN:raise ValueError('Unexpected public redirect host')
  page=response.read(2_000_000).decode('utf-8',errors='replace')
 if expected_build and expected_build not in page:raise ValueError('Uploaded build identifier not observed; review caching/target before retrying')
 print('PASS: allowlisted public files uploaded and HTTPS build identifier verified. No remote files deleted.')
def main():
 p=argparse.ArgumentParser();p.add_argument('--payload',required=True);p.add_argument('--publish',action='store_true');p.add_argument('--build-id',default='');a=p.parse_args()
 files=payload(ROOT/a.payload)
 if not a.publish:
  print('DRY RUN: no connection or upload. Public payload:');print('\n'.join(str(rel) for _,rel in files));return
 if os.environ.get('DEPLOY_CONFIRM_DOMAIN')!=DOMAIN:raise ValueError('Set the exact approved domain confirmation')
 deploy(ROOT/a.payload,a.build_id)
if __name__=='__main__':
 try:main()
 except Exception as error:
  # Server replies can reflect connection details; never print exception payloads.
  print('BLOCKED: FTPS/public verification failed ('+type(error).__name__+'). Credentials were not printed; inspect configuration and scoped target.',file=sys.stderr);sys.exit(1)
