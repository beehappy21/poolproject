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
        $payload = $request->validate([
            'organizationPvRate' => ['required', 'string'],
            'levelRates' => ['required', 'array'],
            'levelRates.*' => ['required', 'string'],
            'boardOpenPvThresholds' => ['required', 'array'],
            'boardOpenPvThresholds.*' => ['required', 'string'],
        ]);

        $current = PoolprojectSettingsStore::readMatrixSettings();

        PoolprojectSettingsStore::writeMatrixSettings([
            'boardWidth' => $current['boardWidth'],
            'boardDepth' => $current['boardDepth'],
            'boardCount' => $current['boardCount'],
            'organizationPvRate' => $this->cleanSingleRate($payload['organizationPvRate']),
            'levelRates' => $this->cleanRates($payload['levelRates']),
            'boardOpenPvThresholds' => $this->cleanRates($payload['boardOpenPvThresholds']),
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
