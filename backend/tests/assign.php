<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Competition;
use Dyk\Content;
use Dyk\Database;

// The `assign` question: a child taps each item to its target (match pairs, sort into groups). Graded on the
// server; the key is never sent before /answer. Fixtures are original test content.
$tag=substr(Database::uuid(),0,8);
$category=Database::uuid();
Database::execute($db,'INSERT INTO categories (id,slug,name) VALUES (?,?,?)',[$category,'assign-'.$tag,'Assign fixture']);
// The public category list holds 100 at most: leave none of this suite's fixture behind to crowd it.
register_shutdown_function(static function () use ($db,$category): void { Database::execute($db,'UPDATE categories SET is_active=0 WHERE id=?',[$category]); });
$meta=['explanation'=>'Because it is.','source_url'=>null,'review_by'=>'2027-10-17'];
$quizFile=['slug'=>'assign-'.$tag,'title'=>'Assign fixture','questions'=>[
    ['type'=>'assign','prompt'=>'Match each animal to its home.','assign'=>['variant'=>'match','targets'=>['Sea','Nest','Burrow'],'items'=>[['label'=>'Fish','to'=>'Sea'],['label'=>'Bird','to'=>'Nest'],['label'=>'Rabbit','to'=>'Burrow']]]]+$meta,
    ['type'=>'assign','prompt'=>'Sort the numbers.','assign'=>['variant'=>'sort','targets'=>['Odd','Even'],'items'=>[['label'=>'3','to'=>'Odd'],['label'=>'8','to'=>'Even'],['label'=>'5','to'=>'Odd'],['label'=>'12','to'=>'Even']]]]+$meta,
    ['type'=>'assign','prompt'=>'Sort the things.','assign'=>['variant'=>'sort','targets'=>['Hot','Cold','Warm'],'items'=>[['label'=>'Fire','to'=>'Hot'],['label'=>'Ice','to'=>'Cold'],['label'=>'Tea','to'=>'Warm']]]]+$meta,
]];
$snapshot=Content::snapshot($quizFile);
$byId=array_column($snapshot,null,'id');
$quiz=Database::uuid();$version=Database::uuid();$slug='assign-'.$tag;
Database::execute($db,"INSERT INTO quizzes (id,slug,title,category_id,status,current_version_id,time_limit_seconds) VALUES (?,?,?,?,'published',?,5)",[$quiz,$slug,'Assign fixture',$category,$version]);
Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',[$version,$quiz,json_encode($snapshot)]);

$player=function(): array { $g=request('POST','/guest-sessions',[])['body']; request('POST','/me/nickname/random',[],$g['token']); return $g; };
/** The answer pairs for a served question, from the stored key, optionally changing what each item points at. */
$pairs=function(array $served,array $stored,?callable $change=null): array {
    $itemOf=[];foreach($served['assign']['items'] as $i){$itemOf[$i['label']]=$i['id'];}
    $targetOf=[];foreach($served['assign']['targets'] as $t){$targetOf[$t['label']]=$t['id'];}
    $labelOfTarget=array_column($stored['assign']['targets'],'label','id');
    $out=[];
    foreach($stored['assign']['items'] as $k=>$item){
        $to=$labelOfTarget[$item['target']];
        if($change){$to=$change($k,$to,array_keys($targetOf));}
        $out[]=[$itemOf[$item['label']],$targetOf[$to]];
    }
    return $out;
};
$answer=fn(array $state,string $token,mixed $given)=>request('POST','/attempts/'.$state['attempt_id'].'/answer',['pairs'=>$given],$token);
$next=fn(array $state,string $token)=>request('POST','/attempts/'.$state['attempt_id'].'/next',[],$token)['body'];

// ---- What the browser is sent before answering ----
$p=$player();
$r=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token']);$state=$r['body'];
check('an assign quiz starts',$r['status']===200&&$state['total']===3&&$state['question']['type']==='assign');
$seen=[];$leak=false;$sorted=true;
for($i=0;$i<3;$i++){
    $q=$state['question'];$seen[$q['id']]=$q;$stored=$byId[$q['id']];
    $json=json_encode($q);
    $raw=array_merge(array_column($stored['assign']['items'],'id'),array_column($stored['assign']['targets'],'id'));
    $served=array_merge(array_column($q['assign']['items'],'id'),array_column($q['assign']['targets'],'id'));
    $leak=$leak||str_contains($json,'"target"')||str_contains($json,'"to"')||str_contains($json,'is_correct')||(bool)array_intersect($raw,$served);
    foreach(['items','targets'] as $part){$ids=array_column($q['assign'][$part],'id');$copy=$ids;sort($copy,SORT_STRING);$sorted=$sorted&&$ids===$copy;}
    $answer($state,$p['token'],$pairs($q,$stored));
    if($i<2){$state=$next($state,$p['token']);}
}
check('the payload holds no key, no flag and no snapshot id',!$leak);
check('items and targets are ordered by their keyed handle, never in authoring order',$sorted);
check('only the variant, items and targets are sent',count(array_filter($seen,fn($q)=>array_keys($q['assign'])===['variant','items','targets']))===3);
check('the server never marks an option list for assign',$seen[array_key_first($seen)]['options']===[]);

