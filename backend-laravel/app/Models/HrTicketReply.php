<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One message on a helpdesk ticket, from the employee or from HR. */
class HrTicketReply extends Model
{
    protected $fillable = ['store_id', 'ticket_id', 'author_type', 'author_user_id', 'body'];
}
