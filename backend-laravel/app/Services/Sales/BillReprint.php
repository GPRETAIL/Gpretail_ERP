<?php

namespace App\Services\Sales;

use App\Models\ApprovalRequest;
use App\Models\BillPrint;
use App\Models\CustomerOrder;
use App\Models\DealerInvoice;
use App\Models\DealerInvoiceReturn;
use App\Models\DealerReceipt;
use App\Models\PosReturn;
use App\Models\PosSale;
use App\Models\Store;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use App\Services\Documents\DocumentNumberService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Sales > Bill Reprint: one search over every sales document a store prints (POS bills and returns, dealer
 * invoices, returns and receipts, customer orders), and a log of every reprint. Queries go through Eloquent so the
 * store scope applies: a store sees only its own documents, the tenant admin's "All stores" sees every store.
 *
 * Reprint rules (Sales Customisation): after reprintReasonAfter reprints a reason is required; a cashier may reprint
 * only today's documents, older ones need a supervisor's approval (bill_reprint).
 */
class BillReprint
{
    public const TYPES = ['pos_sale', 'pos_return', 'dealer_invoice', 'dealer_return', 'dealer_receipt', 'customer_order'];

    public const LABELS = [
        'pos_sale' => 'POS bill', 'pos_return' => 'POS return', 'dealer_invoice' => 'Dealer invoice',
        'dealer_return' => 'Dealer return', 'dealer_receipt' => 'Dealer receipt', 'customer_order' => 'Customer order',
    ];

    private const PER_TYPE = 100;

    private const MAX_ROWS = 300;

    public function __construct(private ApprovalService $approvals) {}

    /**
     * @param  array{q?: ?string, types?: array<int, string>, from?: ?string, to?: ?string, customer_id?: ?int}  $filters
     * @return array<int, array<string, mixed>>
     */
    public function search(array $filters): array
    {
        $types = array_values(array_intersect(self::TYPES, $filters['types'] ?? []) ?: self::TYPES);
        $rows = collect();
        foreach ($types as $type) {
            $query = $this->query($type);
            $this->filter($query, $type, $filters);
            $column = $this->def($type)['date'];
            $rows = $rows->concat($query->orderByDesc($column)->orderByDesc('id')->limit(self::PER_TYPE)->get()
                ->map(fn (Model $doc) => $this->row($type, $doc)));
        }
        $rows = $rows->sortByDesc(fn ($row) => $row['date'].' '.str_pad((string) $row['id'], 10, '0', STR_PAD_LEFT))->take(self::MAX_ROWS)->values();

        $counts = $this->counts($rows->all());
        $stores = Store::whereIn('id', $rows->pluck('store_id')->unique()->all())->pluck('name', 'id');

        return $rows->map(fn ($row) => [...$row,
            'print_count' => $counts[$row['type'].':'.$row['id']] ?? 0,
            'store_name' => $stores[$row['store_id']] ?? null,
        ])->all();
    }

    /** The search row for one document, with its reprint count; null if this store cannot see it. */
    public function find(string $type, int $id): ?array
    {
        $doc = $this->query($type)->find($id);
        if (! $doc) {
            return null;
        }
        $row = $this->row($type, $doc);

        return [...$row, 'print_count' => $this->counts([$row])[$type.':'.$id] ?? 0];
    }

