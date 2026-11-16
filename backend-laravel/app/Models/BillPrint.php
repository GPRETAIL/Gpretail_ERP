<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Sales > Bill Reprint: one reprint (or WhatsApp share) of a sales document. */
class BillPrint extends Model
{
    protected $fillable = ['store_id', 'doc_type', 'doc_id', 'doc_no', 'copy_label', 'reason', 'channel', 'user_id', 'approval_request_id', 'printed_at'];

    protected function casts(): array
    {
        return ['printed_at' => 'datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
