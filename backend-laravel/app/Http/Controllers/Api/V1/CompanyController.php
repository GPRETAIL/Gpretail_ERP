<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $stores = Store::where('is_active', true)->get();
        return response()->json([
            'success' => true,
            'data'    => $stores,
        ]);
    }

    public function subscriptionStatus(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'status'        => 'ACTIVE',
                'plan'          => 'Enterprise Multi-Store',
                'expiry_date'   => '2028-12-31',
                'days_left'     => 999,
                'max_users'     => 50,
                'current_users' => 1,
                'features'      => [
                    'pos'        => true,
                    'warehouse'  => true,
                    'reports'    => true,
                    'multi_store'=> true,
                    'cloud_sync' => true,
                ],
            ],
        ]);
    }

    public function backupsOverview(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'last_backup'    => now()->subHours(2)->toIso8601String(),
                'status'         => 'HEALTHY',
                'backup_size_mb' => 42.8,
                'total_backups'  => 14,
                'auto_backup'    => true,
            ],
        ]);
    }
}
