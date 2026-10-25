"""Run with python3 tests/unit/deploy-ftps.test.py; no network/credentials needed."""
import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('deploy',ROOT/'scripts/deploy-ftps.py');deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
class DeploymentBoundaries(unittest.TestCase):
 def test_coming_soon_is_allowlisted(self):
  files=deploy.payload(ROOT/'deployment/coming-soon');self.assertTrue(any(str(p)=='index.html' for _,p in files));self.assertFalse(any(f.suffix=='.php' for f,_ in files))
 def test_source_backend_cannot_be_public_payload(self):
  with self.assertRaises(ValueError):deploy.payload(ROOT/'backend')
 def test_remote_path_escape_rejected(self):
  for path in ['../other','/../other','/root/../other','/root\nSTOR wrong','relative']:
   with self.assertRaises(ValueError):deploy.remote_path(path)
 def test_scoped_root_is_supported(self):self.assertEqual(deploy.remote_path('/'),'/')
if __name__=='__main__':unittest.main()
