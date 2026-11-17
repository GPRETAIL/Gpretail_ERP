<?php

namespace App\Services\Messaging;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends an OTP (or a test) to a customer on one channel, with the store's Settings > Messaging details:
 * - sms: MSG91 Flow API with the store's DLT-approved OTP template (variables ##otp##, ##points##, ##amount##, ##store##).
 * - whatsapp: Meta WhatsApp Cloud API with an approved Authentication template (code in the body and copy-code button).
 * - email: the app's mailer.
 * Returns ['ok' => bool, 'message' => string]; never throws, never retries silently. Failures are logged.
 */
class MessageGateway
{
    public function __construct(private MessagingSettings $settings) {}

    /** Channels switched on and filled in for this store, in the order an OTP tries them. */
    public function available(int $storeId): array
    {
        return array_values(array_filter(MessagingSettings::CHANNELS, fn ($c) => $this->ready($storeId, $c)));
    }

    public function ready(int $storeId, string $channel): bool
    {
        $data = $this->settings->channel($storeId, $channel);
        if (! $data['enabled']) {
            return false;
        }

        return match ($channel) {
            'sms' => ($data['secrets']['auth_key'] ?? '') !== '' && ($data['plain']['otp_template_id'] ?? '') !== '',
            'whatsapp' => ($data['secrets']['access_token'] ?? '') !== '' && ($data['plain']['phone_number_id'] ?? '') !== ''
                && ($data['plain']['otp_template'] ?? '') !== '',
            // A mailer that only writes to the log sends nothing, except on a developer's machine (the code is in the log).
            'email' => ! in_array(config('mail.default'), ['log', 'array'], true) || app()->environment('local'),
            default => false,
        };
    }

    /** @param  array{otp: string, points?: int|string, amount?: string, store?: string}  $vars */
    public function sendOtp(int $storeId, string $channel, string $to, array $vars): array
    {
        if (! $this->ready($storeId, $channel)) {
            return ['ok' => false, 'message' => ucfirst($channel).' is not set up in Settings > Messaging.'];
        }
        $data = $this->settings->channel($storeId, $channel);
        try {
            return match ($channel) {
                'sms' => $this->msg91($data, $to, $vars),
                'whatsapp' => $this->whatsapp($data, $to, $vars),
                'email' => $this->email($data, $to, $vars),
            };
        } catch (Throwable $e) {
            Log::warning('Messaging send failed', ['channel' => $channel, 'store_id' => $storeId, 'error' => $e->getMessage()]);

            return ['ok' => false, 'message' => 'Could not send: '.$e->getMessage()];
        }
    }

    /** 10-digit Indian numbers get the store's country code (91 by default). */
    public static function phone(string $number, string $countryCode = '91'): string
    {
        $digits = preg_replace('/\D/', '', $number);

        return strlen($digits) === 10 ? ($countryCode ?: '91').$digits : $digits;
    }

    private function msg91(array $data, string $to, array $vars): array
    {
        $response = Http::timeout(15)->withHeaders(['authkey' => $data['secrets']['auth_key'], 'accept' => 'application/json'])
            ->post('https://control.msg91.com/api/v5/flow', [
                'template_id' => $data['plain']['otp_template_id'],
                'short_url' => '0',
                'recipients' => [['mobiles' => self::phone($to, $data['plain']['country_code'] ?? '91'),
                    'otp' => $vars['otp'], 'points' => (string) ($vars['points'] ?? ''), 'amount' => (string) ($vars['amount'] ?? ''), 'store' => (string) ($vars['store'] ?? '')]],
            ]);
        $ok = $response->successful() && ($response->json('type') ?? 'success') !== 'error';

        return ['ok' => $ok, 'message' => $ok ? 'Sent by SMS.' : 'MSG91: '.($response->json('message') ?? $response->body())];
    }

    private function whatsapp(array $data, string $to, array $vars): array
    {
        $response = Http::timeout(15)->withToken($data['secrets']['access_token'])
            ->post('https://graph.facebook.com/v20.0/'.rawurlencode($data['plain']['phone_number_id']).'/messages', [
                'messaging_product' => 'whatsapp',
                'to' => self::phone($to, $data['plain']['country_code'] ?? '91'),
                'type' => 'template',
                'template' => [
                    'name' => $data['plain']['otp_template'],
                    'language' => ['code' => $data['plain']['language'] ?: 'en'],
                    'components' => [
                        ['type' => 'body', 'parameters' => [['type' => 'text', 'text' => $vars['otp']]]],
                        ['type' => 'button', 'sub_type' => 'url', 'index' => '0', 'parameters' => [['type' => 'text', 'text' => $vars['otp']]]],
                    ],
                ],
            ]);
        $ok = $response->successful();

        return ['ok' => $ok, 'message' => $ok ? 'Sent on WhatsApp.' : 'WhatsApp: '.($response->json('error.message') ?? $response->body())];
    }

    private function email(array $data, string $to, array $vars): array
    {
        $store = (string) ($vars['store'] ?? 'Store');
        $text = "Your OTP is {$vars['otp']}."
            .(isset($vars['points']) ? " It approves redeeming {$vars['points']} points (Rs. {$vars['amount']}) at {$store}." : '')
            .' It is valid for 5 minutes. Do not share it with anyone except the cashier.';
        Mail::raw($text, function ($message) use ($to, $store, $data) {
            $message->to($to)->subject("{$store}: your OTP");
            if ($from = ($data['plain']['from_name'] ?? '')) {
                $message->from(config('mail.from.address'), $from);
            }
            if ($reply = ($data['plain']['reply_to'] ?? '')) {
                $message->replyTo($reply);
            }
        });

        return ['ok' => true, 'message' => 'Sent by email.'];
    }
}
