<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Database;

// Run the local server with PHP_CLI_SERVER_WORKERS=4. Never use a hosted database.
function parallelPosts(string $path, array $body, string $token): array {
    global $base;
    $multi=curl_multi_init();$handles=[];
    for($i=0;$i<2;$i++) {
        $handle=curl_init($base.$path);
        curl_setopt_array($handle,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>20,
            CURLOPT_HTTPHEADER=>['Origin: http://localhost:5202','Content-Type: application/json','Authorization: Bearer '.$token],
            CURLOPT_POSTFIELDS=>json_encode((object)$body)]);
        curl_multi_add_handle($multi,$handle);$handles[]=$handle;
    }
    do {
        $status=curl_multi_exec($multi,$running);
        if($status!==CURLM_OK)throw new RuntimeException('parallel_transport_failed');
        if($running)curl_multi_select($multi,0.2);
    } while($running);
    $results=[];
    foreach($handles as $handle) {
        if(curl_errno($handle))throw new RuntimeException('parallel_request_failed');
        $results[]=['status'=>curl_getinfo($handle,CURLINFO_RESPONSE_CODE),'body'=>json_decode(curl_multi_getcontent($handle),true)];
        curl_multi_remove_handle($multi,$handle);
    }
    curl_multi_close($multi);
    return $results;
}

$quiz=Database::uuid();$version=Database::uuid();$slug='concurrent-'.substr($quiz,0,8);$snapshot=[];
for($i=0;$i<3;$i++)$snapshot[]=['id'=>Database::uuid(),'type'=>'choice','prompt'=>'Original parallel fixture '.$i,
    'explanation'=>'Original fixture explanation','options'=>[['id'=>Database::uuid(),'label'=>'One','is_correct'=>true],['id'=>Database::uuid(),'label'=>'Two','is_correct'=>false]],'slider'=>null];
$keys=array_column($snapshot,null,'id');
Database::execute($db,"INSERT INTO quizzes (id,slug,title,status,current_version_id,question_count) VALUES (?,?,?,'published',?,3)",[$quiz,$slug,'Parallel fixture',$version]);
Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',[$version,$quiz,json_encode($snapshot)]);
$r=request('POST','/guest-sessions',[]);$guest=$r['body'];$token=$guest['token'];
$results=parallelPosts('/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$token);
check('parallel starts both succeed',$results[0]['status']===200&&$results[1]['status']===200);
$a=$results[0]['body'];
check('parallel starts share a single attempt',$a['attempt_id']===$results[1]['body']['attempt_id']);
$countRow=Database::one($db,'SELECT COUNT(*) AS n FROM attempts WHERE user_id=? AND quiz_id=?',[$guest['profile_id'],$quiz]);
check('database contains one started attempt',(int)$countRow['n']===1);
$question=$keys[$a['question']['id']];
$results=parallelPosts('/attempts/'.$a['attempt_id'].'/answer',['option_id'=>$question['options'][0]['id']],$token);
$statuses=array_column($results,'status');sort($statuses);
check('simultaneous answer accepts exactly one submission',$statuses===[200,400]);
$stored=Database::one($db,'SELECT correct_count,answered_count FROM attempts WHERE id=?',[$a['attempt_id']]);
check('simultaneous answer increments once',(int)$stored['correct_count']===1&&(int)$stored['answered_count']===1);
for($i=0;$i<2;$i++) {
    $r=request('POST','/attempts/'.$a['attempt_id'].'/next',[],$token);$q=$keys[$r['body']['question']['id']];
    request('POST','/attempts/'.$a['attempt_id'].'/answer',['option_id'=>$q['options'][0]['id']],$token);
}
$results=parallelPosts('/attempts/'.$a['attempt_id'].'/finish',[],$token);
check('simultaneous finish returns one consistent score',$results[0]['status']===200&&$results[1]['status']===200&&$results[0]['body']['correct']===3&&$results[1]['body']['correct']===3);
$entries=Database::one($db,'SELECT COUNT(*) AS n FROM leaderboard_entries WHERE user_id=?',[$guest['profile_id']]);
check('simultaneous finish writes one result per board',(int)$entries['n']===2);
$today=Dyk\Competition::londonDate();
Database::execute($db,'DELETE FROM attempts WHERE daily_challenge_id IN (SELECT id FROM daily_challenges WHERE challenge_date=?)',[$today]);
Database::execute($db,'DELETE FROM daily_challenges WHERE challenge_date=?',[$today]);
$daily=Database::uuid();
Database::execute($db,"INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')",[$daily,$today,$quiz,$version]);
$results=parallelPosts('/attempts',['mode'=>'daily'],$token);
check('parallel daily starts resume one attempt',$results[0]['status']===200&&$results[1]['status']===200&&$results[0]['body']['attempt_id']===$results[1]['body']['attempt_id']);
$results=parallelPosts('/attempts/'.$a['attempt_id'].'/challenge',[],$token);
check('parallel share creation reuses one code',$results[0]['status']===200&&$results[1]['status']===200&&$results[0]['body']['code']===$results[1]['body']['code']);
fwrite(STDOUT,"$count concurrency checks passed\n");
