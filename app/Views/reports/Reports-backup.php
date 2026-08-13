<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Models\SettingModel;
use App\Models\SaleModel;
use App\Models\RegisterModel;
use App\Models\SaleItemModel;
use CodeIgniter\Controller;

class Reports extends BaseController
{
    protected $user;
    protected $setting;
    protected $builder;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->builder = \Config\Database::connect();

        $session = session();

        $lang = $session->get('lang') ?? 'english';
        service('language')->setLocale($lang);

        $userId = $session->get('user_id');
        $this->user = $userId ? (new UserModel())->find($userId) : false;

        $this->setting = (new SettingModel())->find(1);
    }

    public function searchbasecodee()
    {
        $request = service('request');
        $db = \Config\Database::connect();
    
        $barcodee = $request->getPost('barcodee');
    
        $result = '<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
            <thead>
            <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
                <th style="text-align:center;border: 1px solid #1c76bc;">Product Name</th>
                <th style="text-align:center;border: 1px solid #1c76bc;">Barcode</th>
                <th style="text-align:center;border: 1px solid #1c76bc;">QT</th>
                <th style="text-align:center;border: 1px solid #1c76bc;">Price</th>
                <th style="border: 1px solid #1c76bc;text-align:center;">Sales ID</th>
                <th style="border: 1px solid #1c76bc;text-align:center;">Date Time</th>
            </tr>
            </thead>
            <tbody>';
    
        $builder = $db->table('sale_items')
            ->select('sale_items.name, sale_items.qt, sale_items.subtotal, sale_items.date, sale_items.sale_id, products.code')
            ->join('products', 'products.id = sale_items.product_id')
            ->where('sale_items.product_id', $barcodee)
            ->orderBy('sale_items.id', 'DESC');
    
        $products = $builder->get()->getResult();
    
        foreach ($products as $prd) {
            $result .= '<tr>
                <td style="border: 1px solid #1c76bc;">' . esc($prd->name) . '</td>
                <td style="border: 1px solid #1c76bc;">' . esc($prd->code) . '</td>
                <td style="border: 1px solid #1c76bc;">' . esc($prd->qt) . '</td>
                <td style="border: 1px solid #1c76bc;">' . esc($prd->subtotal) . '</td>
                <td style="border: 1px solid #1c76bc;">' . esc($prd->sale_id) . '</td>
                <td style="border: 1px solid #1c76bc;">' . date("d-m-Y", strtotime($prd->date)) . '</td>
            </tr>';
        }
    
        $result .= '</tbody></table>';
    
        echo $result;
    }
    
    public function getCustomecollection()
    {
        helper('text');
        $request = service('request');
        $db = \Config\Database::connect();
    
        $sssSelect = $request->getPost('sssSelect');
        $start = $request->getPost('start');
        $end = $request->getPost('end');
    
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
    
        // Load settings and store info
        $settingRow = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeId = session('store');
        $storeRow = $db->table('stores')->where('id', $storeId)->get()->getRowArray();
        $companyName = $settingRow['companyname'] ?? '';
        $storeAddress = $storeRow['adresse'] ?? '';
        $decimals = $settingRow['decimals'] ?? 2;
    
        $builder = $db->table('payements');
        if (!empty($sssSelect)) {
            $builder->where('salesman', $sssSelect);
        }
        $builder->where("date BETWEEN '{$start}' AND '{$end}'");
        $builder->orderBy('id', 'asc');
        $sales = $builder->get()->getResult();
    
        $result = '<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
            <thead>
            <tr class="hideme"><th colspan="6" style="text-align:center;">' . esc($companyName) . '</th></tr>
            <tr class="hideme" style="text-align:center;"><th colspan="6">' . esc($storeAddress) . '</th></tr>
            <tr class="hideme" style="text-align:center;"><th colspan="6">Collection Reports from ' . $startpp . ' Till ' . $endpp . '</th></tr>
            <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
                <th style="border: 1px solid #1c76bc;">' . label("CustomerName") . '</th>
                <th style="border: 1px solid #1c76bc;">' . label("Sales Man") . '</th>
                <th style="border: 1px solid #1c76bc;">' . label("Sales") . ' ' . label("ID") . '</th>
                <th style="border: 1px solid #1c76bc;">' . label("date") . '</th>
                <th style="border: 1px solid #1c76bc;">' . label("Paid") . '</th>
            </tr></thead><tbody>';
    
        $total = 0;
    
        foreach ($sales as $sale) {
            $salesmanName = '----';
            if ($sale->salesman > 0) {
                $user = model('User_model')->find($sale->salesman);
                $salesmanName = $user->firstname . ' ' . $user->lastname;
            }
    
            $saleData = $db->table('sales')->where('id', $sale->sale_id)->get()->getRowArray();
            $clientName = $saleData['clientname'] ?? '';
    
            $result .= '<tr style="border: 1px solid #1c76bc;">
                <td style="border: 1px solid #1c76bc;">' . esc($clientName) . '</td>
                <td style="border: 1px solid #1c76bc;">' . esc($salesmanName) . '</td>
                <td style="border: 1px solid #1c76bc;">' . esc($sale->sale_id) . '</td>
                <td style="border: 1px solid #1c76bc;">' . date("d-m-Y", strtotime($sale->date)) . '</td>
                <td style="border: 1px solid #1c76bc;text-align:right;">' . number_format($sale->paid, $decimals, '.', '') . '</td>
            </tr>';
    
            $total += $sale->paid;
        }
    
        $result .= '
            <tr style="border: 1px solid #1c76bc;">
                <td colspan="4" style="border: 1px solid #1c76bc;text-align:right;"><b>' . label("Total") . '</b></td>
                <td style="border: 1px solid #1c76bc;text-align:right;"><b>' . number_format($total, $decimals, '.', '') . '</b></td>
            </tr></tbody></table>';
    
        echo $result;
    }
    
    public function view_price_more()
{
    $request = service('request');
    $data['prince_mas'] = $request->getPost('Range');

    return view('product/view_price_more', $data);
}
public function view_mrp_more()
{
    $request = service('request');
    $data['prince_mas'] = $request->getPost('Range');

    return view('product/view_mrp_more', $data);
}

