<?php
defined('BASEPATH') or exit('No direct script access allowed');

class Reports extends CI_Controller
{

 public function __construct()
{
    helper(['url', 'form', 'language']);
    
    $this->session = session();
    $this->db = \Config\Database::connect();
    $this->builder = $this->db;

    // Load user
    $userId = $this->session->get('user_id');
    $this->user = $userId ? (new \App\Models\UserModel())->find($userId) : false;

    // Load setting
    $this->setting = (new \App\Models\SettingModel())->find(1);

    // Set language
    $lang = $this->session->get('lang') ?? 'english';
    service('language')->setLocale($lang);
}




public function searchByBaseCode()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $productId = $request->getPost('barcodee');

    $query = $db->query("
        SELECT 
            sale_items.name, 
            sale_items.qt, 
            sale_items.subtotal, 
            sale_items.date, 
            sale_items.sale_id, 
            products.code 
        FROM sale_items 
        INNER JOIN products ON products.id = sale_items.product_id 
        WHERE sale_items.product_id = ? 
        ORDER BY sale_items.id DESC
    ", [$productId]);

    $results = $query->getResult();

    return view('reports/search_by_barcode_table', [
        'results' => $results
    ]);
}





   public function getCustomerCollection()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $salesmanId = $request->getPost('sssSelect');
    $start = $request->getPost('start');
    $end = $request->getPost('end');

    $storeId = session('store');
    $startFormatted = date("Y-m-d", strtotime($start));
    $endFormatted = date("Y-m-d", strtotime($end));

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => $storeId])->getRowArray();
    $decimals = $settings['decimals'];

    // Get payment entries
    $query = $db->table('payements')
        ->where('date >=', $startFormatted)
        ->where('date <=', $endFormatted);

    if (!empty($salesmanId)) {
        $query->where('salesman', $salesmanId);
    }

    $query->orderBy('id', 'asc');
    $payments = $query->get()->getResult();

    $results = [];
    $totalPaid = 0;

    foreach ($payments as $sale) {
        $salesmanName = '----';
        if ($sale->salesman > 0) {
            $userModel = new \App\Models\UserModel();
            $salesman = $userModel->find($sale->salesman);
            $salesmanName = $salesman ? $salesman->firstname . ' ' . $salesman->lastname : '----';
        }

        $salesRow = $db->table('sales')->getWhere(['id' => $sale->sale_id])->getRowArray();

        $results[] = [
            'customer' => $salesRow['clientname'] ?? '',
            'salesman' => $salesmanName,
            'sale_id' => $sale->sale_id,
            'date' => $sale->date,
            'paid' => $sale->paid
        ];

        $totalPaid += $sale->paid;
    }

    return view('reports/customer_collection_report_table', [
        'results' => $results,
        'totalPaid' => $totalPaid,
        'companyName' => $settings['companyname'],
        'storeAddress' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $end,
        'decimals' => $decimals
    ]);
}



   public function viewPriceMore()
{
    $request = service('request');
    $data['prince_mas'] = $request->getPost('Range');
    return view('product/view_price_more', $data);
}

public function viewMrpMore()
{
    $request = service('request');
    $data['prince_mas'] = $request->getPost('Range');
    return view('product/view_mrp_more', $data);
}





 public function getCustomerReport()
{
    $request = service('request');
    $db = \Config\Database::connect();
    $session = session();

    $start       = $request->getPost('start');
    $end         = $request->getPost('end');
    $clientId    = $request->getPost('client_id');
    $paymentMode = $request->getPost('selectedValues') ?? [];

    $startDate = date('Y-m-d', strtotime($start));
    $endDate   = date('Y-m-d', strtotime($end));

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store    = $db->table('stores')->getWhere(['id' => $session->get('store')])->getRowArray();
    $storeId  = $session->get('store');
    $decimals = $settings['decimals'];
    $themeBlock = $settings['themblock'];
    $salesTable = ($themeBlock == 0) ? 'sales' : 'dsales';

    // Build base query
    $builder = $db->table($salesTable)
        ->select("$salesTable.*, $salesTable.id as ssid")
        ->join('registers', "$salesTable.register_id = registers.id")
        ->where('registers.store_id', $storeId)
        ->where("$salesTable.created_at >=", $startDate)
        ->where("$salesTable.created_at <=", $endDate);

    // Filter by client_id
    if ($clientId !== '') {
        $builder->where("$salesTable.client_id", $clientId);
    }

    $builder->orderBy("$salesTable.id", 'DESC');
    $salesRecords = $builder->get()->getResultObject();

    // Payment mode lookup
    $paymentModes = $db->table('payment_mode')->where('id !=', 1)->orderBy('id', 'asc')->get()->getResultArray();

    // Now pass everything to view
    return view('reports/customer_report_table', [
        'salesRecords' => $salesRecords,
        'settings'     => $settings,
        'store'        => $store,
        'start'        => $start,
        'end'          => $end,
        'paymentModes' => $paymentModes,
        'selectedModeIds' => $paymentMode,
        'decimals'     => $decimals,
        'themeBlock'   => $themeBlock
    ]);
}





 public function getCustomerCredit()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $clientId = $request->getPost('client_id');
    $salesmanId = $request->getPost('sssSelect');
    $start = $request->getPost('start');
    $end = $request->getPost('end');

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => session('store')])->getRowArray();
    $decimals = $settings['decimals'];
    $themeBlock = $settings['themblock'];
    $salesTable = $themeBlock == 0 ? 'sales' : 'dsales';

    $builder = $db->table($salesTable)->where('creddate >', 0)
        ->where('created_at >=', $start)
        ->where('created_at <=', $end);

    if (!empty($clientId)) {
        $builder->where('client_id', $clientId);
    }
    if (!empty($salesmanId)) {
        $builder->where('salesperson', $salesmanId);
    }

    $sales = $builder->orderBy('id', 'asc')->get()->getResult();

    // Load salesperson names
    $userModel = new \App\Models\UserModel();
    foreach ($sales as &$sale) {
        $sale->salesperson_name = $sale->salesperson > 0 
            ? ($userModel->find($sale->salesperson)->firstname ?? '') . ' ' . ($userModel->find($sale->salesperson)->lastname ?? '')
            : '----';
    }

    return view('reports/customer_credit_report_table', [
        'sales' => $sales,
        'settings' => $settings,
        'store' => $store,
        'start' => $start,
        'end' => $end,
        'decimals' => $decimals
    ]);
}





  public function getCustomerTaxReport()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $clientId = $request->getPost('client_id');
    $startpp = $request->getPost('start');
    $endpp = $request->getPost('end');

    $start = date("Y-m-d", strtotime($startpp));
    $end = date("Y-m-d", strtotime($endpp));

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => session('store')])->getRowArray();
    $themeBlock = $settings['themblock'];
    $decimals = $settings['decimals'];
    $salesTable = $themeBlock == 0 ? 'sales' : 'dsales';
    $saleItemsTable = $themeBlock == 0 ? 'sale_items' : 'dsale_items';

    if (empty($clientId)) {
        // Query all clients' grouped tax summary
        $query = $db->query("
            SELECT {$salesTable}.client_id, {$saleItemsTable}.tottax, SUM({$saleItemsTable}.subtotal2) as subtotal_sum
            FROM {$salesTable}
            JOIN {$saleItemsTable} ON {$salesTable}.id = {$saleItemsTable}.sale_id
            WHERE {$saleItemsTable}.date BETWEEN '$start' AND '$end'
            GROUP BY {$salesTable}.client_id, {$saleItemsTable}.tottax
        ");

        $dataRows = $query->getResultArray();

        $structured = [];
        $taxRates = [];

        foreach ($dataRows as $row) {
            $structured[$row['client_id']][$row['tottax']] = $row['subtotal_sum'];
            $taxRates[] = $row['tottax'];
        }

        $taxRates = array_unique($taxRates);
        sort($taxRates);

        // Get customer names
        $customers = [];
        if (!empty($structured)) {
            $custIds = array_keys($structured);
            $custData = $db->table('customers')->whereIn('id', $custIds)->get()->getResult();
            foreach ($custData as $c) {
                $customers[$c->id] = $c->name;
            }
        }

        return view('reports/customer_tax_report_table', [
            'structured' => $structured,
            'customers' => $customers,
            'taxRates' => $taxRates,
            'settings' => $settings,
            'store' => $store,
            'start' => $startpp,
            'end' => $endpp,
            'decimals' => $decimals
        ]);
    } else {
        // Client-specific tax breakdown
        $query = $db->query("
            SELECT {$saleItemsTable}.tottax, SUM({$saleItemsTable}.subtotal2) as subtotal_sum
            FROM {$salesTable}
            JOIN {$saleItemsTable} ON {$salesTable}.id = {$saleItemsTable}.sale_id
            WHERE {$salesTable}.client_id = '$clientId'
              AND {$saleItemsTable}.date BETWEEN '$start' AND '$end'
            GROUP BY {$saleItemsTable}.tottax
        ");

        $clientSales = $query->getResultArray();

        $client = $db->table('customers')->getWhere(['id' => $clientId])->getRow();
        $clientName = $client->name ?? 'Walk-in Customer';

        return view('reports/customer_tax_report_single_table', [
            'clientName' => $clientName,
            'sales' => $clientSales,
            'settings' => $settings,
            'store' => $store,
            'start' => $startpp,
            'end' => $endpp,
            'decimals' => $decimals
        ]);
    }
}


  public function getCustomerTaxGstrTb()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $month = $request->getPost('mmonth');
    $year = $request->getPost('yyear');
    $clientId = $request->getPost('client_id');
    $period = $year . '-' . str_pad($month, 2, '0', STR_PAD_LEFT);

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => session('store')])->getRowArray();
    $decimals = $settings['decimals'];
    $gstno = $settings['gstnoo'];
    $company = $settings['companyname'];

    $themeBlock = $settings['themblock'];
    $taxSummaryTable = ($themeBlock == 0) ? 'tax_summary' : 'dtax_summary';

    $taxSalesTotal = $db->query("SELECT SUM(taxamount) as total FROM $taxSummaryTable WHERE datedd LIKE '$period-%'")->getRowArray();
    $centralTax = $db->query("SELECT SUM(taxfrom) as ctax FROM $taxSummaryTable WHERE c_s_i = 1 AND datedd LIKE '$period-%'")->getRowArray();
    $integratedTax = $db->query("SELECT SUM(taxfrom) as itax FROM $taxSummaryTable WHERE c_s_i = 2 AND datedd LIKE '$period-%'")->getRowArray();

    $purchaseTax = $db->query("SELECT SUM(cgst) as cgst, SUM(sgst) as sgst FROM purchases WHERE date LIKE '$period-%'")->getRowArray();

    return view('reports/customer_gstr_3b_table', [
        'settings' => $settings,
        'store' => $store,
        'month' => $month,
        'year' => $year,
        'clientId' => $clientId,
        'decimals' => $decimals,
        'gstno' => $gstno,
        'company' => $company,
        'taxSalesTotal' => $taxSalesTotal['total'],
        'centralTax' => $centralTax['ctax'] ?? 0,
        'integratedTax' => $integratedTax['itax'] ?? 0,
        'cgst' => $purchaseTax['cgst'] ?? 0,
        'sgst' => $purchaseTax['sgst'] ?? 0
    ]);
}


