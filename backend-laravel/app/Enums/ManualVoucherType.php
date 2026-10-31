<?php

namespace App\Enums;

/** Vouchers a user enters by hand in Finance > Voucher Entry, with their number prefix. */
enum ManualVoucherType: string
{
    case Payment = 'payment';
    case Receipt = 'receipt';
    case Journal = 'journal';
    case Contra = 'contra';

    public function prefix(): string
    {
        return match ($this) {
            self::Payment => 'PV',
            self::Receipt => 'RV',
            self::Journal => 'JV',
            self::Contra => 'CV',
        };
    }
}