public function getCustomerReport()
    {
        $request = service('request');
        $session = session();
        $db = db_connect();

        $start  = $request->getPost('start');
        $end    = $request->getPost('end');
        $client_id = $request->getPost('client_id');
        $pamode_id = $request->getPost('selectedValues');

        $store_id = $session->get('store');
        $setting = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
        $store = $db->table('stores')->getWhere(['id' => $store_id])->getRowArray();

        $salesTable = $setting['themblock'] == 0 ? 'sales' : 'dsales';
        $ret_idd = $setting['themblock'];

        $start_db = date('Y-m-d', strtotime($start));
        $end_db = date('Y-m-d', strtotime($end));

        // Query
        $builder = $db->table($salesTable . ' s');
        $builder->select('s.*, s.id as ssid');
        $builder->join('registers r', 's.register_id = r.id');
        $builder->where('r.store_id', $store_id);
        $builder->where("s.created_at BETWEEN '{$start_db}' AND '{$end_db}'", null, false);

        if ($client_id !== '') {
            $builder->where('s.client_id', $client_id);
        }

        $salesData = $builder->orderBy('s.id', 'desc')->get()->getResultArray();

        // Payment Modes
        $paymentModeRows = $db->table('payment_mode')->where('id !=', 1)->orderBy('id')->get()->getResultArray();

        $companyname = $setting['companyname'];
        $store_address = $store['adresse'] ?? '';

        // Map data to $reportRows and $summaryRows
        $reportRows = []; // Each row will be filled during loop below
        $summaryRows = [
            'Sub Total' => [],
            'Cancel' => [],
            'Return' => [],
            'Total' => []
        ];

        // Here: loop through $salesData, compute metrics and push into $reportRows[]
        // Then compute $summaryRows['Sub Total'], ['Cancel'], etc.

        // Final rendering
        echo view('reports/customer_report_table', [
            'companyname' => $companyname,
            'store_address' => $store_address,
            'start_date' => date('d-m-Y', strtotime($start)),
            'end_date' => date('d-m-Y', strtotime($end)),
            'paymentModes' => $paymentModeRows,
            'reportRows' => $reportRows,
            'summaryRows' => $summaryRows
        ]);
    }

    public function getCustomercredit()
    {
        $request = service('request');
        $client_id = $request->getPost('client_id');
        $sssSelect = $request->getPost('sssSelect');
        $start = $request->getPost('start');
        $end = $request->getPost('end');
    
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
    
        $setting = DB::table('settings')->where('id', 1)->get()->getRow();
        $store = DB::table('stores')->where('id', session('store'))->get()->getRow();
        $themblock = $setting->themblock;
        $salesTable = $themblock == 0 ? 'sales' : 'dsales';
    
        $builder = DB::table($salesTable)->where('creddate >', 0);
    
        if (!empty($client_id)) {
            $builder->where('client_id', $client_id);
        }
        if (!empty($sssSelect)) {
            $builder->where('salesperson', $sssSelect);
        }
        $builder->where("created_at BETWEEN '{$start}' AND '{$end}'");
        $builder->orderBy('id', 'ASC');
    
        $sales = $builder->get()->getResult();
    
        $data = [
            'sales' => $sales,
            'store' => $store,
            'setting' => $setting,
            'startpp' => $startpp,
            'endpp' => $endpp,
            'totals' => 0,
        ];
    
        echo view('reports/customer_credit_report', $data);
    }

    public function getCustomerTaxReport()
    {
        $clientId = $this->request->getPost('client_id');
        $startRaw = $this->request->getPost('start');
        $endRaw = $this->request->getPost('end');
    
        $start = date("Y-m-d", strtotime($startRaw));
        $end = date("Y-m-d", strtotime($endRaw));
    
        $storeId = session()->get('store');
    
        $settings = $this->db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $this->db->table('stores')->where('id', $storeId)->get()->getRowArray();
    
        $saleTable = $settings['themblock'] == 0 ? 'sales' : 'dsales';
        $itemTable = $settings['themblock'] == 0 ? 'sale_items' : 'dsale_items';
    
        $logoUrl = base_url('files/Setting/' . $settings['logo']);
    
        $data = [
            'companyName' => $settings['companyname'],
            'storeAddress' => $store['adresse'] ?? '',
            'logoUrl' => $logoUrl,
            'startDate' => $startRaw,
            'endDate' => $endRaw,
            'decimals' => $settings['decimals'],
        ];
    
        if (empty($clientId)) {
            $query = $this->db->query("
                SELECT s.client_id, si.tottax, SUM(si.subtotal2) as mmm
                FROM {$saleTable} s
                JOIN {$itemTable} si ON s.id = si.sale_id
                WHERE si.date BETWEEN '$start' AND '$end'
                GROUP BY s.client_id, si.tottax
            ");
            $results = $query->getResultArray();
    
            $customerTax = [];
            $customers = [];
            $taxRates = [];
    
            foreach ($results as $row) {
                $customers[$row['client_id']] = $row['client_id'];
                $taxRates[$row['tottax']] = $row['tottax'];
                $customerTax[$row['client_id']][$row['tottax']] = $row['mmm'];
            }
    
            ksort($customers);
            ksort($taxRates);
    
            $data['mode'] = 'all';
            $data['customerTax'] = $customerTax;
            $data['customers'] = $customers;
            $data['taxRates'] = $taxRates;
        } else {
            $query = $this->db->query("
                SELECT si.tottax, SUM(si.subtotal) as mmm
                FROM {$saleTable} s
                JOIN {$itemTable} si ON s.id = si.sale_id
                WHERE s.client_id = '$clientId' AND si.date BETWEEN '$start' AND '$end'
                GROUP BY si.tottax
            ");
            $results = $query->getResultArray();
    
            $customer = $this->db->table('customers')->where('id', $clientId)->get()->getRowArray();
            $customerName = $customer['name'] ?? 'Walk in Customer';
    
            $taxSummary = [];
            foreach ($results as $row) {
                $taxSummary[$row['tottax']] = $row['mmm'];
            }
    
            ksort($taxSummary);
    
            $data['mode'] = 'single';
            $data['customerName'] = $customerName;
            $data['taxSummary'] = $taxSummary;
        }
    
        return view('reports/customer_tax_report', $data);
    }
    
    public function getCustomertaxgstrtb()
    {
        $request = service('request');
        $db = \Config\Database::connect();
    
        $mmonth = $request->getPost('mmonth');
        $yyear = $request->getPost('yyear');
        $client_id = $request->getPost('client_id');
    
        $setting = $db->query("SELECT * FROM settings WHERE id=1")->getRowArray();
        $store = $db->query("SELECT * FROM stores WHERE id='" . session()->get('store') . "'")->getRowArray();
    
        $logoPath = base_url('files/Setting/' . $setting['logo']);
        $sales = $setting['themblock'] == 0 ? 'sales' : 'dsales';
        $sale_items = $setting['themblock'] == 0 ? 'sale_items' : 'dsale_items';
        $tax_summary = $setting['themblock'] == 0 ? 'tax_summary' : 'dtax_summary';
    
        $fumll = $yyear . '-' . sprintf("%02d", $mmonth);
    
        $c_kmmm = $db->query("SELECT SUM(taxfrom) AS ctaxx FROM $tax_summary WHERE c_s_i=1 AND datedd LIKE '$fumll-%'")->getRowArray();
        $i_kmmm = $db->query("SELECT SUM(taxfrom) AS itaxx FROM $tax_summary WHERE c_s_i=2 AND datedd LIKE '$fumll-%'")->getRowArray();
        $t_kmmm = $db->query("SELECT SUM(taxamount) AS ttoptal FROM $tax_summary WHERE datedd LIKE '$fumll-%'")->getRowArray();
        $pur_kmmm = $db->query("SELECT SUM(cgst) AS ccgst, SUM(sgst) AS ssgst FROM purchases WHERE date LIKE '$fumll-%'")->getRowArray();
    
        $data = [
            'setting'   => $setting,
            'store'     => $store,
            'month'     => $mmonth,
            'year'      => $yyear,
            'client_id' => $client_id,
            'logoPath'  => $logoPath,
            'c_kmmm'    => $c_kmmm,
            'i_kmmm'    => $i_kmmm,
            't_kmmm'    => $t_kmmm,
            'pur_kmmm'  => $pur_kmmm,
            'decimals'  => $setting['decimals']
        ];
    
        echo view('reports/customer_tax_gstr3b', $data);
    }
    
    public function getProductReport()
    {
        $product_id = $this->request->getPost('product_id');
        $start = $this->request->getPost('start');
        $end = $this->request->getPost('end');
    
        $startFormatted = date("d-m-Y", strtotime($start));
        $endFormatted = date("d-m-Y", strtotime($end));
    
        $storeId = session('store');
    
        $setting = model('SettingModel')->find(1);
        $store = model('StoreModel')->find($storeId);
    
        $db = \Config\Database::connect();
    
        if (empty($product_id) || $product_id == 0) {
            $builder = $db->table('sale_items')->where("date >=", $start)->where("date <=", $end)->orderBy('sale_id', 'DESC');
        } else {
            $builder = $db->table('sale_items')->where('product_id', $product_id)->where("date >=", $start)->where("date <=", $end)->orderBy('sale_id', 'DESC');
        }
    
        $products = $builder->get()->getResult();
    
        $total = 0;
        $total_cancelled = 0;
    
        $saleStatuses = [];
        foreach ($products as $item) {
            $sale = $db->table('sales')->select('id, status')->where('id', $item->sale_id)->get()->getRow();
            $statusText = 'Paid';
            $rowStyle = 'border: 1px solid #1c76bc;';
            if ($sale) {
                switch ($sale->status) {
                    case 3:
                        $statusText = 'Cancel';
                        $rowStyle = 'background:#e9c0c0; border: 1px solid #1c76bc;';
                        break;
                    case 1:
                        $statusText = 'Unpaid';
                        break;
                    case 2:
                        $statusText = 'Partially paid';
                        break;
                }
            }
    
            $item->statusText = $statusText;
            $item->rowStyle = $rowStyle;
            $item->tax_amount = $item->subtotal - $item->subtotal2;
    
            $total += $item->subtotal;
            if (isset($sale->status) && $sale->status == 3) {
                $total_cancelled += $item->subtotal;
            }
        }
    
        echo view('reports/product_report_table', [
            'products' => $products,
            'setting' => $setting,
            'store' => $store,
            'startFormatted' => $startFormatted,
            'endFormatted' => $endFormatted,
            'total' => $total,
            'total_cancelled' => $total_cancelled
        ]);
    }
    



     public function getccdReport()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $product_id = $request->getPost('product_id');
        $start = $request->getPost('start');
        $end = $request->getPost('end');
        $storeiid = $session->get('store');

        $startpp = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($end));

        $poql = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $poss = $db->table('stores')->where('id', $storeiid)->get()->getRowArray();

        $themblock = $poql['themblock'] ?? 0;
        $sales = $themblock == 0 ? 'sales' : 'dsales';
        $sale_items = $themblock == 0 ? 'sale_items' : 'dsale_items';

        if ($product_id > 0) {
            $query = "
                SELECT *, SUM(qt) AS ttt,
                    SUM(CASE WHEN cancel_status=1 THEN qt ELSE 0 END) AS qt_cancel,
                    c.name AS ccc, p.name AS pprd
                FROM products p
                JOIN $sale_items s ON p.id = s.product_id
                JOIN categories c ON p.category = c.id
                WHERE s.store_irrdd = ?
                    AND p.category = ?
                    AND s.date BETWEEN ? AND ?
                GROUP BY product_id, c.id
                ORDER BY pprd ASC";
            $products = $db->query($query, [$storeiid, $product_id, $startpp, $endpp]);
        } else {
            $query = "
                SELECT *, SUM(qt) AS ttt,
                    SUM(CASE WHEN cancel_status=1 THEN qt ELSE 0 END) AS qt_cancel,
                    c.name AS ccc, p.name AS pprd
                FROM products p
                JOIN $sale_items s ON p.id = s.product_id
                JOIN categories c ON p.category = c.id
                WHERE s.store_irrdd = ?
                    AND s.date BETWEEN ? AND ?
                GROUP BY product_id, c.id
                ORDER BY pprd ASC";
            $products = $db->query($query, [$storeiid, $startpp, $endpp]);
        }

        $rows = [];

        foreach ($products->getResult() as $prd) {
            $retQuery = $db->query("
                SELECT SUM(sl_newqt) AS r_retun
                FROM retunn_items
                WHERE prodd_ids = ? AND to_datte BETWEEN ? AND ?
            ", [$prd->product_id, $startpp, $endpp]);

            $ret = $retQuery->getRow();
            $return_qty = intval($ret->r_retun ?? 0);
            $final_qt = intval($prd->ttt) - intval($prd->qt_cancel) - $return_qty;

            $rows[] = [
                'category' => $prd->ccc,
                'product' => $prd->pprd,
                'sales' => $prd->ttt,
                'cancel' => $prd->qt_cancel,
                'return' => $return_qty,
                'total' => $final_qt
            ];
        }

        return view('reports/ccd_report', [
            'company' => $poql['companyname'] ?? '',
            'address' => $poss['adresse'] ?? '',
            'start' => $startpp,
            'end' => $endpp,
            'rows' => $rows
        ]);
    }


    public function getccdReport_fastt()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $product_id = $request->getPost('product_id');
        $start = $request->getPost('start');
        $end = $request->getPost('end');
        $storeId = $session->get('store');

        $startpp = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($end));

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $sales = $settings['themblock'] == 0 ? 'sales' : 'dsales';
        $sale_items = $settings['themblock'] == 0 ? 'sale_items' : 'dsale_items';

        if ($product_id > 0) {
            $query = "
                SELECT *, SUM(qt) AS ttt,
                    SUM(CASE WHEN cancel_status=1 THEN qt ELSE 0 END) AS qt_cancel,
                    c.name AS ccc, p.name AS pprd
                FROM products p
                JOIN $sale_items s ON p.id = s.product_id
                JOIN categories c ON p.category = c.id
                WHERE p.category = ? AND s.store_irrdd = ?
                    AND s.date BETWEEN ? AND ?
                GROUP BY product_id, c.id
                ORDER BY ttt DESC
            ";
            $products = $db->query($query, [$product_id, $storeId, $startpp, $endpp]);
        } else {
            $query = "
                SELECT *, SUM(qt) AS ttt,
                    SUM(CASE WHEN cancel_status=1 THEN qt ELSE 0 END) AS qt_cancel,
                    c.name AS ccc, p.name AS pprd
                FROM products p
                JOIN $sale_items s ON p.id = s.product_id
                JOIN categories c ON p.category = c.id
                WHERE s.store_irrdd = ?
                    AND s.date BETWEEN ? AND ?
                GROUP BY product_id, c.id
                ORDER BY ttt DESC
            ";
            $products = $db->query($query, [$storeId, $startpp, $endpp]);
        }

        $rows = [];

        foreach ($products->getResult() as $prd) {
            $retQuery = $db->query("
                SELECT SUM(sl_newqt) AS r_retun
                FROM retunn_items
                WHERE prodd_ids = ? AND store_idsi = ? AND to_datte BETWEEN ? AND ?
            ", [$prd->product_id, $storeId, $startpp, $endpp]);

            $ret = $retQuery->getRow();
            $return_qty = intval($ret->r_retun ?? 0);
            $final_qt = intval($prd->ttt) - intval($prd->qt_cancel) - $return_qty;

            $rows[] = [
                'category' => $prd->ccc,
                'product' => $prd->pprd,
                'sales' => $prd->ttt,
                'cancel' => $prd->qt_cancel,
                'return' => $return_qty,
                'total' => $final_qt
            ];
        }

        return view('reports/ccd_report_fastt', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $startpp,
            'end' => $endpp,
            'rows' => $rows
        ]);
    }

    public function getpurchaseReport()
    {
        $request = service('request');
        $db = Database::connect();
        $setting = $db->table('settings')->where('id', 1)->get()->getRow();

        $product_id = $request->getPost('product_id');
        $start = $request->getPost('start');
        $end = $request->getPost('end');

        $start = date("Y-m-d", strtotime($start));
        $end = date("Y-m-d", strtotime($end));

        // Fetch sale items
        if (empty($product_id) || $product_id == 0) {
            $saleItems = $db->query("
                SELECT *, SUM(qt) as nnn 
                FROM sale_items 
                WHERE date BETWEEN ? AND ? 
                GROUP BY tottax, price", [$start, $end])->getResult();
        } else {
            $saleItems = $db->query("
                SELECT *, SUM(qt) as nnn 
                FROM sale_items 
                WHERE product_id = ? AND date BETWEEN ? AND ? 
                GROUP BY tottax, price", [$product_id, $start, $end])->getResult();
        }

        $rows = [];
        $totalprofit = $totalprocg = $totalprosg = $gtotal = 0;
        $sn = 1;

        foreach ($saleItems as $prd) {
            $product = $db->table('products')->select('unit')->where('id', $prd->product_id)->get()->getRowArray();
            $unit = $product['unit'] ?? '';

            $ctax = ($prd->cgst * $prd->nnn * $prd->price) / 100;
            $stax = ($prd->sgst * $prd->nnn * $prd->price) / 100;
            $totarat = $prd->price * $prd->nnn;
            $ggtot = $ctax + $stax + $totarat;

            $rows[] = [
                'sn'     => $sn++,
                'name'   => $prd->name,
                'tax'    => $prd->tottax,
                'qty'    => $prd->nnn,
                'unit'   => $unit,
                'price'  => $prd->price,
                'total'  => $totarat,
                'cgst'   => $ctax,
                'sgst'   => $stax,
                'gtotal' => $ggtot
            ];

            $totalprofit += $totarat;
            $totalprocg += $ctax;
            $totalprosg += $stax;
            $gtotal += $ggtot;
        }

        return view('reports/purchase_report', [
            'rows'        => $rows,
            'decimals'    => $setting->decimals ?? 2,
            'totalprofit' => $totalprofit,
            'totalprocg'  => $totalprocg,
            'totalprosg'  => $totalprosg,
            'gtotal'      => $gtotal
        ]);
    }

   public function getProducttaxReport()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $product_id = $request->getPost('product_id');
        $startpp = $request->getPost('start');
        $endpp = $request->getPost('end');
        $store_filter = $request->getPost('Stores');

        $start = date("Y-m-d", strtotime($startpp));
        $end = date("Y-m-d", strtotime($endpp));

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        $sales = $settings['themblock'] == 0 ? 'sales' : 'dsales';
        $sale_items = $settings['themblock'] == 0 ? 'sale_items' : 'dsale_items';
        $ret_idd = $settings['themblock'];

        $storeClause = $store_filter > 0 ? "store_irrdd = '$store_filter' AND " : '';

        $query = "SELECT * FROM $sale_items WHERE {$storeClause} ";
        $query .= $product_id ? "product_id = '$product_id' AND " : '';
        $query .= "date BETWEEN '$start' AND '$end' ORDER BY sale_id DESC";

        $items = $db->query($query)->getResult();

        $reportData = [
            'company' => $settings['companyname'],
            'address' => $storeInfo['adresse'] ?? '',
            'start' => $startpp,
            'end' => $endpp,
            'items' => $items,
            'settings' => $settings,
            'sales_table' => $sales,
            'ret_type' => $ret_idd
        ];

        return view('reports/product_tax_report', $reportData);
    }




 public function getProducttaxReportsupp()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $product_id = $request->getPost('product_id');
        $innon = $request->getPost('innon');
        $prrcc = $request->getPost('prrcc');

        $start = date("Y-m-d", strtotime($request->getPost('start')));
        $end = date("Y-m-d", strtotime($request->getPost('end')));

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        // Build the query
        if (!empty($innon)) {
            $payments = $db->table('payment_suplls')->where('invoicen', $innon)->orderBy('purchaid')->get()->getResult();
        } elseif (!empty($prrcc)) {
            $payments = $db->table('payment_suplls')->where('purchaid', $prrcc)->orderBy('purchaid')->get()->getResult();
        } elseif (empty($product_id) && empty($innon)) {
            $payments = $db->table('payment_suplls')
                ->where("datet >=", $start)
                ->where("datet <=", $end)
                ->orderBy('purchaid')
                ->get()->getResult();
        } else {
            $payments = $db->table('payment_suplls')
                ->where('sup_id', $product_id)
                ->where("datet >=", $start)
                ->where("datet <=", $end)
                ->orderBy('purchaid')
                ->get()->getResult();
        }

        return view('reports/supplier_payment_report', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start'   => $startpp,
            'end'     => $endpp,
            'decimals' => $settings['decimals'],
            'payments' => $payments
        ]);
    }

  public function getpurchasedailyReport()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $startpp = $request->getPost('Range');
        $endpp = $request->getPost('Range1');
        $start = date("Y-m-d", strtotime($startpp));
        $end = date("Y-m-d", strtotime($endpp));

        $store_id = $session->get('store');
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeInfo = $db->table('stores')->where('id', $store_id)->get()->getRowArray();

        $btypess = $request->getPost('bill_type') == 1 ? 0 : 1;

        if (empty($start)) {
            $start = date("Y-m-d");
            $end = $start;
        }

        if ($btypess !== '') {
            $query = $db->table('purchases')
                ->where('ppurchase_type', $btypess)
                ->where('store_id', $store_id)
                ->where("purdat BETWEEN '$start' AND '$end'")
                ->orderBy('purdat', 'asc')
                ->get()->getResult();
        } else {
            $query = $db->table('purchases')
                ->where('store_id', $store_id)
                ->where("purdat BETWEEN '$start' AND '$end'")
                ->orderBy('purdat', 'asc')
                ->get()->getResult();
        }

        return view('reports/purchasedaily_report', [
            'company' => $settings['companyname'],
            'address' => $storeInfo['adresse'] ?? '',
            'start' => $startpp,
            'end' => $endpp,
            'query' => $query,
            'decimals' => $settings['decimals'] ?? 2
        ]);
    }


     public function getpusumbjReport()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $startRaw = $request->getPost('Range');
        $endRaw = $request->getPost('Range1');

        if (empty($startRaw)) {
            return; // prevent empty request processing
        }

        $start = date("Y-m-d", strtotime($startRaw));
        $end = date("Y-m-d", strtotime($endRaw));
        $startFormatted = date("d-m-Y", strtotime($start));
        $endFormatted = date("d-m-Y", strtotime($end));

        $storeId = $session->get('store');

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $summaryQuery = $db->query("
            SELECT 
                COUNT(id) as bills,
                SUM(betot) as billamt,
                SUM(paiddd) as baalll,
                SUM(cgst) as cgg,
                SUM(sgst) as sgg,
                SUM(discamt) as dikct,
                SUM(total) as netamtt,
                DATE_FORMAT(purdat, '%Y-%m-%d') AS day
            FROM purchases
            WHERE store_id = ? AND purdat BETWEEN ? AND ?
            GROUP BY day
        ", [$storeId, $start, $end])->getResult();

        // For each day's return amount (if needed per day)
        $returnAmounts = [];
        foreach ($summaryQuery as $item) {
            $date = $item->day;
            $returnRow = $db->query("
                SELECT SUM(total) as retnetamtt
                FROM purchases_return
                WHERE store_id = ? AND purdat = ?
            ", [$storeId, $date])->getRow();
            $returnAmounts[$date] = $returnRow->retnetamtt ?? 0;
        }

        return view('reports/purchase_summary_report', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $startFormatted,
            'end' => $endFormatted,
            'decimals' => $settings['decimals'] ?? 2,
            'summary' => $summaryQuery,
            'returns' => $returnAmounts
        ]);
    }

   public function getpurchasedailyReportproduct()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $startRaw = $request->getPost('Range');
        $endRaw = $request->getPost('Range1');

        $startFormatted = date("d-m-Y", strtotime($startRaw));
        $endFormatted = date("d-m-Y", strtotime($endRaw));

        $storeId = $session->get('store');
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        if (empty($startRaw)) {
            $today = date("Y-m-d");
            $items = $db->table('purchase_items')
                ->where('store_idd', $storeId)
                ->where("ndate BETWEEN '$today' AND '$today'")
                ->orderBy('ndate', 'desc')
                ->get()->getResult();
        } else {
            $start = implode('-', array_reverse(explode('-', $startRaw)));
            $end = implode('-', array_reverse(explode('-', $endRaw)));

            $items = $db->table('purchase_items')
                ->where('store_idd', $storeId)
                ->where("ndate BETWEEN '$start' AND '$end'")
                ->orderBy('ndate', 'desc')
                ->get()->getResult();
        }

        return view('reports/purchasedaily_report_product', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $startFormatted,
            'end' => $endFormatted,
            'decimals' => $settings['decimals'] ?? 2,
            'items' => $items
        ]);
    }

   public function getpurchasetally()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $startRaw = $request->getPost('Range');
        $endRaw = $request->getPost('Range1');

        $start = date("Y-m-d", strtotime($startRaw));
        $end = date("Y-m-d", strtotime($endRaw));
        $startFormatted = date("d-m-Y", strtotime($start));
        $endFormatted = date("d-m-Y", strtotime($end));

        $storeId = $session->get('store');
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        if (empty($startRaw)) {
            $today = date("Y-m-d");
            $items = $db->table('purchase_items')
                ->where("ndate BETWEEN '$today' AND '$today'")
                ->orderBy('ndate', 'desc')
                ->get()->getResult();
        } else {
            $from = implode('-', array_reverse(explode('-', $startRaw)));
            $to = implode('-', array_reverse(explode('-', $endRaw)));

            $items = $db->table('purchase_items')
                ->where("ndate BETWEEN '$from' AND '$to'")
                ->orderBy('ndate', 'desc')
                ->get()->getResult();
        }

        return view('reports/purchase_tally_report', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $startFormatted,
            'end' => $endFormatted,
            'items' => $items
        ]);
    }


  public function getpurchasetallybb()
    {
        $request = service('request');
        $session = session();
        $db = Database::connect();

        $startRaw = $request->getPost('Range');
        $endRaw = $request->getPost('Range1');

        $zstart = date("Y-m-d", strtotime($startRaw));
        $zend = date("Y-m-d", strtotime($endRaw));

        // Check if dates exist in tallypurchase table
        $y1 = $db->table('tallypurchase')->where("fromdatt <=", $zstart)->where("enddatt >=", $zstart)->countAllResults();
        $y2 = $db->table('tallypurchase')->where("fromdatt <=", $zend)->where("enddatt >=", $zend)->countAllResults();
        $y3 = $db->table('tallypurchase')->where("fromdatt >=", $zstart)->where("enddatt <=", $zend)->countAllResults();

        if ($y1 == 0 && $y2 == 0 && $y3 == 0) {
            $startFormatted = date("d-m-Y", strtotime($zstart));
            $endFormatted = date("d-m-Y", strtotime($zend));
            $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
            $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

            $items = $db->table('purchase_items')
                ->where("ndate >=", $zstart)
                ->where("ndate <=", $zend)
                ->orderBy('ndate', 'desc')
                ->get()->getResult();

            return view('reports/purchase_tally_bb_report', [
                'company' => $settings['companyname'],
                'address' => $store['adresse'] ?? '',
                'start' => $startFormatted,
                'end' => $endFormatted,
                'items' => $items
            ]);
        } else {
            echo '<input type="hidden" name="rrt" id="rrt" value="0" /> This Date range data already updated into tally, please refer log file for download...';
        }
    }


