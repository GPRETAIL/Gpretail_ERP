<?php

namespace App\Services\Sales;

use App\Models\Barcode;
use App\Models\DealerInvoice;
use App\Models\DealerInvoiceReturnItem;
use App\Models\Delivery;
use App\Models\PosReturnItem;
use App\Models\PosSale;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use App\Services\Documents\DocumentNumberService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Sales > Delivery: at handover every item of a bill (a POS bill or a dealer invoice) is checked physically. Nothing
 * extra may leave; anything missing needs a reason and a supervisor's approval, and the bill is then "short".
 * Stock is not touched here: the sale already took the items out.
 */
class DeliveryService
{
    private const EPSILON = 0.0005;

    public function __construct(private ApprovalService $approvals) {}

    /**
     * The bill as the delivery counter sees it: lines grouped by product and size, each with what is still to be
     * handed over (billed minus returned), and the earlier delivery when there is one.
     *
     * @return array<string, mixed>|null
     */
    public function bill(string $number): ?array
    {
        $number = trim($number);
        if ($number === '') {
            return null;
        }
        // A dealer invoice number is matched exactly; a POS bill also by its short form (261031-0001).
        $source = DealerInvoice::with(['items.product', 'customer'])
            ->where(fn ($q) => DocumentNumberService::whereNumber($q, 'invoice_no', $number, 'D'))->first();
        if (! $source) {
            $matches = PosSale::with(['items.product', 'customer'])->billNumber($number)->get();
            abort_if($matches->count() > 1, 422, 'Select a store before looking up this bill number.');
            $source = $matches->first();
        }

        return $source ? $this->present($source) : null;
    }

    /** The bill by its type and id (the handover posts these). */
    public function source(string $type, int $id): Model
    {
        $query = $type === 'dealer_invoice' ? DealerInvoice::query() : PosSale::query();

        return $query->with(['items.product', 'customer'])->findOrFail($id);
    }

    /**
     * What a scanned barcode is: a sticker (barcodes table, also when the unit was deactivated on sale), a size's
     * barcode, or the product's own barcode / code. unique = a one-per-piece sticker, which counts once.
     *
     * @return array{product_id: int, variant_id: ?int, barcode: string, unique: bool, name: ?string}|null
     */
    public function scan(string $barcode): ?array
    {
        $barcode = trim($barcode);
        if ($barcode === '') {
            return null;
        }
        $row = Barcode::where('barcode', $barcode)->with('product:id,name,selling_mode')->first();
        if ($row?->product) {
            return ['product_id' => (int) $row->product_id, 'variant_id' => $row->variant_id ? (int) $row->variant_id : null, 'barcode' => $barcode,
                'unique' => strtoupper((string) ($row->product->selling_mode ?: 'PIECE')) === 'PIECE', 'name' => $row->product->name];
        }
        $variant = ProductVariant::where('barcode', $barcode)->orWhere('sku', $barcode)->with('product:id,name')->first();
        if ($variant?->product) {
            return ['product_id' => (int) $variant->product_id, 'variant_id' => (int) $variant->id, 'barcode' => $barcode, 'unique' => false, 'name' => $variant->product->name];
        }
        $product = Product::where(fn ($q) => $q->where('barcode', $barcode)->orWhere('code', $barcode)->orWhere('sku', $barcode))->first(['id', 'name']);

        return $product ? ['product_id' => (int) $product->id, 'variant_id' => null, 'barcode' => $barcode, 'unique' => false, 'name' => $product->name] : null;
    }

