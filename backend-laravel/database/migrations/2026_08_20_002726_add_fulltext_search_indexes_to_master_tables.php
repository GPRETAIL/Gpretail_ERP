<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Products FULLTEXT index
        $prodIndexes = collect(DB::select("SHOW INDEX FROM products WHERE Key_name = 'ft_products_search'"));
        if ($prodIndexes->isEmpty()) {
            DB::statement('ALTER TABLE products ADD FULLTEXT INDEX ft_products_search (name, code, sku, barcode)');
        }

        // 2. Suppliers FULLTEXT index
        $supIndexes = collect(DB::select("SHOW INDEX FROM suppliers WHERE Key_name = 'ft_suppliers_search'"));
        if ($supIndexes->isEmpty()) {
            DB::statement('ALTER TABLE suppliers ADD FULLTEXT INDEX ft_suppliers_search (name, code, gstin, phone, email, company_name)');
        }

        // 3. Customers FULLTEXT index
        $custIndexes = collect(DB::select("SHOW INDEX FROM customers WHERE Key_name = 'ft_customers_search'"));
        if ($custIndexes->isEmpty()) {
            DB::statement('ALTER TABLE customers ADD FULLTEXT INDEX ft_customers_search (name, code, phone, email)');
        }

        // 4. Brands FULLTEXT index
        $brandIndexes = collect(DB::select("SHOW INDEX FROM brands WHERE Key_name = 'ft_brands_search'"));
        if ($brandIndexes->isEmpty()) {
            DB::statement('ALTER TABLE brands ADD FULLTEXT INDEX ft_brands_search (name, code)');
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE products DROP INDEX ft_products_search');
        DB::statement('ALTER TABLE suppliers DROP INDEX ft_suppliers_search');
        DB::statement('ALTER TABLE customers DROP INDEX ft_customers_search');
        DB::statement('ALTER TABLE brands DROP INDEX ft_brands_search');
    }
};
