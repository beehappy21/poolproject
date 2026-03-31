<?php

namespace App\Orchid\Screens\Commission;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Support\BaoAdminApiClient;
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
        'reentry' => [
            'title' => 'Reentry Rules',
            'routeName' => 'platform.commission.reentry',
            'eyebrow' => 'Commission Setting',
            'description' => 'กำหนดกติกา Reentry ว่าเมื่อเข้าเงื่อนไขแล้วต้องใช้ยอด Reentry เท่าไร และระบบจะจ่าย Firm กับ PV กลับเข้า flow เท่าไรทันที',
            'accent' => '#14b8a6',
            'cards' => [
                ['label' => 'ยอด Reentry', 'value' => 'CW debit', 'note' => 'ยอดที่ระบบใช้ตัดเมื่อเข้าเงื่อนไข reentry'],
                ['label' => 'Firm ที่ได้', 'value' => 'Immediate credit', 'note' => 'จ่าย Firm wallet ทันทีเมื่อผ่านกติกา'],
                ['label' => 'PV ที่ได้', 'value' => 'Immediate credit', 'note' => 'ใช้เป็น PV ของ event reentry ทันทีเมื่อผ่านกติกา'],
            ],
            'bullets' => [
                'ใช้หน้านี้กำหนดค่า reentry แยกจาก matrix board shape และอัตราจ่ายแต่ละชั้น',
                'เมื่อถึงกติกา reentry ระบบจะตัดยอด reentry แล้วจ่าย Firm และ PV ตามค่าที่ตั้งไว้ทันที',
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
        'manual-payment' => [
            'title' => 'Manual Payment',
            'routeName' => 'platform.commission.manualPayment',
            'eyebrow' => 'Payment Settings',
            'description' => 'ตั้งค่าบัญชีรับเงิน, PromptPay, QR, และข้อความแนะนำที่ลูกค้าจะเห็นใน Order History ตอนรอชำระเงิน.',
            'accent' => '#0f766e',
            'cards' => [
                ['label' => 'ช่องทางหลัก', 'value' => 'Bank Transfer / PromptPay', 'note' => 'ใช้กับออเดอร์ที่รอชำระและรอส่งสลิป'],
                ['label' => 'QR Payment', 'value' => 'รองรับ URL รูปภาพ', 'note' => 'ใส่ลิงก์ภาพ QR เพื่อให้ลูกค้าเปิดจากหน้าออเดอร์ได้'],
                ['label' => 'ข้อความแนะนำ', 'value' => 'จัดการจากหน้าจอนี้', 'note' => 'บอกยอดที่ต้องโอน วิธีส่งสลิป และเงื่อนไขเพิ่มเติม'],
            ],
            'bullets' => [
                'ใช้หน้านี้เป็นจุดแก้หลักของข้อมูลรับเงินสำหรับ Stephub admin บนพอร์ต 8001',
                'ข้อมูลที่บันทึกจะถูกอ่านจาก runtime/manual-payment-settings.json และหน้าแอปลูกค้าจะดึงไปแสดงต่อ',
            ],
        ],
        'line-status' => [
            'title' => 'LINE Status',
            'routeName' => 'platform.line.status',
            'eyebrow' => 'LINE Operations',
            'description' => 'เช็กความพร้อมของ LINE login, callback, LIFF, และ feed หลังบ้านจาก BAO ตัวจริงโดยตรง ก่อนเปิดให้สมาชิกใช้งาน.',
            'accent' => '#16a34a',
            'cards' => [
                ['label' => 'จุดตรวจหลัก', 'value' => 'Runtime readiness', 'note' => 'ดู env, route, และ verification ว่าพร้อมจริงหรือไม่'],
                ['label' => 'หลังบ้าน LINE', 'value' => 'Binding feed', 'note' => 'เช็กว่า admin feed อ่านข้อมูล binding ได้หรือยัง'],
                ['label' => 'ใช้ก่อนปล่อยงาน', 'value' => 'Operator check', 'note' => 'ให้ทีมใช้ตรวจจุดสำคัญก่อนทดสอบกับสมาชิกจริง'],
            ],
            'bullets' => [
                'ใช้หน้านี้เพื่อตรวจสถานะ LINE โดยเฉพาะ ไม่ปนกับการตั้งค่าข้อความแชร์',
                'ถ้าสถานะยังไม่พร้อม ให้แก้ env หรือ route ก่อนค่อยทดสอบ flow สมาชิก',
            ],
        ],
        'signup-share' => [
            'title' => 'Signup Share',
            'routeName' => 'platform.commission.signupShare',
            'eyebrow' => 'Member Signup',
            'description' => 'ตั้งค่าข้อความแชร์ที่ใช้ใน popup หลังสมัครสมาชิก โดยข้อมูลรหัสสมาชิกและพาสเวิร์ดจะถูกเติมให้อัตโนมัติและแก้จากหน้านี้ไม่ได้.',
            'accent' => '#2563eb',
            'cards' => [
                ['label' => 'ข้อความที่แก้ได้', 'value' => 'Share message', 'note' => 'ใช้เป็นข้อความนำก่อนข้อมูลสมาชิก'],
                ['label' => 'ข้อมูลตายตัว', 'value' => 'Member code / Password', 'note' => 'ระบบเติมอัตโนมัติใน popup และข้อความแชร์'],
                ['label' => 'Use case', 'value' => 'Save or send', 'note' => 'ให้สมาชิกแชร์ข้อมูลไปเก็บไว้หรือส่งต่อช่องทางส่วนตัว'],
            ],
            'bullets' => [
                'ข้อความในส่วนนี้ใช้สำหรับปุ่มแชร์จาก popup หลังสมัครสมาชิกสำเร็จ',
                'รหัสสมาชิกและพาสเวิร์ดถูกล็อกเป็นข้อมูลจากระบบจริง ไม่อนุญาตให้แก้ผ่าน BAO',
            ],
        ],
    ];

    private array $sectionConfig = self::SECTIONS['settings'];

    public function screenBaseView(): string
    {
        return 'orchid.no-form-screen';
    }

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

    public function settings()
    {
        return $this->renderSectionScreen('settings');
    }

    public function direct()
    {
        return $this->renderSectionScreen('direct');
    }

    public function unilevel()
    {
        return $this->renderSectionScreen('unilevel');
    }

    public function matrix()
    {
        return $this->renderSectionScreen('matrix');
    }

    public function pool()
    {
        return $this->renderSectionScreen('pool');
    }

    public function reentry()
    {
        return $this->renderSectionScreen('reentry');
    }

    public function cashback()
    {
        return $this->renderSectionScreen('cashback');
    }

    public function manualPayment()
    {
        return $this->renderSectionScreen('manual-payment');
    }

    public function signupShare()
    {
        return $this->renderSectionScreen('signup-share');
    }

    private function renderSectionScreen(string $section)
    {
        $this->sectionConfig = self::SECTIONS[$section] ?? self::SECTIONS['settings'];

        return $this->view($this->buildPayload($section));
    }

    private function buildPayload(string $section): iterable
    {
        $signupShareSettings = PoolprojectSettingsStore::readSignupShareSettings();

        return [
            'commissionSection' => [
                ...$this->sectionConfig,
                'key' => $section,
            ],
            'commissionSettings' => PoolprojectSettingsStore::readCommissionSettings(),
            'matrixSettings' => PoolprojectSettingsStore::readMatrixSettings(),
            'manualPaymentSettings' => PoolprojectSettingsStore::readManualPaymentSettings(),
            'signupShareSettings' => $signupShareSettings,
            'lineStatus' => in_array($section, ['signup-share', 'line-status'], true)
                ? $this->resolveLineStatus($signupShareSettings)
                : null,
            'commissionNav' => self::commissionNav($section),
        ];
    }

    /**
     * @param  array<string, mixed>  $signupShareSettings
     * @return array<string, mixed>
     */
    private function resolveLineStatus(array $signupShareSettings): array
    {
        $apiBaseUrl = rtrim(
            (string) (env('API_BASE_URL')
                ?: env('APP_API_URL')
                ?: 'http://127.0.0.1:3000'),
            '/'
        );
        $lineLiffId = trim((string) env('LINE_LIFF_ID', ''));
        $lineCallbackUrl = trim((string) env('LINE_LOGIN_CALLBACK_URL', ''));
        $lineLiffSignInUrl = trim((string) env('LINE_LIFF_SIGNIN_URL', ''));
        $strictVerificationRaw = env('LINE_STRICT_VERIFY');
        $strictVerificationEnabled =
            filter_var($strictVerificationRaw, FILTER_VALIDATE_BOOLEAN) || app()->environment('production');

        $status = [
            'checkedAt' => now()->toIso8601String(),
            'apiBaseUrl' => $apiBaseUrl,
            'items' => [
                [
                    'key' => 'liff-id',
                    'title' => 'LIFF ID configured',
                    'tone' => $lineLiffId !== '' ? 'success' : 'danger',
                    'detail' => $lineLiffId !== ''
                        ? 'Configured as '.$lineLiffId
                        : 'Missing LINE_LIFF_ID in BAO/runtime env',
                    'meta' => null,
                ],
                [
                    'key' => 'callback-url',
                    'title' => 'LINE callback configured',
                    'tone' => $lineCallbackUrl !== '' ? 'success' : 'danger',
                    'detail' => $lineCallbackUrl !== ''
                        ? $lineCallbackUrl
                        : 'Missing LINE_LOGIN_CALLBACK_URL',
                    'meta' => null,
                ],
                [
                    'key' => 'liff-signin-url',
                    'title' => 'LIFF sign-in URL configured',
                    'tone' => $lineLiffSignInUrl !== '' ? 'success' : 'danger',
                    'detail' => $lineLiffSignInUrl !== ''
                        ? $lineLiffSignInUrl
                        : 'Missing LINE_LIFF_SIGNIN_URL',
                    'meta' => null,
                ],
                [
                    'key' => 'line-login-route',
                    'title' => 'LINE login route',
                    'tone' => 'warning',
                    'detail' => 'Checking /auth/line-login...',
                    'meta' => null,
                ],
                [
                    'key' => 'signup-share',
                    'title' => 'Signup share message',
                    'tone' => 'warning',
                    'detail' => 'Checking signup share copy...',
                    'meta' => null,
                ],
                [
                    'key' => 'admin-bindings',
                    'title' => 'Admin binding feed',
                    'tone' => 'warning',
                    'detail' => 'Checking /auth/line-bindings...',
                    'meta' => null,
                ],
                [
                    'key' => 'source-mix',
                    'title' => 'Latest source mix',
                    'tone' => 'warning',
                    'detail' => 'Waiting for binding source summary...',
                    'meta' => null,
                ],
                [
                    'key' => 'strict-verify',
                    'title' => 'Strict verification',
                    'tone' => $strictVerificationEnabled ? 'success' : 'warning',
                    'detail' => $strictVerificationEnabled
                        ? 'Enabled'
                        : 'Disabled. UAT/production should keep LINE_STRICT_VERIFY=true',
                    'meta' => null,
                ],
            ],
        ];

        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->baseUrl($apiBaseUrl)
                ->withHeaders([
                    'X-Requested-By' => 'bao-line-status-probe',
                ])
                ->post('/auth/line-login', [
                    'lineUserId' => '__bao_probe__',
                ]);

            $message = (string) (
                $response->json('message')
                ?? $response->json('error')
                ?? trim((string) $response->body())
            );

            if (in_array($response->status(), [400, 401], true)) {
                $status['items'][3] = [
                    'key' => 'line-login-route',
                    'title' => 'LINE login route',
                    'tone' => 'success',
                    'detail' => 'Route is live and responding.',
                    'meta' => $message !== '' ? 'Current response: '.$message : 'Current response: HTTP '.$response->status(),
                ];
            } else {
                $status['items'][3] = [
                    'key' => 'line-login-route',
                    'title' => 'LINE login route',
                    'tone' => 'danger',
                    'detail' => 'Unexpected response from /auth/line-login.',
                    'meta' => ($message !== '' ? $message : 'No message returned').' (HTTP '.$response->status().')',
                ];
            }
        } catch (\Throwable $exception) {
            $status['items'][3] = [
                'key' => 'line-login-route',
                'title' => 'LINE login route',
                'tone' => 'danger',
                'detail' => 'Unable to probe /auth/line-login.',
                'meta' => $exception->getMessage(),
            ];
        }

        $shareMessage = trim((string) ($signupShareSettings['shareMessage'] ?? ''));
        $status['items'][4] = $shareMessage !== ''
            ? [
                'key' => 'signup-share',
                'title' => 'Signup share message',
                'tone' => 'success',
                'detail' => 'Share message is ready for member popup and LINE share flow.',
                'meta' => strlen($shareMessage).' characters configured',
            ]
            : [
                'key' => 'signup-share',
                'title' => 'Signup share message',
                'tone' => 'warning',
                'detail' => 'Share message is empty.',
                'meta' => 'Review this copy before go-live so invite and post-signup guidance do not feel blank.',
            ];

        try {
            /** @var BaoAdminApiClient $apiClient */
            $apiClient = app(BaoAdminApiClient::class);
            $payload = $apiClient->request('GET', '/auth/line-bindings');
            $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            $total = is_numeric($payload['total'] ?? null) ? (int) $payload['total'] : count($items);

            $status['items'][5] = $total > 0
                ? [
                    'key' => 'admin-bindings',
                    'title' => 'Admin binding feed',
                    'tone' => 'success',
                    'detail' => 'Admin can load LINE binding records from the live API.',
                    'meta' => $total.' binding record(s) available for review',
                ]
                : [
                    'key' => 'admin-bindings',
                    'title' => 'Admin binding feed',
                    'tone' => 'warning',
                    'detail' => 'Admin feed is live but there are no LINE bindings yet.',
                    'meta' => 'This can be valid on a fresh environment, but there is nothing to audit right now.',
                ];

            $sourceCounts = [];
            $latestSyncedAt = null;
            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $source = trim((string) ($item['source'] ?? 'unknown'));
                if ($source === '') {
                    $source = 'unknown';
                }
                $sourceCounts[$source] = ($sourceCounts[$source] ?? 0) + 1;

                $candidateSync = trim((string) ($item['lastSyncedAt'] ?? ''));
                if ($candidateSync !== '' && ($latestSyncedAt === null || strcmp($candidateSync, $latestSyncedAt) > 0)) {
                    $latestSyncedAt = $candidateSync;
                }
            }

            arsort($sourceCounts);
            $sourceSummary = collect($sourceCounts)
                ->take(3)
                ->map(fn (int $count, string $source) => $source.': '.$count)
                ->implode(', ');

            $status['items'][6] = $sourceSummary !== ''
                ? [
                    'key' => 'source-mix',
                    'title' => 'Latest source mix',
                    'tone' => 'success',
                    'detail' => $sourceSummary,
                    'meta' => $latestSyncedAt ? 'Latest sync: '.$latestSyncedAt : 'Latest sync timestamp not available',
                ]
                : [
                    'key' => 'source-mix',
                    'title' => 'Latest source mix',
                    'tone' => 'warning',
                    'detail' => 'No source mix available until LINE bindings start syncing.',
                    'meta' => null,
                ];
        } catch (\Throwable $exception) {
            $status['items'][5] = [
                'key' => 'admin-bindings',
                'title' => 'Admin binding feed',
                'tone' => 'danger',
                'detail' => 'Unable to load LINE bindings from the API.',
                'meta' => $exception->getMessage(),
            ];
            $status['items'][6] = [
                'key' => 'source-mix',
                'title' => 'Latest source mix',
                'tone' => 'danger',
                'detail' => 'Source summary is unavailable because binding data could not be loaded.',
                'meta' => null,
            ];
        }

        return $status;
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
