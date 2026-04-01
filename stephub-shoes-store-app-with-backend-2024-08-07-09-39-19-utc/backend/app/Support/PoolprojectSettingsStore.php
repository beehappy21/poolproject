<?php

namespace App\Support;

class PoolprojectSettingsStore
{
    private const DEFAULT_COMMISSION_SETTINGS = [
        'directLevelRates' => ['0.2'],
        'uniLevelRates' => ['0.05', '0.05', '0.05', '0.05', '0.05'],
        'poolRate' => '0.5',
        'cashbackRate' => '0',
        'appVisibility' => [
            'cashback' => true,
            'direct' => true,
            'unilevel' => true,
            'matrix' => true,
            'pool' => true,
        ],
    ];

    private const DEFAULT_MATRIX_SETTINGS = [
        'boardWidth' => 2,
        'boardDepth' => 3,
        'boardCount' => 3,
        'organizationPvRate' => '0.1',
        'cwReentryAmount' => '0.1',
        'reentryFirmAmount' => '0.1',
        'reentryPvAmount' => '0.1',
        'levelRates' => ['0.1', '0.05', '0.03'],
        'boardLevelRates' => [
            ['0.1', '0.05', '0.03'],
            ['0.1', '0.05', '0.03'],
            ['0.1', '0.05', '0.03'],
        ],
        'boardOpenPvThresholds' => ['100', '100', '100'],
    ];

    private const DEFAULT_MANUAL_PAYMENT_SETTINGS = [
        'accountName' => 'Stephub Co., Ltd.',
        'bankName' => 'Kasikornbank',
        'accountNumber' => '123-4-56789-0',
        'promptPayName' => 'Stephub Co., Ltd.',
        'promptPayNumber' => '0812345678',
        'qrImageUrl' => '',
        'note' => 'กรุณาโอนตามยอดที่แสดงในคำสั่งซื้อ และอัปโหลดสลิปเพื่อรอตรวจสอบ',
    ];

    private const DEFAULT_SIGNUP_SHARE_SETTINGS = [
        'shareLinkMessage' => 'สมัครผ่านลิงก์แนะนำนี้ได้เลย',
        'signupSuccessMessage' => 'ส่งข้อมูลนี้เก็บไว้สำหรับเข้าใช้งานครั้งแรก และเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบทันที',
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

    public static function readManualPaymentSettings(): array
    {
        return self::normalizeManualPaymentSettings(self::readJsonFile(self::manualPaymentSettingsPath()));
    }

    public static function writeManualPaymentSettings(array $input): array
    {
        $normalized = self::normalizeManualPaymentSettings($input);
        self::writeJsonFile(self::manualPaymentSettingsPath(), $normalized);

        return $normalized;
    }

    public static function readSignupShareSettings(): array
    {
        return self::normalizeSignupShareSettings(self::readJsonFile(self::signupShareSettingsPath()));
    }

    public static function writeSignupShareSettings(array $input): array
    {
        $normalized = self::normalizeSignupShareSettings($input);
        self::writeJsonFile(self::signupShareSettingsPath(), $normalized);

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

    private static function manualPaymentSettingsPath(): string
    {
        return self::runtimeRoot() . DIRECTORY_SEPARATOR . 'manual-payment-settings.json';
    }

    private static function signupShareSettingsPath(): string
    {
        return self::runtimeRoot() . DIRECTORY_SEPARATOR . 'signup-share-settings.json';
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
        $cashbackRate = self::normalizeDecimalString($input['cashbackRate'] ?? null, self::DEFAULT_COMMISSION_SETTINGS['cashbackRate']);

        return [
            'directLevelRates' => $direct,
            'uniLevelRates' => $uni,
            'poolRate' => $poolRate,
            'cashbackRate' => $cashbackRate,
            'appVisibility' => self::normalizeAppVisibility($input['appVisibility'] ?? []),
        ];
    }

    private static function normalizeAppVisibility(array $input): array
    {
        $defaults = self::DEFAULT_COMMISSION_SETTINGS['appVisibility'];

        return [
            'cashback' => self::normalizeBoolean($input['cashback'] ?? null, $defaults['cashback']),
            'direct' => self::normalizeBoolean($input['direct'] ?? null, $defaults['direct']),
            'unilevel' => self::normalizeBoolean($input['unilevel'] ?? null, $defaults['unilevel']),
            'matrix' => self::normalizeBoolean($input['matrix'] ?? null, $defaults['matrix']),
            'pool' => self::normalizeBoolean($input['pool'] ?? null, $defaults['pool']),
        ];
    }

    private static function normalizeBoolean(mixed $value, bool $fallback): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));

            if (in_array($normalized, ['true', '1', 'yes', 'on'], true)) {
                return true;
            }

