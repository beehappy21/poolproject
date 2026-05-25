<?php

declare(strict_types=1);

namespace App\Orchid\Screens\Wallet;

class SwTransferTransactionListScreen extends WalletTransactionListScreen
{
    protected function currentMode(): string
    {
        return self::MODE_SW_TRANSFER;
    }
}