public function purdownloadxl($xmml)
    {
        $db = Database::connect();
        $session = session();

        $entry = $db->table('tallypurchase')->where('sii', $xmml)->get()->getRowArray();

        if (!$entry) {
            return 'Data not found...';
        }

        $start = $entry['fromdatt'];
        $end = $entry['enddatt'];
        $company = $entry['companyname'];

        $storeId = $session->get('store');
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $items = $db->table('purchase_items')
            ->where("ndate >=", $start)
            ->where("ndate <=", $end)
            ->orderBy('ndate', 'desc')
            ->get()->getResult();

        // Render view as string to capture output
        $html = view('reports/purchase_tally_excel_export', [
            'company' => $company,
            'address' => $store['adresse'] ?? '',
            'start' => date('d-m-Y', strtotime($start)),
            'end' => date('d-m-Y', strtotime($end)),
            'items' => $items
        ]);

        $filename = $start . '_to_' . $end . '.xls';

        return response()
            ->setHeader('Content-Type', 'application/vnd.ms-excel')
            ->setHeader('Content-Disposition', "attachment; filename=\"$filename\"")
            ->setBody($html);
    }


   public function getRegisterReport()
    {
        $request = service('request');
        $db = Database::connect();
        $session = session();

        $store_id = $request->getPost('store_id');
        $start = date("Y-m-d", strtotime($request->getPost('start'))) . ' 00:00:00';
        $end = date("Y-m-d", strtotime($request->getPost('end'))) . ' 23:59:59';

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $builder = $db->table('registers');
        if ($store_id != 0) {
            $builder->where('store_id', $store_id);
        }
        $registers = $builder->where("date BETWEEN '$start' AND '$end'")->orderBy('date')->get()->getResult();

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();
        $paymentModes = $db->table('payment_mode')->orderBy('id')->get()->getResultArray();

        return view('reports/register_report', [
            'company' => $settings['companyname'],
            'address' => $storeInfo['adresse'] ?? '',
            'start' => $startpp,
            'end' => $endpp,
            'registers' => $registers,
            'paymentModes' => $paymentModes,
            'decimals' => $settings['decimals'] ?? 2
        ]);
    }


      public function getRegisterReportstore()
    {
        $request = service('request');
        $db = Database::connect();
        $session = session();

        $store_id = $request->getPost('store_id');
        $startRaw = $request->getPost('start');
        $endRaw = $request->getPost('endd');
        $includeDispatch = $request->getPost('ckkk') === 'true';

        $start = date("Y-m-d", strtotime($startRaw));
        $end = date("Y-m-d", strtotime($endRaw));

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        if (empty($startRaw)) {
            $warehouses = $db->table('warehouses')->orderBy('name')->get()->getResultArray();
        } elseif ($store_id > 0) {
            $warehouses = $db->table('warehouses')->where('id', $store_id)->get()->getResultArray();
        } else {
            $warehouses = $db->table('warehouses')->orderBy('name')->get()->getResultArray();
        }

        $products = $db->table('products')->orderBy('name')->get()->getResultArray();

        return view('reports/register_report_store', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $end,
            'includeDispatch' => $includeDispatch,
            'warehouses' => $warehouses,
            'products' => $products,
            'decimals' => $settings['decimals'] ?? 2
        ]);
    }


