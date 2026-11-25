<?php

namespace App\Services\Reports;

use App\Models\GiftCredit;
use App\Models\GiftCreditRedemption;
use App\Models\PosReturn;
use App\Models\PosSale;
use App\Models\ReportScheduleRun;
use App\Services\Reports\Scheduled\ScheduledReportCatalog;
use App\Services\Sales\GiftCreditService;
use App\Services\Sales\IncentiveCalculator;
use App\Services\Tenancy\StoreQuery;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Sales Reports tabs that need their own data (stock batches, physical audits, loyalty redemptions, salesman
 * incentives). Every query goes through the store scope, so a store only ever sees its own rows.
 */
class StoreReports
{
    public const REPORTS = ['stock_aging', 'shelf_period', 'stock_audit', 'loyalty_redemptions', 'incentives', 'gift_credit_issues', 'gift_credit_uses', 'coupon_issues', 'coupon_uses'];

    /**
     * Reports for people who may export reports, and not offered in the Scheduler: the Scheduler's own delivery history
     * (it lists recipients' email addresses, and a log of the log would only repeat itself).
     */
    public const EXPORT_REPORTS = ['scheduled_messages'];

    private const AGE_BUCKETS = [30 => '0-30 days', 60 => '31-60 days', 90 => '61-90 days', 180 => '91-180 days'];

    public function rows(string $report): Collection
    {
        return match ($report) {
            'scheduled_messages' => $this->scheduledMessages(),
            'gift_credit_issues' => $this->giftCreditIssues([GiftCredit::GIFT_VOUCHER, GiftCredit::CREDIT_NOTE]),
            'gift_credit_uses' => $this->giftCreditUses([GiftCredit::GIFT_VOUCHER, GiftCredit::CREDIT_NOTE]),
            'coupon_issues' => $this->giftCreditIssues([GiftCredit::COUPON]),
            'coupon_uses' => $this->giftCreditUses([GiftCredit::COUPON]),
            'stock_aging' => $this->stockAging(),
            'shelf_period' => $this->shelfPeriod(),
            'stock_audit' => $this->stockAudit(),
            'loyalty_redemptions' => $this->loyaltyRedemptions(),
            'incentives' => $this->incentives(),
        };
    }

    /** Stock still on the shelf, batch by batch (FIFO receipts), with how long each has been there. */
    private function stockAging(): Collection
    {
        $today = CarbonImmutable::today();

        return $this->batches()->map(function ($row) use ($today) {
            $days = (int) CarbonImmutable::parse($row->received_at)->startOfDay()->diffInDays($today);

            return [
                'product_name' => $row->product_name, 'product_code' => $row->product_code, 'size' => $row->size_name ?? '-', 'design_no' => $row->design_no ?? '-',
                'source' => str_replace('_', ' ', ucwords(strtolower($row->reference_type), '_')), 'received_at' => substr((string) $row->received_at, 0, 10),
                'received_qty' => (float) $row->received_qty, 'remaining_qty' => (float) $row->remaining_qty, 'cost_price' => (float) $row->cost_price,
                'stock_value' => round((float) $row->remaining_qty * (float) $row->cost_price, 2), 'age_days' => $days, 'age_bucket' => $this->bucket($days),
            ];
        })->values();
    }

    /** Per item in stock: its oldest unsold batch against the item's Stock(Age) shelf period from the Item master. */
    private function shelfPeriod(): Collection
    {
        $today = CarbonImmutable::today();

        return $this->batches()->groupBy('variant_id')->map(function (Collection $batches) use ($today) {
            $first = $batches->first(); // Oldest first.
            $qty = (float) $batches->sum('remaining_qty');
            $days = (int) CarbonImmutable::parse($first->received_at)->startOfDay()->diffInDays($today);
            $limit = (int) (json_decode($first->master_details ?? '[]', true)['stock_age'] ?? 0);

            return [
                'product_name' => $first->product_name, 'product_code' => $first->product_code, 'size' => $first->size_name ?? '-', 'design_no' => $first->design_no ?? '-',
                'stock_qty' => $qty, 'stock_value' => round($batches->sum(fn ($b) => (float) $b->remaining_qty * (float) $b->cost_price), 2),
                'oldest_received' => substr((string) $first->received_at, 0, 10), 'latest_received' => substr((string) $batches->last()->received_at, 0, 10),
                'days_on_shelf' => $days, 'shelf_period' => $limit ?: null,
                'shelf_status' => $limit <= 0 ? 'No shelf period set' : ($days > $limit ? 'Over by '.($days - $limit).' days' : ($limit - $days).' days left'),
            ];
        })->sortByDesc('days_on_shelf')->values();
    }

