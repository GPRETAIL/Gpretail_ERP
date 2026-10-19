<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PlatformPushClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => DB::table('notification_preferences')->where('user_id', $request->user()->id)->first() ?? ['marketing' => false, 'push_enabled' => false, 'quiet_start' => 21, 'quiet_end' => 8]]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate(['marketing' => 'required|boolean', 'quiet_start' => 'required|integer|between:0,23', 'quiet_end' => 'required|integer|between:0,23', 'timezone' => 'nullable|timezone']);
        DB::table('notification_preferences')->updateOrInsert(['user_id' => $request->user()->id], $data);
        app(PlatformPushClient::class)->request('contacts', ['contacts' => [app(PlatformPushClient::class)->contact($request->user())]]);

        return $this->show($request);
    }
}
