<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A notice or a policy HR publishes to the staff of a store (all of them, or one department). */
class HrAnnouncement extends Model
{
    public const ANNOUNCEMENT = 'ANNOUNCEMENT';

    public const POLICY = 'POLICY';

    protected $fillable = ['store_id', 'category', 'title', 'body', 'is_pinned', 'publish_on', 'expires_on', 'department_id', 'created_by'];

    protected function casts(): array
    {
        return ['is_pinned' => 'boolean', 'publish_on' => 'date:Y-m-d', 'expires_on' => 'date:Y-m-d'];
    }

    public function reads(): HasMany
    {
        return $this->hasMany(HrAnnouncementRead::class, 'announcement_id');
    }
}
