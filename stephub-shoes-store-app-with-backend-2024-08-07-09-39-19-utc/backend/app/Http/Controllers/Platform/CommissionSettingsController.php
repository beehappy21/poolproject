<?php

namespace App\Http\Controllers\Platform;

use App\Support\PoolprojectSettingsStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CommissionSettingsController extends Controller
{
    public function saveCommission(Request $request): RedirectResponse
    {
        $request->merge([
            'directLevelRates' => $request->input('directLevelRates', $request->input('direct_level_rates')),
            'uniLevelRates' => $request->input('uniLevelRates', $request->input('uni_level_rates')),
            'poolRate' => $request->input('poolRate', $request->input('pool_rate')),
            'redirectSection' => $request->input('redirectSection', $request->input('redirect_section')),
        ]);

        $payload = $request->validate([
            'directLevelRates' => ['nullable', 'array'],
            'directLevelRates.*' => ['nullable', 'string'],
            'uniLevelRates' => ['nullable', 'array'],
            'uniLevelRates.*' => ['nullable', 'string'],
            'poolRate' => ['nullable', 'string'],
            'redirectSection' => ['nullable', 'string'],
        ]);

        $current = PoolprojectSettingsStore::readCommissionSettings();

        $next = [
            'directLevelRates' => $this->cleanRates($payload['directLevelRates'] ?? $current['directLevelRates']),
            'uniLevelRates' => $this->cleanRates($payload['uniLevelRates'] ?? $current['uniLevelRates']),
            'poolRate' => $this->cleanSingleRate($payload['poolRate'] ?? $current['poolRate']),
        ];

        PoolprojectSettingsStore::writeCommissionSettings($next);

        return redirect()
            ->route($this->redirectRouteName((string) ($payload['redirectSection'] ?? 'settings')))
            ->with('status', 'Commission settings updated.');
    }

    public function saveMatrix(Request $request): RedirectResponse
    {
        $request->merge([
            'organizationPvRate' => $request->input('organizationPvRate', $request->input('organization_pv_rate')),
            'boardWidth' => $request->input('boardWidth', $request->input('board_width')),
            'levelRates' => $request->input('levelRates', $request->input('level_rates')),
            'boardLevelRates' => $request->input('boardLevelRates', $request->input('board_level_rates')),
            'boardOpenPvThresholds' => $request->input('boardOpenPvThresholds', $request->input('board_open_pv_thresholds')),
        ]);

        $payload = $request->validate([
            'organizationPvRate' => ['required', 'string'],
            'boardWidth' => ['nullable', 'integer', 'min:1'],
            'levelRates' => ['nullable', 'array'],
            'levelRates.*' => ['nullable', 'string'],
            'boardLevelRates' => ['nullable', 'array'],
            'boardLevelRates.*' => ['nullable', 'array'],
            'boardLevelRates.*.*' => ['nullable', 'string'],
            'boardOpenPvThresholds' => ['required', 'array'],
            'boardOpenPvThresholds.*' => ['required', 'string'],
        ]);

        $boardThresholds = $this->cleanRates($payload['boardOpenPvThresholds']);
        $fallbackLevelRates = $this->resolveMatrixFallbackLevelRates(
            $payload['levelRates'] ?? null,
            $payload['boardLevelRates'] ?? []
        );
        $boardLevelRates = $this->cleanBoardLevelRates(
            $payload['boardLevelRates'] ?? [],
            $fallbackLevelRates,
            count($boardThresholds)
        );
        $levelRates = $boardLevelRates[0] ?? $fallbackLevelRates;

        $current = PoolprojectSettingsStore::readMatrixSettings();

        PoolprojectSettingsStore::writeMatrixSettings([
            'boardWidth' => (int) ($payload['boardWidth'] ?? $current['boardWidth']),
            'boardDepth' => count($levelRates),
            'boardCount' => count($boardThresholds),
            'organizationPvRate' => $this->cleanSingleRate($payload['organizationPvRate']),
            'levelRates' => $levelRates,
            'boardLevelRates' => $boardLevelRates,
            'boardOpenPvThresholds' => $boardThresholds,
        ]);

        return redirect()
            ->route('platform.commission.matrix')
            ->with('status', 'Matrix settings updated.');
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
            'direct' => 'platform.commission.direct',
            'unilevel' => 'platform.commission.unilevel',
            'pool' => 'platform.commission.pool',
            default => 'platform.commission.settings',
        };
    }
}
