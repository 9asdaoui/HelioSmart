<?php

namespace Modules\Estimation\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Database\Eloquent\Model;

class EstimationDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Model::unguard();

        $this->call([
            SolarConfigsTableSeeder::class,
        ]);

        $this->command->info('Estimation module seeded successfully!');
    }
}
