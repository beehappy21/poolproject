<?php

declare(strict_types=1);

use App\Orchid\Screens\PlatformScreen;
use App\Orchid\Screens\Role\RoleEditScreen;
use App\Orchid\Screens\Role\RoleListScreen;
use App\Orchid\Screens\User\UserEditScreen;
use App\Orchid\Screens\User\UserListScreen;
use App\Orchid\Screens\User\UserProfileScreen;
use Illuminate\Support\Facades\Route;
use Tabuna\Breadcrumbs\Trail;

use App\Orchid\Screens\Category\CategoryListScreen;
use App\Orchid\Screens\Category\CategoryEditScreen;
use App\Orchid\Screens\Banner\BannerListScreen;
use App\Orchid\Screens\Banner\BannerEditScreen;
use App\Orchid\Screens\Promotion\PromotionListScreen;
use App\Orchid\Screens\Promotion\PromotionEditScreen;
use App\Orchid\Screens\Promocode\PromocodeListScreen;
use App\Orchid\Screens\Promocode\PromocodeEditScreen;
use App\Orchid\Screens\Color\ColorListScreen;
use App\Orchid\Screens\Color\ColorEditScreen;
use App\Orchid\Screens\Order\OrderListScreen;
use App\Orchid\Screens\Order\OrderDetailScreen;
use App\Orchid\Screens\Order\OrderCreateScreen;
use App\Orchid\Screens\Withdraw\WithdrawRequestListScreen;
use App\Orchid\Screens\Withdraw\WithdrawRequestDetailScreen;
use App\Orchid\Screens\Wallet\WalletManualTopupScreen;
use App\Orchid\Screens\Wallet\WalletTopupRequestDetailScreen;
use App\Orchid\Screens\Wallet\WalletTopupRequestListScreen;
use App\Orchid\Screens\Kyc\KycRequestListScreen;
use App\Orchid\Screens\Kyc\KycRequestDetailScreen;
use App\Orchid\Screens\AppUser\AppUserListScreen;
use App\Orchid\Screens\Admin\AdminAuditLogListScreen;
use App\Orchid\Screens\Carousel\SlideListScreen;
use App\Orchid\Screens\Carousel\SlideEditScreen;
use App\Orchid\Screens\Review\ReviewListScreen;
use App\Orchid\Screens\Review\ReviewDetailScreen;
use App\Orchid\Screens\Audience\AudienceListScreen;
use App\Orchid\Screens\Audience\AudienceEditScreen;
use App\Orchid\Screens\Member\MemberListScreen;
use App\Orchid\Screens\Member\MemberEditScreen;
use App\Orchid\Screens\Size\SizeListScreen;
use App\Orchid\Screens\Size\SizeEditScreen;
use App\Orchid\Screens\Product\ProductListScreen;
use App\Orchid\Screens\Product\ProductEditScreen;
use App\Orchid\Screens\ProductFamily\ProductFamilyListScreen;
use App\Orchid\Screens\ProductFamily\ProductFamilyEditScreen;
use App\Orchid\Screens\Supplier\SupplierListScreen;
use App\Orchid\Screens\Supplier\SupplierEditScreen;
use App\Orchid\Screens\Commission\CommissionSettingsScreen;
use App\Orchid\Screens\Commission\CommissionReportScreen;
use App\Orchid\Screens\Finance\MemberBankAccountListScreen;
use App\Http\Controllers\Platform\CommissionReportController;
use App\Http\Controllers\Platform\OrderDocumentController;
use App\Http\Controllers\Platform\OrderReportController;
use App\Http\Controllers\Platform\WithdrawReportController;
use App\Http\Controllers\Platform\CommissionSettingsController;
use App\Orchid\Screens\Tag\TagListScreen;
use App\Orchid\Screens\Tag\TagEditScreen;
use App\Support\AdminPermissions;

/*
|--------------------------------------------------------------------------
| Dashboard Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the need "dashboard" middleware group. Now create something great!
|
*/

