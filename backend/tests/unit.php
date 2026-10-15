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
fwrite(STDOUT,"$count checks passed\n");
