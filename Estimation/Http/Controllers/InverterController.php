<?php

namespace Modules\Estimation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Estimation\Http\Models\Inverter;
use Illuminate\Validation\Rule;

class InverterController extends Controller
{
    /**
     * Display a listing of the inverters.
     */
    public function index(Request $request)
    {
        $query = Inverter::query();

        // Apply search filter
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Apply brand filter
        if ($request->filled('brand')) {
            $query->brand($request->brand);
        }

        // Apply power range filter
        if ($request->filled('min_power') || $request->filled('max_power')) {
            $query->powerRange($request->min_power, $request->max_power);
        }

        // Apply status filter
        if ($request->filled('status')) {
            $query->status($request->status);
        }

        $inverters = $query->orderBy('created_at', 'desc')->paginate(15);
        $inverters->appends($request->all());

        return view('admin.estimation.inverters', compact('inverters'));
    }

    /**
     * Store a newly created inverter in storage.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'product_id' => 'nullable|integer|min:0',
            'price' => 'nullable|numeric|min:0',
            'brand' => 'nullable|string|max:255',
            'warranty' => 'nullable|integer|min:0',
            'nominal_ac_power_kw' => 'nullable|numeric|min:0',
            'max_dc_input_power' => 'nullable|numeric|min:0',
            'mppt_min_voltage' => 'nullable|numeric|min:0',
            'mppt_max_voltage' => 'nullable|numeric|min:0',
            'max_dc_voltage' => 'nullable|numeric|min:0',
            'max_dc_current_mppt' => 'nullable|numeric|min:0',
            'no_of_mppt_ports' => 'nullable|integer|min:0',
            'max_strings_per_mppt' => 'nullable|integer|min:0',
            'efficiency_max' => 'nullable|numeric|min:0|max:100',
            'ac_output_voltage' => 'nullable|string|max:255',
            'phase_type' => ['nullable', Rule::in(['1P', '3P'])],
            'spd_included' => 'nullable|string|max:255',
            'ip_rating' => 'nullable|string|max:255',
            'status' => ['required', Rule::in(['pending_review', 'active', 'deactive'])],
        ]);

        Inverter::create($validatedData);

        return redirect()->route('inverter.index')
            ->with('success', __('Inverter created successfully.'));
    }

    /**
     * Display the specified inverter.
     */
    public function show($id)
    {
        $inverter = Inverter::findOrFail($id);
        
        return response()->json([
            'success' => true,
            'inverter' => $inverter
        ]);
    }

    /**
     * Update the specified inverter in storage.
     */
    public function update(Request $request, $id)
    {
        $inverter = Inverter::findOrFail($id);

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'product_id' => 'nullable|integer|min:0',
            'price' => 'nullable|numeric|min:0',
            'brand' => 'nullable|string|max:255',
            'warranty' => 'nullable|integer|min:0',
            'nominal_ac_power_kw' => 'nullable|numeric|min:0',
            'max_dc_input_power' => 'nullable|numeric|min:0',
            'mppt_min_voltage' => 'nullable|numeric|min:0',
            'mppt_max_voltage' => 'nullable|numeric|min:0',
            'max_dc_voltage' => 'nullable|numeric|min:0',
            'max_dc_current_mppt' => 'nullable|numeric|min:0',
            'no_of_mppt_ports' => 'nullable|integer|min:0',
            'max_strings_per_mppt' => 'nullable|integer|min:0',
            'efficiency_max' => 'nullable|numeric|min:0|max:100',
            'ac_output_voltage' => 'nullable|string|max:255',
            'phase_type' => ['nullable', Rule::in(['1P', '3P'])],
            'spd_included' => 'nullable|string|max:255',
            'ip_rating' => 'nullable|string|max:255',
            'status' => ['required', Rule::in(['pending_review', 'active', 'deactive'])],
        ]);

        $inverter->update($validatedData);

        return redirect()->route('inverter.index')
            ->with('success', __('Inverter updated successfully.'));
    }

    /**
     * Remove the specified inverter from storage.
     */
    public function destroy($id)
    {
        $inverter = Inverter::findOrFail($id);
        $inverter->delete();

        return redirect()->route('inverter.index')
            ->with('success', __('Inverter deleted successfully.'));
    }

    /**
     * Get active inverters for API or AJAX calls
     */
    public function getActiveInverters()
    {
        $inverters = Inverter::active()
            ->select('id', 'name', 'brand', 'nominal_ac_power_kw', 'price')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'inverters' => $inverters
        ]);
    }
}
