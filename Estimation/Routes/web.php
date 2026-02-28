<?php

use Illuminate\Support\Facades\Route; // This is correct
use Modules\Estimation\Http\Controllers\EstimationController;
use Modules\Estimation\Http\Controllers\OpenSolarController;
use Modules\Estimation\Http\Controllers\PanelController;
use Modules\Estimation\Http\Controllers\SolarConfigurationController;
use Modules\Estimation\Http\Controllers\UtilityController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Define your routes based on the app's pattern
Route::group(['middleware' => ['web', 'locale' , 'auth']], function () {
    Route::get('/estimation', [EstimationController::class, 'index'])->name('estimation.index');
    Route::get('/estimation/create-project', [EstimationController::class, 'testIndex'])->name('estimation.create');
    Route::get('/my-project', [EstimationController::class, 'showProjects'])->name('myproject');
    Route::post('/estimation/create-project', [EstimationController::class, 'createProject'])->name('solar.create-project');
    Route::get('/estimation/{id}/details', [EstimationController::class, 'showDetails'])->name('estimation.details');

    // Add more routes if needed
});

// Project creation route
// Admin routes
Route::group(['prefix' => 'admin', 'middleware' => ['web', 'locale', 'auth']], function () {

    
    // Route::get('/letstestthisshit', [OpenSolarController::class, 'panelPlacement']);
    
    // Solar Configuration routes - using resource routing for better RESTful structure
    Route::prefix('solar-configuration')->name('solar-configuration.')->group(function () {
        Route::get('/', [SolarConfigurationController::class, 'index'])->name('index');
        Route::post('/', [SolarConfigurationController::class, 'store'])->name('store');
        Route::put('/bulk-update', [SolarConfigurationController::class, 'updateBulk'])->name('update-bulk');
        Route::get('/{configuration}', [SolarConfigurationController::class, 'show'])->name('show');
        Route::put('/{configuration}', [SolarConfigurationController::class, 'update'])->name('update');
        Route::delete('/{configuration}', [SolarConfigurationController::class, 'destroy'])->name('destroy');
    });    
    // Solar Panel routes - using resource routing for better RESTful structure
    Route::prefix('solar-panel')->name('solar-panel.')->group(function () {
        Route::get('/', [PanelController::class, 'index'])->name('index');
        Route::post('/', [PanelController::class, 'store'])->name('store');
        Route::get('/{panel}', [PanelController::class, 'show'])->name('show');
        Route::put('/{panel}', [PanelController::class, 'update'])->name('update');
        Route::delete('/{panel}', [PanelController::class, 'destroy'])->name('destroy');

    });    
    // Solar Utility routes - using resource routing for better RESTful structure
    Route::prefix('solar-utility')->name('solar-utility.')->group(function () {
        Route::get('/', [UtilityController::class, 'index'])->name('index');
        Route::post('/', [UtilityController::class, 'store'])->name('store');
        Route::get('/{utility}', [UtilityController::class, 'show'])->name('show');
        Route::put('/{utility}', [UtilityController::class, 'update'])->name('update');
        Route::delete('/{utility}', [UtilityController::class, 'destroy'])->name('destroy');
    });

    
    Route::get('/estimation', [EstimationController::class, 'adminIndex'])->name('admin.estimation.index');
    Route::get('/estimation/config', [SolarConfigurationController::class, 'index'])->name('admin.estimation.config');
    Route::get('/estimation/panel', [PanelController::class, 'index'])->name('admin.estimation.panel');
    Route::get('/estimation/utility', [UtilityController::class, 'index'])->name('admin.estimation.utility');
    Route::get('/estimation/{id}', [EstimationController::class, 'adminShow'])->name('admin.estimation.show');
    Route::put('/estimation/{id}', [EstimationController::class, 'adminUpdate'])->name('admin.estimation.update');

});



 
// ALTERNATIVE: If you prefer API routes (routes/api.php), use this instead:
// Route::prefix('solar')->middleware('api')->group(function () {
//     Route::get('/roof_types/', [OpenSolarController::class, 'getRoofTypes']);
//     Route::get('/orgs/{orgId}/roles/', [OpenSolarController::class, 'getOrgRoles']);
//     Route::post('/orgs/{orgId}/projects/', [OpenSolarController::class, 'createProject']);
//     Route::get('/orgs/{orgId}/projects/{projectId}/', [OpenSolarController::class, 'getProject']);
//     Route::get('/orgs/{orgId}/projects/', [OpenSolarController::class, 'listProjects']);
// });