<?php

namespace App\Http\Requests\Notifications;

use App\Http\Requests\ApiFormRequest;

class UpdateNotificationPreferencesRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return ['marketing' => 'required|boolean', 'quiet_start' => 'required|integer|between:0,23', 'quiet_end' => 'required|integer|between:0,23', 'timezone' => 'nullable|timezone'];
    }
}
