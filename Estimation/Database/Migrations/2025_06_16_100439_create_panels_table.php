<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('panels', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('product_id');
            $table->decimal('price', 10, 2)->nullable();
            $table->decimal('weight_kg', 10, 2)->nullable();
            $table->decimal('width_mm', 10, 2)->nullable();
            $table->decimal('height_mm', 10, 2)->nullable();
            $table->string('brand')->nullable();
            $table->integer('warranty_years')->nullable();
            $table->string('type')->nullable();
            
            $table->decimal('panel_rated_power', 10, 2)->nullable();
            $table->decimal('maximum_operating_voltage_vmpp', 10, 2)->nullable();
            $table->decimal('maximum_operating_current_impp', 10, 2)->nullable();
            $table->decimal('open_circuit_voltage', 10, 2)->nullable();
            $table->decimal('short_circuit_current', 10, 2)->nullable();
            $table->decimal('module_efficiency', 5, 2)->nullable();
            $table->decimal('maximum_system_voltage', 10, 2)->nullable();
            $table->decimal('maximum_series_fuse_rating', 10, 2)->nullable();
            
            $table->integer('num_of_cells')->nullable();
            $table->decimal('wind_load_kg_per_m2', 10, 2)->nullable();
            $table->decimal('snow_load_kg_per_m2', 10, 2)->nullable();
            
            $table->decimal('operating_temperature_from', 10, 2)->nullable();
            $table->decimal('operating_temperature_to', 10, 2)->nullable();
            $table->decimal('temp_coefficient_of_pmax', 10, 6)->nullable();
            $table->decimal('temp_coefficient_of_voc', 10, 6)->nullable();
            $table->decimal('temp_coefficient_of_isc', 10, 6)->nullable();
            $table->decimal('nom_operating_cell_temp_noct', 10, 2)->nullable();
            $table->string('connector_type')->nullable();
            $table->integer('score')->nullable();
            $table->string('status')->default('active');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('panels');
    }
};
