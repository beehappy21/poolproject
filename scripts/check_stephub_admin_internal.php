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
    '/admin/order/create',
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

try {
    $beforeOrderId = (int) (App\Models\OrderSource::query()->max('id') ?? 0);
    $members = App\Models\Member::query()
        ->orderBy('id')
        ->limit(2)
        ->get(['id']);
    $productDetails = App\Models\ProductDetailRecord::query()
        ->where('status', 'ACTIVE')
        ->orderBy('id')
        ->limit(2)
        ->get(['id']);

    if ($members->count() < 2 || $productDetails->count() < 2) {
        throw new RuntimeException('Need at least 2 members and 2 active product details for batch sale check.');
    }

    $session = $app->make('session')->driver();
    $screen = $app->make(App\Orchid\Screens\Order\OrderCreateScreen::class);
    $request = Illuminate\Http\Request::create('/admin/order/create', 'POST', [
        'sale' => [
            'member_id' => '',
            'workflow_mode' => 'approve_and_process',
            'fulfillment_method' => 'branch_pickup',
            'cash_payment_method' => 'cash',
            'pickup_branch_name' => 'Head Office',
            'pickup_recipient_name' => 'กานต์ธิตา มาสีปา',
            'pickup_phone' => '0812345678',
            'pickup_email' => '',
            'discount_wallet_amount' => '0',
            'shopping_wallet_amount' => '0',
            'firm_wallet_amount' => '0',
            'items' => [
                [
                    'product_detail_id' => '',
                    'quantity' => 1,
                ],
            ],
            'batch_lines' => [
                [
                    'member_id' => (int) $members[0]->id,
                    'product_detail_id' => (int) $productDetails[0]->id,
                    'quantity' => 1,
                ],
                [
                    'member_id' => (int) $members[0]->id,
                    'product_detail_id' => (int) $productDetails[1]->id,
                    'quantity' => 1,
                ],
                [
                    'member_id' => (int) $members[1]->id,
                    'product_detail_id' => (int) $productDetails[0]->id,
                    'quantity' => 1,
                ],
            ],
        ],
    ]);
    $request->setLaravelSession($session);

    $response = $screen->createSale($request);
    $afterOrders = App\Models\OrderSource::query()
        ->where('id', '>', $beforeOrderId)
        ->orderBy('id')
        ->get();

    $saleStatus = $response instanceof Illuminate\Http\RedirectResponse
        && $afterOrders->count() >= 2
        && $afterOrders->every(fn ($order) => !empty($order->approvedAt))
        ? 200
        : 500;

    echo sprintf(
        "CHECK sale_flow status=%d orderIds=%s target=%s approvedAt=%s\n",
        $saleStatus,
        $afterOrders->pluck('id')->implode(',') ?: '-',
        $response instanceof Illuminate\Http\RedirectResponse ? $response->getTargetUrl() : '-',
        $afterOrders->map(fn ($order) => $order->approvedAt?->toIso8601String() ?? '-')->implode(',') ?: '-',
    );

    if ($saleStatus !== 200) {
        $failed = true;
    }
} catch (Throwable $exception) {
    echo sprintf("CHECK sale_flow status=500 error=%s\n", $exception->getMessage());
    $failed = true;
}

exit($failed ? 1 : 0);
