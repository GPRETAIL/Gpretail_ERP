<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\StoreQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\InputBag;

/** Imports use the same validation, mapping and ownership rules as individual saves. */
class MasterImportController extends Controller
{
    private const CONTROLLERS = [
        'brands' => BrandController::class, 'items' => ItemController::class,
        'products' => ProductController::class, 'suppliers' => SupplierController::class,
        'transports' => TransportController::class, 'agents' => AgentController::class,
        'taxes' => TaxController::class, 'employees' => EmployeeController::class,
        'sizes' => SizeController::class, 'size-groups' => SizeController::class,
    ];

    public function store(Request $request, string $resource, ?string $type = null)
    {
        $rows = $request->input('rows') ?? $request->all();
        if (! is_array($rows) || ! array_is_list($rows) || count($rows) < 1 || count($rows) > 500) {
            throw ValidationException::withMessages(['rows' => 'Upload between 1 and 500 records per file.']);
        }
        $controller = match ($resource) {
            'attributes' => app(ProductAttributeController::class),
            'configurations' => app(ConfigurationController::class),
            default => app(self::CONTROLLERS[$resource] ?? abort(404)),
        };
        $method = match ($resource) {
            'attributes' => 'storeByType', 'configurations' => 'storeType',
            'size-groups' => 'groupsStore', default => 'store',
        };

        $created = DB::transaction(function () use ($rows, $request, $resource, $type, $controller, $method) {
            $count = 0;
            foreach ($rows as $index => $row) {
                try {
                    if (! is_array($row) || array_is_list($row)) {
                        throw ValidationException::withMessages(['row' => 'Expected a record with named columns.']);
                    }
                    $name = $row['name'] ?? $row['selling_name'] ?? $row['size_name'] ?? $row['group_name'] ?? $row['value'] ?? null;
                    if (! is_scalar($name) || trim((string) $name) === '') {
                        throw ValidationException::withMessages(['name' => 'Name is required.']);
                    }
                    // Numeric Excel cells should behave like the corresponding text inputs.
                    foreach (['code', 'item_code', 'tax_code', 'employee_code'] as $field) {
                        if (isset($row[$field]) && is_scalar($row[$field])) {
                            $row[$field] = (string) $row[$field];
                        }
                    }
                    if ($resource === 'items') {
                        foreach (['product_id' => 'products', 'brand_id' => 'brands'] as $field => $table) {
                            if (! empty($row[$field]) && ! is_numeric($row[$field])) {
                                $matches = StoreQuery::table($table)->where(function ($query) use ($row, $field) {
                                    $query->where('code', $row[$field])->orWhere('name', $row[$field]);
                                })->limit(2)->pluck('id');
                                if ($matches->count() !== 1) {
                                    throw ValidationException::withMessages([$field => 'Use an existing unique name, code or ID from this store.']);
                                }
                                $row[$field] = $matches->first();
                            }
                        }
                    }
                    $rowRequest = $request->duplicate([], $row);
                    $rowRequest->setJson(new InputBag($row));
                    $response = $type === null ? $controller->$method($rowRequest) : $controller->$method($rowRequest, $type);
                    if ($response->getStatusCode() >= 400) {
                        $body = $response->getData(true);
                        throw ValidationException::withMessages($body['errors'] ?? ['row' => $body['message'] ?? 'Record could not be imported.']);
                    }
                    $count++;
                } catch (ValidationException $e) {
                    $errors = [];
                    foreach ($e->errors() as $field => $messages) {
                        $errors["rows.$index.$field"] = array_map(fn ($message) => 'Excel row '.($index + 2).': '.$message, $messages);
                    }
                    throw ValidationException::withMessages($errors);
                }
            }

            return $count;
        });

        return response()->json(['success' => true, 'created' => $created, 'message' => "$created records imported."], 201);
    }
}
