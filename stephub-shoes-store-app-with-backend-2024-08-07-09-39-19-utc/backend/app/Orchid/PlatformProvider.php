<?php

declare(strict_types=1);

namespace App\Orchid;

use App\Support\AdminPermissions;
use Orchid\Platform\Dashboard;
use Orchid\Platform\ItemPermission;
use Orchid\Platform\OrchidServiceProvider;
use Orchid\Screen\Actions\Menu;
use Orchid\Support\Color;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Auth;
use App\Models\Order;

class PlatformProvider extends OrchidServiceProvider {
  /**
   * Bootstrap the application services.
   *
   * @param Dashboard $dashboard
   *
   * @return void
   */
  public function boot(Dashboard $dashboard): void {
    parent::boot($dashboard);

    // ...
  }

  /**
   * Register the application menu.
   *
   * @return Menu[]
   */
  public function menu(): array {
    return [
      Menu::make('Dashboard')
        ->title('Navigation')
        ->icon('bs.speedometer2')
        ->route('platform.main')
        ->permission(AdminPermissions::PLATFORM_INDEX),

      Menu::make('Catalog Management')
        ->icon('bs-box-seam')
        ->permission(AdminPermissions::CATALOG_MANAGE)
        ->list([
          Menu::make('Suppliers')
            ->icon('bs.truck')
            ->route('platform.supplier.list'),
          Menu::make('Categories')
            ->icon('bs.grid')
            ->route('platform.category.list'),
          Menu::make('Product Families')
            ->icon('bs.collection')
            ->route('platform.product-family.list'),
          Menu::make('Product')
            ->icon('bs.box')
            ->route('platform.product.list'),
        ]),

      Menu::make('Commission Setting')
        ->title('Commission Setting')
        ->icon('bs-cash-stack')
        ->permission(AdminPermissions::COMMISSIONS_MANAGE)
        ->list([
          Menu::make('Overview')
            ->icon('bs.sliders')
            ->route('platform.commission.settings'),
          Menu::make('Direct Bonus')
            ->icon('bs-cash')
            ->route('platform.commission.direct'),
          Menu::make('Unilevel Bonus')
            ->icon('bs-diagram-3')
            ->route('platform.commission.unilevel'),
          Menu::make('Matrix Bonus')
            ->icon('bs-grid-3x3-gap')
            ->route('platform.commission.matrix'),
          Menu::make('Reentry Rules')
            ->icon('bs-arrow-repeat')
            ->route('platform.commission.reentry'),
          Menu::make('Pool Bonus')
            ->icon('bs-droplet')
            ->route('platform.commission.pool'),
          Menu::make('Cash Back')
            ->icon('bs-arrow-repeat')
            ->route('platform.commission.cashback'),
          Menu::make('Manual Payment')
            ->icon('bs-bank')
            ->route('platform.commission.manualPayment'),
        ]),

      Menu::make('จัดการ LINE')
        ->title('LINE')
        ->icon('bs-chat-dots')
        ->permission(AdminPermissions::COMMISSIONS_MANAGE)
        ->list([
          Menu::make('LINE Workspace')
            ->icon('bs-window')
            ->url('/admin'),
          Menu::make('Signup Share')
            ->icon('bs-share')
            ->route('platform.commission.signupShare'),
        ]),

      Menu::make('Commission Report')
        ->icon('bs-table')
        ->permission(AdminPermissions::COMMISSIONS_MANAGE)
        ->list([
          Menu::make('Commission Report')
            ->icon('bs-table')
            ->route('platform.commission.report'),
          Menu::make('Direct Bonus')
            ->icon('bs-cash')
            ->route('platform.commission.report.direct'),
          Menu::make('Unilevel Bonus')
            ->icon('bs-diagram-3')
            ->route('platform.commission.report.unilevel'),
          Menu::make('Matrix Bonus')
            ->icon('bs-grid-3x3-gap')
            ->route('platform.commission.report.matrix'),
          Menu::make('Pool Bonus')
            ->icon('bs-droplet')
            ->route('platform.commission.report.pool'),
          Menu::make('Cash Back')
            ->icon('bs-arrow-repeat')
            ->route('platform.commission.report.cashback'),
        ]),

      Menu::make('Orders')
        ->icon('bs.cart3')
        ->permission(AdminPermissions::ORDERS_MANAGE)
        ->badge(function () {
          if (! Schema::connection('poolproject')->hasTable((new Order())->getTable())) {
            return null;
          }

          $pendingCount = Order::where('order_status', 'pending')->count();
          if ($pendingCount > 0) {
            return $pendingCount;
          }
        })
        ->route('platform.order.list'),

      Menu::make('Create Member Sale')
        ->icon('bs.cart-plus')
        ->permission(AdminPermissions::ORDERS_MANAGE)
        ->route('platform.order.create'),

      Menu::make('Order Reports')
        ->title('Reports')
        ->icon('bs.clipboard-data')
        ->permission(AdminPermissions::ORDERS_MANAGE)
        ->list([
          Menu::make('Sales Report')
            ->icon('bs-receipt')
            ->route('platform.order.list'),
          Menu::make('Awaiting Payment')
            ->icon('bs-clock-history')
            ->route('platform.order.awaitingPayment'),
          Menu::make('Transfer Review')
            ->icon('bs-search')
            ->route('platform.order.transferReview'),
          Menu::make('Awaiting Shipment')
            ->icon('bs-box-seam')
            ->route('platform.order.awaitingShipment'),
          Menu::make('Shipped Orders')
            ->icon('bs-truck')
            ->route('platform.order.shipped'),
        ]),

      Menu::make('Carousel')
        ->icon('bs.collection-play')
        ->permission(AdminPermissions::MARKETING_MANAGE)
        ->route('platform.slide.list'),

      Menu::make('Members')
        ->icon('bs.people')
        ->permission(AdminPermissions::MEMBERS_MANAGE)
        ->route('platform.member.list'),

      Menu::make('Wallet')
        ->title('Wallet')
        ->icon('bs.wallet2')
        ->canSee($this->canSeeWalletMenu())
        ->list([
          Menu::make('Wallet Top-up Requests')
            ->icon('bs.card-checklist')
            ->canSee($this->canSeeWalletMenu())
            ->route('platform.wallet.topup.list'),
          Menu::make('Top Up Wallet')
            ->icon('bs.plus-circle')
            ->canSee($this->canSeeWalletMenu())
            ->route('platform.wallet.topup.manual'),
        ]),

      Menu::make('KYC Requests')
        ->icon('bs-person-vcard')
        ->permission(AdminPermissions::KYC_MANAGE)
        ->route('platform.kyc.list'),

      Menu::make('Sizes')
        ->icon('bs.bounding-box')
        ->permission(AdminPermissions::CATALOG_MANAGE)
        ->route('platform.size.list'),

      Menu::make('Promocodes')
        ->icon('bs.percent')
        ->permission(AdminPermissions::MARKETING_MANAGE)
        ->route('platform.promocode.list'),

      Menu::make('Colors')
        ->icon('bs.palette')
        ->permission(AdminPermissions::CATALOG_MANAGE)
        ->route('platform.color.list'),

      Menu::make('Promotions')
        ->icon('bs.gift')
        ->permission(AdminPermissions::MARKETING_MANAGE)
        ->route('platform.promotion.list'),

      Menu::make('Tags')
        ->icon('bs.tag')
        ->permission(AdminPermissions::CATALOG_MANAGE)
        ->route('platform.tag.list'),

      Menu::make('Reviews')
        ->icon('bs.chat-left-text')
        ->permission(AdminPermissions::MARKETING_MANAGE)
        ->route('platform.review.list'),

      Menu::make('App Users')
        ->icon('bs.person')
        ->permission(AdminPermissions::MEMBERS_MANAGE)
        ->route('platform.appuser.list'),

      Menu::make('Withdrawals')
        ->title('Finance')
        ->icon('bs-bank')
        ->permission(AdminPermissions::WITHDRAWALS_MANAGE)
        ->route('platform.withdraw.list'),

      Menu::make('Banner')
        ->icon('bs.image')
        ->permission(AdminPermissions::MARKETING_MANAGE)
        ->route('platform.banner.list'),

      Menu::make('Admins')
        ->title('Admin')
        ->icon('bs-people')
        ->route('platform.systems.users')
        ->permission(AdminPermissions::SYSTEMS_USERS),

      Menu::make('Roles')
        ->icon('bs-shield')
        ->route('platform.systems.roles')
        ->permission(AdminPermissions::SYSTEMS_ROLES),

      Menu::make('Activity Logs')
        ->icon('bs-journal-text')
        ->route('platform.admin.logs')
        ->permission(AdminPermissions::ADMIN_LOGS)
        ->divider(),

      Menu::make('Documentation')
        ->title('Docs')
        ->icon('bs.box-arrow-up-right')
        ->url('https://orchid.software/en/docs')
        ->target('_blank'),

      Menu::make('Changelog')
        ->icon('bs.box-arrow-up-right')
        ->url('https://github.com/orchidsoftware/platform/blob/master/CHANGELOG.md')
        ->target('_blank')
        ->badge(fn () => Dashboard::version(), Color::DARK),
    ];
  }

