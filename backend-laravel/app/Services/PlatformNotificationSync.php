<?php

namespace App\Services;

use App\Models\PlatformActivation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class PlatformNotificationSync
{
    public function syncIfStale(): void
    {
        $activation = PlatformActivation::current();
        if (! $activation?->activated || ! $activation->sync_token || ! $activation->deployment_id) {
            return;
        }
        $last = DB::table('platform_notification_syncs')->where('company_code', $activation->company_code)->value('last_synced_at');
        if ($last && Carbon::parse($last)->greaterThan(now()->subSeconds(30))) {
            return;
        }
        if (! Cache::add('platform-notification-attempt:'.$activation->company_code, true, 30)) {
            return;
        }
        $this->sync(6);
    }

    public function sync(int $timeout = 15): array
    {
        $activation = PlatformActivation::current();
        if (! $activation?->activated || ! $activation->sync_token || ! $activation->deployment_id) {
            return ['ok' => false, 'message' => 'Activate this deployment before syncing notifications.'];
        }
        $url = rtrim((string) config('platform.base_url'), '/');
        if (! str_starts_with($url, 'https://') && ! (app()->environment(['local', 'testing']) && in_array(parse_url($url, PHP_URL_HOST), ['localhost', '127.0.0.1', '::1'], true))) {
            return ['ok' => false, 'message' => 'Notification sync requires HTTPS.'];
        }
        $result = Cache::lock('platform-notification-sync', 60)->get(function () use ($activation, $url, $timeout) {
            DB::table('platform_notification_syncs')->insertOrIgnore(['company_code' => $activation->company_code, 'cursor' => 0]);
            try {
                $state = DB::table('platform_notification_syncs')->where('company_code', $activation->company_code)->first();
                $pending = json_decode($state->pending_acks ?? '[]', true) ?: [];
                if ($pending) {
                    $ack = Http::connectTimeout(min(3, $timeout))->timeout($timeout)->withoutRedirecting()->withToken($activation->sync_token)->post($url.'/api/v1/tenant/'.$activation->company_code.'/notifications/ack', ['deployment_id' => $activation->deployment_id, 'sequences' => $pending]);
                    if (! $ack->successful() || ! $ack->json('success')) {
                        throw new \RuntimeException('Notification import acknowledgment was rejected.');
                    }
                    DB::table('platform_notification_syncs')->where('company_code', $activation->company_code)->update(['pending_acks' => null]);
                }
                $response = Http::connectTimeout(min(3, $timeout))->timeout($timeout)->withoutRedirecting()->withToken($activation->sync_token)->get($url.'/api/v1/tenant/'.$activation->company_code.'/notifications', ['after' => $state->cursor]);
                if (! $response->successful() || ! $response->json('success')) {
                    throw new \RuntimeException('Notification feed could not be reached or authorized.');
                }
                $data = $response->json('data');
                Validator::make($data ?? [], ['messages' => 'present|array|max:100', 'cursor' => 'required|integer|min:'.$state->cursor])->validate();
                $last = (int) $state->cursor;
                foreach ($data['messages'] as $message) {
                    Validator::make($message, ['sequence' => 'required|integer|min:1', 'uuid' => 'required|uuid', 'revision' => 'required|integer|min:1',
                        'active' => 'required|boolean', 'company_code' => 'required|string', 'title' => 'present|string|max:255', 'message' => 'present|string|max:20000',
                        'audience' => 'required|in:admins,all', 'category' => 'required|in:subscription,billing,service,offer', 'priority' => 'required|in:normal,high',
                        'action' => 'nullable|in:subscription,inbox', 'platform_store_id' => 'nullable|integer|min:1', 'platform_warehouse_id' => 'nullable|integer|min:1',
                        'expires_at' => 'required|date', 'created_at' => 'required|date'])->validate();
                    if ($message['company_code'] !== $activation->company_code || $message['sequence'] <= $last) {
                        throw new \RuntimeException('Notification feed identity or sequence mismatch.');
                    }
                    $last = $message['sequence'];
                }
                if ((int) $data['cursor'] !== $last) {
                    throw new \RuntimeException('Notification cursor mismatch.');
                }
                DB::transaction(function () use ($data, $activation) {
                    foreach ($data['messages'] as $message) {
                        $old = DB::table('app_notifications')->where('platform_message_uuid', $message['uuid'])->first();
                        if ($old && $old->platform_company_code !== $activation->company_code) {
                            throw new \RuntimeException('Notification ownership conflict.');
                        }
                        if ($old && $old->platform_revision > $message['revision']) {
                            continue;
                        }
                        $values = ['platform_revision' => $message['revision'], 'platform_company_code' => $activation->company_code,
                            'platform_store_id' => $message['platform_store_id'] ?? null, 'platform_warehouse_id' => $message['platform_warehouse_id'] ?? null,
                            'audience' => $message['audience'], 'category' => $message['category'], 'priority' => $message['priority'], 'platform_action' => $message['action'] ?? null,
                            'type' => 'PLATFORM_'.strtoupper($message['category']), 'title' => $message['title'], 'message' => $message['message'], 'link' => null,
                            'expires_at' => Carbon::parse($message['expires_at']), 'revoked_at' => $message['active'] ? null : now(), 'updated_at' => now()];
                        if (! $old) {
                            $values['created_at'] = Carbon::parse($message['created_at']);
                        }
                        DB::table('app_notifications')->updateOrInsert(['platform_message_uuid' => $message['uuid']], $values);
                    }
                    DB::table('platform_notification_syncs')->where('company_code', $activation->company_code)->update(['cursor' => $data['cursor'], 'pending_acks' => json_encode(array_column($data['messages'], 'sequence')), 'last_synced_at' => now(), 'last_error' => null]);
                });

                return ['ok' => true, 'imported' => count($data['messages'])];
            } catch (\Throwable $error) {
                report($error);
                DB::table('platform_notification_syncs')->where('company_code', $activation->company_code)->update(['last_error' => 'Notification sync failed; retry pending.']);

                return ['ok' => false, 'message' => 'Notification sync failed; retry pending.'];
            }
        });

        return $result ?: ['ok' => false, 'message' => 'Notification sync is already running.'];
    }
}
