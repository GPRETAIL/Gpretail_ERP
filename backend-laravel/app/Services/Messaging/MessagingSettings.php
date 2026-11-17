<?php

namespace App\Services\Messaging;

use App\Models\SystemConfiguration;
use Illuminate\Support\Facades\Crypt;
use Throwable;

/**
 * Settings > Messaging: per store, one row per channel in system_configurations (group "messaging", key = channel).
 * Secrets (API keys, tokens) are kept encrypted in `value`; the rest (sender ID, template names, last test) in
 * `extra_data`. Screens only ever see secrets masked, and a masked value sent back is never saved over the real one.
 */
class MessagingSettings
{
    public const CHANNELS = ['sms', 'whatsapp', 'email'];

    /** Per channel: the secret fields and the plain fields it has. */
    public const FIELDS = [
        'sms' => ['secret' => ['auth_key'], 'plain' => ['sender_id', 'otp_template_id', 'country_code']],
        'whatsapp' => ['secret' => ['access_token'], 'plain' => ['phone_number_id', 'otp_template', 'language', 'country_code']],
        'email' => ['secret' => [], 'plain' => ['from_name', 'reply_to']],
    ];

    /** @return array{enabled: bool, secrets: array<string, string>, plain: array<string, mixed>, last_test: ?array} */
    public function channel(int $storeId, string $channel): array
    {
        $row = $this->row($storeId, $channel);
        $secrets = [];
        if ($row?->value) {
            try {
                $secrets = json_decode(Crypt::decryptString($row->value), true) ?: [];
            } catch (Throwable) {
                $secrets = [];
            }
        }
        $extra = (array) ($row->extra_data ?? []);

        return ['enabled' => (bool) ($row?->is_active ?? false), 'secrets' => $secrets, 'plain' => $extra['plain'] ?? [], 'last_test' => $extra['last_test'] ?? null];
    }

    /** What the settings screen shows: secrets masked. */
    public function forScreen(int $storeId): array
    {
        $out = [];
        foreach (self::CHANNELS as $channel) {
            $data = $this->channel($storeId, $channel);
            $out[$channel] = ['enabled' => $data['enabled'], 'last_test' => $data['last_test'],
                ...array_map(fn ($v) => (string) $v, $data['plain']),
                ...array_map(fn ($v) => self::mask((string) $v), $data['secrets'])];
        }

        return $out;
    }

    /** Saves one channel. Blank or masked secret values keep what is stored. */
    public function save(int $storeId, string $channel, array $input): void
    {
        $current = $this->channel($storeId, $channel);
        $secrets = $current['secrets'];
        foreach (self::FIELDS[$channel]['secret'] as $field) {
            $value = trim((string) ($input[$field] ?? ''));
            if ($value !== '' && ! self::isMasked($value)) {
                $secrets[$field] = $value;
            }
        }
        $plain = [];
        foreach (self::FIELDS[$channel]['plain'] as $field) {
            $plain[$field] = trim((string) ($input[$field] ?? ($current['plain'][$field] ?? '')));
        }
        SystemConfiguration::withoutGlobalScopes()->updateOrCreate(
            ['store_id' => $storeId, 'group' => 'messaging', 'key' => $channel],
            ['config_key' => $channel, 'group_name' => 'messaging', 'is_active' => (bool) ($input['enabled'] ?? false),
                'value' => $secrets ? Crypt::encryptString(json_encode($secrets)) : null, 'config_value' => $secrets ? 'encrypted' : null,
                'extra_data' => ['plain' => $plain, 'last_test' => $current['last_test']]],
        );
    }

    public function recordTest(int $storeId, string $channel, bool $ok, string $message): void
    {
        $row = $this->row($storeId, $channel);
        if ($row) {
            $row->forceFill(['extra_data' => [...(array) $row->extra_data, 'last_test' => ['ok' => $ok, 'message' => $message, 'at' => now()->toIso8601String()]]])->save();
        }
    }

    private function row(int $storeId, string $channel): ?SystemConfiguration
    {
        return SystemConfiguration::withoutGlobalScopes()->where('store_id', $storeId)->where('group', 'messaging')->where('key', $channel)->first();
    }

    public static function mask(string $value): string
    {
        return $value === '' ? '' : (strlen($value) < 12 ? str_repeat('*', 12) : substr($value, 0, 4).str_repeat('*', 12));
    }

    public static function isMasked(string $value): bool
    {
        return str_contains($value, '****');
    }
}
