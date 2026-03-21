<?php

namespace App\Support;

class PoolprojectSettingsStore
{
    private const DEFAULT_COMMISSION_SETTINGS = [
        'directLevelRates' => ['0.2'],
        'uniLevelRates' => ['0.05', '0.05', '0.05', '0.05', '0.05'],
        'poolRate' => '0.5',
    ];

    private const DEFAULT_MATRIX_SETTINGS = [
        'boardWidth' => 2,
        'boardDepth' => 3,
        'boardCount' => 3,
        'organizationPvRate' => '0.1',
        'levelRates' => ['0.1', '0.05', '0.03'],
        'boardOpenPvThresholds' => ['100', '100', '100'],
    ];

    public static function readCommissionSettings(): array
    {
        return self::normalizeCommissionSettings(self::readJsonFile(self::commissionSettingsPath()));
    }

    public static function writeCommissionSettings(array $input): array
    {
        $normalized = self::normalizeCommissionSettings($input);
        self::writeJsonFile(self::commissionSettingsPath(), $normalized);

        return $normalized;
    }

    public static function readMatrixSettings(): array
    {
        return self::normalizeMatrixSettings(self::readJsonFile(self::matrixSettingsPath()));
    }

    public static function writeMatrixSettings(array $input): array
    {
        $normalized = self::normalizeMatrixSettings($input);
        self::writeJsonFile(self::matrixSettingsPath(), $normalized);

        return $normalized;
    }

    private static function commissionSettingsPath(): string
    {
        return self::runtimeRoot() . DIRECTORY_SEPARATOR . 'commission-settings.json';
    }

    private static function matrixSettingsPath(): string
    {
        return self::runtimeRoot() . DIRECTORY_SEPARATOR . 'matrix-settings.json';
    }

    private static function runtimeRoot(): string
    {
        return dirname(base_path(), 2) . DIRECTORY_SEPARATOR . 'runtime';
    }

    private static function readJsonFile(string $path): array
    {
        if (!is_file($path)) {
            return [];
        }

        $raw = file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    private static function writeJsonFile(string $path, array $payload): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        file_put_contents($path, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
    }

    private static function normalizeCommissionSettings(array $input): array
    {
        $direct = self::normalizeDecimalArray($input['directLevelRates'] ?? null, self::DEFAULT_COMMISSION_SETTINGS['directLevelRates']);
        $uni = self::normalizeDecimalArray($input['uniLevelRates'] ?? null, self::DEFAULT_COMMISSION_SETTINGS['uniLevelRates']);
        $poolRate = self::normalizeDecimalString($input['poolRate'] ?? null, self::DEFAULT_COMMISSION_SETTINGS['poolRate']);

        return [
            'directLevelRates' => $direct,
            'uniLevelRates' => $uni,
            'poolRate' => $poolRate,
        ];
    }

    private static function normalizeMatrixSettings(array $input): array
    {
        $boardWidth = self::normalizePositiveInt($input['boardWidth'] ?? null, self::DEFAULT_MATRIX_SETTINGS['boardWidth']);
        $boardDepth = self::normalizePositiveInt($input['boardDepth'] ?? null, self::DEFAULT_MATRIX_SETTINGS['boardDepth']);
        $boardCount = self::normalizePositiveInt($input['boardCount'] ?? null, self::DEFAULT_MATRIX_SETTINGS['boardCount']);

        return [
            'boardWidth' => $boardWidth,
            'boardDepth' => $boardDepth,
            'boardCount' => $boardCount,
            'organizationPvRate' => self::normalizeDecimalString(
                $input['organizationPvRate'] ?? null,
                self::DEFAULT_MATRIX_SETTINGS['organizationPvRate']
            ),
            'levelRates' => self::normalizeDecimalArray(
                $input['levelRates'] ?? null,
                self::DEFAULT_MATRIX_SETTINGS['levelRates'],
                $boardDepth
            ),
            'boardOpenPvThresholds' => self::normalizeDecimalArray(
                $input['boardOpenPvThresholds'] ?? null,
                self::DEFAULT_MATRIX_SETTINGS['boardOpenPvThresholds'],
                $boardCount
            ),
        ];
    }

    private static function normalizeDecimalArray(mixed $value, array $fallback, ?int $expectedLength = null): array
    {
        if (!is_array($value)) {
            return $fallback;
        }

        $normalized = array_values(array_filter(array_map(
            static fn ($item) => is_string($item) && preg_match('/^\d+(\.\d+)?$/', trim($item))
                ? trim($item)
                : null,
            $value
        )));

        if ($expectedLength !== null && count($normalized) !== $expectedLength) {
            return $fallback;
        }

        return $normalized !== [] ? $normalized : $fallback;
    }

    private static function normalizeDecimalString(mixed $value, string $fallback): string
    {
        return is_string($value) && preg_match('/^\d+(\.\d+)?$/', trim($value))
            ? trim($value)
            : $fallback;
    }

    private static function normalizePositiveInt(mixed $value, int $fallback): int
    {
        return is_numeric($value) && (int) $value > 0 ? (int) $value : $fallback;
    }
}
