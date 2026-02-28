<?php

namespace Modules\Estimation\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use App\Models\Utility;

class UtilityController extends Controller
{
    // List all utilities
    public function index(Request $request)
    {
        $utilities = Utility::with('rateRanges')->paginate(10);
        if ($request->wantsJson()) {
            return response()->json($utilities);
        }
        return view('admin.estimation.utilities', compact('utilities'));
    }

    // Show a single utility
    public function show(Request $request, $id)
    {
        $utility = Utility::with('rateRanges')->findOrFail($id);
        
        // For AJAX requests, always return JSON
        if ($request->wantsJson() || $request->ajax()) {
            return response()->json(['utility' => $utility]);
        }
        
        // For regular requests, redirect to index since we don't have a show view
        return redirect()->route('solar-utility.index');
    }

    // Show create form (Blade)
    public function create()
    {
        return view('admin.estimation.utility_create');
    }

    // Store a new utility
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'image_url' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
        ]);   
        $utility = Utility::create($data);
        // Create rate ranges for this utility
        $utilityRateRange = $request->input('rate_ranges', []);
        $ranges = $this->buildRateRanges($utilityRateRange);
        foreach ($ranges as $range) {
            \Modules\Estimation\Http\Models\UtilityRateRange::create([
                'utility_id' => $utility->id,
                'min' => $range['min'],
                'max' => $range['max'],
                'rate' => $range['rate'],
            ]);
        }
        if ($request->wantsJson()) {
            return response()->json($utility, 201);
        }
        return redirect()->route('solar-utility.index')->with('success', 'Utility created successfully.');
    }

    // Show edit form (Blade)
    public function edit($id)
    {
        $utility = Utility::findOrFail($id);
        return view('admin.estimation.utility_edit', compact('utility'));
    }

    // Update an existing utility
    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'image_url' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
        ]);
        $utility = Utility::findOrFail($id);
        $utility->update($data);
        // Update rate ranges for this utility
        $utilityRateRange = $request->input('rate_ranges', []);
        if (!empty($utilityRateRange)) {
            \Modules\Estimation\Http\Models\UtilityRateRange::where('utility_id', $utility->id)->delete();
            $ranges = $this->buildRateRanges($utilityRateRange);
            foreach ($ranges as $range) {
                \Modules\Estimation\Http\Models\UtilityRateRange::create([
                    'utility_id' => $utility->id,
                    'min' => $range['min'],
                    'max' => $range['max'],
                    'rate' => $range['rate'],
                ]);
            }
        }
        if ($request->wantsJson()) {
            return response()->json($utility);
        }
        return redirect()->route('solar-utility.index')->with('success', 'Utility updated successfully.');
    }

    // Delete a utility
    public function destroy(Request $request, $id)
    {
        $utility = Utility::findOrFail($id);
        $utility->delete();
        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }
        return redirect()->route('solar-utility.index')->with('success', 'Utility deleted successfully.');
    }

    /**
     * Generate min/max kWh ranges for each rate bracket.
     * Fixed ranges: 0-100, 101-200, 201-300, 301-400, 401-500, 501+
     * Example: [ ["rate" => 0.14], ... ]
     * Returns: [ ["min" => 0, "max" => 100, "rate" => 0.14], ... ]
     *
     * @param array $rateArray
     * @return array
     */
    public function buildRateRanges(array $rateArray)
    {
        $fixedRanges = [
            ['min' => 0, 'max' => 100],
            ['min' => 101, 'max' => 200],
            ['min' => 201, 'max' => 300],
            ['min' => 301, 'max' => 400],
            ['min' => 401, 'max' => 500],
            ['min' => 501, 'max' => null], // null means unlimited
        ];
        
        $ranges = [];
        foreach ($rateArray as $i => $item) {
            if ($i >= count($fixedRanges)) break; // Only 6 brackets maximum
            
            $rate = isset($item['rate']) ? (float)$item['rate'] : 0.0;
            if ($rate > 0) { // Only add ranges with valid rates
                $ranges[] = [
                    'min' => $fixedRanges[$i]['min'],
                    'max' => $fixedRanges[$i]['max'],
                    'rate' => $rate,
                ];
            }
        }
        return $ranges;
    }
}