    /**
     * Records one reprint. Returns the log row and the new count (this reprint is number $count).
     *
     * @param  array{copy_label?: ?string, reason?: ?string, channel?: ?string, approvalToken?: ?string}  $input
     */
    public function log(User $user, string $type, int $id, array $input): array
    {
        $doc = $this->query($type)->find($id);
        abort_unless($doc, 404, 'Document not found.');
        $row = $this->row($type, $doc);
        $storeId = (int) $doc->store_id;
        $settings = $this->settings($storeId);

        return DB::transaction(function () use ($user, $type, $id, $input, $row, $storeId, $settings) {
            $previous = BillPrint::where('doc_type', $type)->where('doc_id', $id)->lockForUpdate()->count();
            $reason = trim((string) ($input['reason'] ?? ''));
            if ($settings['reason_after'] > 0 && $previous >= $settings['reason_after'] && $reason === '') {
                throw ValidationException::withMessages(['reason' => "This document was already reprinted {$previous} time(s). Enter a reason for this reprint."]);
            }

            $approval = $this->authorize($user, $storeId, $row, $reason, $input['approvalToken'] ?? null);

            $print = BillPrint::create([
                'store_id' => $storeId, 'doc_type' => $type, 'doc_id' => $id, 'doc_no' => $row['number'],
                'copy_label' => $this->label($input['copy_label'] ?? null), 'reason' => $reason !== '' ? mb_substr($reason, 0, 255) : null,
                'channel' => ($input['channel'] ?? 'print') === 'share' ? 'share' : 'print',
                'user_id' => $user->id, 'approval_request_id' => $approval?->id, 'printed_at' => now(),
            ]);
            if ($approval) {
                $approval->forceFill(['status' => 'used', 'used_at' => now(), 'payload' => [...($approval->payload ?? []), 'bill_print_id' => $print->id]])->save();
            }

            return ['id' => $print->id, 'count' => $previous + 1, 'printed_at' => $print->printed_at->toIso8601String(), 'user_name' => $user->name,
                'copy_label' => $print->copy_label, 'reason' => $print->reason];
        });
    }

    /** Whether $user may reprint this row without a reason/approval prompt, for the screen to ask up front. */
    public function rules(User $user, array $row): array
    {
        $settings = $this->settings((int) $row['store_id']);

        return [
            'reason_required' => $settings['reason_after'] > 0 && ($row['print_count'] ?? 0) >= $settings['reason_after'],
            'approval_required' => $this->needsApproval($user, $row),
            'copy_labels' => $settings['copy_labels'],
        ];
    }

    /** @return array<int, array<string, mixed>> the reprint log of one document, newest first */
    public function history(string $type, int $id): array
    {
        abort_unless($this->query($type)->whereKey($id)->exists(), 404, 'Document not found.');

        return BillPrint::with('user:id,name')->where('doc_type', $type)->where('doc_id', $id)->orderByDesc('id')->get()
            ->map(fn (BillPrint $p) => ['id' => $p->id, 'printed_at' => $p->printed_at?->toIso8601String(), 'user_name' => $p->user?->name,
                'copy_label' => $p->copy_label, 'reason' => $p->reason, 'channel' => $p->channel])->all();
    }

    /** @return array{reason_after: int, copy_labels: bool} */
    public function settings(int $storeId): array
    {
        $value = json_decode((string) (DB::table('stores')->where('id', $storeId)->value('receipt_customization') ?? ''), true) ?: [];
        $after = $value['reprintReasonAfter'] ?? 1;

        return [
            'reason_after' => is_numeric($after) ? max(0, min(20, (int) $after)) : 1,
            'copy_labels' => (bool) ($value['reprintCopyLabels'] ?? false),
        ];
    }

    private function needsApproval(User $user, array $row): bool
    {
        return ! in_array($user->role, ApprovalService::APPROVER_ROLES, true) && $row['business_date'] < BusinessDate::today()->toDateString();
    }

    private function authorize(User $user, int $storeId, array $row, string $reason, ?string $token): ?ApprovalRequest
    {
        if (! $this->needsApproval($user, $row)) {
            return null;
        }

        return $this->approvals->authorizeReprint($user, $storeId, [
            'doc_type' => $row['type'], 'doc_label' => self::LABELS[$row['type']], 'bill_no' => $row['number'],
            'bill_date' => $row['business_date'], 'amount' => $row['amount'], 'reason' => $reason,
        ], $token);
    }

    /** The copy a reprint is: the label chosen at print time, else simply "Duplicate". */
    private function label(?string $label): string
    {
        $label = trim((string) $label);

        return $label === '' ? 'Duplicate' : mb_substr($label, 0, 60);
    }

    /** @return array<string, int> "type:id" => reprints so far */
    private function counts(array $rows): array
    {
        $out = [];
        foreach (collect($rows)->groupBy('type') as $type => $group) {
            BillPrint::where('doc_type', $type)->whereIn('doc_id', $group->pluck('id')->all())
                ->selectRaw('doc_id, count(*) as aggregate')->groupBy('doc_id')->get()
                ->each(function ($r) use (&$out, $type) {
                    $out[$type.':'.$r->doc_id] = (int) $r->aggregate;
                });
        }

        return $out;
    }

