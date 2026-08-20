<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AgentController extends Controller
{
    private function formatAgent($a)
    {
        return [
            'id'                => $a->id,
            'name'              => $a->name,
            'code'              => $a->code,
            'agent_type_id'     => $a->agent_type_id,
            'agentTypeId'       => $a->agent_type_id,
            'contact_person'    => $a->contact_person,
            'contactPerson'     => $a->contact_person,
            'contact_no'        => $a->contact_no ?: $a->phone,
            'contactNo'         => $a->contact_no ?: $a->phone,
            'phone'             => $a->phone ?: $a->contact_no,
            'email'             => $a->email ?: $a->email_id,
            'email_id'          => $a->email_id ?: $a->email,
            'emailId'           => $a->email_id ?: $a->email,
            'address'           => $a->address,
            'pan'               => $a->pan,
            'gst'               => $a->gst,
            'commission_amt'    => (float) ($a->commission_amt ?? 0),
            'commissionAmt'     => (float) ($a->commission_amt ?? 0),
            'commission_pct'    => (float) ($a->commission_pct ?? $a->commission_rate ?? 0),
            'commissionPct'     => (float) ($a->commission_pct ?? $a->commission_rate ?? 0),
            'commission_rate'   => (float) ($a->commission_rate ?? $a->commission_pct ?? 0),
            'city_id'           => $a->city_id,
            'cityId'            => $a->city_id,
            'tax_id'            => $a->tax_id,
            'taxId'             => $a->tax_id,
            'bank_id'           => $a->bank_id,
            'bankId'            => $a->bank_id,
            'bank_account_name' => $a->bank_account_name,
            'bankAccountName'   => $a->bank_account_name,
            'ifsc'              => $a->ifsc,
            'account_no'        => $a->account_no,
            'accountNo'         => $a->account_no,
            'state_id'          => $a->state_id,
            'stateId'           => $a->state_id,
            'pincode'           => $a->pincode,
            'is_active'         => (bool) $a->is_active,
            'active'            => (bool) $a->is_active,
            'created_at'        => $a->created_at,
            'updated_at'        => $a->updated_at,
        ];
    }

    private function extractAgentData(Request $request): array
    {
        $data = [];
        if ($request->has('name')) $data['name'] = $request->input('name');
        if ($request->has('code')) $data['code'] = $request->input('code');
        
        if ($request->has('agent_type_id') || $request->has('agentTypeId')) {
            $data['agent_type_id'] = $request->input('agent_type_id') ?: $request->input('agentTypeId') ?: null;
        }
        if ($request->has('contact_person') || $request->has('contactPerson')) {
            $data['contact_person'] = $request->input('contact_person') ?: $request->input('contactPerson') ?: null;
        }
        if ($request->has('contact_no') || $request->has('contactNo') || $request->has('phone')) {
            $val = $request->input('contact_no') ?: $request->input('contactNo') ?: $request->input('phone') ?: null;
            $data['contact_no'] = $val;
            $data['phone'] = $val;
        }
        if ($request->has('email_id') || $request->has('emailId') || $request->has('email')) {
            $val = $request->input('email_id') ?: $request->input('emailId') ?: $request->input('email') ?: null;
            $data['email_id'] = $val;
            $data['email'] = $val;
        }
        if ($request->has('address')) $data['address'] = $request->input('address');
        if ($request->has('pan')) $data['pan'] = $request->input('pan');
        if ($request->has('gst')) $data['gst'] = $request->input('gst');
        
        if ($request->has('commission_amt') || $request->has('commissionAmt')) {
            $data['commission_amt'] = $request->input('commission_amt') ?? $request->input('commissionAmt') ?? 0;
        }
        if ($request->has('commission_pct') || $request->has('commissionPct') || $request->has('commission_rate')) {
            $pct = $request->input('commission_pct') ?? $request->input('commissionPct') ?? $request->input('commission_rate') ?? 0;
            $data['commission_pct'] = $pct;
            $data['commission_rate'] = $pct;
        }
        
        if ($request->has('city_id') || $request->has('cityId')) {
            $data['city_id'] = $request->input('city_id') ?: $request->input('cityId') ?: null;
        }
        if ($request->has('tax_id') || $request->has('taxId')) {
            $data['tax_id'] = $request->input('tax_id') ?: $request->input('taxId') ?: null;
        }
        if ($request->has('bank_id') || $request->has('bankId')) {
            $data['bank_id'] = $request->input('bank_id') ?: $request->input('bankId') ?: null;
        }
        if ($request->has('bank_account_name') || $request->has('bankAccountName')) {
            $data['bank_account_name'] = $request->input('bank_account_name') ?: $request->input('bankAccountName') ?: null;
        }
        if ($request->has('ifsc')) $data['ifsc'] = $request->input('ifsc');
        if ($request->has('account_no') || $request->has('accountNo')) {
            $data['account_no'] = $request->input('account_no') ?: $request->input('accountNo') ?: null;
        }
        if ($request->has('state_id') || $request->has('stateId')) {
            $data['state_id'] = $request->input('state_id') ?: $request->input('stateId') ?: null;
        }
        if ($request->has('pincode')) $data['pincode'] = $request->input('pincode');
        
        if ($request->has('active')) {
            $data['is_active'] = $request->boolean('active');
        } elseif ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        return $data;
    }

    public function index(Request $request)
    {
        $query = Agent::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('contact_no', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('name')->limit(2000)->get()->map(fn($a) => $this->formatAgent($a));
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 20);
        $paginated = $query->orderBy('name')->paginate($limit);

        return response()->json([
            'success'    => true,
            'data'       => collect($paginated->items())->map(fn($a) => $this->formatAgent($a)),
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $this->extractAgentData($request);
        if (empty($data['code'])) {
            $data['code'] = 'AGT_' . strtoupper(substr(uniqid(), -6));
        }

        $agent = Agent::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Agent created successfully',
            'data'    => $this->formatAgent($agent),
        ], 201);
    }

    public function show($id)
    {
        $agent = Agent::where('id', $id)
            ->orWhere('code', $id)
            ->first();

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->formatAgent($agent),
        ]);
    }

    public function update(Request $request, $id)
    {
        $agent = Agent::where('id', $id)
            ->orWhere('code', $id)
            ->first();

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found',
            ], 404);
        }

        $data = $this->extractAgentData($request);
        $agent->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Agent updated successfully',
            'data'    => $this->formatAgent($agent),
        ]);
    }

    public function destroy($id)
    {
        $agent = Agent::where('id', $id)
            ->orWhere('code', $id)
            ->first();

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found',
            ], 404);
        }

        $agent->delete();

        return response()->json([
            'success' => true,
            'message' => 'Agent deleted successfully',
        ]);
    }
}
