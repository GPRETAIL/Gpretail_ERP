<?php

namespace App\Services\Reports;

/**
 * What each report's Summary layouts can group by and total (ReportSummaryService runs them). Every dataset starts
 * from a table that carries its store, so store isolation never depends on a join. Expressions are fixed here;
 * {date:x} / {month:x} / {mon:x} work on MariaDB and on SQLite in the tests.
 *
 * A dataset: module, table, stores (store columns; any match), joins ([table, first, second, 'inner'|'left']),
 * where (fixed conditions), date (column, if the summary takes a From/To), measures (key => label, expr, type:
 * count|qty|money|percent; the first money one, else the first, orders the rows) and layouts (key => title, group,
 * label, extras, joins, header, order, labels, where -- a layout's own condition, e.g. bills with a discount).
 *
 * Each report tab picks which of its dataset's layouts it shows, and in what order (the `summary` of the tab in
 * SalesReports.jsx / WarehouseReports.jsx), so one dataset serves several reports without a generic list.
 */
class SummaryDatasets
{
    private const MONTH_NAMES = ['01' => 'January', '02' => 'February', '03' => 'March', '04' => 'April', '05' => 'May', '06' => 'June',
        '07' => 'July', '08' => 'August', '09' => 'September', '10' => 'October', '11' => 'November', '12' => 'December'];

    public static function all(): array
    {
        return [...self::warehouse(), ...self::sales(), ...self::finance()];
    }

    /** "Location": the store, for users who see more than one. */
    private static function location(string $column): array
    {
        return self::layout('Location', $column, 'MAX(st.name)', joins: [['stores as st', 'st.id', $column]]);
    }

    private static function dated(string $date): array
    {
        return [
            'date' => self::layout('Date', "{date:$date}", order: 'key'),
            'month' => self::layout('Month', "{month:$date}", order: 'key'),
        ];
    }

    private static function active(string $column = 'h.is_active'): array
    {
        return self::layout('Status', "CASE WHEN $column = 1 THEN 'Active' ELSE 'Inactive' END");
    }

