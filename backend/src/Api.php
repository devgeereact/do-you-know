<?php
declare(strict_types=1);
namespace Dyk;
final class Api
{
    public static function run(array $config): void
    {
        try {
            self::cors($config);
            $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
            if ($method === 'OPTIONS') { http_response_code(204); return; }
            if ($config['environment'] === 'production' && ($_SERVER['HTTPS'] ?? '') !== 'on') { throw new ApiError('https_required', 400); }
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
            // The root .htaccess rewrites /sitemap.xml here; the original path is kept in REQUEST_URI.
            if ($path === '/sitemap.xml') { $path = '/api/v1/sitemap.xml'; }
            if (!is_string($path) || !str_starts_with($path, '/api/v1/')) { throw new ApiError('not_found', 404); }
            $path = substr($path, strlen('/api/v1'));
            if (!in_array($method, ['GET','POST','DELETE'], true)) { throw new ApiError('method_not_allowed', 405); }
            if ($path === '/health' && $method === 'GET') { self::reply(['status'=>'ok','api_version'=>1]); return; }
            $db = Database::connect($config);
            $ip = RateLimit::clientIp($_SERVER);
            // Generous per address: a school class can share one address.
            RateLimit::check($db,$config,'api',$ip,600,60);
            $isAdmin = str_starts_with($path, '/admin/');
            // Admin action routes (submit, retire, ...) may be posted with an empty body.
            $body = $method === 'POST' ? self::body($isAdmin ? 262144 : 32768, $isAdmin) : [];
            $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
            $token = preg_match('/^Bearer ([^\s]{1,8192})$/D', $auth, $m) ? $m[1] : '';
            if ($path === '/guest-sessions' && $method === 'POST') {
                RateLimit::check($db,$config,'new-guest',$ip,100,3600);
                self::reply(Identity::guest($db,$config),201); return;
            }
            if ($path === '/account/session' && $method === 'POST') {
                if (($body['adult_confirmed']??false)!==true) { throw new ApiError('adult_confirmation_required',403); }
                if ($token==='') { throw new ApiError('not_signed_in',401); }
                self::reply(Identity::adult($db,$config,$token)); return;
            }
            $catalog = new Catalog($db);
            if ($method==='GET' && $path==='/sitemap.xml') {
                $xml = $catalog->sitemapXml(self::siteUrl($config));
                header('Content-Type: application/xml; charset=utf-8');
                // Public and the same for everyone: CDNs and crawlers may keep it for an hour.
                header('Cache-Control: public, max-age=3600');
                http_response_code(200);
                echo $xml; return;
            }
            if ($method==='GET' && $path==='/daily') { self::reply((new Competition($db,null))->dailyDetails());return; }
            if ($method==='GET' && $path==='/leaderboards/overall') {
                $period = $_GET['period'] ?? 'week';
                $limit = $_GET['limit'] ?? '50';
                if (!is_string($period) || !in_array($period, Overall::PERIODS, true)) { throw ApiError::invalid('invalid_period', ['allowed' => Overall::PERIODS]); }
                if (!is_string($limit) || !preg_match('/^[0-9]{1,3}$/D', $limit) || (int) $limit < 1 || (int) $limit > 100) { throw ApiError::invalid('invalid_limit', ['min' => 1, 'max' => 100]); }
                $viewer = $token==='' ? null : Identity::profile($db,$config,$token);
                $result = (new Overall($db))->board($period, (int) $limit, $viewer['id'] ?? null);
                // Changes as rounds finish; a short private cache saves repeat loads without sharing is_me.
                header('Cache-Control: private, max-age=30');
                self::reply($result);return;
            }
            if ($method==='GET' && preg_match('~^/challenges/([A-Za-z0-9]{8})$~D',$path,$challengeCode)) {
                self::reply((new Competition($db,null))->challenge($challengeCode[1]));return;
            }
            if ($method==='GET' && $path==='/leaderboards') {
                $board = $_GET['board'] ?? 'all_time';
                $slug = $_GET['quiz_slug'] ?? null;
                $limit = $_GET['limit'] ?? '50';
                if (!is_string($board) || ($slug!==null && (!is_string($slug) || !preg_match('/^[a-z0-9-]{1,100}$/D',$slug)))
                    || !is_string($limit) || !preg_match('/^[0-9]{1,3}$/D',$limit)) { throw new ApiError('invalid_board'); }
                $viewer = $token==='' ? null : Identity::profile($db,$config,$token);
                self::reply((new Competition($db,$viewer['id']??null))->leaderboard($slug,$board,(int)$limit));return;
            }
            if ($method==='GET' && $path==='/quizzes/trending') { self::reply($catalog->trending());return; }
            if ($method==='GET' && $path==='/curriculum-tags') { self::reply($catalog->tags());return; }
            if ($method==='GET' && ($path==='/categories' || preg_match('~^/categories/([a-z0-9-]{1,100})$~D',$path,$category))) {
                $rows = $catalog->categories($path==='/categories' ? null : $category[1]);
                if ($path==='/categories') { self::reply($rows); }
                else { if (!$rows) { throw new ApiError('category_not_found',404); } self::reply($rows[0]); }
                return;
            }
            if ($method==='GET' && ($path==='/quizzes' || preg_match('~^/quizzes/([a-z0-9-]{1,100})$~D',$path,$slug))) {
                $rows = $catalog->quizzes($_GET, $path==='/quizzes' ? null : $slug[1]);
                if ($path!=='/quizzes') { if (!$rows) { throw new ApiError('quiz_not_found',404); } self::reply($rows[0]); }
                else { self::reply($rows); } return;
            }
            if ($isAdmin) {
                if ($token==='') { throw new ApiError('not_signed_in',401); }
                // Guest tokens are looked up as ordinary profiles and then fail Admin's Clerk-subject check.
                $staff=Identity::profile($db,$config,$token);
                $admin=new Admin($db,$config,$staff);
                $result=$admin->handle($method,$path,$body,$_GET);
                self::reply($result,$admin->status);return;
            }
            // Unknown routes must never become a generic table reader or SPA HTML.
            $gameRoute = preg_match('~^/attempts/([0-9a-f-]{36})/(next|answer|finish|challenge)$~D',$path,$parts);
            $dailyFinished = preg_match('~^/me/daily/([0-9a-f-]{36})/finished$~D',$path,$dailyId);
            if (!in_array($path,['/session','/me','/me/age-band','/me/nickname','/me/nickname/random','/me/avatar','/me/settings','/me/games','/me/continue','/me/best','/me/delete','/attempts','/likes','/feedback'],true) && !$gameRoute && !$dailyFinished) { throw new ApiError('not_found',404); }
            if ($token==='') { throw new ApiError('not_signed_in',401); }
            $profile=Identity::profile($db,$config,$token);
            if ($path==='/session' && $method==='DELETE') {
                if (!str_starts_with($token,'guest_')) { throw new ApiError('use_clerk_sign_out',400); }
                Database::execute($db,'DELETE FROM guest_sessions WHERE token_hash=?',[hash('sha256',$token)]);
                self::reply(['signed_out'=>true]);return;
            }
            $player = new Player($db, $profile['id']);
            if ($dailyFinished && $method==='GET') { self::reply(['finished'=>(new Competition($db,$profile['id']))->dailyFinished($dailyId[1])]);return; }
            if ($path==='/me' && $method==='GET') { self::reply($player->own());return; }
            if ($path==='/me/settings' && $method==='GET') { self::reply($player->settings());return; }
            if ($path==='/me/games' && $method==='GET') {
                $limit = $_GET['limit'] ?? '20';
                if (!is_string($limit) || !preg_match('/^[0-9]{1,3}$/D', $limit)) { throw new ApiError('invalid_limit'); }
                self::reply($player->history((int) $limit));return;
            }
            if ($path==='/me/continue' && $method==='GET') { self::reply($player->continuing());return; }
            if ($path==='/me/best' && $method==='GET') { self::reply($player->best());return; }
            if ($method!=='POST') { throw new ApiError('method_not_allowed',405); }
            if ($path==='/me/age-band') { $player->ageBand($body['band']??null);self::reply(['ok'=>true]);return; }
            if ($path==='/me/nickname') { self::reply(['nickname'=>$player->nickname($body['nickname']??null)]);return; }
            if ($path==='/me/nickname/random') { self::reply(['nickname'=>$player->randomNickname()]);return; }
            if ($path==='/me/avatar') { $player->avatar($body['avatar_id']??null);self::reply(['avatar_id'=>$body['avatar_id']]);return; }
            if ($path==='/me/settings') { self::reply($player->updateSettings($body));return; }
            if ($path==='/me/delete') { $player->delete($body);self::reply(['deleted'=>true]);return; }
            if ($path==='/likes') {
                RateLimit::check($db,$config,'like',$profile['id'],120,3600);
                $board=$body['board']??null;$entry=$body['entry_id']??null;$liked=$body['liked']??null;
                if (!is_string($board)||!is_string($entry)||!is_bool($liked)) { throw new ApiError('invalid_like'); }
                self::reply((new Competition($db,$profile['id']))->like($board,$entry,$liked));return;
            }
            if ($path==='/feedback') {
                RateLimit::check($db,$config,'feedback',$profile['id'],10,3600);
                self::reply((new Feedback($db))->submit($profile,$body),201);return;
            }
            $game=new Game($db,$profile['id']);
            if ($path==='/attempts') { self::reply($game->start($body));return; }
            if ($gameRoute) {
                $result=match($parts[2]) { 'next'=>$game->next($parts[1]),'answer'=>$game->answer($parts[1],$body),'finish'=>$game->finish($parts[1]),'challenge'=>(new Competition($db,$profile['id']))->createChallenge($parts[1]) };
                self::reply($result);return;
            }
            throw new ApiError('not_found',404);
        } catch (ApiError $error) {
            $reply=['code'=>$error->errorCode];
            if ($error->details!==null) { $reply['details']=$error->details; }
            self::reply(['error'=>$reply],$error->status);
        }
        catch (\Throwable $error) { self::reply(['error'=>['code'=>'service_unavailable']],503); }
    }

