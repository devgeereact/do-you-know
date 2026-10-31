<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Database;
use Dyk\Player;

// Original fixture content in the private _test database only.
function feedQuiz(\PDO $db,string $prefix,string $status='published'): array {
    $quiz=Database::uuid();$version=Database::uuid();$snapshot=[];
    for($i=0;$i<3;$i++) {
        $snapshot[]=['id'=>Database::uuid(),'type'=>'choice','prompt'=>'Feeds fixture '.($i+1),'explanation'=>'Feeds fixture explanation',
            'image_url'=>null,'source_url'=>null,'slider'=>null,
            'options'=>[['id'=>Database::uuid(),'label'=>'First','is_correct'=>true],['id'=>Database::uuid(),'label'=>'Second','is_correct'=>false]]];
    }
    $slug=$prefix.'-'.substr($quiz,0,8);
    Database::execute($db,'INSERT INTO quizzes (id,slug,title,status,current_version_id) VALUES (?,?,?,?,?)',[$quiz,$slug,'Feeds '.$prefix,$status,$version]);
    Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',[$version,$quiz,json_encode($snapshot)]);
    return ['id'=>$quiz,'version'=>$version,'slug'=>$slug,'keys'=>array_column($snapshot,null,'id')];
}
function finishedAttempt(\PDO $db,array $quiz,string $userId,int $correct,int $timeMs,string $finishedAgo='1 MINUTE'): void {
    [$amount,$unit]=explode(' ',$finishedAgo);
    if(!in_array($unit,['MINUTE','DAY'],true)){throw new RuntimeException('fixture_interval');}
    Database::execute($db,"INSERT INTO attempts (id,user_id,quiz_id,quiz_version_id,mode,status,question_order,current_index,answered_count,correct_count,answer_time_ms,started_at,finished_at)
        VALUES (?,?,?,?,'practice','finished',?,3,3,?,?,DATE_SUB(UTC_TIMESTAMP(6),INTERVAL ".(int)$amount." $unit),DATE_SUB(UTC_TIMESTAMP(6),INTERVAL ".(int)$amount." $unit))",
        [Database::uuid(),$userId,$quiz['id'],$quiz['version'],json_encode(array_keys($quiz['keys'])),$correct,$timeMs]);
}

// Nickname moderation seed (0005).
$seeded=Database::one($db,"SELECT COUNT(*) AS n FROM blocked_words WHERE word IN ('admin','moderator','staff','official','fuck')");
check('0005 seeds offensive and impersonation words',(int)$seeded['n']===5);
foreach (['Admin Team','The Moderator','Staff99','OfficialDYK','Sh1tHead','4dmin','f.u.c.k'] as $bad) {
    check('blocks '.$bad,Player::isBlocked($db,$bad));
}
foreach (['Safe Player','ValidName','ChosenName','Grape Fan','Raccoon Pal','Peacock7','Torpedo Kid','Sussex Owl'] as $fine) {
    check('allows '.$fine,!Player::isBlocked($db,$fine));
}
$blockedNames=[];
foreach (Player::ADJECTIVES as $adjective) {
    foreach (Player::ANIMALS as $animal) {
        for ($n=10;$n<=99;$n++) { if (Player::isBlocked($db,$adjective.$animal.$n)) { $blockedNames[]=$adjective.$animal.$n; } }
    }
}
check('every generated nickname passes moderation ('.(count(Player::ADJECTIVES)*count(Player::ANIMALS)*90).' combinations)',$blockedNames===[]);

// Earlier runs leave their fixtures in this disposable database; retire them so their recent
// plays cannot outrank this run's popular quiz.
$db->exec("UPDATE quizzes SET status='archived' WHERE slug LIKE 'feeds-%' AND status='published'");
$popular=feedQuiz($db,'feeds-popular');$quiet=feedQuiz($db,'feeds-quiet');$stale=feedQuiz($db,'feeds-stale');$draft=feedQuiz($db,'feeds-draft','draft');
$r=request('POST','/guest-sessions',[]);$me=$r['body'];
$r=request('POST','/guest-sessions',[]);$other=$r['body'];
$r=request('POST','/guest-sessions',[]);$fresh=$r['body'];

