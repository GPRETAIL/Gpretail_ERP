<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PrinterConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'name',
        'printer_type',
        'paper_size',
        'header_text',
        'footer_text',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
