<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Database;
use Dyk\Competition;

$category=Database::uuid();$quiz=Database::uuid();$version=Database::uuid();
$slug='competition-'.substr($quiz,0,8);$snapshot=[];
for($i=0;$i<3;$i++) {
    $snapshot[]=['id'=>Database::uuid(),'type'=>'choice','prompt'=>'Original competition fixture '.($i+1),
        'explanation'=>'Original fixture explanation','image_url'=>null,'source_url'=>null,'slider'=>null,
        'options'=>[['id'=>Database::uuid(),'label'=>'First','is_correct'=>true],['id'=>Database::uuid(),'label'=>'Second','is_correct'=>false]]];
}
$keys=array_column($snapshot,null,'id');
Database::execute($db,'INSERT INTO categories (id,slug,name) VALUES (?,?,?)',[$category,$slug,'Competition fixture']);
Database::execute($db,"INSERT INTO quizzes (id,slug,title,category_id,status,current_version_id,time_limit_seconds) VALUES (?,?,?,?,'published',?,5)",[$quiz,$slug,'Competition fixture',$category,$version]);
Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',[$version,$quiz,json_encode($snapshot)]);
$players=[];
for($i=0;$i<3;$i++) {
    $r=request('POST','/guest-sessions',[]);$players[]=$r['body'];
    request('POST','/me/nickname/random',[],$r['body']['token']);
}
[$first,$second,$third]=$players;

function completeGame(array $state,string $token,bool $correct=true,int $elapsed=100000): array {
    global $db,$keys;
    for($i=0;$i<$state['total'];$i++) {
        $q=$keys[$state['question']['id']];
        Database::execute($db,'UPDATE attempts SET current_sent_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL ? MICROSECOND) WHERE id=?',[$elapsed,$state['attempt_id']]);
        $r=request('POST','/attempts/'.$state['attempt_id'].'/answer',['option_id'=>$q['options'][$correct?0:1]['id'],'score'=>999,'time_ms'=>0],$token);
        check('server grades competition answer',$r['status']===200&&$r['body']['is_correct']===$correct);
        if($i<$state['total']-1) {
            $r=request('POST','/attempts/'.$state['attempt_id'].'/next',[],$token);
            check('competition advances without answer keys',$r['status']===200&&!str_contains(json_encode($r['body']['question']),'is_correct'));
            $state=$r['body'];
        }
    }
    $r=request('POST','/attempts/'.$state['attempt_id'].'/finish',[],$token);
    check('competition result is server-written',$r['status']===200&&$r['body']['correct']===($correct?$state['total']:0));
    return $r['body'];
}

$r=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$first['token']);$state=$r['body'];
check('ranked mode starts',$r['status']===200&&$state['mode']==='ranked');
check('deadline matches frozen server timer',abs((strtotime($state['question_deadline'])-strtotime($state['server_now']))-5)<=1);
$r=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$first['token']);
check('reload retains deadline and option order',$r['body']['question_deadline']===$state['question_deadline']&&$r['body']['question']['options']===$state['question']['options']);
Database::execute($db,'UPDATE quizzes SET time_limit_seconds=120 WHERE id=?',[$quiz]);
$r=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$first['token']);
check('metadata edit cannot extend an open attempt',$r['body']['time_limit_seconds']===5&&$r['body']['question_deadline']===$state['question_deadline']);
Database::execute($db,'UPDATE quizzes SET time_limit_seconds=5 WHERE id=?',[$quiz]);
$ranked=completeGame($state,$first['token'],true,100000);
check('ranked finish returns ranks',$ranked['ranks']['all_time']===1&&$ranked['ranks']['weekly']===1);
$r=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$second['token']);
completeGame($r['body'],$second['token'],true,1000000);
$r=request('GET','/leaderboards?quiz_slug='.$slug.'&board=all_time',null,$first['token']);$board=$r['body'];
check('server time breaks equal-score ties',$r['status']===200&&count($board['top'])===2&&$board['top'][0]['is_me']===true&&$board['top'][0]['answer_time_ms']<$board['top'][1]['answer_time_ms']);
check('public board omits identity and age',!str_contains(json_encode($board['top']),'user_id')&&!str_contains(json_encode($board['top']),'age_band')&&!str_contains(json_encode($board['top']),'email'));
$r=request('GET','/leaderboards?quiz_slug='.$slug.'&board=all_time');
check('anonymous board has no private me row',$r['body']['me']===null&&count($r['body']['top'])===2);
$r=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$first['token']);
completeGame($r['body'],$first['token'],false);
$r=request('GET','/leaderboards?quiz_slug='.$slug.'&board=all_time',null,$first['token']);
check('worse replay does not replace best result',$r['body']['me']['correct']===3);
$r=request('GET','/leaderboards?quiz_slug='.$slug.'&board=forged');check('unknown board rejected',$r['status']===400);

