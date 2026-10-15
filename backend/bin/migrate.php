<?php
declare(strict_types=1);
// CLI only. The configured database must be this app's dedicated database.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $db=Dyk\Database::connect(Dyk\Config::load(dirname(__DIR__)));
    if ((int)Dyk\Database::one($db,"SELECT GET_LOCK('dyk_migrations',10) AS acquired")['acquired']!==1) { throw new RuntimeException('migration_lock_failed'); }
    $db->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    foreach (glob(dirname(__DIR__).'/migrations/[0-9]*.sql') as $file) {
        $version=basename($file);$hash=hash_file('sha256',$file);
        $existing=Dyk\Database::one($db,'SELECT checksum FROM schema_migrations WHERE version=?',[$version]);
        if ($existing) { if (!hash_equals($existing['checksum'],$hash)) { throw new RuntimeException('applied_migration_changed'); } continue; }
        // These files contain plain DDL, not procedures or semicolons in strings.
        foreach (preg_split('/;\s*(?:\r?\n|$)/',file_get_contents($file)) as $sql) { if (trim($sql)!=='') { $db->exec($sql); } }
        Dyk\Database::execute($db,'INSERT INTO schema_migrations (version,checksum) VALUES (?,?)',[$version,$hash]);
        fwrite(STDOUT,'Applied '.$version.PHP_EOL);
    }
    $db->query("SELECT RELEASE_LOCK('dyk_migrations')");
} catch (Throwable $error) {
    fwrite(STDERR,"Migration failed; do not cut over. Check the private server configuration and migration state.\n");
    exit(1);
}
