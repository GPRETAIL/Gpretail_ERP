<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * A secret kept encrypted with this server's key (store e-invoice password, GST access key). The key never leaves the
 * server, and these values are already left out of backups, failover copies and the sync, so each server keeps its own.
 * A value saved before encryption was added still reads as it was until the migration (or the next save) encrypts it.
 *
 * @implements CastsAttributes<?string, ?string>
 */
class EncryptedSecret implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            return (string) $value;
        }
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        return Crypt::encryptString((string) $value);
    }
}