public function getProductReport()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $productId = $request->getPost('product_id');
    $start = $request->getPost('start');
    $end = $request->getPost('end');

    $startDate = date("Y-m-d", strtotime($start));
    $endDate = date("Y-m-d", strtotime($end));

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => session('store')])->getRowArray();

    $decimals = $settings['decimals'];

    $saleItemsBuilder = $db->table('sale_items')
        ->where('date >=', $startDate)
        ->where('date <=', $endDate);

    if (!empty($productId)) {
        $saleItemsBuilder->where('product_id', $productId);
    }

    $saleItems = $saleItemsBuilder->orderBy('sale_id', 'DESC')->get()->getResult();

    // Append sale status for each item
    foreach ($saleItems as &$item) {
        $sale = $db->table('sales')->getWhere(['id' => $item->sale_id])->getRow();
        $item->sale_status = $sale->status ?? 0;

        switch ($item->sale_status) {
            case 3: $item->status_label = 'Cancel'; break;
            case 1: $item->status_label = 'Unpaid'; break;
            case 2: $item->status_label = 'Partially paid'; break;
            default: $item->status_label = 'Paid';
        }

        $item->tax = $item->subtotal - $item->subtotal2;
    }

    return view('reports/product_report_table', [
        'saleItems' => $saleItems,
        'settings' => $settings,
        'store' => $store,
        'start' => $start,
        'end' => $end,
        'decimals' => $decimals
    ]);
}



  public function getCategoryWiseSalesReport()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $categoryId = $request->getPost('product_id'); // actually refers to category ID
    $start = $request->getPost('start');
    $end = $request->getPost('end');

    $startDate = date("Y-m-d", strtotime($start));
    $endDate = date("Y-m-d", strtotime($end));
    $storeId = session('store');

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => $storeId])->getRowArray();
    $themeBlock = $settings['themblock'];

    $saleItemsTable = $themeBlock == 0 ? 'sale_items' : 'dsale_items';

    $builder = $db->table('products p')
        ->select("p.id as product_id, p.name as product_name, c.name as category_name, SUM(s.qt) as total_qt, SUM(CASE WHEN s.cancel_status=1 THEN s.qt ELSE 0 END) as cancelled_qt")
        ->join("$saleItemsTable s", 'p.id = s.product_id')
        ->join('categories c', 'p.category = c.id')
        ->where('s.store_irrdd', $storeId)
        ->where('s.date >=', $startDate)
        ->where('s.date <=', $endDate);

    if (!empty($categoryId)) {
        $builder->where('p.category', $categoryId);
    }

    $builder->groupBy('p.id, c.id');
    $builder->orderBy('p.name', 'asc');
    $items = $builder->get()->getResult();

    // Fetch return quantities
    foreach ($items as &$item) {
        $returnData = $db->table('retunn_items')
            ->select('SUM(sl_newqt) as returned_qty')
            ->where('prodd_ids', $item->product_id)
            ->where('to_datte >=', $startDate)
            ->where('to_datte <=', $endDate)
            ->get()->getRowArray();

        $item->returned_qty = intval($returnData['returned_qty']);
        $item->final_qt = intval($item->total_qt) - intval($item->cancelled_qt) - intval($item->returned_qty);
    }

    return view('reports/category_sales_report_table', [
        'items' => $items,
        'settings' => $settings,
        'store' => $store,
        'start' => $start,
        'end' => $end
    ]);
}



   public function getFastMovingReport()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $categoryId = $request->getPost('product_id');
    $start = $request->getPost('start');
    $end = $request->getPost('end');

    $startDate = date("Y-m-d", strtotime($start));
    $endDate = date("Y-m-d", strtotime($end));
    $storeId = session('store');

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => $storeId])->getRowArray();
    $decimals = $settings['decimals'];
    $saleItemsTable = $settings['themblock'] == 0 ? 'sale_items' : 'dsale_items';

    // Main product query
    $builder = $db->table('products p')
        ->select("p.id as product_id, p.name as product_name, c.name as category_name, SUM(s.qt) as total_qt, SUM(CASE WHEN s.cancel_status=1 THEN s.qt ELSE 0 END) as cancelled_qt")
        ->join("$saleItemsTable s", 'p.id = s.product_id')
        ->join('categories c', 'p.category = c.id')
        ->where('s.store_irrdd', $storeId)
        ->where('s.date >=', $startDate)
        ->where('s.date <=', $endDate);

    if (!empty($categoryId)) {
        $builder->where('p.category', $categoryId);
    }

    $builder->groupBy('p.id, c.id');
    $builder->orderBy('total_qt', 'DESC');
    $products = $builder->get()->getResult();

    // Fetch return quantities
    foreach ($products as &$product) {
        $return = $db->table('retunn_items')
            ->select('SUM(sl_newqt) as returned_qty')
            ->where('prodd_ids', $product->product_id)
            ->where('store_idsi', $storeId)
            ->where('to_datte >=', $startDate)
            ->where('to_datte <=', $endDate)
            ->get()->getRow();

        $product->returned_qty = (int)($return->returned_qty ?? 0);
        $product->final_qt = (int)$product->total_qt - (int)$product->cancelled_qt - $product->returned_qty;
    }

    return view('reports/fast_moving_report_table', [
        'products' => $products,
        'settings' => $settings,
        'store' => $store,
        'start' => $startDate,
        'end' => $endDate,
        'decimals' => $decimals,
    ]);
}







 public function getPurchaseReport()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $productId = $request->getPost('product_id') ?? '';
    $start = $request->getPost('start');
    $end = $request->getPost('end');

    $startDate = date("Y-m-d", strtotime($start));
    $endDate = date("Y-m-d", strtotime($end));

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $decimals = $settings['decimals'];

    $builder = $db->table('sale_items')->select('*, SUM(qt) as nnn')
        ->where('date >=', $startDate)
        ->where('date <=', $endDate)
        ->groupBy(['tottax', 'price']);

    if (!empty($productId)) {
        $builder->where('product_id', $productId);
    }

    $saleItems = $builder->get()->getResult();

    // Get unit for each product
    $productUnits = [];
    foreach ($saleItems as $item) {
        $product = $db->table('products')->select('unit')->getWhere(['id' => $item->product_id])->getRowArray();
        $productUnits[$item->product_id] = $product['unit'] ?? '';
    }

    return view('reports/purchase_report_table', [
        'saleItems' => $saleItems,
        'productUnits' => $productUnits,
        'settings' => $settings,
        'decimals' => $decimals,
        'start' => $startDate,
        'end' => $endDate
    ]);
}


   public function getProducttaxReport()
{
    $product_id = $this->request->getPost('product_id');
    $startpp = $this->request->getPost('start');
    $endpp = $this->request->getPost('end');
    $storeId = $this->request->getPost('Stores');

    $start = date("Y-m-d", strtotime($startpp));
    $end = date("Y-m-d", strtotime($endpp));

    $storeClause = ($storeId > 0) ? "store_irrdd='$storeId' AND " : "";

    $settings = $this->db->query("SELECT * FROM settings WHERE id=1")->getRowArray();
    $store = $this->db->query("SELECT * FROM stores WHERE id=" . session()->get('store'))->getRowArray();

    $saleTable = $settings['themblock'] == 0 ? 'sales' : 'dsales';
    $saleItemsTable = $settings['themblock'] == 0 ? 'sale_items' : 'dsale_items';

    $query = "SELECT * FROM $saleItemsTable WHERE $storeClause date BETWEEN '$start' AND '$end'";
    if (!empty($product_id)) {
        $query .= " AND product_id = '$product_id'";
    }
    $query .= " ORDER BY sale_id DESC";

    $saleItems = $this->db->query($query)->getResult();

    $data = [
        'saleItems'      => $saleItems,
        'store'          => $store,
        'settings'       => $settings,
        'start'          => $startpp,
        'end'            => $endpp,
        'saleTable'      => $saleTable,
        'ret_idd'        => $settings['themblock'],
    ];

    return view('reports/product_tax_report_table', $data);
}





  public function getSupplierTaxReport()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $product_id = $request->getPost('product_id');
    $innon      = $request->getPost('innon');
    $prrcc      = $request->getPost('prrcc');
    $start      = date("Y-m-d", strtotime($request->getPost('start')));
    $end        = date("Y-m-d", strtotime($request->getPost('end')));

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store    = $db->table('stores')->getWhere(['id' => session()->get('store')])->getRowArray();

    // Build query conditionally
    $query = $db->table('payment_suplls');
    if (!empty($innon)) {
        $query->where('invoicen', $innon);
    } elseif (!empty($prrcc)) {
        $query->where('purchaid', $prrcc);
    } elseif (empty($product_id)) {
        $query->where("datet >=", $start)->where("datet <=", $end);
    } else {
        $query->where('sup_id', $product_id)
              ->where("datet >=", $start)
              ->where("datet <=", $end);
    }

    $query->orderBy('purchaid');
    $payments = $query->get()->getResult();

    return view('reports/supplier_tax_report_table', [
        'payments'   => $payments,
        'settings'   => $settings,
        'store'      => $store,
        'start'      => $start,
        'end'        => $end,
        'decimals'   => $settings['decimals']
    ]);
}


  public function getPurchasedailyReport()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $storeId = session()->get('store');
    $startRaw = $request->getPost('Range');
    $endRaw = $request->getPost('Range1');
    $billType = $request->getPost('bill_type');

    $start = date("Y-m-d", strtotime($startRaw ?: date("Y-m-d")));
    $end = date("Y-m-d", strtotime($endRaw ?: date("Y-m-d")));

    $purchaseType = ($billType !== null && $billType != '') ? ($billType == 1 ? 0 : 1) : null;

    $builder = $db->table('purchases')->where('store_id', $storeId)->where("purdat >=", $start)->where("purdat <=", $end);

    if ($purchaseType !== null) {
        $builder->where('ppurchase_type', $purchaseType);
    }

    $purchases = $builder->orderBy('purdat', 'ASC')->get()->getResult();

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $storeInfo = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    return view('reports/purchase_daily_report_table', [
        'purchases' => $purchases,
        'settings'  => $settings,
        'store'     => $storeInfo,
        'start'     => $startRaw,
        'end'       => $endRaw
    ]);
}




  public function getPurchaseSummaryReport()
{
    $request = $this->request;

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');

    $storeId = session()->get('store');
    $settings = $this->db->query("SELECT * FROM settings WHERE id = 1")->getRowArray();
    $store = $this->db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getRowArray();

    $startDateFormatted = date("d-m-Y", strtotime($start));
    $endDateFormatted = date("d-m-Y", strtotime($end));

    $startDate = date("Y-m-d", strtotime($start));
    $endDate = date("Y-m-d", strtotime($end));

    $query = "
        SELECT COUNT(id) AS bills,
               SUM(betot) AS billamt,
               SUM(paiddd) AS baalll,
               SUM(cgst) AS cgg,
               SUM(sgst) AS sgg,
               SUM(discamt) AS dikct,
               SUM(total) AS netamtt,
               DATE_FORMAT(purdat, '%Y-%m-%d') AS DAY
        FROM purchases
        WHERE store_id = ? AND purdat BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(purdat, '%Y-%m-%d')
    ";

    $purchaseSummaries = $this->db->query($query, [$storeId, $startDate, $endDate])->getResult();

    $data = [
        'settings' => $settings,
        'store' => $store,
        'start' => $startDateFormatted,
        'end' => $endDateFormatted,
        'summaries' => $purchaseSummaries,
        'decimal' => $settings['decimals'],
    ];

    return view('reports/purchase_summary_report', $data);
}




  public function getPurchasedailyReportProduct()
{
    $start = $this->request->getPost('Range');
    $end   = $this->request->getPost('Range1');

    $storeId = session()->get('store');
    $setting = $this->db->table('settings')->where('id', 1)->get()->getRowArray();
    $store   = $this->db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startDate = ($start != 0 && $start != '') ? date("Y-m-d", strtotime($start)) : date("Y-m-d");
    $endDate   = ($end != 0 && $end != '') ? date("Y-m-d", strtotime($end)) : $startDate;

    $products = $this->db->query("
        SELECT * FROM purchase_items 
        WHERE store_idd = '$storeId' 
        AND ndate BETWEEN '$startDate' AND '$endDate' 
        ORDER BY ndate DESC
    ")->getResult();

    $data = [
        'setting'      => $setting,
        'store'        => $store,
        'start_display'=> date("d-m-Y", strtotime($startDate)),
        'end_display'  => date("d-m-Y", strtotime($endDate)),
        'products'     => $products,
    ];

    return view('reports/purchase_daily_product_report', $data);
}



 public function getpurchasetally()
{
    $start = $this->request->getPost('Range');
    $end = $this->request->getPost('Range1');

    $startpp = date("d-m-Y", strtotime($start));
    $endpp = date("d-m-Y", strtotime($end));

    $settings = $this->db->query("SELECT * FROM settings WHERE id=1")->getRowArray();
    $store = $this->db->query("SELECT * FROM stores WHERE id='" . session()->get('store') . "'")->getRowArray();

    if ($start == 0 || empty($start)) {
        $date = date("Y-m-d");
        $items = $this->db->query("SELECT * FROM purchase_items WHERE ndate BETWEEN '$date' AND '$date' ORDER BY ndate DESC")->getResult();
    } else {
        [$d, $m, $y] = explode('-', $start);
        $startFormatted = "$y-$m-$d";
        [$d, $m, $y] = explode('-', $end);
        $endFormatted = "$y-$m-$d";
        $items = $this->db->query("SELECT * FROM purchase_items WHERE ndate BETWEEN '$startFormatted' AND '$endFormatted' ORDER BY ndate DESC")->getResult();
    }

    return view('reports/purchase_tally_report_table', [
        'items' => $items,
        'settings' => $settings,
        'store' => $store,
        'start' => $startpp,
        'end' => $endpp,
    ]);
}


public function getpurchasetallybb()
{
    $start = $this->request->getPost('Range');
    $end = $this->request->getPost('Range1');

    $zstartpp = date("Y-m-d", strtotime($start));
    $zendpp = date("Y-m-d", strtotime($end));

    $builder = db_connect();
    $y1 = $builder->query("SELECT * FROM tallypurchase WHERE fromdatt <= '$zstartpp' AND enddatt >= '$zstartpp'")->getNumRows();
    $y2 = $builder->query("SELECT * FROM tallypurchase WHERE fromdatt <= '$zendpp' AND enddatt >= '$zendpp'")->getNumRows();
    $y3 = $builder->query("SELECT * FROM tallypurchase WHERE fromdatt >= '$zstartpp' AND enddatt <= '$zendpp'")->getNumRows();

    if ($y1 == 0 && $y2 == 0 && $y3 == 0) {
        $data['rrt'] = 1;
        $data['start'] = $start;
        $data['end'] = $end;

        $la32 = date("Y-m-d", strtotime($start));
        $laxg = date("Y-m-d", strtotime($end));

        $data['purchase_items'] = $builder->query("SELECT * FROM purchase_items WHERE ndate BETWEEN '$la32' AND '$laxg' ORDER BY ndate DESC")->getResult();

        $data['settings'] = $builder->query("SELECT * FROM settings WHERE id = 1")->getRowArray();
        $data['store'] = $builder->query("SELECT * FROM stores WHERE id = '" . session()->get('store') . "'")->getRowArray();

        return view('reports/purchase_tally_bb', $data);
    } else {
        echo '<input type="hidden" name="rrt" id="rrt" value="0" /> This Date range data already updated into tally, please refer log file for download... ';
    }
}



 // In app/Controllers/Reports.php or similar
public function purdownloadxl($xmml)
{
    $db = \Config\Database::connect();
    $builder = $db->table('tallypurchase');
    $tally = $builder->where('sii', $xmml)->get()->getRowArray();

    if ($tally) {
        $start = $tally['fromdatt'];
        $end = $tally['enddatt'];
        $tyyy = $tally['companyname'];

        $zstartpp = date("Y-m-d", strtotime($start));
        $zendpp = date("Y-m-d", strtotime($end));
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeId = session('store');
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $logoPath = base_url('files/Setting/' . $setting['logo']);

        $products = $db->table('purchase_items')
            ->where("ndate >=", $zstartpp)
            ->where("ndate <=", $zendpp)
            ->orderBy('ndate', 'DESC')
            ->get()
            ->getResult();

        $data = [
            'products' => $products,
            'start' => $start,
            'end' => $end,
            'setting' => $setting,
            'store' => $store,
            'logo' => $logoPath,
            'zstartpp' => $zstartpp,
            'zendpp' => $zendpp,
        ];

        $html = view('reports/purchase_excel_export', $data);
        $filename = $start . 'to' . $end . '.xls';

        header('Content-Type: application/vnd.ms-excel');
        header("Content-Disposition: attachment; filename=\"$filename\"");
        echo $html;
        exit;
    } else {
        return 'Data not found...';
    }
}
   


public function getRegisterReport()
{
    $store_id = $this->request->getPost('store_id');
    $start = date("Y-m-d", strtotime($this->request->getPost('start'))) . ' 00:00:00';
    $end = date("Y-m-d", strtotime($this->request->getPost('end'))) . ' 23:59:59';

    $startpp = date("d-m-Y", strtotime($start));
    $endpp = date("d-m-Y", strtotime($end));

    $db = \Config\Database::connect();
    $session = session();
    $user = $session->get('user');

    $registers = $db->table('registers')
        ->where('date >=', $start)
        ->where('date <=', $end);

    if ($store_id != 0) {
        $registers->where('store_id', $store_id);
    }

    $registerData = $registers->orderBy('date', 'ASC')->get()->getResult();

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();
    $paymentModes = $db->table('payment_mode')->orderBy('id', 'ASC')->get()->getResultArray();

    $reportData = [];

    foreach ($registerData as $reg) {
        $store = $db->table('stores')->where('id', $reg->store_id)->get()->getRowArray();
        $username = $db->table('users')->where('id', $reg->user_id)->get()->getRow('username');

        $row = [
            'opening_time' => $reg->date,
            'closing_time' => $reg->closed_at,
            'store_name' => $store['name'] ?? '',
            'opened_by' => $username ?? '',
            'cash_in_hand' => $reg->cash_inhand,
            'payments' => [],
            'return' => 0,
            'expense' => 0
        ];

        foreach ($paymentModes as $mode) {
            $payment = $db->table('registers_paymentmode')
                ->where(['reg_idd' => $reg->id, 'pay_m_id' => $mode['id']])
                ->get()->getRowArray();

            $amount = $payment['countedcash'] ?? 0;
            $row['payments'][$mode['name']] = $amount;
        }

        $row['return'] = $db->table('registers_ret_tot')
            ->where(['reg_idd' => $reg->id, 'pay_m_id' => 1])
            ->get()->getRow('countedcash') ?? 0;

        $row['expense'] = $db->table('registers_ret_tot')
            ->where(['reg_idd' => $reg->id, 'pay_m_id' => 3])
            ->get()->getRow('countedcash') ?? 0;

        $reportData[] = $row;
    }

    return view('reports/register_report_table', [
        'company' => $settings['companyname'],
        'address' => $storeInfo['adresse'] ?? '',
        'start' => $startpp,
        'end' => $endpp,
        'data' => $reportData,
        'paymentModes' => $paymentModes
    ]);
}


public function getRegisterReportstore()
{
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $this->request->getPost('store_id');
    $start = $this->request->getPost('start');
    $endd = $this->request->getPost('endd');
    $stx = $this->request->getPost('ckkk');

    $start = date("Y-m-d", strtotime($start));
    $endd = date("Y-m-d", strtotime($endd));

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    // Warehouse (store) filter
    if (!$start || $store_id == 0) {
        $warehouses = $db->table('warehouses')->orderBy('name', 'ASC')->get()->getResultArray();
    } else {
        $warehouses = $db->table('warehouses')->where('id', $store_id)->get()->getResultArray();
    }

    $reportData = [];

    foreach ($warehouses as $warehouse) {
        $products = $db->table('products')->orderBy('name', 'ASC')->get()->getResultArray();

        foreach ($products as $product) {
            $proId = $product['id'];
            $warId = $warehouse['id'];

            // Helper for stock calculations
            $sumQty = function ($type, $startDate = null, $endDate = null, $compare = 'between') use ($db, $proId, $warId) {
                $builder = $db->table('stock_transfer')->select('SUM(qty) AS total, SUM(totamt) AS total_amt')
                    ->where('pro_id', $proId)
                    ->where('tyoftrans', $type)
                    ->where('war_id', $warId);

                if ($compare === 'before') {
                    $builder->where('date <', $startDate);
                } elseif ($compare === 'upto') {
                    $builder->where('date <=', $endDate);
                } else {
                    $builder->where('date >=', $startDate)->where('date <=', $endDate);
                }

                return $builder->get()->getRowArray();
            };

            // Data for date range
            $data = [
                'warehouse_name' => $warehouse['name'],
                'product_name' => $product['name'],
                'opening' => $sumQty(1, $start, $endd, 'before')['total'] + $sumQty(5, $start, $endd, 'before')['total']
                    + $sumQty(4, $start, $endd, 'before')['total']
                    - $sumQty(3, $start, $endd, 'before')['total']
                    - $sumQty(6, $start, $endd, 'before')['total']
                    - $sumQty(2, $start, $endd, 'before')['total'],
                'purchase_qty' => $sumQty(1, $start, $endd)['total'],
                'sales_qty' => $sumQty(2, $start, $endd)['total'],
                'return_qty' => $sumQty(4, $start, $endd)['total'],
                'adjustment_qty' => $sumQty(3, $start, $endd)['total'],
                'dispatch_qty' => $sumQty(6, $start, $endd)['total'],
                'in_qty' => $sumQty(9, $start, $endd)['total'],
                'out_qty' => $sumQty(8, $start, $endd)['total'],
                'closing' => $sumQty(1, $start, $endd, 'upto')['total'] + $sumQty(5, $start, $endd, 'upto')['total']
                    + $sumQty(4, $start, $endd, 'upto')['total']
                    - $sumQty(3, $start, $endd, 'upto')['total']
                    - $sumQty(6, $start, $endd, 'upto')['total']
                    - $sumQty(2, $start, $endd, 'upto')['total']
                    + ($sumQty(9, $start, $endd)['total'] - $sumQty(8, $start, $endd)['total']),
                'purchase_value' => $sumQty(1, $start, $endd)['total_amt'],
                'sales_value' => $sumQty(2, $start, $endd)['total_amt']
            ];

            $reportData[] = $data;
        }
    }

    return view('reports/store_register_report_table', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $endd,
        'show_dispatch' => $stx === 'true',
        'reportData' => $reportData
    ]);
}


