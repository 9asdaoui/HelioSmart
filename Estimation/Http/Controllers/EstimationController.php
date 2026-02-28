<?php

namespace Modules\Estimation\Http\Controllers;

use App\Http\Controllers\Controller;
use Modules\Estimation\Http\Controllers\PVWattsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Estimation\Http\Models\SolarConfiguration;
use Modules\Estimation\Http\Models\Panel;
use Modules\Estimation\Http\Models\Inverter;
use Modules\Estimation\Http\Models\Utility;

class EstimationController extends Controller
{
    use SoftDeletes;

    /**
     * Select the best-fit panel for the installation based on usable area and energy need.
     *
     * @param float $usableAreaM2 Usable area in m2 (from API)
     * @param float $energyNeedKwhPerYear Client's annual energy need (kWh)
     * @param float $solarProductionFactor kWh/kW/year (site-specific)
     * @param float $coverageTarget Fraction of energy to cover (0-1)
     * @return array|null [panel, panelCount, totalCapacityKw, totalAnnualProductionKwh] or null if none fit
     */
    public function selectBestFitPanel($usableAreaM2, $energyNeedKwhPerYear, $solarProductionFactor, $coverageTarget = 1.0)
    {
        // Get all active panels sorted by score DESC (best first)
        $panels = \Modules\Estimation\Http\Models\Panel::where('status', 'active')->orderByDesc('score')->get();

        // If no active panels found, try to include the default panel as fallback
        if ($panels->isEmpty()) {
            $defaultPanelId = SolarConfiguration::getByKey('panel_id', 21);
            $defaultPanel = \Modules\Estimation\Http\Models\Panel::find($defaultPanelId);
            if ($defaultPanel) {
                $panels = collect([$defaultPanel]);
            }
        }

        foreach ($panels as $panel) {
            // Calculate panel area in m2
            $panelAreaM2 = ($panel->width_mm / 1000.0) * ($panel->height_mm / 1000.0);
            if ($panelAreaM2 <= 0) continue;

            // Max number of panels that fit in usable area
            $maxPanelCount = floor($usableAreaM2 / $panelAreaM2);
            if ($maxPanelCount < 1) continue;

            // Calculate minimum panel count needed to cover the client's need
            if ($panel->panel_rated_power <= 0) continue;
            $SystemKw = ($energyNeedKwhPerYear * $coverageTarget) / $solarProductionFactor;
            $minPanelCount = ceil(($SystemKw * 1000) / $panel->panel_rated_power);

            // Use the lower of maxPanelCount and minPanelCount (must fit and cover need)
            if ($minPanelCount > $maxPanelCount) continue; // Can't fit enough panels

            $systemCapacityKw = ($panel->panel_rated_power * $minPanelCount) / 1000.0;
            $annualProductionKwh = $systemCapacityKw * $solarProductionFactor;

            return [
                'panel' => $panel,
                'panel_count' => $minPanelCount,
                'total_capacity_kw' => $systemCapacityKw,
                'total_annual_production_kwh' => $annualProductionKwh,
                'panel_area_m2' => $panelAreaM2,
            ];
        }
        // If none fit, return null
        return null;
    }

    /**
     * Fetch wind speed and elevation for a location, and return wind/snow complexity factors.
     *
     * @param float $lat
     * @param float $lon
     * @return array ['wind_complexity' => float, 'snow_complexity' => float, 'wind_speed' => float|null, 'elevation' => float|null]
     */
    public function getWindAndSnowComplexity($lat, $lon)
    {
        $windSpeed = null;
        $elevation = null;
        $windComplexity = 0.0;
        $snowComplexity = 0.0;

        // 1. Get wind speed from NASA/POWER API
        try {
            $nasaUrl = "https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=WS10M&community=RE&longitude={$lon}&latitude={$lat}&format=JSON";
            $nasaResp = @file_get_contents($nasaUrl);
            if ($nasaResp !== false) {
                $nasaData = json_decode($nasaResp, true);
                if (isset($nasaData['properties']['parameter']['WS10M'])) {
                    // Use annual average wind speed (mean of all months)
                    $wsArr = $nasaData['properties']['parameter']['WS10M'];
                    $windSpeed = array_sum($wsArr) / count($wsArr);
                }
            }
        } catch (\Exception $e) {
            // Ignore, fallback to null
        }

        // 2. Get elevation from Open-Elevation API
        try {
            $elevUrl = "https://api.open-elevation.com/api/v1/lookup?locations={$lat},{$lon}";
            $elevResp = @file_get_contents($elevUrl);
            if ($elevResp !== false) {
                $elevData = json_decode($elevResp, true);
                if (isset($elevData['results'][0]['elevation'])) {
                    $elevation = $elevData['results'][0]['elevation'];
                }
            }
        } catch (\Exception $e) {
            // Ignore, fallback to null
        }

        // 3. Map wind speed to complexity (Morocco-specific thresholds)
        if ($windSpeed !== null) {
            // In Morocco, most regions have low to moderate wind except coastal and mountain areas
            if ($windSpeed < 4) {
                $windComplexity = 0.0; // Most of Morocco: low wind risk
            } elseif ($windSpeed < 6) {
                $windComplexity = 0.1; // Moderate wind (e.g., Casablanca, Rabat coast)
            } elseif ($windSpeed < 8) {
                $windComplexity = 0.2; // High wind (e.g., Essaouira, Tangier, mountain passes)
            } else {
                $windComplexity = 0.3; // Extreme wind (rare, e.g., exposed Atlantic coast, high mountains)
            }
        }

        // 4. Map elevation to snow complexity (Morocco-specific: snow is rare except in High Atlas)
        if ($elevation !== null) {
            // In Morocco, snow load is only a concern above ~1800m (High Atlas, Middle Atlas)
            if ($elevation > 2000) {
                $snowComplexity = 0.3; // High snow risk (e.g., Oukaimeden, Ifrane)
            } elseif ($elevation > 1500) {
                $snowComplexity = 0.15; // Moderate risk (Middle Atlas, some Rif)
            } else {
                $snowComplexity = 0.0; // Negligible snow risk for most of Morocco
            }
        }

        return [
            'wind_complexity' => $windComplexity,
            'snow_complexity' => $snowComplexity,
            'wind_speed' => $windSpeed,
            'elevation' => $elevation,
        ];
    }

    public function estimateStructureCost(array $panel, int $numPanels, string $installationType, string $roofType, string $orientation = 'portrait'): array
    {
        // Load configuration values with defaults
        $supportUnitPrice = SolarConfiguration::getByKey('support_unit_price', 300); // per panel
        $railUnitPrice = SolarConfiguration::getByKey('rail_unit_price', 120); // per meter
        $clampUnitPrice = SolarConfiguration::getByKey('clamp_unit_price', 15); // per clamp
        $foundationUnitPrice = SolarConfiguration::getByKey('foundation_unit_price', 200); // per foundation point

        // Determine foundations per support based on installation and roof type
        switch (strtolower($installationType)) {
            case 'rooftop':
                $foundationsPerSupport = (strtolower($roofType) === 'flat') ?
                    SolarConfiguration::getByKey('foundation_ratio_rooftop_flat', 0.7) :
                    SolarConfiguration::getByKey('foundation_ratio_rooftop_tilted', 0.2);
                break;
            case 'ground':
                $foundationsPerSupport = SolarConfiguration::getByKey('foundation_ratio_ground', 1.2);
                break;
            case 'carport':
                $foundationsPerSupport = SolarConfiguration::getByKey('foundation_ratio_carport', 1.5);
                break;
            case 'floating':
                $foundationsPerSupport = SolarConfiguration::getByKey('foundation_ratio_floating', 1.0);
                break;
            default:
                $foundationsPerSupport = SolarConfiguration::getByKey('foundation_ratio_default', 1.0);
                break;
        }

        // Panel dimensions
        $panelWidth = $panel['width'];   // in meters
        $panelHeight = $panel['height']; // in meters

        // Calculate rail length needed based on orientation
        if (strtolower($orientation) === 'landscape') {
            $railLengthPerRow = $panelHeight * $numPanels / 2; // 2 rails per row
        } else {
            $railLengthPerRow = $panelWidth * $numPanels / 2;
        }

        $totalRailLength = ceil($railLengthPerRow);
        $totalRailCost = $totalRailLength * $railUnitPrice;

        // Clamps: 4 per panel
        $totalClamps = $numPanels * 4;
        $totalClampCost = $totalClamps * $clampUnitPrice;

        // Supports
        $totalSupports = $numPanels;
        $totalSupportCost = $totalSupports * $supportUnitPrice;

        // Foundations
        $totalFoundations = ceil($totalSupports * $foundationsPerSupport);
        $totalFoundationCost = $totalFoundations * $foundationUnitPrice;

        // Total cost
        $totalCost = $totalSupportCost + $totalRailCost + $totalClampCost + $totalFoundationCost;

        return [
            'support' => [
                'quantity' => $totalSupports,
                'unit_price' => $supportUnitPrice,
                'total_cost' => $totalSupportCost,
            ],
            'rail' => [
                'length_m' => $totalRailLength,
                'unit_price' => $railUnitPrice,
                'total_cost' => $totalRailCost,
            ],
            'clamp' => [
                'quantity' => $totalClamps,
                'unit_price' => $clampUnitPrice,
                'total_cost' => $totalClampCost,
            ],
            'foundation' => [
                'quantity' => $totalFoundations,
                'unit_price' => $foundationUnitPrice,
                'total_cost' => $totalFoundationCost,
            ],
            'total_structure_cost' => $totalCost
        ];
    }

    /**
     * Display the estimation form
     *
     * @return \Illuminate\Contracts\View\View
     */
    public function index()
    {
        $userId = Auth()->id();
        $estimations = \Modules\Estimation\Http\Models\Estimation::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate(6); // Show 6 estimations per page
        return view('site.estimation', compact('estimations'));
    }

    public function testIndex()
    {
        // Fetch all utilities (assuming Utility model exists)
        $utilities = Utility::all();
        return view('site.createEstimation', compact('utilities'));
    }

    /**
     * Display the user's solar project details
     * 
     * @return \Illuminate\Contracts\View\View
     */
    public function showProjects()
    {
        // Get the current authenticated user ID
        $userId = Auth()->id();
        // Get all estimations for this user
        $estimations = \Modules\Estimation\Http\Models\Estimation::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();
        // Check if estimations exist
        if ($estimations->isEmpty()) {
            // If no estimations, pass an empty collection and a message
            return view('site.myproject', [
                'estimations' => $estimations,
                'message' => 'No solar estimations found. Create your first estimation now!'
            ]);
        }
        // Pass all estimations to the view
        return view('site.myproject', [
            'estimations' => $estimations
        ]);
    }


