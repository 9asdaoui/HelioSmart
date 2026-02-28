<?php

namespace Modules\Estimation\Http\Controllers;

use Illuminate\Contracts\Support\Renderable;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Estimation\Http\Models\SolarConfiguration;
use Modules\Estimation\Http\Models\Panel;

class SolarConfigurationController extends Controller
{
    /**
     * Display a listing of the resource.
     * @param Request $request
     * @return Renderable
     */
    public function index(Request $request)
    {
        $query = SolarConfiguration::query();
        
        // Search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('key', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        
        // Filter by type
        if ($request->filled('type')) {
            $type = $request->get('type');
            if ($type === 'json') {
                $query->whereRaw('JSON_VALID(value)');
            } elseif ($type === 'text') {
                $query->whereRaw('NOT JSON_VALID(value)');
            }
        }
        
        $configurations = $query->orderBy('key')->get();
        
        // Fetch all active panels for the dropdown
        $panels = Panel::where('status', 'active')->orderBy('name')->get();
        
        return view('admin.estimation.config', compact('configurations', 'panels'));
    }

    /**
     * Store a newly created resource in storage.
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validator = $this->validateConfiguration($request);
        
        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::beginTransaction();
            
            $data = $request->only(['name', 'key', 'value', 'description']);
            
            // Handle JSON validation
            if ($request->filled('is_json') && $request->boolean('is_json')) {
                $jsonData = json_decode($data['value'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new \InvalidArgumentException('Invalid JSON format');
                }
            }
            
            SolarConfiguration::create($data);
            
            DB::commit();
            
            return redirect()->route('solar-configuration.index')
                ->with('success', __('Solar configuration created successfully.'));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create solar configuration', [
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', __('Failed to create configuration: ') . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Display the specified resource.
     * @param SolarConfiguration $configuration
     * @return JsonResponse
     */
    public function show(SolarConfiguration $configuration): JsonResponse
    {
        return response()->json([
            'success' => true,
            'configuration' => [
                'id' => $configuration->id,
                'name' => $configuration->name,
                'key' => $configuration->key,
                'value' => $configuration->getRawOriginal('value'), // Get raw value
                'parsed_value' => $configuration->value, // Get parsed value
                'description' => $configuration->description,
                'is_json' => $configuration->isJsonValue(),
                'created_at' => $configuration->created_at,
                'updated_at' => $configuration->updated_at,
            ]
        ]);
    }

