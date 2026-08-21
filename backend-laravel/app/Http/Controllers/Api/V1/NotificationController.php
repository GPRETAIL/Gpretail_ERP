<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DirectPurchase;
use App\Models\Notification;
use App\Models\PurchaseInvoice;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    private const DUE_SOON_TYPE = 'SUPPLIER_PAYMENT_DUE_SOON';
    private const OVERDUE_TYPE = 'SUPPLIER_PAYMENT_OVERDUE';
    private const DUE_SOON_DAYS = 30;
    private const OVERDUE_DAYS = 90;

    public function index(Request $request)
    {
        $this->generateSupplierPaymentAlerts();

        $notifications = Notification::orderByRaw('read_at IS NOT NULL')
            ->orderByDesc('created_at')
            ->limit((int) $request->input('limit', 20))
            ->get();

        return response()->json(['success' => true, 'data' => $notifications]);
    }

    public function unreadCount()
    {
        $this->generateSupplierPaymentAlerts();

        return response()->json(['success' => true, 'data' => ['count' => Notification::unread()->count()]]);
    }

    public function markRead($id)
    {
        $notification = Notification::find($id);
        if (!$notification) {
            return response()->json(['success' => false, 'message' => 'Notification not found'], 404);
        }

        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['success' => true, 'data' => $notification]);
    }

    public function markAllRead()
    {
        Notification::unread()->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * Lazily scans pending supplier bills for age-based alerts and inserts
     * any newly-qualifying ones - no cron/scheduler dependency. Each
     * (reference, type) pair is only ever inserted once, so re-scanning on
     * every bell open never duplicates a notification; a bill that ages
     * past 90 days gets a second, more urgent notification alongside its
     * original 30-day one rather than replacing it.
     */
    private function generateSupplierPaymentAlerts(): void
    {
        $existing = Notification::whereIn('type', [self::DUE_SOON_TYPE, self::OVERDUE_TYPE])
            ->get(['type', 'reference_id'])
            ->map(fn ($n) => $n->type . ':' . $n->reference_id)
            ->flip();

        $bills = [];
        foreach (PurchaseInvoice::with('supplier')->where('payment_status', '!=', 'PAID')->get() as $inv) {
            $bills[] = [
                'reference_id' => $inv->id,
                'invoice_no' => $inv->invoice_no,
                'supplier_name' => $inv->supplier?->name ?? 'Unknown Supplier',
                'days' => $inv->invoice_date ? (int) now()->diffInDays($inv->invoice_date, true) : 0,
                'link' => "/finance/supplier-payment?openInvoiceType=invoice&openInvoiceId={$inv->id}",
            ];
        }
        foreach (DirectPurchase::with('supplier')->where('payment_status', '!=', 'PAID')->get() as $dir) {
            $bills[] = [
                'reference_id' => $dir->id,
                'invoice_no' => $dir->invoice_no ?: $dir->purchase_no,
                'supplier_name' => $dir->supplier?->name ?? 'Unknown Supplier',
                'days' => $dir->purchase_date ? (int) now()->diffInDays($dir->purchase_date, true) : 0,
                'link' => "/finance/supplier-payment?openInvoiceType=direct&openInvoiceId={$dir->id}",
            ];
        }

        foreach ($bills as $bill) {
            if ($bill['days'] >= self::OVERDUE_DAYS && !isset($existing[self::OVERDUE_TYPE . ':' . $bill['reference_id']])) {
                Notification::create([
                    'type' => self::OVERDUE_TYPE,
                    'title' => 'Supplier Payment Overdue',
                    'message' => "{$bill['invoice_no']} ({$bill['supplier_name']}) is {$bill['days']} days old and still unpaid.",
                    'link' => $bill['link'],
                    'reference_type' => 'SUPPLIER_BILL',
                    'reference_id' => $bill['reference_id'],
                ]);
            }

            if ($bill['days'] >= self::DUE_SOON_DAYS && !isset($existing[self::DUE_SOON_TYPE . ':' . $bill['reference_id']])) {
                Notification::create([
                    'type' => self::DUE_SOON_TYPE,
                    'title' => 'Supplier Payment Due Soon',
                    'message' => "{$bill['invoice_no']} ({$bill['supplier_name']}) is {$bill['days']} days old and unpaid.",
                    'link' => $bill['link'],
                    'reference_type' => 'SUPPLIER_BILL',
                    'reference_id' => $bill['reference_id'],
                ]);
            }
        }
    }
}
