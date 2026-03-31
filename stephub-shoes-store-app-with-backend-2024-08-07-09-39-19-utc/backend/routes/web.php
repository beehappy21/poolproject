<?php

use Illuminate\Support\Facades\Route;

$renderLineBridge = static function (string $targetUrl) {
    $safeTargetUrl = htmlspecialchars($targetUrl, ENT_QUOTES, 'UTF-8');
    $redirectScriptTarget = json_encode($targetUrl, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    return <<<HTML
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LINE Sign In</title>
    <meta http-equiv="refresh" content="0;url={$safeTargetUrl}" />
    <script>
      window.location.replace({$redirectScriptTarget});
    </script>
  </head>
  <body>
    <p>Redirecting to LINE sign in...</p>
    <p><a href="{$safeTargetUrl}">Continue</a></p>
  </body>
</html>
HTML;
};

$resolveLineBridgeUrl = static function () {
    $wapBaseUrl = rtrim((string) (env('APP_WAP_URL') ?: 'https://wap.blifehealthy.com'), '/');
    $query = request()->getQueryString();
    $targetUrl = $wapBaseUrl . '/line/liff/signin';

    if (!empty($query)) {
        $targetUrl .= '?' . $query;
    }

    return $targetUrl;
};

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/


Route::redirect('/', '/admin/login');

Route::get('/line/liff/signin', function () use ($renderLineBridge, $resolveLineBridgeUrl) {
    return response($renderLineBridge($resolveLineBridgeUrl()))
        ->header('Content-Type', 'text/html; charset=utf-8');
});

Route::get('/auth/line/callback', function () use ($renderLineBridge, $resolveLineBridgeUrl) {
    return response($renderLineBridge($resolveLineBridgeUrl()))
        ->header('Content-Type', 'text/html; charset=utf-8');
});
