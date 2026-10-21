<?php

namespace App\Http\Controllers\Concerns;

use App\Http\Controllers\Api\V1\MasterImportController;
use Illuminate\Http\Request;

trait ImportsMasterRows
{
    public function bulkImport(Request $request)
    {
        return app(MasterImportController::class)->store($request, $request->route('resource'), $request->route('type'));
    }
}
