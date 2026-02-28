<?php

namespace Modules\Estimation\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class SolarConfigsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Model::unguard();

        // Clear existing data
        DB::table('solar_configs')->truncate();

        $configs = [
            // Mounting Structure Cost Configuration
            [
                'name' => 'Support Unit Price',
                'key' => 'support_unit_price',
                'value' => '300',
                'description' => 'Price per panel support unit in MAD'
            ],
            [
                'name' => 'Rail Unit Price',
                'key' => 'rail_unit_price',
                'value' => '120',
                'description' => 'Price per meter of rail in MAD'
            ],
            [
                'name' => 'Clamp Unit Price',
                'key' => 'clamp_unit_price',
                'value' => '15',
                'description' => 'Price per clamp in MAD'
            ],
            [
                'name' => 'Foundation Unit Price',
                'key' => 'foundation_unit_price',
                'value' => '200',
                'description' => 'Price per foundation point in MAD'
            ],

            // Foundation Ratio Configuration (by installation type)
            [
                'name' => 'Foundation Ratio - Rooftop Flat',
                'key' => 'foundation_ratio_rooftop_flat',
                'value' => '0.7',
                'description' => 'Foundation ratio for flat rooftop installations'
            ],
            [
                'name' => 'Foundation Ratio - Rooftop Tilted',
                'key' => 'foundation_ratio_rooftop_tilted',
                'value' => '0.2',
                'description' => 'Foundation ratio for tilted rooftop installations'
            ],
            [
                'name' => 'Foundation Ratio - Ground',
                'key' => 'foundation_ratio_ground',
                'value' => '1.2',
                'description' => 'Foundation ratio for ground mount installations'
            ],
            [
                'name' => 'Foundation Ratio - Carport',
                'key' => 'foundation_ratio_carport',
                'value' => '1.5',
                'description' => 'Foundation ratio for carport installations'
            ],
            [
                'name' => 'Foundation Ratio - Floating',
                'key' => 'foundation_ratio_floating',
                'value' => '1.0',
                'description' => 'Foundation ratio for floating installations'
            ],
            [
                'name' => 'Foundation Ratio - Default',
                'key' => 'foundation_ratio_default',
                'value' => '1.0',
                'description' => 'Default foundation ratio for other installation types'
            ],

            // Electricity and Energy Configuration
            [
                'name' => 'Electricity Rate',
                'key' => 'electricity_rate',
                'value' => '1.5',
                'description' => 'Default electricity rate in MAD per kWh'
            ],
            [
                'name' => 'Solar Production Factor',
                'key' => 'solar_production_factor',
                'value' => '1600',
                'description' => 'Default solar production factor in kWh/kW/year'
            ],

            // Panel and System Configuration
            [
                'name' => 'Default Panel ID',
                'key' => 'panel_id',
                'value' => '21',
                'description' => 'Fallback panel ID when no panel is specified'
            ],
            [
                'name' => 'Panels per kW',
                'key' => 'panels_per_kw',
                'value' => '2.5',
                'description' => 'Number of panels needed per kW of system capacity'
            ],
            [
                'name' => 'Optimal Tilt Angle',
                'key' => 'optimal_tilt_angle',
                'value' => '20',
                'description' => 'Optimal panel tilt angle in degrees for Morocco'
            ],
            [
                'name' => 'Default Azimuth',
                'key' => 'default_azimuth',
                'value' => '180',
                'description' => 'Default azimuth angle in degrees (South facing)'
            ],
            [
                'name' => 'Default System Losses',
                'key' => 'default_losses_percent',
                'value' => '14',
                'description' => 'Default system losses percentage'
            ],

            // System Loss Efficiency Configuration
            [
                'name' => 'Temperature Efficiency',
                'key' => 'eta_temperature',
                'value' => '0.85',
                'description' => 'Temperature efficiency factor (0-1) - Used in createProject method'
            ],
            [
                'name' => 'Soiling Efficiency',
                'key' => 'eta_soiling',
                'value' => '0.95',
                'description' => 'Soiling efficiency factor (0-1) - Used in createProject method'
            ],
            [
                'name' => 'Mismatch Efficiency',
                'key' => 'eta_mismatch',
                'value' => '0.98',
                'description' => 'Panel mismatch efficiency factor (0-1) - Used in createProject method'
            ],
            [
                'name' => 'Other Losses Efficiency',
                'key' => 'eta_other',
                'value' => '0.95',
                'description' => 'Other system losses efficiency factor (0-1) - Used in createProject method'
            ],

            // Inverter Configuration (Legacy)
            [
                'name' => 'Inverter Capacity',
                'key' => 'inverter_capacity_kw',
                'value' => '10',
                'description' => 'Default inverter capacity in kW'
            ],
            [
                'name' => 'Single Inverter Price',
                'key' => 'single_inverter_price',
                'value' => '15000',
                'description' => 'Price per inverter in MAD'
            ],
            [
                'name' => 'Default Inverter Type',
                'key' => 'default_inverter_type',
                'value' => 'String Inverter',
                'description' => 'Default inverter type when not specified'
            ],

            // Cost and Financial Configuration
            [
                'name' => 'Single Panel Price',
                'key' => 'single_panel_price',
                'value' => '3200',
                'description' => 'Default price per panel in MAD'
            ],
            [
                'name' => 'Installation Cost Percentage',
                'key' => 'installation_cost_percent',
                'value' => '30',
                'description' => 'Installation cost as percentage of system cost'
            ],
            [
                'name' => 'Consultation Fees Percentage',
                'key' => 'consultation_fees_percent',
                'value' => '5',
                'description' => 'Consultation fees as percentage of system cost'
            ],
            [
                'name' => 'System Lifespan',
                'key' => 'system_lifespan_years',
                'value' => '25',
                'description' => 'Expected system lifespan in years'
            ],

            // Environmental Impact Configuration
            [
                'name' => 'CO2 Reduction Factor',
                'key' => 'co2_reduction_factor',
                'value' => '0.5',
                'description' => 'CO2 reduction in kg per kWh generated'
            ],
            [
                'name' => 'Tree CO2 Absorption',
                'key' => 'tree_absorption_co2_kg',
                'value' => '20',
                'description' => 'CO2 absorption per tree per year in kg'
            ],
            [
                'name' => 'Gas Savings per kWh',
                'key' => 'gas_savings_per_kwh',
                'value' => '0.1',
                'description' => 'Gas savings per kWh in liters equivalent'
            ],
            [
                'name' => 'Water Saved per kWh',
                'key' => 'water_saved_per_kwh',
                'value' => '5',
                'description' => 'Water saved per kWh in liters'
            ],

            // Panel Performance Configuration
            [
                'name' => 'Panel Degradation Rate',
                'key' => 'panel_degradation_rate',
                'value' => '0.005',
                'description' => 'Annual panel degradation rate (0.5% per year)'
            ],

            // Alternative System Loss Efficiency Values (found in calculateTotalSystemLoss method)
            // Note: These have different default values than the ones used in createProject
            [
                'name' => 'Temperature Efficiency (Alternative)',
                'key' => 'eta_temperature_alt',
                'value' => '0.97',
                'description' => 'Alternative temperature efficiency factor used in calculateTotalSystemLoss method'
            ],
            [
                'name' => 'Soiling Efficiency (Alternative)',
                'key' => 'eta_soiling_alt',
                'value' => '0.97',
                'description' => 'Alternative soiling efficiency factor used in calculateTotalSystemLoss method'
            ],
            [
                'name' => 'Mismatch Efficiency (Alternative)',
                'key' => 'eta_mismatch_alt',
                'value' => '0.99',
                'description' => 'Alternative panel mismatch efficiency factor used in calculateTotalSystemLoss method'
            ],
            [
                'name' => 'Other Losses Efficiency (Alternative)',
                'key' => 'eta_other_alt',
                'value' => '0.98',
                'description' => 'Alternative other system losses efficiency factor used in calculateTotalSystemLoss method'
            ]
        ];

        foreach ($configs as $config) {
            DB::table('solar_configs')->insert([
                'name' => $config['name'],
                'key' => $config['key'],
                'value' => $config['value'],
                'description' => $config['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('Solar configurations seeded successfully!');
    }
}
