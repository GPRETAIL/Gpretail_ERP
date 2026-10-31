<?php

namespace App\Enums;

/** Life of a purchase order: drafted (by hand or by the nightly reorder run), approved, then closed or cancelled. */
enum PurchaseOrderStatus: string
{
    case Draft = 'DRAFT';
    case Approved = 'APPROVED';
    case Closed = 'CLOSED';
    case Cancelled = 'CANCELLED';

    /** Orders still expected from the supplier, so their quantities count as already on order. */
    public const OPEN = [self::Draft, self::Approved];

    /** @return list<string> */
    public static function openValues(): array
    {
        return array_map(fn (self $status) => $status->value, self::OPEN);
    }
}
