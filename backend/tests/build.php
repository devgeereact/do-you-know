<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Competition;
use Dyk\Content;
use Dyk\Database;

// The `build` question: a child taps tiles into slots. Graded on the server; nothing that reveals the answer
// is sent before /answer; dictation (spoken answer) is practice only. Fixtures are original test content.
$tag=substr(Database::uuid(),0,8);
$category=Database::uuid();
Database::execute($db,'INSERT INTO categories (id,slug,name) VALUES (?,?,?)',[$category,'build-'.$tag,'Build fixture']);
$meta=['explanation'=>'Because it is.','source_url'=>null,'review_by'=>'2027-10-17'];
$quizFile=['slug'=>'build-'.$tag,'title'=>'Build fixture','questions'=>[
    ['type'=>'build','prompt'=>'Spell the yellow fruit.','build'=>['variant'=>'spell','tiles'=>['b','a','n','a','n','a','x','y'],'answers'=>[['b','a','n','a','n','a']]]]+$meta,
    ['type'=>'build','prompt'=>'Finish the sentence.','build'=>['variant'=>'gap','template'=>'The cat ___ on the ___.','tiles'=>['sat','sits','mat','dog'],'answers'=>[['sat','mat'],['sits','mat']]]]+$meta,
    ['type'=>'build','prompt'=>'Put the day in order.','build'=>['variant'=>'order','tiles'=>['morning','noon','night'],'answers'=>[['morning','noon','night']]]]+$meta,
    ['type'=>'build','prompt'=>'Listen and spell the word.','build'=>['variant'=>'spell','speak'=>'frog','tiles'=>['f','r','o','g','q'],'answers'=>[['f','r','o','g']]]]+$meta,
]];
$snapshot=Content::snapshot($quizFile);
$byId=array_column($snapshot,null,'id');
$dictationId=array_values(array_filter($snapshot,fn($q)=>isset($q['build']['speak'])))[0]['id'];
$quiz=Database::uuid();$version=Database::uuid();$slug='build-'.$tag;
Database::execute($db,"INSERT INTO quizzes (id,slug,title,category_id,status,current_version_id,time_limit_seconds) VALUES (?,?,?,?,'published',?,5)",[$quiz,$slug,'Build fixture',$category,$version]);
Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,4)',[$version,$quiz,json_encode($snapshot)]);

$player=function(): array { $g=request('POST','/guest-sessions',[])['body']; request('POST','/me/nickname/random',[],$g['token']); return $g; };
/** The handles for a label sequence, taking an unused tile with that label each time. */
$handles=function(array $question,array $labels): array {
    $used=[];$out=[];
    foreach($labels as $label){
        foreach($question['build']['tiles'] as $t){ if(!isset($used[$t['id']])&&mb_strtolower($t['label'])===mb_strtolower($label)){$used[$t['id']]=true;$out[]=$t['id'];continue 2;} }
        throw new RuntimeException('no_tile_for_'.$label);
    }
    return $out;
};

$answer=fn(array $state,string $token,mixed $tiles)=>request('POST','/attempts/'.$state['attempt_id'].'/answer',['tiles'=>$tiles],$token);

// ---- What the browser is sent before answering ----
$p=$player();
$r=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token']);$state=$r['body'];
check('a build quiz starts',$r['status']===200&&$state['total']===4&&$state['question']['type']==='build');
$seen=[];$leak=false;$sorted=true;
for($i=0;$i<4;$i++){
    $q=$state['question'];$seen[$q['id']]=$q;
    $json=json_encode($q);
    $raw=array_column($byId[$q['id']]['build']['tiles'],'id');
    $leak=$leak||str_contains($json,'answers')||str_contains($json,'is_correct')||(bool)array_intersect($raw,array_column($q['build']['tiles'],'id'));
    $ids=array_column($q['build']['tiles'],'id');$copy=$ids;sort($copy,SORT_STRING);$sorted=$sorted&&$ids===$copy;
    $answer($state,$p['token'],$handles($q,$byId[$q['id']]['build']['answers'][0]));
    if($i<3){ $state=request('POST','/attempts/'.$state['attempt_id'].'/next',[],$p['token'])['body']; }
}
check('the payload holds no accepted sequence, no flag and no snapshot tile id',!$leak);
check('tiles are ordered by their keyed handle, never in authoring order',$sorted);
check('the slot count and variant are sent',array_values(array_unique(array_map(fn($q)=>$q['build']['variant'],$seen)))!==[]&&count(array_filter($seen,fn($q)=>$q['build']['slots']===count($byId[$q['id']]['build']['answers'][0])))===4);
check('only the dictation question carries the spoken word',array_keys(array_filter($seen,fn($q)=>isset($q['build']['speak'])))===[$dictationId]&&$seen[$dictationId]['build']['speak']==='frog');
check('only the gap question carries its sentence',count(array_filter($seen,fn($q)=>isset($q['build']['template'])))===1);
check('the server never marks a build option list',$seen[array_key_first($seen)]['options']===[]);

