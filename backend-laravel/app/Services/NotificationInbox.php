<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class NotificationInbox
{
    /** @return Builder<Notification> */
    public function visible(User $user): Builder
    {
        $context = app(StoreContext::class);
        $stores = $context->stores($user);
        $ids = $stores->pluck('id')->all();
        $platformIds = $stores->pluck('platform_store_id')->filter()->all();
        $warehouses = Warehouse::withoutGlobalScopes()->where('platform_company_code', $user->platform_company_code)->whereIn('store_id', $ids)->pluck('platform_warehouse_id')->filter()->all();
        $tenantAdmin = $context->authFields($user)['is_tenant_admin'];
        $marketing = (bool) DB::table('notification_preferences')->where('user_id', $user->id)->value('marketing');
        $query = Notification::withoutGlobalScope('http_store_context')->where(function ($query) use ($user, $ids, $platformIds, $warehouses, $tenantAdmin, $marketing) {
            $query->where(fn ($legacy) => $legacy->whereNull('platform_message_uuid')->whereIn('store_id', $ids))
                ->orWhere(function ($platform) use ($user, $platformIds, $warehouses, $tenantAdmin, $marketing) {
                    $platform->whereNotNull('platform_message_uuid')->where('platform_company_code', $user->platform_company_code ?? '__unregistered__')->whereNull('revoked_at')->where('expires_at', '>', now());
                    $platform->where(fn ($scope) => $scope->whereNull('platform_store_id')->orWhereIn('platform_store_id', $platformIds));
                    $platform->where(fn ($scope) => $scope->whereNull('platform_warehouse_id')->orWhereIn('platform_warehouse_id', $warehouses));
                    if (! $tenantAdmin) {
                        $platform->where(function ($audience) use ($user) {
                            $audience->where('audience', 'all');
                            if (in_array($user->role, ['admin', 'super_admin'], true)) {
                                $audience->orWhere(fn ($admin) => $admin->where('audience', 'admins')->whereNotNull('platform_store_id'));
                            }
                        });
                    }
                    if (! $marketing) {
                        $platform->where('category', '!=', 'offer');
                    }
                });
        });

        return $query;
    }

    public function query(User $user): Builder
    {
        return $this->visible($user)->leftJoin('notification_receipts as recipient', function ($join) use ($user) {
            $join->on('recipient.notification_id', '=', 'app_notifications.id')->where('recipient.user_id', $user->id);
        })
            ->select('app_notifications.*')->selectRaw('COALESCE(recipient.read_at, app_notifications.read_at) AS read_at');
    }

    public function unread(User $user): Builder
    {
        return $this->query($user)->whereNull('recipient.read_at')->whereNull('app_notifications.read_at');
    }

    public function markRead(User $user, int $id): void
    {
        $this->visible($user)->findOrFail($id);
        DB::table('notification_receipts')->insertOrIgnore(['notification_id' => $id, 'user_id' => $user->id, 'read_at' => now()]);
    }
}
