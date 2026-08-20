<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductBulkSeeder extends Seeder
{
    public function run(): void
    {
        $targetCount = 25000;
        $batchSize   = 1000;

        $categoryIds  = DB::table('categories')->pluck('id')->toArray();
        $brandIds     = DB::table('brands')->pluck('id')->toArray();
        $taxIds       = DB::table('taxes')->pluck('id')->toArray();
        $sizeGroupIds = DB::table('size_groups')->pluck('id')->toArray();

        // Fallbacks if empty
        if (empty($categoryIds)) {
            $catId = DB::table('categories')->insertGetId([
                'name'       => 'General Textiles',
                'code'       => 'CAT_GEN',
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $categoryIds = [$catId];
        }

        if (empty($brandIds)) {
            $bId = DB::table('brands')->insertGetId([
                'name'       => 'Standard',
                'code'       => 'BRD_STD',
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $brandIds = [$bId];
        }

        if (empty($taxIds)) {
            $tId = DB::table('taxes')->insertGetId([
                'name'       => 'GST 5%',
                'code'       => 'GST5',
                'rate'       => 5.00,
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $taxIds = [$tId];
        }

        $sizeGroupId = !empty($sizeGroupIds) ? $sizeGroupIds[0] : null;

        // Realistic seed components
        $fabrics = [
            'Pure Cotton', 'Linen Blend', 'Mulberry Silk', 'Rayon Twill', 'Raw Silk',
            'Stretch Denim', 'Khadi Handloom', 'Modal Cotton', 'Poly Viscose', 'Satin Crepe',
            'Velvet Plush', 'Georgette Print', 'Chiffon Dobby', 'Corduroy', 'Organic Cotton'
        ];

        $apparelTypes = [
            'Slim Fit Casual Shirt', 'Formal Regular Shirt', 'Classic Chino Trousers',
            'Denim Washed Jeans', 'Round Neck Printed T-Shirt', 'Polo Collar Sport Tee',
            'Handloom Cotton Saree', 'Embroidered Anarkali Kurti', 'Straight Fit Kurta',
            'Silk Festive Dhoti', 'Casual Stretch Trackpants', 'Tailored Single Blazer',
            'Jacquard Nehru Jacket', 'Soft Terry Bath Towel', 'Queen Size Bedsheet Set',
            'Winter Fleece Hoodie', 'Printed Nightwear Lounge Set', 'Kids Party Wear Frock',
            'Pencil Fit Formal Trousers', 'Linen Short Sleeve Shirt'
        ];

        $colors = [
            'Navy Blue', 'Crimson Red', 'Olive Green', 'Jet Black', 'Pure White',
            'Mustard Yellow', 'Charcoal Grey', 'Pastel Peach', 'Emerald Green',
            'Maroon Wine', 'Royal Blue', 'Beige Khaki', 'Teal Blue', 'Lavender'
        ];

        $hsnCodes = ['5208', '5209', '6105', '6109', '6203', '6204', '6205', '6302', '6304'];
        $units    = ['PCS', 'MTR', 'SET', 'PKT', 'BOX'];

        $existingMax = (int) DB::table('products')->max('id') ?? 0;
        $now = now()->toDateTimeString();

        $this->command->info("Starting insertion of {$targetCount} products in batches of {$batchSize}...");
        $startTime = microtime(true);

        $insertedTotal = 0;
        $batches = (int) ceil($targetCount / $batchSize);

        for ($b = 0; $b < $batches; $b++) {
            $rows = [];
            $batchRows = min($batchSize, $targetCount - $insertedTotal);

            for ($i = 1; $i <= $batchRows; $i++) {
                $idx = $existingMax + $insertedTotal + $i;

                $fabric  = $fabrics[($idx * 7) % count($fabrics)];
                $apparel = $apparelTypes[($idx * 11) % count($apparelTypes)];
                $color   = $colors[($idx * 13) % count($colors)];

                $productName = "{$fabric} {$apparel} - {$color}";
                $code        = 'PRD' . str_pad((string) $idx, 6, '0', STR_PAD_LEFT);
                $sku         = 'SKU' . str_pad((string) $idx, 6, '0', STR_PAD_LEFT);
                $barcode     = '890' . str_pad((string) $idx, 9, '0', STR_PAD_LEFT);
                $hsn         = $hsnCodes[$idx % count($hsnCodes)];
                $unit        = $units[$idx % count($units)];

                // Realistic pricing calculation
                $baseCost     = round(120 + (($idx * 17) % 1800) + (($idx % 10) * 5), 2);
                $marginMultiplier = 1.25 + (($idx % 15) * 0.02); // 25% to 55% margin
                $sellingPrice = round($baseCost * $marginMultiplier, 2);
                $mrp          = round($sellingPrice * 1.20, 2); // 20% above selling price

                $catId   = $categoryIds[$idx % count($categoryIds)];
                $brandId = $brandIds[$idx % count($brandIds)];
                $taxId   = $taxIds[$idx % count($taxIds)];

                $minStock = ($idx % 5) * 5;      // 0, 5, 10, 15, 20
                $maxStock = 50 + (($idx % 10) * 50); // 50 to 500

                $rows[] = [
                    'category_id'   => $catId,
                    'brand_id'      => $brandId,
                    'tax_id'        => $taxId,
                    'size_group_id' => $sizeGroupId,
                    'name'          => $productName,
                    'code'          => $code,
                    'sku'           => $sku,
                    'barcode'       => $barcode,
                    'hsn_code'      => $hsn,
                    'unit'          => $unit,
                    'cost_price'    => $baseCost,
                    'selling_price' => $sellingPrice,
                    'mrp'           => $mrp,
                    'min_stock'     => $minStock,
                    'max_stock'     => $maxStock,
                    'description'   => "Premium quality {$fabric} {$apparel} in {$color}. Durable finish and standard fit.",
                    'image'         => null,
                    'is_active'     => true,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ];
            }

            DB::table('products')->insert($rows);
            $insertedTotal += $batchRows;

            if ($insertedTotal % 5000 === 0 || $insertedTotal === $targetCount) {
                $elapsed = round(microtime(true) - $startTime, 2);
                $this->command->info("Inserted {$insertedTotal}/{$targetCount} products ({$elapsed}s)...");
            }
        }

        $totalTime = round(microtime(true) - $startTime, 2);
        $finalCount = DB::table('products')->count();
        $this->command->info("Successfully inserted {$insertedTotal} products in {$totalTime}s. Total products in database: {$finalCount}.");
    }
}
