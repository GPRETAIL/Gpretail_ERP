<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Encrypts the e-invoice password and GST access key already saved in plain text. Safe to run again: a value that already decrypts is left alone. */
return new class extends Migration
{
    private const COLUMNS = ['einvoice_password', 'gst_access_key'];

    public function up(): void
    {
        // Encrypted text is longer than the plain value, and a long key would not fit in 255 characters.
        Schema::table('stores', function (Blueprint $table) {
            foreach (self::COLUMNS as $column) {
                $table->text($column)->nullable()->change();
            }
        });

        DB::table('stores')->select(['id', ...self::COLUMNS])->orderBy('id')->each(function (object $row): void {
            $changes = [];
            foreach (self::COLUMNS as $column) {
                $value = $row->{$column};
                if ($value === null || $value === '') {
                    continue;
                }
                try {
                    Crypt::decryptString($value);
                } catch (DecryptException) {
                    $changes[$column] = Crypt::encryptString($value);
                }
            }
            if ($changes) {
                DB::table('stores')->where('id', $row->id)->update($changes);
            }
        });
    }

    public function down(): void
    {
        DB::table('stores')->select(['id', ...self::COLUMNS])->orderBy('id')->each(function (object $row): void {
            $changes = [];
            foreach (self::COLUMNS as $column) {
                $value = $row->{$column};
                if ($value === null || $value === '') {
                    continue;
                }
                try {
                    $changes[$column] = Crypt::decryptString($value);
                } catch (DecryptException) {
                    // Already plain text.
                }
            }
            if ($changes) {
                DB::table('stores')->where('id', $row->id)->update($changes);
            }
        });
    }
};