// ---- Grading ----
$p=$player();
$state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token'])['body'];
$results=[];
for($i=0;$i<3;$i++){
    $q=$state['question'];$results[$q['id']]=$answer($state,$p['token'],$pairs($q,$byId[$q['id']]));
    if($i<2){$state=$next($state,$p['token']);}
}
check('the right pairs are graded right for match and for sort',count(array_filter($results,fn($r)=>$r['status']===200&&$r['body']['is_correct']===true))===3);
$matchId=array_keys(array_filter($byId,fn($q)=>$q['assign']['variant']==='match'))[0];
check('the right pairs are revealed only after answering',$results[$matchId]['body']['correct_pairs']===[['Fish','Sea'],['Bird','Nest'],['Rabbit','Burrow']]);
$fin=request('POST','/attempts/'.$state['attempt_id'].'/finish',[],$p['token']);
check('the finish review shows the pairs as words',$fin['status']===200&&$fin['body']['correct']===3&&in_array('Fish → Sea; Bird → Nest; Rabbit → Burrow',array_column($fin['body']['review'],'correct_answer'),true)&&in_array('Fish → Sea; Bird → Nest; Rabbit → Burrow',array_column($fin['body']['review'],'your_answer'),true));
$stored=Database::one($db,'SELECT chosen_json FROM attempt_answers WHERE attempt_id=? ORDER BY position LIMIT 1',[$state['attempt_id']]);
check('the answer is stored as labels, not as ids',$stored!==null&&is_array(json_decode($stored['chosen_json'],true))&&!preg_match('/[0-9a-f]{8}-[0-9a-f]{4}/',$stored['chosen_json']));

$wrongOne=function(string $slugOnly) use ($player,$slug,$byId,$pairs,$answer): array {
    $p=$player();
    $state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token'])['body'];
    $q=$state['question'];$stored=$byId[$q['id']];
    // Swap the targets of the first two items (match), or send the first item to a different group (sort).
    $bad=$pairs($q,$stored,function(int $k,string $to,array $targets) use ($stored){
        if($stored['assign']['variant']==='match'){ return $k===0?$stored['assign']['targets'][1]['label']:($k===1?$stored['assign']['targets'][0]['label']:$to); }
        if($k===0){ foreach($targets as $t){ if($t!==$to){return $t;} } }
        return $to;
    });
    return [$answer($state,$p['token'],$bad),$stored];
};
[$r,$stored]=$wrongOne('x');
check('one item in the wrong place is graded wrong and the key is then shown',$r['status']===200&&$r['body']['is_correct']===false&&count($r['body']['correct_pairs'])===count($stored['assign']['items']));