public function cclrtstore()
{
    $request = service('request');
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $request->getPost('store_id');
    $product_filter = $request->getPost('ckkk');
    $start = date("Y-m-d", strtotime($request->getPost('start')));
    $end = date("Y-m-d", strtotime($request->getPost('endd')));

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    // Get levels by store or all
    $levelBuilder = $db->table('levels')->orderBy('name', 'asc');
    if ($store_id > 0) {
        $levelBuilder->where('warehousr', $store_id);
    }
    $levels = $levelBuilder->get()->getResultArray();

    // Get products (filtered if needed)
    $productBuilder = $db->table('products')->orderBy('name', 'asc');
    if (!empty($product_filter)) {
        $productBuilder->where('id', $product_filter);
    }
    $products = $productBuilder->get()->getResultArray();

    // Get warehouse lookup
    $warehouseMap = [];
    foreach ($db->table('warehouses')->get()->getResultArray() as $wh) {
        $warehouseMap[$wh['id']] = $wh['name'];
    }

    return view('reports/rackwise_report_store', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $end,
        'levels' => $levels,
        'products' => $products,
        'decimals' => $settings['decimals'] ?? 2,
        'warehouseMap' => $warehouseMap
    ]);
}


  public function fastmovingstore()
{
    $request = service('request');
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $request->getPost('store_id');
    $start = date("Y-m-d", strtotime($request->getPost('start')));
    $end = date("Y-m-d", strtotime($request->getPost('endd')));

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $queryBuilder = $db->table('sale_items si')
        ->select('p.name as product_name, c.name as category_name, SUM(si.qt) as sold_qty')
        ->join('products p', 'p.id = si.product_id')
        ->join('categories c', 'p.category = c.id')
        ->where("si.date >=", $start)
        ->where("si.date <=", $end)
        ->groupBy('si.product_id')
        ->orderBy('sold_qty', 'DESC');

    if ($store_id > 0) {
        $queryBuilder->where('c.id', $store_id);
    }

    $products = $queryBuilder->get()->getResultArray();

    return view('reports/fastmoving_report', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'start' => $start,
        'end' => $end,
        'products' => $products
    ]);
}

  public function getrackwar()
{
    $request = service('request');
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $request->getPost('store_id');
    $product_id = $request->getPost('ckkk');

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $query = $db->table('purchase_items')
        ->where('avlqty >', 0)
        ->orderBy('product_id', 'asc');

    if ($store_id > 0) {
        $query->where('warehouse_id', $store_id);
    }

    if ($product_id > 0) {
        $query->where('product_id', $product_id);
    }

    $items = $query->get()->getResultArray();

    return view('reports/rackwise_stock_report', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'items' => $items,
    ]);
}


  public function unsoldrackwar()
{
    $request = service('request');
    $db = \Config\Database::connect();
    $session = session();

    $store_id = $request->getPost('store_id');
    $product_id = $request->getPost('ckkk');

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $builder = $db->table('purchase_items')
        ->where('avlqty >', 0);

    if ($product_id > 0) {
        $builder->where('product_id', $product_id);
    }

    $builder->orderBy($store_id == 1 ? 'avlqty DESC' : 'ndate ASC');

    $items = $builder->get()->getResultArray();

    return view('reports/unsold_rackwise_report', [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'items' => $items
    ]);
}


public function getsalestallybb()
{
    $request = service('request');
    $db = \Config\Database::connect();
    $session = session();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');

    $startDate = date("Y-m-d", strtotime($start));
    $endDate = date("Y-m-d", strtotime($end));

    // Check tally lock
    $tallySales = $db->table('tallysales');
    $y1 = $tallySales->where('fromdatt <=', $startDate)->where('enddatt >=', $startDate)->countAllResults();
    $y2 = $tallySales->where('fromdatt <=', $endDate)->where('enddatt >=', $endDate)->countAllResults();
    $y3 = $tallySales->where('fromdatt >=', $startDate)->where('enddatt <=', $endDate)->countAllResults();

    if ($y1 == 0 && $y2 == 0 && $y3 == 0) {
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        $startFormatted = date("d-m-Y", strtotime($start));
        $endFormatted = date("d-m-Y", strtotime($end));

        // Parse and format date for query
        $startForQuery = implode('-', array_reverse(explode('-', $start)));
        $endForQuery = implode('-', array_reverse(explode('-', $end)));

        $salesItems = $db->query("SELECT * FROM sale_items WHERE `date` BETWEEN '$startForQuery' AND '$endForQuery' ORDER BY `date` DESC")->getResult();

        return view('reports/sales_tally_bb_report', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $startFormatted,
            'end' => $endFormatted,
            'salesItems' => $salesItems
        ]);
    } else {
        echo '<input type="hidden" name="rrt" id="rrt" value="0" /> This Date range data already updated into tally, please refer log file for download...';
    }
}


public function seldownloadxl($xmml)
{
    $db = \Config\Database::connect();
    $session = session();

    // Fetch tally sales date range by reference
    $tally = $db->table('tallysales')->where('sii', $xmml)->get()->getRowArray();

    if (!$tally) {
        return 'Data not found...';
    }

    $start = $tally['fromdatt'];
    $end = $tally['enddatt'];
    $salesItems = $db->table('sale_items')
        ->where('date >=', $start)
        ->where('date <=', $end)
        ->orderBy('date', 'DESC')
        ->get()
        ->getResult();

    $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

    $data = [
        'company'     => $settings['companyname'],
        'address'     => $store['adresse'] ?? '',
        'start'       => date('d-m-Y', strtotime($start)),
        'end'         => date('d-m-Y', strtotime($end)),
        'salesItems'  => $salesItems,
        'isExport'    => true,
        'filename'    => date('d-m-Y', strtotime($start)) . '_to_' . date('d-m-Y', strtotime($end)) . '.xls',
    ];

    // Render as Excel file
    $html = view('reports/sales_tally_bb_report', $data);

    return $this->response
        ->setHeader('Content-Type', 'application/vnd.ms-excel')
        ->setHeader('Content-Disposition', 'attachment; filename="' . $data['filename'] . '"')
        ->setBody($html);
}

   public function getRegrtstoreall()
{
    helper(['form']);
    $request = service('request');
    $db = \Config\Database::connect();

    $start     = $request->getPost('start');
    $endd      = $request->getPost('endd');
    $productId = $request->getPost('ckkk');
    $limittt   = (int) $request->getPost('limittt');
    $storeId   = $request->getPost('storesSelect');

    $startDate = date("Y-m-d", strtotime($start));
    $endDate   = date("Y-m-d", strtotime($endd));

    $setting = $db->query("SELECT * FROM settings WHERE id = 1")->getRowArray();
    $storeInfo = $db->query("SELECT * FROM stores WHERE id = '" . session()->get('store') . "'")->getRowArray();

    $products = $db->query("SELECT id, name, price FROM products ORDER BY name ASC LIMIT $limittt, 250")->getResultArray();

    $reportData = [];

    foreach ($products as $product) {
        $productId = $product['id'];
        $price     = $product['price'];

        // Initial stock
        $initStock = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE pro_id = '$productId' AND store_id = '$storeId' AND tyoftrans = 5")->getRow('total') ?? 0;

        // Opening stock components
        $saleBefore   = $db->query("SELECT SUM(qt) AS total FROM sale_items WHERE product_id = '$productId' AND store_irrdd = '$storeId' AND date < '$startDate'")->getRow('total') ?? 0;
        $purchaseBefore = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE pro_id = '$productId' AND store_id = '$storeId' AND tyoftrans = 1 AND date < '$startDate'")->getRow('total') ?? 0;
        $cancelBefore = $db->query("SELECT SUM(qt) AS total FROM sale_items WHERE product_id = '$productId' AND store_irrdd = '$storeId' AND cancel_status = 1 AND date < '$startDate'")->getRow('total') ?? 0;
        $returnBefore = $db->query("SELECT SUM(sl_newqt) AS total FROM retunn_items WHERE prodd_ids = '$productId' AND store_idsi = '$storeId' AND to_datte < '$startDate'")->getRow('total') ?? 0;

        $openingStock = $initStock - $saleBefore + $purchaseBefore + $cancelBefore + $returnBefore;

        // Movement between start and end
        $purchase = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE pro_id = '$productId' AND store_id = '$storeId' AND tyoftrans = 1 AND date BETWEEN '$startDate' AND '$endDate'")->getRow('total') ?? 0;
        $sales    = $db->query("SELECT SUM(qt) AS total FROM sale_items WHERE product_id = '$productId' AND store_irrdd = '$storeId' AND date BETWEEN '$startDate' AND '$endDate'")->getRow('total') ?? 0;
        $cancel   = $db->query("SELECT SUM(qt) AS total FROM sale_items WHERE product_id = '$productId' AND store_irrdd = '$storeId' AND cancel_status = 1 AND date BETWEEN '$startDate' AND '$endDate'")->getRow('total') ?? 0;
        $return   = $db->query("SELECT SUM(sl_newqt) AS total FROM retunn_items WHERE prodd_ids = '$productId' AND store_idsi = '$storeId' AND to_datte BETWEEN '$startDate' AND '$endDate'")->getRow('total') ?? 0;

        // Closing stock
        $saleUptoEnd   = $db->query("SELECT SUM(qt) AS total FROM sale_items WHERE product_id = '$productId' AND store_irrdd = '$storeId' AND date <= '$endDate'")->getRow('total') ?? 0;
        $purchaseUptoEnd = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE pro_id = '$productId' AND store_id = '$storeId' AND tyoftrans = 1 AND date <= '$endDate'")->getRow('total') ?? 0;
        $cancelUptoEnd  = $db->query("SELECT SUM(qt) AS total FROM sale_items WHERE product_id = '$productId' AND store_irrdd = '$storeId' AND cancel_status = 1 AND date <= '$endDate'")->getRow('total') ?? 0;
        $returnUptoEnd  = $db->query("SELECT SUM(sl_newqt) AS total FROM retunn_items WHERE prodd_ids = '$productId' AND store_idsi = '$storeId' AND to_datte <= '$endDate'")->getRow('total') ?? 0;

        $closingStock = $initStock - $saleUptoEnd + $purchaseUptoEnd + $cancelUptoEnd + $returnUptoEnd;
        $value = $closingStock * $price;

        $reportData[] = [
            'id'            => $product['id'],
            'name'          => $product['name'],
            'initial'       => $initStock,
            'opening'       => $openingStock,
            'purchase'      => $purchase,
            'sales'         => $sales,
            'cancel'        => $cancel,
            'return'        => $return,
            'closing'       => $closingStock,
            'price'         => $price,
            'value'         => $value
        ];
    }

    return view('reports/closing_stock_report', [
        'reportData'  => $reportData,
        'companyName' => $setting['companyname'],
        'storeAddress'=> $poss['adresse'] ?? '',
        'startpp'     => $startpp,
        'endpp'       => $endpp,
        'totalValue'  => array_sum(array_column($reportData, 'value'))
    ]);
}

 public function wargetRegrtstoreall()
    {
        $request = service('request');
        $db = Database::connect();

        $start = $request->getPost('start');
        $endd  = $request->getPost('endd');
        $stores_id = $request->getPost('storesSelect');

        $startpp = date("d-m-Y", strtotime($start));
        $endpp   = date("d-m-Y", strtotime($endd));

        $setting = $db->query("SELECT * FROM settings WHERE id = 1")->getRowArray();
        $store   = $db->query("SELECT * FROM stores WHERE id = '" . session()->get('store') . "'")->getRowArray();

        $products = $db->query("SELECT * FROM products ORDER BY name ASC")->getResultArray();

        $reportData = [];

        foreach ($products as $product) {
            $productId = $product['id'];

            $bb_wal = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE store_id = 0 AND tyoftrans = 1 AND pro_id = '$productId' AND war_id = '$stores_id' AND date < '$start'")->getRow('total') ?? 0;
            $bb_sal = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE store_id != 0 AND tyoftrans = 1 AND pro_id = '$productId' AND war_id = '$stores_id' AND date < '$start'")->getRow('total') ?? 0;
            $bb_gal = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE tyoftrans = 6 AND pro_id = '$productId' AND war_id = '$stores_id' AND date < '$start'")->getRow('total') ?? 0;

            $opening = $bb_wal - $bb_sal - $bb_gal;

            $purchase = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE store_id = 0 AND tyoftrans = 1 AND pro_id = '$productId' AND war_id = '$stores_id' AND date BETWEEN '$start' AND '$endd'")->getRow('total') ?? 0;
            $sent     = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE store_id != 0 AND tyoftrans = 1 AND pro_id = '$productId' AND war_id = '$stores_id' AND date BETWEEN '$start' AND '$endd'")->getRow('total') ?? 0;
            $goodsOut = $db->query("SELECT SUM(qty) AS total FROM stock_transfer WHERE tyoftrans = 6 AND pro_id = '$productId' AND war_id = '$stores_id' AND date BETWEEN '$start' AND '$endd'")->getRow('total') ?? 0;

            $closing = $opening + $purchase - $sent - $goodsOut;

            $reportData[] = [
                'id'        => $product['id'],
                'name'      => $product['name'],
                'opening'   => floatval($opening),
                'purchase'  => floatval($purchase),
                'sent'      => floatval($sent),
                'goods_out' => floatval($goodsOut),
                'closing'   => floatval($closing)
            ];
        }

        return view('reports/warehouse_closing_stock_report', [
            'reportData'  => $reportData,
            'companyName' => $setting['companyname'],
            'storeAddress'=> $store['adresse'] ?? '',
            'startpp'     => $startpp,
            'endpp'       => $endpp
        ]);
    }

   public function getRegrtrools()
    {
        $roleName = $this->request->getPost('Range');
        $permissionModel = db_connect();
        $oyu = $permissionModel->query("SELECT * FROM permission_new WHERE nname = ?", [$roleName])->getRowArray();

        return view('permissions/role_permissions_table', ['oyu' => $oyu]);
    }

  public function deleteRegister($id)
{
    $registerModel = new \App\Models\RegisterModel();
    $saleModel = new \App\Models\SaleModel();
    $saleItemModel = new \App\Models\SaleItemModel();
    $paymentModel = new \App\Models\PaymentModel();

    // Fetch sales for the register
    $sales = $saleModel->where('register_id', $id)->findAll();

    // Delete all related sale items
    foreach ($sales as $sale) {
        $saleItemModel->where('sale_id', $sale['id'])->delete();
    }

    // Delete all related sales
    $saleModel->where('register_id', $id)->delete();

    // Delete all related payments
    $paymentModel->where('register_id', $id)->delete();

    // Finally delete the register
    $registerModel->delete($id);

    return $this->response->setJSON(['status' => 'success', 'message' => 'Register and related data deleted.']);
}


