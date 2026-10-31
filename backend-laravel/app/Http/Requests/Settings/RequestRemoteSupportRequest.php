<?php

namespace App\Http\Requests\Settings;

use App\Http\Requests\ApiFormRequest;

class RequestRemoteSupportRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'client_id' => 'required|string|max:64', 'client_password' => 'nullable|string|max:64',
            'customer_name' => 'nullable|string|max:120', 'contact_number' => 'nullable|string|max:40',
            'system_os' => 'nullable|string|max:50', 'category' => 'required|in:printing,hardware,software,sync,general',
            'priority' => 'required|in:normal,high,urgent', 'issue_description' => 'nullable|string|max:1000',
        ];
    }
}
