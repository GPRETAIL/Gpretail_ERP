<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BackupRestore extends Model
{
    use HasFactory;

    protected $fillable = [
        'backup_id',
        'restore_type',
        'module_names',
        'target_company_id',
        'status',
        'summary',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'module_names' => 'array',
            'summary' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Backup, $this> */
    public function backup(): BelongsTo
    {
        return $this->belongsTo(Backup::class);
    }
}
