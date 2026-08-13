<?php

namespace App\Controllers;

use App\Models\InvoiceModel;
use App\Models\InvoiceqtModel;
use App\Models\UserModel;
use App\Models\SettingModel;
use App\Models\SaleqModel;
use App\Models\SaleItemqModel;
use App\Models\CustomerModel;
use CodeIgniter\Controller;
use CodeIgniter\HTTP\ResponseInterface;
use App\Models\SaleItemModel;
use App\Models\SaleModel;
use App\Models\Payement;
use App\Models\RegisterModel;
use App\Models\StoreModel;
use Stripe\Stripe;
use Stripe\Charge;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Invoicesq extends BaseController
{
    protected $invoice;
    protected $invoiceqt;
    protected $user;
    protected $setting;
    protected $register;

    public function __construct()
    {
        helper(['form', 'url']);

        $this->invoice = new InvoiceModel();
        $this->invoiceqt = new InvoiceqtModel();
        $this->user = session()->get('user_id') ? (new UserModel())->find(session()->get('user_id')) : false;
        $this->setting = (new SettingModel())->find(1);
        $this->register = session()->get('register') ?? false;
    }

    public function ajaxList()
    {
        $invoiceModel = new \App\Models\InvoiceqtModel(); // adjust to your model name
        $settingModel = new \App\Models\SettingModel();
        $setting = $settingModel->find(1);
        $user = session()->get('user_id');

        $list = $invoiceModel->get_datatables(); // assumes you implemented get_datatables() in CI4 model
        $data = [];
        $no = $this->request->getPost('start');

        foreach ($list as $invoice) {
            $no++;
            $row = [];

            $row[] = date("d-m-Y", strtotime($invoice->created_at));
            $row[] = $invoice->id . '/' . $invoice->yyear;
            $row[] = $invoice->totalitems;
            $row[] = $invoice->subtotal;

            if ($setting->disc_all == 1) {
                $row[] = ($invoice->discount * $invoice->subtotal) / 100;
            }

            if ($setting->disc_pro == 1) {
                $row[] = $invoice->discount_indujul;
            }

            // fetch store name
            $storeName = '';
            $registerRow = db_connect()->table('registers')->select('store_id')->where('id', $invoice->register_id)->get()->getRow();
            if ($registerRow) {
                $storeRow = db_connect()->table('stores')->select('name')->where('id', $registerRow->store_id)->get()->getRow();
                if ($storeRow) {
                    $storeName = $storeRow->name;
                }
            }

            $row[] = number_format((float)$invoice->total, $setting->decimals, '.', '');
            $row[] = $invoice->clientname;
            $row[] = $invoice->created_by;
            $row[] = $storeName;

            // status
            $statusLabel = match ($invoice->status) {
                1 => 'unpaid',
                2 => 'Partiallypaid',
                3 => 'Canceled',
                default => 'paid'
            };
            $row[] = '<span class="' . $statusLabel . '">' . label($statusLabel) . '<span>';

            // actions (simplified; you can rebuild more with roles)
            $row[] = '<div class="btn-group">
            <a class="btn btn-primary" href="javascript:void(0)" onclick="showInvoice(' . "'" . $invoice->id . "'" . ')"><i class="fa fa-sticky-note"></i></a>
            <a class="btn btn-primary" href="javascript:void(0)" onclick="showTicket(' . "'" . $invoice->id . "'" . ')"><i class="fa fa-ticket"></i></a>
        </div>';

            $data[] = $row;
        }

        return $this->response->setJSON([
            "draw" => $this->request->getPost('draw'),
            "recordsTotal" => $invoiceModel->countAll(),
            "recordsFiltered" => $invoiceModel->countFiltered(),
            "data" => $data
        ]);
    }
    public function ajaxListqtt()
    {
        $invoiceqtModel = new \App\Models\InvoiceqtModel();
        $settingModel = new \App\Models\SettingModel();
        $setting = $settingModel->find(1);
        $session = session();
        $user = (new \App\Models\UserModel())->find($session->get('user_id'));
        $userRole = $user->role ?? '';

        $list = $invoiceqtModel->get_datatables();
        $data = [];
        $no = $this->request->getPost('start');

        foreach ($list as $invoice) {
            $no++;
            $row = [];

            $row[] = date("d-m-Y", strtotime($invoice->created_at));
            $row[] = $invoice->id . '/' . $invoice->yyear;
            $row[] = $invoice->clientname;
            $row[] = $invoice->subtotal;

            if ($setting->disc_all == 1) {
                $row[] = ($invoice->discount * $invoice->subtotal) / 100;
            }

            if ($setting->disc_pro == 1) {
                $row[] = $invoice->discount_indujul;
            }

            $row[] = number_format((float)$invoice->total, $setting->decimals, '.', '');
            $row[] = $invoice->created_by;
            $row[] = $invoice->totalitems;

            // Determine status
            $statusLabel = match ($invoice->status) {
                1 => 'unpaid',
                2 => 'Partiallypaid',
                default => 'paid',
            };
            $row[] = '<span class="' . $statusLabel . '">' . label($statusLabel) . '<span>';

            // Permissions
            $perm = db_connect()->table('permission_new')->where('nname', $userRole)->get()->getRowArray();
            $action = [];

            $action[] = '<div class="btn-group">
            <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown"><i class="fa fa-cog fa-fw"></i></a>
            <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown"><span class="fa fa-caret-down"></span></a>
            <ul class="dropdown-menu">
                <li><a href="javascript:void(0)" onclick="showInvoice4(\'' . $invoice->id . '\')"><i class="fa fa-sticky-note"></i> ' . label("invoice") . ' A4</a></li>
                <li><a href="javascript:void(0)" onclick="showInvoice(\'' . $invoice->id . '\')"><i class="fa fa-sticky-note"></i> ' . label("invoice") . ' A5</a></li>';

            if ($perm['ssd'] == "1") {
                $action[] = '<li style="margin-top: -20px;"><a href="javascript:void(0)" onclick="delete_invoice(\'' . $invoice->id . '\')"><i class="fa fa-trash-o fa-fw"></i> ' . label("Delete") . '</a></li>';
            }

            $action[] = '</ul></div>';

            $row[] = $action;

            $data[] = $row;
        }

        return $this->response->setJSON([
            "draw" => $this->request->getPost('draw'),
            "recordsTotal" => $invoiceqtModel->countAll(),
            "recordsFiltered" => $invoiceqtModel->countFiltered(),
            "data" => $data,
        ]);
    }

    public function sale_cancel()
    {
        $sales = model(SaleModel::class)->where('status', 3)->findAll();

        foreach ($sales as $sale) {
            model(SaleItemModel::class)
                ->where('sale_id', $sale['id'])
                ->set(['cancel_status' => 1])
                ->update();
        }

        return $this->response->setJSON(['status' => 'success']);
    }

    public function sale_items_storeid()
    {
        $sales = model(SaleModel::class)->findAll();

        foreach ($sales as $sale) {
            $register = model(RegisterModel::class)->find($sale['register_id']);

            if ($register) {
                model(SaleItemModel::class)
                    ->where('sale_id', $sale['id'])
                    ->set(['store_irrdd' => $register['store_id']])
                    ->update();
            }
        }

        return $this->response->setJSON(['status' => 'success']);
    }

    public function return_storeid()
    {
        $returns = model(ReturnModel::class)->findAll();

        foreach ($returns as $return) {
            model(ReturnItemModel::class)
                ->where('ret_id', $return['re_id'])
                ->set(['store_idsi' => $return['storeid']])
                ->update();
        }

        return $this->response->setJSON(['status' => 'success']);
    }

    public function return_update()
    {
        $items = model(ReturnItemModel::class)->findAll();

        foreach ($items as $item) {
            $to_datte = date('Y-m-d', strtotime($item['todatt']));
            $saleItem = model(SaleItemModel::class)->find($item['sl_id']);

            if ($saleItem) {
                model(ReturnItemModel::class)
                    ->where('idd', $item['idd'])
                    ->set([
                        'prodd_ids' => $saleItem['product_id'],
                        'to_datte' => $to_datte
                    ])->update();
            }
        }

        return $this->response->setJSON(['status' => 'success']);
    }

    public function sale_items_delete()
    {
        model(SaleItemModel::class)->where('store_irrdd', 0)->delete();
        return $this->response->setJSON(['status' => 'success']);
    }

    public function ajax_delete($id)
    {
        model(SaleqModel::class)
            ->where('id', $id)
            ->set([
                'status' => 3,
                'modified_at' => date('Y-m-d')
            ])->update();

        model(SaleItemqModel::class)
            ->where('sale_id', $id)
            ->set(['cancel_status' => 1])
            ->update();

        return $this->response->setJSON(['status' => true]);
    }
    public function qajaxDelete($id)
    {
        helper('text');
        $db = \Config\Database::connect();
        $session = session();

        // Assuming you have a model for invoiceqt:
        $invoiceModel = new \App\Models\InvoiceQtModel();
        $invoiceModel->delete($id);

        // Get store id from session
        $store = $session->get('store');

        // Delete associated sale_itemqs entries
        $builder = $db->table('sale_itemqs');
        $items = $builder->where('sale_id', $id)->orderBy('id', 'ASC')->get()->getResult();

        foreach ($items as $item) {
            $builder->where('id', $item->id)->delete();
        }

        return $this->response->setJSON(['status' => true]);
    }
    public function showTicket4($id)
    {
        $db = \Config\Database::connect();

        $sale = (new \App\Models\SaleModel())->find($id);
        $posales = (new \App\Models\SaleItemModel())
            ->where('sale_id', $id)
            ->findAll();
        $client = (new \App\Models\CustomerModel())->find($sale['client_id']);

        $register = $db->table('registers')->where('id', $sale['register_id'])->get()->getRowArray();
        $store = $db->table('stores')->where('id', $register['store_id'])->get()->getRowArray();

        $customerAddress = '';
        if ($sale['client_id'] > 0) {
            $cust = $db->table('customers')->where('id', $sale['client_id'])->get()->getRowArray();
            $customerAddress = $cust['customeraddress'] ?? '';
        }

        $settings = (new \App\Models\SettingModel())->find(1);

        // Additional DB calls if needed for taxes, etc.
        $taxSummary = [];
        if ($settings['gst_tax'] == 1 && $sale['kms'] == 1) {
            $taxSummary = $db->table('tax_summary')->where('salesid', $id)->get()->getResultArray();
        }

        return view('invoices/ticket4', [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'store' => $store,
            'settings' => $settings,
            'customerAddress' => $customerAddress,
            'taxSummary' => $taxSummary,
        ]);
    }
    public function showTicket2($id)
    {
        $db = \Config\Database::connect();

        $sale = (new \App\Models\SaleModel())->find($id);
        $posales = (new \App\Models\SaleItemModel())->where('sale_id', $id)->findAll();
        $client = (new \App\Models\CustomerModel())->find($sale['client_id']);
        $setting = (new \App\Models\SettingModel())->find(1);

        $register = $db->table('registers')->where('id', $sale['register_id'])->get()->getRowArray();
        $store = $db->table('stores')->where('id', $register['store_id'])->get()->getRowArray();

        // Print Setup
        $printSetup = $db->table('print_setup')->where('dp_id', 4)->get()->getRowObject();
        $ticketWidth = $printSetup->dp_pt_width . "mm";

        // Customer address
        $customerAddress = '';
        if ($sale['client_id'] > 0) {
            $customerData = $db->table('customers')->where('id', $sale['client_id'])->get()->getRowArray();
            $customerAddress = $customerData['customeraddress'] ?? '';
        }

        // Payment method
        $payMethodParts = explode('~', $sale['paidmethod']);
        $paymentModeId = $payMethodParts[0] ?? '';
        $paymentModeRef = $payMethodParts[1] ?? '';
        $paymentModeExtra = $payMethodParts[2] ?? '';

        $paymentModeName = '';
        if ($paymentModeId == 1) {
            $paymentModeName = label("Cash");
        } elseif ($paymentModeId == 2) {
            $paymentModeName = label("CreditCard");
        } else {
            $mode = $db->table('payment_mode')->where('id', $paymentModeId)->get()->getRowArray();
            $paymentModeName = $mode['name'] ?? label("Other");
        }

        // Last sales and payment data
        $latestSale = $db->table('sales')->where('id', $sale['id'])->orderBy('id', 'desc')->get()->getRowArray();
        $paymentDetails = $db->table('payements')->where([
            'sale_id' => $sale['id'],
            'paidmethod' => 4
        ])->orderBy('id', 'desc')->get()->getRowArray();

        // Tax summary
        $taxSummary = $db->table('tax_summary')->where('salesid', $id)->get()->getResultArray();

        // Product details for tax calculations
        $productDetails = [];
        foreach ($posales as $item) {
            $productDetails[$item['product_id']] = $db->table('products')->where('id', $item['product_id'])->get()->getRowArray();
        }

        // Tax rate list for each product
        $taxProList = [];
        foreach ($posales as $item) {
            $taxProList[$item['product_id']] = $db->table('taxprolist')
                ->where(['proid' => $item['product_id'], 'custtype' => $sale['custtype'] ?? 0])
                ->get()->getResultArray();
        }

        return view('invoices/ticket2', [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'setting' => $setting,
            'register' => $register,
            'store' => $store,
            'print' => $printSetup,
            'customerAddress' => $customerAddress,
            'paymentModeName' => $paymentModeName,
            'paymentModeRef' => $paymentModeRef,
            'paymentModeExtra' => $paymentModeExtra,
            'latestSale' => $latestSale,
            'paymentDetails' => $paymentDetails,
            'taxSummary' => $taxSummary,
            'productDetails' => $productDetails,
            'taxProList' => $taxProList,
        ]);
    }
    public function showTicket($id)
    {
        $db = \Config\Database::connect();

        $sale = (new \App\Models\SaleqModel())->find($id);
        $posales = (new \App\Models\SaleItemqModel())->where('sale_id', $id)->findAll();
        $client = (new \App\Models\CustomerModel())->find($sale['client_id']);
        $setting = (new \App\Models\SettingModel())->find(1);

        $register = $db->table('registers')->where('id', $sale['register_id'])->get()->getRowArray();
        $store = $db->table('stores')->where('id', $register['store_id'])->get()->getRowArray();
        $print = $db->table('print_setup')->where('dp_id', 3)->get()->getRowObject();

        $customerAddress = '';
        if ($sale['client_id'] > 0) {
            $custData = $db->table('customers')->where('id', $sale['client_id'])->get()->getRowArray();
            $customerAddress = $custData['customeraddress'] ?? '';
        }

        $payMethodParts = explode('~', $sale['paidmethod']);
        $paymentModeId = $payMethodParts[0] ?? '';
        $paymentModeRef = $payMethodParts[1] ?? '';
        $paymentModeExtra = $payMethodParts[2] ?? '';

        if ($paymentModeId == 1) {
            $paymentModeName = label('Cash');
        } elseif ($paymentModeId == 2) {
            $paymentModeName = label('CreditCard');
        } else {
            $payment = $db->table('payment_mode')->where('id', $paymentModeId)->get()->getRowArray();
            $paymentModeName = $payment['name'] ?? label("Other");
        }

        $latestSale = $db->table('saleqs')->where('id', $sale['id'])->orderBy('id', 'desc')->get()->getRowArray();
        $paymentDetails = $db->table('payementsq')->where([
            'sale_id' => $sale['id'],
            'paidmethod' => 4
        ])->orderBy('id', 'desc')->get()->getRowArray();

        $taxSummary = $db->table('tax_summaryq')->where('salesid', $id)->get()->getResultArray();

        $productDetails = [];
        foreach ($posales as $item) {
            $productDetails[$item['product_id']] = $db->table('products')->where('id', $item['product_id'])->get()->getRowArray();
        }

        $taxProList = [];
        foreach ($posales as $item) {
            $taxProList[$item['product_id']] = $db->table('taxprolist')
                ->where(['proid' => $item['product_id'], 'custtype' => 1])
                ->get()->getResultArray();
        }

        return view('invoices/ticket', [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'setting' => $setting,
            'register' => $register,
            'store' => $store,
            'print' => $print,
            'customerAddress' => $customerAddress,
            'paymentModeName' => $paymentModeName,
            'paymentModeRef' => $paymentModeRef,
            'paymentModeExtra' => $paymentModeExtra,
            'latestSale' => $latestSale,
            'paymentDetails' => $paymentDetails,
            'taxSummary' => $taxSummary,
            'productDetails' => $productDetails,
            'taxProList' => $taxProList,
        ]);
    }
    public function showInvoice4($id)
    {

        $SaleModel = new SaleqModel();
        $SaleItemModel = new SaleItemqModel();
        $CustomerModel = new CustomerModel();
        $RegisterModel = new RegisterModel();
        $StoreModel = new StoreModel();
        $SettingModel = new SettingModel();

        $sale = $SaleModel->find($id);

        $items = $SaleItemModel->where('sale_id', $id)->findAll();

        $client = $CustomerModel->find(['id' => $sale->client_id]);
        $register =  $RegisterModel->find($sale->register_id);
        $store = $register ? $StoreModel->find($register->store_id) : null;

        $settings = $SettingModel->find(1);

        $data = [
            'sale' => $sale,
            'items' => $items,
            'client' => $client,
            'store' => $store,
            'settings' => $settings,
            'customerAddress' => $client->address ?? '',
            'customerShipping' => $customerShipping ?? '',
            'customerGst'    => $customerGst ?? '',
        ];

        return view('invoice/show_invoice4', $data);
    }
    public function qshowInvoice4($id)
    {
        $sale = Saleq::find($id);
        $posales = Sale_itemq::where('sale_id', $id)->findAll();
        $client = CustomerModel::find($sale->client_id);

        $register = db_connect()->query("SELECT * FROM registers WHERE id = ?", [$sale->register_id])->getRowArray();
        $store = db_connect()->query("SELECT * FROM stores WHERE id = ?", [$register['store_id'] ?? 0])->getRowArray();

        $data = [
            'sale'       => $sale,
            'posales'    => $posales,
            'client'     => $client,
            'store'      => $store,
            'setting'    => model('SettingModel')->find(1),
            'paymentMethodParts' => explode('~', $sale->paidmethod),
        ];

        return view('invoicesq/show_invoice4', $data);
    }
    public function qshowInvoice($id)
    {
        $sale = Saleq::find($id);
        $posales = SaleItemq::where('sale_id', $id)->findAll();
        $client = CustomerModel::find($sale->client_id);

        $clientData = $client ? 'Customer_model: ' . esc($client->name) . '<br>' . esc($client->phone) . '<br>' . esc($client->email) : lang('App.walkinCustomer');

        $db = db_connect();

        $register = $db->table('registers')->where('id', $sale->register_id)->get()->getRowArray();
        $storeId = $register['store_id'] ?? null;
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $setting = $db->table('settings')->where('id', 1)->get()->getRow();

        $viewData = [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'clientData' => $clientData,
            'store' => $store,
            'setting' => $setting,
            'register' => $register,
        ];

        return view('invoices/qshow_invoice', $viewData);
    }

    public function showInvoice($id)
    {
        $SaleqModel = new SaleqModel();
        $SaleItemqModel = new SaleItemqModel();
        $CustomerModel = new CustomerModel();
        $RegisterModel = new RegisterModel();
        $StoreModel = new StoreModel();
        $SettingModel = new SettingModel();

        $sale = $SaleqModel->find($id);
        $posales = $SaleItemqModel->where('sale_id', $id)->findAll();
        $client =  $CustomerModel->find($sale->client_id);

        $clientData = $client ? 'Customer_model: ' . esc($client->name) . '<br>' . esc($client->phone) . '<br>' . esc($client->email) : lang('App.walkinCustomer');

        $db = db_connect();

        $register = $db->table('registers')->where('id', $sale->register_id)->get()->getRowArray();
        $storeId = $register['store_id'] ?? null;
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $setting = $db->table('settings')->where('id', 1)->get()->getRow();

        $viewData = [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'clientData' => $clientData,
            'store' => $store,
            'setting' => $setting,
            'register' => $register,
        ];

        return view('invoice/invoices_pur/show_invoice', $viewData);
    }





    public function editAjax($id)
    {
        $customerModel = new CustomerModel();
        $customers = $customerModel->findAll();

        $saleModel = new Sale();
        $sale = $saleModel->find($id);

        if (! $sale) {
            return $this->response->setStatusCode(404)->setBody('Sale not found');
        }

        switch ((int)$sale['status']) {
            case 1:
                $statusLabel = 'unpaid';
                break;
            case 2:
                $statusLabel = 'Partiallypaid';
                break;
            default:
                $statusLabel = 'paid';
        }

        $change = ($sale['total'] - $sale['paid']) > 0 ? ($sale['total'] - $sale['paid']) : '';

        $content = '<div class="row"><div class="col-md-12">'
            . '<h4><b>' . lang('Main.Total') . '</b> ' . $sale['total']
            . ' <b>&emsp;' . lang('Main.Paid') . ' :</b> Rs.' . $sale['paid']
            . ' <b> &emsp;' . lang('Main.Change') . ' :</b> Rs.' . ($sale['total'] - $sale['paid']) . ' </h4>'
            . '<div class="form-group"><label for="customerSelect">' . lang('Main.changeClient') . '</label>'
            . '<select class="form-control" id="customerSelect">'
            . '<option value="0">' . lang('Main.WalkinCustomer') . '</option>';

        foreach ($customers as $customer) {
            $selected = $customer['id'] == $sale['client_id'] ? 'selected' : '';
            $content .= '<option value="' . esc($customer['id']) . '" ' . $selected . '>' . esc($customer['name']) . '</option>';
        }

        $content .= '</select></div>'
            . '<div class="form-group"><label for="changeStatus">' . lang('Main.changeStatus') . ' '
            . '<span class="' . esc($statusLabel) . '">' . lang('Main.' . $statusLabel) . '</span></label>'
            . '<select class="form-control" id="changeStatus">'
            . '<option value="' . $sale['status'] . '">' . lang('Main.changeStatus') . '</option>'
            . '<option value="0">' . lang('Main.paid') . '</option>'
            . '<option value="1">' . lang('Main.unpaid') . '</option>'
            . '<option value="2">' . lang('Main.Partiallypaid') . '</option>'
            . '</select></div></div>'
            . '<input type="hidden" id="ClientId" value="' . esc($id) . '" />';

        return $this->response->setHeader('Content-Type', 'text/html')->setBody($content);
    }


    public function updateSale($id): ResponseInterface
    {
        $sale = Sale::find($id);
        if (!$sale) {
            return $this->response->setStatusCode(404)->setJSON(['error' => 'Sale not found']);
        }

        // Load settings (assuming already available via $this->setting or a model)
        $timezone = $this->setting->timezone ?? 'Asia/Dhaka'; // fallback if not set
        date_default_timezone_set($timezone);
        $date = date('Y-m-d H:i:s');

        $sale->client_id   = $this->request->getPost('customerId');
        $sale->clientname  = $this->request->getPost('customer');
        $sale->status      = $this->request->getPost('Status');
        $sale->modified_at = $date;

        if ($sale->save()) {
            return $this->response->setJSON(['success' => true]);
        }

        return $this->response->setStatusCode(500)->setJSON(['error' => 'Failed to update sale']);
    }
    public function payaments($id): ResponseInterface
    {
        $sale = Sale::find($id);

        if (!$sale) {
            return $this->response->setStatusCode(404)->setJSON(['error' => 'Sale not found']);
        }

        $balance = max($sale->total - $sale->paid, 0);
        $PayMethode = explode('~', $sale->paidmethod);
        $methodName = match ($PayMethode[0]) {
            '1' => label("CreditCard"),
            '2' => label("Cheque"),
            default => label("Cash"),
        };

        $content = '<div class="row"><div class="col-md-12"><h4><b>' . label("Total") . '</b> ' .
            number_format((float)$sale->total, $this->setting->decimals, '.', '') .
            '  <b>&emsp;' . label("Paid") . ' :</b>Rs. ' .
            number_format((float)$sale->paid, $this->setting->decimals, '.', '') .
            ' <b> &emsp;' . label("Balance") . ' :</b> Rs.' .
            number_format((float)$balance, $this->setting->decimals, '.', '') .
            ' </h4><input type="hidden" id="balall" value="' .
            number_format((float)$balance, $this->setting->decimals, '.', '') . '" /></div></div>';

        $content .= '<div class="col-md-12">
        <table class="table">
            <thead>
                <tr>
                    <th width="20%">' . label("Date") . '</th>
                    <th width="30%">' . label("Createdby") . '</th>
                    <th width="20%">' . label("Amount") . '</th>
                    <th width="20%">' . label("method") . '</th>
                    <th width="10%"></th>
                </tr>
            </thead>
            <tbody class="itemslist">';

        $content .= '<tr>
        <td>' . date('d-m-Y', strtotime($sale->created_at)) . '</td>
        <td>' . esc($sale->created_by) . '</td>
        <td>' . number_format((float)$sale->firstpayement, $this->setting->decimals, '.', '') . '</td>
        <td>' . $methodName . '</td>
        <td></td>
    </tr>';

        $payementModel = new Payement();
        $payements = $payementModel->where('sale_id', $id)->findAll();

        foreach ($payements as $pay) {
            $PayMethode = explode('~', $pay->paidmethod);
            $rff = match ($PayMethode[0]) {
                '0' => "Cash",
                '1' => "Credit Card",
                '2' => "Cheque",
                '4' => "Exchange",
                '10' => "Coupon",
                default => "Other"
            };

            $content .= '<tr>
            <td>' . date('d-m-Y', strtotime($pay->date)) . '</td>
            <td>' . esc($pay->created_by) . '</td>
            <td>' . number_format((float)$pay->paid, $this->setting->decimals, '.', '') . '</td>
            <td>' . esc($rff) . '</td>
            <td><a href="javascript:void(0)" onclick="deletepayement(' . $pay->id . ')"><i class="fa fa-trash" aria-hidden="true"></i></a></td>
        </tr>';
        }

        $content .= '</tbody></table></div>';

        if ($balance > 0) {
            $content .= '<button class="btn btn-add col-md-12" onclick="addpymntBtn()" style="margin-bottom:0">' . label("AddPayement") . '</button>';
        }

        return $this->response->setBody($content);
    }

    public function addPayment($type): ResponseInterface
    {
        $request = $this->request;

        $saleId = $request->getPost('sale_id');
        $sale = Sale::find($saleId);

        if (!$sale) {
            return $this->response->setJSON(['status' => false, 'error' => 'Sale not found']);
        }

        // Set timezone and date
        date_default_timezone_set($this->setting->timezone);
        $date = date('Y-m-d H:i:s');

        $registerId = $this->register; // assuming $this->register is available like in your CI3 controller
        $register = Register::find($registerId);
        $store = Store::find($register->store_id);

        $data = [
            'sale_id'      => $saleId,
            'paid'         => $request->getPost('paid'),
            'paidmethod'   => $request->getPost('paidmethod'),
            'date'         => $date,
            'register_id'  => $registerId,
            'salesman'     => $sale->salesperson,
            'created_by'   => session('user_id'), // assuming user session available
        ];

        if ((int)$type === 2) {
            // Stripe payment
            try {
                Stripe::setApiKey($this->setting->stripe_secret_key);
                $charge = Charge::create([
                    'amount'   => floatval($request->getPost('paid')) * 100,
                    'currency' => $this->setting->currency,
                    'source'   => [
                        'object'    => 'card',
                        'number'    => $request->getPost('ccnum'),
                        'exp_month' => $request->getPost('ccmonth'),
                        'exp_year'  => $request->getPost('ccyear'),
                        'cvc'       => $request->getPost('ccv'),
                    ]
                ]);

                echo "<p class='bg-success text-center'>" . label('saleStripesccess') . '</p>';
            } catch (\Stripe\Exception\CardException $e) {
                $body = $e->getJsonBody();
                $err = $body['error'];
                echo "<p class='bg-danger text-center'>" . esc($err['message']) . '</p>';
                return $this->response->setStatusCode(400)->setJSON(['status' => false, 'error' => $err['message']]);
            }
        }

        // Save payment
        $paymentModel = new Payement();
        $paymentModel->insert($data);

        // Update sale status
        $sale->paid += floatval($request->getPost('paid'));
        $sale->status = ($sale->paid >= $sale->total) ? '0' : '2';
        $sale->save();

        return $this->response->setJSON(['status' => true]);
    }
    public function deletePayment($id, $sale_id): ResponseInterface
    {
        $payment = Payement::find($id);
        $sale    = Sale::find($sale_id);

        if (!$payment || !$sale) {
            return $this->response->setJSON(['status' => false, 'message' => 'Payment or Sale not found']);
        }

        // Adjust sale's paid amount
        $sale->paid -= $payment->paid;

        // Determine new status
        if (abs($sale->paid) < 0.01) {
            $sale->status = '1'; // unpaid
        } elseif ($sale->paid < $sale->total) {
            $sale->status = '2'; // partially paid
        } else {
            $sale->status = '0'; // fully paid
        }

        $sale->save();
        $payment->delete();

        return $this->response->setJSON(['status' => true, 'message' => 'Payment deleted successfully']);
    }
    public function sendEmailTok($id)
    {
        $request = service('request');
        $to = $request->getPost('emaill');

        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->SMTPAuth = true;
            $mail->Port = 465;
            $mail->SMTPSecure = 'ssl';
            $mail->Host = 'smtp.gmail.com';
            $mail->Username = 'contactforms01@gmail.com';
            $mail->Password = 'contactform';

            $mail->Priority = 1;
            $mail->CharSet = 'UTF-8';
            $mail->Encoding = '8bit';
            $mail->Timeout = 3600;

            $mail->setFrom('karu@codetechnology.in', 'POS');
            $mail->addReplyTo('karu@codetechnology.in', 'POS');
            $mail->addAddress($to);
            $mail->Subject = 'Pos Purchase Order Detail';
            $mail->AltBody = 'To view the message, please use an HTML compatible email viewer!';

            // Load data from database
            $sale = Sale::find($id);
            $posales = SaleItem::where('sale_id', $id)->findAll();
            $client = CustomerModel::find($sale->client_id);

            // Pass data to view
            $ticketHtml = view('emails/receipt_template', [
                'sale' => $sale,
                'posales' => $posales,
                'client' => $client
            ]);

            $mail->msgHTML($ticketHtml);
            $mail->isHTML(true);

            $mail->send();
        } catch (Exception $e) {
            log_message('error', 'Email sending failed: ' . $mail->ErrorInfo);
        }
    }

    public function showTicketk($id)
    {
        $db = \Config\Database::connect();

        $sale = $db->table('sales')->where('id', $id)->get()->getRow();

        if (!$sale) {
            return 'Sale not found';
        }

        $creddate = (int) $sale->creddate;
        $createdAt = $sale->created_at;
        $recivamt = (float) $sale->recivamt;
        $total = (float) $sale->total;

        $remainingAmount = $total - $recivamt;
        $datePointer = $createdAt;

        $ticket = '<hr>
        <table class="table" cellspacing="0" border="0"><thead>
        <tr style="background-color:#555;color:#fff;font-weight:600">
            <th style="text-align:left;width: 150px;">' . label("Date") . '</th>
            <th style="text-align:right;">' . label("Amounttopay") . '</th>
            <th style="text-align:right;">' . label("Paid") . '</th>
        </tr></thead><tbody>';

        // Initial Payment Row
        $ticket .= '<tr style="border: 1px solid #ede4e4;">
        <td style="text-align:left;">' . date("d-m-Y", strtotime($createdAt)) . ' Initial</td>
        <td style="text-align:right;">' . number_format($total, 2) . '</td>
        <td style="text-align:right;">' . number_format($recivamt, 2) . '</td>
    </tr>';

        // Loop over payment dates
        for ($i = 1; $i <= $creddate; $i++) {
            $payments = $db->table('payements')
                ->select('SUM(paid) as kl')
                ->where('sale_id', $id)
                ->where('date', $datePointer)
                ->groupBy('date')
                ->get()
                ->getRow();

            $paid = $payments->kl ?? null;
            $isPaid = !is_null($paid);
            $rowColor = $isPaid ? "#34495e" : "red";
            $textColor = $isPaid ? "white" : "#000";
            $displayAmount = $isPaid ? number_format($paid, 2) : '--';

            if ($isPaid) {
                $remainingAmount -= $paid;
            }

            $ticket .= '<tr style="background-color:' . $rowColor . ';color:' . $textColor . ';border: 1px solid #ede4e4;">
            <td style="text-align:left;">' . date("d-m-Y", strtotime($datePointer)) . '</td>
            <td style="text-align:right;">' . number_format($remainingAmount, 2) . '</td>
            <td style="text-align:right;">' . $displayAmount . '</td>
        </tr>';

            $datePointer = date('Y-m-d', strtotime("+1 day", strtotime($datePointer)));
        }

        // Final Balance Row
        $ticket .= '<tr style="border: 1px solid #ede4e4;background-color:#555;color:white;">
        <td style="text-align:left;">' . label("Balanceamt") . '</td>
        <td style="text-align:right;">' . number_format($remainingAmount, 2) . '</td>
        <td style="text-align:right;"></td>
    </tr>';

        $ticket .= '</tbody></table>';

        echo $ticket;
    }
}
