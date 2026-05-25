@extends(config('platform.workspace', 'platform::workspace.compact'))

@push('head')
    <style>
        @media (min-width: 1200px) {
            html,
            body {
                height: 100%;
            }

            body {
                overflow: hidden;
            }

            .container-fluid {
                height: 100vh;
            }

            .container-fluid > .row {
                height: 100%;
                flex-wrap: nowrap;
            }

            .container-fluid > .row > .aside,
            .container-fluid > .row > .col-xxl {
                height: 100%;
                min-height: 0;
            }

            .container-fluid > .row > .col-xxl {
                overflow: hidden;
            }

            .aside {
                position: sticky;
                top: 0;
            }

            .aside-collapse {
                min-height: 0;
                overflow-y: auto;
                overscroll-behavior: contain;
            }

            .workspace {
                min-height: 0;
                overflow-y: auto;
                overscroll-behavior: contain;
                padding-right: 0.5rem;
            }
        }
    </style>
@endpush

@push('scripts')
    <script>
        (() => {
            const storageKey = 'bao:last-open-sidebar-menu';

            const syncStoredMenu = () => {
                const nav = document.getElementById('headerMenuCollapse');
                if (!nav || !window.bootstrap?.Collapse) {
                    return;
                }

                const menus = Array.from(nav.querySelectorAll('.sub-menu[id]'));
                const activeMenu = menus.find((menu) => menu.classList.contains('show'));
                const storedMenuId = window.localStorage.getItem(storageKey);
                const targetMenu = activeMenu ?? menus.find((menu) => menu.id === storedMenuId);

                if (activeMenu) {
                    window.localStorage.setItem(storageKey, activeMenu.id);
                    return;
                }

                if (!targetMenu) {
                    return;
                }

                window.bootstrap.Collapse.getOrCreateInstance(targetMenu, {
                    toggle: false,
                }).show();
            };

            const bindMenuPersistence = () => {
                const nav = document.getElementById('headerMenuCollapse');
                if (!nav) {
                    return;
                }

                if (nav.dataset.menuPersistenceBound === 'true') {
                    syncStoredMenu();
                    return;
                }

                nav.dataset.menuPersistenceBound = 'true';

                nav.querySelectorAll('[data-bs-toggle="collapse"]').forEach((toggle) => {
                    toggle.addEventListener('click', (event) => {
                        const selector = toggle.getAttribute('data-bs-target')
                            || toggle.getAttribute('href');

                        if (!selector || !selector.startsWith('#')) {
                            return;
                        }

                        const menu = nav.querySelector(selector);

                        if (!menu?.classList.contains('show')) {
                            return;
                        }

                        event.preventDefault();
                        event.stopPropagation();

                        window.bootstrap?.Collapse.getOrCreateInstance(menu, {
                            toggle: false,
                        }).show();
                    });
                });

                nav.querySelectorAll('.sub-menu[id]').forEach((menu) => {
                    menu.removeAttribute('data-bs-parent');

                    menu.addEventListener('shown.bs.collapse', () => {
                        window.localStorage.setItem(storageKey, menu.id);
                    });

                    menu.addEventListener('hidden.bs.collapse', () => {
                        if (window.localStorage.getItem(storageKey) === menu.id) {
                            window.localStorage.removeItem(storageKey);
                        }
                    });
                });

                syncStoredMenu();
            };

            document.addEventListener('DOMContentLoaded', bindMenuPersistence);
            document.addEventListener('turbo:load', bindMenuPersistence);
        })();
    </script>
@endpush

@section('aside')
    <div class="aside col-xs-12 col-xxl-2 bg-dark d-flex flex-column me-auto" data-controller="menu">
        <header class="d-xl-block p-3 mt-xl-4 w-100 d-flex align-items-center">
            <a href="#" class="header-toggler d-xl-none me-auto order-first d-flex align-items-center lh-1"
               data-action="click->menu#toggle">
                <x-orchid-icon path="bs.three-dots-vertical" class="icon-menu"/>

                <span class="ms-2">@yield('title')</span>
            </a>

            <a class="header-brand order-last" href="{{ route(config('platform.index')) }}">
                @includeFirst([config('platform.template.header'), 'platform::header'])
            </a>
        </header>

        <nav class="aside-collapse w-100 d-xl-flex flex-column collapse-horizontal" id="headerMenuCollapse">

            @include('platform::partials.search')

            <ul class="nav flex-column mb-md-1 mb-auto ps-0">
                {!! Dashboard::renderMenu(\Orchid\Platform\Dashboard::MENU_MAIN) !!}
            </ul>

            <div class="h-100 w-100 position-relative to-top cursor d-none d-md-flex mt-md-5"
                 data-action="click->html-load#goToTop"
                 title="{{ __('Scroll to top') }}">
                <div class="bottom-left w-100 mb-2 ps-3 overflow-hidden">
                    <small data-controller="viewport-entrance-toggle"
                           class="scroll-to-top"
                           data-viewport-entrance-toggle-class="show">
                        <x-orchid-icon path="bs.chevron-up" class="me-2"/>
                        {{ __('Scroll to top') }}
                    </small>
                </div>
            </div>

            <footer class="position-sticky bottom-0">
                <div class="bg-dark position-relative overflow-hidden" style="padding-bottom: 10px;">
                    @includeWhen(Auth::check(), 'platform::partials.profile')
                </div>
            </footer>
        </nav>
    </div>
@endsection

@section('workspace')
    @if(Breadcrumbs::has())
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb px-4 mb-2">
                <x-tabuna-breadcrumbs
                    class="breadcrumb-item"
                    active="active"
                />
            </ol>
        </nav>
    @endif

    <div class="order-last order-md-0 command-bar-wrapper">
        <div class="@hasSection('navbar') @else d-none d-md-block @endif layout d-md-flex align-items-center">
            <header class="d-none d-md-block col-xs-12 col-md p-0 me-3">
                <h1 class="m-0 fw-light h3 text-black">@yield('title')</h1>
                <small class="text-muted" title="@yield('description')">@yield('description')</small>
            </header>
            <nav class="col-xs-12 col-md-auto ms-md-auto p-0">
                <ul class="nav command-bar justify-content-sm-end justify-content-start d-flex align-items-center">
                    @yield('navbar')
                </ul>
            </nav>
        </div>
    </div>

    @include('platform::partials.alert')
    @yield('content')
@endsection
