import unittest,importlib.util,io,contextlib
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('guard',Path(__file__).resolve().parents[2]/'scripts/guard.py');guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
class GuardBoundaries(unittest.TestCase):
 def check(self,name,content):
  def git(*args):
   if args[0]=='diff':return name.encode()+b'\0'
   if args[0]=='cat-file':return str(len(content)).encode()
   if args[0]=='show':return content
   raise AssertionError('Unexpected Git operation')
  with patch.object(guard,'git',git),contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):return guard.main()
 def test_source_config_class_allowed(self):self.assertEqual(self.check('backend/src/Config.php',b'<?php namespace Dyk; final class Config {}'),0)
 def test_runtime_config_still_blocked(self):self.assertEqual(self.check('backend/config.php',b'<?php return [];'),1)
 def test_source_class_still_secret_scanned(self):self.assertEqual(self.check('backend/src/Config.php',b'-----BEGIN '+b'PRIVATE KEY-----'),1)
 def test_nested_env_still_blocked(self):self.assertEqual(self.check('backend/src/.env',b'example'),1)
if __name__=='__main__':unittest.main()