    /** Public site origin for absolute sitemap links; the live domain when the config has none. */
    private static function siteUrl(array $config): string
    {
        $url = $config['site_url'] ?? 'https://doyouknow.space';
        if (!is_string($url) || !preg_match('~^https?://[^/\s]+$~D', $url)) { throw new ApiError('service_unavailable', 503); }
        return $url;
    }

    private static function cors(array $config): void
    {
        header('Vary: Origin');
        $origin=$_SERVER['HTTP_ORIGIN']??null;
        if ($origin!==null) {
            if (!in_array($origin,$config['allowed_origins'],true)) { throw new ApiError('origin_not_allowed',403); }
            header('Access-Control-Allow-Origin: '.$origin);
        }
        header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Max-Age: 600');
    }

    private static function body(int $limit, bool $allowEmpty = false): array
    {
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json')) { throw new ApiError('json_required',415); }
        $raw=file_get_contents('php://input',false,null,0,$limit+1);
        if ($raw===false || strlen($raw)>$limit) { throw new ApiError('payload_too_large',413); }
        if ($allowEmpty && trim($raw)==='') { return []; }
        try { $value=json_decode($raw,false,32,JSON_THROW_ON_ERROR); }
        catch (\JsonException $error) { throw new ApiError('invalid_json'); }
        if (!$value instanceof \stdClass) { throw new ApiError('invalid_json'); }
        return json_decode($raw,true,32,JSON_THROW_ON_ERROR);
    }

    private static function reply(mixed $data,int $status=200): void
    {
        http_response_code($status);
        echo json_encode($data,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES);
    }
}
