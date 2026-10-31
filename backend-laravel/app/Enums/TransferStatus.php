<?php

namespace App\Enums;

/** A store-to-store transfer: in transit once dispatched, then received by the other store or cancelled. */
enum TransferStatus: string
{
    case InTransit = 'DISPATCHED';
    case Received = 'RECEIVED';
    case Cancelled = 'CANCELLED';
}