            if (in_array($normalized, ['false', '0', 'no', 'off'], true)) {
                return false;
            }
        }

        if (is_int($value)) {
            return $value === 1;
        }

        return $fallback;
    }

    private static function normalizeMatrixSettings(array $input): array
    {
        $boardWidth = self::normalizePositiveInt($input['boardWidth'] ?? null, self::DEFAULT_MATRIX_SETTINGS['boardWidth']);
        $boardDepth = self::normalizePositiveInt($input['boardDepth'] ?? null, self::DEFAULT_MATRIX_SETTINGS['boardDepth']);
        $boardCount = self::normalizePositiveInt($input['boardCount'] ?? null, self::DEFAULT_MATRIX_SETTINGS['boardCount']);
        $normalizedLevelRates = self::normalizeDecimalArray(
            $input['levelRates'] ?? null,
            self::DEFAULT_MATRIX_SETTINGS['levelRates'],
            $boardDepth
        );
        $normalizedBoardLevelRates = self::normalizeBoardLevelRates(
            $input['boardLevelRates'] ?? null,
            $boardCount,
            $normalizedLevelRates
        );

        return [
            'boardWidth' => $boardWidth,
            'boardDepth' => $boardDepth,
            'boardCount' => $boardCount,
            'organizationPvRate' => self::normalizeDecimalString(
                $input['organizationPvRate'] ?? null,
                self::DEFAULT_MATRIX_SETTINGS['organizationPvRate']
            ),
            'cwReentryAmount' => self::normalizeDecimalString(
                $input['cwReentryAmount'] ?? ($input['organizationPvRate'] ?? null),
                self::DEFAULT_MATRIX_SETTINGS['cwReentryAmount']
            ),
            'reentryFirmAmount' => self::normalizeDecimalString(
                $input['reentryFirmAmount'] ?? ($input['cwReentryAmount'] ?? ($input['organizationPvRate'] ?? null)),
                self::DEFAULT_MATRIX_SETTINGS['reentryFirmAmount']
            ),
            'reentryPvAmount' => self::normalizeDecimalString(
                $input['reentryPvAmount'] ?? ($input['organizationPvRate'] ?? null),
                self::DEFAULT_MATRIX_SETTINGS['reentryPvAmount']
            ),
            'levelRates' => $normalizedLevelRates,
            'boardLevelRates' => $normalizedBoardLevelRates,
            'boardOpenPvThresholds' => self::normalizeDecimalArray(
                $input['boardOpenPvThresholds'] ?? null,
                self::DEFAULT_MATRIX_SETTINGS['boardOpenPvThresholds'],
                $boardCount
            ),
        ];
    }

    private static function normalizeManualPaymentSettings(array $input): array
    {
        return [
            'accountName' => self::normalizeText($input['accountName'] ?? null, self::DEFAULT_MANUAL_PAYMENT_SETTINGS['accountName']),
            'bankName' => self::normalizeText($input['bankName'] ?? null, self::DEFAULT_MANUAL_PAYMENT_SETTINGS['bankName']),
            'accountNumber' => self::normalizeText($input['accountNumber'] ?? null, self::DEFAULT_MANUAL_PAYMENT_SETTINGS['accountNumber']),
            'promptPayName' => self::normalizeText($input['promptPayName'] ?? null, self::DEFAULT_MANUAL_PAYMENT_SETTINGS['promptPayName']),
            'promptPayNumber' => self::normalizeText($input['promptPayNumber'] ?? null, self::DEFAULT_MANUAL_PAYMENT_SETTINGS['promptPayNumber']),
            'qrImageUrl' => self::normalizeNullableText($input['qrImageUrl'] ?? null),
            'note' => self::normalizeText($input['note'] ?? null, self::DEFAULT_MANUAL_PAYMENT_SETTINGS['note']),
        ];
    }

    private static function normalizeSignupShareSettings(array $input): array
    {
        $legacyMessage = self::normalizeText($input['shareMessage'] ?? null, self::DEFAULT_SIGNUP_SHARE_SETTINGS['signupSuccessMessage']);

        return [
            'shareLinkMessage' => self::normalizeText($input['shareLinkMessage'] ?? null, self::DEFAULT_SIGNUP_SHARE_SETTINGS['shareLinkMessage']),
            'signupSuccessMessage' => self::normalizeText($input['signupSuccessMessage'] ?? null, $legacyMessage),
        ];
    }

    private static function normalizeBoardLevelRates(mixed $value, int $boardCount, array $fallbackRates): array
    {
        if (!is_array($value)) {
            return array_map(
                static fn () => $fallbackRates,
                range(1, max($boardCount, 1))
            );
        }

        $normalizedBoards = [];
        foreach ($value as $boardRates) {
            $normalizedBoards[] = self::normalizeDecimalArray($boardRates, $fallbackRates);
        }

        if (count($normalizedBoards) !== $boardCount) {
            return array_map(
                static fn () => $fallbackRates,
                range(1, max($boardCount, 1))
            );
        }

        return $normalizedBoards;
    }

    private static function normalizeDecimalArray(mixed $value, array $fallback, ?int $expectedLength = null): array
    {
        if (!is_array($value)) {
            return $fallback;
        }

        $normalized = array_values(array_filter(
            array_map(
                static fn ($item) => is_string($item) && preg_match('/^\d+(\.\d+)?$/', trim($item))
                    ? trim($item)
                    : null,
                $value
            ),
            static fn (?string $item) => $item !== null
        ));

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

    private static function normalizeText(mixed $value, string $fallback): string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : $fallback;
    }

    private static function normalizeNullableText(mixed $value): string
    {
        return is_string($value) ? trim($value) : '';
    }
}
