<?php

namespace App\Http\Requests\Notifications;

use App\Http\Requests\ApiFormRequest;

class StorePushSubscriptionRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return ['device_id' => 'required|uuid', 'endpoint' => 'required|string|max:4096'];
    }
}