Route::middleware('admin.access:'.AdminPermissions::CATALOG_MANAGE)->group(function (): void {
  Route::screen('product/list', ProductListScreen::class)
    ->name('platform.product.list');

  Route::screen('product/edit/{product?}', ProductEditScreen::class)
    ->name('platform.product.edit');

  Route::screen('product-family/list', ProductFamilyListScreen::class)
    ->name('platform.product-family.list');

  Route::screen('product-family/edit/{family?}', ProductFamilyEditScreen::class)
    ->name('platform.product-family.edit');

  Route::screen('supplier/list', SupplierListScreen::class)
    ->name('platform.supplier.list');

  Route::screen('supplier/edit/{supplier?}', SupplierEditScreen::class)
    ->name('platform.supplier.edit');

  Route::screen('tag/list', TagListScreen::class)
    ->name('platform.tag.list');

  Route::screen('tag/edit/{tag?}', TagEditScreen::class)
    ->name('platform.tag.edit');

  Route::screen('size/list', SizeListScreen::class)
    ->name('platform.size.list');

  Route::screen('size/edit/{size?}', SizeEditScreen::class)
    ->name('platform.size.edit');

  Route::screen('color/list', ColorListScreen::class)
    ->name('platform.color.list');

  Route::screen('color/edit/{color?}', ColorEditScreen::class)
    ->name('platform.color.edit');

  Route::screen('category/list', CategoryListScreen::class)
    ->name('platform.category.list');

  Route::screen('category/edit/{category?}', CategoryEditScreen::class)
    ->name('platform.category.edit');
});

Route::middleware('admin.access:'.AdminPermissions::COMMISSIONS_MANAGE)->group(function (): void {
  Route::screen('commission/manual-payment', CommissionSettingsScreen::class)
    ->defaults('section', 'manual-payment')
    ->name('platform.commission.manualPayment');

  Route::screen('finance/bank/company-account', CommissionSettingsScreen::class)
    ->defaults('section', 'manual-payment')
    ->name('platform.finance.bank.company');

  Route::screen('line/status', CommissionSettingsScreen::class)
    ->defaults('section', 'line-status')
    ->name('platform.line.status');

  Route::screen('commission/signup-share', CommissionSettingsScreen::class)
    ->defaults('section', 'signup-share')
    ->name('platform.commission.signupShare');

  Route::screen('commission/report', CommissionReportScreen::class)
    ->defaults('reportMode', 'overview')
    ->name('platform.commission.report');

  Route::screen('commission/report/direct', CommissionReportScreen::class)
    ->defaults('reportMode', 'direct')
    ->name('platform.commission.report.direct');

  Route::screen('commission/report/team', CommissionReportScreen::class)
    ->defaults('reportMode', 'team')
    ->name('platform.commission.report.team');

  Route::screen('commission/report/matching', CommissionReportScreen::class)
    ->defaults('reportMode', 'matching')
    ->name('platform.commission.report.matching');

  Route::screen('commission/report/pool', CommissionReportScreen::class)
    ->defaults('reportMode', 'pool')
    ->name('platform.commission.report.pool');

  Route::get('commission/report/export/{reportMode?}', [CommissionReportController::class, 'export'])
    ->name('platform.commission.report.export');
  Route::post('commission/report/process-next-member', [CommissionReportController::class, 'processNextMember'])
    ->name('platform.commission.report.processNextMember');
  Route::post('commission/report/finalize-current-day', [CommissionReportController::class, 'finalizeCurrentDay'])
    ->name('platform.commission.report.finalizeCurrentDay');
  Route::post('commission/report/process-single-day', [CommissionReportController::class, 'processSingleDay'])
    ->name('platform.commission.report.processSingleDay');

  Route::post('commission/save', [CommissionSettingsController::class, 'saveCommission'])
    ->name('platform.commission.save');

  Route::post('commission/save-matrix', [CommissionSettingsController::class, 'saveMatrix'])
    ->name('platform.commission.saveMatrix');

  Route::post('commission/save-manual-payment', [CommissionSettingsController::class, 'saveManualPayment'])
    ->name('platform.commission.saveManualPayment');

  Route::post('commission/save-signup-share', [CommissionSettingsController::class, 'saveSignupShare'])
    ->name('platform.commission.saveSignupShare');
});

