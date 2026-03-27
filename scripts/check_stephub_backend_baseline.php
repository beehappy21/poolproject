<?php

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED);

$root = dirname(__DIR__);
$backend = $root.'/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend';

require $backend.'/vendor/autoload.php';

$app = require $backend.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$maxAttempts = 3;
$attempt = 0;

while ($attempt < $maxAttempts) {
    $attempt++;

    try {
        $productCategoryCount = (int) Illuminate\Support\Facades\DB::connection('poolproject')
            ->table('ProductCategory')
            ->count();
        $productCount = (int) Illuminate\Support\Facades\DB::connection('poolproject')
            ->table('Product')
            ->count();
        $productDetailCount = (int) Illuminate\Support\Facades\DB::connection('poolproject')
            ->table('ProductDetail')
            ->count();
        $memberCount = (int) Illuminate\Support\Facades\DB::connection('poolproject')
            ->table('User')
            ->where('memberCode', 'like', 'TH%')
            ->where('isAdmin', false)
            ->count();
        $unexpectedMemberCount = (int) Illuminate\Support\Facades\DB::connection('poolproject')
            ->table('User')
            ->where('isAdmin', false)
            ->where('memberCode', 'not like', 'TH%')
            ->count();

        $withdrawTable = Illuminate\Support\Facades\DB::connection('poolproject')
            ->selectOne('select to_regclass(\'public."WithdrawRequest"\')::text as value');
        $kycTable = Illuminate\Support\Facades\DB::connection('poolproject')
            ->selectOne('select to_regclass(\'public."KycRequest"\')::text as value');
        $productsView = Illuminate\Support\Facades\DB::connection('poolproject')
            ->selectOne('select to_regclass(\'public.stephub_products_v1\')::text as value');
        $membersView = Illuminate\Support\Facades\DB::connection('poolproject')
            ->selectOne('select to_regclass(\'public.stephub_members_v1\')::text as value');
        $productViewCount = Illuminate\Support\Facades\DB::connection('poolproject')
            ->selectOne('select count(*)::int as value from stephub_products_v1');
        $memberViewCount = Illuminate\Support\Facades\DB::connection('poolproject')
            ->selectOne('select count(*)::int as value from stephub_members_v1');

        $activeCategoryCount = (int) Illuminate\Support\Facades\DB::connection('poolproject')
            ->table('ProductCategory')
            ->where('status', 'ACTIVE')
            ->count();
        $activeProductCount = (int) Illuminate\Support\Facades\DB::connection('poolproject')
            ->table('Product')
            ->where('status', 'ACTIVE')
            ->count();
        $activeDetailCount = (int) Illuminate\Support\Facades\DB::connection('poolproject')
            ->table('ProductDetail')
            ->where('status', 'ACTIVE')
            ->count();

        $ok = $productCategoryCount > 0
            && $productCount > 0
            && $productDetailCount > 0
            && $memberCount === 210
            && $unexpectedMemberCount === 0
            && !empty($withdrawTable?->value)
            && !empty($kycTable?->value)
            && !empty($productsView?->value)
            && !empty($membersView?->value)
            && (int) ($productViewCount?->value ?? 0) > 0
            && (int) ($memberViewCount?->value ?? 0) === 210
            && $activeCategoryCount > 0
            && $activeProductCount > 0
            && $activeDetailCount > 0;

        if (! $ok) {
            fwrite(STDERR, json_encode([
                'productCategoryCount' => $productCategoryCount,
                'productCount' => $productCount,
                'productDetailCount' => $productDetailCount,
                'memberCount' => $memberCount,
                'unexpectedMemberCount' => $unexpectedMemberCount,
                'withdrawTable' => $withdrawTable?->value ?? null,
                'kycTable' => $kycTable?->value ?? null,
                'productsView' => $productsView?->value ?? null,
                'membersView' => $membersView?->value ?? null,
                'productViewCount' => (int) ($productViewCount?->value ?? 0),
                'memberViewCount' => (int) ($memberViewCount?->value ?? 0),
                'activeCategoryCount' => $activeCategoryCount,
                'activeProductCount' => $activeProductCount,
                'activeDetailCount' => $activeDetailCount,
            ], JSON_UNESCAPED_SLASHES).PHP_EOL);
        }

        exit($ok ? 0 : 1);
    } catch (Throwable $exception) {
        $message = $exception->getMessage();

        if (
            str_contains($message, 'Operation not permitted') ||
            str_contains($message, 'connection to server') ||
            str_contains($message, 'Undefined table')
        ) {
            usleep(300000);
            continue;
        }

        fwrite(STDERR, $message.PHP_EOL);
        exit(1);
    }
}

exit(1);