    /**
     * Saves the handover. $items: [{product_id, variant_id, qty, barcodes?}] as counted at the counter.
     *
     * @param  array{source_type: string, source_id: int, items: array<int, array<string, mixed>>, short_reason?: ?string, approvalToken?: ?string}  $input
     */
    public function deliver(User $user, int $storeId, array $input, bool $trustedReplay = false): Delivery
    {
        $method = in_array($input['method'] ?? 'scan', ['scan', 'click', 'mixed'], true) ? ($input['method'] ?? 'scan') : 'scan';
        if ($method !== 'scan' && ! $trustedReplay && ! $this->mayVerifyAll($user, $storeId)) {
            abort(403, 'Verify all is not allowed for you in this store. Scan each item.');
        }

        return DB::transaction(function () use ($user, $storeId, $input, $trustedReplay, $method) {
            $source = $this->source($input['source_type'], (int) $input['source_id']);
            $type = $this->typeOf($source);
            $source->newQuery()->whereKey($source->getKey())->lockForUpdate()->first();
            if ($existing = Delivery::where('source_type', $type)->where('source_id', $source->getKey())->with('deliverer:id,name')->first()) {
                abort(409, 'This bill was already handed over'.($existing->deliverer ? ' by '.$existing->deliverer->name : '').' on '.$existing->delivered_at->format('d M Y, h:i A').'.');
            }
            abort_if($this->cancelled($source), 422, 'This bill is cancelled.');

            $lines = $this->lines($source)->keyBy('key');
            abort_if($lines->sum('expected_qty') <= self::EPSILON, 422, 'Nothing is left to hand over on this bill: every item was returned.');

            $counted = [];
            foreach ($input['items'] ?? [] as $item) {
                $key = $this->key((int) $item['product_id'], $item['variant_id'] ?? null);
                $line = $lines->get($key);
                $qty = round((float) $item['qty'], 3);
                if ($qty <= 0) {
                    continue;
                }
                if (! $line) {
                    throw ValidationException::withMessages(['items' => 'An item that is not on this bill was counted. Take it out before handing over.']);
                }
                $counted[$key] = ['qty' => ($counted[$key]['qty'] ?? 0) + $qty, 'barcodes' => array_merge($counted[$key]['barcodes'] ?? [], array_values(array_filter((array) ($item['barcodes'] ?? []), 'is_string')))];
                if ($counted[$key]['qty'] > $line['expected_qty'] + self::EPSILON) {
                    throw ValidationException::withMessages(['items' => "More {$line['name']} than on the bill was counted ({$counted[$key]['qty']} of {$line['expected_qty']}). Take the extra out."]);
                }
            }

            $short = $lines->map(fn ($line) => ['name' => $line['name'], 'size' => $line['size'], 'expected' => $line['expected_qty'],
                'delivered' => round($counted[$line['key']]['qty'] ?? 0, 3)])
                ->filter(fn ($line) => $line['expected'] - $line['delivered'] > self::EPSILON)->values();
            $shortUnits = round($short->sum(fn ($line) => $line['expected'] - $line['delivered']), 3);
            $reason = trim((string) ($input['short_reason'] ?? ''));
            $approval = null;
            if ($shortUnits > 0) {
                if ($reason === '') {
                    throw ValidationException::withMessages(['short_reason' => 'Say why items are missing before handing over short.']);
                }
                // A synced copy was approved on the server that took it.
                if (! $trustedReplay) {
                    $approval = $this->approvals->authorizeDeliveryShort($user, $storeId, $shortUnits,
                        ['bill_no' => $this->billNo($source), 'reason' => $reason, 'lines' => $short->all()], $input['approvalToken'] ?? null);
                }
            }

            $delivery = Delivery::create([
                'store_id' => $storeId, 'source_type' => $type, 'source_id' => $source->getKey(), 'bill_no' => $this->billNo($source),
                'customer_id' => $source->customer_id, 'status' => $shortUnits > 0 ? Delivery::SHORT : Delivery::DELIVERED, 'check_method' => $method,
                'expected_qty' => round($lines->sum('expected_qty'), 3), 'delivered_qty' => round(collect($counted)->sum('qty'), 3),
                'short_reason' => $shortUnits > 0 ? mb_substr($reason, 0, 500) : null,
                'approval_request_id' => $approval?->id,
                'approved_by' => $shortUnits > 0 ? ($approval?->decided_by ?? ($trustedReplay ? null : $user->id)) : null,
                'delivered_by' => $user->id, 'delivered_at' => now(),
            ]);
            foreach ($lines as $line) {
                $delivery->items()->create([
                    'product_id' => $line['product_id'], 'variant_id' => $line['variant_id'], 'expected_qty' => $line['expected_qty'],
                    'delivered_qty' => round($counted[$line['key']]['qty'] ?? 0, 3),
                    'scanned_barcodes' => array_values(array_unique($counted[$line['key']]['barcodes'] ?? [])) ?: null,
                ]);
            }
            if ($approval) {
                // Single use: the token cannot hand over another bill.
                $approval->forceFill(['status' => 'used', 'used_at' => now(), 'payload' => [...($approval->payload ?? []), 'delivery_id' => $delivery->id]])->save();
            }

            return $delivery->load(['items', 'deliverer:id,name', 'approver:id,name']);
        });
    }

    /**
     * Sales Customisation > Delivery "Verify all": everyone (default), supervisors and above, or off.
     */
    public function verifyAllSetting(int $storeId): string
    {
        $value = (string) (DB::table('stores')->where('id', $storeId)->value('receipt_customization') ?? '');
        $setting = json_decode($value, true)['deliveryVerifyAll'] ?? 'everyone';

        return in_array($setting, ['off', 'supervisor', 'everyone'], true) ? $setting : 'everyone';
    }