    private static function warehouse(): array
    {
        $product = ['products as p', 'p.id', 'i.product_id'];
        $category = ['categories as c', 'c.id', 'p.category_id'];
        $brand = ['brands as b', 'b.id', 'p.brand_id'];
        $supplier = ['suppliers as s', 's.id', 'h.supplier_id'];
        $variantSize = [['product_variants as v', 'v.id', 'i.variant_id'], ['sizes as z', 'z.id', 'v.size_id']];
        $itemLayouts = [
            'item' => self::layout('Item', 'i.product_id', 'MAX(p.name)', ['code' => ['label' => 'Code', 'expr' => 'MAX(p.code)']], [$product]),
            'brand' => self::layout('Brand', 'p.brand_id', 'MAX(b.name)', joins: [$product, $brand]),
            'category' => self::layout('Category', 'p.category_id', 'MAX(c.name)', joins: [$product, $category]),
            'section' => self::layout('Section', 'p.section', joins: [$product]),
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
                    ...self::dated('h.purchase_date'),
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
                    'section' => $itemLayouts['section'],
                    'size' => self::layout('Size', 'i.size'),
                    'colour' => self::layout('Colour', 'i.color_name'),
                    'location' => self::location('h.store_id'),
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
                    ...self::dated('h.invoice_date'),
                    'bill' => self::layout('Invoice', 'h.id', 'MAX(h.invoice_no)', [
                        'bill_date' => ['label' => 'Date', 'expr' => 'MAX(h.invoice_date)'],
                        'supplier' => ['label' => 'Supplier', 'expr' => 'MAX(s.name)'],
                        'supplier_invoice_no' => ['label' => 'Supplier bill', 'expr' => 'MAX(h.supplier_invoice_no)'],
                    ], [$supplier], 'Invoice no', 'key'),
                    'gst_rate' => self::layout('GST rate', 'COALESCE(t.rate, 0)', header: 'GST %', joins: [['taxes as t', 't.id', 'i.tax_id']]),
                    'hsn' => self::layout('HSN', 'p.hsn_code', joins: [$product]),
                    ...$itemLayouts,
                    'size' => self::layout('Size', 'v.size_id', 'MAX(z.name)', joins: $variantSize),
                    'location' => self::location('h.store_id'),
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
                    ...self::dated('h.return_date'),
                    'reason' => self::layout('Reason', 'h.reason'),
                    'status' => self::layout('Status', 'h.status'),
                    ...$itemLayouts,
                    'location' => self::location('h.store_id'),
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
                    'section' => self::layout('Section', 'p.section'),
                    'location' => self::location('h.store_id'),
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
                    ...self::dated('h.outward_date'),
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
                    ...self::dated('h.po_date'),
                    'item' => $itemLayouts['item'],
                    'brand' => $itemLayouts['brand'],
                    'location' => self::location('h.store_id'),
                ],
            ],
            'inventory_entries' => [
                'module' => 'warehouse', 'table' => 'inventory_entries as h', 'stores' => ['h.store_id'], 'date' => 'h.entry_date',
                'measures' => [
                    'entries' => ['label' => 'Entries', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(COALESCE(h.total_amount, 0))', 'type' => 'money'],
                ],
                'layouts' => [
                    'supplier' => self::layout('Supplier', 'h.supplier_id', 'MAX(s.name)', joins: [$supplier]),
                    'product' => self::layout('Product', 'h.product_id', 'MAX(p.name)', joins: [['products as p', 'p.id', 'h.product_id']]),
                    'brand' => self::layout('Brand', 'h.brand_id', 'MAX(b.name)', joins: [['brands as b', 'b.id', 'h.brand_id']]),
                    ...self::dated('h.entry_date'),
                    'status' => self::layout('Status', 'h.status'),
                    'location' => self::location('h.store_id'),
                ],
            ],
            'stock_transactions' => [
                'module' => 'warehouse', 'table' => 'stock_transactions as h', 'stores' => ['h.store_id'], 'date' => 'h.created_at',
                'measures' => [
                    'movements' => ['label' => 'Movements', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'qty_in' => ['label' => 'Qty in', 'expr' => "SUM(CASE WHEN h.type = 'IN' THEN h.quantity ELSE 0 END)", 'type' => 'qty'],
                    'qty_out' => ['label' => 'Qty out', 'expr' => "SUM(CASE WHEN h.type = 'OUT' THEN h.quantity ELSE 0 END)", 'type' => 'qty'],
                ],
                'layouts' => [
                    'type' => self::layout('Movement', 'h.type', labels: ['IN' => 'Stock in', 'OUT' => 'Stock out']),
                    'source' => self::layout('Source document', 'h.reference_type', labels: [
                        'POS_SALE' => 'POS sale', 'POS_RETURN' => 'POS return', 'INVENTORY_ENTRY' => 'Inventory entry', 'STOCK_OUTWARD' => 'Store transfer',
                        'DEALER_INVOICE' => 'Dealer invoice', 'DIRECT_PURCHASE' => 'Direct purchase', 'PURCHASE_RETURN' => 'Purchase return',
                        'PURCHASE_INVOICE' => 'Purchase invoice', 'PHYSICAL_STOCK' => 'Stock audit',
                    ]),
                    ...self::dated('h.created_at'),
                    'item' => self::layout('Item', 'h.product_id', 'MAX(p.name)', ['code' => ['label' => 'Code', 'expr' => 'MAX(p.code)']], [['products as p', 'p.id', 'h.product_id']]),
                ],
            ],
            'products' => [
                // Products belong to their store through company_id.
                'module' => 'warehouse', 'table' => 'products as h', 'stores' => ['h.company_id'],
                'measures' => [
                    'products' => ['label' => 'Products', 'expr' => 'COUNT(*)', 'type' => 'count'],
                ],
                'layouts' => [
                    'category' => self::layout('Category', 'h.category_id', 'MAX(c.name)', joins: [['categories as c', 'c.id', 'h.category_id']]),
                    'brand' => self::layout('Brand', 'h.brand_id', 'MAX(b.name)', joins: [['brands as b', 'b.id', 'h.brand_id']]),
                    'section' => self::layout('Section', 'h.section'),
                    'type' => self::layout('Type', 'h.type'),
                    'status' => self::active(),
                ],
            ],
            'supplier_payments' => [
                'module' => 'warehouse', 'table' => 'supplier_payments as h', 'stores' => ['h.store_id'], 'date' => 'h.payment_date',
                'measures' => [
                    'payments' => ['label' => 'Payments', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(h.amount)', 'type' => 'money'],
                ],
                'layouts' => [
                    'supplier' => self::layout('Supplier', 'h.supplier_id', 'MAX(s.name)', joins: [$supplier]),
                    'payment_mode' => self::layout('Payment mode', 'h.payment_mode'),
                    ...self::dated('h.payment_date'),
                    'location' => self::location('h.store_id'),
                ],
            ],
            'suppliers' => [
                'module' => 'warehouse', 'table' => 'suppliers as h', 'stores' => ['h.store_id'],
                'measures' => [
                    'suppliers' => ['label' => 'Suppliers', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'balance' => ['label' => 'Balance', 'expr' => 'SUM(COALESCE(h.current_balance, 0))', 'type' => 'money'],
                ],
                'layouts' => [
                    'city' => self::layout('City', 'h.city'),
                    'state' => self::layout('State', 'h.state'),
                    'status' => self::active(),
                ],
            ],
            'agents' => [
                'module' => 'warehouse', 'table' => 'agents as h', 'stores' => ['h.store_id'],
                'measures' => [
                    'agents' => ['label' => 'Agents', 'expr' => 'COUNT(*)', 'type' => 'count'],
                ],
                'layouts' => [
                    'type' => self::layout('Agent type', 'h.agent_type_id', 'MAX(COALESCE(at.value, at.config_value))', joins: [['system_configurations as at', 'at.id', 'h.agent_type_id']]),
                    'city' => self::layout('City', 'h.city_id', 'MAX(COALESCE(ci.value, ci.config_value))', joins: [['system_configurations as ci', 'ci.id', 'h.city_id']]),
                    'status' => self::active(),
                ],
            ],
            'taxes' => [
                'module' => 'warehouse', 'table' => 'taxes as h', 'stores' => ['h.store_id'],
                'measures' => [
                    'taxes' => ['label' => 'Taxes', 'expr' => 'COUNT(*)', 'type' => 'count'],
                ],
                'layouts' => [
                    'rate' => self::layout('Rate', 'h.rate', header: 'Rate %', order: 'key'),
                    'type' => self::layout('Type', 'h.type'),
                    'use' => self::layout('Used for', "CASE WHEN h.is_sales_tax = 1 AND h.is_purchase_tax = 1 THEN 'Sales & Purchase' WHEN h.is_sales_tax = 1 THEN 'Sales' WHEN h.is_purchase_tax = 1 THEN 'Purchase' ELSE 'Not set' END"),
                    'status' => self::active(),
                ],
            ],
        ];
    }

    private static function sales(): array
    {
        $product = ['products as p', 'p.id', 'i.product_id'];
        $customer = ['customers as cu', 'cu.id', 'h.customer_id'];
        $cashier = ['users as u', 'u.id', 'h.user_id'];
        $notCancelled = "(h.status IS NULL OR h.status NOT IN ('CANCELLED', 'CANCELED'))";
        $item = self::layout('Item', 'i.product_id', 'MAX(p.name)', ['code' => ['label' => 'Code', 'expr' => 'MAX(p.code)']], [$product]);
        $bill = self::layout('Bill', 'h.id', 'MAX(h.invoice_no)', [
            'bill_date' => ['label' => 'Date', 'expr' => 'MAX(h.sale_date)'],
            'customer' => ['label' => 'Customer', 'expr' => 'MAX(cu.name)'],
            'counter' => ['label' => 'Counter', 'expr' => 'MAX(h.counter_name)'],
        ], [$customer], 'Bill no', 'key');
        $saleLayouts = [
            ...self::dated('h.sale_date'),
            'bill' => $bill,
            'gst_rate' => self::layout('GST rate', 'COALESCE(i.tax_rate, 0)', header: 'GST %'),
            'hsn' => self::layout('HSN', 'p.hsn_code', joins: [$product]),
            'item' => $item,
            'barcode' => self::layout('Barcode', 'i.barcode_id', 'MAX(bc.barcode)', ['item' => ['label' => 'Item', 'expr' => 'MAX(p.name)']], [['barcodes as bc', 'bc.id', 'i.barcode_id'], $product]),
            'brand' => self::layout('Brand', 'p.brand_id', 'MAX(b.name)', joins: [$product, ['brands as b', 'b.id', 'p.brand_id']]),
            'category' => self::layout('Category', 'p.category_id', 'MAX(c.name)', joins: [$product, ['categories as c', 'c.id', 'p.category_id']]),
            'section' => self::layout('Section', 'p.section', joins: [$product]),
            'size' => self::layout('Size', 'v.size_id', 'MAX(z.name)', joins: [['product_variants as v', 'v.id', 'i.variant_id'], ['sizes as z', 'z.id', 'v.size_id']]),
            'salesman' => self::layout('Salesman', 'i.sales_man_id', 'MAX(i.sales_man_name)'),
            'cashier' => self::layout('Cashier', 'h.user_id', 'MAX(u.name)', joins: [$cashier]),
            'counter' => self::layout('Counter', 'h.counter_name'),
            'payment_mode' => self::layout('Payment mode', 'h.payment_mode'),
            'customer' => self::layout('Customer', 'h.customer_id', 'MAX(cu.name)', ['mobile' => ['label' => 'Mobile', 'expr' => 'MAX(cu.phone)']], [$customer]),
            // Only bills that carry a discount (on the bill or on a line).
            'discount_bills' => [...$bill, 'title' => 'Discount bills',
                'where' => '(h.discount_amount > 0 OR h.id IN (SELECT pos_sale_id FROM pos_sale_items WHERE discount > 0))'],
            'location' => self::location('h.store_id'),
        ];
        $saleBase = [
            'module' => 'sales', 'table' => 'pos_sales as h', 'stores' => ['h.store_id'], 'date' => 'h.sale_date',
            'joins' => [['pos_sale_items as i', 'i.pos_sale_id', 'h.id', 'inner']],
            'where' => [$notCancelled],
            'layouts' => $saleLayouts,
        ];
        // PosSaleItem.subtotal is the full line total (after discount, with tax); taxable = subtotal - tax.
        $taxable = 'SUM(i.subtotal - COALESCE(i.tax_amount, 0))';
        // The bill line's own cost when it recorded one, else the variant's, else the product's.
        $cost = 'SUM(i.quantity * COALESCE(NULLIF(i.cost_price, 0), NULLIF(mv.cost_price, 0), mp.cost_price, 0))';
        // Bills still owed money: what /settlements/unpaid-bills lists as "open".
        $open = "h.status NOT IN ('CANCELLED', 'CANCELED', 'RETURNED', 'PAID', 'SETTLED') AND (h.status = 'UNSETTLED' OR h.grand_total > COALESCE(h.paid_amount, 0)"
            .' + COALESCE((SELECT total_refund FROM pos_returns WHERE pos_returns.id = h.applied_pos_return_id), 0))';
        $billMeasures = [
            'bills' => ['label' => 'Bills', 'expr' => 'COUNT(*)', 'type' => 'count'],
            'amount' => ['label' => 'Bill amount', 'expr' => 'SUM(h.grand_total)', 'type' => 'money'],
            'paid' => ['label' => 'Paid', 'expr' => 'SUM(COALESCE(h.paid_amount, 0))', 'type' => 'money'],
            'balance' => ['label' => 'Balance', 'expr' => 'SUM(h.grand_total - COALESCE(h.paid_amount, 0))', 'type' => 'money'],
        ];
        $billLayouts = [
            'bill' => self::layout('Bill', 'h.id', 'MAX(h.invoice_no)', [
                'bill_date' => ['label' => 'Date', 'expr' => 'MAX(h.sale_date)'],
                'customer' => ['label' => 'Customer', 'expr' => 'MAX(cu.name)'],
            ], [$customer], 'Bill no', 'key'),
            ...self::dated('h.sale_date'),
            'customer' => self::layout('Customer', 'h.customer_id', 'MAX(cu.name)', ['mobile' => ['label' => 'Mobile', 'expr' => 'MAX(cu.phone)']], [$customer]),
            'counter' => self::layout('Counter', 'h.counter_name'),
            'cashier' => self::layout('Cashier', 'h.user_id', 'MAX(u.name)', joins: [$cashier]),
            'location' => self::location('h.store_id'),
        ];
        $saleBills = fn (string $where) => [
            'module' => 'sales', 'table' => 'pos_sales as h', 'stores' => ['h.store_id'], 'date' => 'h.sale_date',
            'where' => [$where], 'measures' => $billMeasures, 'layouts' => $billLayouts,
        ];
        $stock = self::warehouse()['stock'];

        return [
            'sale_lines' => [...$saleBase, 'measures' => [
                'bills' => ['label' => 'Bills', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                'qty' => ['label' => 'Qty', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                'net' => ['label' => 'Net sales', 'expr' => 'SUM(i.subtotal)', 'type' => 'money'],
                'discount' => ['label' => 'Discount', 'expr' => 'SUM(i.discount)', 'type' => 'money'],
                'tax' => ['label' => 'Tax', 'expr' => 'SUM(i.tax_amount)', 'type' => 'money'],
            ]],
            'sale_margin' => [...$saleBase, 'joins' => [...$saleBase['joins'], ['products as mp', 'mp.id', 'i.product_id'], ['product_variants as mv', 'mv.id', 'i.variant_id']], 'measures' => [
                'bills' => ['label' => 'Bills', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                'qty' => ['label' => 'Qty', 'expr' => 'SUM(i.quantity)', 'type' => 'qty'],
                'sales' => ['label' => 'Sales (before tax)', 'expr' => $taxable, 'type' => 'money'],
                'cost' => ['label' => 'Cost', 'expr' => $cost, 'type' => 'money'],
                'margin' => ['label' => 'Margin', 'expr' => "$taxable - $cost", 'type' => 'money'],
                'margin_pct' => ['label' => 'Margin %', 'expr' => "100.0 * ($taxable - $cost) / NULLIF($taxable, 0)", 'type' => 'percent'],
            ]],
            // CGST/SGST split evenly on intra-state bills; an IGST bill's whole tax is IGST.
            'sale_tax' => [...$saleBase, 'measures' => [
                'bills' => ['label' => 'Bills', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                'taxable' => ['label' => 'Taxable value', 'expr' => $taxable, 'type' => 'money'],
                'cgst' => ['label' => 'CGST', 'expr' => 'SUM(CASE WHEN COALESCE(h.igst, 0) = 1 THEN 0 ELSE COALESCE(i.tax_amount, 0) / 2 END)', 'type' => 'money'],
                'sgst' => ['label' => 'SGST', 'expr' => 'SUM(CASE WHEN COALESCE(h.igst, 0) = 1 THEN 0 ELSE COALESCE(i.tax_amount, 0) / 2 END)', 'type' => 'money'],
                'igst' => ['label' => 'IGST', 'expr' => 'SUM(CASE WHEN COALESCE(h.igst, 0) = 1 THEN COALESCE(i.tax_amount, 0) ELSE 0 END)', 'type' => 'money'],
                'tax' => ['label' => 'Total tax', 'expr' => 'SUM(COALESCE(i.tax_amount, 0))', 'type' => 'money'],
                'total' => ['label' => 'Invoice value', 'expr' => 'SUM(i.subtotal)', 'type' => 'money'],
            ]],
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
                    ...self::dated('h.sale_date'),
                    'cashier' => self::layout('Cashier', 'h.user_id', 'MAX(u.name)', joins: [$cashier]),
                    'counter' => self::layout('Counter', 'h.counter_name'),
                    'customer' => self::layout('Customer', 'h.customer_id', 'MAX(cu.name)', joins: [$customer]),
                    'location' => self::location('h.store_id'),
                ],
            ],
            'unsettled_bills' => $saleBills($open),
            'credit_bills' => $saleBills("$open AND (h.is_credit = 1 OR h.status = 'CREDIT')"),
            'cancelled_bills' => $saleBills("h.status IN ('CANCELLED', 'CANCELED')"),
            'approvals' => [
                'module' => 'sales', 'table' => 'sales_approvals as h', 'stores' => ['h.store_id'], 'date' => 'h.approval_date',
                'where' => ["LOWER(h.status) = 'approved'"],
                'measures' => [
                    'approvals' => ['label' => 'Approvals', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'amount' => ['label' => 'Amount', 'expr' => 'SUM(COALESCE(h.total_amount, 0))', 'type' => 'money'],
                ],
                'layouts' => [
                    'customer' => self::layout('Customer', 'COALESCE(cu.name, h.customer_name)', extras: ['mobile' => ['label' => 'Mobile', 'expr' => 'MAX(h.customer_mobile)']], joins: [$customer]),
                    ...self::dated('h.approval_date'),
                    'approved_by' => self::layout('Approved by', 'h.decided_by', 'MAX(u.name)', joins: [['users as u', 'u.id', 'h.decided_by']]),
                    'location' => self::location('h.store_id'),
                ],
            ],
            'customer_orders' => [
                'module' => 'sales', 'table' => 'customer_orders as h', 'stores' => ['h.store_id'], 'date' => 'h.order_date',
                'measures' => [
                    'orders' => ['label' => 'Orders', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'amount' => ['label' => 'Order value', 'expr' => 'SUM(COALESCE(h.total_amount, 0))', 'type' => 'money'],
                    'advance' => ['label' => 'Advance', 'expr' => 'SUM(COALESCE(h.advance_paid, 0))', 'type' => 'money'],
                    'balance' => ['label' => 'Balance due', 'expr' => 'SUM(COALESCE(h.balance_due, 0))', 'type' => 'money'],
                ],
                'layouts' => [
                    'status' => self::layout('Status', 'h.status'),
                    'delivery_date' => self::layout('Delivery date', '{date:h.delivery_date}', order: 'key'),
                    'customer' => self::layout('Customer', 'h.customer_id', 'MAX(cu.name)', ['mobile' => ['label' => 'Mobile', 'expr' => 'MAX(cu.phone)']], [$customer]),
                    'salesman' => self::layout('Salesman', 'h.salesman_id', 'MAX(em.name)', joins: [['employees as em', 'em.id', 'h.salesman_id']]),
                    ...self::dated('h.order_date'),
                    'location' => self::location('h.store_id'),
                ],
            ],
            'settlements' => [
                'module' => 'sales', 'table' => 'settlements as h', 'stores' => ['h.store_id'], 'date' => 'h.settlement_date',
                'measures' => [
                    'settlements' => ['label' => 'Settlements', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'sales' => ['label' => 'Sales', 'expr' => 'SUM(COALESCE(h.total_sales, 0))', 'type' => 'money'],
                    'cash' => ['label' => 'Cash', 'expr' => 'SUM(COALESCE(h.cash_total, 0))', 'type' => 'money'],
                    'card' => ['label' => 'Card', 'expr' => 'SUM(COALESCE(h.card_total, 0))', 'type' => 'money'],
                    'upi' => ['label' => 'UPI', 'expr' => 'SUM(COALESCE(h.upi_total, 0))', 'type' => 'money'],
                    'credit' => ['label' => 'Credit', 'expr' => 'SUM(COALESCE(h.credit_total, 0))', 'type' => 'money'],
                ],
                'layouts' => [
                    ...self::dated('h.settlement_date'),
                    'settled_by' => self::layout('Settled by', 'h.settled_by', 'MAX(u.name)', joins: [['users as u', 'u.id', 'h.settled_by']]),
                    'location' => self::location('h.store_id'),
                ],
            ],
            'cash_sessions' => [
                'module' => 'sales', 'table' => 'cash_register_sessions as h', 'stores' => ['h.store_id'], 'date' => 'h.opened_at',
                'measures' => [
                    'sessions' => ['label' => 'Sessions', 'expr' => 'COUNT(*)', 'type' => 'count'],
                    'opening' => ['label' => 'Opening', 'expr' => 'SUM(COALESCE(h.opening_cash, 0))', 'type' => 'money'],
                    'closing' => ['label' => 'Closing', 'expr' => 'SUM(COALESCE(h.closing_cash, 0))', 'type' => 'money'],
                    'expected' => ['label' => 'Expected', 'expr' => 'SUM(COALESCE(h.expected_cash, 0))', 'type' => 'money'],
                    'difference' => ['label' => 'Difference', 'expr' => 'SUM(COALESCE(h.difference, 0))', 'type' => 'money'],
                ],
                'layouts' => [
                    'cashier' => self::layout('Cashier', 'h.user_id', 'MAX(u.name)', joins: [$cashier]),
                    ...self::dated('h.opened_at'),
                    'status' => self::layout('Status', 'h.status'),
                    'location' => self::location('h.store_id'),
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
                    ...self::dated('h.return_date'),
                    'customer' => self::layout('Customer', 'h.customer_id', 'MAX(cu.name)', joins: [$customer]),
                    'bill' => self::layout('Return', 'h.id', 'MAX(h.return_no)', ['return_date' => ['label' => 'Date', 'expr' => 'MAX(h.return_date)']], header: 'Return no', order: 'key'),
                    'reason' => self::layout('Reason', 'h.return_reason_name'),
                    'item' => $item,
                    'location' => self::location('h.store_id'),
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
                    ...self::dated('h.invoice_date'),
                    'invoice' => self::layout('Invoice', 'h.id', 'MAX(h.invoice_no)', ['invoice_date' => ['label' => 'Date', 'expr' => 'MAX(h.invoice_date)'], 'dealer' => ['label' => 'Dealer', 'expr' => 'MAX(cu.name)']], [$customer], 'Invoice no', 'key'),
                    'item' => $item,
                    'location' => self::location('h.store_id'),
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
                    ...self::dated('h.return_date'),
                    'location' => self::location('h.store_id'),
                ],
            ],
            // The Sales Reports stock tabs summarise the same stock as Warehouse Reports.
            'store_stock' => [...$stock, 'module' => 'sales'],
            'stock_audits' => [
                'module' => 'sales', 'table' => 'physical_stocks as h', 'stores' => ['h.store_id'], 'date' => 'h.audit_date',
                'joins' => [['physical_stock_items as i', 'i.physical_stock_id', 'h.id', 'inner']],
                'measures' => [
                    'audits' => ['label' => 'Audits', 'expr' => 'COUNT(DISTINCT h.id)', 'type' => 'count'],
                    'system' => ['label' => 'System qty', 'expr' => 'SUM(COALESCE(i.system_qty, 0))', 'type' => 'qty'],
                    'counted' => ['label' => 'Counted qty', 'expr' => 'SUM(COALESCE(i.counted_qty, 0))', 'type' => 'qty'],
                    'difference' => ['label' => 'Difference', 'expr' => 'SUM(COALESCE(i.difference_qty, 0))', 'type' => 'qty'],
                ],
                'layouts' => [
                    'audit' => self::layout('Audit', 'h.id', 'MAX(h.audit_no)', ['audit_date' => ['label' => 'Date', 'expr' => 'MAX(h.audit_date)'], 'status' => ['label' => 'Status', 'expr' => 'MAX(h.status)']], header: 'Audit no', order: 'key'),
                    'status' => self::layout('Status', 'h.status'),
                    ...self::dated('h.audit_date'),
                    'item' => $item,
                ],
            ],
            'employees' => [
                'module' => 'sales', 'table' => 'employees as h', 'stores' => ['h.store_id'],
                'measures' => [
                    'employees' => ['label' => 'Employees', 'expr' => 'COUNT(*)', 'type' => 'count'],
                ],
                'layouts' => [
                    'department' => self::layout('Department', 'h.department_id', 'MAX(d.name)', joins: [['hr_departments as d', 'd.id', 'h.department_id']]),
                    'designation' => self::layout('Designation', 'h.designation_id', 'MAX(dg.name)', joins: [['hr_designations as dg', 'dg.id', 'h.designation_id']]),
                    'status' => self::active(),
                    'joining_month' => self::layout('Joining month', '{month:h.joining_date}', order: 'key'),
                ],
            ],
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
                    'status' => self::active(),
                    'birth_month' => self::layout('Birth month', '{mon:h.date_of_birth}', order: 'key', labels: self::MONTH_NAMES),
                    'anniversary_month' => self::layout('Anniversary month', '{mon:h.marriage_date}', order: 'key', labels: self::MONTH_NAMES),
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
