<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_number_counters', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->string('prefix', 20);
            $table->string('period', 8);
            $table->string('origin', 20)->default('normal');
            $table->unsignedInteger('last_seq')->default(0);
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->unique(['store_id', 'prefix', 'period', 'origin']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_number_counters');
    }
};
