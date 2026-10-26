<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Route;
use PDOException;
use Tests\TestCase;

class DatabaseAvailabilityTest extends TestCase
{
    public function test_connection_failures_are_temporary_and_do_not_disclose_database_or_token_details(): void
    {
        config(['app.debug' => true]);
        Route::get('/api/test-database-unavailable', function () {
            $error = new PDOException('Operation not permitted: private database and token');
            $error->errorInfo = ['HY000', 2002, 'Operation not permitted'];
            throw new QueryException('mysql', 'select secret from private_tokens', [], $error);
        });
        $response = $this->getJson('/api/test-database-unavailable')->assertStatus(503)->assertHeader('Retry-After', '3')->assertJsonPath('code', 'DATABASE_TEMPORARILY_UNAVAILABLE');
        $this->assertStringNotContainsString('private_tokens', $response->getContent());
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
    }
}
