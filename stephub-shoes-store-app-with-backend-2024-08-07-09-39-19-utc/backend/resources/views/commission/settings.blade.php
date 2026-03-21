@php
    $section = $commissionSection ?? [];
    $nav = $commissionNav ?? [];
    $accent = $section['accent'] ?? '#4f46e5';
    $commissionSettings = $commissionSettings ?? [
        'directLevelRates' => ['0.2'],
        'uniLevelRates' => ['0.05', '0.05', '0.05', '0.05', '0.05'],
        'poolRate' => '0.5',
    ];
    $matrixSettings = $matrixSettings ?? [
        'boardWidth' => 2,
        'boardDepth' => 3,
        'boardCount' => 3,
        'organizationPvRate' => '0.1',
        'levelRates' => ['0.1', '0.05', '0.03'],
        'boardOpenPvThresholds' => ['100', '100', '100'],
    ];
    $activeKey = $section['key'] ?? null;
@endphp

<style>
    .commission-shell { display:grid; gap:1.25rem; grid-template-columns:280px minmax(0,1fr); }
    .commission-sidebar,.commission-panel,.commission-card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; box-shadow:0 12px 40px rgba(15,23,42,.05); }
    .commission-sidebar { padding:1rem; align-self:start; position:sticky; top:1rem; }
    .commission-sidebar__eyebrow,.commission-eyebrow { font-size:.75rem; text-transform:uppercase; letter-spacing:.12em; color:#64748b; }
    .commission-sidebar__eyebrow { margin-bottom:.85rem; }
    .commission-nav { display:grid; gap:.6rem; }
    .commission-nav a { display:flex; align-items:center; justify-content:space-between; padding:.9rem 1rem; border-radius:12px; text-decoration:none; color:#334155; background:#f8fafc; border:1px solid transparent; font-weight:600; }
    .commission-nav a.is-active { background:color-mix(in srgb, {{ $accent }} 10%, #fff); color:{{ $accent }}; border-color:color-mix(in srgb, {{ $accent }} 24%, #fff); }
    .commission-main { display:grid; gap:1.25rem; }
    .commission-panel { padding:1.5rem; position:relative; overflow:hidden; }
    .commission-panel::before { content:""; position:absolute; inset:0 auto auto 0; width:100%; height:4px; background:linear-gradient(90deg, {{ $accent }}, color-mix(in srgb, {{ $accent }} 35%, #fff)); }
    .commission-title { margin:0; font-size:1.8rem; line-height:1.15; color:#0f172a; }
    .commission-description { margin:.85rem 0 0; font-size:1rem; line-height:1.7; color:#475569; max-width:62rem; }
    .commission-card-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); }
    .commission-card { padding:1.15rem; border-top:4px solid {{ $accent }}; }
    .commission-card__label { font-size:.86rem; color:#64748b; margin-bottom:.5rem; }
    .commission-card__value { font-size:1.05rem; font-weight:700; color:#0f172a; margin-bottom:.45rem; }
    .commission-card__note { font-size:.92rem; line-height:1.6; color:#475569; }
    .commission-list { margin:0; padding-left:1.1rem; color:#475569; line-height:1.8; }
    .commission-placeholder { border:1px dashed color-mix(in srgb, {{ $accent }} 30%, #cbd5e1); border-radius:14px; padding:1.1rem 1.2rem; background:color-mix(in srgb, {{ $accent }} 5%, #fff); color:#334155; }
    .commission-form-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); margin-top:1rem; }
    .commission-field { display:flex; flex-direction:column; gap:.45rem; }
    .commission-field label { font-weight:600; color:#334155; }
    .commission-field input { border:1px solid #cbd5e1; border-radius:10px; padding:.8rem .9rem; width:100%; }
    .commission-save { margin-top:1rem; display:inline-flex; align-items:center; gap:.5rem; border:0; border-radius:10px; padding:.8rem 1rem; color:#fff; background:{{ $accent }}; font-weight:700; }
    .commission-save:hover { opacity:.92; }
    .commission-toolbar { display:flex; flex-wrap:wrap; gap:.75rem; margin-top:1rem; }
    .commission-action { display:inline-flex; align-items:center; gap:.45rem; border:1px solid #cbd5e1; border-radius:10px; padding:.75rem 1rem; background:#fff; color:#334155; font-weight:700; }
    .commission-action:hover { background:#f8fafc; }
    .commission-status { padding:.9rem 1rem; border-radius:12px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; }
    @media (max-width:980px) { .commission-shell { grid-template-columns:1fr; } .commission-sidebar { position:static; } }
</style>

@php
    $directRates = old('directLevelRates', $commissionSettings['directLevelRates'] ?? ['0.2']);
    $uniRates = old('uniLevelRates', $commissionSettings['uniLevelRates'] ?? ['0.05']);
    $poolRate = old('poolRate', $commissionSettings['poolRate'] ?? '0.5');
    $matrixOrgRate = old('organizationPvRate', $matrixSettings['organizationPvRate'] ?? '0.1');
    $matrixLevelRates = old('levelRates', $matrixSettings['levelRates'] ?? ['0.1', '0.05', '0.03']);
    $matrixThresholds = old('boardOpenPvThresholds', $matrixSettings['boardOpenPvThresholds'] ?? ['100', '100', '100']);
@endphp

<div class="commission-shell">
    <aside class="commission-sidebar">
        <div class="commission-sidebar__eyebrow">Commission Setting</div>
        <nav class="commission-nav">
            @foreach ($nav as $item)
                <a href="{{ $item['route'] }}" class="{{ $item['isActive'] ? 'is-active' : '' }}">
                    <span>{{ $item['title'] }}</span>
                    <span>{{ $item['isActive'] ? '•' : '↗' }}</span>
                </a>
            @endforeach
        </nav>
    </aside>

    <section class="commission-main">
        <div class="commission-panel">
            <div class="commission-eyebrow">{{ $section['eyebrow'] ?? 'Commission Setting' }}</div>
            <h1 class="commission-title">{{ $section['title'] ?? 'Commission Setting' }}</h1>
            <p class="commission-description">{{ $section['description'] ?? '' }}</p>
        </div>

        @if (session('status'))
            <div class="commission-status">{{ session('status') }}</div>
        @endif

        <div class="commission-card-grid">
            @foreach (($section['cards'] ?? []) as $card)
                <article class="commission-card">
                    <div class="commission-card__label">{{ $card['label'] }}</div>
                    <div class="commission-card__value">{{ $card['value'] }}</div>
                    <div class="commission-card__note">{{ $card['note'] }}</div>
                </article>
            @endforeach
        </div>

        @if ($activeKey === 'settings' || $activeKey === 'direct' || $activeKey === 'unilevel' || $activeKey === 'pool')
            <div class="commission-panel">
                <div class="commission-eyebrow">Live Commission Settings</div>
                <form method="POST" action="{{ route('platform.commission.save') }}">
                    @csrf
                    <input type="hidden" name="redirectSection" value="{{ $activeKey }}">

                    @if ($activeKey === 'settings' || $activeKey === 'direct')
                        <div class="commission-toolbar">
                            <button type="button" class="commission-action" data-level-list="directLevelList" data-level-label="Direct level" data-level-action="add">+ Add level</button>
                            <button type="button" class="commission-action" data-level-list="directLevelList" data-level-action="remove">- Remove level</button>
                        </div>
                        <div class="commission-form-grid" id="directLevelList">
                            @foreach ($directRates as $index => $value)
                                <div class="commission-field" data-level-item>
                                    <label>Direct level {{ $index + 1 }}</label>
                                    <input name="directLevelRates[]" value="{{ $value }}" required>
                                </div>
                            @endforeach
                        </div>
                    @else
                        @foreach ($directRates as $value)
                            <input type="hidden" name="directLevelRates[]" value="{{ $value }}">
                        @endforeach
                    @endif

                    @if ($activeKey === 'settings' || $activeKey === 'unilevel')
                        <div class="commission-toolbar">
                            <button type="button" class="commission-action" data-level-list="uniLevelList" data-level-label="Unilevel" data-level-action="add">+ Add level</button>
                            <button type="button" class="commission-action" data-level-list="uniLevelList" data-level-action="remove">- Remove level</button>
                        </div>
                        <div class="commission-form-grid" id="uniLevelList">
                            @foreach ($uniRates as $index => $value)
                                <div class="commission-field" data-level-item>
                                    <label>Unilevel {{ $index + 1 }}</label>
                                    <input name="uniLevelRates[]" value="{{ $value }}" required>
                                </div>
                            @endforeach
                        </div>
                    @else
                        @foreach ($uniRates as $value)
                            <input type="hidden" name="uniLevelRates[]" value="{{ $value }}">
                        @endforeach
                    @endif

                    @if ($activeKey === 'settings' || $activeKey === 'pool')
                        <div class="commission-form-grid">
                            <div class="commission-field">
                                <label>Pool rate</label>
                                <input name="poolRate" value="{{ $poolRate }}" required>
                            </div>
                        </div>
                    @else
                        <input type="hidden" name="poolRate" value="{{ $poolRate }}">
                    @endif

                    <button type="submit" class="commission-save">Save Commission Settings</button>
                </form>
            </div>
        @endif

        @if ($activeKey === 'matrix')
            <div class="commission-panel">
                <div class="commission-eyebrow">Live Matrix Settings</div>
                <form method="POST" action="{{ route('platform.commission.saveMatrix') }}">
                    @csrf
                    <div class="commission-form-grid">
                        <div class="commission-field">
                            <label>Organization PV rate</label>
                            <input name="organizationPvRate" value="{{ $matrixOrgRate }}" required>
                        </div>
                    </div>

                    <div class="commission-form-grid">
                        @foreach ($matrixLevelRates as $index => $value)
                            <div class="commission-field">
                                <label>Matrix level {{ $index + 1 }}</label>
                                <input name="levelRates[]" value="{{ $value }}" required>
                            </div>
                        @endforeach
                    </div>

                    <div class="commission-form-grid">
                        @foreach ($matrixThresholds as $index => $value)
                            <div class="commission-field">
                                <label>Board {{ $index + 1 }} open PV threshold</label>
                                <input name="boardOpenPvThresholds[]" value="{{ $value }}" required>
                            </div>
                        @endforeach
                    </div>

                    <button type="submit" class="commission-save">Save Matrix Settings</button>
                </form>
            </div>
        @endif

        <div class="commission-panel">
            <div class="commission-eyebrow">Planning Notes</div>
            <ol class="commission-list">
                @foreach (($section['bullets'] ?? []) as $bullet)
                    <li>{{ $bullet }}</li>
                @endforeach
            </ol>
        </div>

        <div class="commission-placeholder">
            Commission pages now write into the shared runtime settings used by poolproject. Next step is wiring deeper validation and per-section business rules.
        </div>
    </section>
</div>

<script>
    (function () {
        function renumber(containerId, labelPrefix) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const items = Array.from(container.querySelectorAll('[data-level-item]'));
            items.forEach(function (item, index) {
                const label = item.querySelector('label');
                if (label) {
                    label.textContent = `${labelPrefix} ${index + 1}`;
                }
            });
        }

        function addLevel(containerId, labelPrefix) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const template = container.querySelector('[data-level-item]');
            if (!template) return;
            const clone = template.cloneNode(true);
            const input = clone.querySelector('input');
            if (input) {
                input.value = '0';
            }
            container.appendChild(clone);
            renumber(containerId, labelPrefix);
        }

        function removeLevel(containerId, labelPrefix) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const items = container.querySelectorAll('[data-level-item]');
            if (items.length <= 1) return;
            items[items.length - 1].remove();
            renumber(containerId, labelPrefix);
        }

        document.querySelectorAll('[data-level-action]').forEach(function (button) {
            button.addEventListener('click', function () {
                const containerId = button.getAttribute('data-level-list');
                const labelPrefix = button.getAttribute('data-level-label') || 'Level';
                const action = button.getAttribute('data-level-action');
                if (action === 'add') {
                    addLevel(containerId, labelPrefix);
                    return;
                }
                removeLevel(containerId, labelPrefix);
            });
        });
    })();
</script>
