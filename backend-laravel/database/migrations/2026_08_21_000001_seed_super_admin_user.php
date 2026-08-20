<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ensure Super Admin (Global Platform Admin) exists
        $superAdminExists = DB::table('users')->where('email', 'superadmin@gpretail.uk')->orWhere('username', 'superadmin')->exists();
        if (!$superAdminExists) {
            DB::table('users')->insert([
                'name'                 => 'Super Administrator',
                'username'             => 'superadmin',
                'email'                => 'superadmin@gpretail.uk',
                'password'             => Hash::make('password'),
                'role'                 => 'super_admin',
                'store_id'             => null,
                'phone'                => '9876543210',
                'is_active'            => true,
                'must_change_password' => false,
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);
        }

        // 2. Ensure Tenant Admin (Store Level Admin) exists
        $tenantAdminExists = DB::table('users')->where('email', 'admin@gpretail.uk')->orWhere('username', 'admin')->exists();
        if (!$tenantAdminExists) {
            $storeId = DB::table('stores')->value('id');
            DB::table('users')->insert([
                'name'                 => 'Tenant Administrator',
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
        }
    }

    public function down(): void
    {
        DB::table('users')->where('username', 'superadmin')->delete();
    }
};
