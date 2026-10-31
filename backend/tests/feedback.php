<?php
declare(strict_types=1);
// POST /feedback: preset-only feedback for everyone, free text and an email only for teenagers
// and adults. Original fixture content in the private _test database only.
require __DIR__.'/http.php';
use Dyk\Database;
use Dyk\Feedback;

$quiz=Database::uuid();$version=Database::uuid();$snapshot=[];
for($i=0;$i<3;$i++) {
    $snapshot[]=['id'=>Database::uuid(),'type'=>'choice','prompt'=>'Original feedback fixture '.($i+1),'explanation'=>'Fixture explanation',
        'image_url'=>null,'source_url'=>null,'slider'=>null,'options'=>[['id'=>Database::uuid(),'label'=>'Yes','is_correct'=>true],['id'=>Database::uuid(),'label'=>'No','is_correct'=>false]]];
}
$slug='feedback-'.substr($quiz,0,8);
Database::execute($db,"INSERT INTO quizzes (id,slug,title,status,current_version_id) VALUES (?,?,?,'published',?)",[$quiz,$slug,'Feedback fixture',$version]);
Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',[$version,$quiz,json_encode($snapshot)]);
$guest=function (?string $band=null): array {
    $g=request('POST','/guest-sessions',[])['body'];
    if($band!==null){request('POST','/me/age-band',['band'=>$band],$g['token']);}
    return $g;
};
$rows=fn(string $profile): int=>(int)Database::one($db,'SELECT COUNT(*) AS n FROM feedback WHERE profile_id=?',[$profile])['n'];

$r=request('POST','/feedback',['type'=>'feedback','presets'=>['I loved it']]);
check('feedback needs a session',$r['status']===401);

$child=$guest();
$r=request('POST','/feedback',['type'=>'feedback','presets'=>['I loved it','Too easy']],$child['token']);
$row=Database::one($db,'SELECT * FROM feedback WHERE id=?',[$r['body']['id']??'']);
check('a player sends preset feedback',$r['status']===201&&$row&&$row['kind']==='player'&&json_decode($row['presets'],true)===['I loved it','Too easy']);
check('preset feedback stores no free text or email',$row['message']===null&&$row['email']===null&&$row['status']==='new');
$r=request('POST','/feedback',['type'=>'feedback','presets'=>[]],$child['token']);
check('preset feedback needs at least one choice',$r['status']===422&&$r['body']['error']['code']==='invalid_feedback'&&$r['body']['error']['details'][0]['field']==='presets');
$r=request('POST','/feedback',['type'=>'feedback','presets'=>['Send me money']],$child['token']);
check('only listed choices are accepted',$r['status']===422&&$r['body']['error']['code']==='invalid_feedback');
$r=request('POST','/feedback',['type'=>'idea','presets'=>['Too hard']],$child['token']);
check('a choice from another type is refused',$r['status']===422);
$r=request('POST','/feedback',['type'=>'idea','presets'=>['A new subject','A new subject']],$child['token']);
check('a choice cannot be repeated',$r['status']===422);
$r=request('POST','/feedback',['type'=>'rant','presets'=>['I loved it']],$child['token']);
check('unknown types are refused',$r['status']===422&&$r['body']['error']['details'][0]['field']==='type');
$r=request('POST','/feedback',['type'=>'feedback','presets'=>['I loved it'],'nickname'=>'x'],$child['token']);
check('unknown keys are refused',$r['status']===422);

$before=$rows($child['profile_id']);
$r=request('POST','/feedback',['type'=>'feedback','presets'=>['I loved it'],'message'=>'This is my long message','email'=>'kid@example.org'],$child['token']);
check('a guest without an age band cannot send free text',$r['status']===422&&$r['body']['error']['code']==='free_text_not_allowed');
$under=$guest('under_13');
$r=request('POST','/feedback',['type'=>'problem','presets'=>[],'message'=>'Something is broken here'],$under['token']);
check('a child cannot send a message',$r['status']===422&&$r['body']['error']['code']==='free_text_not_allowed');
$r=request('POST','/feedback',['type'=>'problem','presets'=>['The page is slow'],'email'=>'kid@example.org'],$under['token']);
check('a child cannot send an email address',$r['status']===422&&$r['body']['error']['code']==='free_text_not_allowed');
check('nothing a child typed is stored',$rows($child['profile_id'])===$before&&$rows($under['profile_id'])===0
    &&!Database::one($db,"SELECT id FROM feedback WHERE email='kid@example.org' OR message LIKE 'Something is broken%'"));

