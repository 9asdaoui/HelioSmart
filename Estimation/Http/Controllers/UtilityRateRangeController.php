<?php

namespace Modules\Estimation\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Estimation\Http\Models\UtilityRateRange;


class UtilityRateRangeController extends Controller
{
    // List all utility rate ranges (for API and Blade view)
    public function index(Request $request)
    {
        $rateRanges = UtilityRateRange::with('utility')->get();
        if ($request->wantsJson()) {
            return response()->json($rateRanges);
        }
        // For Blade view integration, pass utilities for dropdowns
        $utilities = \App\Models\Utility::all();
        return view('admin.estimation.utility_rate_ranges.index', compact('rateRanges', 'utilities'));
    }

    // Show a single utility rate range
    public function show(Request $request, $id)
    {
        $rateRange = UtilityRateRange::with('utility')->findOrFail($id);
        if ($request->wantsJson()) {
            return response()->json($rateRange);
        }
        return view('admin.estimation.utility_rate_ranges.show', compact('rateRange'));
    }

    // Show create form (Blade)
    public function create()
    {
        $utilities = \App\Models\Utility::all();
        return view('admin.estimation.utility_rate_ranges.create', compact('utilities'));
    }

    // Store a new utility rate range
    public function store(Request $request)
    {
        $data = $request->validate([
            'utility_id' => 'required|exists:utilities,id',
            'min' => 'nullable|numeric',
            'max' => 'nullable|numeric',
            'rate' => 'required|numeric',
        ]);
        $rateRange = UtilityRateRange::create($data);
        if ($request->wantsJson()) {
            return response()->json($rateRange, 201);
        }
        return redirect()->route('utility-rate-ranges.index')->with('success', 'Utility rate range created successfully.');
    }

    // Show edit form (Blade)
    public function edit($id)
    {
        $rateRange = UtilityRateRange::findOrFail($id);
        $utilities = \App\Models\Utility::all();
        return view('admin.estimation.utility_rate_ranges.edit', compact('rateRange', 'utilities'));
    }

    // Update an existing utility rate range
    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'utility_id' => 'required|exists:utilities,id',
            'min' => 'nullable|numeric',
            'max' => 'nullable|numeric',
            'rate' => 'required|numeric',
        ]);
        $rateRange = UtilityRateRange::findOrFail($id);
        $rateRange->update($data);
        if ($request->wantsJson()) {
            return response()->json($rateRange);
        }
        return redirect()->route('utility-rate-ranges.index')->with('success', 'Utility rate range updated successfully.');
    }

    // Delete a utility rate range
    public function destroy(Request $request, $id)
    {
        $rateRange = UtilityRateRange::findOrFail($id);
        $rateRange->delete();
        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }
        return redirect()->route('utility-rate-ranges.index')->with('success', 'Utility rate range deleted successfully.');
    }


}
