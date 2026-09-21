<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StoreLocalNode extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'tenant_key',
        'sync_token',
        'sync_user_id',
        'enabled',
        'local_server_url',
        'cloud_server_url',
        'advertised_local_server_url',
        'local_healthy',
        'last_heartbeat_at',
        'last_health_check_at',
        'last_catch_up_at',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'local_healthy' => 'boolean',
            'last_heartbeat_at' => 'datetime',
            'last_health_check_at' => 'datetime',
            'last_catch_up_at' => 'datetime',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * The identity a replayed sync write authenticates as on this side (see
     * AuthenticateSyncReplay). Never used for a real login -- is_active=false
     * and an unguessable password -- so it's created lazily on first replay
     * rather than at pairing time.
     */
    public function resolveSyncUser(): User
    {
        if ($this->sync_user_id) {
            $existing = User::find($this->sync_user_id);
            if ($existing) {
                return $existing;
            }
        }

        $user = User::create([
            'name' => 'Sync System User',
            'username' => 'sync_system_store_'.$this->store_id,
            'email' => 'sync-system+store'.$this->store_id.'@internal.local',
            'password' => Str::random(64),
            'role' => 'sync_system',
            'store_id' => $this->store_id,
            'is_active' => false,
        ]);

        $this->forceFill(['sync_user_id' => $user->id])->save();

        return $user;
    }
}
