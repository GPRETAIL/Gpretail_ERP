<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Http\Controllers\Controller;
use App\Services\Messaging\MessageGateway;
use App\Services\Messaging\MessagingSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Settings > Messaging: the store's SMS (MSG91), WhatsApp (Meta Cloud API) and email details used to send
 * customers OTPs. Admin only; keys are stored encrypted and only ever shown masked.
 */
class MessagingSettingsController extends Controller
{
    private const ADMIN_ROLES = ['admin', 'super_admin'];

    public function __construct(private MessagingSettings $settings, private MessageGateway $gateway) {}

    public function show(Request $request): JsonResponse
    {
        $this->admin($request);

        return response()->json(['success' => true, 'data' => $this->settings->forScreen($this->storeId($request))]);
    }

    public function update(Request $request, string $channel): JsonResponse
    {
        $this->admin($request);
        abort_unless(in_array($channel, MessagingSettings::CHANNELS, true), 404);
        $line = 'regex:/^[^\r\n]*$/';
        $rules = ['enabled' => 'boolean'];
        foreach ([...MessagingSettings::FIELDS[$channel]['secret'], ...MessagingSettings::FIELDS[$channel]['plain']] as $field) {
            $rules[$field] = ['nullable', 'string', 'max:500', $line];
        }
        $data = $request->validate($rules);
        $this->settings->save($this->storeId($request), $channel, $data);

        return response()->json(['success' => true, 'message' => ucfirst($channel).' settings saved.', 'data' => $this->settings->forScreen($this->storeId($request))[$channel]]);
    }

    /** Sends a test OTP (123456) so the admin sees the template and keys work. */
    public function test(Request $request, string $channel): JsonResponse
    {
        $this->admin($request);
        abort_unless(in_array($channel, MessagingSettings::CHANNELS, true), 404);
        $data = $request->validate(['to' => $channel === 'email' ? 'required|email|max:120' : 'required|string|max:20']);
        $storeId = $this->storeId($request);
        $result = $this->gateway->sendOtp($storeId, $channel, $data['to'], ['otp' => '123456', 'points' => 100, 'amount' => '100.00', 'store' => 'Test']);
        $this->settings->recordTest($storeId, $channel, $result['ok'], $result['message']);

        return response()->json(['success' => $result['ok'], 'message' => $result['message']], $result['ok'] ? 200 : 422);
    }

    private function admin(Request $request): void
    {
        abort_unless(in_array($request->user()?->role, self::ADMIN_ROLES, true), 403, 'Only an admin can change messaging settings.');
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }
}
