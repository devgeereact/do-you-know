<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use Dyk\ApiError;
use Dyk\Game;
use Dyk\Identity;
use Firebase\JWT\JWT;

$count=0;
function check(string $name, bool $ok): void {
    global $count; $count++;
    if (!$ok) { fwrite(STDERR,'FAIL '.$name.PHP_EOL); exit(1); }
    fwrite(STDOUT,'PASS '.$name.PHP_EOL);
}
$key=openssl_pkey_new(['private_key_bits'=>2048,'private_key_type'=>OPENSSL_KEYTYPE_RSA]);
openssl_pkey_export($key,$private);
$public=openssl_pkey_get_details($key)['key'];
$config=['clerk'=>['issuer'=>'https://fixture.clerk.accounts.dev','authorized_parties'=>['http://localhost:5202'],'jwt_key'=>$public,'secret_key'=>'']];
$claims=['sub'=>'user_fixture','sid'=>'sess_fixture','iss'=>'https://fixture.clerk.accounts.dev','azp'=>'http://localhost:5202','iat'=>time(),'nbf'=>time()-1,'exp'=>time()+60];
$token=JWT::encode($claims,$private,'RS256','fixture');
check('verified session maps only its signed subject', Identity::clerkSubject($token,$config)==='user_fixture');
foreach (['issuer'=>['iss'=>'https://another.clerk.accounts.dev'],'origin'=>['azp'=>'https://attacker.example'],'expired'=>['exp'=>time()-60],'future'=>['nbf'=>time()+60],'subject'=>['sub'=>'org_attacker'],'missing session'=>['sid'=>null],'missing expiry'=>['exp'=>null],'missing origin'=>['azp'=>null]] as $name=>$patch) {
    $ok=false;
    try { Identity::clerkSubject(JWT::encode(array_merge($claims,$patch),$private,'RS256','fixture'),$config); }
    catch (ApiError $error) { $ok=$error->status===401; }
    check('rejects '.$name,$ok);
}
$ok=false;
try { Identity::clerkSubject($token.'tampered',$config); } catch (ApiError $error) { $ok=$error->status===401; }
check('rejects tampered signature',$ok);
$q=['id'=>'q','type'=>'slider','prompt'=>'A test','image_url'=>null,'explanation'=>'hidden','source_url'=>'https://example.com','options'=>[['id'=>'o','label'=>'Choice','is_correct'=>true]],'slider'=>['min'=>0,'max'=>10,'step'=>1,'unit'=>null,'correct'=>5,'accept_min'=>4,'accept_max'=>6]];
$publicQuestion=Game::publicQuestion($q);
check('public question whitelists top-level fields',array_keys($publicQuestion)===['id','type','prompt','image_url','scene','options','slider']);
check('public question scene is a cosmetic world name only',in_array($publicQuestion['scene'],\Dyk\Content::SCENES,true));
check('public options contain no answer key',array_keys($publicQuestion['options'][0])===['id','label']);
check('public slider strips answer and accepted range',array_keys($publicQuestion['slider'])===['min','max','step','unit']);
check('UUIDs are distinct v4 identifiers',preg_match('/^[a-f0-9-]{14}4[a-f0-9-]{21}$/D',Dyk\Database::uuid())===1 && Dyk\Database::uuid()!==Dyk\Database::uuid());
check('client IP uses CF-Connecting-IP from a Cloudflare edge',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'172.70.1.2','HTTP_CF_CONNECTING_IP'=>'81.2.69.160'])==='81.2.69.160');
check('client IP uses CF-Connecting-IP from a Cloudflare IPv6 edge',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2a06:98c1::5','HTTP_CF_CONNECTING_IP'=>'2001:db8::1'])==='2001:db8::/64');
check('client IP ignores a forged header from a non-Cloudflare address',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'81.2.69.160','HTTP_CF_CONNECTING_IP'=>'1.2.3.4'])==='81.2.69.160');
check('client IP ignores an invalid forwarded value',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'172.70.1.2','HTTP_CF_CONNECTING_IP'=>'nope'])==='172.70.1.2');
check('IPv6 visitors are throttled per /64',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2001:db8:1:2:aaaa::1'])===Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2001:db8:1:2:bbbb::9'])&&Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2001:db8:1:3::1'])!==Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2001:db8:1:2::1']));
check('client IP edge of range is excluded',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'172.72.0.1','HTTP_CF_CONNECTING_IP'=>'81.2.69.160'])==='172.72.0.1');
// Round picking: a player meets every question in a bank before any repeats.
$bank=array_map(fn(int $i): string => "q$i", range(1,30));
$history=[]; $played=[];
for ($r=0; $r<3; $r++) { $round=Game::pickRound($bank,10,$history); array_unshift($history,$round); $played=array_merge($played,$round); }
check('three rounds of ten cover a 30-question bank with no repeats',count($played)===30 && count(array_unique($played))===30);
$fourth=Game::pickRound($bank,10,$history);
check('after the bank is used up the oldest round comes back first',count(array_unique($fourth))===10 && !array_diff($fourth,$history[2]));
check('a round never repeats a question inside itself',count(array_unique(Game::pickRound($bank,30,[])))===30);
$partial=Game::pickRound($bank,10,[['q1','q2','q3']]);
check('questions shown in an abandoned round count as seen',!array_intersect($partial,['q1','q2','q3']));
check('a round is not served in bank order',(function() use ($bank): bool { for ($i=0;$i<5;$i++) { if (Game::pickRound($bank,30,[])!==$bank) { return true; } } return false; })());
check('prompt keys ignore case, spaces and punctuation',Dyk\Content::promptKey('What is 2 + 2?')===Dyk\Content::promptKey('what is 2+2'));
check('prompt keys keep maths symbols apart',Dyk\Content::promptKey('What is 7 + 8?')!==Dyk\Content::promptKey('What is 7 × 8?'));
check('round size defaults to ten or the whole bank',Dyk\Content::roundSize(['questions'=>array_fill(0,30,[])])===10 && Dyk\Content::roundSize(['questions'=>array_fill(0,7,[])])===7 && Dyk\Content::roundSize(['round_size'=>15,'questions'=>array_fill(0,30,[])])===15);
check('ranked rounds are twenty questions, practice keeps the quiz round size',Game::roundSize('ranked',10,30)===20 && Game::roundSize('practice',10,30)===10 && Game::roundSize('ranked',10,12)===12);
check('a ranked round is twenty distinct questions from the bank',count(array_unique(Game::pickRound($bank,Game::roundSize('ranked',10,30),[])))===20);
require __DIR__.'/guard.php';
$localTest=dirname(__DIR__,2).'/.local-test/tmp/dyk-guard-'.bin2hex(random_bytes(4)).'/.local-test';
mkdir($localTest,0700,true);file_put_contents($localTest.'/ok.php','<?php');
$good=['environment'=>'test','allowed_origins'=>['http://localhost:5202'],'database'=>['host'=>'127.0.0.1','name'=>'dyk_test','user'=>'root']];
check('a local _test database inside .local-test passes the guard',testDatabaseProblems($good,$localTest.'/ok.php',$localTest)===[]);
check('the guard refuses a missing DYK_CONFIG',testDatabaseProblems($good,false,$localTest)!==[]);
check('the guard refuses a config outside .local-test',testDatabaseProblems($good,__FILE__,$localTest)!==[]);
check('the guard refuses a non-test environment',testDatabaseProblems(['environment'=>'production']+$good,$localTest.'/ok.php',$localTest)!==[]);
check('the guard refuses a database not ending _test',testDatabaseProblems(array_replace_recursive($good,['database'=>['name'=>'dyk_dev']]),$localTest.'/ok.php',$localTest)!==[]);
check('the guard refuses production-looking names',testDatabaseProblems(array_replace_recursive($good,['database'=>['name'=>'devgeereact_doyouknow_test']]),$localTest.'/ok.php',$localTest)!==[]);
check('the guard refuses a remote database host',testDatabaseProblems(array_replace_recursive($good,['database'=>['host'=>'db.example.com']]),$localTest.'/ok.php',$localTest)!==[]);
check('the guard refuses a live origin',testDatabaseProblems(['allowed_origins'=>['https://doyouknow.space']]+$good,$localTest.'/ok.php',$localTest)!==[]);
unlink($localTest.'/ok.php');rmdir($localTest);rmdir(dirname($localTest));

