<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notifications\RealtimeAuthRequest;
use App\Services\Notifications\RealtimeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RealtimeController extends Controller
{
    /** Signs a private-channel subscription for the browser's Pusher/Reverb connection. */
    public function auth(RealtimeAuthRequest $request, RealtimeService $realtime): JsonResponse
    {
        $data = $request->validated();
        $signed = $realtime->authorize($request->user(), $data['channel_name'], $data['socket_id']);
        abort_unless($signed, 403, 'You cannot listen to this channel.');

        return response()->json(json_decode($signed, true));
    }
}
