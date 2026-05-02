<?php

namespace App\Support;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class BaoAdminApiClient
{
    private ?string $adminApiAccessToken = null;

    /**
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>
     */
    public function request(string $method, string $path, ?array $payload = null): array
    {
        try {
            $request = Http::acceptJson()
                ->timeout(30)
                ->baseUrl($this->apiBaseUrl())
                ->withHeaders([
                    'X-Requested-By' => 'bao-wallet-admin',
                ]);

            $token = $this->adminApiAccessToken();

            if ($token !== null) {
                $request = $request->withToken($token);
            }

            $response = $request->send($method, $path, $payload ? ['json' => $payload] : []);
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Unable to reach wallet API: '.$exception->getMessage(), previous: $exception);
        }

        try {
            $response->throw();
        } catch (RequestException $exception) {
            $message = $response->json('message')
                ?? $response->json('error')
                ?? $exception->getMessage();

            $status = $response->status();
            $body = trim((string) $response->body());
            if ($body !== '') {
                $message .= sprintf(' [HTTP %s] %s', $status, $body);
            }

            throw new \RuntimeException((string) $message, previous: $exception);
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    private function adminApiAccessToken(): ?string
    {
        if ($this->adminApiAccessToken !== null) {
            return $this->adminApiAccessToken;
        }

        $identifier = trim((string) (
            env('BAO_API_ADMIN_IDENTIFIER')
            ?: env('APP_BAO_API_ADMIN_IDENTIFIER')
            ?: 'dev-admin@example.com'
        ));
        $password = trim((string) (
            env('BAO_API_ADMIN_PASSWORD')
            ?: env('APP_BAO_API_ADMIN_PASSWORD')
            ?: env('DEV_MEMBER_IMPERSONATION_PASSWORD')
            ?: 'a1a1a1'
        ));

        if ($identifier === '' || $password === '') {
            return null;
        }

        try {
            $response = Http::acceptJson()
                ->timeout(15)
                ->baseUrl($this->apiBaseUrl())
                ->withHeaders([
                    'X-Requested-By' => 'bao-wallet-admin-login',
                ])
                ->post('/auth/login', [
                    'identifier' => $identifier,
                    'password' => $password,
                ]);
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Unable to reach wallet API auth login: '.$exception->getMessage(), previous: $exception);
        }

        try {
            $response->throw();
        } catch (RequestException $exception) {
            $message = $response->json('message')
                ?? $response->json('error')
                ?? $exception->getMessage();

            throw new \RuntimeException('Unable to login BAO wallet API session: '.(string) $message, previous: $exception);
        }

        $token = (string) ($response->json('accessToken') ?? '');

        if ($token === '') {
            throw new \RuntimeException('Unable to login BAO wallet API session: missing access token.');
        }

        $this->adminApiAccessToken = $token;

        return $this->adminApiAccessToken;
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
}
