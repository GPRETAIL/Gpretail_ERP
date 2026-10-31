<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notifications\DestroyPushSubscriptionRequest;
use App\Http\Requests\Notifications\StorePushSubscriptionRequest;
use App\Services\Platform\PlatformPushClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PushSubscriptionController extends Controller
{
    public function config(PlatformPushClient $push): JsonResponse
    {
        $config = $push->request('config', [], 'GET');

        return response()->json(['success' => true, 'data' => $config['ok'] ? $config['data'] : ['enabled' => false, 'public_key' => null]]);
    }

    public function store(StorePushSubscriptionRequest $request, PlatformPushClient $push): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $token = $user->currentAccessToken();
        abort_unless(! empty($token->id), 403, 'Sign in again to register this device.');
        $contact = $push->request('contacts', ['contacts' => [$push->contact($user)]]);
        abort_unless($contact['ok'], 503, 'Could not verify notification preferences with Vynerix Admin.');
        $result = $push->request('subscribe', array_merge($data, ['user_key' => $push->userKey($user)]));
        abort_unless($result['ok'], 503, 'Push registration failed. Check permission and server configuration.');
        DB::table('notification_devices')->updateOrInsert(['user_id' => $user->id, 'device_id' => $data['device_id']], ['token_id' => $token->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('notification_preferences')->updateOrInsert(['user_id' => $user->id], ['push_enabled' => true]);

        return response()->json(['success' => true, 'data' => ['registered' => true]]);
    }

    public function destroy(DestroyPushSubscriptionRequest $request, PlatformPushClient $push): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $result = $push->request('unsubscribe', ['user_key' => $push->userKey($user), 'device_id' => $data['device_id']]);
        abort_unless($result['ok'], 503, 'Could not disable this push device. Retry when connected.');
        DB::table('notification_devices')->where('user_id', $user->id)->where('device_id', $data['device_id'])->delete();
        DB::table('notification_preferences')->where('user_id', $user->id)->update(['push_enabled' => DB::table('notification_devices')->where('user_id', $user->id)->exists()]);

        return response()->json(['success' => true]);
    }
}
