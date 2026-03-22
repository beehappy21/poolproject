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
use App\Orchid\Screens\AppUser\AppUserListScreen;
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
use App\Orchid\Screens\Package\PackageListScreen;
use App\Orchid\Screens\Package\PackageEditScreen;
use App\Orchid\Screens\Supplier\SupplierListScreen;
use App\Orchid\Screens\Supplier\SupplierEditScreen;
use App\Orchid\Screens\Commission\CommissionSettingsScreen;
use App\Orchid\Screens\Commission\CommissionReportScreen;
use App\Http\Controllers\Platform\CommissionSettingsController;
use App\Orchid\Screens\Tag\TagListScreen;
use App\Orchid\Screens\Tag\TagEditScreen;

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

// Platform > Products
Route::screen('product/list', ProductListScreen::class)
  ->name('platform.product.list');

Route::screen('product/edit/{product?}', ProductEditScreen::class)
  ->name('platform.product.edit');

// Platform > Packages
Route::screen('package/list', PackageListScreen::class)
  ->name('platform.package.list');

Route::screen('package/edit/{package?}', PackageEditScreen::class)
  ->name('platform.package.edit');

// Platform > Commission Settings
Route::screen('commission/settings', CommissionSettingsScreen::class)
  ->defaults('section', 'settings')
  ->name('platform.commission.settings');

Route::screen('commission/direct', CommissionSettingsScreen::class)
  ->defaults('section', 'direct')
  ->name('platform.commission.direct');

Route::screen('commission/unilevel', CommissionSettingsScreen::class)
  ->defaults('section', 'unilevel')
  ->name('platform.commission.unilevel');

Route::screen('commission/matrix', CommissionSettingsScreen::class)
  ->defaults('section', 'matrix')
  ->name('platform.commission.matrix');

Route::screen('commission/pool', CommissionSettingsScreen::class)
  ->defaults('section', 'pool')
  ->name('platform.commission.pool');

Route::screen('commission/report', CommissionReportScreen::class)
  ->defaults('reportMode', 'overview')
  ->name('platform.commission.report');

Route::screen('commission/report/direct', CommissionReportScreen::class)
  ->defaults('reportMode', 'direct')
  ->name('platform.commission.report.direct');

Route::screen('commission/report/unilevel', CommissionReportScreen::class)
  ->defaults('reportMode', 'unilevel')
  ->name('platform.commission.report.unilevel');

Route::screen('commission/report/matrix', CommissionReportScreen::class)
  ->defaults('reportMode', 'matrix')
  ->name('platform.commission.report.matrix');

Route::screen('commission/report/pool', CommissionReportScreen::class)
  ->defaults('reportMode', 'pool')
  ->name('platform.commission.report.pool');

Route::post('commission/save', [CommissionSettingsController::class, 'saveCommission'])
  ->name('platform.commission.save');

Route::post('commission/save-matrix', [CommissionSettingsController::class, 'saveMatrix'])
  ->name('platform.commission.saveMatrix');

// Platform > Suppliers
Route::screen('supplier/list', SupplierListScreen::class)
  ->name('platform.supplier.list');

Route::screen('supplier/edit/{supplier?}', SupplierEditScreen::class)
  ->name('platform.supplier.edit');

// Platform > Tags
Route::screen('tag/list', TagListScreen::class)
  ->name('platform.tag.list');

Route::screen('tag/edit/{tag?}', TagEditScreen::class)
  ->name('platform.tag.edit');

// Platform > Audience
Route::screen('audience/list', AudienceListScreen::class)
  ->name('platform.audience.list');

Route::screen('audience/edit/{audience?}', AudienceEditScreen::class)
  ->name('platform.audience.edit');

// Platform > Members
Route::screen('member/list', MemberListScreen::class)
  ->name('platform.member.list');

Route::screen('member/edit/{member}', MemberEditScreen::class)
  ->name('platform.member.edit');

// Platform > Sizes
Route::screen('size/list', SizeListScreen::class)
  ->name('platform.size.list');

Route::screen('size/edit/{size?}', SizeEditScreen::class)
  ->name('platform.size.edit');

// Platform > Reviews
Route::screen('review/list', ReviewListScreen::class)
  ->name('platform.review.list');

Route::screen('review/detail/{review?}', ReviewDetailScreen::class)
  ->name('platform.review.detail');

// Platform > Orders
Route::screen('order/list', OrderListScreen::class)
  ->name('platform.order.list');

Route::screen('order/detail/{order?}', OrderDetailScreen::class)
  ->name('platform.order.detail');

// Platform > Carousel
Route::screen('slide/list', SlideListScreen::class)
  ->name('platform.slide.list');

Route::screen('slide/edit/{slide?}', SlideEditScreen::class)
  ->name('platform.slide.edit');

// Platform > Colors
Route::screen('color/list', ColorListScreen::class)
  ->name('platform.color.list');

Route::screen('color/edit/{color?}', ColorEditScreen::class)
  ->name('platform.color.edit');

// Platform > Categories
Route::screen('category/list', CategoryListScreen::class)
  ->name('platform.category.list');

Route::screen('category/edit/{category?}', CategoryEditScreen::class)
  ->name('platform.category.edit');

// Platform > Banners
Route::screen('banner/list', BannerListScreen::class)
  ->name('platform.banner.list');

Route::screen('banner/edit/{banner?}', BannerEditScreen::class)
  ->name('platform.banner.edit');

// Platform > AppUsers
Route::screen('appuser/list', AppUserListScreen::class)
  ->name('platform.appuser.list');

// Platform > Promotions
Route::screen('promotion/list', PromotionListScreen::class)
  ->name('platform.promotion.list');

Route::screen('promotion/edit/{promotion?}', PromotionEditScreen::class)
  ->name('platform.promotion.edit');

// Platform > Promocodes
Route::screen('promocode/list', PromocodeListScreen::class)
  ->name('platform.promocode.list');

Route::screen('promocode/edit/{promocode?}', PromocodeEditScreen::class)
  ->name('platform.promocode.edit');

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