public function cclrtstore()
{
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $this->request->getPost('store_id');
    $start = date("Y-m-d", strtotime($this->request->getPost('start')));
    $endd = date("Y-m-d", strtotime($this->request->getPost('endd')));
    $stx = $this->request->getPost('ckkk'); // Product ID filter

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $levelsQuery = $db->table('levels')->orderBy('name', 'ASC');
    if ($store_id > 0) {
        $levelsQuery->where('warehousr', $store_id);
    }
    $levels = $levelsQuery->get()->getResultArray();

    $reportData = [];

    foreach ($levels as $level) {
        $warehouseId = $level['warehousr'];
        $rackCount = (int)$level['valueper'];
        $levelName = $level['name'];

        $warehouse = $db->table('warehouses')->where('id', $warehouseId)->get()->getRowArray();

        for ($rack = 1; $rack <= $rackCount; $rack++) {
            $products = $stx > 0
                ? $db->table('products')->where('id', $stx)->get()->getResultArray()
                : $db->table('products')->orderBy('name', 'ASC')->get()->getResultArray();

            foreach ($products as $product) {
                $proId = $product['id'];

                // Define helper for sum query
                $sumQty = function ($type, $compare = 'between') use ($db, $proId, $warehouseId, $levelName, $rack, $start, $endd) {
                    $builder = $db->table('stock_transfer')->select('SUM(qty) AS qty, SUM(totamt) AS amt')
                        ->where('pro_id', $proId)
                        ->where('tyoftrans', $type)
                        ->where('war_id', $warehouseId)
                        ->where('llvel', $levelName)
                        ->where('rrack', $rack);

                    if ($compare === 'before') {
                        $builder->where('date <', $start);
                    } elseif ($compare === 'upto') {
                        $builder->where('date <=', $endd);
                    } else {
                        $builder->where('date >=', $start)->where('date <=', $endd);
                    }

                    return $builder->get()->getRowArray();
                };

                // Values in range
                $purchase = $sumQty(1);
                $purchaseDispatch = $sumQty(5);
                $sales = $sumQty(2);
                $returns = $sumQty(4);
                $adjustments = $sumQty(3);
                $dispatch = $sumQty(6);
                $in = $sumQty(9);
                $out = $sumQty(8);

                // Opening
                $openPurchase = $sumQty(1, 'before')['qty'] + $sumQty(5, 'before')['qty'];
                $openSales = $sumQty(2, 'before')['qty'];
                $openReturns = $sumQty(4, 'before')['qty'];
                $openAdjust = $sumQty(3, 'before')['qty'];
                $openDispatch = $sumQty(6, 'before')['qty'];

                $opening = $openPurchase + $openReturns - $openSales - $openDispatch - $openAdjust;

                // Closing
                $closePurchase = $sumQty(1, 'upto')['qty'] + $sumQty(5, 'upto')['qty'];
                $closeSales = $sumQty(2, 'upto')['qty'];
                $closeReturns = $sumQty(4, 'upto')['qty'];
                $closeAdjust = $sumQty(3, 'upto')['qty'];
                $closeDispatch = $sumQty(6, 'upto')['qty'];
                $inQty = $in['qty'] ?? 0;
                $outQty = $out['qty'] ?? 0;

                $closing = $closePurchase + $closeReturns - $closeSales - $closeDispatch - $closeAdjust + ($inQty - $outQty);

                if ($opening > 0 || $closing > 0) {
                    $reportData[] = [
                        'warehouse' => $warehouse['name'] ?? '',
                        'product' => $product['name'],
                        'level' => $levelName,
                        'rack' => $rack,
                        'opening' => $opening,
                        'purchase' => $purchase['qty'] ?? 0,
                        'sales' => $sales['qty'] ?? 0,
                        'return' => $returns['qty'] ?? 0,
                        'adjustment' => $adjustments['qty'] ?? 0,
                        'in' => $inQty,
                        'out' => $outQty,
                        'closing' => $closing,
                        'purchase_val' => $purchase['amt'] ?? 0,
                        'sales_val' => $sales['amt'] ?? 0,
                    ];
                }
            }
        }
    }

    return view('reports/level_stock_report_table', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $endd,
        'reportData' => $reportData
    ]);
}