// A repeated local test may replace only today's disposable test fixture.
$today=Competition::londonDate();
Database::execute($db,'DELETE FROM attempts WHERE daily_challenge_id IN (SELECT id FROM daily_challenges WHERE challenge_date=?)',[$today]);
Database::execute($db,'DELETE FROM daily_challenges WHERE challenge_date=?',[$today]);
$daily=Database::uuid();
Database::execute($db,"INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')",[$daily,$today,$quiz,$version]);
$r=request('GET','/daily');check('daily uses London server date',$r['status']===200&&$r['body']['date']===$today&&$r['body']['quiz']['slug']===$slug);
$r=request('POST','/attempts',['mode'=>'daily'],$first['token']);$dailyState=$r['body'];
$r=request('POST','/attempts',['mode'=>'daily'],$second['token']);$otherDaily=$r['body'];
$a=Database::one($db,'SELECT question_order FROM attempts WHERE id=?',[$dailyState['attempt_id']]);
$b=Database::one($db,'SELECT question_order FROM attempts WHERE id=?',[$otherDaily['attempt_id']]);
// The daily order is a hash of the London date and question id, not file order, so a quiz that
// comes back as the daily serves a different slice; it is still the same for everyone that day.
check('daily players receive identical question order',$a['question_order']===$b['question_order']&&json_decode($a['question_order'],true)===\Dyk\Game::dailyOrder(array_column($snapshot,'id'),$today,3)&&$dailyState['question']['id']===json_decode($a['question_order'],true)[0]);
$dailyResult=completeGame($dailyState,$first['token']);
check('daily finish updates streak once',$dailyResult['streak']===1&&$dailyResult['ranks']['daily']===1);
$r=request('POST','/attempts/'.$dailyState['attempt_id'].'/finish',[],$first['token']);check('daily finish retry does not increment streak',$r['body']['streak']===1);
$r=request('POST','/attempts',['mode'=>'daily'],$first['token']);check('daily cannot be replayed for rank',$r['status']===400&&$r['body']['error']['code']==='daily_already_played');
$r=request('GET','/me/daily/'.$daily.'/finished',null,$first['token']);check('own daily progress readable',$r['body']['finished']===true);
$r=request('GET','/me/daily/'.$daily.'/finished?user_id='.$first['profile_id'],null,$second['token']);check('daily progress cannot impersonate another player',$r['body']['finished']===false);

