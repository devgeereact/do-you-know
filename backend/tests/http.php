<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use Dyk\Config;
use Dyk\Database;
$config=Config::load(dirname(__DIR__));
require __DIR__.'/guard.php';
$problems=testDatabaseProblems($config,getenv('DYK_CONFIG'),dirname(__DIR__,2).'/.local-test');
if ($problems) {
    fwrite(STDERR,"Refusing to run: this is not a disposable local test database.\n - ".implode("\n - ",$problems)."\n");exit(1);
}
$base=getenv('DYK_TEST_API')?:'http://127.0.0.1:55438/api/v1';
if (!preg_match('~^http://127\.0\.0\.1:\d+/api/v1$~D',$base)) { throw new RuntimeException('local_test_api_required'); }
$db=Database::connect($config);$count=0;
// Only this isolated test database may have its throttling fixtures reset.
$db->exec("DELETE FROM rate_limits");
function check(string $name,bool $ok): void {global $count;$count++;if(!$ok){fwrite(STDERR,'FAIL '.$name.PHP_EOL);exit(1);}fwrite(STDOUT,'PASS '.$name.PHP_EOL);}
function request(string $method,string $path,?array $body=null,?string $token=null,string $origin='http://localhost:5202',?string $raw=null): array {
    global $base;$c=curl_init($base.$path);$headers=['Origin: '.$origin,'Content-Type: application/json'];if($token){$headers[]='Authorization: Bearer '.$token;}
    curl_setopt_array($c,[CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15,CURLOPT_HEADER=>true]);
    if($body!==null||$raw!==null){curl_setopt($c,CURLOPT_POSTFIELDS,$raw??json_encode((object)$body));}
    $reply=curl_exec($c);if($reply===false){throw new RuntimeException('test_api_unreachable');}
    $status=curl_getinfo($c,CURLINFO_RESPONSE_CODE);$size=curl_getinfo($c,CURLINFO_HEADER_SIZE);$h=substr($reply,0,$size);$j=json_decode(substr($reply,$size),true);
    return ['status'=>$status,'body'=>$j,'headers'=>$h,'raw'=>substr($reply,$size)];
}
