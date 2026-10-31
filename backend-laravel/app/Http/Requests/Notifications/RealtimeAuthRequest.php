<?php

namespace App\Http\Requests\Notifications;

use App\Http\Requests\ApiFormRequest;

class RealtimeAuthRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'socket_id' => ['required', 'string', 'max:64', 'regex:/^\d+\.\d+$/'],
            'channel_name' => ['required', 'string', 'max:100'],
        ];
    }
}
