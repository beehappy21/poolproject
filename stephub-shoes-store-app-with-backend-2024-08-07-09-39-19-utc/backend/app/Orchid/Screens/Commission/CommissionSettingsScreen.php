<?php

namespace App\Orchid\Screens\Commission;

use Illuminate\Http\Request;
use App\Support\PoolprojectSettingsStore;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Layout;

class CommissionSettingsScreen extends Screen
{
    private const SECTIONS = [
        'settings' => [
            'title' => 'Commission Setting',
            'routeName' => 'platform.commission.settings',
            'eyebrow' => 'Commission Setting',
            'description' => 'Central place for commission rules, payout assumptions, and rollout notes before each bonus type is wired to the live engine.',
            'accent' => '#4f46e5',
            'cards' => [
                ['label' => 'Direct bonus', 'value' => 'Ready for mapping', 'note' => 'Sponsor bonus rules and cap assumptions'],
                ['label' => 'Unilevel bonus', 'value' => 'Needs config UI', 'note' => 'Level rates, qualification, fallback handling'],
                ['label' => 'Matrix bonus', 'value' => 'Needs config UI', 'note' => 'Board thresholds and payout ladders'],
                ['label' => 'Pool bonus', 'value' => 'Needs config UI', 'note' => 'Daily pool share, hold and release policy'],
            ],
            'bullets' => [
                'Use this section as the Stephub-style home for commission configuration.',
                'Next step is wiring these screens to existing poolproject commission settings and snapshots.',
                'Keep wording, grouping, and screen hierarchy here first before adding write flow.',
            ],
        ],
        'direct' => [
            'title' => 'Direct Bonus',
            'routeName' => 'platform.commission.direct',
            'eyebrow' => 'Commission Setting',
            'description' => 'Sponsor reward configuration for direct referral payouts and qualification rules.',
            'accent' => '#0ea5e9',
            'cards' => [
                ['label' => 'Rate source', 'value' => 'Pending UI', 'note' => 'Flat amount or percentage'],
                ['label' => 'Qualification', 'value' => 'Pending UI', 'note' => 'Cycle and activation requirements'],
                ['label' => 'Snapshot policy', 'value' => 'Pending UI', 'note' => 'Order-time config freeze'],
            ],
            'bullets' => [
                'Add fields for rate, cap, and activation requirements here.',
                'This screen should eventually map to the live direct commission settings.',
            ],
        ],
        'unilevel' => [
            'title' => 'Unilevel Bonus',
            'routeName' => 'platform.commission.unilevel',
            'eyebrow' => 'Commission Setting',
            'description' => 'Level-based team payout configuration, including ladder rules and qualification checks.',
            'accent' => '#10b981',
            'cards' => [
                ['label' => 'Levels', 'value' => 'Pending UI', 'note' => 'Per-level payout configuration'],
                ['label' => 'Compression', 'value' => 'Pending UI', 'note' => 'Fallback and skip logic'],
                ['label' => 'Eligibility', 'value' => 'Pending UI', 'note' => 'Cycle and team requirements'],
            ],
            'bullets' => [
                'This screen is the Stephub-first shell for unilevel configuration.',
                'Later we can bind it to the current commission settings model and snapshots.',
            ],
        ],
        'matrix' => [
            'title' => 'Matrix Bonus',
            'routeName' => 'platform.commission.matrix',
            'eyebrow' => 'Commission Setting',
            'description' => 'Matrix board opening, position thresholds, and payout progression settings.',
            'accent' => '#f59e0b',
            'cards' => [
                ['label' => 'Boards', 'value' => 'Pending UI', 'note' => 'Board count and open thresholds'],
                ['label' => 'Payouts', 'value' => 'Pending UI', 'note' => 'Per-board or per-level release logic'],
                ['label' => 'Reset policy', 'value' => 'Pending UI', 'note' => 'Completion and reset handling'],
            ],
            'bullets' => [
                'Use this page to stage matrix settings before we wire forms into the matrix module.',
                'The layout is already ready for Stephub-style cards and grouped controls.',
            ],
        ],
        'pool' => [
            'title' => 'Pool Bonus',
            'routeName' => 'platform.commission.pool',
            'eyebrow' => 'Commission Setting',
            'description' => 'Daily pool share configuration, hold rules, release timing, and pool calculation notes.',
            'accent' => '#ef4444',
            'cards' => [
                ['label' => 'Pool rate', 'value' => 'Pending UI', 'note' => 'Global or item-level pool contribution'],
                ['label' => 'Hold policy', 'value' => 'Pending UI', 'note' => 'Reserve, release, and reversal behavior'],
                ['label' => 'Daily close', 'value' => 'Pending UI', 'note' => 'Close cycle timing and adjustments'],
            ],
            'bullets' => [
                'This page should be the first home for pool rate decisions in the Stephub admin.',
                'Later we can connect it to pool.service and commission snapshots.',
            ],
        ],
    ];

    private array $sectionConfig = self::SECTIONS['settings'];

    public function query(Request $request): iterable
    {
        $section = (string) ($request->route('section') ?? 'settings');
        $this->sectionConfig = self::SECTIONS[$section] ?? self::SECTIONS['settings'];

        return [
            'commissionSection' => [
                ...$this->sectionConfig,
                'key' => $section,
            ],
            'commissionSettings' => PoolprojectSettingsStore::readCommissionSettings(),
            'matrixSettings' => PoolprojectSettingsStore::readMatrixSettings(),
            'commissionNav' => collect(self::SECTIONS)->map(
                fn (array $config, string $key) => [
                    'key' => $key,
                    'title' => $config['title'],
                    'route' => route($config['routeName']),
                    'isActive' => $key === $section,
                ]
            )->values()->all(),
        ];
    }

    public function name(): ?string
    {
        return $this->sectionConfig['title'];
    }

    public function description(): ?string
    {
        return $this->sectionConfig['description'];
    }

    public function commandBar(): iterable
    {
        return [];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('commission.settings'),
        ];
    }
}
