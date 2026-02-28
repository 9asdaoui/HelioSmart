<?php

namespace Modules\Estimation\Http\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class SolarConfiguration extends Model
{
    protected $table = 'solar_configs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'key',
        'value',
        'description'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Clear cache when configurations are modified
        static::saved(function ($model) {
            Cache::forget("solar_config_{$model->key}");
            Cache::forget('solar_configs_all');
        });

        static::deleted(function ($model) {
            Cache::forget("solar_config_{$model->key}");
            Cache::forget('solar_configs_all');
        });
    }

    /**
     * Get the value with proper casting
     *
     * @param  string  $value
     * @return mixed
     */
    public function getValueAttribute($value)
    {
        // Return null if value is empty
        if (empty($value)) {
            return null;
        }

        // Attempt to decode JSON values
        $decoded = json_decode($value, true);
        
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }
        
        // Handle boolean strings
        if (in_array(strtolower($value), ['true', 'false'])) {
            return strtolower($value) === 'true';
        }
        
        // Handle numeric strings
        if (is_numeric($value)) {
            return strpos($value, '.') !== false ? (float) $value : (int) $value;
        }
        
        return $value;
    }

    /**
     * Set the value with proper formatting
     *
     * @param  mixed  $value
     * @return void
     */
    public function setValueAttribute($value)
    {
        if (is_array($value) || is_object($value)) {
            $this->attributes['value'] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        } elseif (is_bool($value)) {
            $this->attributes['value'] = $value ? 'true' : 'false';
        } else {
            $this->attributes['value'] = (string) $value;
        }
    }

    /**
     * Check if the value is JSON
     *
     * @return bool
     */
    public function isJsonValue(): bool
    {
        $value = $this->getRawOriginal('value');
        if (empty($value)) {
            return false;
        }
        
        json_decode($value);
        return json_last_error() === JSON_ERROR_NONE && is_array(json_decode($value, true));
    }

    /**
     * Get the raw value type
     *
     * @return string
     */
    public function getValueType(): string
    {
        if ($this->isJsonValue()) {
            return 'json';
        }
        
        $value = $this->getRawOriginal('value');
        
        if (in_array(strtolower($value), ['true', 'false'])) {
            return 'boolean';
        }
        
        if (is_numeric($value)) {
            return strpos($value, '.') !== false ? 'float' : 'integer';
        }
        
        return 'string';
    }

    /**
     * Get formatted value for display
     *
     * @param int $limit
     * @return string
     */
    public function getDisplayValue(int $limit = 50): string
    {
        $rawValue = $this->getRawOriginal('value');
        
        if ($this->isJsonValue()) {
            return 'JSON (' . count($this->value) . ' items)';
        }
        
        return strlen($rawValue) > $limit ? substr($rawValue, 0, $limit) . '...' : $rawValue;
    }

    /**
     * Get configuration by key with caching
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function getByKey(string $key, $default = null)
    {
        return Cache::remember("solar_config_{$key}", 3600, function () use ($key, $default) {
            $config = self::where('key', $key)->first();
            return $config ? $config->value : $default;
        });
    }

    /**
     * Get multiple configurations by keys
     *
     * @param array $keys
     * @return array
     */
    public static function getByKeys(array $keys): array
    {
        $configs = self::whereIn('key', $keys)->get();
        $result = [];
        
        foreach ($configs as $config) {
            $result[$config->key] = $config->value;
        }
        
        // Fill missing keys with null
        foreach ($keys as $key) {
            if (!isset($result[$key])) {
                $result[$key] = null;
            }
        }
        
        return $result;
    }

    /**
     * Get all configurations as key-value pairs with caching
     *
     * @return array
     */
    public static function getAllConfigs(): array
    {
        return Cache::remember('solar_configs_all', 3600, function () {
            return self::all()->pluck('value', 'key')->toArray();
        });
    }

    /**
     * Set configuration value
     *
     * @param string $key
     * @param mixed $value
     * @param string|null $name
     * @param string|null $description
     * @return self
     */
    public static function setConfig(string $key, $value, ?string $name = null, ?string $description = null): self
    {
        return self::updateOrCreate(
            ['key' => $key],
            [
                'name' => $name ?? ucwords(str_replace('_', ' ', $key)),
                'value' => $value,
                'description' => $description,
            ]
        );
    }

    /**
     * Scope for searching configurations
     *
     * @param Builder $query
     * @param string $search
     * @return Builder
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('key', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%")
              ->orWhere('value', 'like', "%{$search}%");
        });
    }

    /**
     * Scope for JSON configurations
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeJsonConfigs(Builder $query): Builder
    {
        return $query->whereRaw('JSON_VALID(value) AND JSON_TYPE(value) = "OBJECT"');
    }

    /**
     * Scope for text configurations
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeTextConfigs(Builder $query): Builder
    {
        return $query->whereRaw('NOT JSON_VALID(value) OR JSON_TYPE(value) != "OBJECT"');
    }

    /**
     * Get configurations modified recently
     *
     * @param int $hours
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getRecentlyModified(int $hours = 24)
    {
        return self::where('updated_at', '>=', Carbon::now()->subHours($hours))
                   ->orderBy('updated_at', 'desc')
                   ->get();
    }

    /**
     * Validate configuration key format
     *
     * @param string $key
     * @return bool
     */
    public static function isValidKey(string $key): bool
    {
        return preg_match('/^[a-zA-Z0-9_]+$/', $key) === 1;
    }

    /**
     * Get configuration statistics
     *
     * @return array
     */
    public static function getStats(): array
    {
        $total = self::count();
        $jsonConfigs = self::jsonConfigs()->count();
        $textConfigs = self::textConfigs()->count();
        $recentlyModified = self::getRecentlyModified()->count();

        return [
            'total' => $total,
            'json_configs' => $jsonConfigs,
            'text_configs' => $textConfigs,
            'recently_modified' => $recentlyModified,
            'last_modified' => self::latest('updated_at')->first()?->updated_at,
        ];
    }
}