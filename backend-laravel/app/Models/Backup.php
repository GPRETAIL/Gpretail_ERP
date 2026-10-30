<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Backup extends Model
{
    use HasFactory;

    protected $fillable = [
        'file_name',
        'backup_type',
        'storage_mode',
        'module_names',
        'company_id',
        'file_path',
        'cloud_path',
        'file_size',
        'file_size_label',
        'status',
        'encryption_enabled',
        'summary',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'module_names' => 'array',
            'summary' => 'array',
            'encryption_enabled' => 'boolean',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Store, $this> */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'company_id');
    }

    /** @return HasMany<BackupRestore, $this> */
    public function restores(): HasMany
    {
        return $this->hasMany(BackupRestore::class);
    }
}