  /**
   * Register permissions for the application.
   *
   * @return ItemPermission[]
   */
  public function permissions(): array {
    return [
      ItemPermission::group(__('System'))
        ->addPermission(AdminPermissions::PLATFORM_INDEX, __('Dashboard Access'))
        ->addPermission(AdminPermissions::CATALOG_MANAGE, __('Catalog Management'))
        ->addPermission(AdminPermissions::MARKETING_MANAGE, __('Marketing Management'))
        ->addPermission(AdminPermissions::MEMBERS_MANAGE, __('Members Management'))
        ->addPermission(AdminPermissions::ORDERS_MANAGE, __('Orders Management'))
        ->addPermission(AdminPermissions::COMMISSIONS_MANAGE, __('Commission Management'))
        ->addPermission(AdminPermissions::WALLETS_MANAGE, __('Wallet Management'))
        ->addPermission(AdminPermissions::WITHDRAWALS_MANAGE, __('Withdrawals Management'))
        ->addPermission(AdminPermissions::KYC_MANAGE, __('KYC Management'))
        ->addPermission(AdminPermissions::ADMIN_LOGS, __('Admin Activity Logs'))
        ->addPermission(AdminPermissions::SYSTEMS_ROLES, __('Roles'))
        ->addPermission(AdminPermissions::SYSTEMS_USERS, __('Users')),
    ];
  }

  private function canSeeWalletMenu(): bool
  {
    $user = Auth::guard(config('platform.guard'))->user();

    if ($user === null) {
      return false;
    }

    return $user->inRole(AdminPermissions::SUPERADMIN_ROLE)
      || $user->hasAccess(AdminPermissions::WALLETS_MANAGE);
  }
}
