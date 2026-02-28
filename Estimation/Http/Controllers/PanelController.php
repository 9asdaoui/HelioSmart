<?php

namespace Modules\Estimation\Http\Controllers;

use Illuminate\Contracts\Support\Renderable;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Estimation\Http\Models\Panel;

class PanelController extends Controller
{
    /**
     * Display a listing of the resource.
     * @param Request $request
     * @return Renderable
     */
    public function index(Request $request)
    {
        $query = Panel::query();

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        // Filter by wattage
        if ($request->filled('min_wattage')) {
            $query->where('panel_rated_power', '>=', $request->get('min_wattage'));
        }

        if ($request->filled('max_wattage')) {
            $query->where('panel_rated_power', '<=', $request->get('max_wattage'));
        }

        $panels = $query->orderBy('name')->paginate(10);

        return view('admin.estimation.panels', compact('panels'));
    }

    /**
     * Store a newly created resource in storage.
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validator = $this->validatePanel($request);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::beginTransaction();

            $data = $request->only([
                'name',
                'product_id',
                'price',
                'weight_kg',
                'width_mm',
                'height_mm',
                'brand',
                'efficiency',
                'warranty_years',
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
                'max_operating_temperature',
                'min_operating_temperature',
                'temp_coefficient_of_pmax',
                'temp_coefficient_of_voc',
                'temp_coefficient_of_isc',
                'nom_operating_cell_temp_noct',
                'connector_type',
                'status',
            ]);

            Panel::create($data);

            DB::commit();

            return redirect()->route('solar-panel.index')
                ->with('success', __('Solar panel created successfully.'));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create solar panel', [
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);

            return redirect()->back()
                ->with('error', __('Failed to create panel: ') . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Store a panel from product data
     * @param Request $request
     * @return array
     */
    public function storeFromProduct(Request $request)
    {
        try {
            // Validate essential fields
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'product_id' => 'required|integer',
            ]);

            if ($validator->fails()) {
                return ['success' => false, 'errors' => $validator->errors()];
            }

            // Create the panel with the new structure
            $panel = Panel::create([
                'name' => $request->name,
                'product_id' => $request->product_id,
                'price' => $request->price,
                'weight_kg' => $request->weight_kg,
                'width_mm' => $request->width_mm,
                'height_mm' => $request->height_mm,
                'brand' => $request->brand,
                'warranty_years' => $request->warranty_years,
                'type' => $request->type,
                'panel_rated_power' => $request->panel_rated_power,
                'maximum_operating_voltage_vmpp' => $request->maximum_operating_voltage_vmpp,
                'maximum_operating_current_impp' => $request->maximum_operating_current_impp,
                'open_circuit_voltage' => $request->open_circuit_voltage,
                'short_circuit_current' => $request->short_circuit_current,
                'module_efficiency' => $request->module_efficiency,
                'maximum_system_voltage' => $request->maximum_system_voltage,
                'maximum_series_fuse_rating' => $request->maximum_series_fuse_rating,
                'num_of_cells' => $request->num_of_cells,
                'wind_load_kg_per_m2' => $request->wind_load_kg_per_m2,
                'snow_load_kg_per_m2' => $request->snow_load_kg_per_m2,
                'operating_temperature' => $request->operating_temperature,
                'temp_coefficient_of_pmax' => $request->temp_coefficient_of_pmax,
                'temp_coefficient_of_voc' => $request->temp_coefficient_of_voc,
                'temp_coefficient_of_isc' => $request->temp_coefficient_of_isc,
                'nom_operating_cell_temp_noct' => $request->nom_operating_cell_temp_noct,
                'connector_type' => $request->connector_type,
            ]);

