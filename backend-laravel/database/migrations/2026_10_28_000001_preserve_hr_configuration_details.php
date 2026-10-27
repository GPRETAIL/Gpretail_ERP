<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['hr_departments', 'hr_designations'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->json('master_details')->nullable();
                $table->string('created_by')->nullable();
            });
        }
        Schema::table('hr_departments', function (Blueprint $table): void {
            // Legacy rows had no reliable type information. Keep them intact.
            $table->string('configuration_type', 40)->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('hr_departments', fn (Blueprint $table) => $table->dropColumn('configuration_type'));
        foreach (['hr_departments', 'hr_designations'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn(['master_details', 'created_by']));
        }
    }
};
