<?php

namespace App\Http\Requests\Notifications;

use App\Http\Requests\ApiFormRequest;

class DestroyPushSubscriptionRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return ['device_id' => 'required|uuid'];
    }
}
