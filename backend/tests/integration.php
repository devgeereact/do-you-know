<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use Dyk\Config;
use Dyk\Database;
$config=Config::load(dirname(__DIR__));
if ($config['environment']!=='test' || !str_ends_with($config['database']['name'],'_test')) {
    fwrite(STDERR,"Tests require environment=test and a dedicated database ending _test.\n");exit(1);
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
    return ['status'=>$status,'body'=>$j,'headers'=>$h];
}
// Fixtures are original test content in a fresh private database, never public production seed.
$category=Database::uuid();$quiz=Database::uuid();$version=Database::uuid();$snapshot=[];
foreach (['choice','boolean','slider'] as $type) {
    $q=['id'=>Database::uuid(),'type'=>$type,'prompt'=>'Test '.$type,'image_url'=>null,'explanation'=>'Test explanation','source_url'=>'https://example.org/source','options'=>[],'slider'=>null];
    if($type==='slider'){$q['slider']=['min'=>0,'max'=>10,'step'=>1,'unit'=>null,'correct'=>5,'accept_min'=>4,'accept_max'=>6];}
    else{$q['options']=[['id'=>Database::uuid(),'label'=>'Right','is_correct'=>true],['id'=>Database::uuid(),'label'=>'Other','is_correct'=>false]];}
    $snapshot[]=$q;
}
$slug='test-'.substr($quiz,0,8);
Database::execute($db,'INSERT INTO categories (id,slug,name) VALUES (?,?,?)',[$category,$slug,'Test category']);
Database::execute($db,"INSERT INTO quizzes (id,slug,title,category_id,status,current_version_id,time_limit_seconds) VALUES (?,?,?,?,'published',?,5)",[$quiz,$slug,'Test quiz',$category,$version]);
Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',[$version,$quiz,json_encode($snapshot)]);
$keys=array_column($snapshot,null,'id');
$r=request('GET','/health');check('health responds without exposing config',$r['status']===200&&$r['body']===['status'=>'ok','api_version'=>1]);
check('API responses are never cached',str_contains(strtolower($r['headers']),'no-store'));
$r=request('OPTIONS','/attempts');check('preflight allows bearer header',$r['status']===204&&str_contains($r['headers'],'Authorization'));
$r=request('GET','/health',null,null,'https://attacker.example');check('rejects unapproved origin',$r['status']===403&&!str_contains($r['headers'],'Access-Control-Allow-Origin'));
$r=request('POST','/guest-sessions',null,null,'http://localhost:5202','{broken');check('rejects malformed JSON',$r['status']===400);
$r=request('POST','/guest-sessions',null,null,'http://localhost:5202','[]');check('requires JSON object',$r['status']===400);
$r=request('POST','/guest-sessions',null,null,'http://localhost:5202',str_repeat('x',32769));check('caps body size',$r['status']===413);
$r=request('POST','/guest-sessions',[]);$guest=$r['body'];check('creates guest without personal data',$r['status']===201&&str_starts_with($guest['token'],'guest_'));
$r=request('POST','/guest-sessions',[]);$other=$r['body'];
$suffix=str_replace('-','',Database::uuid());
Database::execute($db,"INSERT INTO identities (provider,subject,profile_id) VALUES ('clerk',?,?),('clerk',?,?)",['user_Case'.$suffix,$guest['profile_id'],'user_case'.$suffix,$other['profile_id']]);
$caseCount=Database::one($db,'SELECT COUNT(*) AS n FROM identities WHERE subject IN (?,?)',['user_Case'.$suffix,'user_case'.$suffix]);
check('Clerk subjects remain case-sensitive',(int)$caseCount['n']===2);
$stored=Database::one($db,'SELECT token_hash FROM guest_sessions WHERE profile_id=?',[$guest['profile_id']]);check('stores only hash of guest token',$stored['token_hash']===hash('sha256',$guest['token']));
$r=request('GET','/me',null,$guest['token']);check('guest sees own profile',$r['body']['id']===$guest['profile_id']&&$r['body']['role']==='guest');
$r=request('GET','/me?user_id='.$other['profile_id'],null,$guest['token']);check('submitted profile ID cannot change identity',$r['status']===200&&$r['body']['id']===$guest['profile_id']);
$r=request('GET','/me');check('profile requires identity',$r['status']===401);
$r=request('GET','/me',null,'guest_forged');check('rejects forged guest token',$r['status']===401);
$r=request('GET','/categories');check('published categories readable',$r['status']===200&&count($r['body'])>0);
$r=request('GET','/quizzes/'.$slug);check('catalogue contains no snapshot',$r['status']===200&&!array_key_exists('snapshot',$r['body'])&&!array_key_exists('current_version_id',$r['body']));
$r=request('GET','/questions');check('no generic question table endpoint',$r['status']===404);
$r=request('GET','/quizzes/not-published');check('missing quiz returns JSON 404',$r['status']===404);
$r=request('POST','/account/session',['adult_confirmed'=>true],$guest['token']);check('guest cannot become Clerk account',$r['status']!==200);
$r=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$guest['token']);check('unmigrated modes fail explicitly',$r['status']===501);
$r=request('POST','/attempts',['quiz_slug'=>$slug],$guest['token']);$state=$r['body'];$id=$state['attempt_id'];check('starts practice with three questions',$r['status']===200&&$state['total']===3);
check('first question has no explanation or answers',!isset($state['question']['explanation'])&&!str_contains(json_encode($state['question']),'is_correct')&&!str_contains(json_encode($state['question']),'accept_min'));
$r=request('POST','/attempts',['quiz_slug'=>$slug],$guest['token']);check('reload resumes original attempt',$r['body']['attempt_id']===$id);
$r=request('POST','/attempts/'.$id.'/finish',[],$guest['token']);check('cannot finish early',$r['status']===400&&$r['body']['error']['code']==='not_all_answered');
$r=request('POST','/attempts/'.$id.'/answer',['option_id'=>'forged'],$other['token']);check('another player cannot answer',$r['status']===404);
$r=request('POST','/attempts/'.$id.'/answer',['option_id'=>'forged','value'=>'bad'],$guest['token']);check('invalid answer refused',$r['status']===400);
for($i=0;$i<3;$i++) {
    $q=$keys[$state['question']['id']];$body=$q['type']==='slider'?['value'=>5]:['option_id'=>$q['options'][0]['id']];
    $r=request('POST','/attempts/'.$id.'/answer',$body+['correct'=>999,'score'=>999,'time_ms'=>0],$guest['token']);
    check('server grades answer '.($i+1),$r['status']===200&&$r['body']['is_correct']===true&&$r['body']['explanation']==='Test explanation');
    $r=request('POST','/attempts/'.$id.'/answer',$body,$guest['token']);check('rejects duplicate answer '.($i+1),$r['status']===400);
    if($i<2){$r=request('POST','/attempts/'.$id.'/next',[],$guest['token']);$state=$r['body'];check('advances without answer fields '.($i+1),$r['status']===200&&!str_contains(json_encode($state['question']),'is_correct'));}
}
$r=request('POST','/attempts/'.$id.'/finish',[],$guest['token']);check('server result ignores submitted scores',$r['status']===200&&$r['body']['correct']===3&&$r['body']['total']===3&&count($r['body']['review'])===3);$summary=$r['body'];
$r=request('POST','/attempts/'.$id.'/finish',[],$guest['token']);check('finish is idempotent',$r['body']===$summary);
$r=request('POST','/attempts/'.$id.'/finish',[],$other['token']);check('another player cannot read review',$r['status']===404);
$r=request('POST','/attempts',['quiz_slug'=>$slug],$guest['token']);$id2=$r['body']['attempt_id'];
Database::execute($db,'UPDATE attempts SET current_sent_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 10 SECOND) WHERE id=?',[$id2]);
$r=request('POST','/attempts/'.$id2.'/answer',[],$guest['token']);check('server enforces time limit',$r['status']===200&&$r['body']['timed_out']===true&&$r['body']['is_correct']===false);
$a=Database::one($db,'SELECT answer_time_ms,current_sent_at FROM attempts WHERE id=?',[$id2]);check('time is capped and explanation clock stopped',(int)$a['answer_time_ms']===5000&&$a['current_sent_at']===null);
$r=request('DELETE','/session',null,$guest['token']);check('sign-out revokes guest token',$r['status']===200);
$r=request('GET','/me',null,$guest['token']);check('revoked token no longer works',$r['status']===401);
Database::execute($db,'UPDATE guest_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE profile_id=?',[$other['profile_id']]);
$r=request('GET','/me',null,$other['token']);check('expired session rejected',$r['status']===401);
Dyk\RateLimit::check($db,$config,'test-limit','fixture',1,60);
$limited=false;try{Dyk\RateLimit::check($db,$config,'test-limit','fixture',1,60);}catch(Dyk\ApiError $error){$limited=$error->status===429;}
check('rate limits enforced',$limited);
fwrite(STDOUT,"$count HTTP/database checks passed\n");
