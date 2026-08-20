<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AttributeType;
use App\Models\AttributeValue;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductAttributeController extends Controller
{
    private array $defaultAliases = [
        'color'   => 'colour',
        'colours' => 'colour',
        'colors'  => 'colour',
    ];

    private array $defaultValues = [
        'colour' => [
            ['name' => 'Black', 'value' => '#000000'],
            ['name' => 'White', 'value' => '#FFFFFF'],
            ['name' => 'Red', 'value' => '#FF0000'],
            ['name' => 'Blue', 'value' => '#0000FF'],
            ['name' => 'Navy', 'value' => '#000080'],
            ['name' => 'Green', 'value' => '#008000'],
            ['name' => 'Yellow', 'value' => '#FFFF00'],
            ['name' => 'Grey', 'value' => '#808080'],
            ['name' => 'Brown', 'value' => '#A52A2A'],
            ['name' => 'Beige', 'value' => '#F5F5DC'],
        ],
        'division' => [
            ['name' => 'Mens', 'value' => 'MENS'],
            ['name' => 'Womens', 'value' => 'WOMENS'],
            ['name' => 'Kids', 'value' => 'KIDS'],
            ['name' => 'Infant', 'value' => 'INFANT'],
            ['name' => 'Unisex', 'value' => 'UNISEX'],
        ],
        'fit' => [
            ['name' => 'Regular Fit', 'value' => 'REGULAR'],
            ['name' => 'Slim Fit', 'value' => 'SLIM'],
            ['name' => 'Oversized', 'value' => 'OVERSIZED'],
            ['name' => 'Loose Fit', 'value' => 'LOOSE'],
        ],
        'sleeve' => [
            ['name' => 'Full Sleeve', 'value' => 'FULL'],
            ['name' => 'Half Sleeve', 'value' => 'HALF'],
            ['name' => 'Sleeveless', 'value' => 'SLEEVELESS'],
            ['name' => 'Three Quarter', 'value' => 'THREE_QUARTER'],
        ],
    ];

    public function indexByType(Request $request, $type)
    {
        $normalizedCode = strtolower(str_replace([' ', '-'], '_', $type));
        if (isset($this->defaultAliases[$normalizedCode])) {
            $normalizedCode = $this->defaultAliases[$normalizedCode];
        }

        $attributeType = AttributeType::firstOrCreate(
            ['code' => $normalizedCode],
            ['name' => ucwords(str_replace('_', ' ', $normalizedCode)), 'is_active' => true]
        );

        // Seed defaults if empty
        if (isset($this->defaultValues[$normalizedCode]) && AttributeValue::where('attribute_type_id', $attributeType->id)->count() === 0) {
            foreach ($this->defaultValues[$normalizedCode] as $def) {
                AttributeValue::create([
                    'attribute_type_id' => $attributeType->id,
                    'name'              => $def['name'],
                    'value'             => $def['value'],
                    'is_active'         => true,
                ]);
            }
        }

        $query = AttributeValue::where('attribute_type_id', $attributeType->id);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('value', 'like', "%{$search}%");
            });
        }

        $formatter = fn($item) => [
            'id'                => $item->id,
            'attribute_type_id' => $item->attribute_type_id,
            'name'              => $item->name,
            'value'             => $item->value,
            'code'              => $item->code,
            'sort_order'        => $item->sort_order,
            'extra_data'        => $item->extra_data,
            'company_id'        => $item->company_id ?: 1,
            'created_by'        => $item->created_by ?: 'Superadmin',
            'updated_by'        => $item->updated_by,
            'is_active'         => (bool) $item->is_active,
            'created_at'        => $item->created_at,
            'updated_at'        => $item->updated_at,
        ];

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('name')->limit(2000)->get()->map($formatter);
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('name')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => collect($paginated->items())->map($formatter),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
        ]);
    }

    public function storeByType(Request $request, $type)
    {
        $normalizedCode = strtolower(str_replace([' ', '-'], '_', $type));
        if (isset($this->defaultAliases[$normalizedCode])) {
            $normalizedCode = $this->defaultAliases[$normalizedCode];
        }

        $attributeType = AttributeType::firstOrCreate(
            ['code' => $normalizedCode],
            ['name' => ucwords(str_replace('_', ' ', $normalizedCode)), 'is_active' => true]
        );

        $name = $request->input('name') ?? $request->input('value') ?? $request->input('attribute_value');
        $value = $request->input('value') ?? $name;
        $code = $request->input('code') ?: $request->input('short_code') ?: null;
        $sortOrder = $request->has('sort_order') ? $request->integer('sort_order') : ($request->has('display_order') ? $request->integer('display_order') : 0);
        $extraData = $request->input('extra_data') ?: null;
        $user = $request->user();
        $createdBy = $request->input('created_by') ?: ($user?->name ?: ($user?->username ?: 'Superadmin'));
        $companyId = $request->input('company_id') ?: ($user?->company_id ?: 1);

        if (!$name) {
            return response()->json([
                'success' => false,
                'message' => 'Attribute name or value is required',
            ], 422);
        }

        $attributeValue = AttributeValue::create([
            'attribute_type_id' => $attributeType->id,
            'name'              => $name,
            'value'             => $value,
            'code'              => $code,
            'sort_order'        => $sortOrder,
            'extra_data'        => $extraData,
            'company_id'        => $companyId,
            'created_by'        => $createdBy,
            'is_active'         => $request->has('is_active') ? $request->boolean('is_active') : true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Attribute value created successfully',
            'data'    => $attributeValue,
        ], 201);
    }

    public function showByType(Request $request, $type, $id)
    {
        $attributeValue = AttributeValue::where('id', $id)->orWhere('value', $id)->first();

        if (!$attributeValue) {
            return response()->json([
                'success' => false,
                'message' => 'Attribute value not found',
            ], 404);
        }

        $arr = $attributeValue->toArray();
        $arr['attribute_value'] = $attributeValue->value;
        $arr['attributeValue'] = $attributeValue->value;

        return response()->json([
            'success' => true,
            'data'    => $arr,
        ]);
    }

    public function updateByType(Request $request, $type, $id)
    {
        $attributeValue = AttributeValue::where('id', $id)->orWhere('value', $id)->first();

        if (!$attributeValue) {
            return response()->json([
                'success' => false,
                'message' => 'Attribute value not found',
            ], 404);
        }

        $name = $request->input('name') ?? $request->input('value') ?? $attributeValue->name;
        $value = $request->input('value') ?? $name;
        $code = $request->has('code') ? $request->input('code') : $attributeValue->code;
        $sortOrder = $request->has('sort_order') ? $request->integer('sort_order') : ($request->has('display_order') ? $request->integer('display_order') : $attributeValue->sort_order);
        $extraData = $request->has('extra_data') ? $request->input('extra_data') : $attributeValue->extra_data;
        $updatedBy = $request->input('updated_by') ?: ($request->user()?->name ?? null);

        $attributeValue->update([
            'name'       => $name,
            'value'      => $value,
            'code'       => $code,
            'sort_order' => $sortOrder,
            'extra_data' => $extraData,
            'updated_by' => $updatedBy,
            'is_active'  => $request->has('is_active') ? $request->boolean('is_active') : $attributeValue->is_active,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Attribute value updated successfully',
            'data'    => $attributeValue,
        ]);
    }

    public function destroyByType(Request $request, $type, $id)
    {
        $attributeValue = AttributeValue::find($id);

        if (!$attributeValue) {
            return response()->json([
                'success' => false,
                'message' => 'Attribute value not found',
            ], 404);
        }

        $attributeValue->delete();

        return response()->json([
            'success' => true,
            'message' => 'Attribute value deleted successfully',
        ]);
    }
}
