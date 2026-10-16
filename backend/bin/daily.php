<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $db=Dyk\Database::connect(Dyk\Config::load(dirname(__DIR__)));
    // Close earlier days, then make today's London challenge live (auto-pick if none).
    $r=(new Dyk\Daily($db))->activate();
    fwrite(STDOUT,sprintf("Daily %s: %s%s, %d earlier closed.\n",$r['date'],$r['action'],$r['quiz_slug']?' ('.$r['quiz_slug'].')':'',$r['closed']));
    if ($r['action']==='none_available') { exit(2); }
} catch (Throwable $error) { fwrite(STDERR,"Daily activation failed; check private configuration.\n");exit(1); }
