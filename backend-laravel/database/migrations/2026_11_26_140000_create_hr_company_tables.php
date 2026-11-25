<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Company part of the staff app: announcements and policies (with who read and agreed), helpdesk tickets with their
 * replies, and documents HR keeps for an employee (offer letter, ID card, Form 16). Every table belongs to one store.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('category', 20)->default('ANNOUNCEMENT'); // ANNOUNCEMENT or POLICY
            $table->string('title', 150);
            $table->text('body');
            $table->boolean('is_pinned')->default(false);
            $table->date('publish_on');
            $table->date('expires_on')->nullable();
            $table->unsignedBigInteger('department_id')->nullable(); // Empty: everyone in the store.
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'publish_on']);
        });

        Schema::create('hr_announcement_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('announcement_id')->constrained('hr_announcements')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable(); // "I have read and agree" on a policy.
            $table->timestamps();
            $table->unique(['announcement_id', 'employee_id']);
        });

        Schema::create('hr_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('category', 30)->default('OTHER');
            $table->string('subject', 150);
            $table->text('message');
            $table->string('status', 20)->default('OPEN'); // OPEN, IN_PROGRESS, CLOSED
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->unsignedBigInteger('closed_by')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'status']);
            $table->index(['employee_id', 'status']);
        });

        Schema::create('hr_ticket_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('ticket_id')->constrained('hr_tickets')->cascadeOnDelete();
            $table->string('author_type', 10); // EMPLOYEE or HR
            $table->unsignedBigInteger('author_user_id')->nullable();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('hr_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('type', 30)->default('OTHER'); // OFFER_LETTER, ID_CARD, FORM_16, OTHER
            $table->string('title', 150);
            $table->string('file_path', 255);
            $table->string('mime', 100)->nullable();
            $table->unsignedInteger('size')->default(0);
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_documents');
        Schema::dropIfExists('hr_ticket_replies');
        Schema::dropIfExists('hr_tickets');
        Schema::dropIfExists('hr_announcement_reads');
        Schema::dropIfExists('hr_announcements');
    }
};