    /** Physical stock audits: counted against the system quantity, line by line. */
    private function stockAudit(): Collection
    {
        return StoreQuery::table('physical_stocks as a')
            ->join('physical_stock_items as i', 'i.physical_stock_id', '=', 'a.id')
            ->join('products as p', 'p.id', '=', 'i.product_id')
            ->leftJoin('product_variants as v', 'v.id', '=', 'i.variant_id')
            ->leftJoin('sizes as s', 's.id', '=', 'v.size_id')
            ->select('a.audit_no', 'a.audit_date', 'a.status', 'p.name as product_name', 'p.code as product_code', 's.name as size_name', 'p.cost_price',
                'i.system_qty', 'i.counted_qty', 'i.difference_qty', 'i.notes')
            ->orderByDesc('a.audit_date')->orderBy('a.audit_no')->limit(20000)->get()
            ->map(fn ($row) => [
                'audit_no' => $row->audit_no, 'audit_date' => substr((string) $row->audit_date, 0, 10), 'status' => $row->status,
                'product_name' => $row->product_name, 'product_code' => $row->product_code, 'size' => $row->size_name ?? '-',
                'system_qty' => (float) $row->system_qty, 'counted_qty' => (float) $row->counted_qty, 'difference_qty' => (float) $row->difference_qty,
                'difference_value' => round((float) $row->difference_qty * (float) $row->cost_price, 2),
                'result' => abs((float) $row->difference_qty) < 0.0005 ? 'Matched' : ((float) $row->difference_qty > 0 ? 'Excess' : 'Short'), 'notes' => $row->notes ?? '',
            ]);
    }

    /** Loyalty points customers spent on bills. */
    private function loyaltyRedemptions(): Collection
    {
        return StoreQuery::table('loyalty_transactions as t')->where('t.type', 'REDEEM')
            ->join('customers as c', 'c.id', '=', 't.customer_id')
            ->leftJoin('pos_sales as s', 's.id', '=', 't.pos_sale_id')
            ->select('t.created_at', 'c.name as customer_name', 'c.phone', 'c.loyalty_card_number', 's.invoice_no', 's.grand_total', 't.points', 't.amount', 't.balance_after')
            ->orderByDesc('t.created_at')->limit(20000)->get()
            ->map(fn ($row) => [
                'redeemed_at' => substr((string) $row->created_at, 0, 16), 'customer_name' => $row->customer_name, 'mobile_no' => $row->phone ?? '-',
                'card_no' => $row->loyalty_card_number ?? '-', 'bill_no' => $row->invoice_no ?? '-', 'bill_amount' => (float) $row->grand_total,
                'points' => abs((float) $row->points), 'amount' => abs((float) $row->amount), 'balance_after' => (float) $row->balance_after,
            ]);
    }