    public function mayVerifyAll(User $user, int $storeId): bool
    {
        return match ($this->verifyAllSetting($storeId)) {
            'everyone' => true,
            'supervisor' => in_array($user->role, ApprovalService::APPROVER_ROLES, true),
            default => false,
        };
    }

    /** @return array<string, mixed> */
    public function present(Model $source): array
    {
        $type = $this->typeOf($source);
        $delivery = Delivery::where('source_type', $type)->where('source_id', $source->getKey())
            ->with(['items', 'deliverer:id,name', 'approver:id,name'])->first();

        return [
            'source_type' => $type,
            'source_id' => $source->getKey(),
            'bill_no' => $this->billNo($source),
            'bill_type' => $type === 'dealer_invoice' ? 'Dealer invoice' : 'POS bill',
            'date' => ($type === 'dealer_invoice' ? $source->invoice_date : $source->created_at)?->toDateString(),
            'customer' => $source->customer?->name ?: 'Walk-in Customer',
            'customer_phone' => $source->customer?->phone,
            'cancelled' => $this->cancelled($source),
            'lines' => $this->lines($source)->values(),
            'delivery' => $delivery ? $this->presentDelivery($delivery) : null,
        ];
    }

    /** @return array<string, mixed> */
    public function presentDelivery(Delivery $delivery): array
    {
        return [
            'id' => $delivery->id, 'status' => $delivery->status, 'bill_no' => $delivery->bill_no, 'check_method' => $delivery->check_method,
            'expected_qty' => (float) $delivery->expected_qty, 'delivered_qty' => (float) $delivery->delivered_qty,
            'short_reason' => $delivery->short_reason,
            'delivered_by' => $delivery->deliverer?->name, 'approved_by' => $delivery->approver?->name,
            'delivered_at' => $delivery->delivered_at?->toIso8601String(),
            'items' => $delivery->items->map(fn ($item) => ['product_id' => (int) $item->product_id, 'variant_id' => $item->variant_id ? (int) $item->variant_id : null,
                'expected_qty' => (float) $item->expected_qty, 'delivered_qty' => (float) $item->delivered_qty])->values(),
        ];
    }

    /**
     * Bill lines grouped by product + size; expected = billed - returned (cancelled returns do not count).
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function lines(Model $source): Collection
    {
        $dealer = $source instanceof DealerInvoice;
        $returned = ($dealer
            ? DealerInvoiceReturnItem::whereHas('dealerInvoiceReturn', fn ($q) => $q->where('dealer_invoice_id', $source->getKey())->where('status', '!=', 'CANCELLED'))
            : PosReturnItem::whereHas('posReturn', fn ($q) => $q->where('pos_sale_id', $source->getKey())->where('status', '!=', 'CANCELLED')))
            ->get(['product_id', 'variant_id', 'quantity'])
            ->groupBy(fn ($item) => $this->key((int) $item->product_id, $item->variant_id))
            ->map(fn ($items) => (float) $items->sum('quantity'));
        $variants = ProductVariant::with('size:id,name')->whereIn('id', $source->items->pluck('variant_id')->filter()->unique())->get()->keyBy('id');

        return $source->items->groupBy(fn ($item) => $this->key((int) $item->product_id, $item->variant_id))
            ->map(function ($items, $key) use ($returned, $variants) {
                $first = $items->first();
                $billed = round((float) $items->sum('quantity'), 3);
                $back = round((float) ($returned[$key] ?? 0), 3);
                $mode = strtoupper((string) ($first->product?->selling_mode ?: 'PIECE'));

                return [
                    'key' => $key,
                    'product_id' => (int) $first->product_id,
                    'variant_id' => $first->variant_id ? (int) $first->variant_id : null,
                    'name' => $first->product?->name ?? 'Item',
                    'code' => $first->product?->code,
                    'size' => $first->variant_id ? $variants->get($first->variant_id)?->size?->name : null,
                    'selling_mode' => $mode,
                    'billed_qty' => $billed,
                    'returned_qty' => $back,
                    'expected_qty' => max(0, round($billed - $back, 3)),
                ];
            })->values();
    }

    public function key(int $productId, mixed $variantId): string
    {
        return $productId.':'.((int) $variantId ?: 0);
    }

    private function typeOf(Model $source): string
    {
        return $source instanceof DealerInvoice ? 'dealer_invoice' : 'pos_sale';
    }

    private function billNo(Model $source): string
    {
        return $source instanceof DealerInvoice ? DocumentNumberService::short($source->invoice_no, 'D') : (string) $source->bill_no;
    }

    private function cancelled(Model $source): bool
    {
        return strtoupper((string) $source->status) === 'CANCELLED' || ($source instanceof DealerInvoice && $source->cancelled_at !== null);
    }
}
