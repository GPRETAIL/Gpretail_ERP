<?php

namespace App\Services\Reports;

/**
 * What each report's Summary layouts can group by and total (ReportSummaryService runs them). Every dataset starts
 * from a table that carries its store, so store isolation never depends on a join. Expressions are fixed here;
 * {date:x} / {month:x} work on MariaDB and on SQLite in the tests.
 *
 * A dataset: module, table, stores (store columns; any match), joins ([table, first, second, 'inner'|'left']),
 * where (fixed conditions), date (column, if the summary takes a From/To), measures (key => label, expr, type:
 * count|qty|money; the first money one, else the first, orders the rows) and layouts (key => title, group, label, extras, joins, order).
 */
class SummaryDatasets
{
    public static function all(): array
    {
        return [...self::warehouse(), ...self::sales(), ...self::finance()];
    }

    private static function warehouse(): array
    {
        $product = ['products as p', 'p.id', 'i.product_id'];
        $category = ['categories as c', 'c.id', 'p.category_id'];
        $brand = ['brands as b', 'b.id', 'p.brand_id'];
        $supplier = ['suppliers as s', 's.id', 'h.supplier_id'];
        $common = fn (string $date) => [
            'date' => self::layout('Date', "{date:$date}", order: 'key'),
            'month' => self::layout('Month', "{month:$date}", order: 'key'),
        ];
        $itemLayouts = [
            'item' => self::layout('Item', 'i.product_id', 'MAX(p.name)', ['code' => ['label' => 'Code', 'expr' => 'MAX(p.code)']], [$product]),
            'brand' => self::layout('Brand', 'p.brand_id', 'MAX(b.name)', joins: [$product, $brand]),
            'category' => self::layout('Category', 'p.category_id', 'MAX(c.name)', joins: [$product, $category]),
        ];

        return [
            'direct_purchase_lines' => [
                'module' => 'warehouse', 'table' => 'direct_purchases as h', 'stores' => ['h.store_id'], 'date' => 'h.purchase_date',
                'joins' => [['direct_purchase_items as i', 'i.direct_purchase_id', 'h.id', 'inner']],
                'where' => ["(h.invoice_workflow_status IS NULL OR h.invoice_workflow_status <> 'temporary')"],
                'measures' => [
                    'bills' => ['label' => 'Bills', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'qty' => ['label' => 'Qty', 'expr' => 'SUM(i.qty)', 'type' => 'qty'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(i.amount)', 'type' => 'money'],
                    'tax' => ['label' => 'Tax', 'expr' => 'SUM(i.tax_amount)', 'type' => 'money'],
                ],
                'layouts' => [
                    'supplier' => self::layout('Supplier', 'h.supplier_id', 'MAX(COALESCE(s.name, h.supplier_name))', joins: [$supplier]),
                    ...$common('h.purchase_date'),
                    'bill' => self::layout('Bill', 'h.id', 'MAX(h.invoice_no)', [
                        'bill_date' => ['label' => 'Date', 'expr' => 'MAX(h.purchase_date)'],
                        'supplier' => ['label' => 'Supplier', 'expr' => 'MAX(h.supplier_name)'],
                        'purchase_no' => ['label' => 'Purchase no', 'expr' => 'MAX(h.purchase_no)'],
                    ], header: 'Bill no', order: 'key'),
                    'gst_rate' => self::layout('GST rate', 'COALESCE(t.rate, 0)', header: 'GST %', joins: [['taxes as t', 't.id', 'i.tax_id']]),
                    'hsn' => self::layout('HSN', 'COALESCE(i.hsn_code, p.hsn_code)', joins: [$product]),
                    'item' => self::layout('Item', 'i.product_id', 'MAX(COALESCE(p.name, i.product_name))', ['code' => ['label' => 'Code', 'expr' => 'MAX(p.code)']], [$product]),
                    'brand' => self::layout('Brand', 'COALESCE(i.brand_id, p.brand_id)', 'MAX(COALESCE(b.name, i.brand_name))', joins: [$product, ['brands as b', 'b.id', 'COALESCE(i.brand_id, p.brand_id)']]),
                    'category' => $itemLayouts['category'],
                ],
            ],
            'invoice_lines' => [
                'module' => 'warehouse', 'table' => 'purchase_invoices as h', 'stores' => ['h.store_id'], 'date' => 'h.invoice_date',
                'joins' => [['purchase_invoice_items as i', 'i.purchase_invoice_id', 'h.id', 'inner']],
                'where' => ["(h.status IS NULL OR h.status <> 'CANCELLED')"],
                'measures' => [
                    'bills' => ['label' => 'Invoices', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'qty' => ['label' => 'Qty', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(i.total)', 'type' => 'money'],
                    'tax' => ['label' => 'Tax', 'expr' => 'SUM(i.tax_amount)', 'type' => 'money'],
                ],
                'layouts' => [
                    'supplier' => self::layout('Supplier', 'h.supplier_id', 'MAX(s.name)', joins: [$supplier]),
                    ...$common('h.invoice_date'),
                    'bill' => self::layout('Invoice', 'h.id', 'MAX(h.invoice_no)', [
                        'bill_date' => ['label' => 'Date', 'expr' => 'MAX(h.invoice_date)'],
                        'supplier' => ['label' => 'Supplier', 'expr' => 'MAX(s.name)'],
                        'supplier_invoice_no' => ['label' => 'Supplier bill', 'expr' => 'MAX(h.supplier_invoice_no)'],
                    ], [$supplier], 'Invoice no', 'key'),
                    'gst_rate' => self::layout('GST rate', 'COALESCE(t.rate, 0)', header: 'GST %', joins: [['taxes as t', 't.id', 'i.tax_id']]),
                    'hsn' => self::layout('HSN', 'p.hsn_code', joins: [$product]),
                    ...$itemLayouts,
                ],
            ],
            'purchase_returns' => [
                'module' => 'warehouse', 'table' => 'purchase_returns as h', 'stores' => ['h.store_id'], 'date' => 'h.return_date',
                'joins' => [['purchase_return_items as i', 'i.purchase_return_id', 'h.id', 'inner']],
                'measures' => [
                    'returns' => ['label' => 'Returns', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'qty' => ['label' => 'Qty', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(i.total)', 'type' => 'money'],
                ],
                'layouts' => [
                    'supplier' => self::layout('Supplier', 'h.supplier_id', 'MAX(s.name)', joins: [$supplier]),
                    ...$common('h.return_date'),
                    'reason' => self::layout('Reason', 'h.reason'),
                    'status' => self::layout('Status', 'h.status'),
                    ...$itemLayouts,
                ],
            ],
            'stock' => [
                'module' => 'warehouse', 'table' => 'stocks as h', 'stores' => ['h.store_id'],
                'joins' => [['products as p', 'p.id', 'h.product_id', 'inner'], ['product_variants as v', 'v.id', 'h.variant_id']],
                'where' => ['h.quantity <> 0'],
                'measures' => [
                    'qty' => ['label' => 'Qty', 'expr' => 'SUM(h.quantity)', 'type' => 'qty'],
                    'items' => ['label' => 'Items', 'expr' => 'COUNT(DISTINCT h.product_id)', 'type' => 'count'],
                    'value' => ['label' => 'Value (cost)', 'expr' => 'SUM(h.quantity * COALESCE(NULLIF(v.cost_price, 0), p.cost_price, 0))', 'type' => 'money'],
                ],
                'layouts' => [
                    'category' => self::layout('Category', 'p.category_id', 'MAX(c.name)', joins: [$category]),
                    'brand' => self::layout('Brand', 'COALESCE(v.brand_id, p.brand_id)', 'MAX(b.name)', joins: [['brands as b', 'b.id', 'COALESCE(v.brand_id, p.brand_id)']]),
                    'item' => self::layout('Item', 'h.product_id', 'MAX(p.name)', ['code' => ['label' => 'Code', 'expr' => 'MAX(p.code)']]),
                    'size' => self::layout('Size', 'v.size_id', 'MAX(z.name)', joins: [['sizes as z', 'z.id', 'v.size_id']]),
                ],
            ],
            'outward_lines' => [
                // A transfer belongs to both ends: the sending and the receiving store each see it.
                'module' => 'warehouse', 'table' => 'stock_outwards as h', 'stores' => ['h.source_store_id', 'h.target_store_id'], 'date' => 'h.outward_date',
                'joins' => [['stock_outward_items as i', 'i.stock_outward_id', 'h.id', 'inner']],
                'measures' => [
                    'transfers' => ['label' => 'Transfers', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'qty' => ['label' => 'Sent qty', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                    'received' => ['label' => 'Received qty', 'expr' => 'SUM(COALESCE(i.received_qty, 0))', 'type' => 'qty'],
                    'value' => ['label' => 'Value', 'expr' => 'SUM(i.quantity * COALESCE(i.unit_price, 0))', 'type' => 'money'],
                ],
                'layouts' => [
                    'to_store' => self::layout('To store', 'h.target_store_id', 'MAX(ts.name)', joins: [['stores as ts', 'ts.id', 'h.target_store_id']]),
                    'from_store' => self::layout('From store', 'h.source_store_id', 'MAX(fs.name)', joins: [['stores as fs', 'fs.id', 'h.source_store_id']]),
                    ...$common('h.outward_date'),
                    'status' => self::layout('Status', 'h.status'),
                    'item' => self::layout('Item', 'COALESCE(i.product_code, i.product_name)', 'MAX(i.product_name)', ['code' => ['label' => 'Code', 'expr' => 'MAX(i.product_code)']]),
                ],
            ],
            'po_lines' => [
                'module' => 'warehouse', 'table' => 'purchase_orders as h', 'stores' => ['h.store_id'], 'date' => 'h.po_date',
                'joins' => [['purchase_order_items as i', 'i.purchase_order_id', 'h.id', 'inner']],
                'measures' => [
                    'orders' => ['label' => 'Orders', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'ordered' => ['label' => 'Ordered', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                    'received' => ['label' => 'Received', 'expr' => 'SUM(i.received_qty)', 'type' => 'qty'],
                    'pending' => ['label' => 'Pending', 'expr' => "SUM(CASE WHEN h.status IN ('DRAFT', 'APPROVED') AND i.quantity > i.received_qty THEN i.quantity - i.received_qty ELSE 0 END)", 'type' => 'qty'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(i.amount)', 'type' => 'money'],
                ],
                'layouts' => [
                    'supplier' => self::layout('Supplier', 'h.supplier_id', 'MAX(s.name)', joins: [$supplier]),
                    'status' => self::layout('Status', 'h.status'),
                    ...$common('h.po_date'),
                    'item' => $itemLayouts['item'],
                ],
            ],
        ];
    }

    private static function sales(): array
    {
        $product = ['products as p', 'p.id', 'i.product_id'];
        $customer = ['customers as cu', 'cu.id', 'h.customer_id'];
        $notCancelled = "(h.status IS NULL OR h.status NOT IN ('CANCELLED', 'CANCELED'))";
        $common = fn (string $date) => [
            'date' => self::layout('Date', "{date:$date}", order: 'key'),
            'month' => self::layout('Month', "{month:$date}", order: 'key'),
        ];
        $item = self::layout('Item', 'i.product_id', 'MAX(p.name)', ['code' => ['label' => 'Code', 'expr' => 'MAX(p.code)']], [$product]);

        return [
            'sale_lines' => [
                'module' => 'sales', 'table' => 'pos_sales as h', 'stores' => ['h.store_id'], 'date' => 'h.sale_date',
                'joins' => [['pos_sale_items as i', 'i.pos_sale_id', 'h.id', 'inner']],
                'where' => [$notCancelled],
                'measures' => [
                    'bills' => ['label' => 'Bills', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'qty' => ['label' => 'Qty', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                    'net' => ['label' => 'Net sales', 'expr' => 'SUM(i.subtotal)', 'type' => 'money'],
                    'discount' => ['label' => 'Discount', 'expr' => 'SUM(i.discount)', 'type' => 'money'],
                    'tax' => ['label' => 'Tax', 'expr' => 'SUM(i.tax_amount)', 'type' => 'money'],
                ],
                'layouts' => [
                    ...$common('h.sale_date'),
                    'gst_rate' => self::layout('GST rate', 'COALESCE(i.tax_rate, 0)', header: 'GST %'),
                    'hsn' => self::layout('HSN', 'p.hsn_code', joins: [$product]),
                    'item' => $item,
                    'brand' => self::layout('Brand', 'p.brand_id', 'MAX(b.name)', joins: [$product, ['brands as b', 'b.id', 'p.brand_id']]),
                    'category' => self::layout('Category', 'p.category_id', 'MAX(c.name)', joins: [$product, ['categories as c', 'c.id', 'p.category_id']]),
                    'salesman' => self::layout('Salesman', 'i.sales_man_id', 'MAX(i.sales_man_name)'),
                    'cashier' => self::layout('Cashier', 'h.user_id', 'MAX(u.name)', joins: [['users as u', 'u.id', 'h.user_id']]),
                    'counter' => self::layout('Counter', 'h.counter_name'),
                    'customer' => self::layout('Customer', 'h.customer_id', 'MAX(cu.name)', ['mobile' => ['label' => 'Mobile', 'expr' => 'MAX(cu.phone)']], [$customer]),
                ],
            ],
            'sale_payments' => [
                'module' => 'sales', 'table' => 'pos_sales as h', 'stores' => ['h.store_id'], 'date' => 'h.sale_date',
                'joins' => [['pos_payments as pp', 'pp.pos_sale_id', 'h.id', 'inner']],
                'where' => [$notCancelled],
                'measures' => [
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(pp.amount)', 'type' => 'money'],
                    'bills' => ['label' => 'Bills', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                ],
                'layouts' => [
                    'payment_mode' => self::layout('Payment mode', 'pp.payment_mode'),
                    ...$common('h.sale_date'),
                    'cashier' => self::layout('Cashier', 'h.user_id', 'MAX(u.name)', joins: [['users as u', 'u.id', 'h.user_id']]),
                    'counter' => self::layout('Counter', 'h.counter_name'),
                ],
            ],
            'pos_returns' => [
                'module' => 'sales', 'table' => 'pos_returns as h', 'stores' => ['h.store_id'], 'date' => 'h.return_date',
                'joins' => [['pos_return_items as i', 'i.pos_return_id', 'h.id', 'inner']],
                'measures' => [
                    'returns' => ['label' => 'Returns', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'qty' => ['label' => 'Qty', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                    'refund' => ['label' => 'Refund', 'expr' => 'SUM(i.subtotal)', 'type' => 'money'],
                ],
                'layouts' => [
                    ...$common('h.return_date'),
                    'customer' => self::layout('Customer', 'h.customer_id', 'MAX(cu.name)', joins: [$customer]),
                    'bill' => self::layout('Return', 'h.id', 'MAX(h.return_no)', ['return_date' => ['label' => 'Date', 'expr' => 'MAX(h.return_date)']], header: 'Return no', order: 'key'),
                    'reason' => self::layout('Reason', 'h.return_reason_name'),
                    'item' => $item,
                ],
            ],
            'dealer_lines' => [
                'module' => 'sales', 'table' => 'dealer_invoices as h', 'stores' => ['h.store_id'], 'date' => 'h.invoice_date',
                'joins' => [['dealer_invoice_items as i', 'i.dealer_invoice_id', 'h.id', 'inner']],
                'where' => ['h.cancelled_at IS NULL'],
                'measures' => [
                    'invoices' => ['label' => 'Invoices', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'qty' => ['label' => 'Qty', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(i.total)', 'type' => 'money'],
                    'tax' => ['label' => 'Tax', 'expr' => 'SUM(i.tax_amount)', 'type' => 'money'],
                ],
                'layouts' => [
                    'dealer' => self::layout('Dealer', 'h.customer_id', 'MAX(cu.name)', joins: [$customer]),
                    ...$common('h.invoice_date'),
                    'invoice' => self::layout('Invoice', 'h.id', 'MAX(h.invoice_no)', ['invoice_date' => ['label' => 'Date', 'expr' => 'MAX(h.invoice_date)'], 'dealer' => ['label' => 'Dealer', 'expr' => 'MAX(cu.name)']], [$customer], 'Invoice no', 'key'),
                    'item' => $item,
                ],
            ],
            'dealer_returns' => [
                'module' => 'sales', 'table' => 'dealer_invoice_returns as h', 'stores' => ['h.store_id'], 'date' => 'h.return_date',
                'measures' => [
                    'returns' => ['label' => 'Returns', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(h.grand_total)', 'type' => 'money'],
                ],
                'layouts' => [
                    'dealer' => self::layout('Dealer', 'h.customer_id', 'MAX(cu.name)', joins: [$customer]),
                    ...$common('h.return_date'),
                ],
            ],
            // The Sales Reports stock tabs summarise the same stock as Warehouse Reports.
            'store_stock' => [...self::warehouse()['stock'], 'module' => 'sales'],
            'customers' => [
                'module' => 'sales', 'table' => 'customers as h', 'stores' => ['h.store_id'],
                'measures' => [
                    'customers' => ['label' => 'Customers', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'balance' => ['label' => 'Balance due', 'expr' => 'SUM(COALESCE(h.current_balance, 0))', 'type' => 'money'],
                    'points' => ['label' => 'Loyalty points', 'expr' => 'SUM(COALESCE(h.loyalty_points, 0))', 'type' => 'qty'],
                ],
                'layouts' => [
                    'type' => self::layout('Customer type', 'h.customer_type'),
                    'city' => self::layout('City', 'h.city'),
                    'state' => self::layout('State', 'h.state'),
                    'status' => self::layout('Status', "CASE WHEN h.is_active = 1 THEN 'Active' ELSE 'Inactive' END"),
                ],
            ],
        ];
    }

    private static function finance(): array
    {
        return [
            'voucher_lines' => [
                'module' => 'finance', 'table' => 'vouchers as h', 'stores' => ['h.store_id'], 'date' => 'h.voucher_date',
                'joins' => [['voucher_lines as l', 'l.voucher_id', 'h.id', 'inner']],
                'measures' => [
                    'vouchers' => ['label' => 'Vouchers', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'debit' => ['label' => 'Debit', 'expr' => 'SUM(l.debit)', 'type' => 'money'],
                    'credit' => ['label' => 'Credit', 'expr' => 'SUM(l.credit)', 'type' => 'money'],
                ],
                'layouts' => [
                    'voucher_type' => self::layout('Voucher type', 'h.voucher_type', labels: [
                        'sales' => 'Sales', 'sales_return' => 'Sales Return', 'receipt' => 'Receipt', 'payment' => 'Payment', 'purchase' => 'Purchase',
                        'purchase_return' => 'Purchase Return', 'journal' => 'Journal', 'contra' => 'Contra', 'transfer' => 'Stock Transfer',
                    ]),
                    'date' => self::layout('Date', '{date:h.voucher_date}', order: 'key'),
                    'month' => self::layout('Month', '{month:h.voucher_date}', order: 'key'),
                    'ledger' => self::layout('Ledger', 'l.ledger_account_id', 'MAX(a.name)', joins: [['ledger_accounts as a', 'a.id', 'l.ledger_account_id']]),
                ],
            ],
        ];
    }

    private static function layout(string $title, string $group, ?string $label = null, array $extras = [], array $joins = [], ?string $header = null, string $order = 'measure', array $labels = []): array
    {
        return array_filter(['title' => $title, 'group' => $group, 'label' => $label, 'extras' => $extras, 'joins' => $joins,
            'header' => $header, 'order' => $order, 'labels' => $labels], fn ($value) => $value !== null && $value !== []);
    }
}
