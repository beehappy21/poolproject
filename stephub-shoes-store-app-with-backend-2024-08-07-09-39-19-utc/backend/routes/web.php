<?php

use App\Http\Controllers\Platform\OrderDocumentController;
use App\Http\Controllers\Platform\AdminPasswordResetController;
use Illuminate\Support\Facades\Route;

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

Route::middleware('throttle:10,1')
    ->post('/admin/password-reset', [AdminPasswordResetController::class, 'reset'])
    ->name('bao.admin.password-reset');

Route::get('/line/liff/signin', function () use ($resolveLineBridgeUrl) {
    return redirect()->away($resolveLineBridgeUrl(), 302);
});

Route::get('/auth/line/callback', function () use ($resolveLineBridgeUrl) {
    return redirect()->away($resolveLineBridgeUrl(), 302);
});

Route::get('/internal/order-source/{sourceOrderId}/receipt.pdf', [OrderDocumentController::class, 'internalReceiptPdf']);
