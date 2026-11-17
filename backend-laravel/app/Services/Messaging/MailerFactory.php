<?php

namespace App\Services\Messaging;

use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Support\Facades\Mail;

/**
 * The mailer a store sends with: its own SMTP account from Settings > Messaging > Email when one is set (Hostinger
 * mailbox, Gmail, Zoho...), else the server's mailer from .env. Also the From address and name to use.
 */
class MailerFactory
{
    public function __construct(private MessagingSettings $settings) {}

    public function hasOwnSmtp(int $storeId): bool
    {
        $email = $this->settings->channel($storeId, 'email');

        return trim((string) ($email['plain']['smtp_host'] ?? '')) !== '';
    }

    public function mailer(int $storeId): Mailer
    {
        $email = $this->settings->channel($storeId, 'email');
        $plain = $email['plain'];
        if (trim((string) ($plain['smtp_host'] ?? '')) === '') {
            return Mail::mailer();
        }
        $encryption = strtolower((string) ($plain['smtp_encryption'] ?? 'tls'));

        return Mail::build([
            'transport' => 'smtp',
            'host' => trim((string) $plain['smtp_host']),
            'port' => (int) ($plain['smtp_port'] ?: ($encryption === 'ssl' ? 465 : 587)),
            'scheme' => $encryption === 'ssl' ? 'smtps' : 'smtp',
            'username' => trim((string) ($plain['smtp_username'] ?? '')) ?: null,
            'password' => ($email['secrets']['smtp_password'] ?? '') ?: null,
            'timeout' => 20,
        ]);
    }

    /** @return array{0: string, 1: string} [address, name] */
    public function from(int $storeId, string $fallbackName): array
    {
        $plain = $this->settings->channel($storeId, 'email')['plain'];
        $address = trim((string) ($plain['from_address'] ?? '')) ?: (trim((string) ($plain['smtp_username'] ?? '')) ?: (string) config('mail.from.address'));
        if (! filter_var($address, FILTER_VALIDATE_EMAIL)) {
            $address = (string) config('mail.from.address');
        }

        return [$address, trim((string) ($plain['from_name'] ?? '')) ?: $fallbackName];
    }

    /** Whether email can actually go out for this store (its own SMTP, or a real server mailer). */
    public function ready(int $storeId): bool
    {
        return $this->hasOwnSmtp($storeId) || ! in_array(config('mail.default'), ['log', 'array'], true);
    }
}
