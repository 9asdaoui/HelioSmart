<?php

namespace Modules\Estimation\Http\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class Estimation extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'panel_id',
        'utility_id',
        'customer_name',
        'email',
        'latitude',
        'longitude',
        'address',
        'street',
        'city',
        'state',
        'zip_code',
        'country',
        'roof_image_path',
        'roof_polygon',
        'roof_area',
        'building_floors',
        'scale_meters_per_pixel',
        'annual_usage_kwh',
        'annual_cost',
        'monthly_usage',
        'monthly_cost',
        'utility_company',
        'coverage_percentage',
        'energy_usage_type',
        'panel_count',
        'system_capacity',
        'tilt',
        'azimuth',
        'losses',
        'dc_monthly',
        'poa_monthly',
        'solrad_monthly',
        'ac_monthly',
        'energy_annual',
        'capacity_factor',
        'solrad_annual',
        'optimum_tilt',
        'optimum_azimuth',
        'total_losses_percent',
        'roof_type',
        'roof_tilt',
        'roof_net_tilt',
        'annual_production_per_kw',
        'status',
        
        // Usable area detection fields
        'usable_polygon',
        'usable_area',
        'usable_area_m2',
        'roof_mask_image',
        'overlay_image',
        'sam_masks',
        'roof_mask_index',
        'facade_reduction_ratio',
        'roof_type_detected',
        'facade_filtering_applied',
        'meters_per_pixel',
        
        // Panel placement API results
        'panel_grid_image',
        'visualization_image',
        'panel_grid',
        'panel_positions',
        
        // Enhanced Solar Calculation Data
        'solar_irradiance_avg',
        'performance_ratio',
        'solar_production_factor',
        
        // Mounting Structure Cost Data
        'mounting_structure_cost',
        'installation_type',
        'panel_orientation',
        
        // Inverter Design Data
        'inverter_design',
        'inverter_combos',
        'stringing_details',
        
        // Wiring Calculation Data
        'wiring_calculation',
        'wiring_specs',
        'wiring_bom',
        'wiring_cost_mad',
        
        // Panel Spacing Calculations
        'winter_solstice_angle',
        'spacing_portrait',
        'spacing_landscape',
        
        // Environmental Complexity Data
        'wind_speed',
        'elevation',
        'wind_complexity',
        'snow_complexity',
        
        // API Success Tracking
        'pvwatts_api_success',
        'usable_area_api_success',
        'panel_placement_api_success',
        'best_fit_panel_found',
        'inverter_design_success',
        'wiring_calculation_success',
        
        // System Loss Calculation Details
        'eta_panel',
        'eta_temperature',
        'eta_soiling',
        'eta_mismatch',
        'dc_voltage_drop',
        'eta_inverter',
        'ac_voltage_drop',
        'eta_other',
        
        // Best Fit Panel Results
        'best_fit_panel_result',
        'total_capacity_kw',
        'total_annual_production_kwh',
        
        // Usage Pattern Data Enhancement
        'usage_data_breakdown',
        
        // Error Tracking
        'api_errors',
    ];

    protected $casts = [
        'roof_polygon' => 'array',
        'monthly_usage' => 'array',
        'monthly_cost' => 'array',
        'dc_monthly' => 'array',
        'poa_monthly' => 'array',
        'solrad_monthly' => 'array',
        'ac_monthly' => 'array',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'roof_area' => 'decimal:2',
        'scale_meters_per_pixel' => 'decimal:6',
        'annual_usage_kwh' => 'decimal:2',
        'annual_cost' => 'decimal:2',
        'system_capacity' => 'decimal:3',
        'tilt' => 'decimal:2',
        'azimuth' => 'decimal:2',
        'losses' => 'decimal:2',
        'energy_annual' => 'decimal:2',
        'capacity_factor' => 'decimal:2',
        'solrad_annual' => 'decimal:2',
        'optimum_tilt' => 'decimal:2',
        'optimum_azimuth' => 'decimal:2',
        'roof_tilt' => 'decimal:2',
        'roof_net_tilt' => 'decimal:2',
        'annual_production_per_kw' => 'decimal:3',
        'total_losses_percent' => 'decimal:2',
        
        // JSON fields
        'usable_polygon' => 'array',
        'sam_masks' => 'array',
        'panel_grid' => 'array',
        'panel_positions' => 'array',
        'mounting_structure_cost' => 'array',
        'inverter_design' => 'array',
        'inverter_combos' => 'array',
        'stringing_details' => 'array',
        'wiring_calculation' => 'array',
        'wiring_specs' => 'array',
        'wiring_bom' => 'array',
        'best_fit_panel_result' => 'array',
        'usage_data_breakdown' => 'array',
        'api_errors' => 'array',
        
        // Boolean fields
        'pvwatts_api_success' => 'boolean',
        'usable_area_api_success' => 'boolean',
        'panel_placement_api_success' => 'boolean',
        'best_fit_panel_found' => 'boolean',
        'inverter_design_success' => 'boolean',
        'wiring_calculation_success' => 'boolean',
        'facade_filtering_applied' => 'boolean',
    ];

    /**
     * Get the user that owns the estimation.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the panel that is used in the estimation.
     */
    public function panel(): BelongsTo
    {
        return $this->belongsTo(Panel::class);
    }

    /**
     * Get the utility that is used in the estimation.
     */
    public function utility(): BelongsTo
    {
        return $this->belongsTo(Utility::class);
    }
}
