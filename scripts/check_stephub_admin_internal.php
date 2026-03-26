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
    $request = Illuminate\Http\Request::create($path, 'GET');
    $response = $http->handle($request);
    $status = $response->getStatusCode();
    $contentType = method_exists($response, 'headers')
        ? ($response->headers->get('content-type') ?? '')
        : '';

    echo sprintf("CHECK path=%s status=%d type=%s\n", $path, $status, $contentType);

    if ($status !== 200) {
        $failed = true;
    }

    $http->terminate($request, $response);
}

exit($failed ? 1 : 0);