Route::middleware('admin.access:'.AdminPermissions::MARKETING_MANAGE)->group(function (): void {
  Route::screen('audience/list', AudienceListScreen::class)
    ->name('platform.audience.list');

  Route::screen('audience/edit/{audience?}', AudienceEditScreen::class)
    ->name('platform.audience.edit');

  Route::screen('review/list', ReviewListScreen::class)
    ->name('platform.review.list');

  Route::screen('review/detail/{review?}', ReviewDetailScreen::class)
    ->name('platform.review.detail');

  Route::screen('slide/list', SlideListScreen::class)
    ->name('platform.slide.list');

  Route::screen('slide/edit/{slide?}', SlideEditScreen::class)
    ->name('platform.slide.edit');

  Route::screen('banner/list', BannerListScreen::class)
    ->name('platform.banner.list');

  Route::screen('banner/edit/{banner?}', BannerEditScreen::class)
    ->name('platform.banner.edit');

  Route::screen('promotion/list', PromotionListScreen::class)
    ->name('platform.promotion.list');

  Route::screen('promotion/edit/{promotion?}', PromotionEditScreen::class)
    ->name('platform.promotion.edit');

  Route::screen('promocode/list', PromocodeListScreen::class)
    ->name('platform.promocode.list');

  Route::screen('promocode/edit/{promocode?}', PromocodeEditScreen::class)
    ->name('platform.promocode.edit');
});

Route::middleware('admin.access:'.AdminPermissions::MEMBERS_MANAGE)->group(function (): void {
  Route::screen('member/list', MemberListScreen::class)
    ->name('platform.member.list');

  Route::screen('member/edit/{member}', MemberEditScreen::class)
    ->name('platform.member.edit');

  Route::screen('appuser/list', AppUserListScreen::class)
    ->name('platform.appuser.list');
});

Route::middleware('admin.access:'.AdminPermissions::KYC_MANAGE)->group(function (): void {
  Route::screen('kyc/list', KycRequestListScreen::class)
    ->name('platform.kyc.list');

  Route::screen('kyc/detail/{kycRequest}', KycRequestDetailScreen::class)
    ->name('platform.kyc.detail');
});

Route::middleware('admin.access:'.AdminPermissions::WALLETS_MANAGE)->group(function (): void {
  Route::screen('wallet/topup/list', WalletTopupRequestListScreen::class)
    ->name('platform.wallet.topup.list');

  Route::screen('wallet/topup/detail/{walletTopupRequest}', WalletTopupRequestDetailScreen::class)
    ->name('platform.wallet.topup.detail');

  Route::screen('wallet/topup/manual', WalletManualTopupScreen::class)
    ->name('platform.wallet.topup.manual');
});

