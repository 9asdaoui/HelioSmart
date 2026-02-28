<?php

namespace Modules\Estimation\Http\Models;

use Illuminate\Database\Eloquent\Model;

class Panel extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'product_id',
        'price',
        'weight_kg',
        'width_mm',
        'height_mm',
        'brand',
        'warranty_years',
        'type',
        'panel_rated_power',
        'maximum_operating_voltage_vmpp',
        'maximum_operating_current_impp',
        'open_circuit_voltage',
        'short_circuit_current',
        'module_efficiency',
        'maximum_system_voltage',
        'maximum_series_fuse_rating',
        'num_of_cells',
        'wind_load_kg_per_m2',
        'snow_load_kg_per_m2',
        'operating_temperature_from',
        'operating_temperature_to',
        'temp_coefficient_of_pmax',
        'temp_coefficient_of_voc',
        'temp_coefficient_of_isc',
        'nom_operating_cell_temp_noct',
        'connector_type',
        'score',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'price' => 'decimal:2',
        'weight_kg' => 'decimal:2',
        'width_mm' => 'decimal:2',
        'height_mm' => 'decimal:2',
        'warranty_years' => 'integer',
        'panel_rated_power' => 'decimal:2',
        'maximum_operating_voltage_vmpp' => 'decimal:2',
        'maximum_operating_current_impp' => 'decimal:2',
        'open_circuit_voltage' => 'decimal:2',
        'short_circuit_current' => 'decimal:2',
        'module_efficiency' => 'decimal:2',
        'maximum_system_voltage' => 'decimal:2',
        'maximum_series_fuse_rating' => 'decimal:2',
        'num_of_cells' => 'integer',
        'wind_load_kg_per_m2' => 'decimal:2',
        'snow_load_kg_per_m2' => 'decimal:2',
        'operating_temperature_from' => 'decimal:2',
        'operating_temperature_to' => 'decimal:2',
        'temp_coefficient_of_pmax' => 'decimal:6',
        'temp_coefficient_of_voc' => 'decimal:6',
        'temp_coefficient_of_isc' => 'decimal:6',
        'nom_operating_cell_temp_noct' => 'decimal:2',
        'connector_type' => 'string',
        'status' => 'string',
    ];
}