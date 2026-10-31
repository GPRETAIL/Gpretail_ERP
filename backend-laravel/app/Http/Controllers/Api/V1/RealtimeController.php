<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\RealtimeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RealtimeController extends Controller
{
    /** Signs a private-channel subscription for the browser's Pusher/Reverb connection. */
    public function auth(Request $request, RealtimeService $realtime): JsonResponse
    {
        $data = $request->validate([
            'socket_id' => ['required', 'string', 'max:64', 'regex:/^\d+\.\d+$/'],
            'channel_name' => ['required', 'string', 'max:100'],
        ]);
        $signed = $realtime->authorize($request->user(), $data['channel_name'], $data['socket_id']);
        abort_unless($signed, 403, 'You cannot listen to this channel.');

        return response()->json(json_decode($signed, true));
    }
}
