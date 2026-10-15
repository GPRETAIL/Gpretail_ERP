<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Warehouse>
 */
class WarehouseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'platform_warehouse_id' => fake()->unique()->numberBetween(10000, 999999),
            'platform_company_code' => 'CMP-TEST',
            'name' => fake()->company(),
            'code' => fake()->unique()->bothify('WH-######'),
            'is_active' => false,
        ];
    }
}
