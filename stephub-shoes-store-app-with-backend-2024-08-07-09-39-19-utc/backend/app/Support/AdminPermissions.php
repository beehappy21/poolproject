<?php

declare(strict_types=1);

namespace App\Support;

final class AdminPermissions
{
    public const SUPERADMIN_ROLE = 'superadmin';

    public const PLATFORM_INDEX = 'platform.index';
    public const CATALOG_MANAGE = 'platform.catalog.manage';
    public const MARKETING_MANAGE = 'platform.marketing.manage';
    public const MEMBERS_MANAGE = 'platform.members.manage';
    public const ORDERS_MANAGE = 'platform.orders.manage';
    public const COMMISSIONS_MANAGE = 'platform.commissions.manage';
    public const WALLETS_MANAGE = 'platform.wallets.manage';
    public const WITHDRAWALS_MANAGE = 'platform.withdrawals.manage';
    public const KYC_MANAGE = 'platform.kyc.manage';
    public const ADMIN_LOGS = 'platform.admin.logs';
    public const SYSTEMS_USERS = 'platform.systems.users';
    public const SYSTEMS_ROLES = 'platform.systems.roles';

    /**
     * @return string[]
     */
    public static function all(): array
    {
        return [
            self::PLATFORM_INDEX,
            self::CATALOG_MANAGE,
            self::MARKETING_MANAGE,
            self::MEMBERS_MANAGE,
            self::ORDERS_MANAGE,
            self::COMMISSIONS_MANAGE,
            self::WALLETS_MANAGE,
            self::WITHDRAWALS_MANAGE,
            self::KYC_MANAGE,
            self::ADMIN_LOGS,
            self::SYSTEMS_USERS,
            self::SYSTEMS_ROLES,
        ];
    }
}
