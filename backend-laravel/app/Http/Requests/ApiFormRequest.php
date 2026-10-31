<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\MessageBag;

/**
 * Base for the API's Form Requests.
 *
 * Access is already checked by the ResolveStoreContext and AuthorizeBusinessAction middleware, so
 * authorize() allows the request through. A request that overrides errorBody() keeps the exact
 * 422 JSON its endpoint has always returned; without it, Laravel's standard {message, errors} body is used.
 */
abstract class ApiFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    abstract public function rules(): array;

    /** The 422 body for this endpoint, or null for Laravel's standard validation response. */
    protected function errorBody(MessageBag $errors): ?array
    {
        return null;
    }

    protected function failedValidation(Validator $validator): void
    {
        $body = $this->errorBody($validator->errors());
        if ($body === null) {
            parent::failedValidation($validator);
        }

        throw new HttpResponseException(response()->json($body, 422));
    }
}
