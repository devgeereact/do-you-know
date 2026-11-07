<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Competition;
use Dyk\Database;

// The daily deals each player a private hand of 10 from every live quiz: nobody shares a question until the
// whole bank has been dealt once. Fixtures: five live quizzes of 8 questions (a bank of 40, so exactly four
// hands fit), one 18+ quiz and one draft that must never be dealt.
$category=Database::uuid();$tag=substr($category,0,8);
Database::execute($db,'INSERT INTO categories (id,slug,name) VALUES (?,?,?)',[$category,'deal-'.$tag,'Deal fixture']);
$quizzes=[];$keys=[];
foreach (['a','b','c','d','e','adult','draft'] as $n) {
    $id=Database::uuid();$version=Database::uuid();$snapshot=[];
    for($i=0;$i<8;$i++) {
        $q=['id'=>Database::uuid(),'type'=>'choice','prompt'=>"Deal fixture $n question ".($i+1),'explanation'=>'Because it is.',
            'image_url'=>null,'source_url'=>null,'slider'=>null,
            'options'=>[['id'=>Database::uuid(),'label'=>'Right','is_correct'=>true],['id'=>Database::uuid(),'label'=>'Wrong','is_correct'=>false]]];
        $snapshot[]=$q;$keys[$q['id']]=$q+['quiz'=>$n];
    }
    Database::execute($db,'INSERT INTO quizzes (id,slug,title,category_id,status,age_min,age_max) VALUES (?,?,?,?,?,?,?)',
        [$id,'deal-'.$n.'-'.$tag,'Deal fixture '.$n,$category,$n==='draft'?'draft':'published',$n==='adult'?18:6,$n==='adult'?99:8]);
    Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,8)',[$version,$id,json_encode($snapshot)]);
    Database::execute($db,'UPDATE quizzes SET current_version_id=? WHERE id=?',[$version,$id]);
    $quizzes[$n]=['id'=>$id,'version'=>$version];
}
isolateBank(array_column($quizzes,'id'));
$today=Competition::londonDate();
Database::execute($db,'DELETE FROM attempts WHERE daily_challenge_id IN (SELECT id FROM daily_challenges WHERE challenge_date=?)',[$today]);
Database::execute($db,'DELETE FROM daily_challenges WHERE challenge_date=?',[$today]);
$daily=Database::uuid();
Database::execute($db,"INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')",
    [$daily,$today,$quizzes['a']['id'],$quizzes['a']['version']]);

$players=[];
for($i=0;$i<6;$i++) {
    $r=request('POST','/guest-sessions',[]);$players[]=$r['body'];
    request('POST','/me/nickname/random',[],$r['body']['token']);
}

/** Start the daily for several players at the same instant. */
function startTogether(array $tokens): array {
    global $base;
    $multi=curl_multi_init();$handles=[];
    foreach($tokens as $token) {
        $h=curl_init($base.'/attempts');
        curl_setopt_array($h,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30,
            CURLOPT_HTTPHEADER=>['Origin: http://localhost:5202','Content-Type: application/json','Authorization: Bearer '.$token],
            CURLOPT_POSTFIELDS=>json_encode(['mode'=>'daily'])]);
        curl_multi_add_handle($multi,$h);$handles[]=$h;
    }
    do { curl_multi_exec($multi,$running); if($running){curl_multi_select($multi,0.2);} } while($running);
    $out=[];
    foreach($handles as $h){$out[]=['status'=>curl_getinfo($h,CURLINFO_RESPONSE_CODE),'body'=>json_decode(curl_multi_getcontent($h),true)];curl_multi_remove_handle($multi,$h);}
    return $out;
}
/** The question ids dealt to one attempt, in order. */
function hand(string $attemptId): array {
    global $db;
    return json_decode(Database::one($db,'SELECT question_order FROM attempts WHERE id=?',[$attemptId])['question_order'],true);
}
/** Answer every question in a hand; the first $right are answered correctly. Returns the finish body. */
function playHand(array $state,string $token,int $right,int $elapsed=100000): array {
    global $db,$keys;
    for($i=0;$i<$state['total'];$i++) {
        $q=$keys[$state['question']['id']];
        Database::execute($db,'UPDATE attempts SET current_sent_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL ? MICROSECOND) WHERE id=?',[$elapsed,$state['attempt_id']]);
        $pick=$q['options'][$i<$right?0:1];
        $r=request('POST','/attempts/'.$state['attempt_id'].'/answer',['option_id'=>servedId($state['question'],$pick)],$token);
        check('a mixed-quiz hand is graded by the server',$r['status']===200&&$r['body']['is_correct']===($i<$right));
        if($i<$state['total']-1) { $state=request('POST','/attempts/'.$state['attempt_id'].'/next',[],$token)['body']; }
    }
    return request('POST','/attempts/'.$state['attempt_id'].'/finish',[],$token)['body'];
}

