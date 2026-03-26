<?php

declare(strict_types=1);

namespace App\Orchid\Screens\Admin;

use App\Models\AdminAuditLog;
use App\Orchid\Layouts\Admin\AdminAuditLogListLayout;
use App\Support\AdminPermissions;
use Orchid\Screen\Screen;

class AdminAuditLogListScreen extends Screen
{
    public function query(): iterable
    {
        return [
            'logs' => AdminAuditLog::query()
                ->with('adminUser')
                ->latest('id')
                ->paginate(50),
        ];
    }

    public function name(): ?string
    {
        return 'Admin Activity Logs';
    }

    public function description(): ?string
    {
        return 'Track admin access, screen visits, and write actions inside BAO.';
    }

    public function permission(): ?iterable
    {
        return [
            AdminPermissions::ADMIN_LOGS,
        ];
    }

    public function layout(): iterable
    {
        return [
            AdminAuditLogListLayout::class,
        ];
    }
}
