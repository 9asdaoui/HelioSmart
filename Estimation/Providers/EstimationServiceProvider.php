<?php


namespace Modules\Estimation\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;


class EstimationServiceProvider extends ServiceProvider
{
    /**
     * Boot the application events.
     *
     * @return void
     */
    public function boot()
    {
        try {
            // Register routes
            $this->loadRoutesFrom(__DIR__ . '/../Routes/web.php');

            // Register translations (optional)
            $this->loadTranslationsFrom(__DIR__ . '/../Resources/lang', 'estimation');

            // Register views (if you have module-specific views)
            $this->loadViewsFrom(__DIR__ . '/../Resources/views', 'estimation');
        } catch (\Exception $e) {
            Log::error('EstimationServiceProvider boot error: ' . $e->getMessage());
        }
    }

    /**
     * Register the service provider.
     *
     * @return void
     */
    public function register()
    {
        // Add any bindings or singletons if needed
    }

    /**
     * Register assets for the module
     */
    protected function registerAssets()
    {
        // This will vary based on your app's asset management system
        if (function_exists('add_module_assets')) {
            add_module_assets('estimation', [
                'css' => [
                    'css/estimation.css',
                ],
                'js' => [
                    'js/estimation.js',
                ]
            ]);
        }
    }
}
