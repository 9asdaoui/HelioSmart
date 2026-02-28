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
        Schema::create('utility_rate_ranges', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('utility_id');
            $table->decimal('min', 10, 2)->nullable();
            $table->decimal('max', 10, 2)->nullable();
            $table->decimal('rate', 10, 4);
            $table->timestamps();
            $table->foreign('utility_id')->references('id')->on('utilities')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('utility_rate_ranges');
    }
};
