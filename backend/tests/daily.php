<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Competition;
use Dyk\Daily;
use Dyk\Database;

// Fixtures: A and B are eligible, C has no version, D is a draft. Future dates keep
// these rows apart from today's challenge used by the other suites.
$category=Database::uuid();$tag=substr($category,0,8);
Database::execute($db,"DELETE FROM daily_challenges WHERE challenge_date>='2099-01-01'");
Database::execute($db,'INSERT INTO categories (id,slug,name) VALUES (?,?,?)',[$category,'daily-'.$tag,'Daily fixture']);
$quizzes=[];
foreach (['a'=>'published','b'=>'published','c'=>'published','d'=>'draft'] as $key=>$status) {
    $id=Database::uuid();$version=$key==='c'?null:Database::uuid();
    Database::execute($db,'INSERT INTO quizzes (id,slug,title,category_id,status) VALUES (?,?,?,?,?)',[$id,'daily-'.$key.'-'.$tag,'Daily fixture '.$key,$category,$status]);
    if ($version) {
        $snapshot=[];
        for($i=0;$i<3;$i++) {
            $snapshot[]=['id'=>Database::uuid(),'type'=>'choice','prompt'=>'Original daily fixture '.($i+1),'explanation'=>'Original fixture explanation',
                'image_url'=>null,'source_url'=>null,'slider'=>null,'options'=>[['id'=>Database::uuid(),'label'=>'Yes','is_correct'=>true],['id'=>Database::uuid(),'label'=>'No','is_correct'=>false]]];
        }
        Database::execute($db,'INSERT INTO quiz_versions (id,quiz_id,version,snapshot,question_count) VALUES (?,?,1,?,3)',[$version,$id,json_encode($snapshot)]);
        Database::execute($db,'UPDATE quizzes SET current_version_id=? WHERE id=?',[$version,$id]);
    }
    $quizzes[$key]=['id'=>$id,'slug'=>'daily-'.$key.'-'.$tag,'version'=>$version];
}
// Hide every other published quiz so auto-pick is deterministic; restored at the end.
$s=$db->prepare("SELECT id FROM quizzes WHERE status='published' AND NOT (category_id<=>?)");$s->execute([$category]);
$hidden=$s->fetchAll(PDO::FETCH_COLUMN);
$restore=function () use ($db,$hidden): void {
    foreach ($hidden as $id) { Database::execute($db,"UPDATE quizzes SET status='published' WHERE id=?",[$id]); }
};
register_shutdown_function($restore);
foreach ($hidden as $id) { Database::execute($db,"UPDATE quizzes SET status='draft' WHERE id=?",[$id]); }

$daily=new Daily($db);
$row=fn(string $date): ?array=>Database::one($db,'SELECT * FROM daily_challenges WHERE challenge_date=?',[$date]);
$schedule=function (string $date,array $quiz) use ($db): void {
    Database::execute($db,"INSERT INTO daily_challenges (id,challenge_date,quiz_id,quiz_version_id,status) VALUES (?,?,?,?,'scheduled')",
        [Database::uuid(),$date,$quiz['id'],$quiz['version']]);
};
$eligible=[$quizzes['a']['id'],$quizzes['b']['id']];

$r=$daily->activate('2099-01-01');$first=$row('2099-01-01');
check('auto-picks a published quiz with a version when nothing is scheduled',$r['action']==='auto_picked'&&$first['status']==='live'&&in_array($first['quiz_id'],$eligible,true));
check('auto-pick pins the quiz current version',$first['quiz_version_id']===Database::one($db,'SELECT current_version_id FROM quizzes WHERE id=?',[$first['quiz_id']])['current_version_id']);
$r=$daily->activate('2099-01-01');
check('second run on the same day changes nothing',$r['action']==='already_live'&&$r['closed']===0&&$row('2099-01-01')['id']===$first['id']);

$schedule('2099-01-02',$quizzes['a']);
$r=$daily->activate('2099-01-02');
check('scheduled challenge goes live on its day',$r['action']==='activated'&&$r['quiz_slug']===$quizzes['a']['slug']&&$row('2099-01-02')['status']==='live');
check('previous live challenge is marked done',$r['closed']===1&&$row('2099-01-01')['status']==='done');

$r=$daily->activate('2099-01-03');
check('auto-pick prefers the least recently used quiz',$r['action']==='auto_picked'&&$row('2099-01-03')['quiz_id']===$quizzes['b']['id']);
check('quiz without a version is never picked',!in_array($quizzes['c']['id'],array_column($db->query("SELECT quiz_id FROM daily_challenges WHERE challenge_date>='2099-01-01'")->fetchAll(),'quiz_id'),true));

$schedule('2099-01-04',$quizzes['d']);
$r=$daily->activate('2099-01-04');$replaced=$row('2099-01-04');
check('scheduled unpublished quiz is replaced by a published one',$r['action']==='replaced'&&$replaced['status']==='live'&&in_array($replaced['quiz_id'],$eligible,true));

$schedule('2099-01-05',$quizzes['a']);
$r=$daily->activate('2099-01-06');
check('missed scheduled day is closed, never made live later',$row('2099-01-05')['status']==='done'&&$row('2099-01-04')['status']==='done'&&$r['closed']===2);

Database::execute($db,"UPDATE daily_challenges SET status='done' WHERE challenge_date='2099-01-06'");
$r=$daily->activate('2099-01-06');
check('owner-closed day stays closed',$r['action']==='closed_today'&&$row('2099-01-06')['status']==='done');

Database::execute($db,"UPDATE quizzes SET status='draft' WHERE id IN (?,?)",$eligible);
$r=$daily->activate('2099-01-07');
check('no published quiz leaves the day empty',$r['action']==='none_available'&&$row('2099-01-07')===null);
Database::execute($db,"UPDATE quizzes SET status='published' WHERE id IN (?,?)",$eligible);

$previous=null;$rotates=true;
for($d=1;$d<=6;$d++) {
    $date=sprintf('2099-02-%02d',$d);$daily->activate($date);$picked=$row($date)['quiz_id'];
    $rotates=$rotates&&$picked!==$previous;$previous=$picked;
}
check('auto-pick rotates instead of repeating yesterday',$rotates);

$ok=false;try{$daily->activate('1 Jan');}catch(InvalidArgumentException){$ok=true;}
check('rejects a malformed date',$ok);

// Today through the real API and the cron script.
Database::execute($db,"DELETE FROM daily_challenges WHERE challenge_date>='2099-01-01'");
$today=Competition::londonDate();
Database::execute($db,'DELETE FROM attempts WHERE daily_challenge_id IN (SELECT id FROM daily_challenges WHERE challenge_date=?)',[$today]);
Database::execute($db,'DELETE FROM daily_challenges WHERE challenge_date=?',[$today]);
$r=$daily->activate();
check('activator uses the London date by default',$r['date']===$today&&$r['action']==='auto_picked');
$api=request('GET','/daily');
check('GET /daily serves the activated quiz without answers',$api['status']===200&&$api['body']['quiz']['slug']===$r['quiz_slug']&&!str_contains(json_encode($api['body']),'is_correct'));
exec(escapeshellarg(PHP_BINARY).' '.escapeshellarg(dirname(__DIR__).'/bin/daily.php').' 2>&1',$out,$code);
check('cron script exits cleanly and is idempotent',$code===0&&str_contains(implode("\n",$out),'already_live'));

$restore();
fwrite(STDOUT,"$count daily checks passed.\n");
