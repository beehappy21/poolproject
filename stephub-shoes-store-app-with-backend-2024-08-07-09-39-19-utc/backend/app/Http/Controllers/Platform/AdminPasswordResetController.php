<?php

namespace App\Http\Controllers\Platform;

use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

class AdminPasswordResetController extends Controller
{
    public function reset(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'identifier' => ['required', 'string', 'max:120'],
            'newPassword' => ['required', 'string', 'min:6', 'max:256'],
            'adminOverridePassword' => ['required', 'string', 'max:256'],
        ]);
        $identifier = trim((string) $payload['identifier']);
        $newPassword = (string) $payload['newPassword'];
        $apiIdentifier = $this->apiResetIdentifier($identifier);

        try {
            $response = Http::acceptJson()
                ->timeout(15)
                ->baseUrl($this->apiBaseUrl())
                ->withHeaders([
                    'X-Requested-By' => 'bao-admin-login-reset',
                ])
                ->post('/auth/forgot-password-reset', [
                    'identifier' => $apiIdentifier,
                    'newPassword' => $newPassword,
                    'adminOverridePassword' => (string) $payload['adminOverridePassword'],
                ]);

            $response->throw();
            $loginResponse = Http::acceptJson()
                ->timeout(15)
                ->baseUrl($this->apiBaseUrl())
                ->withHeaders([
                    'X-Requested-By' => 'bao-admin-login-reset-verify',
                ])
                ->post('/auth/login', [
                    'identifier' => $apiIdentifier,
                    'password' => $newPassword,
                ]);

            $loginResponse->throw();
        } catch (ConnectionException $exception) {
            return back()
                ->withInput($request->only('identifier'))
                ->with('admin_password_reset_error', 'Unable to reach API: '.$exception->getMessage());
        } catch (RequestException $exception) {
            $message = $exception->response?->json('message')
                ?? $exception->response?->json('error')
                ?? $exception->getMessage();

            return back()
                ->withInput($request->only('identifier'))
                ->with('admin_password_reset_error', (string) $message);
        }

        $baoPasswordStatus = $this->updateBaoAdminPassword($identifier, $newPassword);

        return back()
            ->withInput($request->only('identifier'))
            ->with(
                'admin_password_reset_status',
                'Override password is correct. API password was reset and verified successfully. '.$baoPasswordStatus
            );
    }

    private function apiBaseUrl(): string
    {
        return rtrim(
            (string) (env('API_BASE_URL')
                ?: env('APP_API_URL')
                ?: 'http://127.0.0.1:3000'),
            '/'
        );
    }

    private function apiResetIdentifier(string $fallback): string
    {
        return trim((string) (
            env('BAO_PASSWORD_RESET_API_IDENTIFIER')
            ?: env('BAO_API_ADMIN_IDENTIFIER')
            ?: env('APP_BAO_API_ADMIN_IDENTIFIER')
            ?: $fallback
        ));
    }

    private function updateBaoAdminPassword(string $identifier, string $newPassword): string
    {
        if (! filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            return 'BAO password was not changed because the identifier is not a BAO login email.';
        }

        $admin = User::query()
            ->where('email', $identifier)
            ->first();

        if (! $admin) {
            return 'No matching BAO admin email was found, so BAO login password was not changed.';
        }

        $admin->forceFill([
            'password' => Hash::make($newPassword),
        ])->save();

        $admin->refresh();

        if (! Hash::check($newPassword, (string) $admin->password)) {
            return 'BAO admin password update could not be verified.';
        }

        return 'BAO admin password was updated and verified successfully.';
    }
}
