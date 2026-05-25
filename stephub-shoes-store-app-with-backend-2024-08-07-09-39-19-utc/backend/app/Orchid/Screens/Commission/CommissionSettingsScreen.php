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

    private array $sectionConfig = self::SECTIONS['manual-payment'];

    public function screenBaseView(): string
    {
        return 'orchid.no-form-screen';
    }

    public static function commissionNav(string $activeKey, array $query = []): array
    {
        $query = array_filter($query, static fn ($value) => $value !== null && $value !== '');

        return [
            [
                'key' => 'overview',
                'title' => 'Commission Report',
                'route' => route('platform.commission.report', $query),
                'isActive' => $activeKey === 'overview',
            ],
            [
                'key' => 'direct',
                'title' => 'Direct Bonus',
                'route' => route('platform.commission.report.direct', $query),
                'isActive' => $activeKey === 'direct',
            ],
            [
                'key' => 'team',
                'title' => 'Team Bonus',
                'route' => route('platform.commission.report.team', $query),
                'isActive' => $activeKey === 'team',
            ],
            [
                'key' => 'matching',
                'title' => 'Matching Bonus',
                'route' => route('platform.commission.report.matching', $query),
                'isActive' => $activeKey === 'matching',
            ],
            [
                'key' => 'pool',
                'title' => 'Pool Bonus',
                'route' => route('platform.commission.report.pool', $query),
                'isActive' => $activeKey === 'pool',
            ],
        ];
    }

    public function query(Request $request): iterable
    {
        $section = (string) ($request->route('section') ?? 'manual-payment');
        if (!array_key_exists($section, self::SECTIONS)) {
            $section = 'manual-payment';
        }
        $this->sectionConfig = self::SECTIONS[$section];

        return $this->buildPayload($section);
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
        $this->sectionConfig = self::SECTIONS[$section] ?? self::SECTIONS['manual-payment'];

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

        $shareLinkMessage = trim((string) ($signupShareSettings['shareLinkMessage'] ?? ''));
        $signupSuccessMessage = trim((string) ($signupShareSettings['signupSuccessMessage'] ?? ''));
        $status['items'][4] = $shareLinkMessage !== '' && $signupSuccessMessage !== ''
            ? [
                'key' => 'signup-share',
                'title' => 'Signup share messages',
                'tone' => 'success',
                'detail' => 'Share link copy and post-signup copy are both configured.',
                'meta' => 'share link: '.strlen($shareLinkMessage).' chars, success popup: '.strlen($signupSuccessMessage).' chars',
            ]
            : [
                'key' => 'signup-share',
                'title' => 'Signup share messages',
                'tone' => 'warning',
                'detail' => 'One or both signup share messages are empty.',
                'meta' => 'Review both the share-link copy and the success-popup copy before go-live.',
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
