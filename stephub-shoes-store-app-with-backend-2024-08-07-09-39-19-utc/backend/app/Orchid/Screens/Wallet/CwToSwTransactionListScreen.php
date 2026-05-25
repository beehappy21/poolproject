<?php

declare(strict_types=1);

namespace App\Orchid\Screens\Wallet;

class CwToSwTransactionListScreen extends WalletTransactionListScreen
{
    protected function currentMode(): string
    {
        return self::MODE_CW_TO_SW;
    }
}