// ---- Grading: right, alternate, wrong ----
$p=$player();
$state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token'])['body'];
$results=[];
for($i=0;$i<4;$i++){
    $q=$state['question'];$spec=$byId[$q['id']]['build'];
    $labels=$spec['variant']==='gap'?$spec['answers'][1]:$spec['answers'][0];   // the gap is answered with its second accepted answer
    $r=$answer($state,$p['token'],$handles($q,$labels));
    $results[$q['id']]=$r;
    if($i<3){ $state=request('POST','/attempts/'.$state['attempt_id'].'/next',[],$p['token'])['body']; }
}
check('right answers, including an alternate accepted one, are graded right',count(array_filter($results,fn($r)=>$r['status']===200&&$r['body']['is_correct']===true))===4);
check('the right sequence is revealed only after answering',array_values(array_filter($results,fn($r)=>$r['body']['correct_tiles']===['b','a','n','a','n','a']))!==[]);
$fin=request('POST','/attempts/'.$state['attempt_id'].'/finish',[],$p['token']);
check('the finish review shows the tiles as words',$fin['status']===200&&$fin['body']['correct']===4&&in_array('banana',array_column($fin['body']['review'],'correct_answer'),true)&&in_array('sits mat',array_column($fin['body']['review'],'your_answer'),true));
$stored=Database::one($db,'SELECT chosen_json FROM attempt_answers WHERE attempt_id=? ORDER BY position LIMIT 1',[$state['attempt_id']]);
check('the answer is stored as labels, not as ids',$stored!==null&&is_array(json_decode($stored['chosen_json'],true))&&!preg_match('/[0-9a-f]{8}-[0-9a-f]{4}/',$stored['chosen_json']));

$p=$player();
$state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token'])['body'];
$q=$state['question'];$spec=$byId[$q['id']]['build'];$right=$spec['answers'][0];
$wrong=array_reverse($right);
if($wrong===$right){$wrong=array_merge(array_slice($right,1),[$right[0]]);}
$r=$answer($state,$p['token'],$handles($q,$wrong));
check('a wrong order is graded wrong and the right answer is then shown',$r['status']===200&&$r['body']['is_correct']===false&&$r['body']['correct_tiles']===$right);

// ---- Forged and malformed answers are refused, and never counted ----
$p=$player();
$state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token'])['body'];
$q=$state['question'];$spec=$byId[$q['id']]['build'];$good=$handles($q,$spec['variant']==='gap'?$spec['answers'][0]:$spec['answers'][0]);
$other=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$player()['token'])['body'];
$foreign=array_column($other['question']['build']['tiles'],'id');
$forged=[
    'an unknown handle'=>array_merge(array_slice($good,0,-1),[Database::uuid()]),
    'a snapshot tile id'=>array_merge(array_slice($good,0,-1),[array_column($byId[$q['id']]['build']['tiles'],'id')[0]]),
    'a handle from another attempt'=>array_merge(array_slice($good,0,-1),[$foreign[0]]),
    'the same handle twice'=>array_merge(array_slice($good,0,-1),[$good[0]]),
    'too few tiles'=>array_slice($good,0,-1),
    'too many tiles'=>array_merge($good,[$good[0]]),
    'no tiles'=>[],
    'a number in the list'=>array_merge(array_slice($good,0,-1),[7]),
    'a nested list'=>[$good],
    'an object instead of a list'=>['a'=>$good[0]],
    'a string instead of a list'=>implode(',',$good),
    'null'=>null,
];
foreach($forged as $name=>$tiles){
    $r=$answer($state,$p['token'],$tiles);
    check("forged answer refused ($name)",$r['status']===400&&$r['body']['error']['code']==='invalid_tiles');
}
$r=request('POST','/attempts/'.$state['attempt_id'].'/answer',['option_id'=>$good[0]],$p['token']);
check('an option id is not an answer to a build question',$r['status']===400&&$r['body']['error']['code']==='invalid_tiles');
$r=request('POST','/attempts/'.$state['attempt_id'].'/answer',['tiles'=>$good,'is_correct'=>true,'score'=>99,'correct_tiles'=>['x']],$p['token']);
check('after every refusal the question is still open, and extra fields are ignored',$r['status']===200&&$r['body']['is_correct']===true);
check('refused answers were never counted',(int)Database::one($db,'SELECT answered_count FROM attempts WHERE id=?',[$state['attempt_id']])['answered_count']===1);

// ---- Timer: a timed game still ends a question on time, with no input needed ----
$p=$player();
$state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice','timed'=>true],$p['token'])['body'];
Database::execute($db,'UPDATE attempts SET current_sent_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 600 SECOND) WHERE id=?',[$state['attempt_id']]);
$r=request('POST','/attempts/'.$state['attempt_id'].'/answer',[],$p['token']);
check('a timed-out build question needs no input and scores nothing',$r['status']===200&&$r['body']['timed_out']===true&&$r['body']['is_correct']===false);

// ---- Dictation is practice only: never in a ranked round or the daily ----
$p=$player();
$ranked=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$p['token'])['body'];
$order=json_decode(Database::one($db,'SELECT question_order FROM attempts WHERE id=?',[$ranked['attempt_id']])['question_order'],true);
check('a ranked round holds no dictation question',$ranked['total']===3&&!in_array($dictationId,$order,true));
$today=Competition::londonDate();
Database::execute($db,'DELETE FROM attempts WHERE daily_challenge_id IN (SELECT id FROM daily_challenges WHERE challenge_date=?)',[$today]);
Database::execute($db,'DELETE FROM daily_challenges WHERE challenge_date=?',[$today]);
Database::execute($db,"INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')",[Database::uuid(),$today,$quiz,$version]);
isolateBank([$quiz]);
$daily=request('POST','/attempts',['mode'=>'daily'],$player()['token']);
$hand=json_decode(Database::one($db,'SELECT question_order FROM attempts WHERE id=?',[$daily['body']['attempt_id']])['question_order'],true);
check('the daily deals no dictation question',$daily['status']===200&&count($hand)===3&&!in_array($dictationId,$hand,true));
// A daily hand can hold build questions, and they are graded from the version they came from.
$q=$daily['body']['question'];
$r=request('POST','/attempts/'.$daily['body']['attempt_id'].'/answer',['tiles'=>$handles($q,$byId[$q['id']]['build']['answers'][0])],$player()['token']);
check('another player cannot answer for this attempt',$r['status']===404);
fwrite(STDOUT,"$count build checks passed\n");
