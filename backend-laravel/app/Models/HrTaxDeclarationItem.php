<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One declared tax saving (or previous employer's figure), with its proof. */
class HrTaxDeclarationItem extends Model
{
    protected $fillable = ['store_id', 'declaration_id', 'section', 'description', 'declared_amount', 'details', 'proof_path', 'proof_amount', 'proof_status', 'verified_by', 'verified_at', 'note'];

    protected $hidden = ['proof_path'];

    protected function casts(): array
    {
        return ['declared_amount' => 'float', 'proof_amount' => 'float', 'details' => 'array', 'verified_at' => 'datetime'];
    }

    /** @return BelongsTo<HrTaxDeclaration, $this> */
    public function declaration(): BelongsTo
    {
        return $this->belongsTo(HrTaxDeclaration::class, 'declaration_id');
    }
}