    /**
     * Display detailed information about a specific estimation
     *
     * @param int $id The ID of the estimation to show
     * @return \Illuminate\Contracts\View\View
     */
    public function showDetails($id)
    {
        try {
            // Find the estimation by ID with panel relationship
            $estimation = \Modules\Estimation\Http\Models\Estimation::with('panel')->findOrFail($id);
            
            // Check if the current user owns this estimation
            if ($estimation->user_id !== Auth::id()) {  
                return redirect()->route('myproject')
                    ->with('error', 'You do not have permission to view this estimation.');
            }

            // Decode the JSON-encoded monthly data - handle both JSON strings and arrays
            $dcMonthly = is_string($estimation->dc_monthly) ? json_decode($estimation->dc_monthly, true) : $estimation->dc_monthly;
            $poaMonthly = is_string($estimation->poa_monthly) ? json_decode($estimation->poa_monthly, true) : $estimation->poa_monthly;
            $solradMonthly = is_string($estimation->solrad_monthly) ? json_decode($estimation->solrad_monthly, true) : $estimation->solrad_monthly;
            $acMonthly = is_string($estimation->ac_monthly) ? json_decode($estimation->ac_monthly, true) : $estimation->ac_monthly;

            // Decode monthly usage from database - handle both JSON strings and arrays
            $monthlyUsage = is_string($estimation->monthly_usage) ? json_decode($estimation->monthly_usage, true) : $estimation->monthly_usage;
            $monthlyCost = is_string($estimation->monthly_cost) ? json_decode($estimation->monthly_cost, true) : $estimation->monthly_cost;

            // Prepare the monthly data for the view
            $monthlyData = [];
            $monthlyConsumption = [];

            // Map of month names to match the JSON keys
            $monthsMap = [
                'Jan' => 'january',
                'Feb' => 'february',
                'Mar' => 'march',
                'Apr' => 'april',
                'May' => 'may',
                'Jun' => 'june',
                'Jul' => 'july',
                'Aug' => 'august',
                'Sep' => 'september',
                'Oct' => 'october',
                'Nov' => 'november',
                'Dec' => 'december'
            ];

            $months = array_keys($monthsMap);

            foreach ($months as $index => $month) {
                // Get monthly consumption from database instead of calculation - CHANGED
                $fullMonth = $monthsMap[$month];
                $monthlyConsumption[$index] = $monthlyUsage[$fullMonth] ?? ($estimation->annual_usage_kwh / 12);

                $fullMonthCapitalized = ucfirst($fullMonth); // Convert "january" to "January" for dc_monthly etc.

                $monthlyData[] = [
                    'month' => $month,
                    'dc_output' => $dcMonthly[$fullMonthCapitalized] ?? 0,
                    'poa' => $poaMonthly[$fullMonthCapitalized] ?? 0,
                    'solrad' => $solradMonthly[$fullMonthCapitalized] ?? 0,
                    'ac_output' => $acMonthly[$fullMonthCapitalized] ?? 0,
                    'cost' => $monthlyCost[$fullMonth] ?? 0, // Add monthly cost data
                ];
            }

            // Financial calculations - use the electricity rate from the estimation's utility
            $electricityRate = null; // Default fallback
            
            // Try to get the rate from the estimation's utility if available
            if ($estimation->utility_id) {
                $utility = \Modules\Estimation\Http\Models\Utility::find($estimation->utility_id);
                if ($utility && $estimation->annual_cost && $estimation->annual_usage_kwh) {
                    // Calculate the effective rate from the stored annual cost and usage
                    $electricityRate = $estimation->annual_cost / $estimation->annual_usage_kwh;
                } elseif ($utility) {
                    // Fallback to the utility's base rate if available
                    $firstRateRange = $utility->rateRanges()->orderBy('min')->first();
                    if ($firstRateRange) {
                        $electricityRate = $firstRateRange->rate;
                    }
                }
            } else {
                // If no utility, try to calculate from stored cost data
                if ($estimation->annual_cost && $estimation->annual_usage_kwh) {
                    $electricityRate = $estimation->annual_cost / $estimation->annual_usage_kwh;
                } else {
                    // Final fallback to configuration
                    $electricityRate = null;
                }
            }

            // Use data that's already stored in the database
            $panel = $estimation->panel;
            $panelCount = $estimation->panel_count;
            
            // Get panel data from database - return null if not available
            $panelPrice = $panel ? $panel->price : null;
            $panelBrand = $panel ? $panel->brand : null;
            $panelWarranty = $panel ? $panel->warranty_years : null;
            $panelWattage = $panel ? $panel->panel_rated_power : null;
            $panelEfficiency = $panel ? $panel->module_efficiency : null;

            $panelCost = ($panelCount && $panelPrice) ? ($panelCount * $panelPrice) : null;


            // Use stored inverter design data from database
            $inverterDesign = null;
            $inverterCombos = [];
            $stringingDetails = [];
            $inverterCount = null;
            $inverterPrice = null;
            $inverterCost = null;
            $inverterBrand = null;
            $inverterWarranty = null;
            $inverterModel = null;
            $systemAcCapacity = $estimation->system_capacity;
            $systemDcCapacity = $estimation->system_capacity;
            $dcAcRatio = null;

            // Decode stored inverter design data
            if (!empty($estimation->inverter_design)) {
                $inverterDesign = is_string($estimation->inverter_design) ? 
                    json_decode($estimation->inverter_design, true) : 
                    $estimation->inverter_design;
            }

            // Decode stored inverter combos
            if (!empty($estimation->inverter_combos)) {
                $inverterCombos = is_string($estimation->inverter_combos) ? 
                    json_decode($estimation->inverter_combos, true) : 
                    $estimation->inverter_combos;
                
                // Ensure all required keys exist with fallback values
                $inverterCombos = array_map(function($combo) use ($inverterDesign, $estimation) {
                    // Handle both 'qty' and 'quantity' fields
                    $quantity = $combo['quantity'] ?? $combo['qty'] ?? 1;
                    
                    // Extract brand from model if not available
                    $brand = $combo['brand'] ?? 'Unknown Brand';
                    if ($brand === 'Unknown Brand' && isset($combo['model'])) {
                        // Try to extract brand from model string (e.g., "Growatt MIN 3000TL-X" -> "Growatt")
                        $modelParts = explode(' ', $combo['model']);
                        if (!empty($modelParts[0])) {
                            $brand = $modelParts[0];
                        }
                    }
                    
                    // Get power values from combo or fallback to inverter_design
                    $acPowerKw = $combo['ac_power_kw'] ?? 0;
                    $dcPowerKw = $combo['dc_power_kw'] ?? 0;
                    
                    // If power values are 0, try to get from inverter_design
                    if (($acPowerKw == 0 || $dcPowerKw == 0) && !empty($inverterDesign)) {
                        if (isset($inverterDesign['combo']) && is_array($inverterDesign['combo'])) {
                            // Find matching combo in inverter_design
                            foreach ($inverterDesign['combo'] as $designCombo) {
                                if ($designCombo['model'] === $combo['model']) {
                                    if ($acPowerKw == 0 && isset($designCombo['stringing']['dc_power_kw'])) {
                                        // Get DC power from stored data
                                        $dcPowerKw = $designCombo['stringing']['dc_power_kw'];
                                        
                                        // Get efficiency from inverter database
                                        $inverter = Inverter::where('name', $combo['model'])->first();
                                        if ($inverter && $inverter->efficiency_max) {
                                            $efficiency = $inverter->efficiency_max / 100;
                                            $acPowerKw = $dcPowerKw * $efficiency;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        
                        // Fallback to total values divided by quantity
                        if ($acPowerKw == 0 && isset($inverterDesign['total_ac_kw'])) {
                            $acPowerKw = $inverterDesign['total_ac_kw'] / $quantity;
                        }
                        if ($dcPowerKw == 0 && isset($inverterDesign['total_dc_kw'])) {
                            $dcPowerKw = $inverterDesign['total_dc_kw'] / $quantity;
                        }
                    }
                    
                    return [
                        'model' => $combo['model'] ?? 'Unknown Model',
                        'brand' => $brand,
                        'quantity' => $quantity,
                        'qty' => $quantity, // Keep both for compatibility
                        'price' => $combo['price'] ?? null,
                        'total_price' => $combo['total_price'] ?? null,
                        'ac_power_kw' => $acPowerKw,
                        'dc_power_kw' => $dcPowerKw,
                        'efficiency' => $combo['efficiency'] ?? null,
                        'warranty' => $combo['warranty'] ?? null,
                        'mppt_ports' => $combo['mppt_ports'] ?? null,
                        'stringing' => $combo['stringing'] ?? []
                    ];
                }, $inverterCombos);
            }

            // Decode stored stringing details
            if (!empty($estimation->stringing_details)) {
                $stringingDetails = is_string($estimation->stringing_details) ? 
                    json_decode($estimation->stringing_details, true) : 
                    $estimation->stringing_details;
                
                // Ensure all required keys exist with fallback values
                $stringingDetails = array_map(function($detail) use ($inverterDesign) {
                    // Get power values from detail or fallback to inverter_design
                    $acPowerKw = $detail['ac_power_kw'] ?? 0;
                    $dcPowerKw = $detail['dc_power_kw'] ?? 0;
                    $dcAcRatio = $detail['dc_ac_ratio'] ?? 0;
                    $totalPanelsUsed = $detail['total_panels_used'] ?? 0;
                    $vStringVoc = $detail['v_string_voc'] ?? 0;
                    
                    // If values are missing, try to get from inverter_design
                    if (($acPowerKw == 0 || $dcPowerKw == 0) && !empty($inverterDesign)) {
                        if (isset($inverterDesign['combo']) && is_array($inverterDesign['combo'])) {
                            // Find matching inverter in design
                            $inverterModel = $detail['inverter_model'] ?? '';
                            foreach ($inverterDesign['combo'] as $designCombo) {
                                if ($designCombo['model'] === $inverterModel && isset($designCombo['stringing'])) {
                                    $stringing = $designCombo['stringing'];
                                    
                                    // Use stored DC power or calculate AC power with inverter efficiency from database
                                    $dcPowerFromStringing = $stringing['dc_power_kw'] ?? 0;
                                    if ($acPowerKw == 0 && $dcPowerFromStringing > 0) {
                                        // Get efficiency from inverter database
                                        $inverter = Inverter::where('name', $inverterModel)->first();
                                        if ($inverter && $inverter->efficiency_max) {
                                            $efficiency = $inverter->efficiency_max / 100;
                                            $acPowerKw = $dcPowerFromStringing * $efficiency;
                                        }
                                    }
                                    
                                    $dcPowerKw = $dcPowerKw ?: $dcPowerFromStringing;
                                    $dcAcRatio = $dcAcRatio ?: ($stringing['dc_ac_ratio'] ?? 0);
                                    $totalPanelsUsed = $totalPanelsUsed ?: ($stringing['total_panels_used'] ?? 0);
                                    $vStringVoc = $vStringVoc ?: ($stringing['v_string_voc'] ?? 0);
                                    break;
                                }
                            }
                        }
                    }
                    
                    return [
                        'inverter_model' => $detail['inverter_model'] ?? 'Unknown Model',
                        'inverter_qty' => $detail['inverter_qty'] ?? 1,
                        'ac_power_kw' => $acPowerKw,
                        'dc_power_kw' => $dcPowerKw,
                        'dc_ac_ratio' => $dcAcRatio,
                        'total_panels_used' => $totalPanelsUsed,
                        'strings' => $detail['strings'] ?? [],
                        'v_string_voc' => $vStringVoc
                    ];
                }, $stringingDetails);
            }

            // Extract inverter summary data from stored data
            if (!empty($inverterDesign) && !isset($inverterDesign['error'])) {
                $inverterCount = $inverterDesign['total_inverter_count'] ?? 1;
                $systemAcCapacity = $inverterDesign['total_ac_kw'] ?? $estimation->system_capacity;
                $systemDcCapacity = $inverterDesign['total_dc_kw'] ?? $estimation->system_capacity;
                $dcAcRatio = $systemDcCapacity / $systemAcCapacity;

                // Calculate cost from combos if available
                if (!empty($inverterCombos)) {
                    $totalCost = 0;
                    $brands = [];
                    $models = [];

                    foreach ($inverterCombos as $combo) {
                        $comboCost = $combo['total_price'] ?? 0;
                        
                        // If total_price is 0, try to calculate from individual price and quantity
                        if ($comboCost == 0 && isset($combo['price']) && $combo['price'] > 0) {
                            $comboCost = $combo['price'] * ($combo['quantity'] ?? 1);
                        }
                        
                        // If still 0, get price from inverter database, don't use config
                        if ($comboCost == 0) {
                            // Get inverter from database to get actual price
                            $inverter = Inverter::where('name', $combo['model'])->first();
                            if ($inverter && $inverter->price) {
                                $comboCost = $inverter->price * ($combo['quantity'] ?? 1);
                                // Update the combo with the retrieved price for display
                                $combo['price'] = $inverter->price;
                                $combo['total_price'] = $comboCost;
                            }
                        }
                        
                        $totalCost += $comboCost;
                        $brands[] = $combo['brand'] ?? null;
                        $models[] = $combo['model'] ?? null;
                    }
                    
                    // Update the $inverterCombos array with the pricing information
                    $inverterCombos = array_map(function($combo) {
                        if (!isset($combo['price']) || $combo['price'] == 0) {
                            $inverter = Inverter::where('name', $combo['model'])->first();
                            if ($inverter && $inverter->price) {
                                $combo['price'] = $inverter->price;
                                $combo['total_price'] = $inverter->price * ($combo['quantity'] ?? 1);
                            }
                        }
                        return $combo;
                    }, $inverterCombos);
                    
                    // Filter out null values
                    $brands = array_filter($brands);
                    $models = array_filter($models);

                    $inverterCost = $totalCost;
                    $inverterPrice = $inverterCount > 0 ? $totalCost / $inverterCount : 0;

                    // Handle brand and model display
                    $uniqueBrands = array_unique($brands);
                    $uniqueModels = array_unique($models);
                    
                    $inverterBrand = !empty($uniqueBrands) ? (count($uniqueBrands) == 1 ? reset($uniqueBrands) : implode(' + ', $uniqueBrands)) : null;
                    $inverterModel = !empty($uniqueModels) ? (count($uniqueModels) == 1 ? reset($uniqueModels) : count($uniqueModels) . ' Models') : null;

                    // Use first inverter for warranty display
                    if (!empty($inverterCombos)) {
                        $inverterWarranty = $inverterCombos[0]['warranty'] ?? null;
                    }
                }
                
                // If inverter cost is still 0 or null after processing combos, leave it null - no fallback
                // Don't estimate cost if we don't have actual price data
            } else {
                // Fallback logic when no stored inverter data is available
                // Try to provide basic estimates based on system capacity
                if ($estimation->system_capacity && $estimation->system_capacity > 0) {
                    // Estimate basic inverter requirements
                    $systemCapacityKw = $estimation->system_capacity;
                    
                    // Get a default inverter from database that matches the system size
                    $defaultInverter = Inverter::where('status', 'active')
                        ->where('nominal_ac_power_kw', '<=', $systemCapacityKw + 5) // Allow some margin
                        ->where('nominal_ac_power_kw', '>=', $systemCapacityKw - 5)
                        ->orderBy('nominal_ac_power_kw', 'desc')
                        ->first();
                    
                    if (!$defaultInverter) {
                        // If no exact match, get the closest one
                        $defaultInverter = Inverter::where('status', 'active')
                            ->orderByRaw('ABS(nominal_ac_power_kw - ?)', [$systemCapacityKw])
                            ->first();
                    }
                    
                    if ($defaultInverter) {
                        // Calculate estimated quantities and cost
                        $estimatedInverterCount = max(1, ceil($systemCapacityKw / $defaultInverter->nominal_ac_power_kw));
                        $estimatedInverterPrice = $defaultInverter->price;
                        $estimatedInverterCost = $estimatedInverterCount * $estimatedInverterPrice;
                        
                        // Set fallback values with "estimated" indicators
                        $inverterCount = $estimatedInverterCount;
                        $inverterPrice = $estimatedInverterPrice;
                        $inverterCost = $estimatedInverterCost;
                        $inverterBrand = $defaultInverter->brand . ' (Est.)';
                        $inverterModel = $defaultInverter->name . ' (Est.)';
                        $inverterWarranty = $defaultInverter->warranty;
                        
                        Log::info('Using fallback inverter estimation', [
                            'system_capacity' => $systemCapacityKw,
                            'selected_inverter' => $defaultInverter->name,
                            'estimated_count' => $estimatedInverterCount,
                            'estimated_cost' => $estimatedInverterCost
                        ]);
                    } else {
                        // No suitable inverter found
                        $inverterCount = null;
                        $inverterPrice = null;
                        $inverterCost = null;
                    }
                } else {
                    // No system capacity data available
                    $inverterCount = null;
                    $inverterPrice = null;
                    $inverterCost = null;
                }
            }

            // Total system cost (panels + inverters) - calculate with available data
            $systemCost = null;
            if ($panelCost || $inverterCost) {
                $systemCost = ($panelCost ?? 0) + ($inverterCost ?? 0);
            }

            $installationCost = $systemCost ? ($systemCost * (SolarConfiguration::getByKey('installation_cost_percent', 30) / 100)) : null;
            $consultationFees = $systemCost ? ($systemCost * (SolarConfiguration::getByKey('consultation_fees_percent', 5) / 100)) : null;
            $totalInvestment = ($systemCost && $installationCost && $consultationFees) ? ($systemCost + $installationCost + $consultationFees) : null;

            // Return on investment calculations - only if required data is available
            $annualSavings = $estimation->energy_annual ? ($estimation->energy_annual * $electricityRate) : null;
            $paybackPeriod = ($totalInvestment && $annualSavings && $annualSavings > 0) ? ($totalInvestment / $annualSavings) : null;
            $systemLifespan = $panelWarranty; // Use panel warranty from database (could be null)
            $lifetimeSavings = ($annualSavings && $systemLifespan) ? ($annualSavings * $systemLifespan) : null;
            $roi = ($lifetimeSavings && $totalInvestment && $totalInvestment > 0) ? ((($lifetimeSavings - $totalInvestment) / $totalInvestment) * 100) : null;

            // Environmental impact calculations - only if annual energy is available
            $co2Reduction = $estimation->energy_annual ? ($estimation->energy_annual * SolarConfiguration::getByKey('co2_reduction_factor', 0.5)) : null;
            $treesEquivalent = $co2Reduction ? ($co2Reduction / SolarConfiguration::getByKey('tree_absorption_co2_kg', 20)) : null;
            $gasSavings = $estimation->energy_annual ? ($estimation->energy_annual * SolarConfiguration::getByKey('gas_savings_per_kwh', 0.1)) : null;
            $waterSaved = $estimation->energy_annual ? ($estimation->energy_annual * SolarConfiguration::getByKey('water_saved_per_kwh', 5)) : null;

            // Calculate additional performance metrics
            $annualProduction = $estimation->energy_annual ?? 0;
            $monthlyProduction = $annualProduction ? ($annualProduction / 12) : 0;
            $capacityFactor = ($estimation->system_capacity && $annualProduction) ? 
                ($annualProduction / ($estimation->system_capacity * 8760)) * 100 : null; // 8760 hours in a year
            $panelCapacity = $panel ? $panel->panel_rated_power : null; // Watts per panel
            $azimuth = $estimation->azimuth ?? null; // Default south-facing
            $tilt = $estimation->tilt ?? null; // Default tilt

            
            // Handle roof image URL properly
            $roofImageUrl = null;
            if (!empty($estimation->visualization_image)) {
                // Handle base64 image data - check if it already has data URL prefix
                $visualizationImage = $estimation->visualization_image;
                if (strpos($visualizationImage, 'data:image') === 0) {
                    // Already has data URL prefix
                    $roofImageUrl = $visualizationImage;
                } else {
                    // Add data URL prefix
                    $roofImageUrl = 'data:image/png;base64,' . $visualizationImage;
                }
            } elseif (!empty($estimation->roof_image_path)) {
                // Handle file path
                $roofImageUrl = asset('storage/' . $estimation->roof_image_path);
            }

            return view('site.estimation_details', [
                'estimation' => $estimation,
                'monthlyData' => $monthlyData,
                'roofImageUrl' => $roofImageUrl,
                'monthlyConsumption' => $monthlyConsumption,
                'electricityRate' => $electricityRate,
                'panelCount' => $panelCount,
                'panelPrice' => $panelPrice,
                'panelCost' => $panelCost,
                'panelBrand' => $panelBrand,
                'panelWarranty' => $panelWarranty,
                'panelWattage' => $panelWattage,
                'panelEfficiency' => $panelEfficiency,
                'panel' => $panel, // Pass the full panel object for additional data
                'inverterCount' => $inverterCount,
                'inverterPrice' => $inverterPrice,
                'inverterCost' => $inverterCost,
                'inverterBrand' => $inverterBrand,
                'inverterWarranty' => $inverterWarranty,
                'inverterModel' => $inverterModel,
                'inverterDesign' => $inverterDesign, // Pass the full inverter design for advanced details
                'inverterCombos' => $inverterCombos, // Multi-inverter combination details
                'stringingDetails' => $stringingDetails, // Stringing configuration details
                'systemCapacity' => $estimation->system_capacity, // Add missing systemCapacity variable
                'systemAcCapacity' => $systemAcCapacity ?? $estimation->system_capacity,
                'systemDcCapacity' => $systemDcCapacity ?? $estimation->system_capacity,
                'dcAcRatio' => $dcAcRatio ?? null,
                'systemCost' => $systemCost,
                'installationCost' => $installationCost,
                'consultationFees' => $consultationFees,
                'totalInvestment' => $totalInvestment,
                'annualSavings' => $annualSavings,
                'paybackPeriod' => $paybackPeriod,
                'lifetimeSavings' => $lifetimeSavings,
                'roi' => $roi,
                'co2Reduction' => $co2Reduction,
                'treesEquivalent' => $treesEquivalent,
                'gasSavings' => $gasSavings,
                'waterSaved' => $waterSaved,
                'currencySymbol' => 'dh', // Default currency symbol
                'roofType' => $estimation->roof_type ?? 'sloped', // Get from database roof_type column
                'panelDegradationRate' => $panel ? $panel->degradation_rate : null,
                // Additional performance metrics
                'annualProduction' => $annualProduction,
                'monthlyProduction' => $monthlyProduction,
                'capacityFactor' => $capacityFactor,
                'panelCapacity' => $panelCapacity,
                'azimuth' => $azimuth,
                'tilt' => $tilt,
            ]);
        } catch (\Exception $e) {
            Log::error('Error displaying estimation details', [
                'estimation_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('myproject')
                ->with('error', 'Unable to load estimation details: ' . $e->getMessage());
        }
    }
    /**
     * Process the estimation form submission and call PVWatts API
     *
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function createProject(Request $request)
    {
        try {
            //========= 1. Validate request and extract input =========//
            $validator = validator(
                $request->all(),
                [
                    'latitude' => 'required|numeric',
                    'longitude' => 'required|numeric',
                    'street' => 'nullable|string|max:255',
                    'city' => 'nullable|string|max:100',
                    'state' => 'nullable|string|max:100',
                    'zip_code' => 'nullable|string|max:20',
                    'country' => 'nullable|string|max:100',
                    'search_query' => 'nullable|string|max:255',
                    'satellite_image' => 'nullable|string',
                    'scale_meters_per_pixel' => 'nullable|numeric|min:0.01|max:100',
                    'zoom_level' => 'nullable|integer|min:1|max:22',
                    'cadre_bounds' => 'nullable|string',
                    'cadre_size_pixels' => 'nullable|string',
                    'cadre_size_meters' => 'nullable|string',
                    'monthly_bill' => 'nullable|numeric|min:0',
                    'usage_pattern' => 'nullable|string',
                    'advanced_mode' => 'nullable|boolean',
                    'region' => 'nullable|string|max:100',
                    'provider' => 'nullable|string|max:100',
                    'roof_type' => 'nullable|string',
                    'roof_tilt' => 'nullable|string|max:50',
                    'building_stories' => 'nullable|integer|min:1|max:100',
                    'roof_point_prompt' => 'nullable|string',
                    'roof_point_label' => 'nullable|string',
                    'obstacle_point_prompt' => 'nullable|string',
                    'obstacle_point_label' => 'nullable|string',
                ]
            );

            if ($validator->fails()) {
                Log::warning('Validation failed:', ['errors' => $validator->errors()->toArray()]);
                return redirect()->back()
                    ->withErrors($validator)
                    ->withInput()
                    ->with('error', 'Please correct the errors in your submission.');
            }

            //========= 2. Extract validated data and calculate rates =========//
            $validated = $validator->validated();
            $userId = auth()->id();
            $lat = $validated['latitude'];
            $lon = $validated['longitude'];

            $utility = null;
            $electricityRate = SolarConfiguration::getByKey('electricity_rate', 1.5); // default fallback
            $monthlyBill = $validated['monthly_bill'] ?? 0;
            if (!empty($validated['provider'])) {
                $utility = Utility::find($validated['provider']);
                if ($utility && $monthlyBill > 0) {
                    // Calculate estimated monthly kWh usage from monthly bill
                    // Start with the first (lowest) rate to estimate usage
                    $firstRateRange = $utility->rateRanges()->orderBy('min')->first();
                    if ($firstRateRange) {
                        $estimatedUsageKwh = $monthlyBill / $firstRateRange->rate;

                        // Find the appropriate rate range based on estimated usage
                        $rateRange = $utility->rateRanges()
                            ->where('min', '<=', $estimatedUsageKwh)
                            ->where(function ($query) use ($estimatedUsageKwh) {
                                $query->where('max', '>=', $estimatedUsageKwh)
                                    ->orWhereNull('max'); // Handle unlimited tier
                            })
                            ->first();

                        if ($rateRange) {
                            $electricityRate = $rateRange->rate;
                        }
                    }
                }
            }

            //========= 3. Calculate solar production factor and usage =========//
            $solarIrradianceAvg = $this->getSolarAverage($lat, $lon); // kWh/m2/day
            $performanceRatio = 0.86;
            $solarProductionFactor = $solarIrradianceAvg !== false ? $solarIrradianceAvg * 365 * $performanceRatio : SolarConfiguration::getByKey('solar_production_factor', 1600);
            $usagePattern = $validated['usage_pattern'] ?? 'balanced';
            $usageData = $this->calculateUsageAndCost($electricityRate, $monthlyBill, $usagePattern);
            $annualUsage = $usageData['annualUsage'] ?? 0;
            $annualCost = $usageData['annualCost'] ?? null;
            $monthlyUsage = $usageData['monthlyUsage'] ?? null;
            $monthlyCost = $usageData['monthlyCost'] ?? null;

            //========= 4. Calculate system sizing and building info =========//
            $coveragePercentage = $request->input('coverage_percentage', 80);
            $coverageTarget = $coveragePercentage / 100;
            $systemCapacity = ($annualUsage * $coverageTarget) / $solarProductionFactor;

            $buildingFloors = $request->input('building_stories', 1);

            //========= 5. Extract roof and address data =========//
            $roofType = $validated['roof_type'] ?? null;
            $roofTiltRaw = $validated['roof_tilt'] ?? null;
            // Convert roof_tilt to degree if needed
            $roofTilt = null;
            if ($roofTiltRaw !== null) {
                if (is_numeric($roofTiltRaw)) {
                    $roofTilt = floatval($roofTiltRaw);
                } else {
                    // Handle string values like 'Low', 'Medium', etc.
                    switch (strtolower($roofTiltRaw)) {
                        case 'low':
                            $roofTilt = 10;
                            break;
                        case 'medium':
                            $roofTilt = 22;
                            break;
                        case 'steep':
                            $roofTilt = 37;
                            break;
                        case 'very steep':
                            $roofTilt = 50;
                            break;
                        default:
                            $roofTilt = 20;
                            break;
                    }
                }
            }

            $street = $validated['street'] ?? null;
            $city = $validated['city'] ?? null;
            $state = $validated['state'] ?? null;
            $zipCode = $validated['zip_code'] ?? null;
            $country = $validated['country'] ?? null;

            //========= 6. Set default tilt, azimuth, and losses =========//
            $tilt = $roofTilt ?? SolarConfiguration::getByKey('optimal_tilt_angle', 20);
            $azimuth = SolarConfiguration::getByKey('default_azimuth', 180);

            // Initialize losses with default - will be recalculated later with actual panel/inverter data
            $losses = SolarConfiguration::getByKey('default_losses_percent', 14);



            //========= 8. Process and save the roof image =========//
            $roofImagePath = null;
            if (!empty($validated['satellite_image'])) {
                $roofImagePath = $this->saveRoofImage($validated['satellite_image'], $userId);
            }

            //========= 9. Call usable area detection API =========//
            $usableAreaResult = null;
            if ($roofImagePath) {
                // Build options array from validated/request data
                $usableAreaOptions = [
                    'roof_point_prompt' => $validated['roof_point_prompt'] ?? null,
                    'roof_point_label' => $validated['roof_point_label'] ?? null,
                    'obstacle_point_prompt' => $validated['obstacle_point_prompt'] ?? null,
                    'obstacle_point_label' => $validated['obstacle_point_label'] ?? null,
                    'meters_per_pixel' => $validated['scale_meters_per_pixel'] ?? null,
                    'roof_type' => $roofType,
                    // Add more fields as needed from request/validated
                ];
                // Remove nulls
                $usableAreaOptions = array_filter($usableAreaOptions, function ($v) {
                    return $v !== null;
                });
                try {
                    $usableAreaResult = $this->callUsableAreaDetectionApi(
                        storage_path('app/public/' . $roofImagePath),
                        $usableAreaOptions
                    );
                } catch (\Exception $e) {
                    Log::warning('Usable area detection API failed', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'image_path' => $roofImagePath
                    ]);
                    $usableAreaResult = null;
                }
            }

            //========= 10. Select best-fit panel =========//
            $bestFitPanel = null;
            if ($usableAreaResult && isset($usableAreaResult['usable_area_m2']) && $usableAreaResult['usable_area_m2'] > 0) {
                $bestFitPanel = $this->selectBestFitPanel(
                    $usableAreaResult['usable_area_m2'],
                    $annualUsage,
                    $solarProductionFactor,
                    $coverageTarget
                );
            }

            //========= 11. Use best-fit panel values for estimation =========//
            if ($bestFitPanel) {
                $panel = $bestFitPanel['panel'];
                $panelCount = $bestFitPanel['panel_count'];
                // $systemCapacity = $bestFitPanel['total_capacity_kw'];
                $annualProduction = $bestFitPanel['total_annual_production_kwh'];
                $panelId = $panel->id;
            } else {
                // Fallback to default panel from configuration when selectBestFitPanel fails
                $defaultPanelId = SolarConfiguration::getByKey('panel_id', 21);
                $panel = \Modules\Estimation\Http\Models\Panel::find($defaultPanelId);

                // Final fallback to first available active panel if default panel not found
                if (!$panel) {
                    $panel = \Modules\Estimation\Http\Models\Panel::where('status', 'active')->first();
                }

                if ($panel) {
                    // Calculate panel count based on system capacity and fallback panel
                    $panelCount = $panel->panel_rated_power > 0 ?
                        ceil(($systemCapacity * 1000) / $panel->panel_rated_power) :
                        ceil($systemCapacity * SolarConfiguration::getByKey('panels_per_kw', 2.5));

                    // Calculate annual production using fallback panel
                    $annualProduction = $systemCapacity * $solarProductionFactor;
                    $panelId = $panel->id;

                    Log::info('Using fallback panel', [
                        'default_panel_id' => $defaultPanelId,
                        'selected_panel_id' => $panelId,
                        'panel_name' => $panel->name,
                        'calculated_panel_count' => $panelCount,
                        'reason' => 'selectBestFitPanel returned null'
                    ]);
                } else {
                    // If even fallback fails, set to null
                    $panel = null;
                    $panelCount = null;
                    $panelId = null;
                    $annualProduction = null;

                    Log::warning('No panel available - neither best fit nor fallback panel found');
                }
            }

            //========= 12. Call solar panel placement API =========//
            $panelPlacementResult = null;
            $panel_grid_image = null;
            $visualization_image = null;
            $panel_grid = null;
            $panel_positions = null;
            if ($panel && $roofImagePath && $usableAreaResult) {
                // Get panel_spacing from request or use default
                // Calculate Winter Solstice angle
                $winterSolsticeAngle = 90 - abs($lat + 23.44);

                // Convert tilt angle to radians for trigonometric functions
                $tiltRad = deg2rad($tilt);

                // Panel dimensions in meters
                $panelLength = $panel->height_mm / 1000.0;
                $panelWidth = $panel->width_mm / 1000.0;

                // Calculate heights for portrait and landscape
                $hp = $panelLength * sin($tiltRad);
                $hl = $panelWidth * sin($tiltRad);

                // Avoid division by zero for tan(0)
                $tanWinterSolstice = tan(deg2rad($winterSolsticeAngle));
                if ($tanWinterSolstice == 0) {
                    $spacingPortrait = 0.3;
                    $spacingLandscape = 0.3;
                } else {
                    $spacingPortrait = $hp / $tanWinterSolstice;
                    $spacingLandscape = $hl / $tanWinterSolstice;
                }

                // Use default if calculation fails
                if (!is_finite($spacingPortrait) || $spacingPortrait <= 0) $spacingPortrait = 0.3;
                if (!is_finite($spacingLandscape) || $spacingLandscape <= 0) $spacingLandscape = 0.3;

                // Pass both spacings as an array to the panel placement API
                $panelSpacing = [
                    'portrait' => $spacingPortrait,
                    'landscape' => $spacingLandscape
                ];
                // Get panel_count if available from bestFitPanel
                $panelCount = isset($panelCount) ? $panelCount : null;
                $panelPlacementResult = $this->callSolarPanelPlacementApi(
                    storage_path('app/public/' . $roofImagePath),
                    $usableAreaResult,
                    $panel,
                    $lat,
                    $lon,
                    $azimuth,
                    $tilt,
                    $solarProductionFactor, // Use as annual irradiance
                    $panelSpacing,
                    $panelCount
                );
                // Save panel placement API results if available
                $panel_grid_image = $panelPlacementResult['panel_grid_image'] ?? null;
                $visualization_image = $panelPlacementResult['visualization_image'] ?? null;
                $panel_grid = isset($panelPlacementResult['panel_grid']) ? json_encode($panelPlacementResult['panel_grid']) : null;
                $panel_positions = isset($panelPlacementResult['panel_positions']) ? json_encode($panelPlacementResult['panel_positions']) : null;
            }

            //========= 12b. Estimate mounting structure cost =========//
            $mountingStructureCost = null;
            if ($panel && $panelCount) {
                // Prepare panel array for estimateStructureCost
                $panelArr = [
                    'width' => $panel->width_mm ? $panel->width_mm / 1000.0 : 1.0,
                    'height' => $panel->height_mm ? $panel->height_mm / 1000.0 : 2.0,
                    'power' => $panel->panel_rated_power ?? 400,
                ];
                $installationType = 'rooftop'; // Adjust as needed
                $roofTypeVal = $roofType ?? 'flat';
                $orientation = 'portrait'; // Could be dynamic if needed
                $mountingStructureCost = $this->estimateStructureCost(
                    $panelArr,
                    $panelCount,
                    $installationType,
                    $roofTypeVal,
                    $orientation
                );
            }

            //========= 12c. Inverter and stringing selection =========//
            $inverterDesign = null;
            $inverterCombos = [];
            $stringingDetails = [];
            if ($panel && $panelCount) {
                $inverterDesign = $this->selectBestInverterCombo($panel->id, $panelCount);

                // Check if there's an error in inverter selection
                if (isset($inverterDesign['error'])) {
                    // Log the error but continue with fallback values
                    Log::warning('Inverter selection failed', [
                        'panel_id' => $panel->id,
                        'panel_count' => $panelCount,
                        'error' => $inverterDesign['error'],
                        'message' => $inverterDesign['message']
                    ]);

                    // Use fallback inverter configuration
                    $inverterDesign = [
                        'combo' => [],
                        'error' => $inverterDesign['error'],
                        'message' => $inverterDesign['message']
                    ];
                } elseif (!empty($inverterDesign['combo'])) {
                    foreach ($inverterDesign['combo'] as $combo) {
                        $inverterCombos[] = [
                            'model' => $combo['model'] ?? '',
                            'qty' => $combo['qty'] ?? 1,
                            'stringing' => $combo['stringing'] ?? []
                        ];
                        if (!empty($combo['stringing'])) {
                            $stringingDetails[] = [
                                'inverter_model' => $combo['model'] ?? '',
                                'inverter_qty' => $combo['qty'] ?? 1,
                                'stringing_config' => $combo['stringing']
                            ];
                        }
                    }
                }
            }

            //========= 12d. Calculate wiring requirements =========//
            $wiringCalculation = null;
            try {
                if ($panel && $panelCount && !empty($stringingDetails) && !empty($inverterDesign['combo'])) {
                    // Prepare panel specifications for wiring calculation
                    $panelSpecs = [
                        'vmp' => $panel->maximum_operating_voltage_vmpp ?? 30, // Operating voltage
                        'imp' => $panel->maximum_operating_current_impp ?? ($panel->panel_rated_power / ($panel->maximum_operating_voltage_vmpp ?? 30)), // Operating current
                        'voc' => $panel->open_circuit_voltage ?? 37, // Open circuit voltage
                        'isc' => $panel->short_circuit_current ?? (($panel->maximum_operating_current_impp ?? 10) * 1.2) // Short circuit current (estimate)
                    ];

                    // Estimate building floors (from request or default)
                    $buildingFloors = $request->input('building_stories', 1);

                    // Generate wiring specifications using the new methods
                    $wiringSpecs = $this->generateWiringSpecs($inverterDesign, $panelSpecs, $buildingFloors);

                    // Generate Bill of Materials and costs
                    $wiringBOM = $this->generateBOM($wiringSpecs);

                    $wiringCalculation = [
                        'wiring_specs' => $wiringSpecs,
                        'bill_of_materials' => $wiringBOM['bom'],
                        'total_cost_mad' => $wiringBOM['total_cost_mad'],
                        'panel_specs_used' => $panelSpecs,
                        'building_floors' => $buildingFloors
                    ];
                }
            } catch (\Exception $e) {
                Log::error('Wiring calculation failed', [
                    'error' => $e->getMessage(),
                    'line' => $e->getLine(),
                    'file' => $e->getFile(),
                    'trace' => $e->getTraceAsString()
                ]);

                // Set wiring calculation to error state but continue processing
                $wiringCalculation = [
                    'error' => $e->getMessage(),
                    'debug_info' => [
                        'panel_exists' => $panel ? true : false,
                        'panel_count' => $panelCount,
                        'stringing_details_empty' => empty($stringingDetails),
                        'inverter_combo_empty' => empty($inverterDesign['combo'])
                    ]
                ];
            }

            //========= 6e. Calculate system losses using actual component data =========//
            // dd($panel, $wiringCalculation);
            if ($panel && $wiringCalculation) {

                // Extract voltage drops from wiring calculation
                $dcVoltageDrops = [];
                $acVoltageDrops = [];

                if (isset($wiringCalculation['wiring_specs']) && is_array($wiringCalculation['wiring_specs'])) {
                    foreach ($wiringCalculation['wiring_specs'] as $spec) {
                        if ($spec['type'] === 'dc' && isset($spec['voltage_drop_percent'])) {
                            $dcVoltageDrops[] = $spec['voltage_drop_percent'];
                        } elseif ($spec['type'] === 'ac' && isset($spec['voltage_drop_percent'])) {
                            $acVoltageDrops[] = $spec['voltage_drop_percent'];
                        }
                    }
                }

                // Use actual voltage drops if available, otherwise defaults
                $dc_voltage_drop = !empty($dcVoltageDrops) ? max($dcVoltageDrops) : 1.0; // Use worst case DC voltage drop
                $ac_voltage_drop = !empty($acVoltageDrops) ? max($acVoltageDrops) : 1.0; // Use worst case AC voltage drop

                // Get panel efficiency
                $eta_panel = ($panel->module_efficiency && $panel->module_efficiency > 0) ?
                    $panel->module_efficiency / 100.0 : 0.20; // Default 20% if missing

                // Get inverter efficiency from inverter design
                $eta_inverter = 0.95; // Default 95%
                if ($inverterDesign && !empty($inverterDesign['combo'])) {
                    $inverterEfficiencies = [];
                    foreach ($inverterDesign['combo'] as $combo) {
                        if (isset($combo['model'])) {
                            $inverter = Inverter::where('name', $combo['model'])->first();
                            if ($inverter && $inverter->efficiency_max) {
                                $inverterEfficiencies[] = $inverter->efficiency_max;
                            }
                        }
                    }
                    if (!empty($inverterEfficiencies)) {
                        $eta_inverter = array_sum($inverterEfficiencies) / count($inverterEfficiencies) / 100.0;
                    }
                }
                // Calculate system losses using your existing method
                $losses = $this->calculateTotalSystemLoss(
                    $dc_voltage_drop,
                    $eta_inverter,
                    $ac_voltage_drop
                );
            }

            //========= 7. Call PVWatts API for solar estimation =========//

            $pvWatts = new PVWattsController();
            $pvWattsData = $pvWatts->getEstimate($lat, $lon, $systemCapacity, $tilt, $azimuth, $losses);

            if (!$pvWattsData instanceof \Illuminate\Http\JsonResponse) {
                Log::error('PVWatts API failed to return proper response', [
                    'response' => $pvWattsData
                ]);
                return redirect()->route('estimation.index')
                    ->withInput()
                    ->with('error', 'Failed to retrieve solar estimation data.');
            }

            $solarData = $pvWattsData->getData();


            //========= 13. Prepare data for DB and monthly breakdown =========//
            $roofPolygon = isset($usableAreaResult['roof_polygon']) ? json_encode($usableAreaResult['roof_polygon']) : null;
            $usablePolygon = isset($usableAreaResult['usable_polygon']) ? json_encode($usableAreaResult['usable_polygon']) : null;
            $usableArea = $usableAreaResult['usable_area'] ?? null;
            $usableAreaM2 = $usableAreaResult['usable_area_m2'] ?? null;
            $roofMaskImage = $usableAreaResult['roof_mask_image'] ?? null;
            $overlayImage = $usableAreaResult['overlay_image'] ?? null;
            $samMasks = isset($usableAreaResult['sam_masks']) ? json_encode($usableAreaResult['sam_masks']) : null;
            $roofMaskIndex = $usableAreaResult['roof_mask_index'] ?? null;
            $facadeReductionRatio = $usableAreaResult['facade_reduction_ratio'] ?? null;
            $roofTypeDetected = $usableAreaResult['roof_type'] ?? null;
            $facadeFilteringApplied = $usableAreaResult['facade_filtering_applied'] ?? false; // Default to false instead of null
            $metersPerPixel = $usableAreaResult['meters_per_pixel'] ?? null;
            // Extract monthly data values
            $dcMonthly = [];
            $poaMonthly = [];
            $solradMonthly = [];
            $acMonthly = [];
            if (isset($solarData->monthlyData)) {
                foreach ($solarData->monthlyData as $month => $data) {
                    $dcMonthly[$month] = $data->dc_monthly ?? 0;
                    $poaMonthly[$month] = $data->poa_monthly ?? 0;
                    $solradMonthly[$month] = $data->solrad_monthly ?? 0;
                    $acMonthly[$month] = $data->ac_monthly ?? 0;
                }
            }

            //========= 14. Debug: Display all collected data before saving =========//
            // dd([
            //     'VALIDATION_DATA' => [
            //         'validated_input' => $validated,
            //         'user_id' => $userId,
            //         'coordinates' => ['lat' => $lat, 'lon' => $lon],
            //         'address' => compact('street', 'city', 'state', 'zipCode', 'country'),
            //         'building_floors' => $buildingFloors,
            //         'roof_type' => $roofType,
            //         'roof_tilt' => $roofTilt,
            //     ],
            //     'UTILITY_AND_RATES' => [
            //         'utility' => $utility,
            //         'electricity_rate' => $electricityRate,
            //         'monthly_bill' => $monthlyBill,
            //     ],
            //     'SOLAR_CALCULATIONS' => [
            //         'solar_irradiance_avg' => $solarIrradianceAvg,
            //         'performance_ratio' => $performanceRatio,
            //         'solar_production_factor' => $solarProductionFactor,
            //         'coverage_percentage' => $coveragePercentage,
            //         'coverage_target' => $coverageTarget,
            //         'system_capacity' => $systemCapacity,
            //         'tilt' => $tilt,
            //         'azimuth' => $azimuth,
            //         'losses' => $losses,
            //     ],
            //     'USAGE_DATA' => [
            //         'usage_pattern' => $usagePattern,
            //         'annual_usage' => $annualUsage,
            //         'annual_cost' => $annualCost,
            //         'monthly_usage' => $monthlyUsage,
            //         'monthly_cost' => $monthlyCost,
            //     ],
            //     'PVWATTS_API_DATA' => [
            //         'solar_data_response' => $solarData,
            //         'dc_monthly' => $dcMonthly,
            //         'poa_monthly' => $poaMonthly,
            //         'solrad_monthly' => $solradMonthly,
            //         'ac_monthly' => $acMonthly,
            //         'annual_production' => $annualProduction,
            //     ],
            //     'ROOF_IMAGE_DATA' => [
            //         'roof_image_path' => $roofImagePath,
            //         'satellite_image_provided' => !empty($validated['satellite_image']),
            //     ],
            //     'USABLE_AREA_API_DATA' => [
            //         'usable_area_result' => $usableAreaResult,
            //         'processed_data' => [
            //             'roof_polygon' => $roofPolygon,
            //             'usable_polygon' => $usablePolygon,
            //             'usable_area' => $usableArea,
            //             'usable_area_m2' => $usableAreaM2,
            //             'roof_mask_image' => $roofMaskImage,
            //             'overlay_image' => $overlayImage,
            //             'sam_masks' => $samMasks,
            //             'roof_mask_index' => $roofMaskIndex,
            //             'facade_reduction_ratio' => $facadeReductionRatio,
            //             'roof_type_detected' => $roofTypeDetected,
            //             'facade_filtering_applied' => $facadeFilteringApplied,
            //             'meters_per_pixel' => $metersPerPixel,
            //         ]
            //     ],
            //     'PANEL_SELECTION_DATA' => [
            //         'best_fit_panel_result' => $bestFitPanel,
            //         'selected_panel' => $panel,
            //         'panel_id' => $panelId,
            //         'panel_count' => $panelCount,
            //     ],
            //     'PANEL_PLACEMENT_API_DATA' => [
            //         'panel_placement_result' => $panelPlacementResult,
            //         'spacing_calculations' => [
            //             'winter_solstice_angle' => $winterSolsticeAngle ?? null,
            //             'tilt_rad' => $tiltRad ?? null,
            //             'panel_length' => $panelLength ?? null,
            //             'panel_width' => $panelWidth ?? null,
            //             'hp' => $hp ?? null,
            //             'hl' => $hl ?? null,
            //             'tan_winter_solstice' => $tanWinterSolstice ?? null,
            //             'spacing_portrait' => $spacingPortrait ?? null,
            //             'spacing_landscape' => $spacingLandscape ?? null,
            //             'panel_spacing' => $panelSpacing ?? null,
            //         ],
            //         'generated_images' => [
            //             'panel_grid_image' => $panel_grid_image,
            //             'visualization_image' => $visualization_image,
            //         ],
            //         'placement_data' => [
            //             'panel_grid' => $panel_grid,
            //             'panel_positions' => $panel_positions,
            //         ]
            //     ],
            //     'MOUNTING_STRUCTURE_DATA' => [
            //         'mounting_structure_cost' => $mountingStructureCost,
            //         'structure_parameters' => [
            //             'installation_type' => $installationType ?? null,
            //             'roof_type_val' => $roofTypeVal ?? null,
            //             'orientation' => $orientation ?? null,
            //             'panel_arr' => $panelArr ?? null,
            //         ]
            //     ],
            //     'INVERTER_DESIGN_DATA' => [
            //         'inverter_design' => $inverterDesign,
            //         'inverter_combos' => $inverterCombos,
            //         'stringing_details' => $stringingDetails,
            //     ],
            //     'WIRING_CALCULATION_DATA' => [
            //         'wiring_calculation' => $wiringCalculation,
            //         'panel_specs_for_wiring' => [
            //             'vmp' => $panel->maximum_operating_voltage_vmpp ?? null,
            //             'imp' => $panel->maximum_operating_current_impp ?? null,
            //             'voc' => $panel->open_circuit_voltage ?? null,
            //             'isc' => $panel->short_circuit_current ?? null,
            //         ],
            //     ],
            //     'USABLE_AREA_OPTIONS' => [
            //         'api_options_sent' => $usableAreaOptions ?? null,
            //     ],
            //     'ENVIRONMENT_COMPLEXITY' => [
            //         'wind_and_snow_data' => isset($lat, $lon) ? $this->getWindAndSnowComplexity($lat, $lon) : null,
            //     ],
            //     'API_STATUS' => [
            //         'pvwatts_api_success' => $pvWattsData instanceof \Illuminate\Http\JsonResponse,
            //         'usable_area_api_success' => !is_null($usableAreaResult),
            //         'panel_placement_api_success' => !is_null($panelPlacementResult),
            //         'best_fit_panel_found' => !is_null($bestFitPanel),
            //         'inverter_design_success' => !isset($inverterDesign['error']),
            //         'wiring_calculation_success' => !isset($wiringCalculation['error']),
            //     ]
            // ]);

            //========= 15. Save estimation to DB =========//
            
            // Extract environmental complexity data
            $windSnowData = $this->getWindAndSnowComplexity($lat, $lon);
            $windSpeed = $windSnowData['wind_speed'] ?? 0.0;
            $elevation = $windSnowData['elevation'] ?? 0.0;
            $windComplexity = $windSnowData['wind_complexity'] ?? 0.0;
            $snowComplexity = $windSnowData['snow_complexity'] ?? 0.0;
            
            // Extract system loss calculation parameters
            $eta_panel_val = ($panel && $panel->module_efficiency) ? $panel->module_efficiency / 100.0 : 0.20;
            $eta_temperature_val = SolarConfiguration::getByKey('eta_temperature', 0.85);
            $eta_soiling_val = SolarConfiguration::getByKey('eta_soiling', 0.95);
            $eta_mismatch_val = SolarConfiguration::getByKey('eta_mismatch', 0.98);
            $eta_other_val = SolarConfiguration::getByKey('eta_other', 0.95);
            
            // Extract voltage drops from wiring calculation
            $dc_voltage_drop_val = 1.0; // Default 1% DC voltage drop
            $ac_voltage_drop_val = 1.0; // Default 1% AC voltage drop
            $eta_inverter_val = 0.95; // Default 95% inverter efficiency
            
            if ($wiringCalculation && !isset($wiringCalculation['error'])) {
                $dcVoltageDrops = [];
                $acVoltageDrops = [];
                
                if (isset($wiringCalculation['wiring_specs']) && is_array($wiringCalculation['wiring_specs'])) {
                    foreach ($wiringCalculation['wiring_specs'] as $spec) {
                        if ($spec['type'] === 'dc' && isset($spec['voltage_drop_percent'])) {
                            $dcVoltageDrops[] = $spec['voltage_drop_percent'];
                        } elseif ($spec['type'] === 'ac' && isset($spec['voltage_drop_percent'])) {
                            $acVoltageDrops[] = $spec['voltage_drop_percent'];
                        }
                    }
                }
                
                $dc_voltage_drop_val = !empty($dcVoltageDrops) ? max($dcVoltageDrops) : 1.0;
                $ac_voltage_drop_val = !empty($acVoltageDrops) ? max($acVoltageDrops) : 1.0;
                
                // Get inverter efficiency
                if ($inverterDesign && !empty($inverterDesign['combo'])) {
                    $inverterEfficiencies = [];
                    foreach ($inverterDesign['combo'] as $combo) {
                        if (isset($combo['model']) && isset($combo['model']->efficiency_max)) {
                            $inverterEfficiencies[] = $combo['model']->efficiency_max;
                        }
                    }
                    if (!empty($inverterEfficiencies)) {
                        $eta_inverter_val = array_sum($inverterEfficiencies) / count($inverterEfficiencies) / 100.0;
                    } else {
                        $eta_inverter_val = 0.95; // Keep default if no efficiency data found
                    }
                }
            }
            
            // API success tracking
            $apiSuccessData = [
                'pvwatts_api_success' => $pvWattsData instanceof \Illuminate\Http\JsonResponse,
                'usable_area_api_success' => !is_null($usableAreaResult),
                'panel_placement_api_success' => !is_null($panelPlacementResult),
                'best_fit_panel_found' => !is_null($bestFitPanel),
                'inverter_design_success' => !isset($inverterDesign['error']),
                'wiring_calculation_success' => !isset($wiringCalculation['error']),
            ];
            
            // Prepare estimation data array
            $estimationData = [
                'user_id' => $userId,
                'latitude' => $lat,
                'longitude' => $lon,
                'street' => $street,
                'city' => $city,
                'state' => $state,
                'zip_code' => $zipCode,
                'country' => $country,
                'search_query' => $validated['search_query'] ?? null,
                'roof_image_path' => $roofImagePath,
                'annual_usage_kwh' => $annualUsage,
                'annual_cost' => $annualCost,
                'monthly_usage' => $monthlyUsage ? json_encode($monthlyUsage) : null,
                'monthly_cost' => $monthlyCost ? json_encode($monthlyCost) : null,
                'utility_company' => $utility ? $utility->name : null,
                'utility_id' => $utility ? $utility->id : null,
                'monthly_bill' => $monthlyBill,
                'electricity_rate' => $electricityRate,
                'coverage_percentage' => $coveragePercentage,
                'energy_usage_type' => $usagePattern,
                'system_capacity' => $systemCapacity,
                'tilt' => $tilt,
                'annual_production_per_kw' => isset($annualProduction) && $systemCapacity > 0 ? $annualProduction / $systemCapacity : null,
                'azimuth' => $azimuth,
                'losses' => $losses,
                'building_floors' => $buildingFloors,
                'roof_type' => $roofType,
                'roof_tilt' => $roofTilt,
                'dc_monthly' => $dcMonthly ? json_encode($dcMonthly) : null,
                'poa_monthly' => $poaMonthly ? json_encode($poaMonthly) : null,
                'solrad_monthly' => $solradMonthly ? json_encode($solradMonthly) : null,
                'ac_monthly' => $acMonthly ? json_encode($acMonthly) : null,
                'energy_annual' => $annualProduction,
                'capacity_factor' => $solarData->capacityFactor ?? null,
                'solrad_annual' => $solarData->solradAnnual ?? null,
                'status' => 'completed',
                // Usable area detection fields (store as JSON or string)
                'roof_polygon' => $roofPolygon,
                'usable_polygon' => $usablePolygon,
                'usable_area' => $usableArea,
                'usable_area_m2' => $usableAreaM2,
                'roof_mask_image' => $roofMaskImage,
                'overlay_image' => $overlayImage,
                'sam_masks' => $samMasks,
                'roof_mask_index' => $roofMaskIndex,
                'facade_reduction_ratio' => $facadeReductionRatio,
                'roof_type_detected' => $roofTypeDetected,
                'facade_filtering_applied' => $facadeFilteringApplied,
                'meters_per_pixel' => $metersPerPixel,
                'panel_id' => $panelId,
                'panel_count' => $panelCount,
                // Panel placement API results
                'panel_grid_image' => $panel_grid_image,
                'visualization_image' => $visualization_image,
                'panel_grid' => $panel_grid,
                'panel_positions' => $panel_positions,
                
                // Enhanced Solar Calculation Data
                'solar_irradiance_avg' => $solarIrradianceAvg,
                'performance_ratio' => $performanceRatio,
                'solar_production_factor' => $solarProductionFactor,
                
                // Mounting Structure Cost Data
                'mounting_structure_cost' => $mountingStructureCost ? json_encode($mountingStructureCost) : null,
                'installation_type' => 'rooftop',
                'panel_orientation' => 'portrait',
                
                // Inverter Design Data
                'inverter_design' => $inverterDesign ? json_encode($inverterDesign) : null,
                'inverter_combos' => $inverterCombos ? json_encode($inverterCombos) : null,
                'stringing_details' => $stringingDetails ? json_encode($stringingDetails) : null,
                
                // Wiring Calculation Data
                'wiring_calculation' => $wiringCalculation ? json_encode($wiringCalculation) : null,
                'wiring_specs' => isset($wiringCalculation['wiring_specs']) ? json_encode($wiringCalculation['wiring_specs']) : null,
                'wiring_bom' => isset($wiringCalculation['bill_of_materials']) ? json_encode($wiringCalculation['bill_of_materials']) : null,
                'wiring_cost_mad' => $wiringCalculation['total_cost_mad'] ?? null,
                
                // Panel Spacing Calculations
                'winter_solstice_angle' => $winterSolsticeAngle ?? null,
                'spacing_portrait' => $spacingPortrait ?? null,
                'spacing_landscape' => $spacingLandscape ?? null,
                
                // Environmental Complexity Data
                'wind_speed' => $windSpeed,
                'elevation' => $elevation,
                'wind_complexity' => $windComplexity,
                'snow_complexity' => $snowComplexity,
                
                // API Success Tracking
                'pvwatts_api_success' => $apiSuccessData['pvwatts_api_success'],
                'usable_area_api_success' => $apiSuccessData['usable_area_api_success'],
                'panel_placement_api_success' => $apiSuccessData['panel_placement_api_success'],
                'best_fit_panel_found' => $apiSuccessData['best_fit_panel_found'],
                'inverter_design_success' => $apiSuccessData['inverter_design_success'],
                'wiring_calculation_success' => $apiSuccessData['wiring_calculation_success'],
                
                // System Loss Calculation Details
                'eta_panel' => $eta_panel_val,
                'eta_temperature' => $eta_temperature_val,
                'eta_soiling' => $eta_soiling_val,
                'eta_mismatch' => $eta_mismatch_val,
                'dc_voltage_drop' => $dc_voltage_drop_val,
                'eta_inverter' => $eta_inverter_val,
                'ac_voltage_drop' => $ac_voltage_drop_val,
                'eta_other' => $eta_other_val,
                
                // Best Fit Panel Results
                'best_fit_panel_result' => $bestFitPanel ? json_encode($bestFitPanel) : null,
                'total_capacity_kw' => $bestFitPanel['total_capacity_kw'] ?? $systemCapacity,
                'total_annual_production_kwh' => $bestFitPanel['total_annual_production_kwh'] ?? $annualProduction,
                
                // Usage Pattern Data Enhancement
                'usage_data_breakdown' => json_encode([
                    'usage_pattern' => $usagePattern,
                    'monthly_usage' => $monthlyUsage,
                    'monthly_cost' => $monthlyCost,
                    'coverage_target' => $coverageTarget,
                    'electricity_rate' => $electricityRate
                ]),
                
                // Error Tracking
                'api_errors' => json_encode([
                    'inverter_design_error' => $inverterDesign['error'] ?? null,
                    'wiring_calculation_error' => $wiringCalculation['error'] ?? null,
                ]),
            ];
            
            try {
                // Create and save the estimation
                $estimation = new \Modules\Estimation\Http\Models\Estimation($estimationData);
                $estimation->save();
                
                Log::info('Estimation saved successfully', [
                    'estimation_id' => $estimation->id,
                    'user_id' => $userId
                ]);
                
            } catch (\Exception $e) {
                Log::error('Error saving estimation to database', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'user_id' => $userId,
                    'data_keys' => array_keys($estimationData)
                ]);
                
                // Return with error message
                return redirect()->route('estimation.index')
                    ->withInput()
                    ->with('error', 'Failed to save estimation: ' . $e->getMessage());
            }            //========= 15. Store estimation in session and redirect =========//
            session([
                'solar_estimation' => $solarData,
                'estimation_id' => $estimation->id
            ]);

            return redirect()->route('estimation.details', ['id' => $estimation->id])
                ->with('success', 'Solar estimation completed successfully');
        } catch (\Exception $e) {
            dd('Error creating solar estimation', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            Log::error('Error in createProject method', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            session()->flash('error', 'An error occurred: ' . $e->getMessage());
            session()->flash('error_details', $e->getTraceAsString());

            return redirect()->route('estimation.index')
                ->withInput()
                ->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function callSolarPanelPlacementApi($roofImagePath, $usableAreaResult, $panel, $lat, $lon, $roofAzimuth, $roofTilt, $annualIrradiance, $panelSpacing = 0.3, $panelCount = null)
    {
        try {
            $apiUrl = config('services.solar_panel_placement.url', 'http://192.168.1.22/solar_panel_placement');
            // Always provide roof_area as float (required by API)
            $roofArea = null;
            if (isset($usableAreaResult['roof_area']) && is_numeric($usableAreaResult['roof_area'])) {
                $roofArea = (float)$usableAreaResult['roof_area'];
            } elseif (isset($usableAreaResult['usable_area']) && is_numeric($usableAreaResult['usable_area'])) {
                $roofArea = (float)$usableAreaResult['usable_area'];
            } else {
                $roofArea = 0.0; // fallback to 0.0 if not available
            }

            $fields = [
                'roof_polygon' => $usableAreaResult['roof_polygon'] ?? null,
                'obstacles' => $usableAreaResult['obstacles'] ?? '[]',
                'usable_polygon' => $usableAreaResult['usable_polygon'] ?? null,
                'usable_area' => $usableAreaResult['usable_area'] ?? null,
                'roof_area' => $roofArea,
                'panel_width' => $panel->width_mm ? $panel->width_mm / 1000.0 : 2.0,
                'panel_height' => $panel->height_mm ? $panel->height_mm / 1000.0 : 1.0,
                'panel_power' => $panel->panel_rated_power ?? 400,
                'latitude' => $lat,
                'longitude' => $lon,
                'roof_azimuth' => $roofAzimuth,
                'roof_tilt' => $roofTilt,
                'annual_irradiance' => $annualIrradiance,
                // Optionals
                'meters_per_pixel' => $usableAreaResult['meters_per_pixel'] ?? 0.3,
                'roof_type' => $usableAreaResult['roof_type'] ?? 'flat',
                'panel_spacing' => $panelSpacing,
            ];
            if ($panelCount !== null) {
                $fields['panel_count'] = $panelCount;
            }
            // Remove nulls
            $fields = array_filter($fields, function ($v) {
                return $v !== null;
            });

            $multipart = [];
            foreach ($fields as $key => $value) {
                $multipart[] = [
                    'name' => $key,
                    'contents' => is_array($value) ? json_encode($value) : $value
                ];
            }
            // Add image file
            $multipart[] = [
                'name' => 'image',
                'contents' => fopen($roofImagePath, 'r'),
                'filename' => basename($roofImagePath)
            ];

            $client = new \GuzzleHttp\Client();
            $response = $client->request('POST', $apiUrl, [
                'multipart' => $multipart,
                'timeout' => 60,
            ]);
            if ($response->getStatusCode() === 200) {
                return json_decode($response->getBody(), true);
            }
        } catch (\Exception $e) {
            dd('Error calling solar panel placement API', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'roofImagePath' => $roofImagePath,
                'usableAreaResult' => $usableAreaResult,
                'panel' => $panel,
                'lat' => $lat,
                'lon' => $lon,
                'roofAzimuth' => $roofAzimuth,
                'roofTilt' => $roofTilt,
                'annualIrradiance' => $annualIrradiance,
                'panelSpacing' => $panelSpacing,
                'panelCount' => $panelCount
            ]);
            Log::warning('Solar panel placement API failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
        return null;
    }

    /**
     * Save roof image from data URL to storage
     *
     * @param string $dataUrl
     * @param int|string $userId
     * @return string|null
     */
    private function saveRoofImage($dataUrl, $userId)
    {
        try {
            // Extract the base64 encoded image data
            $image = explode(';base64,', $dataUrl);
            if (count($image) < 2) {
                Log::error('Invalid image data URL format');
                return null;
            }

            $imageData = base64_decode($image[1]);
            if (!$imageData) {
                Log::error('Failed to decode base64 image data');
                return null;
            }

            // Create filename and path
            $filename = 'roof_' . $userId . '_' . time() . '.png';
            $directory = 'roof_images';

            // Ensure the directory exists
            if (!Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->makeDirectory($directory);
            }

            $path = $directory . '/' . $filename;

            // Save the image
            if (Storage::disk('public')->put($path, $imageData)) {
                Log::info('Roof image saved successfully', ['path' => $path]);
                return $path;
            } else {
                Log::error('Failed to save roof image');
                return null;
            }
        } catch (\Exception $e) {
            Log::error('Error saving roof image', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    public function getOptimalPvgisData(float $lat, float $lon, float $systemCapacity, float $losses)
    {
        $url = 'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc';

        $params = [
            'lat' => $lat,
            'lon' => $lon,
            'peakpower' => $systemCapacity,
            'loss' => $losses,
            'outputformat' => 'json'
        ];

        $response = Http::get($url, $params);

        if ($response->successful()) {
            $data = $response->json();

            // Extract the optimum tilt (slope) and azimuth
            $mountingSystem = $data['inputs']['mounting_system']['fixed'] ?? [];

            $optimumTilt = $mountingSystem['slope']['value'] ?? null;

            $azimuth = $mountingSystem['azimuth']['value'] ?? null;

            return [

                'optimum_tilt_deg' => $optimumTilt,
                'azimuth_deg' => $azimuth,
                'monthly_energy_kwh' => $data['outputs']['monthly']['fixed'] ?? [],
                'annual_energy_kwh' => $data['outputs']['totals']['fixed']['E_y'] ?? null,
                'total_losses_percent' => $data['outputs']['totals']['fixed']['l_total'] ?? null
            ];
        }

        return [
            'error' => 'Failed to fetch data from PVGIS',
            'status' => $response->status(),
            'details' => $response->body()
        ];
    }
    /**
     * Admin index page for estimations
     *
     * @return \Illuminate\Contracts\View\View
     */
    public function adminIndex()
    {
        // Get all estimations with pagination
        $projects = \Modules\Estimation\Http\Models\Estimation::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(10); // Show 10 items per page

        // Add customer information to each project
        foreach ($projects as $project) {
            $project->customer_name = $project->user ? $project->user->name : 'Unknown Customer';
            $project->email = $project->user ? $project->user->email : null;
        }

        // Check if we have any estimations
        if ($projects->isEmpty()) {
            $error = 'No estimations found.';
        }
        return view('admin.estimation.index', compact('projects'));
    }

    /**
     * Admin show page for a specific estimation
     *
     * @param int $id
     * @return \Illuminate\Contracts\View\View
     */
    public function adminShow($id)
    {
        try {
            // Find the estimation by ID with user and panel relationships
            $estimation = \Modules\Estimation\Http\Models\Estimation::with(['user', 'panel'])->findOrFail($id);

            // Check if the current user owns this estimation
            // Comment out for admin - Admin should be able to view all estimations
            // if ($estimation->user_id !== Auth::id()) {
            //     return redirect()->route('myproject')
            //         ->with('error', 'You do not have permission to view this estimation.');
            // }

            // Get customer information
            $customerName = $estimation->user ? $estimation->user->name : 'Unknown Customer';
            $customerEmail = $estimation->user ? $estimation->user->email : null;

            // Decode the JSON-encoded monthly data - handle both JSON strings and arrays
            $dcMonthly = is_string($estimation->dc_monthly) ? json_decode($estimation->dc_monthly, true) : $estimation->dc_monthly;
            $poaMonthly = is_string($estimation->poa_monthly) ? json_decode($estimation->poa_monthly, true) : $estimation->poa_monthly;
            $solradMonthly = is_string($estimation->solrad_monthly) ? json_decode($estimation->solrad_monthly, true) : $estimation->solrad_monthly;
            $acMonthly = is_string($estimation->ac_monthly) ? json_decode($estimation->ac_monthly, true) : $estimation->ac_monthly;

            // Prepare the monthly data for the view
            $monthlyData = [];
            $monthlyConsumption = [];

            // Map of month names to match the JSON keys
            $monthsMap = [
                'Jan' => 'January',
                'Feb' => 'February',
                'Mar' => 'March',
                'Apr' => 'April',
                'May' => 'May',
                'Jun' => 'June',
                'Jul' => 'July',
                'Aug' => 'August',
                'Sep' => 'September',
                'Oct' => 'October',
                'Nov' => 'November',
                'Dec' => 'December'
            ];

            $months = array_keys($monthsMap);

            foreach ($months as $index => $month) {
                // Calculate estimated monthly consumption based on annual usage
                $monthlyConsumption[$index] = $estimation->annual_usage_kwh / 12;

                $fullMonth = $monthsMap[$month];

                $monthlyData[] = [
                    'month' => $month,
                    'dc_output' => $dcMonthly[$fullMonth] ?? 0,
                    'poa' => $poaMonthly[$fullMonth] ?? 0,
                    'solrad' => $solradMonthly[$fullMonth] ?? 0,
                    'ac_output' => $acMonthly[$fullMonth] ?? 0,
                ];
            }

            // Financial calculations
            $electricityRate = SolarConfiguration::getByKey('electricity_rate', 1.4);

            // Calculate number of panels needed based on actual panel data or fallback
            if ($estimation->panel && $estimation->panel->panel_rated_power > 0) {
                // Use dynamic calculation based on actual panel power
                $panelsPerKw = 1000 / $estimation->panel->panel_rated_power;
                $panelCount = $estimation->panel_count ?: ceil($estimation->system_capacity * $panelsPerKw);
            } else {
                // Fallback to config value if no panel data available
                $panelCount = $estimation->panel_count ?: ceil($estimation->system_capacity * SolarConfiguration::getByKey('panels_per_kw', 2.5));
            }

            // Calculate panel cost based on count and individual price
            $panelPrice = SolarConfiguration::getByKey('single_panel_price', 3200); // Price per panel
            $panelCost = $panelCount * $panelPrice;

            // Calculate number of inverters needed (typically 1 inverter per system or based on capacity)
            $inverterCount = max(1, ceil($estimation->system_capacity / SolarConfiguration::getByKey('inverter_capacity_kw', 10))); // 1 inverter per 10kW

            // Calculate inverter cost based on count and individual price
            $inverterPrice = SolarConfiguration::getByKey('single_inverter_price', 15000); // Price per inverter
            $inverterCost = $inverterCount * $inverterPrice;

            // Total system cost (panels + inverters)
            $systemCost = $panelCost + $inverterCost;

            $installationCost = $systemCost * (SolarConfiguration::getByKey('installation_cost_percent', 30) / 100);
            $consultationFees = $systemCost * (SolarConfiguration::getByKey('consultation_fees_percent', 5) / 100);
            $totalInvestment = $systemCost + $installationCost + $consultationFees;
            // Return on investment calculations
            $annualSavings = $estimation->energy_annual * $electricityRate;
            $paybackPeriod = $totalInvestment / $annualSavings;
            $systemLifespan = SolarConfiguration::getByKey('system_lifespan_years', 25);
            $lifetimeSavings = $annualSavings * $systemLifespan;
            $roi = (($lifetimeSavings - $totalInvestment) / $totalInvestment) * 100;


            // Environmental impact calculations
            $co2Reduction = $estimation->energy_annual * SolarConfiguration::getByKey('co2_reduction_factor', 0.5);
            $treesEquivalent = $co2Reduction / SolarConfiguration::getByKey('tree_absorption_co2_kg', 20);
            $gasSavings = $estimation->energy_annual * SolarConfiguration::getByKey('gas_savings_per_kwh', 0.1);
            $waterSaved = $estimation->energy_annual * SolarConfiguration::getByKey('water_saved_per_kwh', 5);
            // Set panel_count if it's null or zero using dynamic calculation
            if ($estimation->panel_count === null || $estimation->panel_count == 0) {
                if ($estimation->panel && $estimation->panel->panel_rated_power > 0) {
                    // Use dynamic calculation based on actual panel power
                    $panelsPerKw = 1000 / $estimation->panel->panel_rated_power;
                    $estimation->panel_count = ceil($estimation->system_capacity * $panelsPerKw);
                } else {
                    // Fallback to config value if no panel data available
                    $estimation->panel_count = ceil($estimation->system_capacity * SolarConfiguration::getByKey('panels_per_kw', 2.5));
                }
            }
            // Add values needed for total losses if not set
            $estimation->total_losses_percent = $estimation->losses ??
                SolarConfiguration::getByKey('default_losses_percent', 14);
            return view('admin.estimation.show', [
                'estimation' => $estimation,
                'customerName' => $customerName,
                'customerEmail' => $customerEmail,
                'monthlyData' => $monthlyData,
                'monthlyConsumption' => $monthlyConsumption,
                'electricityRate' => $electricityRate,
                'panelCount' => $panelCount,
                'panelPrice' => $panelPrice,
                'panelCost' => $panelCost,
                'inverterCount' => $inverterCount,
                'inverterPrice' => $inverterPrice,
                'inverterCost' => $inverterCost,
                'systemCost' => $systemCost,
                'installationCost' => $installationCost,
                'consultationFees' => $consultationFees,
                'totalInvestment' => $totalInvestment,
                'annualSavings' => $annualSavings,
                'paybackPeriod' => $paybackPeriod,
                'lifetimeSavings' => $lifetimeSavings,
                'roi' => $roi,
                'co2Reduction' => $co2Reduction,
                'treesEquivalent' => $treesEquivalent,
                'gasSavings' => $gasSavings,
                'waterSaved' => $waterSaved,
                'currencySymbol' => 'dh', // Default currency symbol
                'inverterType' => 'String Inverter',
                'roofType' => 'Standard',
                'inverterType' => $estimation->inverter->name ?? SolarConfiguration::getByKey('default_inverter_type'),
                'roofType' => $estimation->roof_type ?? 'sloped', // Get from database roof_type column
                'panelDegradationRate' => SolarConfiguration::getByKey('panel_degradation_rate', 0.005),
            ]);
        } catch (\Exception $e) {
            Log::error('Error displaying estimation details', [
                'estimation_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('admin.estimation.index')
                ->with('error', 'Unable to load estimation details: ' . $e->getMessage());
        }
    }

    /**
     * Admin update page for a specific estimation
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function adminUpdate(Request $request, $id)
    {
        try {
            // Validate the request
            $validator = validator($request->all(), [
                'system_capacity' => 'required|numeric|min:0.1',
                'tilt' => 'required|numeric|min:0|max:90',
                'azimuth' => 'required|numeric|min:0|max:360',
                'losses' => 'required|numeric|min:0|max:50',
                'annual_usage_kwh' => 'required|numeric|min:1',
                'coverage_percentage' => 'required|numeric|min:1|max:100',
                'street' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:100',
                'state' => 'nullable|string|max:100',
                'zip_code' => 'nullable|string|max:20',
                'country' => 'nullable|string|max:100',
                'utility_company' => 'nullable|string|max:255',
                'roof_type' => 'nullable|string|in:flat,sloped',
                'roof_tilt' => 'nullable|numeric|min:0|max:90',
                'status' => 'required|in:draft,pending,completed,failed',
            ]);

            if ($validator->fails()) {
                return redirect()->back()
                    ->withErrors($validator)
                    ->withInput()
                    ->with('error', 'Please fix the validation errors.');
            }

            // Find the estimation with panel relationship
            $estimation = \Modules\Estimation\Http\Models\Estimation::with('panel')->findOrFail($id);

            // Get validated data
            $validated = $validator->validated();

            // Check if system capacity changed - if so, recalculate solar data
            $recalculate = $estimation->system_capacity != $validated['system_capacity'] ||
                $estimation->tilt != $validated['tilt'] ||
                $estimation->azimuth != $validated['azimuth'];

            if ($recalculate) {
                // Call PVWatts API with new parameters
                $pvWatts = new PVWattsController();
                $pvWattsData = $pvWatts->getEstimate(
                    $estimation->latitude,
                    $estimation->longitude,
                    $validated['system_capacity'],
                    $validated['tilt'],
                    $validated['azimuth'],
                    $validated['losses']
                );

                if ($pvWattsData instanceof \Illuminate\Http\JsonResponse) {
                    $solarData = $pvWattsData->getData();

                    // Extract monthly data values
                    $dcMonthly = [];
                    $poaMonthly = [];
                    $solradMonthly = [];
                    $acMonthly = [];

                    // Process all monthly data
                    if (isset($solarData->monthlyData)) {
                        foreach ($solarData->monthlyData as $month => $data) {
                            $dcMonthly[$month] = $data->dc ?? 0;
                            $poaMonthly[$month] = $data->poa ?? 0;
                            $solradMonthly[$month] = $data->solrad ?? 0;
                            $acMonthly[$month] = $data->ac ?? 0;
                        }
                    }

                    // Update solar-related fields
                    $validated['dc_monthly'] = json_encode($dcMonthly);
                    $validated['poa_monthly'] = json_encode($poaMonthly);
                    $validated['solrad_monthly'] = json_encode($solradMonthly);
                    $validated['ac_monthly'] = json_encode($acMonthly);
                    $validated['energy_annual'] = $solarData->annualProduction;
                    $validated['capacity_factor'] = $solarData->capacityFactor;
                    $validated['solrad_annual'] = $solarData->solradAnnual;
                    $validated['annual_production_per_kw'] = $solarData->annualProduction / $validated['system_capacity'];
                }
            }

            // Calculate panel count based on system capacity if changed
            if ($estimation->system_capacity != $validated['system_capacity']) {
                // Use dynamic calculation if panel data is available
                if ($estimation->panel && $estimation->panel->panel_rated_power > 0) {
                    $panelsPerKw = 1000 / $estimation->panel->panel_rated_power;
                    $validated['panel_count'] = ceil($validated['system_capacity'] * $panelsPerKw);
                } else {
                    // Fallback to config value if no panel data available
                    $validated['panel_count'] = ceil($validated['system_capacity'] * SolarConfiguration::getByKey('panels_per_kw', 2.5));
                }
            }

            // Calculate roof net tilt for sloped roofs
            if (isset($validated['roof_type']) && $validated['roof_type'] === 'sloped' && isset($validated['roof_tilt'])) {
                // Use static optimal tilt angle for Morocco (configurable, defaults to 30°)
                $optimalTilt = SolarConfiguration::getByKey('optimal_tilt_angle', 30);
                $validated['roof_net_tilt'] = abs($validated['roof_tilt'] - $optimalTilt);
            } elseif (isset($validated['roof_type']) && $validated['roof_type'] === 'flat') {
                $validated['roof_net_tilt'] = 0;
            }

            // Update the estimation
            $estimation->update($validated);

            return redirect()->route('admin.estimation.show', $id)
                ->with('success', 'Estimation updated successfully!');
        } catch (\Exception $e) {
            Log::error('Error updating estimation', [
                'estimation_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->back()
                ->withInput()
                ->with('error', 'Unable to update estimation: ' . $e->getMessage());
        }
    }
    public function getSolarAverage($lat, $lon)
    {
        $currentYear = date('Y');
        $endYear = $currentYear - 1;
        $startYear = $endYear - 2;

        $url = "https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=$lon&latitude=$lat&start=$startYear&end=$endYear&format=JSON";

        $response = file_get_contents($url);

        $data = json_decode($response, true);

        if (!$data || !isset($data['properties']['parameter']['ALLSKY_SFC_SW_DWN'])) {
            return false;
        }

        $values = $data['properties']['parameter']['ALLSKY_SFC_SW_DWN'];
        $total = 0;
        $count = 0;

        foreach ($values as $key => $value) {
            if (strlen($key) == 6 && substr($key, -2) != '13' && $value > 0) {
                $total += $value;
                $count++;
            }
        }

        return $count > 0 ? round($total / $count, 2) : false;
    }

    /**
     * Select the best inverter combination with auto stringing for a given panel setup
     */
    public function selectBestInverterCombo(int $panelId, int $panelCount): array
    {
        try {
            // Fetch panel specification
            $panel = Panel::find($panelId);
            if (!$panel) {
                return [
                    'error' => 'Panel not found',
                    'combo' => [],
                    'message' => "Panel with ID {$panelId} not found"
                ];
            }

            // Validate panel properties
            if (!$panel->panel_rated_power || $panel->panel_rated_power <= 0) {
                return [
                    'error' => 'Invalid panel power',
                    'combo' => [],
                    'message' => "Panel {$panel->name} has invalid power rating"
                ];
            }

            // Get all active inverters
            $inverters = Inverter::where('status', 'active')->get();
            if ($inverters->isEmpty()) {
                return [
                    'error' => 'No inverters available',
                    'combo' => [],
                    'message' => 'No active inverters found in database'
                ];
            }

            // Calculate total DC requirement in kW
            $totalDcKw = ($panel->panel_rated_power * $panelCount) / 1000;

            // Add debugging for small systems
            Log::info('Inverter selection debug', [
                'panel_power_w' => $panel->panel_rated_power,
                'panel_count' => $panelCount,
                'total_dc_kw' => $totalDcKw,
                'panel_voc' => $panel->open_circuit_voltage ?? 'missing',
                'panel_vmpp' => $panel->maximum_operating_voltage_vmpp ?? 'missing'
            ]);

            $maxDcAcRatio = 1.35; // Max allowed DC/AC ratio
            $maxQtyPerModel = 10; // Prevent excessive units

            $bestScore = INF;
            $bestConfiguration = null;
            $rejectionReasons = []; // Track why configurations are rejected

            // Try single inverter configurations first
            foreach ($inverters as $inverter) {
                // Validate inverter properties
                if (!$inverter->nominal_ac_power_kw || $inverter->nominal_ac_power_kw <= 0) {
                    $rejectionReasons[] = "Inverter {$inverter->name}: Missing or invalid AC power";
                    continue;
                }
                if (!$inverter->max_dc_input_power || $inverter->max_dc_input_power <= 0) {
                    $rejectionReasons[] = "Inverter {$inverter->name}: Missing or invalid DC input power";
                    continue;
                }

                for ($qty = 1; $qty <= $maxQtyPerModel; $qty++) {
                    $totalAcCapacity = $inverter->nominal_ac_power_kw * $qty;
                    $totalDcCapacity = $inverter->max_dc_input_power * $qty;

                    // Check if this configuration can handle all panels
                    if ($totalDcCapacity >= $totalDcKw && $totalAcCapacity * $maxDcAcRatio >= $totalDcKw) {
                        try {
                            // Calculate stringing for all panels across all inverters
                            $panelsPerInverter = intdiv($panelCount, $qty);
                            $remainingPanels = $panelCount % $qty;

                            $inverterConfigs = [];
                            $totalUsedPanels = 0;

                            for ($i = 0; $i < $qty; $i++) {
                                $panelsForThisInverter = $panelsPerInverter;
                                if ($i < $remainingPanels) {
                                    $panelsForThisInverter++; // Distribute remaining panels
                                }

                                if ($panelsForThisInverter > 0) {
                                    $stringingResult = $this->calculateStringing($panel, $panelsForThisInverter, $inverter);
                                    if (isset($stringingResult['error'])) {
                                        $rejectionReasons[] = "Inverter {$inverter->name} x{$qty}: Stringing failed - {$stringingResult['message']}";
                                        continue 2; // Skip this configuration
                                    }

                                    $inverterConfigs[] = [
                                        'inverter_unit' => $i + 1,
                                        'model' => $inverter->name,
                                        'panels_assigned' => $panelsForThisInverter,
                                        'stringing' => $stringingResult
                                    ];
                                    $totalUsedPanels += $panelsForThisInverter;
                                }
                            }

                            // Only consider if we use ALL panels
                            if ($totalUsedPanels == $panelCount) {
                                $score = $this->scoreConfiguration($inverter, $qty);

                                if ($score < $bestScore) {
                                    $bestScore = $score;
                                    $bestConfiguration = [
                                        'type' => 'single_model',
                                        'inverters' => $inverterConfigs,
                                        'total_inverter_count' => $qty,
                                        'total_ac_kw' => $totalAcCapacity,
                                        'total_dc_kw' => $totalDcKw,
                                        'total_panels_used' => $totalUsedPanels,
                                        'score' => $score
                                    ];
                                }
                            } else {
                                $rejectionReasons[] = "Inverter {$inverter->name} x{$qty}: Only uses {$totalUsedPanels}/{$panelCount} panels";
                            }
                        } catch (\Exception $e) {
                            // Skip this configuration if stringing fails
                            $rejectionReasons[] = "Inverter {$inverter->name} x{$qty}: Exception - {$e->getMessage()}";
                            continue;
                        }
                    } else {
                        $rejectionReasons[] = "Inverter {$inverter->name} x{$qty}: Capacity mismatch - DC:{$totalDcCapacity}kW < {$totalDcKw}kW or AC:{$totalAcCapacity}kW insufficient";
                    }
                }
            }

            // Try mixed inverter configurations (same brand only)
            foreach ($inverters as $i => $inv1) {
                foreach ($inverters as $j => $inv2) {
                    if ($j <= $i) continue; // Avoid duplicates

                    // Only consider inverters from the same brand
                    if ($inv1->brand !== $inv2->brand) continue;

                    // Validate both inverters
                    if (!$inv1->nominal_ac_power_kw || !$inv2->nominal_ac_power_kw) continue;
                    if (!$inv1->max_dc_input_power || !$inv2->max_dc_input_power) continue;

                    for ($q1 = 1; $q1 <= 5; $q1++) {
                        for ($q2 = 1; $q2 <= 5; $q2++) {
                            $totalAcCapacity = ($inv1->nominal_ac_power_kw * $q1) + ($inv2->nominal_ac_power_kw * $q2);
                            $totalDcCapacity = ($inv1->max_dc_input_power * $q1) + ($inv2->max_dc_input_power * $q2);

                            if ($totalDcCapacity >= $totalDcKw && $totalAcCapacity * $maxDcAcRatio >= $totalDcKw) {
                                try {
                                    // Distribute panels optimally between the two inverter types
                                    $totalInverters = $q1 + $q2;
                                    $panelsPerInverter = intdiv($panelCount, $totalInverters);
                                    $remainingPanels = $panelCount % $totalInverters;

                                    $inverterConfigs = [];
                                    $totalUsedPanels = 0;
                                    $inverterIndex = 1;

                                    // Configure first inverter type
                                    for ($x = 0; $x < $q1; $x++) {
                                        $panelsForThisInverter = $panelsPerInverter;
                                        if ($remainingPanels > 0) {
                                            $panelsForThisInverter++;
                                            $remainingPanels--;
                                        }

                                        if ($panelsForThisInverter > 0) {
                                            $stringingResult = $this->calculateStringing($panel, $panelsForThisInverter, $inv1);
                                            if (isset($stringingResult['error'])) {
                                                continue 4; // Skip this mixed configuration
                                            }

                                            $inverterConfigs[] = [
                                                'inverter_unit' => $inverterIndex++,
                                                'model' => $inv1->name,
                                                'panels_assigned' => $panelsForThisInverter,
                                                'stringing' => $stringingResult
                                            ];
                                            $totalUsedPanels += $panelsForThisInverter;
                                        }
                                    }

                                    // Configure second inverter type
                                    for ($y = 0; $y < $q2; $y++) {
                                        $panelsForThisInverter = $panelsPerInverter;
                                        if ($remainingPanels > 0) {
                                            $panelsForThisInverter++;
                                            $remainingPanels--;
                                        }

                                        if ($panelsForThisInverter > 0) {
                                            $stringingResult = $this->calculateStringing($panel, $panelsForThisInverter, $inv2);
                                            if (isset($stringingResult['error'])) {
                                                continue 4; // Skip this mixed configuration
                                            }

                                            $inverterConfigs[] = [
                                                'inverter_unit' => $inverterIndex++,
                                                'model' => $inv2->name,
                                                'panels_assigned' => $panelsForThisInverter,
                                                'stringing' => $stringingResult
                                            ];
                                            $totalUsedPanels += $panelsForThisInverter;
                                        }
                                    }

                                    // Only consider if we use ALL panels
                                    if ($totalUsedPanels == $panelCount) {
                                        $score = $this->scoreMixedConfiguration($inv1, $q1, $inv2, $q2);

                                        if ($score < $bestScore) {
                                            $bestScore = $score;
                                            $bestConfiguration = [
                                                'type' => 'mixed_models_same_brand',
                                                'inverters' => $inverterConfigs,
                                                'total_inverter_count' => $q1 + $q2,
                                                'total_ac_kw' => $totalAcCapacity,
                                                'total_dc_kw' => $totalDcKw,
                                                'total_panels_used' => $totalUsedPanels,
                                                'score' => $score
                                            ];
                                        }
                                    }
                                } catch (\Exception $e) {
                                    // Skip this configuration if stringing fails
                                    continue;
                                }
                            }
                        }
                    }
                }
            }

            if (!$bestConfiguration) {
                Log::warning('No inverter configuration found', [
                    'panel_count' => $panelCount,
                    'total_dc_kw' => $totalDcKw,
                    'available_inverters' => $inverters->count(),
                    'rejection_reasons' => $rejectionReasons
                ]);

                return [
                    'error' => 'No valid configuration',
                    'combo' => [],
                    'message' => "No valid inverter configuration found for {$panelCount} panels with {$totalDcKw} kW DC requirement",
                    'debug_info' => [
                        'available_inverters' => $inverters->count(),
                        'rejection_reasons' => $rejectionReasons
                    ]
                ];
            }

            // Format the result for compatibility with existing code
            $formattedCombos = [];
            foreach ($bestConfiguration['inverters'] as $config) {
                $formattedCombos[] = [
                    'model' => $config['model'],
                    'qty' => 1, // Each entry represents one inverter unit
                    'stringing' => $config['stringing']
                ];
            }

            return [
                'combo' => $formattedCombos,
                'total_ac_kw' => $bestConfiguration['total_ac_kw'],
                'total_dc_kw' => $bestConfiguration['total_dc_kw'],
                'total_panels_used' => $bestConfiguration['total_panels_used'],
                'total_inverter_count' => $bestConfiguration['total_inverter_count'],
                'configuration_type' => $bestConfiguration['type'],
                'score' => $bestConfiguration['score']
            ];
        } catch (\Exception $e) {
            return [
                'error' => 'Unexpected error',
                'combo' => [],
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Score inverter combo using 50% price and 50% efficiency
     */
    public function scoreCombo(array $combo): float
    {
        $totalPrice = 0;
        $totalEff = 0;
        $units = 0;

        foreach ($combo as $item) {
            $inverter = $item['model'];
            $qty = $item['qty'];
            $totalPrice += $inverter->price * $qty;
            $totalEff += $inverter->efficiency_max * $qty;
            $units += $qty;
        }

        $avgEff = $units ? ($totalEff / $units) : 0;

        // Normalize price and efficiency
        $normPrice = $totalPrice / 10000; // adjust divisor for budget scaling
        $normEfficiency = 1 - ($avgEff / 100);   // higher efficiency = lower penalty

        return 0.5 * $normPrice + 0.5 * $normEfficiency;
    }

    /**
     * Score a single inverter model configuration
     */
    private function scoreConfiguration($inverter, $quantity): float
    {
        $totalPrice = $inverter->price * $quantity;
        $efficiency = $inverter->efficiency_max ?? 95;

        // Normalize price (lower is better)
        $priceScore = $totalPrice / 10000;

        // Normalize efficiency (higher is better, so invert)
        $efficiencyScore = (100 - $efficiency) / 100;

        // Add penalty for using too many inverters
        $quantityPenalty = ($quantity - 1) * 0.1;

        return $priceScore + $efficiencyScore + $quantityPenalty;
    }

    /**
     * Score a mixed inverter configuration
     */
    private function scoreMixedConfiguration($inv1, $q1, $inv2, $q2): float
    {
        $totalPrice = ($inv1->price * $q1) + ($inv2->price * $q2);
        $totalQuantity = $q1 + $q2;

        $avgEfficiency = (($inv1->efficiency_max ?? 95) * $q1 + ($inv2->efficiency_max ?? 95) * $q2) / $totalQuantity;

        // Normalize price (lower is better)
        $priceScore = $totalPrice / 10000;

        // Normalize efficiency (higher is better, so invert)
        $efficiencyScore = (100 - $avgEfficiency) / 100;

        // Add penalty for complexity (mixed models)
        $complexityPenalty = 0.2;

        // Add penalty for using too many inverters
        $quantityPenalty = ($totalQuantity - 1) * 0.1;

        return $priceScore + $efficiencyScore + $complexityPenalty + $quantityPenalty;
    }

    /**
     * Calculate stringing configuration for one inverter
     */
    public function calculateStringing($panel, $panelCount, $inverter, $tempMinC = -10.0, $tempCoeffPct = 0.29)
    {
        try {
            // Validate inverter MPPT voltage range - check both formats
            $mpptMinV = null;
            $mpptMaxV = null;

            if ($inverter->mppt_voltage_range) {
                // Parse min/max MPPT voltage range from string format
                $mpptRangeParts = preg_split('/–|to|-/', $inverter->mppt_voltage_range);
                if (count($mpptRangeParts) >= 2) {
                    $mpptMinV = floatval($mpptRangeParts[0]);
                    $mpptMaxV = floatval($mpptRangeParts[1]);
                }
            } elseif ($inverter->mppt_min_voltage && $inverter->mppt_max_voltage) {
                // Use separate min/max columns
                $mpptMinV = floatval($inverter->mppt_min_voltage);
                $mpptMaxV = floatval($inverter->mppt_max_voltage);
            }

            if (!$mpptMinV || !$mpptMaxV) {
                return [
                    'error' => 'Missing MPPT voltage range',
                    'message' => "Inverter {$inverter->name} has no MPPT voltage range specified"
                ];
            }

            // Validate panel voltage properties
            if (!$panel->open_circuit_voltage || $panel->open_circuit_voltage <= 0) {
                return [
                    'error' => 'Invalid panel open circuit voltage',
                    'message' => "Panel {$panel->name} has invalid open circuit voltage"
                ];
            }

            if (!$panel->maximum_operating_voltage_vmpp || $panel->maximum_operating_voltage_vmpp <= 0) {
                return [
                    'error' => 'Invalid panel operating voltage',
                    'message' => "Panel {$panel->name} has invalid operating voltage"
                ];
            }

            // Adjust Voc for temperature
            $voc = $panel->open_circuit_voltage;
            $vOperating = $panel->maximum_operating_voltage_vmpp;
            $vocCold = $voc * (1 + $tempCoeffPct / 100 * (25 - $tempMinC));

            // Compute valid string length range
            $ppsMin = ceil($mpptMinV / $vOperating);
            $ppsMax = floor($mpptMaxV / $vocCold);

            if ($ppsMax < $ppsMin) {
                return [
                    'error' => 'Invalid voltage window',
                    'message' => "No valid string length for inverter {$inverter->name} with panel {$panel->name}"
                ];
            }

            // Find optimal string configuration that uses ALL panels
            $bestConfig = null;
            $bestScore = INF;

            // Try different panels-per-string configurations
            for ($pps = $ppsMin; $pps <= $ppsMax; $pps++) {
                $baseStrings = floor($panelCount / $pps);
                $remainderPanels = $panelCount % $pps;

                if ($baseStrings == 0) continue; // Skip if we can't form any strings

                // Calculate total strings needed (base + remainder)
                $totalStrings = $baseStrings + ($remainderPanels > 0 ? 1 : 0);

                // Check if we have enough MPPT ports
                $mppts = $inverter->no_of_mppt_ports ?: 1;
                if ($totalStrings > $mppts * 2) continue; // Assume max 2 strings per MPPT

                // Score this configuration (prefer fewer strings but using all panels)
                $score = $totalStrings + ($remainderPanels > 0 ? 0.5 : 0); // Slight penalty for remainder

                if ($score < $bestScore) {
                    $bestScore = $score;
                    $bestConfig = [
                        'pps' => $pps,
                        'base_strings' => $baseStrings,
                        'remainder_panels' => $remainderPanels,
                        'total_strings' => $totalStrings
                    ];
                }
            }

            if (!$bestConfig) {
                return [
                    'error' => 'No valid stringing configuration',
                    'message' => "No valid stringing configuration found for {$panelCount} panels with inverter {$inverter->name}"
                ];
            }

            // Build the string configuration
            $strings = [];
            $mppts = $inverter->no_of_mppt_ports ?: 1;

            // Distribute base strings across MPPTs
            $baseStrings = $bestConfig['base_strings'];
            $stringsPerMppt = floor($baseStrings / $mppts);
            $extraStrings = $baseStrings % $mppts;

            for ($mppt = 1; $mppt <= $mppts; $mppt++) {
                $stringsForThisMppt = $stringsPerMppt;
                if ($mppt <= $extraStrings) {
                    $stringsForThisMppt++; // Give extra strings to first MPPTs
                }

                if ($stringsForThisMppt > 0) {
                    $strings[] = [
                        'mppt' => $mppt,
                        'panels_per_string' => $bestConfig['pps'],
                        'n_strings' => $stringsForThisMppt
                    ];
                }
            }

            // Add remainder string if needed (add to last MPPT)
            if ($bestConfig['remainder_panels'] > 0) {
                // Check if remainder forms a valid string voltage-wise
                $remainderVoc = $vocCold * $bestConfig['remainder_panels'];
                if ($remainderVoc >= $mpptMinV && $remainderVoc <= $mpptMaxV) {
                    // Add remainder string to last used MPPT
                    $lastMppt = count($strings) > 0 ? $strings[count($strings) - 1]['mppt'] : 1;
                    $strings[] = [
                        'mppt' => $lastMppt,
                        'panels_per_string' => $bestConfig['remainder_panels'],
                        'n_strings' => 1
                    ];
                }
            }

            // Calculate actual panels used and power
            $actualPanelsUsed = ($bestConfig['base_strings'] * $bestConfig['pps']) + $bestConfig['remainder_panels'];
            $actualPower = ($panel->panel_rated_power * $actualPanelsUsed) / 1000;

            // Return stringing config with voltage and power metrics
            return [
                'strings' => $strings,
                'v_string_voc' => round($vocCold * $bestConfig['pps'], 2),
                'dc_power_kw' => round($actualPower, 2),
                'dc_ac_ratio' => round($actualPower / $inverter->nominal_ac_power_kw, 2),
                'total_panels_used' => $actualPanelsUsed,
            ];
        } catch (\Exception $e) {
            return [
                'error' => 'Unexpected stringing error',
                'message' => $e->getMessage()
            ];
        }
    }

    public function callUsableAreaDetectionApi($imagePath, array $options = [], $endpointUrl = 'http://192.168.1.22/usable_area_detection')
    {
        if (!file_exists($imagePath)) {
            throw new \InvalidArgumentException('Image file does not exist: ' . $imagePath);
        }

        $multipart = [
            [
                'name' => 'image',
                'contents' => fopen($imagePath, 'r'),
                'filename' => basename($imagePath),
            ]
        ];

        // Add optional fields if present
        foreach (
            [
                'roof_point_prompt',
                'roof_point_label',
                'obstacle_point_prompt',
                'obstacle_point_label',
                'meters_per_pixel',
                'roof_type',
                'relaxed_filtering',
                'disable_preprocessing',
                'manual_roof_polygon',
                'mask_index'
            ] as $field
        ) {
            if (isset($options[$field])) {
                $value = $options[$field];
                // Convert booleans to string 'true'/'false'
                if (is_bool($value)) $value = $value ? 'true' : 'false';
                $multipart[] = [
                    'name' => $field,
                    'contents' => (string)$value,
                ];
            }
        }

        $response = \Illuminate\Support\Facades\Http::timeout(60)
            ->withHeaders(['Accept' => 'application/json'])
            ->asMultipart()
            ->post($endpointUrl, $multipart);

        // Close the file handle if opened
        if (is_resource($multipart[0]['contents'])) {
            fclose($multipart[0]['contents']);
        }

        if ($response->successful()) {
            return $response->json();
        } else {
            throw new \Exception('Usable area detection failed: ' . $response->body());
        }
    }

    public function calculateUsageAndCost($electricityRate, $monthlyBill, $usagePattern = 'balanced')
    {
        // Define monthly distribution factors for each pattern (should sum to 1)
        $patterns = [
            'balanced' => [0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083],
            'summer'   => [0.07, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.12, 0.09, 0.07, 0.06, 0.02],
            'winter'   => [0.11, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.06, 0.07, 0.09, 0.11, 0.13],
        ];
        $months = [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december'
        ];

        $factors = $patterns[$usagePattern] ?? $patterns['balanced'];

        // Calculate annual cost and usage
        $annualCost = $monthlyBill * 12;
        $annualUsage = $annualCost / $electricityRate;

        // Calculate monthly usage and cost
        $monthlyUsage = [];
        $monthlyCost = [];
        foreach ($months as $i => $month) {
            $usage = round($annualUsage * $factors[$i], 2);
            $cost = round($usage * $electricityRate, 2);
            $monthlyUsage[$month] = $usage;
            $monthlyCost[$month] = $cost;
        }

        return [
            'annualUsage' => $annualUsage,
            'annualCost' => $annualCost,
            'monthlyUsage' => $monthlyUsage,
            'monthlyCost' => $monthlyCost,
        ];
    }

    /**
     * Estimate wiring distances for DC and AC wiring
     */
    public function estimateWiringDistances($floorCount, $floorHeight = 3, $horizontalDcDistance = 5, $horizontalAcDistance = 2)
    {
        $dcDistance = $horizontalDcDistance;
        $verticalAc = $floorCount * $floorHeight;
        $acDistance = sqrt(pow($verticalAc, 2) + pow($horizontalAcDistance, 2));
        return [
            'dc' => round($dcDistance, 2),
            'ac' => round($acDistance, 2)
        ];
    }

    /**
     * Recommend wire size based on current
     */
    public function recommendWireSize($current)
    {
        if ($current <= 10) return '4 mm²';
        if ($current <= 16) return '6 mm²';
        if ($current <= 25) return '10 mm²';
        if ($current <= 35) return '16 mm²';
        return '25 mm²';
    }

    /**
     * Calculate voltage drop for given wire size, current, length and voltage
     */
    public function calculateVoltageDrop($wireSize, $current, $length, $voltage)
    {
        $resistancePerKm = [
            '4 mm²' => 4.61,
            '6 mm²' => 3.08,
            '10 mm²' => 1.83,
            '16 mm²' => 1.15,
            '25 mm²' => 0.73
        ];

        $R = $resistancePerKm[$wireSize] / 1000 * $length;
        $Vdrop = $R * $current;
        return ($Vdrop / $voltage) * 100;
    }

    /**
     * Generate wiring specifications for the solar installation
     */
    public function generateWiringSpecs($inverterDesign, $panelSpecs, $floorCount, $horizontalDistance = 5)
    {
        try {
            $wiring = [];

            $distances = $this->estimateWiringDistances($floorCount, 3, $horizontalDistance);

            if (!isset($inverterDesign['combo']) || empty($inverterDesign['combo'])) {
                return [];
            }

            foreach ($inverterDesign['combo'] as $inv) {
                $model = $inv['model'] ?? 'Unknown Model';
                $stringing = $inv['stringing'] ?? [];

                // Handle both array formats for stringing
                $strings = [];
                if (isset($stringing['strings'])) {
                    $strings = $stringing['strings'];
                } elseif (is_array($stringing)) {
                    $strings = $stringing;
                }

                foreach ($strings as $string) {
                    $nStrings = (int) ($string['n_strings'] ?? $string['count'] ?? 1);
                    $panelsPerString = (int) ($string['panels_per_string'] ?? 10);

                    for ($i = 0; $i < $nStrings; $i++) {
                        $v_string = $panelsPerString * ($panelSpecs['vmp'] ?? 30);
                        $i_string = $panelSpecs['imp'] ?? 10;
                        $oneWay = $distances['dc'] ?? 5;
                        $roundTrip = $oneWay * 2 * 1.1;

                        $gauge = $this->recommendWireSize($i_string);
                        $vdrop = $this->calculateVoltageDrop($gauge, $i_string, $roundTrip, $v_string);

                        $wiring[] = [
                            'inverter' => $model,
                            'type' => 'dc',
                            'string_index' => $i + 1,
                            'voltage' => $v_string,
                            'current' => $i_string,
                            'wire_size' => $gauge,
                            'length' => $roundTrip,
                            'voltage_drop_percent' => round($vdrop, 2),
                            'drop_ok' => $vdrop <= 3
                        ];
                    }
                }

                // Estimate AC wiring per inverter
                $acPower = 5; // Default AC power
                if (isset($inv['inverter']) && isset($inv['inverter']->nominal_ac_power_kw)) {
                    $acPower = $inv['inverter']->nominal_ac_power_kw;
                } elseif (isset($inv['total_ac_kw'])) {
                    $acPower = $inv['total_ac_kw'];
                }

                $acCurrent = $acPower * 1000 / 230; // Assuming 230V single-phase
                $acGauge = $this->recommendWireSize($acCurrent);
                $acLength = ($distances['ac'] ?? 5) * 2 * 1.1;

                // Calculate AC voltage drop
                $acVoltageDrop = $this->calculateVoltageDrop($acGauge, $acCurrent, $acLength, 230);

                $wiring[] = [
                    'inverter' => $model,
                    'type' => 'ac',
                    'voltage' => 230,
                    'current' => round($acCurrent, 2),
                    'wire_size' => $acGauge,
                    'length' => round($acLength, 2),
                    'voltage_drop_percent' => round($acVoltageDrop, 2),
                    'drop_ok' => $acVoltageDrop <= 3
                ];
            }

            return $wiring;
        } catch (\Exception $e) {
            Log::error('generateWiringSpecs failed', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'inverterDesign' => $inverterDesign
            ]);

            return [];
        }
    }

    /**
     * Generate Bill of Materials for wiring
     */
    public function generateBOM($wiringSpecs)
    {
        try {
            $unitPrices = [
                '4 mm²' => 11,    // MAD/m
                '6 mm²' => 14,
                '10 mm²' => 20,
                '16 mm²' => 30,
                '25 mm²' => 42,
                'MC4' => 8,
                'fuse' => 100,
                'junction_box' => 300
            ];

            $bom = [];
            $totalCost = 0;

            if (!is_array($wiringSpecs) || empty($wiringSpecs)) {
                return ['bom' => [], 'total_cost_mad' => 0];
            }

            foreach ($wiringSpecs as $spec) {
                if (!is_array($spec) || !isset($spec['wire_size']) || !isset($spec['length'])) {
                    continue;
                }

                $type = $spec['wire_size'];
                $length = round($spec['length']);

                if ($length <= 0) continue;

                if (!isset($bom[$type])) {
                    $bom[$type] = ['qty' => 0, 'unit_price' => $unitPrices[$type] ?? 11];
                }

                $bom[$type]['qty'] += $length;
            }

            // Add per DC string components
            $dcStrings = array_filter($wiringSpecs, function ($w) {
                return is_array($w) && isset($w['type']) && $w['type'] === 'dc';
            });

            if (!empty($dcStrings)) {
                $bom['MC4'] = ['qty' => count($dcStrings) * 2, 'unit_price' => $unitPrices['MC4']];
                $bom['fuse'] = ['qty' => count($dcStrings), 'unit_price' => $unitPrices['fuse']];
            }

            $bom['junction_box'] = ['qty' => 1, 'unit_price' => $unitPrices['junction_box']];

            $output = [];
            foreach ($bom as $item => $data) {
                $cost = $data['qty'] * $data['unit_price'];
                $output[] = [
                    'item' => $item,
                    'qty' => $data['qty'],
                    'unit_price_mad' => $data['unit_price'],
                    'total_mad' => round($cost, 2)
                ];
                $totalCost += $cost;
            }

            return ['bom' => $output, 'total_cost_mad' => round($totalCost, 2)];
        } catch (\Exception $e) {
            Log::error('generateBOM failed', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'wiringSpecs' => $wiringSpecs
            ]);

            return ['bom' => [], 'total_cost_mad' => 0, 'error' => $e->getMessage()];
        }
    }


    public function calculateTotalSystemLoss(
        float $dc_voltage_drop,
        float $eta_inverter,
        float $ac_voltage_drop,
    ): float {

        $eta_other = SolarConfiguration::getByKey('eta_other', 0.98);
        $eta_mismatch = SolarConfiguration::getByKey('eta_mismatch', 0.99);
        $eta_soiling = SolarConfiguration::getByKey('eta_soiling', 0.97);
        $eta_temperature = SolarConfiguration::getByKey('eta_temperature', 0.97);


        $eta_dc = 1 - ($dc_voltage_drop / 100);
        $eta_ac = 1 - ($ac_voltage_drop / 100);

        // Calculate PR
        $pr = $eta_temperature *
            $eta_soiling *
            $eta_mismatch *
            $eta_dc *
            $eta_inverter *
            $eta_ac *
            $eta_other;

        $losses = 100 - ($pr * 100);
   
        return $losses;
    }
}
