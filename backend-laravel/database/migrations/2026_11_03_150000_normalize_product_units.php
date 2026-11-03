<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Product units as GST unit codes: the Product form offered "Piece", "Meter", "Litter"… while the column default
 * (and every product saved without a UOM) is "PCS", so those products showed an empty UOM when reopened.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (Product::UNIT_ALIASES as $alias => $code) {
            DB::table('products')->whereRaw('LOWER(TRIM(unit)) = ?', [$alias])->where('unit', '<>', $code)->update(['unit' => $code]);
        }
    }

    public function down(): void
    {
        // The old spellings are not restored; the codes are what the form offers now.
    }
};
