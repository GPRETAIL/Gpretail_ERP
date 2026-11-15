<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * A record saved without a code gets one from its record number: <CODE_PREFIX><id>, e.g. CUST1002.
 *
 * Random codes (uniqid) differed between the cloud and an on-prem server when a write was replayed, although the
 * record number is the same on both (SyncIds). A code made from the record number is therefore the same too.
 * Fields filled from the code before insert (a product's sku or barcode) carry the same placeholder and are
 * numbered with it.
 */
trait NumbersCodeFromId
{
    public const PENDING_CODE_PREFIX = 'PENDING-';

    /** A placeholder to save now; it becomes <prefix><id> right after insert. */
    public static function pendingCode(): string
    {
        return self::PENDING_CODE_PREFIX.str_replace('.', '', uniqid('', true));
    }

    public static function isPendingCode(mixed $value): bool
    {
        return is_string($value) && str_starts_with($value, self::PENDING_CODE_PREFIX);
    }

    protected static function bootNumbersCodeFromId(): void
    {
        static::creating(function (Model $model) {
            if (trim((string) $model->getAttribute('code')) === '') {
                $model->setAttribute('code', static::pendingCode());
            }
        });
        static::created(function (Model $model) {
            $numbered = [];
            foreach (['code', 'sku', 'barcode'] as $column) {
                if (static::isPendingCode($model->getAttribute($column))) {
                    $numbered[$column] = $model->numberedCodePrefix().$model->getKey();
                }
            }
            if ($numbered) {
                $model->forceFill($numbered)->saveQuietly();
            }
        });
    }

    protected function numberedCodePrefix(): string
    {
        return static::CODE_PREFIX;
    }
}