// ---- Four players start at the same moment: four private, non-overlapping hands ----
$tokens=array_map(fn($p)=>$p['token'],array_slice($players,0,4));
$started=startTogether($tokens);
$hands=[];$states=[];
foreach($started as $i=>$r) {
    check("player $i starts the daily",$r['status']===200&&$r['body']['mode']==='daily'&&$r['body']['total']===10);
    $states[$i]=$r['body'];$hands[$i]=hand($r['body']['attempt_id']);
}
$all=array_merge(...$hands);
check('no two simultaneous players share a question',count($all)===40&&count(array_unique($all))===40);
check('every dealt question belongs to a live child-friendly quiz',count(array_filter($all,fn($id)=>in_array($keys[$id]['quiz'],['adult','draft'],true)))===0);
check('hands mix several quizzes',count(array_unique(array_map(fn($id)=>$keys[$id]['quiz'],$hands[0])))>1);
check('the first question served is the first of the hand',$states[0]['question']['id']===$hands[0][0]);
check('a dealt hand leaks no answers',!str_contains(json_encode($states[0]),'is_correct')&&!str_contains(json_encode($states[0]),'explanation'));
check('every question is recorded once in the deal ledger',(int)Database::one($db,'SELECT COUNT(*) AS n FROM daily_deals WHERE daily_challenge_id=?',[$daily])['n']===40);

// The database itself refuses a second copy of the same question at the same pass, whatever the PHP does.
$dup=false;
try {
    Database::execute($db,'INSERT INTO daily_deals (attempt_id,position,daily_challenge_id,quiz_version_id,question_id,deal_no) VALUES (?,?,?,?,?,1)',
        [$states[1]['attempt_id'],99,$daily,$quizzes['a']['version'],$hands[0][0]]);
} catch (PDOException $e) { $dup=($e->errorInfo[1]??null)===1062; }
check('the database rejects a duplicate deal',$dup);

// ---- Coming back resumes the same hand ----
$again=request('POST','/attempts',['mode'=>'daily'],$tokens[0]);
check('reloading the daily resumes the same hand',$again['body']['attempt_id']===$states[0]['attempt_id']&&$again['body']['question']['id']===$hands[0][0]&&hand($again['body']['attempt_id'])===$hands[0]);

// ---- Once the bank has been dealt, a second lap begins: no question is dealt twice before every question is dealt once ----
$fifth=request('POST','/attempts',['mode'=>'daily'],$players[4]['token']);
$h5=hand($fifth['body']['attempt_id']);
$ledger=Database::one($db,'SELECT MAX(deal_no) AS top,COUNT(*) AS n FROM daily_deals WHERE daily_challenge_id=?',[$daily]);
check('a fifth player still gets a full hand',$fifth['status']===200&&count($h5)===10&&count(array_unique($h5))===10);
check('the second lap is recorded as deal 2',(int)$ledger['top']===2&&(int)$ledger['n']===50);

// ---- Scores: mixed hands are graded, ranked on the daily board only ----
$res0=playHand($states[0],$tokens[0],10,50000);
$res1=playHand($states[1],$tokens[1],6,50000);
check('a perfect hand scores 10/10 and is first on the daily board',$res0['correct']===10&&$res0['ranks']['daily']===1&&$res1['ranks']['daily']===2);
check('the review spans the quizzes the hand came from',count($res0['review'])===10&&count(array_unique(array_column($res0['review'],'prompt')))===10);
check('a daily hand does not touch the per-quiz all-time or weekly boards',
    (int)Database::one($db,"SELECT COUNT(*) AS n FROM leaderboard_entries WHERE user_id=? AND board IN ('all_time','weekly')",[$players[0]['profile_id']])['n']===0
    &&!isset($res0['ranks']['all_time'])&&!isset($res0['ranks']['weekly']));
$board=request('GET','/leaderboards?board=daily',null,$tokens[1])['body'];
check('the daily board lists leaders best first with my place',count($board['top'])===2&&$board['top'][0]['correct']===10&&$board['top'][0]['rank']===1&&$board['me']['rank']===2);
$r=request('POST','/attempts/'.$states[0]['attempt_id'].'/challenge',[],$tokens[0]);
check('a private daily hand cannot be turned into a friend challenge',$r['status']===400&&$r['body']['error']['code']==='daily_not_shareable');
$r=request('POST','/attempts',['mode'=>'daily'],$tokens[0]);
check('a finished daily cannot be replayed',$r['status']===400&&$r['body']['error']['code']==='daily_already_played');

// ---- The page's route is decoration only ----
$page=request('GET','/daily')['body'];
check('the daily page shows ten cosmetic stops and nothing about the questions',count($page['stops'])===10&&!str_contains(json_encode($page),'prompt')&&!str_contains(json_encode($page),'is_correct'));
check('the stops are the same all day',request('GET','/daily')['body']['stops']===$page['stops']);
check('the page counts the board',$page['stats']['played']===2&&$page['stats']['perfect']===1);

fwrite(STDOUT,"$count daily deal checks passed\n");
