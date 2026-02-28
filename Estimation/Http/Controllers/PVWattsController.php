<?php

namespace Modules\Estimation\Http\Controllers;

use Illuminate\Routing\Controller;  // Add this import
use Illuminate\Support\Facades\Http;

class PVWattsController extends Controller
{
    /**
     * Call the PVWatts API to estimate energy production
     *
     * @param  float  $lat
     * @param  float  $lon
     * @param  float  $system_capacity
     * @param  float  $tilt
     * @param  float  $azimuth
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function getEstimate($lat, $lon, $system_capacity, $tilt, $azimuth , $losses)
    {
        $response = Http::get('https://developer.nrel.gov/api/pvwatts/v8.json', [
            'api_key'         => env('PVWATTS_API_KEY'),
            'lat'             => $lat,
            'lon'             => $lon,
            'system_capacity' => $system_capacity,
            'module_type'     => 1, // Premium
            'array_type'      => 0, // Fixed roof mount
            'tilt'            => $tilt,
            'azimuth'         => $azimuth,
            'losses'          => $losses,
            'timeframe'       => 'monthly',
        ]);

        if ($response->successful()) {
            $data = $response->json();

            // Extract each monthly value and map to readable month names
            $monthlyData = [];
            $monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            
            for ($i = 0; $i < 12; $i++) {
                $monthlyData[$monthNames[$i]] = [
                    'ac_monthly' => $data['outputs']['ac_monthly'][$i],
                    'poa_monthly' => $data['outputs']['poa_monthly'][$i],
                    'solrad_monthly' => $data['outputs']['solrad_monthly'][$i],
                    'dc_monthly' => $data['outputs']['dc_monthly'][$i],
                ];
            }
            
            return response()->json([
                'monthlyData' => $monthlyData,
                'annualProduction' => $data['outputs']['ac_annual'],
                'capacityFactor' => $data['outputs']['capacity_factor'],
                'solradAnnual' => $data['outputs']['solrad_annual']
            ]);
        }

        return back()->withErrors(['error' => 'Failed to retrieve data from PVWatts API.']);
    }
}
