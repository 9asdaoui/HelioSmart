<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('estimations', function (Blueprint $table) {
            $table->string('roof_type')->nullable()->after('building_floors');
            $table->decimal('roof_tilt', 5, 2)->nullable()->after('roof_type')->comment('Roof tilt angle in degrees (0-90)');
            $table->decimal('roof_net_tilt', 5, 2)->nullable()->after('roof_tilt')->comment('Calculated net tilt considering optimal angle');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('estimations', function (Blueprint $table) {
            $table->dropColumn(['roof_type', 'roof_tilt', 'roof_net_tilt']);
        });
    }
};
