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
check('public question whitelists top-level fields',array_keys($publicQuestion)===['id','type','prompt','image_url','options','slider']);
check('public options contain no answer key',array_keys($publicQuestion['options'][0])===['id','label']);
check('public slider strips answer and accepted range',array_keys($publicQuestion['slider'])===['min','max','step','unit']);
check('UUIDs are distinct v4 identifiers',preg_match('/^[a-f0-9-]{14}4[a-f0-9-]{21}$/D',Dyk\Database::uuid())===1 && Dyk\Database::uuid()!==Dyk\Database::uuid());
check('client IP uses CF-Connecting-IP from a Cloudflare edge',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'172.70.1.2','HTTP_CF_CONNECTING_IP'=>'81.2.69.160'])==='81.2.69.160');
check('client IP uses CF-Connecting-IP from a Cloudflare IPv6 edge',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2a06:98c1::5','HTTP_CF_CONNECTING_IP'=>'2001:db8::1'])==='2001:db8::/64');
check('client IP ignores a forged header from a non-Cloudflare address',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'81.2.69.160','HTTP_CF_CONNECTING_IP'=>'1.2.3.4'])==='81.2.69.160');
check('client IP ignores an invalid forwarded value',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'172.70.1.2','HTTP_CF_CONNECTING_IP'=>'nope'])==='172.70.1.2');
check('IPv6 visitors are throttled per /64',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2001:db8:1:2:aaaa::1'])===Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2001:db8:1:2:bbbb::9'])&&Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2001:db8:1:3::1'])!==Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'2001:db8:1:2::1']));
check('client IP edge of range is excluded',Dyk\RateLimit::clientIp(['REMOTE_ADDR'=>'172.72.0.1','HTTP_CF_CONNECTING_IP'=>'81.2.69.160'])==='172.72.0.1');
fwrite(STDOUT,"$count checks passed\n");