$r=request('POST','/attempts/'.$ranked['attempt_id'].'/challenge',[],$first['token']);$share=$r['body'];
check('creates random challenge code with original lifetime',$r['status']===200&&preg_match('/^[A-Za-z0-9]{8}$/D',$share['code'])===1&&strtotime($share['expires_at'])>time()+29*86400);
$r=request('POST','/attempts/'.$ranked['attempt_id'].'/challenge',[],$first['token']);check('challenge creation is idempotent',$r['body']['code']===$share['code']);
$r=request('POST','/attempts/'.$ranked['attempt_id'].'/challenge',[],$second['token']);check('cannot share another player result',$r['status']===404);
$r=request('GET','/challenges/'.$share['code']);check('challenge preview contains no private identity',$r['status']===200&&!isset($r['body']['creator']['id'])&&!str_contains(json_encode($r['body']),'user_id'));
$r=request('POST','/attempts',['mode'=>'challenge','challenge_code'=>$share['code']],$first['token']);check('creator cannot play own challenge',$r['status']===400&&$r['body']['error']['code']==='own_challenge');
$r=request('POST','/attempts',['mode'=>'challenge','challenge_code'=>$share['code']],$second['token']);$challengeState=$r['body'];
$original=Database::one($db,'SELECT question_order FROM attempts WHERE id=?',[$ranked['attempt_id']]);
$challenger=Database::one($db,'SELECT question_order FROM attempts WHERE id=?',[$challengeState['attempt_id']]);
check('friend gets exact original question order',$r['status']===200&&$original['question_order']===$challenger['question_order']);
$result=completeGame($challengeState,$second['token'],false);
check('versus result calculated on server',$result['versus']['creator_correct']===3&&$result['versus']['you_won']===false);
$r=request('POST','/attempts',['mode'=>'practice','quiz_slug'=>$slug],$third['token']);completeGame($r['body'],$third['token']);
$r=request('GET','/leaderboards?quiz_slug='.$slug, null,$third['token']);check('practice does not enter ranked boards',$r['body']['me']===null);
Database::execute($db,'UPDATE friend_challenges SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE code=?',[$share['code']]);
$r=request('POST','/attempts',['mode'=>'challenge','challenge_code'=>$share['code']],$third['token']);check('expired challenge cannot start',$r['status']===400&&$r['body']['error']['code']==='challenge_not_found');
$r=request('GET','/challenges/'.$share['code']);check('public expired preview is labelled',$r['body']['expired']===true);
// Likes: once per entry, never your own, can be taken back, totals only.
$r=request('GET','/leaderboards?quiz_slug='.$slug.'&board=all_time',null,$third['token']);$rows=$r['body']['top'];
$firstRow=$rows[0];$ownRow=null;
$r=request('GET','/leaderboards?quiz_slug='.$slug.'&board=all_time',null,$first['token']);
foreach($r['body']['top'] as $row){if($row['is_me']){$ownRow=$row;}}
check('board rows carry an entry handle and like total only',isset($firstRow['entry_id'])&&$firstRow['likes']===0&&$firstRow['liked_by_me']===false&&!str_contains(json_encode($rows),'liker'));
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>true],$first['token']);
check('cannot like your own entry',$r['status']===400&&$r['body']['error']['code']==='own_entry');
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>true]);
check('liking needs a session',$r['status']===401);
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>Database::uuid(),'liked'=>true],$second['token']);
check('unknown entry is not found',$r['status']===404);
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>'yes'],$second['token']);
check('like flag must be a boolean',$r['status']===400&&$r['body']['error']['code']==='invalid_like');
$fresh=request('POST','/guest-sessions',[])['body'];
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>true],$fresh['token']);
check('a player who has not finished a game cannot like',$r['status']===400&&$r['body']['error']['code']==='play_first');
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>true],$second['token']);
check('a player can like an entry',$r['status']===200&&$r['body']['likes']===1&&$r['body']['liked_by_me']===true);
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>true],$second['token']);
check('liking twice still counts once',$r['status']===200&&$r['body']['likes']===1);
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>true],$third['token']);
check('different players add to the total',$r['body']['likes']===2);
$r=request('GET','/leaderboards?quiz_slug='.$slug.'&board=all_time',null,$second['token']);
$seen=array_values(array_filter($r['body']['top'],fn($x)=>$x['entry_id']===$ownRow['entry_id']))[0];
check('board shows the total and only my own like',$seen['likes']===2&&$seen['liked_by_me']===true);
$r=request('GET','/leaderboards?quiz_slug='.$slug.'&board=all_time');
check('anonymous board shows totals but no likes of mine',array_values(array_filter($r['body']['top'],fn($x)=>$x['entry_id']===$ownRow['entry_id']))[0]['likes']===2);
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>false],$second['token']);
check('a like can be taken back',$r['status']===200&&$r['body']['likes']===1&&$r['body']['liked_by_me']===false);
$r=request('POST','/likes',['board'=>'all_time','entry_id'=>$ownRow['entry_id'],'liked'=>false],$second['token']);
check('taking back twice is harmless',$r['status']===200&&$r['body']['likes']===1);
$gone=Database::one($db,'SELECT id FROM profiles WHERE id=(SELECT user_id FROM attempts WHERE id=?)',[$ownRow['entry_id']]);
check('a self-like cannot be written even directly',(function() use ($db,$gone,$quiz): bool { try { Database::execute($db,"INSERT INTO leaderboard_likes (board,quiz_id,period_start,entry_user_id,liker_id) VALUES ('all_time',?,'1970-01-01',?,?)",[$quiz,$gone['id'],$gone['id']]); return false; } catch (\PDOException) { return true; } })());
fwrite(STDOUT,"$count competition checks passed\n");
