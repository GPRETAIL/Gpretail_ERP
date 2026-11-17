<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecipientGroupMember extends Model
{
    protected $fillable = ['recipient_group_id', 'user_id', 'email'];
}
