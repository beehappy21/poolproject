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
                ['label' => 'Cash back', 'value' => 'Needs config UI', 'note' => 'Personal PV x cashback % on approval'],
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
            'description' => 'กำหนดกติกาเปิดบอร์ดด้วย PV ส่วนตัว, การดันสมาชิกในสายเลือดเข้าบอร์ด, และอัตราจ่ายของเมทริกซ์.',
            'accent' => '#f59e0b',
            'cards' => [
                ['label' => 'การเปิดบอร์ด', 'value' => 'PV ส่วนตัว', 'note' => 'ใช้ PV ส่วนตัวขั้นต่ำเพื่อเปิดบอร์ดแต่ละใบ'],
                ['label' => 'การวางสมาชิก', 'value' => 'สายเลือดเข้าบอร์ด', 'note' => 'สมาชิกในสายเลือดจะไหลลงใต้สมาชิกก่อนหน้า โดยเริ่มทางซ้าย'],
                ['label' => 'การเปิดบอร์ดถัดไป', 'value' => 'บอร์ดเต็มแล้วเปิดต่อ', 'note' => 'บอร์ด 2 และ 3 เปิดเมื่อบอร์ดก่อนหน้าครบ และใช้ยอด PV ส่วนตัวในบอร์ดนั้นคำนวณต่อ'],
            ],
            'bullets' => [
                'ใช้หน้านี้กำหนดกติกาเปิดบอร์ดจาก PV ส่วนตัวของสมาชิก เช่น มี PV ส่วนตัว 700 จึงเปิดบอร์ด 1 ได้',
                'เมื่อสมาชิกในสายเลือดมี PV ตามเกณฑ์ เช่น 700 จะเข้ามาเป็นตำแหน่งถัดไปในบอร์ด และถ้าคนนั้นมีสายงานต่อ จะลงใต้คนนั้นทางซ้ายก่อน',
                'การไปบอร์ด 2 เกิดเมื่อคนในบอร์ด 1 ครบแล้ว และคำนวณต่อจากยอด PV ส่วนตัวของสมาชิกในบอร์ด 1 ส่วนบอร์ด 3 ใช้หลักเดียวกับบอร์ด 2',
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
        'cashback' => [
            'title' => 'Cash Back',
            'routeName' => 'platform.commission.cashback',
            'eyebrow' => 'Commission Setting',
            'description' => 'Cash back configuration for personal purchase PV, paid immediately when an order is approved.',
            'accent' => '#8b5cf6',
            'cards' => [
                ['label' => 'Calculation base', 'value' => 'Personal PV', 'note' => 'Uses the approved order PV of the buyer'],
                ['label' => 'Payout timing', 'value' => 'On approval', 'note' => 'Creates ledger and wallet credit immediately after approval'],
                ['label' => 'Reversal flow', 'value' => 'Same as commissions', 'note' => 'Reprocess and reversal behavior follow the standard commission flow'],
            ],
            'bullets' => [
                'Use this page to set the cashback percentage applied to each member\'s own approved PV.',
                'Cashback should appear alongside other commission reports and reuse the same ledger history model.',
            ],
        ],
    ];

    private array $sectionConfig = self::SECTIONS['settings'];

    public static function commissionNav(string $activeKey): array
    {
        $nav = collect(self::SECTIONS)->map(
            fn (array $config, string $key) => [
                'key' => $key,
                'title' => $config['title'],
                'route' => route($config['routeName']),
                'isActive' => $key === $activeKey,
            ]
        );

        $nav->push([
            'key' => 'report',
            'title' => 'Commission Report',
            'route' => route('platform.commission.report'),
            'isActive' => $activeKey === 'report',
        ]);

        return $nav->values()->all();
    }

    public function query(Request $request): iterable
    {
        $section = (string) ($request->route('section') ?? 'settings');
        if (!array_key_exists($section, self::SECTIONS)) {
            $section = 'settings';
        }
        $this->sectionConfig = self::SECTIONS[$section];

        return $this->buildPayload($section);
    }

    public function settings(Request $request): iterable
    {
        return $this->resolveSectionPayload('settings');
    }

    public function direct(Request $request): iterable
    {
        return $this->resolveSectionPayload('direct');
    }

    public function unilevel(Request $request): iterable
    {
        return $this->resolveSectionPayload('unilevel');
    }

    public function matrix(Request $request): iterable
    {
        return $this->resolveSectionPayload('matrix');
    }

    public function pool(Request $request): iterable
    {
        return $this->resolveSectionPayload('pool');
    }

    public function cashback(Request $request): iterable
    {
        return $this->resolveSectionPayload('cashback');
    }

    private function resolveSectionPayload(string $section): iterable
    {
        $this->sectionConfig = self::SECTIONS[$section] ?? self::SECTIONS['settings'];

        return $this->buildPayload($section);
    }

    private function buildPayload(string $section): iterable
    {
        return [
            'commissionSection' => [
                ...$this->sectionConfig,
                'key' => $section,
            ],
            'commissionSettings' => PoolprojectSettingsStore::readCommissionSettings(),
            'matrixSettings' => PoolprojectSettingsStore::readMatrixSettings(),
            'commissionNav' => self::commissionNav($section),
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