            return ['success' => true, 'panel' => $panel];
        } catch (\Exception $e) {
            Log::error('Failed to create panel from product', [
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Display the specified resource.
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $panel = Panel::find($id);

        if (!$panel) {
            return response()->json([
                'success' => false,
                'message' => 'Panel not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'panel' => $panel
        ]);
    }

    /**
     * Update the specified resource in storage.
     * @param Request $request
     * @param int $id
     * @return RedirectResponse|JsonResponse
     */
    public function update(Request $request, int $id)
    {
        $panel = Panel::find($id);

        if (!$panel) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Panel not found'
                ], 404);
            }

            return redirect()->back()->with('error', 'Panel not found');
        }

        $validator = $this->validatePanel($request, $panel->id);

        if ($validator->fails()) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => __('Validation failed'),
                    'errors' => $validator->errors()
                ], 422);
            }

            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::beginTransaction();

            $data = $request->only([
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
                'operating_temperature',
                'temp_coefficient_of_pmax',
                'temp_coefficient_of_voc',
                'temp_coefficient_of_isc',
                'nom_operating_cell_temp_noct',
                'connector_type',
                'status',
            ]);


            // Calculate and set the panel score before updating
            $score = $this->calculateScore(
                $data['module_efficiency'] ?? null,
                $data['price'] ?? null,
                $data['width_mm'] ?? null,
                $data['height_mm'] ?? null,
                $data['panel_rated_power'] ?? null
            );
            $data['score'] = $score;

            $panel->update($data);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => __('Solar panel updated successfully.'),
                    'panel' => $panel->fresh()
                ]);
            }

            return redirect()->route('solar-panel.index')
                ->with('success', __('Solar panel updated successfully.'));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update solar panel', [
                'id' => $panel->id,
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => __('Failed to update panel: ') . $e->getMessage()
                ], 500);
            }

            return redirect()->back()
                ->with('error', __('Failed to update panel: ') . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified resource from storage.
     * @param Panel $panel
     * @return RedirectResponse
     */
    public function destroy(int $id): RedirectResponse
    {
        try {
            $panel = Panel::find($id);

            if (!$panel) {
                return redirect()->back()->with('error', 'Panel not found');
            }

            $panelName = $panel->name;
            $panel->delete();

            return redirect()->route('solar-panel.index')
                ->with('success', __('Solar panel ":name" deleted successfully.', ['name' => $panelName]));
        } catch (\Exception $e) {
            Log::error('Failed to delete solar panel', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return redirect()->back()
                ->with('error', __('Failed to delete panel: ') . $e->getMessage());
        }
    }

    /**
     * Validate panel data
     * @param Request $request
     * @param int|null $id
     * @return \Illuminate\Contracts\Validation\Validator
     */
    private function validatePanel(Request $request, ?int $id = null): \Illuminate\Contracts\Validation\Validator
    {
        $rules = [
            'name' => 'required|string|max:255',
            'product_id' => 'required|integer',
            'price' => 'nullable|numeric|min:0',
            'weight_kg' => 'nullable|numeric|min:0',
            'width_mm' => 'nullable|numeric|min:0',
            'height_mm' => 'nullable|numeric|min:0',
            'brand' => 'nullable|string|max:255',
            'warranty_years' => 'nullable|integer|min:0|max:100',
            'type' => 'nullable|string|max:255',
            'panel_rated_power' => 'nullable|numeric|min:0',
            'maximum_operating_voltage_vmpp' => 'nullable|numeric|min:0',
            'maximum_operating_current_impp' => 'nullable|numeric|min:0',
            'open_circuit_voltage' => 'nullable|numeric|min:0',
            'short_circuit_current' => 'nullable|numeric|min:0',
            'module_efficiency' => 'nullable|numeric|min:0|max:100',
            'maximum_system_voltage' => 'nullable|numeric|min:0',
            'maximum_series_fuse_rating' => 'nullable|numeric|min:0',
            'num_of_cells' => 'nullable|integer|min:0',
            'wind_load_kg_per_m2' => 'nullable|numeric|min:0',
            'snow_load_kg_per_m2' => 'nullable|numeric|min:0',
            'operating_temperature_from' => 'nullable|numeric',
            'operating_temperature_to' => 'nullable|numeric',
            'temp_coefficient_of_pmax' => 'nullable|numeric',
            'temp_coefficient_of_voc' => 'nullable|numeric',
            'temp_coefficient_of_isc' => 'nullable|numeric',
            'nom_operating_cell_temp_noct' => 'nullable|numeric',
            'connector_type' => 'nullable|string|max:255',
            'status' => 'required|in:pending_review,active,deactive',
        ];

        $messages = [
            'name.required' => __('Panel name is required.'),
            'product_id.required' => __('Product ID is required.'),
            'panel_rated_power.min' => __('Panel rated power must be at least 0.'),
            'efficiency.max' => __('Efficiency cannot exceed 100%.'),
            'module_efficiency.max' => __('Module efficiency cannot exceed 100%.'),
        ];

        return Validator::make($request->all(), $rules, $messages);
    }

    /**
     * Calculate the panel score based on price per kW, efficiency, warranty, dimension per kW, and type.
     * Higher score means better panel.
     *
     * @param float|null $efficiency
     * @param int|null $warrantyYears
     * @param float|null $price
     * @param string|null $type
     * @param string|null $brand
     * @param float|null $width_mm
     * @param float|null $height_mm
     * @param float|null $panel_rated_power
     * @return float
     */
    public function calculateScore($efficiency, $price, $width_mm, $height_mm, $panel_rated_power)
    {
        // Fallback defaults
        $panel_rated_power = ($panel_rated_power && $panel_rated_power > 0) ? $panel_rated_power : 400;
        $price = ($price && $price > 0) ? $price : 1;
        $efficiency = ($efficiency && $efficiency > 0) ? $efficiency : 18;
        $width_m = ($width_mm && $width_mm > 0) ? $width_mm / 1000.0 : 2.0;
        $height_m = ($height_mm && $height_mm > 0) ? $height_mm / 1000.0 : 1.0;
        $area_m2 = $width_m * $height_m;

        // Derived indicators
        $area_per_kw = $area_m2 / ($panel_rated_power / 1000.0);  // m² per kW
        $price_per_kw = $price / ($panel_rated_power / 1000.0);   // MAD per kW

        // Normalized scores [all between 0 and 1]
        $eff_score   = min(max(($efficiency - 15) / (24 - 15), 0), 1);              // 15–24%
        $power_score = min(max(($panel_rated_power - 250) / (600 - 250), 0), 1);    // 250–600 W
        $price_score = 1 - min(max(($price_per_kw - 0.2) / (1.0 - 0.2), 0), 1);     // lower is better
        $area_score  = 1 - min(max(($area_per_kw - 3.0) / (8.0 - 3.0), 0), 1);      // lower is better

        // Equal weights: 25% each
        $score =
            ($eff_score   * 0.25) +
            ($power_score * 0.25) +
            ($price_score * 0.25) +
            ($area_score  * 0.25);

        return round($score * 100, 2);
    }
}
