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
        Schema::create('inverters', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('product_id')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->string('brand')->nullable();
            $table->integer('warranty')->nullable();
            
            // Power specifications
            $table->decimal('nominal_ac_power_kw', 10, 2)->nullable();
            $table->decimal('max_dc_input_power', 10, 2)->nullable();
            
            // MPPT specifications
            $table->decimal('mppt_min_voltage', 10, 2)->nullable();
            $table->decimal('mppt_max_voltage', 10, 2)->nullable();
            $table->decimal('max_dc_voltage', 10, 2)->nullable();
            $table->decimal('max_dc_current_mppt', 10, 2)->nullable();
            $table->integer('no_of_mppt_ports')->nullable();
            $table->integer('max_strings_per_mppt')->nullable();
            
            // Efficiency
            $table->decimal('efficiency_max', 5, 2)->nullable();
            
            // AC specifications
            $table->string('ac_output_voltage')->nullable();
            $table->enum('phase_type', ['1P', '3P'])->nullable();
            
            // Protection and communication
            $table->string('spd_included')->nullable(); // DC/AC or None
            $table->string('ip_rating')->nullable();
            
            $table->enum('status', ['pending_review', 'active', 'deactive'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inverters');
    }
};
