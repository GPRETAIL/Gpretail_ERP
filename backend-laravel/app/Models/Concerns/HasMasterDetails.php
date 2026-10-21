<?php

namespace App\Models\Concerns;

use App\Services\MasterFormData;

trait HasMasterDetails
{
    public function initializeHasMasterDetails(): void
    {
        if ($this->getFillable()) {
            $this->mergeFillable(['master_details']);
        }
        $this->mergeCasts(['master_details' => 'array']);
    }

    public static function bootHasMasterDetails(): void
    {
        static::creating(function ($model): void {
            $model->created_by = auth()->user()?->name ?? auth()->user()?->username;
        });
    }

    public function attributesToArray(): array
    {
        return MasterFormData::present($this, parent::attributesToArray());
    }
}