public function fastmovingstore()
{
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $this->request->getPost('store_id');
    $start = date("Y-m-d", strtotime($this->request->getPost('start')));
    $endd = date("Y-m-d", strtotime($this->request->getPost('endd')));

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    // Fast moving query
    $builder = $db->table('sale_items si')
        ->select('p.id AS product_id, p.name AS product_name, p.category, SUM(si.qt) AS sold_qty')
        ->join('products p', 'p.id = si.product_id')
        ->join('categories c', 'p.category = c.id');

    if ($store_id > 0) {
        $builder->where('p.category', $store_id);
    }

    $builder->where('si.date >=', $start)
            ->where('si.date <=', $endd)
            ->groupBy('p.id')
            ->orderBy('sold_qty', 'DESC');

    $results = $builder->get()->getResultArray();

    // Map category names
    $categories = [];
    $catData = $db->table('categories')->get()->getResultArray();
    foreach ($catData as $cat) {
        $categories[$cat['id']] = $cat['name'];
    }

    return view('reports/fast_moving_stock_report', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $endd,
        'results' => $results,
        'categories' => $categories,
    ]);
}



public function getrackwar()
{
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $this->request->getPost('store_id');
    $stx = $this->request->getPost('ckkk');

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $builder = $db->table('purchase_items')->where('avlqty >', 0);

    if ($store_id > 0) {
        $builder->where('warehouse_id', $store_id);
    }

    if ($stx > 0) {
        $builder->where('product_id', $stx);
    }

    $builder->orderBy('product_id', 'ASC');
    $items = $builder->get()->getResultArray();

    // Prefetch related products and warehouses
    $productIds = array_column($items, 'product_id');
    $warehouseIds = array_column($items, 'warehouse_id');

    $products = [];
    if (!empty($productIds)) {
        $proData = $db->table('products')->whereIn('id', $productIds)->get()->getResultArray();
        foreach ($proData as $prod) {
            $products[$prod['id']] = $prod['name'];
        }
    }

    $warehouses = [];
    if (!empty($warehouseIds)) {
        $whData = $db->table('warehouses')->whereIn('id', $warehouseIds)->get()->getResultArray();
        foreach ($whData as $wh) {
            $warehouses[$wh['id']] = $wh['name'];
        }
    }

    return view('reports/rackwise_stock_report', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'items' => $items,
        'products' => $products,
        'warehouses' => $warehouses,
    ]);
}




 public function unsoldrackwar()
{
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $this->request->getPost('store_id');
    $prod_id = $this->request->getPost('ckkk');

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $builder = $db->table('purchase_items');

    if ($prod_id > 0) {
        $builder->where('product_id', $prod_id);
    }

    if ($store_id == 1) {
        $builder->orderBy('avlqty', 'DESC');
    } else {
        $builder->orderBy('ndate', 'ASC');
    }

    $items = $builder->get()->getResultArray();

    // Get related product and warehouse names
    $productIds = array_column($items, 'product_id');
    $warehouseIds = array_column($items, 'warehouse_id');

    $products = [];
    if (!empty($productIds)) {
        $productData = $db->table('products')->whereIn('id', $productIds)->get()->getResultArray();
        foreach ($productData as $product) {
            $products[$product['id']] = $product['name'];
        }
    }

    $warehouses = [];
    if (!empty($warehouseIds)) {
        $warehouseData = $db->table('warehouses')->whereIn('id', $warehouseIds)->get()->getResultArray();
        foreach ($warehouseData as $warehouse) {
            $warehouses[$warehouse['id']] = $warehouse['name'];
        }
    }

    return view('reports/unsold_rack_report', [
        'company'     => $settings['companyname'],
        'address'     => $store['adresse'] ?? '',
        'items'       => $items,
        'products'    => $products,
        'warehouses'  => $warehouses,
    ]);
}




public function getsalestallybb()
{
    $db = \Config\Database::connect();
    $session = session();

    $start = $this->request->getPost('Range');
    $end = $this->request->getPost('Range1');
    $zstartpp = date("Y-m-d", strtotime($start));
    $zendpp = date("Y-m-d", strtotime($end));

    // Check overlap with existing tallysales
    $y1 = $db->table('tallysales')->where('fromdatt <=', $zstartpp)->where('enddatt >=', $zstartpp)->countAllResults();
    $y2 = $db->table('tallysales')->where('fromdatt <=', $zendpp)->where('enddatt >=', $zendpp)->countAllResults();
    $y3 = $db->table('tallysales')->where('fromdatt >=', $zstartpp)->where('enddatt <=', $zendpp)->countAllResults();

    if ($y1 == 0 && $y2 == 0 && $y3 == 0) {
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        // Parse date formats
        if (!$start) {
            $today = date("Y-m-d");
            $sales = $db->table('sale_items')->where('date', $today)->orderBy('date', 'DESC')->get()->getResult();
        } else {
            $from = date("Y-m-d", strtotime($start));
            $to = date("Y-m-d", strtotime($end));
            $sales = $db->table('sale_items')->where("date >=", $from)->where("date <=", $to)->orderBy('date', 'DESC')->get()->getResult();
        }

        // Preload related data
        $productIds = array_column($sales, 'product_id');
        $saleIds = array_column($sales, 'sale_id');
        $supplierIds = array_column($sales, 'supplier');

        $products = $db->table('products')->whereIn('id', $productIds)->get()->getResultArray();
        $salesData = $db->table('sales')->whereIn('id', $saleIds)->get()->getResultArray();
        $suppliers = $db->table('suppliers')->whereIn('id', $supplierIds)->get()->getResultArray();

        $productMap = array_column($products, null, 'id');
        $saleMap = array_column($salesData, null, 'id');
        $supplierMap = array_column($suppliers, null, 'id');

        return view('reports/sales_tally_bb_report', [
            'sales' => $sales,
            'productMap' => $productMap,
            'saleMap' => $saleMap,
            'supplierMap' => $supplierMap,
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $startpp,
            'end' => $endpp,
        ]);
    } else {
        echo '<input type="hidden" name="rrt" id="rrt" value="0" /> This Date range data already updated into tally, please refer to the log file for download...';
    }
}



public function seldownloadxl($xmml)
{
    $db = \Config\Database::connect();
    $session = session();

    $tally = $db->table('tallysales')->where('sii', $xmml)->get()->getRowArray();

    if (!$tally) {
        echo 'Data not found...';
        return;
    }

    $start = $tally['fromdatt'];
    $end = $tally['enddatt'];

    $startYMD = date("Y-m-d", strtotime($start));
    $endYMD = date("Y-m-d", strtotime($end));

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $saleItems = $db->table('sale_items')
        ->where('date >=', $startYMD)
        ->where('date <=', $endYMD)
        ->orderBy('date', 'DESC')
        ->get()->getResult();

    $productIds = array_column($saleItems, 'product_id');
    $supplierIds = array_column($saleItems, 'supplier');
    $saleIds = array_column($saleItems, 'sale_id');

    $products = array_column(
        $db->table('products')->whereIn('id', $productIds)->get()->getResultArray(),
        null, 'id'
    );

    $suppliers = array_column(
        $db->table('suppliers')->whereIn('id', $supplierIds)->get()->getResultArray(),
        null, 'id'
    );

    $sales = array_column(
        $db->table('sales')->whereIn('id', $saleIds)->get()->getResultArray(),
        null, 'id'
    );

    $html = view('reports/sales_tally_bb_export', [
        'sales' => $saleItems,
        'productMap' => $products,
        'saleMap' => $sales,
        'supplierMap' => $suppliers,
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $end,
    ]);

    $filename = 'SalesReport_' . $startYMD . '_to_' . $endYMD . '.xls';

    header("Content-Type: application/vnd.ms-excel");
    header("Content-Disposition: attachment; filename=\"$filename\"");
    echo $html;
    exit;
}






public function getRegrtstoreall()
{
    $db = \Config\Database::connect();
    $session = session();

    $start = $this->request->getPost('start');
    $endd = $this->request->getPost('endd');
    $stx = $this->request->getPost('ckkk');
    $limittt = $this->request->getPost('limittt');
    $stores_id = $this->request->getPost('storesSelect');

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();
    $logoPath = base_url('files/Setting/' . $settings['logo']);

    $startpp = date("d-m-Y", strtotime($start));
    $endpp = date("d-m-Y", strtotime($endd));

    $products = $db->table('products')
        ->select('id, name, price')
        ->orderBy('name', 'asc')
        ->limit(250, (int) $limittt)
        ->get()
        ->getResultArray();

    $data = [
        'products' => $products,
        'start' => $start,
        'end' => $endd,
        'storeId' => $stores_id,
        'settings' => $settings,
        'storeInfo' => $storeInfo,
        'startFormatted' => $startpp,
        'endFormatted' => $endpp
    ];

    return view('reports/closing_stock_report', $data);
}




public function wargetRegrtstoreall()
{
    $db = \Config\Database::connect();
    $session = session();

    $start = $this->request->getPost('start');
    $endd = $this->request->getPost('endd');
    $stores_id = $this->request->getPost('storesSelect');

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $startpp = date("d-m-Y", strtotime($start));
    $endpp = date("d-m-Y", strtotime($endd));

    $products = $db->table('products')->orderBy('name', 'asc')->get()->getResultArray();

    $data = [
        'start' => $start,
        'end' => $endd,
        'storeId' => $stores_id,
        'settings' => $settings,
        'storeInfo' => $storeInfo,
        'startFormatted' => $startpp,
        'endFormatted' => $endpp,
        'products' => $products
    ];

    return view('reports/warehouse_closing_stock_report', $data);
}




    public function getRegrtrools()
    {
        $roleName = $this->request->getPost('Range');

        $permissionRow = $this->db->table('permission_new')
            ->where('nname', $roleName)
            ->get()
            ->getRowArray();

        $setting = $this->db->table('settings')->where('id', 1)->get()->getRow();

        return view('roles/permissions_table', [
            'permissions' => $permissionRow,
            'setting'     => $setting
        ]);
    }



 public function delete_register($id)
{
    $db = \Config\Database::connect();

    // Delete Sale Items for each Sale of this Register
    $sales = $db->table('sales')
                ->where('register_id', $id)
                ->get()
                ->getResult();

    foreach ($sales as $sale) {
        $db->table('sale_items')
           ->where('sale_id', $sale->id)
           ->delete();
    }

    // Delete Sales
    $db->table('sales')
       ->where('register_id', $id)
       ->delete();

    // Delete Payments
    $db->table('payements')
       ->where('register_id', $id)
       ->delete();

    // Delete Register
    $db->table('registers')
       ->where('id', $id)
       ->delete();

    return redirect()->back()->with('message', 'Register and associated records deleted successfully.');
}


