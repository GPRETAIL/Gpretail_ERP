<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Default Store
        $storeId = DB::table('stores')->insertGetId([
            'name'        => 'SRI BALAJI TEXTILE',
            'code'        => 'SBT_01',
            'address'     => 'Main Bazaar, Retail Street',
            'city'        => 'Chennai',
            'state'       => 'Tamil Nadu',
            'pincode'     => '600001',
            'phone'       => '9876543210',
            'email'       => 'contact@gpretail.uk',
            'gstin'       => '33AAAAA0000A1Z5',
            'state_code'  => '33',
            'is_active'   => true,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        // 2. Create Super Admin User
        DB::table('users')->insert([
            'name'                 => 'Super Admin',
            'username'             => 'admin',
            'email'                => 'admin@gpretail.uk',
            'password'             => Hash::make('password'),
            'role'                 => 'admin',
            'store_id'             => $storeId,
            'phone'                => '9876543210',
            'is_active'            => true,
            'must_change_password' => false,
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        // 3. Create Standard GST Taxes
        $taxes = [
            ['name' => 'GST 0%', 'code' => 'GST0', 'rate' => 0.00, 'type' => 'EXCLUSIVE', 'cgst_rate' => 0.00, 'sgst_rate' => 0.00, 'igst_rate' => 0.00],
            ['name' => 'GST 5%', 'code' => 'GST5', 'rate' => 5.00, 'type' => 'EXCLUSIVE', 'cgst_rate' => 2.50, 'sgst_rate' => 2.50, 'igst_rate' => 5.00],
            ['name' => 'GST 12%', 'code' => 'GST12', 'rate' => 12.00, 'type' => 'EXCLUSIVE', 'cgst_rate' => 6.00, 'sgst_rate' => 6.00, 'igst_rate' => 12.00],
            ['name' => 'GST 18%', 'code' => 'GST18', 'rate' => 18.00, 'type' => 'EXCLUSIVE', 'cgst_rate' => 9.00, 'sgst_rate' => 9.00, 'igst_rate' => 18.00],
            ['name' => 'GST 28%', 'code' => 'GST28', 'rate' => 28.00, 'type' => 'EXCLUSIVE', 'cgst_rate' => 14.00, 'sgst_rate' => 14.00, 'igst_rate' => 28.00],
        ];
        foreach ($taxes as $tax) {
            DB::table('taxes')->insert(array_merge($tax, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]));
        }

        // 4. Create Default Brands
        $brands = [
            ['name' => 'Vynerix Fashion', 'code' => 'VX_FASHION'],
            ['name' => 'Classic Cotton', 'code' => 'CLASSIC_COTTON'],
            ['name' => 'Royal Silk', 'code' => 'ROYAL_SILK'],
        ];
        foreach ($brands as $b) {
            DB::table('brands')->insert(array_merge($b, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]));
        }

        // 5. Create Default Categories
        $categories = [
            ['name' => 'Mens Wear', 'code' => 'MENS'],
            ['name' => 'Womens Wear', 'code' => 'WOMENS'],
            ['name' => 'Kids Wear', 'code' => 'KIDS'],
            ['name' => 'Fabrics & Silks', 'code' => 'FABRICS'],
        ];
        foreach ($categories as $c) {
            DB::table('categories')->insert(array_merge($c, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]));
        }

        // 6. Create Size Groups & Sizes
        $sgId = DB::table('size_groups')->insertGetId([
            'name' => 'Standard Apparel Sizes',
            'code' => 'STD_SIZES',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $sizes = ['S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44'];
        foreach ($sizes as $idx => $s) {
            DB::table('sizes')->insert([
                'size_group_id' => $sgId,
                'name' => $s,
                'code' => $s,
                'sort_order' => $idx + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 7. Create Default Supplier
        DB::table('suppliers')->insert([
            'name' => 'Sri Balaji Mills',
            'company_name' => 'Balaji Textiles Private Limited',
            'code' => 'SUP_BALAJI',
            'phone' => '9845123456',
            'email' => 'sales@balajimills.com',
            'city' => 'Coimbatore',
            'state' => 'Tamil Nadu',
            'gstin' => '33BBBBB1111B1Z2',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 8. Create Default Customer
        DB::table('customers')->insert([
            'name' => 'Walk-in Retail Customer',
            'code' => 'CUST_WALKIN',
            'phone' => '9999999999',
            'email' => 'walkin@gpretail.uk',
            'city' => 'Local',
            'state' => 'Tamil Nadu',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 9. Create System Configurations
        $configs = [
            ['key' => 'state', 'config_key' => 'state', 'value' => 'Tamil Nadu', 'config_value' => 'Tamil Nadu', 'group' => 'general', 'group_name' => 'general'],
            ['key' => 'city', 'config_key' => 'city', 'value' => 'Chennai', 'config_value' => 'Chennai', 'group' => 'general', 'group_name' => 'general'],
            ['key' => 'customer_category', 'config_key' => 'customer_category', 'value' => 'Retail', 'config_value' => 'Retail', 'group' => 'crm', 'group_name' => 'crm'],
            ['key' => 'sale_area', 'config_key' => 'sale_area', 'value' => 'Local Area', 'config_value' => 'Local Area', 'group' => 'sales', 'group_name' => 'sales'],
            ['key' => 'card_types', 'config_key' => 'card_types', 'value' => json_encode(['Visa', 'MasterCard', 'RuPay']), 'config_value' => json_encode(['Visa', 'MasterCard', 'RuPay']), 'group' => 'pos', 'group_name' => 'pos'],
            ['key' => 'upi_provider', 'config_key' => 'upi_provider', 'value' => json_encode(['Google Pay', 'PhonePe', 'Paytm', 'BHIM']), 'config_value' => json_encode(['Google Pay', 'PhonePe', 'Paytm', 'BHIM']), 'group' => 'pos', 'group_name' => 'pos'],
        ];
        foreach ($configs as $cfg) {
            DB::table('system_configurations')->insert(array_merge($cfg, ['created_at' => now(), 'updated_at' => now()]));
        }

        // 10. Create Default Product & Stock
        $prodId = DB::table('products')->insertGetId([
            'category_id' => 1,
            'brand_id'    => 1,
            'tax_id'      => 2,
            'name'        => 'Premium Men Cotton Shirt',
            'code'        => 'SHIRT_001',
            'sku'         => 'SKU-MENS-001',
            'barcode'     => '8901234567890',
            'unit'        => 'PCS',
            'cost_price'  => 350.00,
            'selling_price' => 699.00,
            'mrp'         => 899.00,
            'min_stock'   => 5,
            'max_stock'   => 100,
            'is_active'   => true,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        DB::table('stocks')->insert([
            'product_id' => $prodId,
            'store_id'   => $storeId,
            'quantity'   => 50.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