public function getYearStats($year)
{
    $db = \Config\Database::connect();

    // Revenue & tax summary
    $monthlySales = $db->query("
        SELECT
            SUM(IF(month = 1, total, 0)) AS january,
            SUM(IF(month = 1, tax, 0)) AS januarytax,
            SUM(IF(month = 1, discount, 0)) AS januarydisc,
            SUM(IF(month = 2, total, 0)) AS february,
            SUM(IF(month = 2, tax, 0)) AS februarytax,
            SUM(IF(month = 2, discount, 0)) AS februarydisc,
            SUM(IF(month = 3, total, 0)) AS march,
            SUM(IF(month = 3, tax, 0)) AS marchtax,
            SUM(IF(month = 3, discount, 0)) AS marchdisc,
            SUM(IF(month = 4, total, 0)) AS april,
            SUM(IF(month = 4, tax, 0)) AS apriltax,
            SUM(IF(month = 4, discount, 0)) AS aprildisc,
            SUM(IF(month = 5, total, 0)) AS may,
            SUM(IF(month = 5, tax, 0)) AS maytax,
            SUM(IF(month = 5, discount, 0)) AS maydisc,
            SUM(IF(month = 6, total, 0)) AS june,
            SUM(IF(month = 6, tax, 0)) AS junetax,
            SUM(IF(month = 6, discount, 0)) AS junedisc,
            SUM(IF(month = 7, total, 0)) AS july,
            SUM(IF(month = 7, tax, 0)) AS julytax,
            SUM(IF(month = 7, discount, 0)) AS julydisc,
            SUM(IF(month = 8, total, 0)) AS august,
            SUM(IF(month = 8, tax, 0)) AS augusttax,
            SUM(IF(month = 8, discount, 0)) AS augustdisc,
            SUM(IF(month = 9, total, 0)) AS september,
            SUM(IF(month = 9, tax, 0)) AS septembertax,
            SUM(IF(month = 9, discount, 0)) AS septemberdisc,
            SUM(IF(month = 10, total, 0)) AS october,
            SUM(IF(month = 10, tax, 0)) AS octobertax,
            SUM(IF(month = 10, discount, 0)) AS octoberdisc,
            SUM(IF(month = 11, total, 0)) AS november,
            SUM(IF(month = 11, tax, 0)) AS novembertax,
            SUM(IF(month = 11, discount, 0)) AS novemberdisc,
            SUM(IF(month = 12, total, 0)) AS december,
            SUM(IF(month = 12, tax, 0)) AS decembertax,
            SUM(IF(month = 12, discount, 0)) AS decemberdisc,
            SUM(total) AS total,
            SUM(tax) AS totaltax,
            SUM(discount) AS totaldiscount
        FROM (
            SELECT 
                MONTH(created_at) as month, 
                SUM(total) as total, 
                SUM(taxamount) as tax, 
                SUM(discountamount) as discount
            FROM sales
            WHERE YEAR(created_at) = ?
            GROUP BY id, MONTH(created_at)
        ) AS sales_data
    ", [$year])->getRow();

    // Expense summary
    $monthlyExpenses = $db->query("
        SELECT
            SUM(IF(month = 1, amount, 0)) AS january,
            SUM(IF(month = 2, amount, 0)) AS february,
            SUM(IF(month = 3, amount, 0)) AS march,
            SUM(IF(month = 4, amount, 0)) AS april,
            SUM(IF(month = 5, amount, 0)) AS may,
            SUM(IF(month = 6, amount, 0)) AS june,
            SUM(IF(month = 7, amount, 0)) AS july,
            SUM(IF(month = 8, amount, 0)) AS august,
            SUM(IF(month = 9, amount, 0)) AS september,
            SUM(IF(month = 10, amount, 0)) AS october,
            SUM(IF(month = 11, amount, 0)) AS november,
            SUM(IF(month = 12, amount, 0)) AS december,
            SUM(amount) AS total
        FROM (
            SELECT MONTH(date) as month, SUM(amount) as amount
            FROM expences
            WHERE YEAR(date) = ?
            GROUP BY id, MONTH(date)
        ) AS exp_data
    ", [$year])->getRow();

    // Optionally pass to view (uncomment if needed)
    // return view('reports/yearly_summary', ['sales' => $monthlySales, 'expenses' => $monthlyExpenses]);

    // Or return as JSON
    return $this->response->setJSON([
        'sales' => $monthlySales,
        'expenses' => $monthlyExpenses
    ]);
}


    /**
     * ****************** register functions ***************
     */
  public function registerDetails($id)
    {
        $db = \Config\Database::connect();

        $register = $db->table('registers')->where('id', $id)->get()->getRow();

        $user = $db->table('users')->where('id', $register->user_id)->get()->getRow();
        $closedBy = $db->table('users')->where('id', $register->closed_by)->get()->getRow();

        $paymentModes = $db->table('payment_mode')->orderBy('id')->get()->getResult();
        $paymentSummary = [];

        foreach ($paymentModes as $mode) {
            $entry = $db->table('registers_paymentmode')->where(["reg_idd" => $id, "pay_m_id" => $mode->id])->get()->getRow();
            $paymentSummary[] = [
                'name' => $mode->name,
                'expected' => $entry->expectedcash ?? 0,
                'counted' => $entry->countedcash ?? 0,
                'difference' => $entry->diffcash ?? 0,
            ];
        }

        $returnCash = [
            'return1' => $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 1])->get()->getRow(),
            'total' => $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 2])->get()->getRow(),
            'return3' => $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 3])->get()->getRow(),
        ];

        $denominations = $db->table('currencydenomination')->orderBy('name', 'desc')->get()->getResult();
        $noteCounts = [];
        $totalNotes = 0;

        foreach ($denominations as $denom) {
            $note = $db->table('registers_note_count')->where(['reg_idd' => $id, 'pay_m_id' => $denom->id])->get()->getRow();
            $noteCounts[] = [
                'name' => $denom->name,
                'counted' => $note->countedcash ?? 0,
                'value' => $note->diffcash ?? 0,
            ];
            $totalNotes += $note->diffcash ?? 0;
        }

        $data = [
            'register' => $register,
            'user' => $user,
            'closedBy' => $closedBy,
            'paymentSummary' => $paymentSummary,
            'returnCash' => $returnCash,
            'noteCounts' => $noteCounts,
            'totalNotes' => $totalNotes,
            'setting' => $this->setting,
        ];

        return view('reports/register_details', $data);
    }




   public function getStockReport()
{
    $storeInput = $this->request->getPost('stock_id');
    $id = substr($storeInput, 1);
    $stype = ($storeInput[0] === 'S') ? 'store_id' : 'warehouse_id';

    $productModel = new \App\Models\ProductModel();
    $stockModel = new \App\Models\StockModel();

    $products = $productModel->where('type', '0')->findAll();
    $stockData = [];

    foreach ($products as $product) {
        $stockRecord = $stockModel->where($stype, $id)
                                  ->where('product_id', $product->id)
                                  ->first();
        $stockQty = $stockRecord ? $stockRecord['quantity'] : 0;
        $rowClass = ($stockQty < $product->alertqt) ? 'danger' : '';

        $stockData[] = [
            'name'  => $product->name,
            'code'  => $product->code,
            'stock' => $stockQty,
            'class' => $rowClass
        ];
    }

    return view('reports/stock_report_table', [
        'stockData' => $stockData
    ]);
}


   public function getPurchasedDealerReport()
{
    $start  = $this->request->getPost('Range');
    $end    = $this->request->getPost('Range1');
    $supplierId = $this->request->getPost('suppr');

    $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
    $endDate = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

    $db = \Config\Database::connect();
    $session = session();
    $storeId = $session->get('store');

    $setting = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => $storeId])->getRowArray();

    $purchaseTypeFilter = ($setting['purchase_type'] != 2) ? "AND ppurchase_type = {$setting['purchase_type']}" : "";

    if (empty($start)) {
        $startDate = $endDate = date('Y-m-d');
    }

    $whereSupplier = '';
    if (!empty($supplierId) && $supplierId > 0) {
        $whereSupplier = " AND supplier_id = '$supplierId'";
    }

    $query = $db->query("
        SELECT * FROM purchases
        WHERE store_id = '$storeId'
        $whereSupplier
        $purchaseTypeFilter
        AND purdat BETWEEN '$startDate' AND '$endDate'
        ORDER BY purdat ASC
    ");

    $purchases = $query->getResult();

    $supplierNames = [];
    if (!empty($purchases)) {
        $supplierIds = array_column($purchases, 'supplier_id');
        $suppliers = $db->table('suppliers')->whereIn('id', $supplierIds)->get()->getResult();
        foreach ($suppliers as $s) {
            $supplierNames[$s->id] = $s->name;
        }
    }

    $viewData = [
        'companyname'  => $setting['companyname'],
        'logo'         => base_url('files/Setting/' . $setting['logo']),
        'address'      => $store['adresse'] ?? '',
        'startDate'    => date('d-m-Y', strtotime($startDate)),
        'endDate'      => date('d-m-Y', strtotime($endDate)),
        'purchases'    => $purchases,
        'suppliers'    => $supplierNames,
        'decimals'     => $setting['decimals'] ?? 2
    ];

    return view('reports/purchasedealer_report', $viewData);
}


  public function getPurchaseMonthlyReport()
{
    $request = service('request');
    $db = \Config\Database::connect();
    $session = session();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');

    $storeId = $session->get('store');
    $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
    $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    $startDate = $start ? date('Y-m-d', strtotime(str_replace('/', '-', $start))) : date('Y-m-d');
    $endDate = $end ? date('Y-m-d', strtotime(str_replace('/', '-', $end))) : date('Y-m-d');

    // Monthly grouped purchase summary
    $query = $db->query("
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
        WHERE store_id = '$storeId' AND purdat BETWEEN '$startDate' AND '$endDate'
        GROUP BY month
        ORDER BY month ASC
    ");

    $monthlyData = $query->getResult();

    // Monthly returns (grouped by same month key)
    $returnsQuery = $db->query("
        SELECT 
            SUM(total) as retnetamtt,
            DATE_FORMAT(purdat, '%Y-%m') AS month
        FROM purchases_return
        WHERE store_id = '$storeId' AND purdat BETWEEN '$startDate' AND '$endDate'
        GROUP BY month
    ");

    $returns = [];
    foreach ($returnsQuery->getResult() as $ret) {
        $returns[$ret->month] = $ret->retnetamtt;
    }

    $viewData = [
        'setting'     => $setting,
        'store'       => $store,
        'start'       => date('d-m-Y', strtotime($startDate)),
        'end'         => date('d-m-Y', strtotime($endDate)),
        'monthlyData' => $monthlyData,
        'returns'     => $returns
    ];

    return view('reports/purchase_monthly_report', $viewData);
}


public function salesReturnDailyReport()
{
    $start = $this->request->getPost('Range');
    $end = $this->request->getPost('Range1');
    $storeId = session()->get('store');

    $setting = $this->settingModel->find(1);
    $store = $this->storeModel->find($storeId);
    $retType = $setting['themblock'];

    $startDate = ($start && $start != '0') ? date("Y-m-d", strtotime(str_replace('-', '/', $start))) : date("Y-m-d");
    $endDate = ($end && $end != '0') ? date("Y-m-d", strtotime(str_replace('-', '/', $end))) : date("Y-m-d");

    $builder = db_connect()->table('returnss');
    $builder->where('storeid', $storeId)
            ->where('rsale_type', $retType)
            ->where('todate >=', $startDate)
            ->where('todate <=', $endDate)
            ->orderBy('todate', 'ASC');
    $query = $builder->get();
    $data['returns'] = $query->getResultObject();

    $data['setting'] = $setting;
    $data['store'] = $store;
    $data['start'] = $startDate;
    $data['end'] = $endDate;
    $data['totalAmount'] = array_sum(array_column($data['returns'], 'tootal'));

    return view('reports/sales_return_daily_report', $data);
}

   public function getSalesReturnSummaryReport()
    {
        $start = $this->request->getPost('Range');
        $end   = $this->request->getPost('Range1');

        $storeId = session()->get('store');
        $setting = $this->settingModel->find(1);
        $store = $this->storeModel->find($storeId);

        $startDate = ($start && $start != '0') ? date("Y-m-d", strtotime(str_replace('-', '/', $start))) : date("Y-m-d");
        $endDate = ($end && $end != '0') ? date("Y-m-d", strtotime(str_replace('-', '/', $end))) : date("Y-m-d");

        $builder = db_connect()->table('returnss');
        $builder->select("*, COUNT(re_id) AS bills, SUM(tootal) AS billamt, SUM(iteems) AS iteemst")
                ->where('storeid', $storeId)
                ->where('todate >=', $startDate)
                ->where('todate <=', $endDate)
                ->groupBy(['todate', 'storeid'])
                ->orderBy('todate', 'ASC');

        $query = $builder->get();
        $results = $query->getResult();

        $totalAmount = 0;

        echo '<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">';
        echo '<thead>
        <tr class="hideme"><th colspan="5" style="text-align:center;">' . esc($setting['companyname']) . '</th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="5">' . esc($store['adresse'] ?? '') . '</th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="5">Sales Return Summary Reports from ' . date("d-m-Y", strtotime($startDate)) . ' Till ' . date("d-m-Y", strtotime($endDate)) . '</th></tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;">Date</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">Total Bill</th>
            <th style="border: 1px solid #1c76bc;">Store Name</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">Total Qty</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">Total Bill Amount</th>
        </tr>
        </thead><tbody>';

        foreach ($results as $row) {
            $storeName = $this->storeModel->find($row->storeid)['name'] ?? '';
            $totalAmount += $row->billamt;

            echo '<tr>
                <td style="border: 1px solid #1c76bc;">' . date("d-m-Y", strtotime($row->todate)) . '</td>
                <td style="text-align:center;border: 1px solid #1c76bc;">' . $row->bills . '</td>
                <td style="border: 1px solid #1c76bc;">' . esc($storeName) . '</td>
                <td style="text-align:center;border: 1px solid #1c76bc;">' . $row->iteemst . '</td>
                <td style="text-align:right;border: 1px solid #1c76bc;">' . number_format((float)$row->billamt, $setting['decimals'], '.', '') . '</td>
            </tr>';
        }

        echo '</tbody>
        <tfoot><tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"><strong>Total</strong></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><strong>Rs. ' . number_format($totalAmount, $setting['decimals'], '.', ' ') . '</strong></td>
        </tr></tfoot>
        </table>';
    }


 public function salesretunReport()
    {
        $request = service('request');
        $db = db_connect();

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');

        $storeId = session('store');

        if (!$start || $start === '0') {
            return;
        }

        $startDate = date('Y-m-d', strtotime($start));
        $endDate = date('Y-m-d', strtotime($end));

        $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $query = "
            SELECT *, COUNT(re_id) AS bills, SUM(tootal) AS billamt, SUM(iteems) AS iteems,
                DATE_FORMAT(todate, '%Y-%m') AS MONTH
            FROM returnss
            WHERE storeid = ? AND todate BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(todate, '%Y-%m'), storeid
        ";

        $results = $db->query($query, [$storeId, $startDate, $endDate])->getResult();

        $html = '<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">';
        $html .= '<thead>
            <tr class="hideme"><th colspan="5" style="text-align:center;">' . esc($setting['companyname']) . '</th></tr>
            <tr class="hideme" style="text-align:center;"><th colspan="5">' . esc($store['adresse'] ?? '') . '</th></tr>
            <tr class="hideme" style="text-align:center;"><th colspan="5">Purchase Monthly Summary Reports from ' . date("d-m-Y", strtotime($start)) . ' Till ' . date("d-m-Y", strtotime($end)) . '</th></tr>
            <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
                <th style="border: 1px solid #1c76bc;">' . label("Date") . '</th>
                <th style="text-align:center;border: 1px solid #1c76bc;">' . label("Store") . ' ' . label("Name") . '</th>
                <th style="text-align:center;border: 1px solid #1c76bc;">' . label("Total") . ' ' . label("Bill") . '</th>
                <th style="text-align:center;border: 1px solid #1c76bc;">' . label("Total") . ' ' . label("Qty") . '</th>
                <th style="text-align:center;border: 1px solid #1c76bc;">' . label("Bill") . ' ' . label("Amount") . '</th>
            </tr>
        </thead><tbody>';

        $totalAmount = 0;

        foreach ($results as $row) {
            $storeName = $db->table('stores')->select('name')->where('id', $row->storeid)->get()->getRow('name');

            $html .= '<tr>
                <td style="border: 1px solid #1c76bc;">' . esc($row->MONTH) . '</td>
                <td style="border: 1px solid #1c76bc;">' . esc($storeName) . '</td>
                <td style="text-align:center;border: 1px solid #1c76bc;">' . esc($row->bills) . '</td>
                <td style="text-align:center;border: 1px solid #1c76bc;">' . esc($row->iteems) . '</td>
                <td style="text-align:right;border: 1px solid #1c76bc;">' . number_format((float)$row->billamt, $setting['decimals'], '.', '') . '</td>
            </tr>';

            $totalAmount += $row->billamt;
        }

        $html .= '</tbody><tr>
            <td colspan="4" style="border: 1px solid #1c76bc;"></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b>Rs.' . number_format($totalAmount, $setting['decimals'], '.', ' ') . '</b></td>
        </tr></table>';

        echo $html;
    }

   public function getsalesdailReport1()
    {
        $request = service('request');
        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');

        $setting = db_connect()->query("SELECT * FROM settings WHERE id = 1")->getRowArray();
        $store = db_connect()->query("SELECT * FROM stores WHERE id = ?", [session()->get('store')])->getRowArray();

        $startFormatted = date("d-m-Y", strtotime($start));
        $endFormatted = date("d-m-Y", strtotime($end));

        $startSql = date("Y-m-d", strtotime($start));
        $endSql = date("Y-m-d", strtotime($end));

        if ($esuppr > 0) {
            $sales = db_connect()->query("SELECT * FROM sales WHERE client_id = ? AND created_at BETWEEN ? AND ? ORDER BY id DESC", [$esuppr, $startSql, $endSql])->getResult();
            $advanceRow = db_connect()->query("SELECT SUM(paid) AS advancee FROM payements_advance WHERE cust_id = ?", [$esuppr])->getRowArray();
            $advanccf = $advanceRow['advancee'] ?? 0;
        } elseif ($esuppr === '') {
            $sales = db_connect()->query("SELECT * FROM sales WHERE created_at BETWEEN ? AND ? ORDER BY id DESC", [$startSql, $endSql])->getResult();
            $advanccf = 0;
        } else {
            $sales = db_connect()->query("SELECT * FROM sales WHERE client_id = 0 AND created_at BETWEEN ? AND ? ORDER BY id DESC", [$startSql, $endSql])->getResult();
            $advanccf = 0;
        }

        $data = [
            'sales' => $sales,
            'company' => $setting['companyname'] ?? '',
            'address' => $store['adresse'] ?? '',
            'start' => $startFormatted,
            'end' => $endFormatted,
            'currency' => $setting['currency'] ?? '',
            'decimals' => $setting['decimals'] ?? 2,
            'advance' => $advanccf,
        ];

        return view('reports/sales_daily_report', $data);
    }




public function cashinhanddailyReport()
{
    $start = $this->request->getPost('Range');
    $dateParts = explode('-', $start);
    $dateFormatted = $dateParts[2] . '-' . $dateParts[1] . '-' . $dateParts[0];

    $setting = $this->db->table('settings')->where('id', 1)->get()->getRowArray();
    $ret_idd = $setting['themblock'];

    $salesTable = $ret_idd == 0 ? 'sales' : 'dsales';
    $returnTable = 'returnss';

    $salesData = $this->db->query("
        SELECT 
            SUM(CASE WHEN status = 3 THEN total END) AS cancelledamt,
            SUM(CASE WHEN total <= paid THEN total ELSE paid END) AS totalpaid,
            SUM(CASE 
                    WHEN status = 3 AND total > paid THEN paid
                    WHEN status = 3 AND total <= paid THEN total
                END) AS totcancelled,
            SUM(total) AS totalsales_amount
        FROM {$salesTable}
        WHERE created_at = ?", [$dateFormatted])->getRowArray();

    $returnData = $this->db->query("
        SELECT 
            SUM(CASE WHEN retun_amt_stas = 0 THEN tootal END) AS amt_return,
            SUM(CASE WHEN retun_amt_stas = 1 THEN tootal END) AS exchange_return
        FROM {$returnTable}
        WHERE rsale_type = ? AND todate = ?", [$ret_idd, $dateFormatted])->getRowArray();

    $today_sales = $salesData['totalsales_amount'];
    $cancelledamt = $salesData['cancelledamt'];
    $totcancelled = $salesData['totcancelled'];
    $exchange_return = $returnData['exchange_return'];
    $totalpaid = $salesData['totalpaid'] - $exchange_return;
    $amt_return = $returnData['amt_return'];
    $cash_in_hand = $totalpaid - $totcancelled - $amt_return;

    return view('reports/cash_in_hand_daily', [
        'date' => $start,
        'today_sales' => $today_sales,
        'totalpaid' => $totalpaid,
        'cancelledamt' => $cancelledamt,
        'totcancelled' => $totcancelled,
        'exchange_return' => $exchange_return,
        'amt_return' => $amt_return,
        'cash_in_hand' => $cash_in_hand,
        'decimals' => $setting['decimals'] ?? 2
    ]);
}


 public function get_sales_report()
    {
        $request = service('request');
        $db = db_connect();

        $start     = $request->getPost('Range');
        $end       = $request->getPost('Range1');
        $supplier  = $request->getPost('suppr');
        $storeId   = $request->getPost('StoresSelect');
        $store     = $request->getPost('store');
        $payModes  = $request->getPost('selectedValues');

        $from = date('Y-m-d', strtotime(str_replace('-', '/', $start)));
        $to   = date('Y-m-d', strtotime(str_replace('-', '/', $end)));

        $setting = (new SettingModel())->find(1);
        $decimal = $setting->decimals ?? 2;
        $themblock = $setting->themblock;

        $salesTable = $themblock == 0 ? 'sales' : 'dsales';
        $itemsTable = $themblock == 0 ? 'sale_items' : 'dsale_items';
        $taxTable   = $themblock == 0 ? 'tax_summary' : 'dtax_summary';

        $storeFilter = '';
        if (!empty($storeId)) {
            $storeFilter = " AND s.store_id = " . $db->escape($storeId);
        } elseif (!empty($store)) {
            $storeFilter = " AND s.store_id = " . $db->escape($store);
        }

        $draw = (int) $request->getPost('draw');
        $saleModel = new SaleModel();

        $records = $saleModel->getFilteredSales($salesTable, $supplier, $from, $to, $itemsTable);

        $data = [];
        foreach ($records as $prd) {
            $saleId = $prd->ssid;
            $status = (int) $prd->ssstatus;
            $saleDate = explode(' ', $prd->attime)[0];

            $return = $db->query("SELECT SUM(tootal) AS return_total FROM returnss WHERE re_sales_id = ? AND rsale_type = ?", [$saleId, $themblock])->getRow();
            $returnAmount = $return->return_total ?? 0;

            $taxes = $db->query("SELECT taxname, taxfrom FROM {$taxTable} WHERE salesid = ?", [$saleId])->getResult();
            $taxHtml = '';
            $totalTax = 0;
            foreach ($taxes as $tax) {
                $taxHtml .= $tax->taxname . '-' . number_format($tax->taxfrom, $decimal, '.', '') . '<br>';
                $totalTax += $tax->taxfrom;
            }

            $statusText = match ($status) {
                3 => "<span class='cancel'>Cancel</span>",
                default => ($returnAmount > 0 ? "<span class='return'>Return</span>" : "<span class='sales'>Sales</span>")
            };

            $cancelAmt = $status === 3 ? $prd->total : 0;

            $data[] = [
                $saleId,
                $prd->ssname,
                $prd->cname,
                date('d-m-Y', strtotime($saleDate)),
                $prd->totalitems,
                number_format($prd->subtotal, $decimal, '.', ''),
                number_format($totalTax, $decimal, '.', ''),
                $taxHtml,
                number_format(($prd->discount_indujul + $prd->discountamount), $decimal, '.', ''),
                number_format($prd->disamtssh, $decimal, '.', ''),
                number_format($prd->total, $decimal, '.', ''),
                $statusText,
                number_format($cancelAmt, $decimal, '.', ''),
                number_format($prd->recivamt2, $decimal, '.', ''), // Exchange Amount
                $returnAmount,
                '0.00' // Dummy for future enhancements
            ];
        }

        $output = [
            'draw'            => $draw,
            'recordsTotal'    => $saleModel->getAllCount($salesTable, $supplier, $from, $to),
            'recordsFiltered' => $saleModel->getFilteredCount($salesTable, $supplier, $from, $to),
            'data'            => $data
        ];

        return $this->response->setJSON($output);
    }



 public function getsalesdailReportnew1()
    {
        $request = service('request');

        $start  = $request->getPost('Range');
        $end    = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');
        $pamode_id = $request->getPost('selectedValues');

        $startDate = date('Y-m-d', strtotime(str_replace('-', '/', $start)));
        $endDate = date('Y-m-d', strtotime(str_replace('-', '/', $end)));

        $saleModel = new SaleModel();
        $fetch_data = $saleModel->getSalesBetweenDates($startDate, $endDate, $esuppr);

        $data = [];

        foreach ($fetch_data as $row) {
            $data[] = [
                $row['clientname'],
                (!empty($row['created_at']) ? date('d.m.Y', strtotime($row['created_at'])) : ''),
                $row['subtotal'],
                $row['total'],
                $row['created_by'],
                (!empty($row['attime']) ? date('d.m.Y', strtotime($row['attime'])) : '')
            ];
        }

        $output = [
            'draw' => intval($request->getPost('draw')),
            'recordsTotal' => $saleModel->getSalesCount($startDate, $endDate, $esuppr),
            'recordsFiltered' => $saleModel->getSalesCount($startDate, $endDate, $esuppr),
            'data' => $data
        ];

        return $this->response->setJSON($output);
    }


       public function getsalesdailReport()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');
        $pamode_id = $request->getPost('selectedValues');
        $storeSelect = $request->getPost('StoresSelect');

        $settings = $db->query("SELECT logo, themblock, companyname FROM settings WHERE id = 1")->getRow();
        $storeDetails = $db->query("SELECT adresse FROM stores WHERE id = ?", [session('store')])->getRow();

        $salesTable = $settings->themblock == 0 ? 'sales' : 'dsales';
        $saleItemsTable = $settings->themblock == 0 ? 'sale_items' : 'dsale_items';
        $taxSummaryTable = $settings->themblock == 0 ? 'tax_summary' : 'dtax_summary';
        $ret_idd = $settings->themblock;

        $from = date('Y-m-d', strtotime(str_replace('-', '/', $start)));
        $to = date('Y-m-d', strtotime(str_replace('-', '/', $end)));

        $rtttfc = $storeSelect ? "registers.store_id = $storeSelect AND " : '';

        if ($esuppr > 0) {
            $query = "SELECT $salesTable.*, $salesTable.id as ssid, $salesTable.status as ssstatus, customers.name as cname, stores.name as ssname
                    FROM $salesTable
                    LEFT JOIN registers ON $salesTable.register_id = registers.id
                    LEFT JOIN customers ON $salesTable.client_id = customers.id
                    LEFT JOIN stores ON registers.store_id = stores.id
                    WHERE {$rtttfc} client_id = ? AND $salesTable.created_at BETWEEN ? AND ?
                    ORDER BY $salesTable.id DESC";
            $product_list = $db->query($query, [$esuppr, $from, $to])->getResult();
        } elseif ($esuppr === '') {
            $query = "SELECT $salesTable.*, $salesTable.id as ssid, $salesTable.status as ssstatus, customers.name as cname, stores.name as ssname
                    FROM $salesTable
                    LEFT JOIN registers ON $salesTable.register_id = registers.id
                    LEFT JOIN customers ON $salesTable.client_id = customers.id
                    LEFT JOIN stores ON registers.store_id = stores.id
                    WHERE {$rtttfc} $salesTable.created_at BETWEEN ? AND ?
                    ORDER BY $salesTable.id DESC";
            $product_list = $db->query($query, [$from, $to])->getResult();
        } else {
            $query = "SELECT $salesTable.*, $salesTable.id as ssid, $salesTable.status as ssstatus, customers.name as cname, stores.name as ssname
                    FROM $salesTable
                    LEFT JOIN registers ON $salesTable.register_id = registers.id
                    LEFT JOIN customers ON $salesTable.client_id = customers.id
                    LEFT JOIN stores ON registers.store_id = stores.id
                    WHERE {$rtttfc} client_id = 0 AND $salesTable.created_at BETWEEN ? AND ?
                    ORDER BY $salesTable.id DESC";
            $product_list = $db->query($query, [$from, $to])->getResult();
        }

        $payment_modes = $db->query("SELECT * FROM payment_mode WHERE id != 1 ORDER BY id ASC")->getResult();

        // Load view and pass data
        return view('reports/sales_daily_report_table', [
            'product_list' => $product_list,
            'payment_modes' => $payment_modes,
            'settings' => $settings,
            'storeDetails' => $storeDetails,
            'start' => $start,
            'end' => $end,
            'pamode_id' => $pamode_id,
            'ret_idd' => $ret_idd,
            'salesTable' => $salesTable,
            'saleItemsTable' => $saleItemsTable,
            'taxSummaryTable' => $taxSummaryTable,
        ]);
    }






  public function getprossReport()
{
    $db = \Config\Database::connect();
    $setting = $db->table('settings')->where('id', 1)->get()->getRow();
    $storeId = session()->get('store');
    $store = $db->table('stores')->where('id', $storeId)->get()->getRow();

    $start = $this->request->getPost('Range');
    $end = $this->request->getPost('Range1');
    $esuppr = $this->request->getPost('suppr');

    if (!$start || $start === '0') {
        return; // skip if no date range provided
    }

    $fromDate = date('Y-m-d', strtotime(str_replace('-', '/', $start)));
    $toDate = date('Y-m-d', strtotime(str_replace('-', '/', $end)));

    $saleItemsBuilder = $db->table('sale_items')
        ->where("`date` >=", $fromDate)
        ->where("`date` <=", $toDate);

    if ($esuppr > 0) {
        $saleItemsBuilder->where('product_id', $esuppr);
    }

    $saleItemsBuilder->orderBy('id', 'desc');
    $saleItems = $saleItemsBuilder->get()->getResult();

    $rows = [];
    $totalQty = $totalDiscount = $totalSubtotal = 0;

    foreach ($saleItems as $item) {
        $sale = $db->table('sales')->where('id', $item->sale_id)->get()->getRow();
        $product = $db->table('products')->where('id', $item->product_id)->get()->getRow();

        $billNo = $sale->yyear . str_pad($item->sale_id, 5, '0', STR_PAD_LEFT);
        $hsn = $product->hsn ?? '';
        $qty = $item->qt;
        $rate = $item->price;
        $discount = $item->dis_amt;
        $amount = $item->subtotal;
        $date = date('d-m-Y', strtotime($item->date));

        $rows[] = [
            'bill_no' => $billNo,
            'hsn' => $hsn,
            'date' => $date,
            'qty' => $qty,
            'rate' => number_format($rate, $this->setting->decimals, '.', ''),
            'discount' => number_format($discount, $this->setting->decimals, '.', ''),
            'amount' => number_format($amount, $this->setting->decimals, '.', ''),
        ];

        $totalQty += $qty;
        $totalDiscount += $discount;
        $totalSubtotal += $amount;
    }

    return view('reports/pross_report_table', [
        'rows' => $rows,
        'companyname' => $setting->companyname,
        'adresse' => $store->adresse ?? '',
        'start' => $start,
        'end' => $end,
        'totalQty' => $totalQty,
        'totalDiscount' => $totalDiscount,
        'totalSubtotal' => $totalSubtotal,
        'currency' => $this->setting->currency ?? 'Rs',
        'decimals' => $this->setting->decimals ?? 2
    ]);
}



    public function getprossdReport()
    {
        $db = Database::connect();
        $setting = $db->table('settings')->where('id', 1)->get()->getRow();
        $store = $db->table('stores')->where('id', session()->get('store'))->get()->getRow();

        $start = $this->request->getPost('Range');
        $end = $this->request->getPost('Range1');
        $productId = $this->request->getPost('suppr');

        if (!$start || $start === '0') {
            return;
        }

        $fromDate = date('Y-m-d', strtotime(str_replace('-', '/', $start)));
        $toDate = date('Y-m-d', strtotime(str_replace('-', '/', $end)));

        $query = $db->table('sale_items')
            ->select("product_id, date, SUM(qt) AS qqt, SUM(subtotal) AS ssubtotal, SUM(cgst) AS ccgst, SUM(sgst) AS ssgst, SUM(dis_amt) AS ddis_amt, COUNT(*) AS bills, price")
            ->where('date >=', $fromDate)
            ->where('date <=', $toDate)
            ->groupBy(['date', 'product_id']);

        if ($productId) {
            $query->where('product_id', $productId);
        }

        $saleItems = $query->get()->getResult();

        $rows = [];
        $totalQty = $totalDiscount = $totalAmount = 0;

        foreach ($saleItems as $item) {
            $product = $db->table('products')->where('id', $item->product_id)->get()->getRow();
            $hsn = $product->hsn ?? '';

            $rows[] = [
                'bills' => $item->bills,
                'hsn' => $hsn,
                'date' => date('d-m-Y', strtotime($item->date)),
                'qty' => $item->qqt,
                'price' => number_format($item->price, $setting->decimals, '.', ''),
                'discount' => number_format($item->ddis_amt, $setting->decimals, '.', ''),
                'amount' => number_format($item->price * $item->qqt, $setting->decimals, '.', '')
            ];

            $totalQty += $item->qqt;
            $totalDiscount += $item->ddis_amt;
            $totalAmount += $item->price * $item->qqt;
        }

        return view('reports/pross_summary_report_table', [
            'rows' => $rows,
            'companyname' => $setting->companyname,
            'adresse' => $store->adresse ?? '',
            'start' => $start,
            'end' => $end,
            'totalQty' => $totalQty,
            'totalDiscount' => $totalDiscount,
            'totalAmount' => $totalAmount,
            'currency' => $setting->currency ?? 'Rs',
            'decimals' => $setting->decimals ?? 2
        ]);
    }


    public function getprossmReport()
    {
        $db = Database::connect();
        $request = service('request');

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');
        $productId = $request->getPost('suppr');

        if (!$start || $start == '0') {
            return ''; // Exit if date range not provided
        }

        $la32 = date('Y-m-d', strtotime(str_replace('-', '/', $start)));
        $laxg = date('Y-m-d', strtotime(str_replace('-', '/', $end)));

        $builder = $db->table('sale_items')
            ->select("product_id, DATE_FORMAT(date, '%Y-%m') as month, SUM(qt) as qqt, SUM(subtotal) as ssubtotal, SUM(cgst) as ccgst, SUM(sgst) as ssgst, SUM(dis_amt) as ddis_amt, COUNT(*) as bills, price")
            ->where('date >=', $la32)
            ->where('date <=', $laxg)
            ->groupBy("DATE_FORMAT(date, '%Y-%m'), product_id");

        if ($productId !== null && $productId !== '') {
            $builder->where('product_id', $productId);
        }

        $reportData = $builder->get()->getResult();

        $company = $db->table('settings')->where('id', 1)->get()->getRow();
        $storeId = session('store');
        $store = $db->table('stores')->where('id', $storeId)->get()->getRow();

        return view('reports/monthly_hsn_report_table', [
            'company' => $company,
            'store' => $store,
            'reportData' => $reportData,
            'start' => $start,
            'end' => $end,
        ]);
    }




public function getTotalSalesReport()
{
    helper(['form', 'url']);
    $db = \Config\Database::connect();
    $request = service('request');

    $start  = $request->getPost('Range');
    $end    = $request->getPost('Range1');
    $esuppr = $request->getPost('suppr');
    $storeSelect = $request->getPost('StoresSelect');

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => session('store')])->getRowArray();

    $salesTable = $settings['themblock'] == 0 ? 'sales' : 'dsales';
    $registerJoin = "INNER JOIN registers ON {$salesTable}.register_id = registers.id";

    $startDate = date('Y-m-d', strtotime(str_replace('-', '/', $start)));
    $endDate = date('Y-m-d', strtotime(str_replace('-', '/', $end)));

    $where = [];
    if ($storeSelect > 0) {
        $where[] = "registers.store_id = {$storeSelect}";
    }

    if (!empty($esuppr)) {
        $where[] = "{$salesTable}.client_id = '{$esuppr}'";
    } elseif ($esuppr === '0') {
        $where[] = "{$salesTable}.client_id = 0";
    }

    $where[] = "{$salesTable}.created_at BETWEEN '{$startDate}' AND '{$endDate}'";
    $whereStr = implode(' AND ', $where);

    $query = "
        SELECT 
            {$salesTable}.id as ssid,
            COUNT(*) as tbils,
            SUM(totalitems) as noofitem,
            SUM(subtotal) as toot,
            SUM(taxamount) as cgst,
            SUM(sgsttaxamt) as sgst,
            SUM(discountamount) as disct,
            SUM(paid) as ttot,
            SUM(CASE WHEN paidmethod = 0 THEN paid ELSE 0 END) as cashh,
            SUM(CASE WHEN paidmethod = 1 THEN paid ELSE 0 END) as cardd,
            SUM(CASE WHEN {$salesTable}.status = 3 THEN total ELSE 0 END) as total_can,
            SUM(CASE WHEN paidmethod = 10 THEN paid ELSE 0 END) as coupp,
            SUM(CASE WHEN paidmethod = 6 THEN paid ELSE 0 END) as ppnt,
            {$salesTable}.created_at
        FROM {$salesTable}
        {$registerJoin}
        WHERE {$whereStr}
        GROUP BY {$salesTable}.created_at
    ";

    $salesData = $db->query($query)->getResultObject();

    $returnQuery = $db->query("
        SELECT todate, SUM(tootal) as rretunn
        FROM returnss 
        WHERE rsale_type = '{$settings['themblock']}' 
          AND todate BETWEEN '{$startDate}' AND '{$endDate}'
        GROUP BY todate
    ")->getResultArray();

    // Fetch item-level tax for each date
    $taxesByDate = [];
    foreach ($salesData as $row) {
        $saleItems = $db->table('sale_items')->where('date', $row->created_at)->get()->getResultArray();
        $taxSummary = ['cgst' => 0, 'sgst' => 0, 'igst' => 0];
        foreach ($saleItems as $item) {
            $taxSummary['cgst'] += ($item['subtotal2'] * $item['cgst']) / 100;
            $taxSummary['sgst'] += ($item['subtotal2'] * $item['sgst']) / 100;
            $taxSummary['igst'] += ($item['subtotal2'] * $item['igstt']) / 100;
        }
        $taxesByDate[$row->created_at] = $taxSummary;
    }

    $data = [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'logoPath' => base_url('files/Setting/' . $settings['logo']),
        'startDate' => $start,
        'endDate' => $end,
        'salesData' => $salesData,
        'taxesByDate' => $taxesByDate,
        'returnTotals' => array_column($returnQuery, 'rretunn', 'todate'),
        'decimals' => $settings['decimals']
    ];

    return view('reports/total_sales_report_table', $data);
}


public function getMonthlySalesSummary()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');
    $esuppr = $request->getPost('suppr');
    $storeSelect = $request->getPost('StoresSelect');

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => session('store')])->getRowArray();

    $salesTable = $settings['themblock'] == 0 ? 'sales' : 'dsales';
    $registerJoin = "INNER JOIN registers ON {$salesTable}.register_id = registers.id";
    $ret_idd = $settings['themblock'];
    $decimals = $settings['decimals'];

    $startDate = date('Y-m-d', strtotime($start));
    $endDate = date('Y-m-d', strtotime($end));

    $conditions = [];
    if ($storeSelect > 0) {
        $conditions[] = "registers.store_id = {$storeSelect}";
    }

    if ($esuppr !== '') {
        $conditions[] = "{$salesTable}.client_id = '{$esuppr}'";
    } elseif ($esuppr === '0') {
        $conditions[] = "{$salesTable}.client_id = 0";
    }

    $conditions[] = "{$salesTable}.created_at BETWEEN '{$startDate}' AND '{$endDate}'";
    $whereStr = implode(' AND ', $conditions);

    $query = "
        SELECT 
            {$salesTable}.id as ssid,
            {$salesTable}.created_at,
            SUM(paid) as ttot,
            SUM(CASE WHEN {$salesTable}.status = 3 THEN paid ELSE 0 END) as total_can,
            SUM(CASE WHEN paidmethod = 0 THEN paid ELSE 0 END) as cashh,
            SUM(CASE WHEN paidmethod LIKE '1~%' THEN paid ELSE 0 END) as cardd,
            SUM(CASE WHEN paidmethod LIKE '10~%' THEN paid ELSE 0 END) as coupp,
            SUM(CASE WHEN paidmethod LIKE '6~%' THEN paid ELSE 0 END) as ppnt,
            COUNT(*) as tbils,
            SUM(totalitems) as noofitem,
            SUM(subtotal) as toot,
            SUM(taxamount) as cgst,
            SUM(sgsttaxamt) as sgst,
            SUM(discountamount) as disct
        FROM {$salesTable}
        {$registerJoin}
        WHERE {$whereStr}
        GROUP BY DATE_FORMAT({$salesTable}.created_at, '%Y%m')
    ";

    $salesData = $db->query($query)->getResultObject();

    // Additional monthly tax/return lookups
    $returns = [];
    $taxesByMonth = [];

    foreach ($salesData as $prd) {
        $monthKey = date('Y-m', strtotime($prd->created_at));
        $returnQuery = $db->query("
            SELECT SUM(tootal) as rretunn 
            FROM returnss 
            WHERE rsale_type = '{$ret_idd}' AND todate LIKE '{$monthKey}-%'
        ")->getRowArray();
        $returns[$monthKey] = $returnQuery['rretunn'] ?? 0;

        $saleItems = $db->table('sale_items')
            ->like('date', "{$monthKey}%", 'after')
            ->get()
            ->getResultArray();

        $taxSummary = ['cgst' => 0, 'sgst' => 0, 'igst' => 0];
        foreach ($saleItems as $item) {
            $taxSummary['cgst'] += ($item['subtotal2'] * (int)$item['cgst']) / 100;
            $taxSummary['sgst'] += ($item['subtotal2'] * (int)$item['sgst']) / 100;
            $taxSummary['igst'] += ($item['subtotal2'] * (int)$item['igstt']) / 100;
        }

        $taxesByMonth[$monthKey] = $taxSummary;
    }

    $data = [
        'company' => $settings['companyname'],
        'address' => $store['adresse'] ?? '',
        'startDate' => $start,
        'endDate' => $end,
        'salesData' => $salesData,
        'returns' => $returns,
        'taxesByMonth' => $taxesByMonth,
        'decimals' => $decimals
    ];

    return view('reports/monthly_sales_summary_table', $data);
}




