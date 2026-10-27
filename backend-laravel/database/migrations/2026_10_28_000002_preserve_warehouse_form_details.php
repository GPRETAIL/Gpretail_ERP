<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['transport_entries', 'purchase_invoices'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->json('master_details')->nullable());
        }
        Schema::table('transport_entries', fn (Blueprint $table) => $table->string('created_by')->nullable());
    }

    public function down(): void
    {
        Schema::table('transport_entries', fn (Blueprint $table) => $table->dropColumn('created_by'));
        foreach (['transport_entries', 'purchase_invoices'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('master_details'));
        }
    }
};