Route::middleware('admin.access:'.AdminPermissions::ORDERS_MANAGE)->group(function (): void {
  Route::screen('order/create', OrderCreateScreen::class)
    ->name('platform.order.create');

  Route::screen('order/list', OrderListScreen::class)
    ->defaults('bucket', 'all')
    ->name('platform.order.list');

  Route::screen('order/list/awaiting-payment', OrderListScreen::class)
    ->defaults('bucket', 'awaiting-payment')
    ->name('platform.order.awaitingPayment');

  Route::screen('order/list/transfer-review', OrderListScreen::class)
    ->defaults('bucket', 'transfer-review')
    ->name('platform.order.transferReview');

  Route::screen('order/list/awaiting-shipment', OrderListScreen::class)
    ->defaults('bucket', 'awaiting-shipment')
    ->name('platform.order.awaitingShipment');

  Route::screen('order/list/shipped', OrderListScreen::class)
    ->defaults('bucket', 'shipped')
    ->name('platform.order.shipped');

  Route::screen('order/list/delivered', OrderListScreen::class)
    ->defaults('bucket', 'delivered')
    ->name('platform.order.delivered');

  Route::get('order/export/{bucket?}', [OrderReportController::class, 'export'])
    ->name('platform.order.export');

  Route::get('order/{order}/receipt', [OrderDocumentController::class, 'receipt'])
    ->name('platform.order.receipt');

  Route::get('order/{order}/delivery-note', [OrderDocumentController::class, 'deliveryNote'])
    ->name('platform.order.deliveryNote');

  Route::screen('order/detail/{order?}', OrderDetailScreen::class)
    ->name('platform.order.detail');
});

Route::middleware('admin.access:'.AdminPermissions::WITHDRAWALS_MANAGE)->group(function (): void {
  Route::screen('withdraw/list', WithdrawRequestListScreen::class)
    ->name('platform.withdraw.list');

  Route::screen('finance/bank/member-account', MemberBankAccountListScreen::class)
    ->name('platform.finance.bank.member');

  Route::screen('withdraw/detail/{withdrawRequest}', WithdrawRequestDetailScreen::class)
    ->name('platform.withdraw.detail');

  Route::get('withdraw/export', [WithdrawReportController::class, 'export'])
    ->name('platform.withdraw.export');
});

Route::middleware('admin.access:'.AdminPermissions::ADMIN_LOGS)->group(function (): void {
  Route::screen('admin/logs', AdminAuditLogListScreen::class)
    ->name('platform.admin.logs');
});

// Main
Route::screen('/main', PlatformScreen::class)
  ->name('platform.main');

// Platform > Profile
Route::screen('profile', UserProfileScreen::class)
  ->name('platform.profile')
  ->breadcrumbs(fn (Trail $trail) => $trail
    ->parent('platform.index')
    ->push(__('Profile'), route('platform.profile')));

// Platform > System > Users > User
Route::screen('users/{user}/edit', UserEditScreen::class)
  ->name('platform.systems.users.edit')
  ->breadcrumbs(fn (Trail $trail, $user) => $trail
    ->parent('platform.systems.users')
    ->push($user->name, route('platform.systems.users.edit', $user)));

// Platform > System > Users > Create
Route::screen('users/create', UserEditScreen::class)
  ->name('platform.systems.users.create')
  ->breadcrumbs(fn (Trail $trail) => $trail
    ->parent('platform.systems.users')
    ->push(__('Create'), route('platform.systems.users.create')));

// Platform > System > Users
Route::screen('users', UserListScreen::class)
  ->name('platform.systems.users')
  ->breadcrumbs(fn (Trail $trail) => $trail
    ->parent('platform.index')
    ->push(__('Users'), route('platform.systems.users')));

// Platform > System > Roles > Role
Route::screen('roles/{role}/edit', RoleEditScreen::class)
  ->name('platform.systems.roles.edit')
  ->breadcrumbs(fn (Trail $trail, $role) => $trail
    ->parent('platform.systems.roles')
    ->push($role->name, route('platform.systems.roles.edit', $role)));

// Platform > System > Roles > Create
Route::screen('roles/create', RoleEditScreen::class)
  ->name('platform.systems.roles.create')
  ->breadcrumbs(fn (Trail $trail) => $trail
    ->parent('platform.systems.roles')
    ->push(__('Create'), route('platform.systems.roles.create')));

// Platform > System > Roles
Route::screen('roles', RoleListScreen::class)
  ->name('platform.systems.roles')
  ->breadcrumbs(fn (Trail $trail) => $trail
    ->parent('platform.index')
    ->push(__('Roles'), route('platform.systems.roles')));