public function getYearStats($year)
{
    $db = \Config\Database::connect();

    // Monthly Sales Aggregation
    $monthlySalesSQL = "
        SELECT
            SUM(IF(month = 1, numRecords, 0)) AS january,
            SUM(IF(month = 1, totaltax, 0)) AS januarytax,
            SUM(IF(month = 1, totaldiscount, 0)) AS januarydisc,
            SUM(IF(month = 2, numRecords, 0)) AS feburary,
            SUM(IF(month = 2, totaltax, 0)) AS feburarytax,
            SUM(IF(month = 2, totaldiscount, 0)) AS feburarydisc,
            -- ... continue to month 12 ...
            SUM(numRecords) AS total,
            SUM(totaltax) AS totalstax,
            SUM(totaldiscount) AS totaldisc
        FROM (
            SELECT
                id,
                MONTH(created_at) AS month,
                ROUND(SUM(total)) AS numRecords,
                ROUND(SUM(taxamount)) AS totaltax,
                ROUND(SUM(discountamount)) AS totaldiscount
            FROM sales
            WHERE YEAR(created_at) = ?
            GROUP BY id, MONTH(created_at)
        ) AS SubTable1";

    $monthlySales = $db->query($monthlySalesSQL, [$year])->getRow();

    // Monthly Expenses Aggregation
    $monthlyExpenseSQL = "
        SELECT
            SUM(IF(month = 1, numRecords, 0)) AS january,
            SUM(IF(month = 2, numRecords, 0)) AS feburary,
            -- ... continue to month 12 ...
            SUM(numRecords) AS total
        FROM (
            SELECT
                id,
                MONTH(date) AS month,
                ROUND(SUM(amount)) AS numRecords
            FROM expences
            WHERE YEAR(date) = ?
            GROUP BY id, MONTH(date)
        ) AS SubTable1";

    $monthlyExpense = $db->query($monthlyExpenseSQL, [$year])->getRow();

    // Pass to view
    return view('dashboard/yearly_stats_table', [
        'monthly'     => $monthlySales,
        'monthlyExp'  => $monthlyExpense,
        'currency'    => $this->setting->currency ?? '৳'
    ]);
}


    /**
     * ****************** register functions ***************
     */
  public function registerDetails($id)
{
    $db = \Config\Database::connect();

    // Fetch register
    $register = $db->table('registers')->where('id', $id)->get()->getRow();

    if (!$register) {
        return 'Invalid register ID';
    }

    // Fetch users
    $user = $db->table('users')->where('id', $register->user_id)->get()->getRow();
    $user2 = $db->table('users')->where('id', $register->closed_by)->get()->getRow();

    $createdBy = $user ? $user->firstname . ' ' . $user->lastname : '-';
    $closedBy = $user2 ? $user2->firstname . ' ' . $user2->lastname : '-';

    $cashInHand = number_format((float)$register->cash_inhand, $this->setting->decimals, '.', '');

    // Payment mode details
    $paymentModes = $db->table('payment_mode')->orderBy('id')->get()->getResult();
    $payments = [];

    foreach ($paymentModes as $mode) {
        $row = $db->table('registers_paymentmode')
                  ->where(['reg_idd' => $id, 'pay_m_id' => $mode->id])
                  ->get()
                  ->getRowArray();

        $payments[] = [
            'name' => $mode->name,
            'expected' => number_format($row['expectedcash'] ?? 0, $this->setting->decimals, '.', ''),
            'counted' => number_format($row['countedcash'] ?? 0, $this->setting->decimals, '.', ''),
            'diff' => number_format($row['diffcash'] ?? 0, $this->setting->decimals, '.', '')
        ];
    }

    // Return payment totals
    $ret1 = $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 1])->get()->getRowArray();
    $ret2 = $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 2])->get()->getRowArray();
    $ret3 = $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 3])->get()->getRowArray();

    // Denominations
    $denominations = $db->table('currencydenomination')->orderBy('name', 'desc')->get()->getResult();
    $notes = [];
    $denoTotal = 0;

    foreach ($denominations as $deno) {
        $note = $db->table('registers_note_count')
                   ->where(['reg_idd' => $id, 'pay_m_id' => $deno->id])
                   ->get()
                   ->getRowArray();

        $counted = $note['countedcash'] ?? 0;
        $diff = $note['diffcash'] ?? 0;
        $notes[] = [
            'name' => $deno->name,
            'counted' => $counted,
            'diff' => number_format($diff, $this->setting->decimals, '.', '')
        ];
        $denoTotal += $diff;
    }

    return view('register/details', [
        'createdBy' => $createdBy,
        'closedBy' => $closedBy,
        'cashInHand' => $cashInHand,
        'currency' => $this->setting->currency,
        'decimals' => $this->setting->decimals,
        'payments' => $payments,
        'ret1' => $ret1,
        'ret2' => $ret2,
        'ret3' => $ret3,
        'notes' => $notes,
        'denoTotal' => number_format($denoTotal, $this->setting->decimals, '.', ''),
        'noteText' => $register->note
    ]);
}



public function getStockReport()
{
    $request = \Config\Services::request();
    $db = \Config\Database::connect();

    $store_id_raw = $request->getPost('stock_id');
    $id = substr($store_id_raw, 1);
    $stype = ($store_id_raw[0] == 'S') ? 'warehouse_id' : 'store_id';

    // Fetch all products
    $products = $db->table('products')->get()->getResult();

    $data = [];

    foreach ($products as $product) {
        if ($product->type == '0') {
            $stockRow = $db->table('stock')
                ->where($stype, $id)
                ->where('product_id', $product->id)
                ->get()
                ->getRow();

            $stockQty = $stockRow ? $stockRow->quantity : '-';
            $alertClass = ($stockRow && $stockQty < $product->alertqt) ? 'danger' : '';

            $data[] = [
                'name' => $product->name,
                'code' => $product->code,
                'quantity' => $stockQty,
                'alertClass' => $alertClass
            ];
        }
    }

    return view('reports/stock_report_table', ['items' => $data]);
}