public function getProfitDailyReport()
{
    $request = service('request');
    $db = \Config\Database::connect();

    $start = $request->getPost('Range');
    $end = $request->getPost('Range1');

    $storeId = session('store');

    $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
    $store = $db->table('stores')->getWhere(['id' => $storeId])->getRowArray();

    $decimals = $settings['decimals'];
    $companyName = $settings['companyname'];
    $storeAddress = $store['adresse'] ?? '';

    $startDate = date('Y-m-d', strtotime($start));
    $endDate = date('Y-m-d', strtotime($end));

    $reportRows = [];

    $totals = [
        'purchase' => 0,
        'sales' => 0,
        'cancel' => 0,
        'return' => 0,
        'goods_out' => 0,
        'profit' => 0,
    ];

    while (strtotime($startDate) <= strtotime($endDate)) {
        $purchase = $sales = $cancel = $return = $goodsOut = 0;

        $purchaseRow = $db->query("SELECT SUM(total) as pur_amt FROM purchases WHERE store_id = '{$storeId}' AND date = '{$startDate}'")->getRowArray();
        $purchase = $purchaseRow['pur_amt'] ?? 0;

        $salesRow = $db->query("
            SELECT SUM(total) as sal_total 
            FROM sales 
            INNER JOIN registers ON registers.id = sales.register_id 
            WHERE registers.store_id = '{$storeId}' AND created_at = '{$startDate}'
        ")->getRowArray();
        $sales = $salesRow['sal_total'] ?? 0;

        $cancelRow = $db->query("
            SELECT SUM(total) as sal_total 
            FROM sales 
            INNER JOIN registers ON registers.id = sales.register_id 
            WHERE registers.store_id = '{$storeId}' AND created_at = '{$startDate}' AND status = 3
        ")->getRowArray();
        $cancel = $cancelRow['sal_total'] ?? 0;

        $returnRow = $db->query("SELECT SUM(sl_subtotal) as ren_tot FROM retunn_items WHERE store_idsi = '{$storeId}' AND to_datte = '{$startDate}'")->getRowArray();
        $return = $returnRow['ren_tot'] ?? 0;

        $goodsOutRow = $db->query("SELECT SUM(totprice) as ggod_tota FROM goodsitems WHERE datea = '{$startDate}'")->getRowArray();
        $goodsOut = $goodsOutRow['ggod_tota'] ?? 0;

        $profit = $sales - $purchase - $cancel - $return + $goodsOut;

        $reportRows[] = [
            'date' => $startDate,
            'purchase' => $purchase,
            'sales' => $sales,
            'cancel' => $cancel,
            'return' => $return,
            'goods_out' => $goodsOut,
            'profit' => $profit,
        ];

        $totals['purchase'] += $purchase;
        $totals['sales'] += $sales;
        $totals['cancel'] += $cancel;
        $totals['return'] += $return;
        $totals['goods_out'] += $goodsOut;
        $totals['profit'] += $profit;

        $startDate = date('Y-m-d', strtotime("+1 day", strtotime($startDate)));
    }

    $data = [
        'company' => $companyName,
        'address' => $storeAddress,
        'start' => $start,
        'end' => $end,
        'rows' => $reportRows,
        'totals' => $totals,
        'decimals' => $decimals
    ];

    return view('reports/profit_daily_report_table', $data);
}

}
