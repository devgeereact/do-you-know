<?php
declare(strict_types=1);
require __DIR__.'/http.php';
use Dyk\Catalog;
use Dyk\Database;

// Original fixture rows in the private _test database only.
function seoCategory(\PDO $db,string $prefix,bool $active=true): string {
    $slug=$prefix.'-'.substr(Database::uuid(),0,8);
    Database::execute($db,'INSERT INTO categories (id,slug,name,is_active) VALUES (?,?,?,?)',[Database::uuid(),$slug,'Seo '.$prefix,$active?1:0]);
    return $slug;
}
function seoQuiz(\PDO $db,string $prefix,string $status): string {
    $slug=$prefix.'-'.substr(Database::uuid(),0,8);
    Database::execute($db,'INSERT INTO quizzes (id,slug,title,status) VALUES (?,?,?,?)',[Database::uuid(),$slug,'Seo '.$prefix,$status]);
    return $slug;
}

$liveCategory=seoCategory($db,'seo-live');$hiddenCategory=seoCategory($db,'seo-hidden',false);
$published=seoQuiz($db,'seo-published','published');$draft=seoQuiz($db,'seo-draft','draft');$archived=seoQuiz($db,'seo-archived','archived');
Database::execute($db,"UPDATE quizzes SET updated_at='2026-03-04 05:06:07.123456' WHERE slug=?",[$published]);

$r=request('GET','/sitemap.xml');
check('sitemap is public',$r['status']===200);
$sitemap=$r['raw'];
check('sitemap is served as XML',(bool)preg_match('~^content-type: application/xml; charset=utf-8\r?$~mi',$r['headers']));
check('sitemap may be cached publicly',(bool)preg_match('~^cache-control: public, max-age=3600\r?$~mi',$r['headers']));
$previous=libxml_use_internal_errors(true);
$xml=simplexml_load_string($r['raw']);
libxml_use_internal_errors($previous);
check('sitemap is well-formed XML',$xml!==false&&$xml->getName()==='urlset');
$xml->registerXPathNamespace('s','http://www.sitemaps.org/schemas/sitemap/0.9');
$locs=array_map('strval',$xml->xpath('//s:url/s:loc'));
$origin='https://doyouknow.space';
foreach (['/','/daily','/leaderboards','/how-to-play','/about','/privacy','/terms','/contact'] as $page) {
    check('sitemap lists '.$page,in_array($origin.$page,$locs,true));
}
check('sitemap lists an active category',in_array($origin.'/c/'.$liveCategory,$locs,true));
check('sitemap lists a published quiz',in_array($origin.'/q/'.$published,$locs,true));
check('sitemap never lists an inactive category',!in_array($origin.'/c/'.$hiddenCategory,$locs,true));
check('sitemap never lists a draft quiz',!in_array($origin.'/q/'.$draft,$locs,true));
check('sitemap never lists an archived quiz',!in_array($origin.'/q/'.$archived,$locs,true));
$quizNode=$xml->xpath('//s:url[s:loc="'.$origin.'/q/'.$published.'"]/s:lastmod');
check('published quiz carries its lastmod in W3C UTC form',isset($quizNode[0])&&(string)$quizNode[0]==='2026-03-04T05:06:07Z');
check('fixed pages carry no invented lastmod',$xml->xpath('//s:url[s:loc="'.$origin.'/about"]/s:lastmod')===[]);
check('sitemap holds no private or play routes',!preg_match('~/(play|me|account|challenge|api)(/|<)~',$r['raw']));
check('every loc is absolute on the site origin',$locs!==[]&&array_filter($locs,fn(string $l): bool=>!str_starts_with($l,$origin.'/'))===[]);
check('sitemap has no answer or snapshot data',!str_contains($r['raw'],'is_correct')&&!str_contains($r['raw'],'snapshot'));

// Escaping: special characters in a location must stay well-formed XML.
$odd=Catalog::sitemap('https://example.test/',[['loc'=>'/q/a&b<c>"d\'e','lastmod'=>null,'changefreq'=>'weekly']]);
check('sitemap escapes &, <, > and quotes',str_contains($odd,'<loc>https://example.test/q/a&amp;b&lt;c&gt;&quot;d&apos;e</loc>'));
$parsed=simplexml_load_string($odd);
check('escaped sitemap still parses',$parsed!==false);
check('escaped location round-trips',(string)$parsed->url->loc==='https://example.test/q/a&b<c>"d\'e');
$r=request('POST','/sitemap.xml',[]);
check('sitemap answers GET only',$r['status']===404);

// The root .htaccess rewrites /sitemap.xml to the API; the API must accept that original path.
$c=curl_init(preg_replace('~/api/v1$~','',$base).'/sitemap.xml');
curl_setopt_array($c,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15]);
$root=curl_exec($c);
check('/sitemap.xml at the site root returns the same sitemap',curl_getinfo($c,CURLINFO_RESPONSE_CODE)===200&&$root===$sitemap);
fwrite(STDOUT,"$count seo checks passed\n");
