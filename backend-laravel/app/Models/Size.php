<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Size extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function sizeGroup()
    {
        return $this->belongsTo(SizeGroup::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }
}