public function getPurchasedealerReport()
{
    $request = \Config\Services::request();
    $db = \Config\Database::connect();
    $session = session();

    $start  = $request->getPost('Range');
    $end    = $request->getPost('Range1');
    $esuppr = $request->getPost('suppr');

    $storeId = $session->get('store');
    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $where = '';
    if ($settings['purchase_type'] != 2) {
        $where = " AND ppurchase_type = " . $settings['purchase_type'];
    }

    if (empty($start)) {
        $startDate = $endDate = date('Y-m-d');
    } else {
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));
    }

    $builder = $db->table('purchases');
    $builder->where("purdat BETWEEN '$startDate' AND '$endDate'");
    if (!empty($storeId)) {
        $builder->where('store_id', $storeId);
    }
    if (!empty($esuppr) && $esuppr > 0) {
        $builder->where('supplier_id', $esuppr);
    }
    if (!empty($where)) {
        $builder->where($where, null, false);
    }
    $builder->orderBy('purdat', 'asc');
    $purchases = $builder->get()->getResult();

    // Totals
    $summary = [
        'billamt' => 0,
        'tottax' => 0,
        'discc' => 0,
        'toott' => 0,
        'toott_return' => 0,
        'toott_ggg' => 0,
        'paidd' => 0
    ];

    $reportData = [];

    foreach ($purchases as $purchase) {
        $supplier = $db->table('suppliers')->where('id', $purchase->supplier_id)->get()->getRowArray();
        $retAmt = 0; // Placeholder, implement if needed
        $cgstSgst = $purchase->cgst + $purchase->sgst;

        $reportData[] = [
            'date' => date('d-m-Y', strtotime($purchase->purdat)),
            'supplier' => $supplier['name'] ?? '-',
            'bill_no' => $purchase->id,
            'invoice_no' => $purchase->invno,
            'betot' => $purchase->betot,
            'tax' => $cgstSgst,
            'disc' => $purchase->discamt,
            'total' => $purchase->total,
            'return' => $retAmt,
            'net' => $purchase->total - $retAmt,
            'paid' => $purchase->paiddd,
            'balance' => $purchase->total - $purchase->paiddd - $retAmt
        ];

        // Accumulate totals
        $summary['billamt'] += $purchase->betot;
        $summary['tottax'] += $cgstSgst;
        $summary['discc'] += $purchase->discamt;
        $summary['toott'] += $purchase->total;
        $summary['toott_return'] += $retAmt;
        $summary['toott_ggg'] += ($purchase->total - $retAmt);
        $summary['paidd'] += $purchase->paiddd;
    }

    $summary['balance'] = $summary['toott'] - $summary['paidd'];

    return view('reports/purchase_dealer_report', [
        'settings' => $settings,
        'store' => $store,
        'start' => date('d-m-Y', strtotime($startDate)),
        'end' => date('d-m-Y', strtotime($endDate)),
        'data' => $reportData,
        'summary' => $summary
    ]);
}




 public function getPurchaseMonthlyReport()
{
    $db = \Config\Database::connect();
    $request = \Config\Services::request();
    $session = session();

    $start = $request->getPost('Range');
    $end   = $request->getPost('Range1');

    $storeId = $session->get('store');
    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startDate = $start ? date('Y-m-d', strtotime(str_replace('/', '-', $start))) : date('Y-m-d');
    $endDate   = $end   ? date('Y-m-d', strtotime(str_replace('/', '-', $end)))   : $startDate;

    // Grouped Purchase Monthly Summary
    $purchases = $db->query("
        SELECT 
            COUNT(id) as bills,
            SUM(betot) as billamt,
            SUM(paiddd) as baalll,
            SUM(cgst) as cgg,
            SUM(sgst) as sgg,
            SUM(discamt) as dikct,
            SUM(total) as netamtt,
            DATE_FORMAT(purdat, '%Y-%m') AS month
        FROM purchases
        WHERE store_id = ? AND purdat BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(purdat, '%Y-%m')
    ", [$storeId, $startDate, $endDate])->getResult();

    $reportData = [];
    $summary = [
        'billamt' => 0, 'tottax' => 0, 'discc' => 0, 'toott' => 0, 'paidd' => 0, 'paidd_rrr' => 0
    ];

    foreach ($purchases as $purchase) {
        // Fetch return amount for the same month
        $returns = $db->query("
            SELECT SUM(total) AS retnetamtt
            FROM purchases_return
            WHERE store_id = ? AND purdat BETWEEN ? AND ?
            AND DATE_FORMAT(purdat, '%Y-%m') = ?
        ", [$storeId, $startDate, $endDate, $purchase->month])->getRow();

        $returnAmount = $returns->retnetamtt ?? 0;
        $taxTotal = $purchase->cgg + $purchase->sgg;
        $netAfterReturn = $purchase->netamtt - $returnAmount;
        $balance = $purchase->netamtt - $purchase->baalll - $returnAmount;

        $reportData[] = [
            'month' => $purchase->month,
            'bills' => $purchase->bills,
            'billamt' => $purchase->billamt,
            'tax' => $taxTotal,
            'disc' => $purchase->dikct,
            'netamtt' => $purchase->netamtt,
            'returnamt' => $returnAmount,
            'netafterreturn' => $netAfterReturn,
            'paid' => $purchase->baalll,
            'balance' => $balance
        ];

        // Accumulate summary
        $summary['billamt'] += $purchase->billamt;
        $summary['tottax']  += $taxTotal;
        $summary['discc']   += $purchase->dikct;
        $summary['toott']   += $purchase->netamtt;
        $summary['paidd']   += $purchase->baalll;
        $summary['paidd_rrr'] += $returnAmount;
    }

    return view('reports/purchase_monthly_report', [
        'settings' => $settings,
        'store' => $store,
        'start' => $startDate,
        'end' => $endDate,
        'data' => $reportData,
        'summary' => $summary
    ]);
}




public function salesReturnDailyReport()
{
    $db = \Config\Database::connect();
    $request = \Config\Services::request();
    $session = session();

    $start = $request->getPost('Range');
    $end   = $request->getPost('Range1');

    $storeId = $session->get('store');
    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $retType = $settings['themblock'];
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startDate = $start ? date('Y-m-d', strtotime(str_replace('/', '-', $start))) : date('Y-m-d');
    $endDate   = $end   ? date('Y-m-d', strtotime(str_replace('/', '-', $end)))   : $startDate;

    $builder = $db->table('returnss');
    $builder->where('storeid', $storeId);
    $builder->where('rsale_type', $retType);
    $builder->where('todate >=', $startDate);
    $builder->where('todate <=', $endDate);
    $builder->orderBy('todate', 'asc');

    // Only include retrn_amt_mtd = 1 if a date is selected
    if (!empty($start) && $start != '0') {
        $builder->where('retrn_amt_mtd', 1);
    }

    $returns = $builder->get()->getResult();

    $totalAmount = 0;
    $reportData = [];

    foreach ($returns as $row) {
        $storeInfo = $db->table('stores')->where('id', $row->storeid)->get()->getRowArray();
        $reportData[] = [
            'date' => date('d-m-Y', strtotime($row->todate)),
            'bill_no' => $row->re_id,
            'store' => $storeInfo['name'] ?? '-',
            'from_sale' => $row->re_sales_id,
            'to_sale' => $row->purcha_sales_id,
            'qty' => $row->iteems,
            'amount' => $row->tootal
        ];
        $totalAmount += $row->tootal;
    }

    return view('reports/sales_return_daily_report', [
        'settings' => $settings,
        'store' => $store,
        'start' => $startDate,
        'end' => $endDate,
        'data' => $reportData,
        'total' => $totalAmount
    ]);
}


public function getSalesSummaryReport()
{
    $db = \Config\Database::connect();
    $request = \Config\Services::request();
    $session = session();

    $start = $request->getPost('Range');
    $end   = $request->getPost('Range1');
    $storeId = $session->get('store');

    if (empty($start)) {
        return; // exit early if no date range
    }

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
    $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

    $query = $db->query("
        SELECT 
            COUNT(re_id) AS bills,
            SUM(tootal) AS billamt,
            SUM(iteems) AS iteemst,
            storeid,
            todate
        FROM returnss
        WHERE storeid = ? AND todate BETWEEN ? AND ?
        GROUP BY todate, storeid
        ORDER BY todate ASC
    ", [$storeId, $startDate, $endDate]);

    $results = $query->getResult();

    $reportData = [];
    $totalAmount = 0;

    foreach ($results as $row) {
        $storeName = $db->table('stores')->where('id', $row->storeid)->get()->getRowArray()['name'] ?? '-';
        $reportData[] = [
            'date' => date('d-m-Y', strtotime($row->todate)),
            'bills' => $row->bills,
            'store' => $storeName,
            'qty' => $row->iteemst,
            'amount' => $row->billamt
        ];
        $totalAmount += $row->billamt;
    }

    return view('reports/sales_return_summary_report', [
        'settings' => $settings,
        'store' => $store,
        'start' => $startDate,
        'end' => $endDate,
        'data' => $reportData,
        'total' => $totalAmount
    ]);
}



public function salesReturnMonthlyReport()
{
    $db = \Config\Database::connect();
    $request = \Config\Services::request();
    $session = session();

    $start = $request->getPost('Range');
    $end   = $request->getPost('Range1');
    $storeId = $session->get('store');

    if (empty($start)) {
        return; // Exit if no start date
    }

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
    $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

    $query = $db->query("
        SELECT 
            COUNT(re_id) AS bills,
            SUM(tootal) AS billamt,
            SUM(iteems) AS iteems,
            DATE_FORMAT(todate, '%Y-%m') AS month,
            storeid
        FROM returnss
        WHERE storeid = ? AND todate BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(todate, '%Y-%m'), storeid
        ORDER BY month ASC
    ", [$storeId, $startDate, $endDate]);

    $results = $query->getResult();

    $reportData = [];
    $totalAmount = 0;

    foreach ($results as $row) {
        $storeName = $db->table('stores')->where('id', $row->storeid)->get()->getRowArray()['name'] ?? '-';
        $reportData[] = [
            'month' => $row->month,
            'store' => $storeName,
            'bills' => $row->bills,
            'qty' => $row->iteems,
            'amount' => $row->billamt
        ];
        $totalAmount += $row->billamt;
    }

    return view('reports/sales_return_monthly_report', [
        'settings' => $settings,
        'store' => $store,
        'start' => $startDate,
        'end' => $endDate,
        'data' => $reportData,
        'total' => $totalAmount
    ]);
}

// Up conplete work 

  public function getsalesdailReport1()
    {
        $request = service('request');
        $session = session();
        $db = \Config\Database::connect();

        $start  = $request->getPost('Range');
        $end    = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeId = $session->get('store');
        $store   = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startFormatted = date('d-m-Y', strtotime($start));
        $endFormatted   = date('d-m-Y', strtotime($end));

        $startSQL = date('Y-m-d', strtotime($start));
        $endSQL   = date('Y-m-d', strtotime($end));

        if ($esuppr > 0) {
            $sales = $db->table('sales')
                ->where('client_id', $esuppr)
                ->where("created_at >=", $startSQL)
                ->where("created_at <=", $endSQL)
                ->orderBy('id', 'DESC')
                ->get()->getResult();

            $advanceRow = $db->table('payements_advance')
                ->selectSum('paid', 'advancee')
                ->where('cust_id', $esuppr)
                ->get()->getRowArray();
            $advance = $advanceRow['advancee'] ?? 0;
        } elseif ($esuppr === '') {
            $sales = $db->table('sales')
                ->where("created_at >=", $startSQL)
                ->where("created_at <=", $endSQL)
                ->orderBy('id', 'DESC')
                ->get()->getResult();
            $advance = 0;
        } else {
            $sales = $db->table('sales')
                ->where('client_id', 0)
                ->where("created_at >=", $startSQL)
                ->where("created_at <=", $endSQL)
                ->orderBy('id', 'DESC')
                ->get()->getResult();
            $advance = 0;
        }

        $data = [
            'sales'       => $sales,
            'settings'    => $settings,
            'store'       => $store,
            'start'       => $startFormatted,
            'end'         => $endFormatted,
            'advance'     => $advance,
            'decimals'    => $settings['decimals'] ?? 2,
        ];

        return view('reports/sales_daily_report', $data);
    }



 public function cashinhanddailyReport()
    {
        $request = service('request');
        $session = session();
        $db = \Config\Database::connect();

        $start = $request->getPost('Range');
        $dateFormatted = date('Y-m-d', strtotime(str_replace('-', '/', $start)));

        $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $ret_idd = $setting['themblock'];

        if ($ret_idd == 0) {
            $salesTable = 'sales';
            $returnsTable = 'returnss';
        } else {
            $salesTable = 'dsales';
            $returnsTable = 'returnss';
        }

        $salesData = $db->query("SELECT
                SUM(CASE WHEN status = 3 THEN total END) as cancelledamt,
                SUM(CASE WHEN total <= paid THEN total ELSE paid END) as totalpaid,
                SUM(
                    CASE 
                        WHEN status = 3 AND total > paid THEN paid
                        WHEN status = 3 AND total <= paid THEN total
                    END
                ) as totcancelled,
                SUM(total) as totalsales_amount
            FROM {$salesTable}
            WHERE created_at = ?", [$dateFormatted])->getRowArray();

        $returnsData = $db->query("SELECT
                SUM(CASE WHEN retun_amt_stas = 0 THEN tootal END) as amt_return,
                SUM(CASE WHEN retun_amt_stas = 1 THEN tootal END) as exchange_return
            FROM {$returnsTable}
            WHERE rsale_type = ? AND todate = ?", [$ret_idd, $dateFormatted])->getRowArray();

        $today_sales = $salesData['totalsales_amount'] ?? 0;
        $cancelledamt = $salesData['cancelledamt'] ?? 0;
        $totcancelled = $salesData['totcancelled'] ?? 0;
        $exchange_return = $returnsData['exchange_return'] ?? 0;
        $totalpaid = ($salesData['totalpaid'] ?? 0) - $exchange_return;
        $amt_return = $returnsData['amt_return'] ?? 0;

        $cash_in_hand = $totalpaid - $totcancelled - $amt_return;

        return view('reports/cash_in_hand_report', [
            'date' => $start,
            'today_sales' => $today_sales,
            'totalpaid' => $totalpaid,
            'cancelledamt' => $cancelledamt,
            'totcancelled' => $totcancelled,
            'exchange_return' => $exchange_return,
            'amt_return' => $amt_return,
            'cash_in_hand' => $cash_in_hand,
            'decimals' => $setting['decimals'] ?? 2,
        ]);
    }

 public function filter_total_rows()
{
    $db      = \Config\Database::connect();
    $session = session();

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $storeId  = $session->get('store');
    $store    = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $start       = $this->request->getPost('Range');
    $end         = $this->request->getPost('Range1');
    $esuppr      = $this->request->getPost('suppr');
    $pamode_id   = $this->request->getPost('selectedValues');

    $sales        = ($settings['themblock'] == 0) ? 'sales' : 'dsales';
    $sale_items   = ($settings['themblock'] == 0) ? 'sale_items' : 'dsale_items';
    $tax_summary  = ($settings['themblock'] == 0) ? 'tax_summary' : 'dtax_summary';

    $startDateFormatted = date('d-m-Y', strtotime($start));
    $endDateFormatted   = date('d-m-Y', strtotime($end));

    // Convert to Y-m-d format
    $from = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
    $to   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

    // Call the CI4 Sale model function to get the count
    $saleModel = new \App\Models\SaleModel();
    $total_sales_number = $saleModel->getFilteredData($sales, $esuppr, $from, $to, $sale_items);

    // Optional: paginate results logic
    $slot        = 10;
    $total_slot  = ceil($total_sales_number / $slot);
    $offset      = 0;
    $limit       = 0;
    $arr         = range(0, $total_sales_number);
    $chunks      = array_chunk($arr, $slot);

    return $this->response->setJSON(['number' => $total_sales_number]);
}


 public function productQuery($sales, $rtttfc, $esuppr, $la32, $laxg, $ssid = 0, $ret_idd = 0)
{
    $builder = $this->db->table($sales);
    $builder->select("{$sales}.*, {$sales}.id as ssid, {$sales}.status as ssstatus, customers.name as cname, stores.name as ssname");

    $builder->join('registers', "{$sales}.register_id = registers.id", 'left');
    $builder->join('customers', "{$sales}.client_id = customers.id", 'left');
    $builder->join('stores', "registers.store_id = stores.id", 'left');

    if ($esuppr > 0) {
        if (!empty($rtttfc)) {
            $builder->where($rtttfc);
        }

        $builder->where("{$sales}.client_id", $esuppr);
        $builder->where("{$sales}.created_at >=", $la32);
        $builder->where("{$sales}.created_at <=", $laxg);
        $builder->orderBy("{$sales}.id", 'DESC');
    } elseif ($esuppr === '') {
        $builder->select("SUM(tootal) AS return_total");
        $builder->join('returnss', "returnss.re_sales_id = {$sales}.id", 'left');

        if (!empty($rtttfc)) {
            $builder->where($rtttfc);
        }

        $builder->where("{$sales}.created_at >=", $la32);
        $builder->where("{$sales}.created_at <=", $laxg);
        // Uncomment these lines if needed
        // $builder->where('returnss.re_sales_id', $ssid);
        // $builder->where('returnss.rsale_type', $ret_idd);

        $builder->orderBy("{$sales}.id", 'DESC');
    } else {
        if (!empty($rtttfc)) {
            $builder->where($rtttfc);
        }

        $builder->where("{$sales}.client_id", 0);
        $builder->where("{$sales}.created_at >=", $la32);
        $builder->where("{$sales}.created_at <=", $laxg);
        $builder->orderBy("{$sales}.id", 'DESC');
    }

    return $builder->get(); // Returns a CI4 query object
}


 public function get_sales_report()
{
    $db       = \Config\Database::connect();
    $session  = session();
    $request  = $this->request;

    $offset      = $request->getPost('offset');
    $limit       = $request->getPost('limit');
    $start       = $request->getPost('Range');
    $end         = $request->getPost('Range1');
    $esuppr      = $request->getPost('suppr');
    $pamode_id   = $request->getPost('selectedValues');
    $storeParam  = $request->getPost('store');
    $rttt        = $request->getPost('StoresSelect');

    $settings    = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $storeInfo   = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $tax_summary = ($settings['themblock'] == 0) ? 'tax_summary' : 'dtax_summary';
    $sales       = ($settings['themblock'] == 0) ? 'sales' : 'dsales';
    $sale_items  = ($settings['themblock'] == 0) ? 'sale_items' : 'dsale_items';
    $ret_idd     = $settings['themblock'];

    // Date formatting
    $from = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
    $to   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

    // Filter clause
    $rtttfc = '';
    if ($rttt > 0) {
        $rtttfc = "registers.store_id = $rttt";
    } elseif (!empty($storeParam)) {
        $rtttfc = "registers.store_id = $storeParam";
    }

    // === Execute sales query
    $saleModel = new \App\Models\SaleModel(); // Assume you have SaleModel
    $query     = $saleModel->productQuery($sales, $rtttfc, $esuppr, $from, $to, 0, $ret_idd); // Replace if needed

    // === Initialize counters
    $tr = '';
    $count_rows = 0;
    $sub_total_amount = 0;
    $tax_total = 0;
    $discount_total = 0;
    $shiping_total = 0;
    $total_amount_ = 0;
    $cancel_total = 0;
    $exchange_total = 0;
    $return_total = 0;
    $grand_total_amount = 0;

    $decimals = $settings['decimals'];

    foreach ($query->getResultObject() as $prd) {
        $count_rows++;
        $oll = explode(' ', $prd->attime);
        $custt_namef = $prd->cname;

        $overal_tax = 0;
        $oltaxl = '';

        // Tax summary
        $taxes = $db->table($tax_summary)->where('salesid', $prd->ssid)->get();
        foreach ($taxes->getResultObject() as $tax) {
            $oltaxl .= $tax->taxname . '-' . number_format((float)$tax->taxfrom, $decimals, '.', '') . '<br>';
            $overal_tax += $tax->taxfrom;
        }

        // Discount calculations
        $sslalf = $prd->discountamount;
        $dixxss = $prd->discount_indujul + $prd->discountamount;

        // Sale status
        $return_ck = $db->table('returnss')
            ->where('re_sales_id', $prd->ssid)
            ->where('rsale_type', $ret_idd)
            ->get();

        if ($prd->ssstatus == 3) {
            $bil_ststy = "style=background:#e9c0c0;";
            $sstaus_w  = "<span class='cancel'>Cancel</span>";
        } elseif ($return_ck->getNumRows() > 0) {
            $bil_ststy = "style=background:#f86e50;";
            $sstaus_w  = "<span class='return'>Return</span>";
        } else {
            $bil_ststy = "";
            $sstaus_w  = "<span class='sales'>Sales</span>";
        }

        $cancel_amt = ($prd->ssstatus == 3) ? $prd->total : 0;

        // Exchange / return amount
        $billamtee = 0;
        $billamtrr = 0;
        if ($return_ck->getNumRows() > 0) {
            foreach ($return_ck->getResultObject() as $return_sal) {
                if ($return_sal->retrn_amt_mtd == 1) {
                    $billamtrr += $return_sal->sutott;
                } else {
                    $billamtee += $return_sal->sutott;
                    $sstaus_w = "<span class='exchange'>Exchange</span>";
                }
            }
        }

        // Totals aggregation
        $sub_total_amount  += $prd->subtotal;
        $tax_total         += $overal_tax;
        $discount_total    += $dixxss;
        $shiping_total     += $prd->disamtssh;
        $total_amount_     += $prd->total;
        $cancel_total      += $cancel_amt;
        $exchange_total    += $billamtee;
        $return_total      += $billamtrr;
        $grand_total_amount = $total_amount_ - ($cancel_total + $exchange_total + $return_total);

        // === Table row generation
        $tr .= '<tr ' . $bil_ststy . '>';
        $tr .= '<td>' . $prd->ssid . '</td>';
        $tr .= '<td>' . $prd->ssname . '</td>';
        $tr .= '<td>' . $custt_namef . '</td>';
        $tr .= '<td>' . date('d-m-Y', strtotime($oll[0])) . '</td>';
        $tr .= '<td>' . $prd->totalitems . '</td>';
        $tr .= '<td>' . number_format($prd->subtotal, $decimals, '.', '') . '</td>';
        $tr .= '<td>' . number_format($overal_tax, $decimals, '.', '') . '</td>';
        $tr .= '<td>' . $oltaxl . '</td>';
        $tr .= '<td>' . number_format($dixxss, $decimals, '.', '') . '</td>';
        $tr .= '<td>' . number_format($prd->disamtssh, $decimals, '.', '') . '</td>';
        $tr .= '<td>' . number_format($prd->total, $decimals, '.', '') . '</td>';
        $tr .= '<td>' . $sstaus_w . '</td>';
        $tr .= '<td>' . number_format($cancel_amt, $decimals, '.', '') . '</td>';
        $tr .= '<td>' . number_format($billamtee, $decimals, '.', '') . '</td>';
        $tr .= '<td>' . number_format($billamtrr, $decimals, '.', '') . '</td>';
        $tr .= '</tr>';
    }

    // Output as JSON
    return $this->response->setJSON([
        'tr' => $tr,
        'rows' => $count_rows,
        'sub_total_amount' => $sub_total_amount,
        'tax_total' => $tax_total,
        'discount_total' => $discount_total,
        'shiping_total' => $shiping_total,
        'total_amount_' => $total_amount_,
        'cancel_total' => $cancel_total,
        'exchange_total' => $exchange_total,
        'return_total' => $return_total,
        'grand_total_amount' => $grand_total_amount,
    ]);
}



 public function getsalesdailReportnew1()
    {
        $db       = Database::connect();
        $session  = session();
        $request  = $this->request;

        $start       = $request->getPost('Range');
        $end         = $request->getPost('Range1');
        $esuppr      = $request->getPost('suppr');
        $pamode_id   = $request->getPost('selectedValues') ?? [];
        $storeSelect = $request->getPost('StoresSelect');
        $storeInput  = $request->getPost('store');

        $settings  = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();
        $decimals  = $settings['decimals'] ?? 2;

        $sales        = ($settings['themblock'] == 0) ? 'sales' : 'dsales';
        $sale_items   = ($settings['themblock'] == 0) ? 'sale_items' : 'dsale_items';
        $tax_summary  = ($settings['themblock'] == 0) ? 'tax_summary' : 'dtax_summary';
        $ret_idd      = $settings['themblock'];

        $from = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
        $to   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

        $rtttfc = '';
        if ($storeSelect > 0) {
            $rtttfc = "registers.store_id = $storeSelect";
        } elseif (!empty($storeInput)) {
            $rtttfc = "registers.store_id = $storeInput";
        }

        $saleModel = new SaleModel();
        $salesData = $saleModel->fetchSalesDailyReport($sales, $sale_items, $tax_summary, $ret_idd, $from, $to, $esuppr, $pamode_id, $rtttfc);

        return view('reports/sales_daily_report', [
            'data' => $salesData,
            'settings' => $settings,
            'storeInfo' => $storeInfo,
            'pamode_id' => $pamode_id,
        ]);
    }



public function getsalesdailReportnew()
{
    $request = $this->request;

    $draw = $request->getPost('draw');
    $data = [];

    for ($i = 1; $i <= 10; $i++) {
        $row = [];
        for ($j = 1; $j <= 14; $j++) {
            $row[] = $i; // Simulate 14 identical numeric columns
        }
        $data[] = $row;
    }

    $output = [
        'draw' => intval($draw),
        'recordsTotal' => 10,
        'recordsFiltered' => 10,
        'data' => $data,
    ];

    return $this->response->setJSON($output);
}


public function getsalesdailReport()
{
    $request = $this->request;

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');
    $esuppr = $request->getPost('suppr');
    $pamode_id = $request->getPost('selectedValues');

    $db = \Config\Database::connect();
    $builder = $db->table('settings');
    $poql = $builder->where('id', 1)->get()->getRowArray();

    $storeId = session()->get('store');
    $poss = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startpp = date("d-m-Y", strtotime($start));
    $endpp = date("d-m-Y", strtotime($end));
    $companyLogo = base_url('files/Setting/' . $poql['logo']);

    $sales = $poql['themblock'] == 0 ? 'sales' : 'dsales';
    $sale_items = $poql['themblock'] == 0 ? 'sale_items' : 'dsale_items';
    $tax_summary = $poql['themblock'] == 0 ? 'tax_summary' : 'dtax_summary';
    $ret_idd = $poql['themblock'];

    $rttt = $request->getPost('StoresSelect');
    $storeCondition = '';
    if ($request->getPost('store')) {
        $storeCondition = "registers.store_id=" . $request->getPost('store') . " AND ";
    } elseif ($rttt > 0) {
        $storeCondition = "registers.store_id=" . $rttt . " AND ";
    }

    $from = date('Y-m-d', strtotime(str_replace('-', '/', $start)));
    $to = date('Y-m-d', strtotime(str_replace('-', '/', $end)));

    if ($esuppr > 0) {
        $query = "
            SELECT $sales.*, $sales.id as ssid, $sales.status as ssstatus, customers.name as cname, stores.name as ssname
            FROM $sales
            LEFT JOIN registers ON $sales.register_id = registers.id
            LEFT JOIN customers ON $sales.client_id = customers.id
            LEFT JOIN stores ON registers.store_id = stores.id
            WHERE {$storeCondition}client_id = '$esuppr' AND $sales.created_at BETWEEN '$from' AND '$to'
            ORDER BY $sales.id DESC
        ";
    } elseif ($esuppr === '') {
        $query = "
            SELECT $sales.*, $sales.id as ssid, $sales.status as ssstatus, customers.name as cname, stores.name as ssname
            FROM $sales
            LEFT JOIN registers ON $sales.register_id = registers.id
            LEFT JOIN customers ON $sales.client_id = customers.id
            LEFT JOIN stores ON registers.store_id = stores.id
            WHERE {$storeCondition}$sales.created_at BETWEEN '$from' AND '$to'
            ORDER BY $sales.id DESC
        ";
    } else {
        $query = "
            SELECT $sales.*, $sales.id as ssid, $sales.status as ssstatus, customers.name as cname, stores.name as ssname
            FROM $sales
            LEFT JOIN registers ON $sales.register_id = registers.id
            LEFT JOIN customers ON $sales.client_id = customers.id
            LEFT JOIN stores ON registers.store_id = stores.id
            WHERE {$storeCondition}client_id = 0 AND $sales.created_at BETWEEN '$from' AND '$to'
            ORDER BY $sales.id DESC
        ";
    }

    $products = $db->query($query)->getResult();
    $payment_modes = $db->table('payment_mode')->where('id !=', 1)->orderBy('id', 'ASC')->get()->getResultArray();

    return view('reports/sales_daily_report', [
        'products' => $products,
        'company' => $poql['companyname'],
        'address' => $poss['adresse'] ?? '',
        'start' => $startpp,
        'end' => $endpp,
        'logo' => $companyLogo,
        'ret_idd' => $ret_idd,
        'tax_summary' => $tax_summary,
        'sale_items' => $sale_items,
        'pamode_id' => $pamode_id,
        'payment_modes' => $payment_modes,
        'setting' => $poql, // for decimal precision
    ]);
}


 public function getprossReport()
{
    $request = $this->request;
    $db = \Config\Database::connect();
    $session = session();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');
    $productId = $request->getPost('suppr');

    if (empty($start)) {
        return;
    }

    // Convert dates
    [$d, $m, $y] = explode('-', $start);
    $from = "$y-$m-$d";
    [$d2, $m2, $y2] = explode('-', $end);
    $to = "$y2-$m2-$d2";

    // Settings & Store info
    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $storeId = $session->get('store');
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    // Base query
    $builder = $db->table('sale_items');
    $builder->select('*');
    $builder->where("date BETWEEN '$from' AND '$to'");
    if (is_numeric($productId) && $productId > 0) {
        $builder->where('product_id', $productId);
    }
    $builder->orderBy('id', 'DESC');
    $saleItems = $builder->get()->getResult();

    // Prepare data
    $records = [];
    foreach ($saleItems as $item) {
        $sale = $db->table('sales')->where('id', $item->sale_id)->get()->getRow();
        $product = $db->table('products')->where('id', $item->product_id)->get()->getRow();

        $hsn = $product->hsn ?? '';
        $billNo = $sale->yyear . sprintf('%05d', $item->sale_id);
        $date = date('d-m-Y', strtotime($item->date));
        $qt = $item->qt;
        $rate = number_format((float)$item->price, $settings['decimals'], '.', '');
        $discount = number_format((float)$item->dis_amt, $settings['decimals'], '.', '');
        $total = number_format((float)$item->subtotal, $settings['decimals'], '.', '');

        $records[] = [
            'bill' => $billNo,
            'hsn' => $hsn,
            'date' => $date,
            'qt' => $qt,
            'rate' => $rate,
            'discount' => $discount,
            'total' => $total,
        ];
    }

    return view('reports/sales_hsn_report', [
        'company' => $settings['companyname'] ?? '',
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $end,
        'records' => $records,
    ]);
}

public function getprossdReport()
{
    $request = \Config\Services::request();
    $db = \Config\Database::connect();
    $session = session();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');
    $esuppr = $request->getPost('suppr');

    if (empty($start)) return;

    $storeId = $session->get('store');
    $poql = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $poss = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $company = $poql['companyname'] ?? '';
    $logo = base_url('files/Setting/' . $poql['logo']);
    $address = $poss['adresse'] ?? '';

    $startDate = date("Y-m-d", strtotime(str_replace('-', '/', $start)));
    $endDate = date("Y-m-d", strtotime(str_replace('-', '/', $end)));

    $builder = $db->table('sale_items')
        ->select('*, SUM(qt) as qqt, SUM(subtotal) as ssubtotal, SUM(cgst) as ccgst, SUM(sgst) as ssgst, SUM(dis_amt) as ddis_amt, COUNT(*) as bills');

    if (!empty($esuppr)) {
        $builder->where('product_id', $esuppr);
    }

    $builder->where("`date` BETWEEN '$startDate' AND '$endDate'", null, false);

    if (!empty($esuppr)) {
        $builder->groupBy(['date', 'product_id']);
    } else {
        $builder->groupBy('product_id');
    }

    $prducts = $builder->get()->getResult();

    $data = [
        'reportTitle' => "HSN Sales Summary Reports from " . date("d-m-Y", strtotime($startDate)) . " Till " . date("d-m-Y", strtotime($endDate)),
        'company'     => $company,
        'address'     => $address,
        'products'    => $prducts,
        'setting'     => $poql
    ];

    return view('reports/sales_hsn_summary_report', $data);
}


public function getprossmReport()
{
    $request = service('request');
    $session = session();
    $db = \Config\Database::connect();

    $start  = $request->getPost('Range');
    $end    = $request->getPost('Range1');
    $esuppr = $request->getPost('suppr');

    if (empty($start)) {
        return;
    }

    $startDate = date("Y-m-d", strtotime(str_replace('-', '/', $start)));
    $endDate = date("Y-m-d", strtotime(str_replace('-', '/', $end)));

    $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $storeId = $session->get('store');
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();
    $storeAddress = $store['adresse'] ?? '';
    $companyLogo = base_url('files/Setting/' . $setting['logo']);

    if ($esuppr > 0) {
        $builder = $db->table('sale_items');
        $builder->select("*, SUM(qt) as qqt, SUM(subtotal) as ssubtotal, SUM(cgst) as ccgst, SUM(sgst) as ssgst, SUM(dis_amt) as ddis_amt, COUNT(*) as bills");
        $builder->where('product_id', $esuppr);
        $builder->where("date BETWEEN '{$startDate}' AND '{$endDate}'", null, false);
        $builder->groupBy(["DATE_FORMAT(date, '%Y%m')", 'product_id']);
        $prducts = $builder->get()->getResult();
    } else {
        $builder = $db->table('sale_items');
        $builder->select("*, SUM(qt) as qqt, SUM(subtotal) as ssubtotal, SUM(cgst) as ccgst, SUM(sgst) as ssgst, SUM(dis_amt) as ddis_amt, COUNT(*) as bills");
        $builder->where("date BETWEEN '{$startDate}' AND '{$endDate}'", null, false);
        $builder->groupBy(["DATE_FORMAT(date, '%Y%m')", 'product_id']);
        $prducts = $builder->get()->getResult();
    }

    $reportRows = [];
    $billamt = $tottax = $tottaxs = $tottaxi = $discc = $toott = $paidd = 0;
    $cashr = $coupr = $carddr = $cpointr = 0;

    foreach ($prducts as $prd) {
        $sale = $db->table('sales')->where('id', $prd->sale_id)->get()->getRowArray();
        $tyui = date('Y-m', strtotime($prd->date));
        $subItems = $db->table('sale_items')
            ->where('product_id', $prd->product_id)
            ->where("date BETWEEN '{$startDate}' AND '{$endDate}'", null, false)
            ->like('date', $tyui)
            ->get()->getResultArray();

        $csub2 = $ssub2 = $isub2 = 0;
        foreach ($subItems as $item) {
            $csub2 += ($item['subtotal2'] * intval($item['cgst'])) / 100;
            $ssub2 += ($item['subtotal2'] * intval($item['sgst'])) / 100;
            $isub2 += ($item['subtotal2'] * intval($item['igstt'])) / 100;
        }

        $cash = $coup = $cardd = $cpoint = 0;
        switch ($prd->paidmethod) {
            case 0: $cash = $prd->total; break;
            case 1: $cardd = $prd->total; break;
            case 2: $coup = $prd->total; break;
            default: $cpoint = $prd->total; break;
        }

        $product = $db->table('products')->where('id', $prd->product_id)->get()->getRowArray();

        $reportRows[] = [
            'bills' => $prd->bills,
            'hsn' => $product['hsn'] ?? '',
            'month' => date('m-Y', strtotime($prd->date)),
            'qty' => $prd->qqt,
            'price' => $prd->price,
            'discount' => $prd->ddis_amt,
            'total' => $prd->ssubtotal
        ];

        $billamt += $prd->qqt;
        $tottax += $csub2;
        $tottaxs += $ssub2;
        $tottaxi += $isub2;
        $discc += $prd->ddis_amt;
        $toott += $prd->price;
        $paidd += $prd->ssubtotal;
        $cashr += $cash;
        $coupr += $coup;
        $carddr += $cardd;
        $cpointr += $cpoint;
    }

    return view('reports/prossm_report', [
        'company' => $setting['companyname'],
        'address' => $storeAddress,
        'logo' => $companyLogo,
        'start' => $start,
        'end' => $end,
        'rows' => $reportRows,
        'billamt' => $billamt,
        'discc' => $discc,
        'paidd' => $paidd,
        'decimals' => $setting['decimals']
    ]);
}




public function gettotalsalsReport()
{
    $db = \Config\Database::connect();
    $request = service('request');
    $session = session();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');
    $esuppr = $request->getPost('suppr');
    $storeSelect = $request->getPost('StoresSelect');

    if (empty($start)) return;

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $sales = $settings['themblock'] == 0 ? 'sales' : 'dsales';
    $ret_idd = $settings['themblock'];

    $storeId = $session->get('store');
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
    $endDate = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

    $where = [];
    if ($storeSelect) {
        $where['registers.store_id'] = $storeSelect;
    }

    if ($esuppr > 0) {
        $where["$sales.client_id"] = $esuppr;
    } elseif ($esuppr === '0') {
        $where["$sales.client_id"] = 0;
    }

    $builder = $db->table($sales);
    $builder->select("
        $sales.id as ssid,
        DATE($sales.created_at) as created_date,
        COUNT(*) as tbils,
        SUM(totalitems) as noofitem,
        SUM(subtotal) as toot,
        SUM(CASE WHEN paidmethod=0 THEN paid ELSE 0 END) as cashh,
        SUM(CASE WHEN paidmethod=1 THEN paid ELSE 0 END) as cardd,
        SUM(CASE WHEN $sales.status=3 THEN total ELSE 0 END) as total_can,
        SUM(CASE WHEN paidmethod=10 THEN paid ELSE 0 END) as coupp,
        SUM(CASE WHEN paidmethod=6 THEN paid ELSE 0 END) as ppnt,
        SUM(taxamount) as cgst,
        SUM(sgsttaxamt) as sgst,
        SUM(discountamount) as disct,
        SUM(paid) as ttot
    ");
    $builder->join('registers', "$sales.register_id = registers.id");
    $builder->where($where);
    $builder->where("$sales.created_at >=", $startDate);
    $builder->where("$sales.created_at <=", $endDate);
    $builder->groupBy('created_date');
    $salesData = $builder->get()->getResult();

    $reportRows = [];
    $subTotal = $totalCancel = $totalReturn = $netTotal = 0;

    foreach ($salesData as $row) {
        $taxCalc = $db->table('sale_items')
            ->select('subtotal2, cgst, sgst, igstt')
            ->where('date', $row->created_date)
            ->get()->getResultArray();

        $cgstTotal = $sgstTotal = $igstTotal = 0;
        foreach ($taxCalc as $item) {
            $cgstTotal += ($item['subtotal2'] * $item['cgst']) / 100;
            $sgstTotal += ($item['subtotal2'] * $item['sgst']) / 100;
            $igstTotal += ($item['subtotal2'] * $item['igstt']) / 100;
        }

        $return = $db->table('returnss')
            ->selectSum('tootal', 'rretunn')
            ->where('todate', $row->created_date)
            ->where('rsale_type', $ret_idd)
            ->get()->getRow();

        $returnTotal = $return->rretunn ?? 0;
        $totalReturn += $returnTotal;
        $subTotal += $row->toot;
        $totalCancel += $row->total_can;

        $reportRows[] = [
            'bills' => $row->tbils,
            'date' => date('d-m-Y', strtotime($row->created_date)),
            'items' => $row->noofitem,
            'amount' => $row->toot
        ];
    }

    $netTotal = $subTotal - $totalCancel - $totalReturn;

    return view('reports/totalsales_report', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $end,
        'rows' => $reportRows,
        'subTotal' => $subTotal,
        'cancelTotal' => $totalCancel,
        'returnTotal' => $totalReturn,
        'netTotal' => $netTotal,
        'decimals' => $settings['decimals']
    ]);
}



public function gettalsalseport()
{
    $db = \Config\Database::connect();
    $request = service('request');
    $session = session();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');
    $esuppr = $request->getPost('suppr');
    $storeSelect = $request->getPost('StoresSelect');

    $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
    $endDate = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

    $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $sales = $setting['themblock'] == 0 ? 'sales' : 'dsales';
    $ret_idd = $setting['themblock'];

    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $where = [];
    if ($storeSelect > 0) {
        $where['registers.store_id'] = $storeSelect;
    }
    if ($esuppr != '') {
        $where["$sales.client_id"] = $esuppr;
    }

    $builder = $db->table($sales);
    $builder->select("
        DATE_FORMAT($sales.created_at, '%Y-%m') as month_key,
        COUNT(*) as tbils,
        SUM(totalitems) as noofitem,
        SUM(subtotal) as toot,
        SUM(paid) as ttot,
        SUM(CASE WHEN $sales.status=3 THEN paid ELSE 0 END) as total_can,
        SUM(CASE WHEN paidmethod=0 THEN paid ELSE 0 END) as cashh,
        SUM(CASE WHEN paidmethod LIKE '1~%' THEN paid ELSE 0 END) as cardd,
        SUM(CASE WHEN paidmethod LIKE '10~%' THEN paid ELSE 0 END) as coupp,
        SUM(CASE WHEN paidmethod LIKE '6~%' THEN paid ELSE 0 END) as ppnt,
        SUM(taxamount) as cgst,
        SUM(sgsttaxamt) as sgst,
        SUM(discountamount) as disct
    ");
    $builder->join('registers', "$sales.register_id = registers.id");
    $builder->where($where);
    $builder->where("$sales.created_at >=", $startDate);
    $builder->where("$sales.created_at <=", $endDate);
    $builder->groupBy("month_key");

    $rows = $builder->get()->getResult();

    $summary = [];
    $subTotal = $cancelTotal = $returnTotal = 0;

    foreach ($rows as $row) {
        $monthLike = $row->month_key;
        $taxes = $db->table('sale_items')
            ->select('subtotal2, cgst, sgst, igstt')
            ->like('date', $monthLike, 'after')
            ->get()->getResultArray();

        $cgst = $sgst = $igst = 0;
        foreach ($taxes as $taxRow) {
            $cgst += ($taxRow['subtotal2'] * $taxRow['cgst']) / 100;
            $sgst += ($taxRow['subtotal2'] * $taxRow['sgst']) / 100;
            $igst += ($taxRow['subtotal2'] * $taxRow['igstt']) / 100;
        }

        $returns = $db->table('returnss')
            ->selectSum('tootal', 'rretunn')
            ->like('todate', $monthLike, 'after')
            ->where('rsale_type', $ret_idd)
            ->get()->getRow();

        $returnAmt = $returns->rretunn ?? 0;
        $returnTotal += $returnAmt;
        $subTotal += $row->toot;
        $cancelTotal += $row->total_can;

        $summary[] = [
            'month' => date('m-Y', strtotime($row->month_key . '-01')),
            'bills' => $row->tbils,
            'items' => $row->noofitem,
            'amount' => $row->toot
        ];
    }

    $netTotal = $subTotal - $cancelTotal - $returnTotal;

    return view('reports/monthly_sales_summary', [
        'company' => $setting['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $end,
        'rows' => $summary,
        'subTotal' => $subTotal,
        'cancelTotal' => $cancelTotal,
        'returnTotal' => $returnTotal,
        'netTotal' => $netTotal,
        'decimals' => $setting['decimals']
    ]);
}




public function getprofitdailReport()
{
    $db = \Config\Database::connect();
    $request = service('request');
    $session = session();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');

    $storeId = $session->get('store');
    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
    $endDate = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

    $summary = [];
    $ttt_tot = $sss_tot = $cann_tot = $rett_tot = $fff_tot = $total_amt_tot = 0;

    while (strtotime($startDate) <= strtotime($endDate)) {
        $ttt = $db->table('purchases')->selectSum('total', 'pur_amt')
            ->where('store_id', $storeId)
            ->where('date', $startDate)
            ->get()->getRow()->pur_amt ?? 0;

        $sss = $db->table('sales')
            ->join('registers', 'registers.id=sales.register_id')
            ->selectSum('total', 'sal_total')
            ->where('registers.store_id', $storeId)
            ->where('sales.created_at', $startDate)
            ->get()->getRow()->sal_total ?? 0;

        $cann = $db->table('sales')
            ->join('registers', 'registers.id=sales.register_id')
            ->selectSum('total', 'sal_total')
            ->where('registers.store_id', $storeId)
            ->where('sales.created_at', $startDate)
            ->where('sales.status', 3)
            ->get()->getRow()->sal_total ?? 0;

        $rett = $db->table('retunn_items')->selectSum('sl_subtotal', 'ren_tot')
            ->where('store_idsi', $storeId)
            ->where('to_datte', $startDate)
            ->get()->getRow()->ren_tot ?? 0;

        $fff = $db->table('goodsitems')->selectSum('totprice', 'ggod_tota')
            ->where('datea', $startDate)
            ->get()->getRow()->ggod_tota ?? 0;

        $total_amt = $sss - $ttt - $cann - $rett + $fff;

        $summary[] = [
            'date' => date('d-m-Y', strtotime($startDate)),
            'purchase' => $ttt,
            'sales' => $sss,
            'cancel' => $cann,
            'return' => $rett,
            'goodsout' => $fff,
            'profit' => $total_amt
        ];

        $ttt_tot += $ttt;
        $sss_tot += $sss;
        $cann_tot += $cann;
        $rett_tot += $rett;
        $fff_tot += $fff;
        $total_amt_tot += $total_amt;

        $startDate = date('Y-m-d', strtotime("+1 day", strtotime($startDate)));
    }

    return view('reports/profit_daily_report', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $end,
        'rows' => $summary,
        'totals' => [
            'purchase' => $ttt_tot,
            'sales' => $sss_tot,
            'cancel' => $cann_tot,
            'return' => $rett_tot,
            'goodsout' => $fff_tot,
            'profit' => $total_amt_tot,
        ],
        'decimals' => $settings['decimals']
    ]);
}

}