// Cosmetic scenes: own scene, then prompt words in rule order, then the category, then a stable pick.
$scene=fn(string $prompt,?string $own=null,?string $category=null,string $id='q-1'): string => \Dyk\Content::sceneFor(['prompt'=>$prompt]+($own===null?[]:['scene'=>$own]),$category,$id);
check('a question keeps its own scene',$scene('How many planets are there?','past')==='past');
check('planets mean space',$scene('How many planets are in our solar system?')==='space');
check('whales mean ocean',$scene('Which is the largest whale?')==='ocean');
check('penguins mean arctic',$scene('Where do emperor penguins live?')==='arctic');
check('a stem matches longer words',$scene('What happens when water is freezing?')==='arctic');
check('bones mean body',$scene('How many bones are in your body?')==='body');
check('kings mean past',$scene('Which king had six wives?')==='past');
check('digits mean city',$scene('What is 7 × 8?')==='city');
check('capitals mean desert',$scene('What is the capital of France?')==='desert');
check('lions mean jungle',$scene('What do lions eat?')==='jungle');
check('the first matching rule wins',$scene('Which planet has the biggest ocean?')==='space');
check('words match whole, so "start" is not a star',$scene('Who will start the race?',null,'body')==='body');
check('the category scene is the next fallback',$scene('Which word is spelt correctly?',null,'jungle')==='jungle');
check('an invalid category scene is ignored',in_array($scene('Which word is spelt correctly?',null,'mars'),\Dyk\Content::SCENES,true));
check('the last fallback is stable per question',$scene('Pick a word',null,null,'a')===$scene('Pick a word',null,null,'a'));
$picks=[];foreach(range(1,40) as $i){$picks[$scene('Pick a word',null,null,'id-'.$i)]=true;}
check('the last fallback varies between questions',count($picks)>=4);
// Daily order: the same for one date, a different slice on another date, never file order by design.
$ids=array_map(fn(int $i): string => sprintf('00000000-0000-4000-8000-%012d',$i),range(1,30));
check('daily order is deterministic for a date',Game::dailyOrder($ids,'2026-11-01',10)===Game::dailyOrder($ids,'2026-11-01',10));
check('daily order takes the round size',count(Game::dailyOrder($ids,'2026-11-01',10))===10&&count(array_unique(Game::dailyOrder($ids,'2026-11-01',10)))===10);
check('daily order changes with the date',Game::dailyOrder($ids,'2026-11-01',10)!==Game::dailyOrder($ids,'2026-11-02',10));
check('daily order is not file order',Game::dailyOrder($ids,'2026-11-01',10)!==array_slice($ids,0,10));
$p=\Dyk\Overall::periodStart('week',new DateTimeImmutable('2026-11-04 12:00:00',new DateTimeZone('UTC')));
check('the overall week starts Monday 00:00 London (UTC in winter)',$p==='2026-11-02 00:00:00.000000');
$p=\Dyk\Overall::periodStart('month',new DateTimeImmutable('2026-07-15 12:00:00',new DateTimeZone('UTC')));
check('the overall month starts on the 1st, London summer time',$p==='2026-06-30 23:00:00.000000');
check('all time has no start',\Dyk\Overall::periodStart('all')===null);
fwrite(STDOUT,"$count checks passed\n");
