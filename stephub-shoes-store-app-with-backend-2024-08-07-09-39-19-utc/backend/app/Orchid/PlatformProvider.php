<?php

declare(strict_types=1);

namespace App\Orchid;

use Orchid\Platform\Dashboard;
use Orchid\Platform\ItemPermission;
use Orchid\Platform\OrchidServiceProvider;
use Orchid\Screen\Actions\Menu;
use Orchid\Support\Color;
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

      Menu::make('Products')
        ->title('Navigation')
        ->icon('bs.grid')
        ->route('platform.product.list'),

      Menu::make('Commission Setting')
        ->title('Commission Setting')
        ->icon('bs-cash-stack')
        ->route('platform.commission.settings'),

      Menu::make('Commission Report')
        ->icon('bs-table')
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

      Menu::make('Suppliers')
        ->icon('bs.truck')
        ->route('platform.supplier.list'),

      Menu::make('Orders')
        ->icon('bs.cart3')
        ->badge(function () {
          if (Order::where('order_status', 'pending')->count() > 0) {
            return Order::where('order_status', 'pending')->count();
          }
        })
        ->route('platform.order.list'),

      Menu::make('Order Reports')
        ->title('Reports')
        ->icon('bs.clipboard-data')
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
        ->route('platform.slide.list'),

      Menu::make('Categories')
        ->icon('bs.grid')
        ->route('platform.category.list'),

      Menu::make('Members')
        ->icon('bs.people')
        ->route('platform.member.list'),

      Menu::make('Sizes')
        ->icon('bs.bounding-box')
        ->route('platform.size.list'),

      Menu::make('Promocodes')
        ->icon('bs.percent')
        ->route('platform.promocode.list'),

      Menu::make('Colors')
        ->icon('bs.palette')
        ->route('platform.color.list'),

      Menu::make('Promotions')
        ->icon('bs.gift')
        ->route('platform.promotion.list'),

      Menu::make('Tags')
        ->icon('bs.tag')
        ->route('platform.tag.list'),

      Menu::make('Reviews')
        ->icon('bs.chat-left-text')
        ->route('platform.review.list'),

      Menu::make('App Users')
        ->icon('bs.person')
        ->route('platform.appuser.list'),

      Menu::make('Banner')
        ->icon('bs.image')
        ->route('platform.banner.list'),

      Menu::make(__('Users'))
        ->icon('bs.people')
        ->route('platform.systems.users')
        ->permission('platform.systems.users')
        ->title(__('Access Controls')),

      Menu::make(__('Roles'))
        ->icon('bs.shield')
        ->route('platform.systems.roles')
        ->permission('platform.systems.roles')
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
        ->addPermission('platform.systems.roles', __('Roles'))
        ->addPermission('platform.systems.users', __('Users')),
    ];
  }
}
