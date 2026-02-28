<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        
        Schema::create('estimations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->onDelete('cascade');
            $table->foreignId('panel_id')->nullable()->onDelete('set null');
            $table->foreignId('utility_id')->nullable()->onDelete('set null');

            // Customer information
            $table->string('customer_name')->nullable();
            $table->string('email')->nullable();
            
            // Location data
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address')->nullable();
            $table->string('street')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip_code')->nullable();
            $table->string('country')->nullable();
            
            // Roof/Building information
            $table->string('roof_image_path')->nullable();
            $table->json('roof_polygon')->nullable();
            $table->decimal('roof_area', 10, 2)->nullable();
            $table->integer('building_floors')->default(1);
            $table->decimal('scale_meters_per_pixel', 10, 6)->nullable();

            // Usable Area Detection API fields
            $table->json('obstacles')->nullable(); // Array of obstacle objects
            $table->json('usable_polygon')->nullable(); // Final usable area coordinates
            $table->float('usable_area')->nullable(); // Usable area in pixels
            $table->float('usable_area_m2')->nullable(); // Usable area in square meters
            $table->longText('roof_mask_image')->nullable(); // Base64 PNG of roof mask
            $table->longText('overlay_image')->nullable(); // Base64 PNG of annotated overlay
            $table->json('sam_masks')->nullable(); // Array of base64 PNGs for all SAM masks
            $table->integer('roof_mask_index')->nullable(); // Index of selected SAM mask
            $table->float('facade_reduction_ratio')->nullable(); // Ratio of area removed by facade filtering
            $table->string('roof_type')->nullable(); // Processed roof type
            $table->boolean('facade_filtering_applied')->default(false); // Whether facade filtering was applied
            $table->float('meters_per_pixel')->nullable(); // Scale factor used
            
            // Energy usage
            $table->decimal('annual_usage_kwh', 10, 2)->nullable();
            $table->decimal('annual_cost', 10, 2)->nullable();
            $table->json('monthly_usage')->nullable();
            $table->json('monthly_cost')->nullable();
            $table->string('utility_company')->nullable();
            $table->integer('coverage_percentage')->default(80);
            $table->string('energy_usage_type')->default('annual_usage');
            
            // System specs
            $table->integer('panel_count')->nullable();
            $table->decimal('system_capacity', 8, 3);
            $table->decimal('tilt', 5, 2);
            $table->decimal('azimuth', 5, 2);
            $table->decimal('losses', 5, 2)->default(14.0);
            
            // PVWatts/PVGIS output
            $table->json('dc_monthly')->nullable();
            $table->json('poa_monthly')->nullable();
            $table->json('solrad_monthly')->nullable();
            $table->json('ac_monthly')->nullable();
            $table->decimal('energy_annual', 12, 2);
            $table->decimal('capacity_factor', 5, 2)->nullable();
            $table->decimal('solrad_annual', 6, 2)->nullable();
            
            // Additional fields for future use
            $table->decimal('annual_production_per_kw', 10, 2)->nullable();
            
            // Optimum values (from PVGIS)
            $table->decimal('optimum_tilt', 5, 2)->nullable();
            $table->decimal('optimum_azimuth', 5, 2)->nullable();
            $table->decimal('total_losses_percent', 5, 2)->nullable();
            
            // Status
            $table->enum('status', ['draft', 'pending', 'completed', 'failed'])->default('draft');
            $table->timestamps();

            // Store full solar_panel_placement API response
            $table->longText('solar_panel_placement_response')->nullable();
            
            // Panel placement API results (NEW FIELDS)
            $table->longText('panel_grid_image')->nullable(); // Generated grid image
            $table->longText('visualization_image')->nullable(); // Visualization image  
            $table->json('panel_grid')->nullable(); // Panel grid data
            $table->json('panel_positions')->nullable(); // Panel positions
            
            // Enhanced Solar Calculation Data (NEW FIELDS)
            $table->decimal('solar_irradiance_avg', 8, 4)->nullable(); // Daily solar irradiance average
            $table->decimal('performance_ratio', 5, 4)->nullable(); // Performance ratio (0.86)
            $table->decimal('solar_production_factor', 10, 4)->nullable(); // kWh/kW/year production factor
            
            // Mounting Structure Cost Data (NEW FIELDS)
            $table->json('mounting_structure_cost')->nullable(); // Complete mounting cost breakdown
            $table->string('installation_type')->default('rooftop'); // Installation type
            $table->string('panel_orientation')->default('portrait'); // Panel orientation
            
            // Inverter Design Data (NEW FIELDS)
            $table->json('inverter_design')->nullable(); // Complete inverter selection result
            $table->json('inverter_combos')->nullable(); // Inverter combinations
            $table->json('stringing_details')->nullable(); // Stringing configuration details
            
            // Wiring Calculation Data (NEW FIELDS)
            $table->json('wiring_calculation')->nullable(); // Complete wiring calculation
            $table->json('wiring_specs')->nullable(); // Wiring specifications
            $table->json('wiring_bom')->nullable(); // Bill of materials
            $table->decimal('wiring_cost_mad', 10, 2)->nullable(); // Wiring cost in MAD
            
            // Panel Spacing Calculations (NEW FIELDS)
            $table->decimal('winter_solstice_angle', 8, 4)->nullable(); // Winter solstice angle
            $table->decimal('spacing_portrait', 8, 4)->nullable(); // Portrait spacing
            $table->decimal('spacing_landscape', 8, 4)->nullable(); // Landscape spacing
            
            // Environmental Complexity Data (NEW FIELDS)
            $table->decimal('wind_speed', 8, 2)->nullable(); // Wind speed at location
            $table->decimal('elevation', 8, 2)->nullable(); // Elevation at location
            $table->decimal('wind_complexity', 5, 3)->nullable(); // Wind complexity factor
            $table->decimal('snow_complexity', 5, 3)->nullable(); // Snow complexity factor
            
            // API Success Tracking (NEW FIELDS)
            $table->boolean('pvwatts_api_success')->default(false); // PVWatts API success
            $table->boolean('usable_area_api_success')->default(false); // Usable area API success
            $table->boolean('panel_placement_api_success')->default(false); // Panel placement API success
            $table->boolean('best_fit_panel_found')->default(false); // Best fit panel found
            $table->boolean('inverter_design_success')->default(false); // Inverter design success
            $table->boolean('wiring_calculation_success')->default(false); // Wiring calculation success
            
            // System Loss Calculation Details (NEW FIELDS)
            $table->decimal('eta_panel', 6, 4)->nullable(); // Panel efficiency
            $table->decimal('eta_temperature', 6, 4)->nullable(); // Temperature efficiency
            $table->decimal('eta_soiling', 6, 4)->nullable(); // Soiling efficiency
            $table->decimal('eta_mismatch', 6, 4)->nullable(); // Mismatch efficiency
            $table->decimal('dc_voltage_drop', 6, 4)->nullable(); // DC voltage drop percentage
            $table->decimal('eta_inverter', 6, 4)->nullable(); // Inverter efficiency
            $table->decimal('ac_voltage_drop', 6, 4)->nullable(); // AC voltage drop percentage
            $table->decimal('eta_other', 6, 4)->nullable(); // Other efficiency factors
            
            // Best Fit Panel Results (NEW FIELDS)
            $table->json('best_fit_panel_result')->nullable(); // Complete best fit panel result
            $table->decimal('total_capacity_kw', 8, 3)->nullable(); // Total system capacity
            $table->decimal('total_annual_production_kwh', 12, 2)->nullable(); // Total annual production
            
            // Enhanced Building/Installation Details (NEW FIELDS)
            $table->string('roof_type_detected')->nullable(); // Detected roof type from API
            
            // Usage Pattern Data Enhancement (NEW FIELDS)
            $table->json('usage_data_breakdown')->nullable(); // Complete usage data breakdown
            
            // Error Tracking (NEW FIELDS)
            $table->json('api_errors')->nullable(); // API error tracking
            $table->text('calculation_errors')->nullable(); // Calculation error tracking

            // Soft delete
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('estimations');
    }
};