$adult=$guest('18_plus');
$r=request('POST','/feedback',['type'=>'question','presets'=>['The answer looks wrong'],'message'=>'  Question two has the wrong answer.  ','email'=>'grown.up@example.org',
    'quiz_slug'=>$slug,'question_id'=>$snapshot[1]['id']],$adult['token']);
$row=Database::one($db,'SELECT * FROM feedback WHERE id=?',[$r['body']['id']??'']);
check('an adult sends a message with an email for a reply',$r['status']===201&&$row['kind']==='adult'&&$row['message']==='Question two has the wrong answer.'&&$row['email']==='grown.up@example.org');
check('feedback about a question stores its quiz and prompt',$row['quiz_id']===$quiz&&$row['question_id']===$snapshot[1]['id']&&$row['question_prompt']==='Original feedback fixture 2');
$r=request('POST','/feedback',['type'=>'idea','presets'=>[],'message'=>'Please add a quiz about trains.','email'=>'grown.up@example.org'],$adult['token']);
check('an adult may send free text without a preset',$r['status']===201);
$r=request('POST','/feedback',['type'=>'idea','presets'=>[],'message'=>'Too short','email'=>'grown.up@example.org'],$adult['token']);
check('a message needs at least 10 characters',$r['status']===422&&$r['body']['error']['details'][0]['field']==='message');
$r=request('POST','/feedback',['type'=>'idea','presets'=>[],'message'=>str_repeat('a',1001),'email'=>'grown.up@example.org'],$adult['token']);
check('a message is at most 1000 characters',$r['status']===422);
$r=request('POST','/feedback',['type'=>'idea','presets'=>[],'message'=>'A perfectly fine message'],$adult['token']);
check('free text needs an email address',$r['status']===422&&$r['body']['error']['details'][0]['field']==='email');
$r=request('POST','/feedback',['type'=>'idea','presets'=>[],'message'=>'A perfectly fine message','email'=>'not-an-email'],$adult['token']);
check('the email address must be valid',$r['status']===422);
$teen=$guest('13_17');
$r=request('POST','/feedback',['type'=>'idea','presets'=>['More characters'],'message'=>'More dragons would be great.','email'=>'teen@example.org'],$teen['token']);
check('a teenager may send free text',$r['status']===201);

// Each player may send 10 an hour, invalid ones included, so the quiz checks use a fresh player.
$child=$guest();
$r=request('POST','/feedback',['type'=>'question','presets'=>['The question is confusing'],'quiz_slug'=>'no-such-quiz-here'],$child['token']);
check('an unknown quiz is refused',$r['status']===422&&$r['body']['error']['code']==='quiz_not_found');
$r=request('POST','/feedback',['type'=>'question','presets'=>['The question is confusing'],'quiz_slug'=>$slug,'question_id'=>Database::uuid()],$child['token']);
check('a question must belong to the quiz',$r['status']===422&&$r['body']['error']['code']==='question_not_found');
$r=request('POST','/feedback',['type'=>'question','presets'=>['The question is confusing'],'question_id'=>$snapshot[0]['id']],$child['token']);
check('a question needs its quiz',$r['status']===422);
Database::execute($db,"UPDATE quizzes SET publish_at=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 DAY) WHERE id=?",[$quiz]);
$r=request('POST','/feedback',['type'=>'question','presets'=>['The question is confusing'],'quiz_slug'=>$slug],$child['token']);
check('a quiz that is not live yet cannot be named',$r['status']===422&&$r['body']['error']['code']==='quiz_not_found');
$r=request('POST','/feedback',['type'=>'question','presets'=>['There’s a spelling mistake']],$child['token']);
check('presets with curly apostrophes match exactly',$r['status']===201);

$busy=$guest();$codes=[];
for($i=0;$i<11;$i++){$codes[]=request('POST','/feedback',['type'=>'idea','presets'=>['More daily challenges']],$busy['token'])['status'];}
check('feedback is limited to 10 an hour per player',count(array_filter($codes,fn($c)=>$c===201))===10&&end($codes)===429);
check('the preset lists are the agreed copy',Feedback::PRESETS['problem']===['Something isn’t working','The page is slow','I can’t find my score']);

$leaver=$guest('18_plus');
$r=request('POST','/feedback',['type'=>'idea','presets'=>[],'message'=>'Please add a quiz about volcanoes.','email'=>'leaver@example.org'],$leaver['token']);
$fid=$r['body']['id']??'';
request('POST','/me/delete',['confirmed'=>true],$leaver['token']);
$row=Database::one($db,'SELECT * FROM feedback WHERE id=?',[$fid]);
check('deleting my data removes the message and email from my feedback',$row&&$row['profile_id']===null&&$row['message']===null&&$row['email']===null&&$row['type']==='idea');

fwrite(STDOUT,"$count feedback checks passed\n");
