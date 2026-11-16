<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI Purchase Invoice > Upload from phone: the desktop page shows a QR code with a one-time link; the phone sends
 * the invoice photo or PDF to it and the page picks it up. A session lives for a few minutes and belongs to this
 * server only (never synced).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_upload_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('token', 64)->unique();
            $table->unsignedBigInteger('user_id')->index();
            $table->unsignedBigInteger('store_id')->nullable();
            $table->string('status', 16)->default('waiting'); // waiting, received, used
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('mime', 100)->nullable();
            $table->unsignedInteger('size')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_upload_sessions');
    }
};
