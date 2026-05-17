<?php

namespace App\Http\Controllers\Platform;

use App\Support\PoolprojectSettingsStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class CommissionSettingsController extends Controller
{
    public function saveCommission(Request $request): RedirectResponse
    {
        $current = PoolprojectSettingsStore::readCommissionSettings();

        $request->merge([
            'directLevelRates' => $request->input('directLevelRates', $request->input('direct_level_rates')),
            'uniLevelRates' => $request->input('uniLevelRates', $request->input('uni_level_rates')),
            'matchingLevelRates' => $request->input('matchingLevelRates', $request->input('matching_level_rates')),
            'teamTwoLegRate' => $request->input('teamTwoLegRate', $request->input('team_two_leg_rate')),
            'teamThreeLegRate' => $request->input('teamThreeLegRate', $request->input('team_three_leg_rate')),
            'dailyCommissionCapAmount' => $request->input('dailyCommissionCapAmount', $request->input('daily_commission_cap_amount')),
            'buybackThresholdAmount' => $request->input('buybackThresholdAmount', $request->input('buyback_threshold_amount')),
            'buybackRepurchaseAmount' => $request->input('buybackRepurchaseAmount', $request->input('buyback_repurchase_amount')),
            'buybackGraceDays' => $request->input('buybackGraceDays', $request->input('buyback_grace_days')),
            'poolMinActivePackageBuyerDirects' => $request->input(
                'poolMinActivePackageBuyerDirects',
                $request->input('pool_min_active_package_buyer_directs', $request->input('poolMinActiveDirects'))
            ),
            'poolMaxEntitlementShareRate' => $request->input(
                'poolMaxEntitlementShareRate',
                $request->input('pool_max_entitlement_share_rate', $request->input('poolMaxShareRatePerEntitlement'))
            ),
            'poolRate' => $request->input('poolRate', $request->input('pool_rate')),
            'cashbackRate' => $request->input('cashbackRate', $request->input('cashback_rate')),
            'cashbackVisible' => $this->resolveVisibilityInput(
                $request,
                'cashbackVisible',
                $current['appVisibility']['cashback'] ?? false
            ),
            'directVisible' => $this->resolveVisibilityInput(
                $request,
                'directVisible',
                $current['appVisibility']['direct'] ?? true
            ),
            'matchingVisible' => $this->resolveVisibilityInput(
                $request,
                'matchingVisible',
                $current['appVisibility']['matching'] ?? true
            ),
            'teamVisible' => $this->resolveVisibilityInput(
                $request,
                'teamVisible',
                $current['appVisibility']['team'] ?? true
            ),
            'unilevelVisible' => $this->resolveVisibilityInput(
                $request,
                'unilevelVisible',
                $current['appVisibility']['unilevel'] ?? false
            ),
            'matrixVisible' => $this->resolveVisibilityInput(
                $request,
                'matrixVisible',
                $current['appVisibility']['matrix'] ?? false
            ),
            'poolVisible' => $this->resolveVisibilityInput(
                $request,
                'poolVisible',
                $current['appVisibility']['pool'] ?? true
            ),
            'redirectSection' => $request->input('redirectSection', $request->input('redirect_section')),
        ]);

        $payload = $request->validate([
            'directLevelRates' => ['nullable', 'array'],
            'directLevelRates.*' => ['nullable', 'string'],
            'uniLevelRates' => ['nullable', 'array'],
            'uniLevelRates.*' => ['nullable', 'string'],
            'matchingLevelRates' => ['nullable', 'array'],
            'matchingLevelRates.*' => ['nullable', 'string'],
            'teamTwoLegRate' => ['nullable', 'string'],
            'teamThreeLegRate' => ['nullable', 'string'],
            'dailyCommissionCapAmount' => ['nullable', 'string'],
            'buybackThresholdAmount' => ['nullable', 'string'],
            'buybackRepurchaseAmount' => ['nullable', 'string'],
            'buybackGraceDays' => ['nullable', 'integer', 'min:1'],
            'poolMinActivePackageBuyerDirects' => ['nullable', 'integer', 'min:1'],
            'poolMaxEntitlementShareRate' => ['nullable', 'string'],
            'poolRate' => ['nullable', 'string'],
            'cashbackRate' => ['nullable', 'string'],
            'cashbackVisible' => ['nullable', 'boolean'],
            'directVisible' => ['nullable', 'boolean'],
            'matchingVisible' => ['nullable', 'boolean'],
            'teamVisible' => ['nullable', 'boolean'],
            'unilevelVisible' => ['nullable', 'boolean'],
            'matrixVisible' => ['nullable', 'boolean'],
            'poolVisible' => ['nullable', 'boolean'],
            'redirectSection' => ['nullable', 'string'],
        ]);

        $next = [
            'directLevelRates' => $this->cleanRates($payload['directLevelRates'] ?? $current['directLevelRates']),
            'uniLevelRates' => $this->cleanRates($payload['uniLevelRates'] ?? $current['uniLevelRates']),
            'matchingLevelRates' => $this->cleanRates($payload['matchingLevelRates'] ?? ($current['matchingLevelRates'] ?? ['0.05', '0.05'])),
            'teamTwoLegRate' => $this->cleanSingleRate($payload['teamTwoLegRate'] ?? ($current['teamTwoLegRate'] ?? '0.3')),
            'teamThreeLegRate' => $this->cleanSingleRate($payload['teamThreeLegRate'] ?? ($current['teamThreeLegRate'] ?? '0.5')),
            'dailyCommissionCapAmount' => $this->cleanSingleRate($payload['dailyCommissionCapAmount'] ?? ($current['dailyCommissionCapAmount'] ?? '3000')),
            'buybackThresholdAmount' => $this->cleanSingleRate($payload['buybackThresholdAmount'] ?? ($current['buybackThresholdAmount'] ?? '10000')),
            'buybackRepurchaseAmount' => $this->cleanSingleRate($payload['buybackRepurchaseAmount'] ?? ($current['buybackRepurchaseAmount'] ?? '1000')),
            'buybackGraceDays' => max(1, (int) ($payload['buybackGraceDays'] ?? ($current['buybackGraceDays'] ?? 3))),
            'poolMinActivePackageBuyerDirects' => max(1, (int) ($payload['poolMinActivePackageBuyerDirects'] ?? ($current['poolMinActivePackageBuyerDirects'] ?? 3))),
            'poolMaxEntitlementShareRate' => $this->cleanSingleRate($payload['poolMaxEntitlementShareRate'] ?? ($current['poolMaxEntitlementShareRate'] ?? '0.03')),
            'poolRate' => $this->cleanSingleRate($payload['poolRate'] ?? $current['poolRate']),
            'cashbackRate' => $this->cleanSingleRate($payload['cashbackRate'] ?? $current['cashbackRate'] ?? '0'),
            'appVisibility' => [
                'cashback' => (bool) ($payload['cashbackVisible'] ?? ($current['appVisibility']['cashback'] ?? false)),
                'direct' => (bool) ($payload['directVisible'] ?? ($current['appVisibility']['direct'] ?? true)),
                'matching' => (bool) ($payload['matchingVisible'] ?? ($current['appVisibility']['matching'] ?? true)),
                'team' => (bool) ($payload['teamVisible'] ?? ($current['appVisibility']['team'] ?? true)),
                'unilevel' => (bool) ($payload['unilevelVisible'] ?? ($current['appVisibility']['unilevel'] ?? false)),
                'matrix' => (bool) ($payload['matrixVisible'] ?? ($current['appVisibility']['matrix'] ?? false)),
                'pool' => (bool) ($payload['poolVisible'] ?? ($current['appVisibility']['pool'] ?? true)),
            ],
        ];

        PoolprojectSettingsStore::writeCommissionSettings($next);

        return redirect()
            ->route($this->redirectRouteName((string) ($payload['redirectSection'] ?? 'settings')))
            ->with('status', 'Commission settings updated.');
    }

    private function resolveVisibilityInput(Request $request, string $key, bool $fallback): bool
    {
        if (! $request->exists($key)) {
            return $fallback;
        }

        $raw = $request->input($key);

        if (is_array($raw)) {
            $raw = end($raw);
        }

        return filter_var($raw, FILTER_VALIDATE_BOOLEAN);
    }

    public function saveMatrix(Request $request): RedirectResponse
    {
        $request->merge([
            'organizationPvRate' => $request->input('organizationPvRate', $request->input('organization_pv_rate')),
            'autoOrderAmount' => $request->input('autoOrderAmount', $request->input('auto_order_amount', $request->input('cwReentryAmount', $request->input('cw_reentry_amount')))),
            'autoOrderFirmAmount' => $request->input('autoOrderFirmAmount', $request->input('auto_order_firm_amount', $request->input('reentryFirmAmount', $request->input('reentry_firm_amount')))),
            'autoOrderPvAmount' => $request->input('autoOrderPvAmount', $request->input('auto_order_pv_amount', $request->input('reentryPvAmount', $request->input('reentry_pv_amount')))),
            'cwReentryAmount' => $request->input('cwReentryAmount', $request->input('cw_reentry_amount')),
            'reentryFirmAmount' => $request->input('reentryFirmAmount', $request->input('reentry_firm_amount')),
            'reentryPvAmount' => $request->input('reentryPvAmount', $request->input('reentry_pv_amount')),
            'boardWidth' => $request->input('boardWidth', $request->input('board_width')),
            'levelRates' => $request->input('levelRates', $request->input('level_rates')),
            'boardLevelRates' => $request->input('boardLevelRates', $request->input('board_level_rates')),
            'boardOpenPvThresholds' => $request->input('boardOpenPvThresholds', $request->input('board_open_pv_thresholds')),
            'redirectSection' => $request->input('redirectSection', $request->input('redirect_section')),
        ]);

        $payload = $request->validate([
            'organizationPvRate' => ['nullable', 'string'],
            'autoOrderAmount' => ['nullable', 'string'],
            'autoOrderFirmAmount' => ['nullable', 'string'],
            'autoOrderPvAmount' => ['nullable', 'string'],
            'cwReentryAmount' => ['nullable', 'string'],
            'reentryFirmAmount' => ['nullable', 'string'],
            'reentryPvAmount' => ['nullable', 'string'],
            'boardWidth' => ['nullable', 'integer', 'min:1'],
            'levelRates' => ['nullable', 'array'],
            'levelRates.*' => ['nullable', 'string'],
            'boardLevelRates' => ['nullable', 'array'],
            'boardLevelRates.*' => ['nullable', 'array'],
            'boardLevelRates.*.*' => ['nullable', 'string'],
            'boardOpenPvThresholds' => ['nullable', 'array'],
            'boardOpenPvThresholds.*' => ['nullable', 'string'],
            'redirectSection' => ['nullable', 'string'],
        ]);

        $current = PoolprojectSettingsStore::readMatrixSettings();
        $boardThresholds = $this->cleanRates($payload['boardOpenPvThresholds'] ?? ($current['boardOpenPvThresholds'] ?? ['0']));
        $fallbackLevelRates = $this->resolveMatrixFallbackLevelRates(
            $payload['levelRates'] ?? ($current['levelRates'] ?? null),
            $payload['boardLevelRates'] ?? ($current['boardLevelRates'] ?? [])
        );
        $boardLevelRates = $this->cleanBoardLevelRates(
            $payload['boardLevelRates'] ?? ($current['boardLevelRates'] ?? []),
            $fallbackLevelRates,
            count($boardThresholds)
        );
        $levelRates = $boardLevelRates[0] ?? $fallbackLevelRates;

        PoolprojectSettingsStore::writeMatrixSettings([
            'boardWidth' => (int) ($payload['boardWidth'] ?? $current['boardWidth']),
            'boardDepth' => count($levelRates),
            'boardCount' => count($boardThresholds),
            'organizationPvRate' => $this->cleanSingleRate($payload['organizationPvRate'] ?? $current['organizationPvRate']),
            'autoOrderAmount' => $this->cleanSingleRate($payload['autoOrderAmount'] ?? ($current['autoOrderAmount'] ?? $current['cwReentryAmount'])),
            'autoOrderFirmAmount' => '0',
            'autoOrderPvAmount' => $this->cleanSingleRate($payload['autoOrderPvAmount'] ?? ($current['autoOrderPvAmount'] ?? ($current['reentryPvAmount'] ?? $current['organizationPvRate']))),
            'cwReentryAmount' => $this->cleanSingleRate($payload['cwReentryAmount'] ?? $current['cwReentryAmount']),
            'reentryFirmAmount' => '0',
            'reentryPvAmount' => $this->cleanSingleRate($payload['reentryPvAmount'] ?? ($current['reentryPvAmount'] ?? $current['organizationPvRate'])),
            'levelRates' => $levelRates,
            'boardLevelRates' => $boardLevelRates,
            'boardOpenPvThresholds' => $boardThresholds,
        ]);

        return redirect()
            ->route($this->redirectRouteName((string) ($payload['redirectSection'] ?? 'matrix')))
            ->with('status', 'Matrix settings updated.');
    }

    public function saveManualPayment(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'accountName' => ['nullable', 'string'],
            'bankName' => ['nullable', 'string'],
            'accountNumber' => ['nullable', 'string'],
            'promptPayName' => ['nullable', 'string'],
            'promptPayNumber' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'qrImageFile' => ['nullable', 'image', 'max:4096'],
        ]);

        $current = PoolprojectSettingsStore::readManualPaymentSettings();
        $qrImageUrl = trim((string) ($current['qrImageUrl'] ?? ''));

        if ($request->hasFile('qrImageFile')) {
            $file = $request->file('qrImageFile');
            $extension = strtolower((string) $file->getClientOriginalExtension());
            if ($extension === '') {
                $extension = 'png';
            }

            $directory = public_path('manual-payments');
            if (!is_dir($directory)) {
                mkdir($directory, 0777, true);
            }

            $fileName = 'qr-' . Str::uuid()->toString() . '.' . $extension;
            $file->move($directory, $fileName);
            $qrImageUrl = rtrim((string) config('app.url'), '/') . '/manual-payments/' . $fileName;
        }

        PoolprojectSettingsStore::writeManualPaymentSettings([
            'accountName' => trim((string) ($payload['accountName'] ?? $current['accountName'])),
            'bankName' => trim((string) ($payload['bankName'] ?? $current['bankName'])),
            'accountNumber' => trim((string) ($payload['accountNumber'] ?? $current['accountNumber'])),
            'promptPayName' => trim((string) ($payload['promptPayName'] ?? $current['promptPayName'])),
            'promptPayNumber' => trim((string) ($payload['promptPayNumber'] ?? $current['promptPayNumber'])),
            'qrImageUrl' => $qrImageUrl,
            'note' => trim((string) ($payload['note'] ?? $current['note'])),
        ]);

        return redirect()
            ->route('platform.commission.manualPayment')
            ->with('status', 'Manual payment settings updated.');
    }

    public function saveSignupShare(Request $request): RedirectResponse
    {
        $request->merge([
            'shareLinkMessage' => $request->input('shareLinkMessage', $request->input('share_link_message')),
            'signupSuccessMessage' => $request->input('signupSuccessMessage', $request->input('signup_success_message')),
            'redirectSection' => $request->input('redirectSection', $request->input('redirect_section')),
        ]);

        $payload = $request->validate([
            'shareLinkMessage' => ['nullable', 'string', 'max:2000'],
            'signupSuccessMessage' => ['nullable', 'string', 'max:2000'],
            'redirectSection' => ['nullable', 'string'],
        ]);

        $current = PoolprojectSettingsStore::readSignupShareSettings();

        PoolprojectSettingsStore::writeSignupShareSettings([
            'shareLinkMessage' => trim((string) ($payload['shareLinkMessage'] ?? $current['shareLinkMessage'] ?? '')),
            'signupSuccessMessage' => trim((string) ($payload['signupSuccessMessage'] ?? $current['signupSuccessMessage'] ?? '')),
        ]);

        return redirect()
            ->route($this->redirectRouteName((string) ($payload['redirectSection'] ?? 'signup-share')))
            ->with('status', 'Signup share settings updated.');
    }

    private function cleanRates(array $values): array
    {
        $normalized = array_values(array_filter(array_map(
            static fn ($value) => is_string($value) ? trim($value) : null,
            $values
        ), static fn (?string $value) => $value !== null && preg_match('/^\d+(\.\d+)?$/', $value)));

        return $normalized !== [] ? $normalized : ['0'];
    }

    private function cleanSingleRate(mixed $value): string
    {
        $value = is_string($value) ? trim($value) : '';

        return preg_match('/^\d+(\.\d+)?$/', $value) ? $value : '0';
    }

    private function cleanBoardLevelRates(array $boards, array $fallbackLevelRates, int $boardCount): array
    {
        $normalized = [];

        foreach (range(0, max($boardCount - 1, 0)) as $index) {
            $boardRates = $boards[$index] ?? $fallbackLevelRates;
            $normalized[] = $this->cleanRates(is_array($boardRates) ? $boardRates : $fallbackLevelRates);
        }

        return $normalized;
    }

    private function resolveMatrixFallbackLevelRates(mixed $levelRates, array $boardLevelRates): array
    {
        if (is_array($levelRates) && $levelRates !== []) {
            return $this->cleanRates($levelRates);
        }

        if (isset($boardLevelRates[0]) && is_array($boardLevelRates[0])) {
            return $this->cleanRates($boardLevelRates[0]);
        }

        return ['0'];
    }

    private function redirectRouteName(string $section): string
    {
        return match ($section) {
            'manual-payment' => 'platform.commission.manualPayment',
            'signup-share' => 'platform.commission.signupShare',
            default => 'platform.commission.report',
        };
    }
}