    /**
     * Salesperson incentive per month for the last 12 months, worked out by the same rules as Finance > Incentive
     * Report (Services/Sales/IncentiveCalculator), so both reports agree.
     */
    /**
     * Scheduled Message Log: every sending of a scheduled report email (Settings > Scheduler), newest first, with who got
     * it, who was skipped and why a sending failed. The same history as the Scheduler's Delivery Log, as a report that can
     * be searched, filtered and exported.
     */
    private function scheduledMessages(): Collection
    {
        $labels = app(ScheduledReportCatalog::class)->all();
        $zone = config('app.business_timezone');
        $text = fn ($value) => is_array($value) ? ($value['email'] ?? $value['name'] ?? json_encode($value)) : (string) $value;

        return ReportScheduleRun::with('schedule:id,name,report_key')->orderByDesc('started_at')->orderByDesc('id')->limit(2000)->get()->map(function (ReportScheduleRun $run) use ($labels, $zone, $text) {
            $key = $run->schedule?->report_key;
            $sent = array_map($text, $run->recipients ?? []);
            $skipped = array_map($text, $run->skipped_recipients ?? []);
            $at = $run->started_at ?? $run->created_at;

            return [
                'sent_at' => $at?->setTimezone($zone)->format('Y-m-d H:i') ?? '-',
                'schedule' => $run->schedule?->name ?? '(deleted schedule)',
                'report' => $key ? ($labels[$key]['label'] ?? $key) : '-',
                'trigger' => $run->trigger === 'manual' ? 'Sent by hand' : 'On schedule',
                'period' => $run->period_from ? $run->period_from->toDateString().($run->period_to && ! $run->period_to->equalTo($run->period_from) ? ' to '.$run->period_to->toDateString() : '') : '-',
                'status' => match ($run->status) {
                    'sent' => 'Sent', 'partial' => 'Partly sent', 'skipped' => 'Skipped', 'failed' => 'Failed', default => ucfirst((string) $run->status),
                },
                'rows' => (int) $run->rows,
                'recipient_count' => count($sent),
                'recipients' => implode(', ', $sent),
                'skipped_recipients' => implode(', ', $skipped),
                'files' => implode(', ', $this->fileNames($run->files ?? [])),
                'error' => (string) ($run->error ?? ''),
            ];
        })->values();
    }

    private const GIFT_CREDIT_KIND_LABEL = [GiftCredit::GIFT_VOUCHER => 'Gift voucher', GiftCredit::CREDIT_NOTE => 'Credit note', GiftCredit::COUPON => 'Coupon'];

    private const GIFT_CREDIT_STATE_LABEL = ['ACTIVE' => 'Active', 'USED' => 'Used', 'EXPIRED' => 'Expired', 'CANCELLED' => 'Cancelled'];

    /**
     * Customer Gift Voucher/Credit Note: every one issued, what it was for, how much has been used and what is left.
     * (Coupons have their own pages, which use the same list.)
     *
     * @param  list<string>  $kinds
     */
    private function giftCreditIssues(array $kinds): Collection
    {
        $credits = GiftCredit::with('customer:id,name,phone')->whereIn('kind', $kinds)->orderByDesc('issued_on')->orderByDesc('id')->limit(20000)->get();
        $returns = PosReturn::whereIn('id', $credits->pluck('source_pos_return_id')->filter()->unique())->pluck('return_no', 'id');
        $sales = PosSale::whereIn('id', $credits->pluck('source_pos_sale_id')->filter()->unique())->get(['id', 'invoice_no'])->keyBy('id');
        $service = app(GiftCreditService::class);

        return $credits->map(fn (GiftCredit $credit) => [
            'issued_on' => $credit->issued_on?->toDateString() ?? '-',
            'number' => $service->displayNumber($credit),
            'type' => self::GIFT_CREDIT_KIND_LABEL[$credit->kind] ?? $credit->kind,
            'customer_name' => $credit->customer?->name ?? ($credit->buyer_name ?: '-'),
            'mobile_no' => $credit->customer?->phone ?? ($credit->buyer_phone ?: '-'),
            'source' => $credit->source_pos_return_id ? 'Return '.($returns[$credit->source_pos_return_id] ?? '') : ($credit->source_pos_sale_id ? 'Bill '.($sales[$credit->source_pos_sale_id]->bill_no ?? '') : '-'),
            'amount' => round((float) $credit->original_amount, 2),
            'used' => $credit->status === 'CANCELLED' ? 0.0 : round((float) $credit->original_amount - (float) $credit->balance, 2),
            'balance' => $credit->status === 'CANCELLED' ? 0.0 : round((float) $credit->balance, 2),
            'expires_on' => $credit->expires_on?->toDateString() ?? 'Never',
            'status' => self::GIFT_CREDIT_STATE_LABEL[$credit->state] ?? $credit->state,
        ])->values();
    }

