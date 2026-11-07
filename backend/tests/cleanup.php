<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Database;

// Fixtures with backdated rows: only A should be removed.
//   A: guest, code expired 31 days ago            -> code and player removed
//   B: guest, code expired 10 days ago            -> kept (inside the 30 days)
//   C: guest, no code, created 2 days ago         -> kept (too new to judge)
//   D: adult with a Clerk identity, no code, old  -> kept
//   E: guest, live code, created 60 days ago      -> kept
//   G: a parent's child, code expired 31 days ago -> profile kept (the parent decides), only the stale code goes
$ids=[];
foreach (['a','b','c','d','e'] as $key) {
    $ids[$key]=Database::uuid();
    $created=$key==='c'?'UTC_TIMESTAMP()-INTERVAL 2 DAY':'UTC_TIMESTAMP()-INTERVAL 60 DAY';
    Database::execute($db,"INSERT INTO profiles (id,role,created_at) VALUES (?,?,$created)",[$ids[$key],$key==='d'?'player':'guest']);
}
$session=static function (string $profile,string $expires) use ($db): void {
    Database::execute($db,"INSERT INTO guest_sessions (token_hash,profile_id,expires_at) VALUES (?,?,$expires)",[hash('sha256',random_bytes(16)),$profile]);
};
$session($ids['a'],'UTC_TIMESTAMP()-INTERVAL 31 DAY');
$session($ids['b'],'UTC_TIMESTAMP()-INTERVAL 10 DAY');
$session($ids['e'],'UTC_TIMESTAMP()+INTERVAL 3 DAY');
Database::execute($db,"INSERT INTO identities (provider,subject,profile_id) VALUES ('clerk',?,?)",['user_cleanup'.str_replace('-','',$ids['d']),$ids['d']]);
$ids['g']=Database::uuid();
Database::execute($db,"INSERT INTO profiles (id,role,created_at) VALUES (?,'guest',UTC_TIMESTAMP()-INTERVAL 60 DAY)",[$ids['g']]);
Database::execute($db,"INSERT INTO children (profile_id,parent_profile_id,level) VALUES (?,?,'starters')",[$ids['g'],$ids['d']]);
$session($ids['g'],'UTC_TIMESTAMP()-INTERVAL 31 DAY');
// F: a 13-17 guest removed by the purge, who left a written message, an email and a written answer.
$ids['f']=Database::uuid();
Database::execute($db,"INSERT INTO profiles (id,role,age_band,created_at) VALUES (?,'guest','13_17',UTC_TIMESTAMP()-INTERVAL 60 DAY)",[$ids['f']]);
$session($ids['f'],'UTC_TIMESTAMP()-INTERVAL 31 DAY');
$feedbackId=Database::uuid();$answerId=Database::uuid();
Database::execute($db,"INSERT INTO feedback (id,profile_id,kind,type,presets,message,email,question_prompt) VALUES (?,?,'player','idea','[]','Dummy message text','dummy@example.test','Dummy prompt')",[$feedbackId,$ids['f']]);
Database::execute($db,"INSERT INTO feedback_messages (id,feedback_id,kind,body,author_id) VALUES (?,?,'player','Dummy written answer',?)",[$answerId,$feedbackId,$ids['f']]);
Database::execute($db,"INSERT INTO rate_limits (bucket_hash,hits,expires_at) VALUES (?,1,UTC_TIMESTAMP()-INTERVAL 1 MINUTE)",[hash('sha256',random_bytes(16))]);

exec(escapeshellarg(PHP_BINARY).' '.escapeshellarg(dirname(__DIR__).'/bin/cleanup.php').' 2>&1',$out,$code);
check('clean-up script exits cleanly',$code===0);

$exists=static fn (string $id): bool => (bool) Database::one($db,'SELECT 1 AS ok FROM profiles WHERE id=?',[$id]);
$codes=static fn (string $id): int => (int) Database::one($db,'SELECT COUNT(*) AS n FROM guest_sessions WHERE profile_id=?',[$id])['n'];
check('guest unused for over 30 days is removed',!$exists($ids['a'])&&$codes($ids['a'])===0);
check('guest whose code expired 10 days ago is kept with its code',$exists($ids['b'])&&$codes($ids['b'])===1);
check('brand-new guest without a code is kept',$exists($ids['c']));
check('adult with a sign-in identity is never removed',$exists($ids['d']));
check("a parent's child is kept even after a long break, and only the stale code is removed",$exists($ids['g'])&&$codes($ids['g'])===0);
check('guest with a live code is kept',$exists($ids['e'])&&$codes($ids['e'])===1);
$kept=Database::one($db,'SELECT message,email,question_prompt FROM feedback WHERE id=?',[$feedbackId]);
check('purged guest leaves no written message or email in feedback',!$exists($ids['f'])&&$kept&&$kept['message']===null&&$kept['email']===null&&$kept['question_prompt']===null);
check('purged guest leaves no written answers in feedback threads',!Database::one($db,'SELECT 1 AS ok FROM feedback_messages WHERE id=?',[$answerId]));
Database::execute($db,'DELETE FROM feedback WHERE id=?',[$feedbackId]);
check('expired throttle buckets are removed',(int)Database::one($db,'SELECT COUNT(*) AS n FROM rate_limits WHERE expires_at<=UTC_TIMESTAMP()')['n']===0);

foreach (['g','b','c','d','e'] as $key) { Database::execute($db,'DELETE FROM profiles WHERE id=?',[$ids[$key]]); }
fwrite(STDOUT,"$count clean-up checks passed\n");