    /** @return array{model: class-string<Model>, number: string, date: string, amount: string, letter: ?string} */
    private function def(string $type): array
    {
        return match ($type) {
            'pos_sale' => ['model' => PosSale::class, 'number' => 'invoice_no', 'date' => 'sale_date', 'amount' => 'grand_total', 'letter' => null],
            'pos_return' => ['model' => PosReturn::class, 'number' => 'return_no', 'date' => 'return_date', 'amount' => 'total_refund', 'letter' => null],
            'dealer_invoice' => ['model' => DealerInvoice::class, 'number' => 'invoice_no', 'date' => 'invoice_date', 'amount' => 'grand_total', 'letter' => 'D'],
            'dealer_return' => ['model' => DealerInvoiceReturn::class, 'number' => 'return_no', 'date' => 'return_date', 'amount' => 'grand_total', 'letter' => 'DR'],
            'dealer_receipt' => ['model' => DealerReceipt::class, 'number' => 'receipt_no', 'date' => 'receipt_date', 'amount' => 'amount', 'letter' => 'R'],
            'customer_order' => ['model' => CustomerOrder::class, 'number' => 'order_no', 'date' => 'order_date', 'amount' => 'net_amount', 'letter' => null],
            default => abort(404, 'Unknown document type.'),
        };
    }

    private function query(string $type): Builder
    {
        $model = $this->def($type)['model'];

        return $model::query()->with('customer:id,name,phone');
    }

    private function filter(Builder $query, string $type, array $filters): void
    {
        $def = $this->def($type);
        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $query->where(function (Builder $w) use ($q, $def, $type) {
                if ($type === 'pos_sale') {
                    $w->where(fn ($n) => $n->billNumber($q));
                } elseif ($def['letter']) {
                    $w->where(fn ($n) => DocumentNumberService::whereNumber($n, $def['number'], $q, $def['letter']));
                }
                $w->orWhere($def['number'], 'like', '%'.$q.'%')
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', '%'.$q.'%')->orWhere('phone', 'like', '%'.$q.'%'));
            });
        }
        if (! empty($filters['customer_id'])) {
            $query->where('customer_id', (int) $filters['customer_id']);
        }
        // POS bills and returns keep a full time; their business day is the date in the business timezone.
        $timed = in_array($type, ['pos_sale', 'pos_return'], true);
        $tz = config('app.business_timezone');
        if (! empty($filters['from'])) {
            $from = Carbon::parse($filters['from'], $tz)->startOfDay();
            $query->where($def['date'], '>=', $timed ? $from->clone()->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : $from->toDateString());
        }
        if (! empty($filters['to'])) {
            $to = Carbon::parse($filters['to'], $tz)->endOfDay();
            $timed
                ? $query->where($def['date'], '<=', $to->clone()->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s'))
                : $query->whereDate($def['date'], '<=', $to->toDateString());
        }
    }

    /** @return array<string, mixed> */
    private function row(string $type, Model $doc): array
    {
        $def = $this->def($type);
        $date = $doc->{$def['date']};
        $date = $date instanceof Carbon ? $date : ($date ? Carbon::parse($date) : null);
        $timed = in_array($type, ['pos_sale', 'pos_return'], true);
        $local = $date ? ($timed ? $date->clone()->setTimezone(config('app.business_timezone')) : $date) : null;
        $raw = (string) $doc->{$def['number']};
        $number = match (true) {
            $type === 'pos_sale' => $doc->bill_no,
            $def['letter'] !== null => DocumentNumberService::short($raw, $def['letter']),
            default => $raw,
        };

        return [
            'type' => $type, 'type_label' => self::LABELS[$type], 'id' => (int) $doc->id, 'store_id' => (int) $doc->store_id,
            'number' => $number, 'full_number' => $raw,
            'date' => $local ? ($timed ? $local->format('Y-m-d H:i:s') : $local->toDateString()) : null,
            'business_date' => $local?->toDateString() ?? '',
            'customer_id' => $doc->customer_id ? (int) $doc->customer_id : null,
            'customer_name' => $doc->customer?->name ?? ($type === 'pos_sale' || $type === 'pos_return' ? 'Walk-in Customer' : null),
            'customer_phone' => $doc->customer?->phone,
            'amount' => round((float) $doc->{$def['amount']}, 2),
            'status' => $doc->status ? strtoupper((string) $doc->status) : null,
        ];
    }
}
