<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A file HR keeps for an employee (offer letter, ID card, Form 16). The file is on the private disk, never a public link. */
class HrDocument extends Model
{
    public const TYPES = ['OFFER_LETTER' => 'Offer letter', 'ID_CARD' => 'ID card', 'FORM_16' => 'Form 16', 'OTHER' => 'Other'];

    protected $fillable = ['store_id', 'employee_id', 'type', 'title', 'file_path', 'mime', 'size', 'uploaded_by'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
