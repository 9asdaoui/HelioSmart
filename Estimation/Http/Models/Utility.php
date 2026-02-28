<?php

namespace Modules\Estimation\Http\Models;

use Illuminate\Database\Eloquent\Model;


class Utility extends Model
{
    public function rateRanges()
    {
        return $this->hasMany(UtilityRateRange::class, 'utility_id');
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'image_url',
        'state',
        'city',
        'country',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    // No casts needed for new fields

}