    /**
     * Gift Voucher/Credit Note Consumption: each use on a bill (a bill that was cancelled gave it back, so its use is not listed),
     * with the balance on the voucher or note now.
     *
     * @param  list<string>  $kinds
     */
    private function giftCreditUses(array $kinds): Collection
    {
        $uses = GiftCreditRedemption::with('giftCredit.customer:id,name,phone')->whereNull('reversed_at')
            ->whereHas('giftCredit', fn ($q) => $q->whereIn('kind', $kinds))->orderByDesc('redeemed_on')->orderByDesc('id')->limit(20000)->get();
        $sales = PosSale::with('customer:id,name,phone')->whereIn('id', $uses->pluck('pos_sale_id')->unique())->get(['id', 'invoice_no', 'customer_id'])->keyBy('id');
        $service = app(GiftCreditService::class);

        return $uses->map(function (GiftCreditRedemption $use) use ($sales, $service) {
            $credit = $use->giftCredit;
            $sale = $sales[$use->pos_sale_id] ?? null;
            $customer = $sale?->customer ?? $credit?->customer;

            return [
                'redeemed_on' => $use->redeemed_on?->toDateString() ?? '-',
                'number' => $credit ? $service->displayNumber($credit) : '-',
                'type' => self::GIFT_CREDIT_KIND_LABEL[$credit?->kind] ?? '-',
                'bill_no' => $sale?->bill_no ?? '-',
                'customer_name' => $customer?->name ?? '-',
                'mobile_no' => $customer?->phone ?? '-',
                'amount' => round((float) $use->amount, 2),
                'balance' => round((float) ($credit?->balance ?? 0), 2),
                'status' => $credit ? (self::GIFT_CREDIT_STATE_LABEL[$credit->state] ?? $credit->state) : '-',
            ];
        })->values();
    }

    /** File names only (a run may keep name => path); a server path is never shown. */
    private function fileNames(array $files): array
    {
        return array_map(fn ($name) => basename((string) $name), array_is_list($files) ? $files : array_keys($files));
    }

    private function incentives(): Collection
    {
        $storeIds = array_map('intval', (array) request()->attributes->get('store_context_ids', []));
        $calculator = app(IncentiveCalculator::class);
        $rows = collect();
        foreach ($storeIds as $storeId) {
            $months = DB::table('pos_sale_items as i')->join('pos_sales as s', 's.id', '=', 'i.pos_sale_id')
                ->where('s.store_id', $storeId)->whereNotNull('i.sales_man_id')->where('s.sale_date', '>=', now()->subMonths(11)->startOfMonth())
                ->selectRaw('DISTINCT SUBSTR(s.sale_date, 1, 7) as m')->pluck('m');
            foreach ($months as $month) {
                foreach ($calculator->month($storeId, (string) $month)['rows'] as $row) {
                    $rows->push([
                        'month' => $month, 'employee_code' => $row['employee_code'] ?? '-', 'employee_name' => $row['employee_name'],
                        'section' => $row['section'] ?? 'No section', 'bills' => $row['bills'], 'qty' => (float) $row['qty'], 'net_sales' => $row['net_sales'],
                        'incentive_pct' => $row['net_sales'] > 0 ? round($row['total'] / $row['net_sales'] * 100, 2) : 0, 'incentive_amount' => $row['total'],
                    ]);
                }
            }
        }

        return $rows->sortBy([['month', 'desc'], ['incentive_amount', 'desc']])->values();
    }

    /** Unsold stock batches, oldest first, with the item they belong to. */
    private function batches(): Collection
    {
        return StoreQuery::table('stock_batches as b')->where('b.remaining_qty', '>', 0)
            ->join('product_variants as v', 'v.id', '=', 'b.variant_id')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->leftJoin('sizes as s', 's.id', '=', 'v.size_id')
            ->select('b.variant_id', 'b.reference_type', 'b.received_at', 'b.received_qty', 'b.remaining_qty', 'b.cost_price',
                'p.name as product_name', 'p.code as product_code', 'p.master_details', 'v.design_no', 's.name as size_name')
            ->orderBy('b.received_at')->orderBy('b.id')->limit(50000)->get();
    }

    private function bucket(int $days): string
    {
        foreach (self::AGE_BUCKETS as $upTo => $label) {
            if ($days <= $upTo) {
                return $label;
            }
        }

        return 'Over 180 days';
    }
}
