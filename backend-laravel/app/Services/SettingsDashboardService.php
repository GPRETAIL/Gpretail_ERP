<?php

namespace App\Services;

use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Settings tab of the main Dashboard -- sibling to the other dashboard
 * services. Covers system administration: users, employees/HR structure,
 * stores, system configuration, and backup health.
 */
class SettingsDashboardService
{
    public function getDashboardData(array $filters, $user): array
    {
        $summary = $this->getSummary();
        $actionRequired = $this->getActionRequired();
        $breakdown = $this->getSystemBreakdown();
        $recentBackups = $this->getRecentBackups(5);
        $stores = $this->getAvailableStores($user);

        return [
            'summary'          => $summary,
            'action_required'  => $actionRequired,
            'breakdown'        => $breakdown,
            'recent_backups'   => $recentBackups,
            'stores'           => $stores,
            'last_updated'     => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Primary Summary KPI Cards
     */
    public function getSummary(): array
    {
        $totalUsers = DB::table('users')->count();
        $activeUsers = DB::table('users')->where('is_active', true)->count();
        $totalEmployees = DB::table('employees')->count();
        $activeEmployees = DB::table('employees')->where('is_active', true)->count();
        $totalStores = DB::table('stores')->count();
        $activeStores = DB::table('stores')->where('is_active', true)->count();
        $configCount = DB::table('system_configurations')->count();

        $lastBackup = DB::table('backups')
            ->where('status', 'success')
            ->orderByDesc('completed_at')
            ->first();

        return [
            'total_users'      => $totalUsers,
            'active_users'     => $activeUsers,
            'total_employees'  => $totalEmployees,
            'active_employees' => $activeEmployees,
            'total_stores'     => $totalStores,
            'active_stores'    => $activeStores,
            'config_count'     => $configCount,
            'last_backup_at'   => $lastBackup->completed_at ?? null,
            'last_backup_size' => $lastBackup->file_size_label ?? null,
        ];
    }

    /**
     * Action Required: administrative housekeeping items.
     */
    public function getActionRequired(): array
    {
        $mustChangePassword = DB::table('users')->where('must_change_password', true)->count();
        $inactiveUsers = DB::table('users')->where('is_active', false)->count();
        $inactiveStores = DB::table('stores')->where('is_active', false)->count();

        $lastBackup = DB::table('backups')
            ->where('status', 'success')
            ->orderByDesc('completed_at')
            ->value('completed_at');
        $backupStale = !$lastBackup || Carbon::parse($lastBackup)->lt(Carbon::now()->subDays(7));

        $employeesNoDepartment = DB::table('employees')->whereNull('department_id')->count();
        $failedBackups = DB::table('backups')->where('status', '!=', 'success')->count();

        return [
            [
                'key'          => 'must_change_password',
                'label'        => 'Users Must Change Password',
                'count'        => $mustChangePassword,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/settings/user-access',
                'filter_param' => 'filter=must_change_password',
            ],
            [
                'key'          => 'backup_stale',
                'label'        => 'Backup Overdue (7+ days)',
                'count'        => $backupStale ? 1 : 0,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/settings/backup',
                'filter_param' => 'filter=overdue',
            ],
            [
                'key'          => 'failed_backups',
                'label'        => 'Failed Backups',
                'count'        => $failedBackups,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/settings/backup',
                'filter_param' => 'status=failed',
            ],
            [
                'key'          => 'inactive_users',
                'label'        => 'Inactive Users',
                'count'        => $inactiveUsers,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/settings/user-access',
                'filter_param' => 'filter=inactive',
            ],
            [
                'key'          => 'employees_no_department',
                'label'        => 'Employees Without Department',
                'count'        => $employeesNoDepartment,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/hrms/employee',
                'filter_param' => 'filter=no_department',
            ],
            [
                'key'          => 'inactive_stores',
                'label'        => 'Inactive Stores',
                'count'        => $inactiveStores,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/settings/configure-local-server',
                'filter_param' => 'filter=inactive',
            ],
        ];
    }

    /**
     * System Overview tiles.
     */
    public function getSystemBreakdown(): array
    {
        return [
            'users'       => ['count' => DB::table('users')->count(), 'label' => 'Users'],
            'employees'   => ['count' => DB::table('employees')->count(), 'label' => 'Employees'],
            'departments' => ['count' => DB::table('hr_departments')->count(), 'label' => 'Departments'],
            'stores'      => ['count' => DB::table('stores')->count(), 'label' => 'Stores'],
            'configs'     => ['count' => DB::table('system_configurations')->count(), 'label' => 'System Configs'],
            'backups'     => ['count' => DB::table('backups')->count(), 'label' => 'Backups'],
        ];
    }

    /**
     * Recent backup runs
     */
    public function getRecentBackups(int $limit = 5): array
    {
        $rows = DB::table('backups')
            ->select(['id', 'file_name', 'backup_type', 'storage_mode', 'file_size_label', 'status', 'completed_at'])
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        return $rows->toArray();
    }

    public function getAvailableStores($user): array
    {
        $role = strtolower((string) ($user?->role ?? ''));
        $isSuperAdmin = in_array($role, ['super_admin', 'superadmin'], true);

        if ($isSuperAdmin) {
            return Store::select('id', 'name', 'code')->orderBy('name')->get()->toArray();
        }

        $storeId = (int) ($user?->store_id ?: $user?->company_id ?: 0);
        if ($storeId) {
            return Store::where('id', $storeId)->select('id', 'name', 'code')->get()->toArray();
        }

        return [];
    }
}