// Trending: most finished plays in 7 days; old plays and drafts do not count.
for($i=0;$i<40;$i++){finishedAttempt($db,$popular,$other['profile_id'],1,5000);}
for($i=0;$i<60;$i++){finishedAttempt($db,$stale,$other['profile_id'],1,5000,'8 DAY');}
for($i=0;$i<80;$i++){finishedAttempt($db,$draft,$other['profile_id'],1,5000);}
$r=request('GET','/quizzes/trending');$slugs=array_column($r['body']??[],'slug');
check('trending is public and capped at six',$r['status']===200&&count($r['body'])>=1&&count($r['body'])<=6);
// The stale quiz has more plays in total, so it would lead if old plays counted.
check('trending ranks plays from the last seven days only',$slugs[0]===$popular['slug']);
check('trending never lists unpublished quizzes',!in_array($draft['slug'],$slugs,true));
$json=json_encode($r['body']);
check('trending has no answer, snapshot or player fields',!str_contains($json,'is_correct')&&!str_contains($json,'snapshot')&&!str_contains($json,'current_version_id')
    &&!str_contains($json,'explanation')&&!str_contains($json,'"options"')&&!str_contains($json,'user_id')&&!str_contains($json,'nickname'));
$list=request('GET','/quizzes?search=Feeds%20feeds-popular')['body'][0]??[];
check('trending rows use the catalogue quiz fields',array_keys($r['body'][0])===array_keys($list));

// Continue playing: own, unfinished, resumable only.
$r=request('POST','/attempts',['quiz_slug'=>$quiet['slug'],'mode'=>'practice'],$me['token']);$state=$r['body'];
$q=$quiet['keys'][$state['question']['id']];
request('POST','/attempts/'.$state['attempt_id'].'/answer',['option_id'=>$q['options'][0]['id']],$me['token']);
$r=request('POST','/attempts',['quiz_slug'=>$popular['slug'],'mode'=>'practice'],$me['token']);$expired=$r['body']['attempt_id'];
Database::execute($db,'UPDATE attempts SET started_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 25 HOUR) WHERE id=?',[$expired]);
$r=request('GET','/me/continue');check('continue requires a session',$r['status']===401);
$r=request('GET','/me/continue?user_id='.$other['profile_id'],null,$me['token']);
check('continue lists own resumable attempt with position',$r['status']===200&&count($r['body'])===1&&$r['body'][0]['attemptId']===$state['attempt_id']
    &&$r['body'][0]['quiz']['slug']===$quiet['slug']&&$r['body'][0]['mode']==='practice'&&$r['body'][0]['position']===2&&$r['body'][0]['total']===3);
check('continue skips attempts the game would no longer resume',!in_array($expired,array_column($r['body'],'attemptId'),true));
check('continue has no question or answer data',!str_contains(json_encode($r['body']),'is_correct')&&!str_contains(json_encode($r['body']),'question_order')&&!isset($r['body'][0]['question']));
$r=request('POST','/attempts',['quiz_slug'=>$quiet['slug'],'mode'=>'practice'],$me['token']);
check('listed attempt really resumes',$r['body']['attempt_id']===$state['attempt_id']);
$r=request('GET','/me/continue',null,$other['token']);check('second guest sees no one else\'s unfinished games',$r['status']===200&&$r['body']===[]);

// Best scores: most correct, then fastest, per quiz, own rows only.
finishedAttempt($db,$popular,$me['profile_id'],2,1000);
finishedAttempt($db,$popular,$me['profile_id'],3,9000);
finishedAttempt($db,$popular,$me['profile_id'],3,4000);
finishedAttempt($db,$draft,$me['profile_id'],3,1000);
$r=request('GET','/me/best');check('best requires a session',$r['status']===401);
$r=request('GET','/me/best',null,$me['token']);
$mine=array_values(array_filter($r['body']??[],fn(array $row): bool=>$row['quiz']['slug']===$popular['slug']));
check('best returns one row per quiz',$r['status']===200&&count($mine)===1);
check('best prefers most correct then lowest time',$mine[0]['correct']===3&&$mine[0]['total']===3&&$mine[0]['answerTimeMs']===4000);
check('best omits unpublished quizzes',!in_array($draft['slug'],array_map(fn(array $row): string=>$row['quiz']['slug'],$r['body']),true));
$r=request('GET','/me/best',null,$other['token']);$theirs=array_values(array_filter($r['body'],fn(array $row): bool=>$row['quiz']['slug']===$popular['slug']));
check('best for another guest is their own score',count($theirs)===1&&$theirs[0]['correct']===1);
$r=request('GET','/me/best',null,$fresh['token']);check('a new guest has no best scores',$r['status']===200&&$r['body']===[]);
$r=request('GET','/me/continue',null,$fresh['token']);check('a new guest has nothing to continue',$r['status']===200&&$r['body']===[]);
fwrite(STDOUT,"$count feed checks passed\n");
