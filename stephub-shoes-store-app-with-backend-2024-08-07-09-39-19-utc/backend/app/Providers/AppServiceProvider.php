<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            return;
        }

        $request = request();
        $host = $request->getHost();

        if (!is_string($host) || $host === '') {
            return;
        }

        $forceHttpsHosts = [
            'bao.blifehealthy.com',
            'api.blifehealthy.com',
            'wap.blifehealthy.com',
        ];

        if (in_array($host, $forceHttpsHosts, true)) {
            URL::forceRootUrl('https://' . $host);
            URL::forceScheme('https');
            return;
        }

        URL::forceRootUrl($request->getSchemeAndHttpHost());

        if ($request->isSecure()) {
            URL::forceRootUrl('https://' . $host);
            URL::forceScheme('https');
        }
    }
}
