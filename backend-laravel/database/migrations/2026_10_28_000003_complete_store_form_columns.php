<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // These fields already belong to the company form/model, but fresh installs
        // never received their columns. Do not replace values on older installations.
        foreach (['reg_name', 'contact_person', 'admin_name', 'admin_email', 'admin_password',
            'gst_username', 'einvoice_username', 'einvoice_password', 'gst_access_key',
            'pf_esi_no', 'tan_pan', 'bank_account_name', 'account_no', 'ifsc', 'website', 'logo', 'access_level'] as $column) {
            if (! Schema::hasColumn('stores', $column)) {
                Schema::table('stores', fn (Blueprint $table) => $table->string($column)->nullable());
            }
        }
        if (! Schema::hasColumn('stores', 'internal_vendor_margin')) {
            Schema::table('stores', fn (Blueprint $table) => $table->decimal('internal_vendor_margin', 8, 2)->nullable());
        }
        foreach (['as_supplier', 'as_customer'] as $column) {
            if (! Schema::hasColumn('stores', $column)) {
                Schema::table('stores', fn (Blueprint $table) => $table->boolean($column)->default(false));
            }
        }
        foreach (['access_modules', 'printer_configurations'] as $column) {
            if (! Schema::hasColumn('stores', $column)) {
                Schema::table('stores', fn (Blueprint $table) => $table->json($column)->nullable());
            }
        }
    }

    public function down(): void
    {
        // Preserve company details and any pre-existing legacy columns on rollback.
    }
};
