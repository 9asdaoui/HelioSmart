<?php

namespace Modules\Estimation\Http\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inverter extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'product_id',
        'price',
        'brand',
        'warranty',
        'nominal_ac_power_kw',
        'max_dc_input_power',
        'mppt_min_voltage',
        'mppt_max_voltage',
        'max_dc_voltage',
        'max_dc_current_mppt',
        'no_of_mppt_ports',
        'max_strings_per_mppt',
        'efficiency_max',
        'ac_output_voltage',
        'phase_type',
        'spd_included',
        'ip_rating',
        'status'
    ];

    protected $casts = [
        'product_id' => 'integer',
        'price' => 'decimal:2',
        'warranty' => 'integer',
        'nominal_ac_power_kw' => 'decimal:2',
        'max_dc_input_power' => 'decimal:2',
        'mppt_min_voltage' => 'decimal:2',
        'mppt_max_voltage' => 'decimal:2',
        'max_dc_voltage' => 'decimal:2',
        'max_dc_current_mppt' => 'decimal:2',
        'no_of_mppt_ports' => 'integer',
        'max_strings_per_mppt' => 'integer',
        'efficiency_max' => 'decimal:2',
        'status' => 'string'
    ];

    /**
     * Get formatted price
     */
    public function getFormattedPriceAttribute()
    {
        return $this->price ? number_format($this->price, 2) . ' DH' : null;
    }

    /**
     * Get formatted nominal AC power
     */
    public function getFormattedNominalAcPowerAttribute()
    {
        return $this->nominal_ac_power_kw ? number_format($this->nominal_ac_power_kw, 1) . ' kW' : null;
    }

    /**
     * Scope for filtering by status
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for active inverters
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for filtering by brand
     */
    public function scopeBrand($query, $brand)
    {
        return $query->where('brand', 'like', '%' . $brand . '%');
    }

    /**
     * Scope for filtering by power range
     */
    public function scopePowerRange($query, $minPower = null, $maxPower = null)
    {
        if ($minPower !== null) {
            $query->where('nominal_ac_power_kw', '>=', $minPower);
        }
        
        if ($maxPower !== null) {
            $query->where('nominal_ac_power_kw', '<=', $maxPower);
        }
        
        return $query;
    }

    /**
     * Scope for searching by name
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('name', 'like', '%' . $search . '%');
    }
}
