<?php

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED);

$root = dirname(__DIR__);
$backend = $root.'/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend';

require $backend.'/vendor/autoload.php';

$app = require $backend.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

Illuminate\Support\Facades\Auth::shouldUse(config('platform.guard'));

$user = App\Models\User::query()
    ->where('email', 'superadmin@blifehealthy.com')
    ->firstOrFail();

Illuminate\Support\Facades\Auth::guard(config('platform.guard'))->setUser($user);

$http = $app->make(Illuminate\Contracts\Http\Kernel::class);

$checks = [
    '/admin/product/list',
    '/admin/kyc/list',
    '/admin/withdraw/list',
    '/admin/withdraw/export?format=csv',
    '/admin/withdraw/export?format=xlsx',
    '/admin/withdraw/export?format=pdf',
    '/admin/withdraw/export?format=xlsx&template=bank',
];

$failed = false;

foreach ($checks as $path) {
    $status = 500;
    $contentType = '';
    $attempt = 0;

    while ($attempt < 3) {
        $attempt++;
        $request = Illuminate\Http\Request::create($path, 'GET');

        try {
            $response = $http->handle($request);
            $status = $response->getStatusCode();
            $contentType = method_exists($response, 'headers')
                ? ($response->headers->get('content-type') ?? '')
                : '';
            $http->terminate($request, $response);

            if ($status === 200) {
                break;
            }
        } catch (Throwable $exception) {
            $message = $exception->getMessage();
            $contentType = 'exception';

            if (
                str_contains($message, 'Operation not permitted') ||
                str_contains($message, 'connection to server') ||
                str_contains($message, 'Undefined table')
            ) {
                usleep(300000);
                continue;
            }

            throw $exception;
        }

        usleep(300000);
    }

    echo sprintf("CHECK path=%s status=%d type=%s\n", $path, $status, $contentType);

    if ($status !== 200) {
        $failed = true;
    }
}

exit($failed ? 1 : 0);
