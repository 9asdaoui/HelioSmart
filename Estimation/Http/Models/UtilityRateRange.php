<?php

namespace Modules\Estimation\Http\Models;

use Illuminate\Database\Eloquent\Model;

class UtilityRateRange extends Model
{
    protected $table = 'utility_rate_ranges';

    protected $fillable = [
        'utility_id',
        'min',
        'max',
        'rate',
    ];

    public function utility()
    {
        return $this->belongsTo(\App\Models\Utility::class, 'utility_id');
    }
}