// ---- Forged and malformed answers are refused, and never counted ----
$p=$player();
$state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token'])['body'];
$q=$state['question'];$stored=$byId[$q['id']];$good=$pairs($q,$stored);
$other=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$player()['token'])['body'];
$foreign=$other['question']['assign']['items'][0]['id'];
$snapItem=$stored['assign']['items'][0]['id'];$snapTarget=$stored['assign']['targets'][0]['id'];
$withFirst=fn(array $pair)=>array_merge([$pair],array_slice($good,1));
$forged=[
    'an unknown item handle'=>$withFirst([Database::uuid(),$good[0][1]]),
    'an unknown target handle'=>$withFirst([$good[0][0],Database::uuid()]),
    'a snapshot item id'=>$withFirst([$snapItem,$good[0][1]]),
    'a snapshot target id'=>$withFirst([$good[0][0],$snapTarget]),
    'an item handle from another attempt'=>$withFirst([$foreign,$good[0][1]]),
    'an item used as a target'=>$withFirst([$good[0][0],$good[1][0]]),
    'a target used as an item'=>$withFirst([$good[0][1],$good[0][1]]),
    'the same item twice'=>array_merge([$good[0]],array_slice($good,0,-1)),
    'one item left out'=>array_slice($good,0,-1),
    'an extra pair'=>array_merge($good,[$good[0]]),
    'no pairs'=>[],
    'a pair with one element'=>$withFirst([$good[0][0]]),
    'a pair with three elements'=>$withFirst([$good[0][0],$good[0][1],$good[0][1]]),
    'a pair that is an object'=>$withFirst(['item'=>$good[0][0],'target'=>$good[0][1]]),
    'a number in a pair'=>$withFirst([7,$good[0][1]]),
    'a flat list of handles'=>array_merge(...$good),
    'a string instead of a list'=>json_encode($good),
    'null'=>null,
];
foreach($forged as $name=>$given){
    $r=$answer($state,$p['token'],$given);
    check("forged answer refused ($name)",$r['status']===400&&$r['body']['error']['code']==='invalid_pairs');
}
$r=request('POST','/attempts/'.$state['attempt_id'].'/answer',['option_id'=>$good[0][0]],$p['token']);
check('an option id is not an answer to an assign question',$r['status']===400&&$r['body']['error']['code']==='invalid_pairs');
$r=request('POST','/attempts/'.$state['attempt_id'].'/answer',['tiles'=>[$good[0][0]]],$p['token']);
check('tiles are not an answer to an assign question',$r['status']===400&&$r['body']['error']['code']==='invalid_pairs');
if($stored['assign']['variant']==='match'){
    $twoToOne=array_map(fn($pair)=>[$pair[0],$good[0][1]],$good);
    $r=$answer($state,$p['token'],$twoToOne);
    check('a match with two items on one partner is refused',$r['status']===400&&$r['body']['error']['code']==='invalid_pairs');
}
$r=request('POST','/attempts/'.$state['attempt_id'].'/answer',['pairs'=>$good,'is_correct'=>true,'score'=>99,'correct_pairs'=>[['x','y']]],$p['token']);
check('after every refusal the question is still open, and extra fields are ignored',$r['status']===200&&$r['body']['is_correct']===true);
check('refused answers were never counted',(int)Database::one($db,'SELECT answered_count FROM attempts WHERE id=?',[$state['attempt_id']])['answered_count']===1);

// Sorting several items into one group is allowed, and a sort need not use every group.
$p=$player();
$state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice'],$p['token'])['body'];
for($i=0;$i<3&&$state['question']['assign']['variant']!=='sort';$i++){ $answer($state,$p['token'],$pairs($state['question'],$byId[$state['question']['id']])); $state=$next($state,$p['token']); }
$q=$state['question'];$stored=$byId[$q['id']];
$allOne=array_map(fn($pair)=>[$pair[0],$q['assign']['targets'][0]['id']],$pairs($q,$stored));
$r=$answer($state,$p['token'],$allOne);
check('a sort may put every item in one group (wrong, but not refused)',$r['status']===200&&$r['body']['is_correct']===false);

// ---- Timer ----
$p=$player();
$state=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'practice','timed'=>true],$p['token'])['body'];
Database::execute($db,'UPDATE attempts SET current_sent_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 600 SECOND) WHERE id=?',[$state['attempt_id']]);
$r=request('POST','/attempts/'.$state['attempt_id'].'/answer',[],$p['token']);
check('a timed-out assign question needs no input and scores nothing',$r['status']===200&&$r['body']['timed_out']===true&&$r['body']['is_correct']===false);

// ---- Same fairness as other types: allowed in a ranked round and a daily hand ----
$p=$player();
$ranked=request('POST','/attempts',['quiz_slug'=>$slug,'mode'=>'ranked'],$p['token']);
check('a ranked round can hold assign questions',$ranked['status']===200&&$ranked['body']['total']===3&&$ranked['body']['question']['type']==='assign');
$today=Competition::londonDate();
Database::execute($db,'DELETE FROM attempts WHERE daily_challenge_id IN (SELECT id FROM daily_challenges WHERE challenge_date=?)',[$today]);
Database::execute($db,'DELETE FROM daily_challenges WHERE challenge_date=?',[$today]);
Database::execute($db,"INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'live')",[Database::uuid(),$today,$quiz,$version]);
isolateBank([$quiz]);
$pd=$player();
$daily=request('POST','/attempts',['mode'=>'daily'],$pd['token']);
check('a daily hand can hold assign questions',$daily['status']===200&&$daily['body']['question']['type']==='assign');
$dq=$daily['body']['question'];
$r=$answer($daily['body'],$pd['token'],$pairs($dq,$byId[$dq['id']]));
check('a daily assign question is graded from the version it was dealt from',$r['status']===200&&$r['body']['is_correct']===true);
$r=$answer($daily['body'],$player()['token'],$good);
check('another player cannot answer for this attempt',$r['status']===404);
fwrite(STDOUT,"$count assign checks passed\n");