    /**
     * Update the specified resource in storage.
     * @param Request $request
     * @param SolarConfiguration $configuration
     * @return RedirectResponse
     */
    public function update(Request $request, SolarConfiguration $configuration): RedirectResponse
    {
        $validator = $this->validateConfiguration($request, $configuration->id);
        
        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::beginTransaction();
            
            $data = $request->only(['name', 'key', 'value', 'description']);
            
            // Handle JSON validation
            if ($request->filled('is_json') && $request->boolean('is_json')) {
                $jsonData = json_decode($data['value'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new \InvalidArgumentException('Invalid JSON format');
                }
            }
            
            $configuration->update($data);
            
            DB::commit();
            
            return redirect()->route('solar-configuration.index')
                ->with('success', __('Solar configuration updated successfully.'));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update solar configuration', [
                'id' => $configuration->id,
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', __('Failed to update configuration: ') . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified resource from storage.
     * @param SolarConfiguration $configuration
     * @return RedirectResponse
     */
    public function destroy(SolarConfiguration $configuration): RedirectResponse
    {
        try {
            $configName = $configuration->name;
            $configuration->delete();
            
            return redirect()->route('solar-configuration.index')
                ->with('success', __('Solar configuration ":name" deleted successfully.', ['name' => $configName]));
        } catch (\Exception $e) {
            Log::error('Failed to delete solar configuration', [
                'id' => $configuration->id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()
                ->with('error', __('Failed to delete configuration: ') . $e->getMessage());
        }
    }

    /**
     * Duplicate a configuration
     * @param SolarConfiguration $configuration
     * @return RedirectResponse
     */
    public function duplicate(SolarConfiguration $configuration): RedirectResponse
    {
        try {
            $newConfig = $configuration->replicate();
            $newConfig->name = $configuration->name . ' (Copy)';
            $newConfig->key = $configuration->key . '_copy_' . time();
            $newConfig->save();
            
            return redirect()->route('solar-configuration.index')
                ->with('success', __('Configuration duplicated successfully.'));
        } catch (\Exception $e) {
            Log::error('Failed to duplicate solar configuration', [
                'id' => $configuration->id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()
                ->with('error', __('Failed to duplicate configuration: ') . $e->getMessage());
        }
    }

    /**
     * Export configurations as JSON
     * @return JsonResponse
     */
    public function exportJson(): JsonResponse
    {
        try {
            $configurations = SolarConfiguration::all()->map(function ($config) {
                return [
                    'name' => $config->name,
                    'key' => $config->key,
                    'value' => $config->getRawOriginal('value'),
                    'description' => $config->description,
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $configurations,
                'exported_at' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Export failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import configurations from JSON
     * @param Request $request
     * @return RedirectResponse
     */
    public function importJson(Request $request): RedirectResponse
    {
        $request->validate([
            'import_file' => 'required|file|mimes:json|max:2048'
        ]);

        try {
            $file = $request->file('import_file');
            $content = file_get_contents($file->getRealPath());
            $data = json_decode($content, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \InvalidArgumentException('Invalid JSON file');
            }
            
            DB::beginTransaction();
            
            $imported = 0;
            $skipped = 0;
            
            foreach ($data as $configData) {
                if (!isset($configData['key']) || !isset($configData['name'])) {
                    $skipped++;
                    continue;
                }
                
                // Check if key already exists
                if (SolarConfiguration::where('key', $configData['key'])->exists()) {
                    $skipped++;
                    continue;
                }
                
                SolarConfiguration::create($configData);
                $imported++;
            }
            
            DB::commit();
            
            return redirect()->route('solar-configuration.index')
                ->with('success', __('Import completed. :imported imported, :skipped skipped.', [
                    'imported' => $imported,
                    'skipped' => $skipped
                ]));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to import solar configurations', [
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()
                ->with('error', __('Import failed: ') . $e->getMessage());
        }
    }

    /**
     * Bulk update configurations
     * @param Request $request
     * @return RedirectResponse
     */
    public function updateBulk(Request $request): RedirectResponse
    {
        try {
            DB::beginTransaction();
            
            $updated = 0;
            $errors = [];
            
            // Get all configuration keys from request (excluding CSRF and method fields)
            $configData = $request->except(['_token', '_method']);
            
            foreach ($configData as $key => $value) {
                // Skip empty values
                if ($value === null || $value === '') {
                    continue;
                }
                
                // Find the configuration by key
                $config = SolarConfiguration::where('key', $key)->first();
                
                if ($config) {
                    // Validate the value based on the configuration type
                    if (!$this->validateConfigValue($key, $value)) {
                        $errors[] = "Invalid value for {$key}: {$value}";
                        continue;
                    }
                    
                    // Update the configuration
                    $config->update(['value' => $value]);
                    $updated++;
                } else {
                    $errors[] = "Configuration not found for key: {$key}";
                }
            }
            
            DB::commit();
            
            if (!empty($errors)) {
                return redirect()->back()
                    ->with('warning', __(':updated configurations updated successfully, but some errors occurred: :errors', [
                        'updated' => $updated,
                        'errors' => implode(', ', array_slice($errors, 0, 3)) . (count($errors) > 3 ? '...' : '')
                    ]));
            }
            
            return redirect()->back()
                ->with('success', __(':count solar configurations updated successfully.', ['count' => $updated]));
                
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to bulk update solar configurations', [
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', __('Failed to update configurations: ') . $e->getMessage());
        }
    }

    /**
     * Validate individual configuration value
     * @param string $key
     * @param mixed $value
     * @return bool
     */
    private function validateConfigValue(string $key, $value): bool
    {
        // Define validation rules for specific configuration keys
        $validationRules = [
            // Efficiency factors should be between 0 and 1
            'eta_temperature' => ['numeric', 'min:0', 'max:1'],
            'eta_soiling' => ['numeric', 'min:0', 'max:1'],
            'eta_mismatch' => ['numeric', 'min:0', 'max:1'],
            'eta_other' => ['numeric', 'min:0', 'max:1'],
            
            // Prices should be positive numbers
            'support_unit_price' => ['numeric', 'min:0'],
            'rail_unit_price' => ['numeric', 'min:0'],
            'clamp_unit_price' => ['numeric', 'min:0'],
            'foundation_unit_price' => ['numeric', 'min:0'],
            'electricity_rate' => ['numeric', 'min:0'],
            
            // Percentages should be between 0 and 100
            'installation_cost_percent' => ['numeric', 'min:0', 'max:100'],
            'consultation_fees_percent' => ['numeric', 'min:0', 'max:100'],
            'default_losses_percent' => ['numeric', 'min:0', 'max:100'],
            
            // Positive numbers
            'solar_production_factor' => ['numeric', 'min:0'],
            'panels_per_kw' => ['numeric', 'min:0'],
            'optimal_tilt_angle' => ['numeric', 'min:0', 'max:90'],
            'default_azimuth' => ['numeric', 'min:0', 'max:360'],
            'co2_reduction_factor' => ['numeric', 'min:0'],
            'tree_absorption_co2_kg' => ['numeric', 'min:0'],
            'water_saved_per_kwh' => ['numeric', 'min:0'],
            'gas_savings_per_kwh' => ['numeric', 'min:0'],
            'panel_degradation_rate' => ['numeric', 'min:0', 'max:1'],
            
            // Foundation ratios should be positive numbers
            'foundation_ratio_rooftop_flat' => ['numeric', 'min:0'],
            'foundation_ratio_rooftop_tilted' => ['numeric', 'min:0'],
            'foundation_ratio_ground' => ['numeric', 'min:0'],
            'foundation_ratio_carport' => ['numeric', 'min:0'],
            'foundation_ratio_floating' => ['numeric', 'min:0'],
            'foundation_ratio_default' => ['numeric', 'min:0'],
            
            // Panel and inverter IDs
            'panel_id' => ['integer', 'min:1'],
            
            // Text fields
            'default_inverter_type' => ['string', 'max:255'],
        ];
        
        // If no specific rules for this key, just check if it's not empty
        if (!isset($validationRules[$key])) {
            return !empty($value);
        }
        
        // Apply validation rules
        $validator = Validator::make(
            [$key => $value],
            [$key => $validationRules[$key]]
        );
        
        return !$validator->fails();
    }

    /**
     * Validate configuration data
     * @param Request $request
     * @param int|null $id
     * @return \Illuminate\Contracts\Validation\Validator
     */
    private function validateConfiguration(Request $request, ?int $id = null): \Illuminate\Contracts\Validation\Validator
    {
        $rules = [
            'name' => 'required|string|max:255|unique:solar_configs,name' . ($id ? ",$id" : ''),
            'key' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-zA-Z0-9_]+$/', // Only alphanumeric and underscores
                'unique:solar_configs,key' . ($id ? ",$id" : '')
            ],
            'value' => 'required',
            'description' => 'nullable|string|max:1000',
        ];

        $messages = [
            'name.required' => __('Configuration name is required.'),
            'name.unique' => __('Configuration name already exists.'),
            'key.required' => __('Configuration key is required.'),
            'key.unique' => __('Configuration key already exists.'),
            'key.regex' => __('Configuration key can only contain letters, numbers, and underscores.'),
            'value.required' => __('Configuration value is required.'),
        ];

        return Validator::make($request->all(), $rules, $messages);
    }
}