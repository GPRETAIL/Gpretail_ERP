<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A named list of people scheduled reports can go to (e.g. "Owners", "Accounts team"): users and outside emails. */
class RecipientGroup extends Model
{
    protected $fillable = ['store_id', 'name', 'description', 'created_by'];

    public function members(): HasMany
    {
        return $this->hasMany(RecipientGroupMember::class);
    }
}
