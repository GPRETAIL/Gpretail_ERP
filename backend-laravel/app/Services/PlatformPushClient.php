<?php

namespace App\Services;

use App\Models\PlatformActivation;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class PlatformPushClient
{
    public function userKey(User $user): string
    {
        return hash_hmac('sha256', PlatformActivation::current()?->deployment_id.'|'.$user->id, (string) config('app.key'));
    }

    public function request(string $path, array $data = [], string $method = 'POST'): array
    {
        $activation = PlatformActivation::current();
        $url = rtrim((string) config('platform.base_url'), '/');
        if (! $activation?->activated || ! $activation->sync_token || ! str_starts_with($url, 'https://')) {
            return ['ok' => false, 'data' => []];
        }
        try {
            $client = Http::timeout(10)->withoutRedirecting()->withToken($activation->sync_token);
            $response = $client->send($method, $url.'/api/v1/tenant/'.$activation->company_code.'/push/'.$path, $method === 'GET' ? [] : ['json' => array_merge(['deployment_id' => $activation->deployment_id], $data)]);

            return ['ok' => $response->successful() && (bool) $response->json('success'), 'data' => $response->json('data') ?? []];
        } catch (\Throwable $error) {
            report($error);

            return ['ok' => false, 'data' => []];
        }
    }

    public function contact(User $user): array
    {
        $stores = app(StoreContext::class)->stores($user);
        $preferences = DB::table('notification_preferences')->where('user_id', $user->id)->first();

        return ['user_key' => $this->userKey($user), 'email_hash' => hash('sha256', strtolower(trim($user->email))),
            'active' => (bool) $user->is_active && ((bool) $user->web_access || (bool) $user->mobile_access || app(MobileAccess::class)->tenantAdmin($user)),
            'tenant_admin' => app(MobileAccess::class)->tenantAdmin($user), 'store_admin' => in_array($user->role, ['admin', 'super_admin'], true),
            'marketing' => (bool) ($preferences->marketing ?? false), 'quiet_start' => $preferences->quiet_start ?? 21, 'quiet_end' => $preferences->quiet_end ?? 8, 'timezone' => $preferences->timezone ?? config('app.timezone'),
            'store_ids' => $stores->pluck('platform_store_id')->filter()->map(fn ($id) => (int) $id)->values()->all(),
            'warehouse_ids' => Warehouse::withoutGlobalScopes()->where('platform_company_code', $user->platform_company_code)->whereIn('store_id', $stores->pluck('id'))->pluck('platform_warehouse_id')->filter()->map(fn ($id) => (int) $id)->values()->all()];
    }

    public function syncContacts(): void
    {
        $activation = PlatformActivation::current();
        if (! $activation?->activated) {
            return;
        }
        User::where('platform_company_code', $activation->company_code)->orderBy('id')->chunkById(100, function ($users) {
            $this->request('contacts', ['contacts' => $users->map(fn ($user) => $this->contact($user))->all()]);
        });
        $reads = DB::table('notification_receipts as receipt')->join('app_notifications as message', 'message.id', '=', 'receipt.notification_id')->join('users', 'users.id', '=', 'receipt.user_id')->where('message.platform_company_code', $activation->company_code)->whereNotNull('message.platform_message_uuid')->whereNull('receipt.reported_at')->select('receipt.id', 'receipt.user_id', 'message.platform_message_uuid')->limit(100)->get();
        if ($reads->isNotEmpty()) {
            $payload = $reads->map(fn ($row) => ['uuid' => $row->platform_message_uuid, 'user_key' => $this->userKey(User::findOrFail($row->user_id))])->all();
            if ($this->request('read', ['reads' => $payload])['ok']) {
                DB::table('notification_receipts')->whereIn('id', $reads->pluck('id'))->update(['reported_at' => now()]);
            }
        }
        DB::table('notification_devices')->orderBy('id')->chunkById(100, function ($devices) {
            foreach ($devices as $device) {
                $user = User::find($device->user_id);
                $token = DB::table('personal_access_tokens')->where('id', $device->token_id)->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->exists();
                if (! $user || ! $token || ! $user->is_active) {
                    if ($user && $this->request('unsubscribe', ['user_key' => $this->userKey($user), 'device_id' => $device->device_id])['ok']) {
                        DB::table('notification_devices')->where('id',$device->id)->delete();
                    }
                }
            }
        });
    }
}
