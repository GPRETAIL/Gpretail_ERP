<?php

namespace App\Controllers;

use App\Models\SaleModel;
use App\Models\UserModel;
use App\Models\DsaleModel;
use App\Models\StoreModel;
use CodeIgniter\Controller;
use App\Controllers\BaseController;
use App\Models\InvoiceModel;
use App\Models\PaymentModel;
use App\Models\SettingModel;
use App\Models\CustomerModel;
use App\Models\InvoiceeModel;
use App\Models\RegisterModel;
use App\Models\SaleItemModel;
use App\Models\DsaleItemModel;
use App\Models\InvoiceqtModel;
use App\Models\PayementModel;
use App\Models\StockModel;

use \Config\Database;

class Invoices extends BaseController
{
    public function __construct()
    {

        $this->invoiceqt = new \App\Models\InvoiceqtModel();
        $this->SettingModel    = new SettingModel();
        $this->UserModel       = new UserModel();
        $this->SaleModel       = new SaleModel();
        $this->SaleItemModel   = new SaleItemModel();
        $this->CustomerModel   = new CustomerModel();
        $this->PaymentModel    = new PaymentModel();
        $this->RegisterModel   = new RegisterModel();
        $this->StoreModel      = new StoreModel();
        $this->DsaleItemModel  = new DsaleItemModel();
        $this->DsaleModel      = new DsaleModel();
        $this->InvoiceeModel   = new InvoiceeModel();
        $this->InvoiceModel    = new InvoiceModel();
        $this->SaleModel    = new SaleModel();


        // Load language file
        $this->session = session();
        $this->db = Database::connect();
        $lang = $this->session->get('lang') ?? 'english';
        // $this->lang->load($lang, $lang);

        $this->lang = \Config\Services::language();
        $this->lang->setLocale($lang);

        $this->register = $this->session->get('register') ?? false;
    }

    public function ajax_list()
    {
        $start = $this->request->getPost('start');
        $draw = $this->request->getPost('draw');

        $settings = $this->SettingModel->asArray()->find(1);
        $themeblock = $settings['sales_type'];

        $list = $themeblock == 1 ? $this->InvoiceeModel->getDatatables($this->request->getPost()) : $this->InvoiceModel->getDatatables($this->request->getPost());

        $data = [];
        $no = $start;

        foreach ($list as $invoice) {
            $no++;
            $row = [];
            $row[] = date('d-m-Y', strtotime($invoice['attime']));
            $row[] = $invoice['id'];
            $row[] = $invoice['totalitems'];
            $row[] = $invoice['subtotal'];

            if (!empty($settings['disc_all'])) {
                $row[] = ($invoice['discount'] * $invoice['subtotal']) / 100;
            }

            if (!empty($settings['disc_pro'])) {
                $row[] = $invoice['discount_indujul'];
            }

            $register = $this->RegisterModel->asArray()->find($invoice['register_id']);
            $storeName = $this->StoreModel->asArray()->find($this->session->get('store'))['name'] ?? '';

            $row[] = number_format((float)$invoice['total'], $settings['decimals'] ?? 2, '.', '');
            $row[] = $invoice['clientname'];
            $row[] = $invoice['created_by'];
            $row[] = $storeName;

            switch ($invoice['status']) {
                case 1: // case Credit Card
                    $statusLabel = 'unpaid';
                    break;
                case 2: // case ckeck
                    $statusLabel = 'Partiallypaid';
                    break;
                case 3: // case ckeck
                    $statusLabel = 'Canceled';
                    break;
                default:
                    $statusLabel = 'paid';
            }

            // Replace `label()` with ucfirst() or your own function if not defined
            $row[] = '<span class="' . $statusLabel . '">' . ucfirst($statusLabel) . '</span>';



            $returnExists = $this->db->table('returnss')
                ->where('re_sales_id', $invoice['id'])
                ->where('rsale_type', $themeblock)
                ->countAllResults();

            $userRole = session('role');

            $row[] = view('invoice/invoice_actions', [
                'invoice' => $invoice,
                'themeblock' => $themeblock,
                'permission' => $this->permission,
                'returnExists' => $returnExists
            ]);

            $data[] = $row;
        }

        return $this->response->setJSON([
            'draw' => (int)$draw,
            'recordsTotal' => $this->InvoiceModel->countAll(),
            'recordsFiltered' => $this->InvoiceModel->countFiltered($this->request->getPost()),
            'data' => $data
        ]);
    }

    public function ajax_listqtt()
    {
        $start = $this->request->getPost('start');
        $draw = $this->request->getPost('draw');

        $list = $this->invoiceqt->getDatatables();
        $settings = $this->SettingModel->asArray()->find(1);

        $data = [];
        $no = $start;

        foreach ($list as $invoice) {
            $no++;
            $row = [];
            $row[] = date('d-m-Y', strtotime($invoice['created_at']));
            $row[] = $invoice['id'] . '/' . $invoice['yyear'];
            $row[] = $invoice['clientname'];
            $row[] = $invoice['subtotal'];

            if (!empty($settings['disc_all'])) {
                $row[] = ($invoice['discount'] * $invoice['subtotal']) / 100;
            }

            if (!empty($settings['disc_pro'])) {
                $row[] = $invoice['discount_indujul'];
            }

            $row[] = number_format((float)$invoice['total'], $settings['decimals'] ?? 2, '.', '');
            $row[] = $invoice['created_by'];
            $row[] = $invoice['totalitems'];

            $statusLabel = match ((int)$invoice['status']) {
                1 => 'unpaid',
                2 => 'Partiallypaid',
                default => 'paid',
            };
            $row[] = '<span class="' . $statusLabel . '">' . label($statusLabel) . '</span>';

            $userRole = session('role');
            $permission = $this->permission->where('nname', $userRole)->first();

            $row[] = view('invoice/invoice_qtt_actions', [
                'invoice' => $invoice,
                'permission' => $permission
            ]);

            $data[] = $row;
        }

        return $this->response->setJSON([
            'draw' => (int)$draw,
            'recordsTotal' => $this->InvoiceModel->countAll(),
            'recordsFiltered' => $this->InvoiceModel->countFiltered(),
            'data' => $data
        ]);
    }

    public function sale_cancel()
    {
        $sales = $this->db->table('sales')
            ->select('id')
            ->where('status', 3)
            ->get()
            ->getResultArray();

        if (!empty($sales)) {
            foreach ($sales as $sale) {
                $this->db->table('sale_items')
                    ->where('sale_id', $sale['id'])
                    ->set('cancel_status', 1)
                    ->update();
            }
        }

        return $this->response->setJSON(['status' => 'success']);
    }

    public function sale_items_storeid()
    {
        $sales = $this->db->table('sales')
            ->select('id, register_id')
            ->get()
            ->getResultArray();

        foreach ($sales as $sale) {
            $register = $this->db->table('registers')
                ->select('store_id')
                ->where('id', $sale['register_id'])
                ->get()
                ->getRowArray();

            if (!empty($register)) {
                $this->db->table('sale_items')
                    ->where('sale_id', $sale['id'])
                    ->set('store_irrdd', $register['store_id'])
                    ->update();
            }
        }

        return $this->response->setJSON(['status' => 'success']);
    }

    public function return_storeid()
    {
        $returns = $this->db->table('returnss')
            ->select('re_id, storeid')
            ->get()
            ->getResultArray();

        foreach ($returns as $return) {
            $this->db->table('retunn_items')
                ->where('ret_id', $return['re_id'])
                ->set('store_idsi', $return['storeid'])
                ->update();
        }

        return $this->response->setJSON(['status' => 'success']);
    }

    public function return_update()
    {
        $retunnItems = $this->db->table('retunn_items')->get()->getResultArray();

        foreach ($retunnItems as $item) {
            $slId = $item['sl_id'];
            $itemId = $item['idd'];
            $todatt = $item['todatt'];

            $saleItem = $this->db->table('sale_items')
                ->select('product_id')
                ->where('id', $slId)
                ->get()
                ->getRowArray();

            if ($saleItem) {
                $toDatteFormatted = date('Y-m-d', strtotime($todatt));

                $this->db->table('retunn_items')
                    ->where('idd', $itemId)
                    ->set([
                        'prodd_ids' => $saleItem['product_id'],
                        'to_datte' => $toDatteFormatted
                    ])
                    ->update();
            }
        }

        return $this->response->setJSON(['status' => 'success']);
    }

    public function sale_items_delete()
    {
        $this->db->table('sale_items')
            ->where('store_irrdd', 0)
            ->delete();

        return $this->response->setJSON(['status' => 'success']);
    }


    public function ajax_delete($idcheckk)
    {
        $today = date('Y-m-d');

        $settings = $this->db->table('settings')->where('id', 1)->get()->getRowArray();
        $themeblock = $settings['themblock'] ?? 0;

        if ($themeblock == 1) {
            // Fetch sales_org_id from dsales
            $dsale = $this->db->table('dsales')
                ->select('sales_org_id, status')
                ->where('id', $idcheckk)
                ->get()
                ->getRowArray();

            if (!$dsale) {
                return $this->response->setJSON(['status' => false, 'error' => 'Dsale not found']);
            }

            if ((int) $dsale['status'] === 3) {
                // Already cancelled - stock was already restored, do nothing.
                return $this->response->setJSON(['status' => true]);
            }

            $this->db->table('dsales')
                ->where('id', $idcheckk)
                ->update([
                    'status' => 3,
                    'modified_at' => $today,
                ]);

            $this->db->table('dsale_items')
                ->where('sale_id', $idcheckk)
                ->set('cancel_status', 1)
                ->update();

            $id = $dsale['sales_org_id'];
        } else {
            $id = $idcheckk;
        }

        // Idempotency guard: if this sale was already cancelled, stock has
        // already been restored - don't do it again.
        $sale = $this->db->table('sales')->select('status')->where('id', $id)->get()->getRowArray();
        if (!$sale) {
            return $this->response->setJSON(['status' => false, 'error' => 'Sale not found']);
        }
        if ((int) $sale['status'] === 3) {
            return $this->response->setJSON(['status' => true]);
        }

        $store = session('store');
        $stockModel = new StockModel();

        $this->db->transStart();

        // Cancel sale
        $this->db->table('sales')
            ->where('id', $id)
            ->update(['status' => 3, 'modified_at' => $today]);

        $this->db->table('sale_items')
            ->where('sale_id', $id)
            ->set('cancel_status', 1)
            ->update();

        // Restore stock and remove transfer record
        $saleItems = $this->db->table('sale_items')
            ->where('sale_id', $id)
            ->orderBy('id', 'ASC')
            ->get()
            ->getResultArray();

        foreach ($saleItems as $item) {
            $productId = $item['product_id'];
            $quantity = $item['qt'];
            $date = $item['date'];

            $stockModel->adjustQuantity((int) $store, (int) $productId, (int) $quantity);

            // Delete corresponding stock_transfer record
            $this->db->table('stock_transfer')
                ->where([
                    'store_id' => $store,
                    'date' => $date,
                    'pro_id' => $productId,
                    'qty' => $quantity,
                    'tyoftrans' => 2
                ])
                ->limit(1)
                ->delete();
        }

        $this->db->transComplete();

        return $this->response->setJSON(['status' => $this->db->transStatus()]);
    }

    public function qajax_delete($id)
    {
        // Delete the invoice record
        $this->invoiceqt->delete($id);

        // Fetch all related sale_itemqs
        $items = $this->db->table('sale_itemqs')
            ->where('sale_id', $id)
            ->orderBy('id', 'ASC')
            ->get()
            ->getResultArray();

        // Get current store from session
        $store = session('store');

        // Delete each item record (manually, if required)
        foreach ($items as $item) {
            $this->db->table('sale_itemqs')
                ->where('id', $item['id'])
                ->delete();
        }

        return $this->response->setJSON(['status' => true]);
    }

    public function ShowTicketNew($id)
    {
        helper('text');
        $db = \Config\Database::connect();
        $session = session();

        $userId = $session->get('user')->id ?? null;

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $salesTable = ($settings['themblock'] ?? 0) == 1 ? 'dsales' : 'sales';

        if ($id == 0) {
            $saleQuery = $db->query("SELECT id FROM $salesTable WHERE salesperson = '$userId' ORDER BY id DESC LIMIT 1")->getRowArray();
            $id = $saleQuery['id'] ?? 0;
        }

        $sale = ($settings['themblock'] == 1)
            ? $db->table('dsales')->where('id', $id)->get()->getRow()
            : $db->table('sales')->where('id', $id)->get()->getRow();

        $saleItems = ($settings['themblock'] == 1)
            ? $db->table('dsale_items')->where('sale_id', $id)->get()->getResult()
            : $db->table('sale_items')->where('sale_id', $id)->get()->getResult();

        $client = $db->table('customers')->where('id', $sale->client_id)->get()->getRow();
        $register = $db->table('registers')->where('id', $sale->register_id)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $register['store_id'])->get()->getRowArray();
        $printSetup = $db->table('print_setup')->where('dp_id', 3)->get()->getRow();

        // Values from setting
        $logo = $settings['logo'] ?? '';
        $header = $settings['receiptheader'] ?? '';
        $footer = $settings['receiptfooter'] ?? '';
        $gstNo = $settings['gstnoo'] ?? '';
        $currency = $settings['currency'] ?? 'Rs';

        // HTML Build Start
        $ticket = '<div style="width:' . $printSetup->dp_pt_width . 'mm;font-size:' . $printSetup->font_size_l . 'px;margin-left:' . $printSetup->margin_left . 'px;padding:0px;" >
        <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;"><tbody>';

        if ($printSetup->logo_sh == 1) {
            $ticket .= '<tr><td colspan="6" style="text-align:' . $printSetup->logo_p . ';border:0;"><img src="' . base_url("files/Setting/$logo") . '" alt="logo" style="max-height:25px;"></td></tr>';
        }

        if ($printSetup->reciptheader_sh == 1) {
            $ticket .= '<tr><td colspan="6" style="text-align:' . $printSetup->reciptheader_p . ';border:0;">' . $header . '</td></tr>';
        }

        if ($printSetup->companyname_sh == 1) {
            $ticket .= '<tr><td colspan="6" style="text-align:' . $printSetup->companyname_p . ';font-size:' . $printSetup->font_size_b . 'px;"><b>' . $store['name'] . '</b></td></tr>';
        }

        if ($printSetup->address_sh == 1) {
            $ticket .= '<tr><td colspan="6" style="text-align:' . $printSetup->address_p . ';">' . $store['adresse'] . '</td></tr>';
            $ticket .= '<tr><td colspan="6" style="text-align:' . $printSetup->address_p . ';">' . $store['city'] . ', ' . $store['phone'] . '</td></tr>';
        }

        if ($printSetup->gst_sh == 1) {
            $ticket .= '<tr><td colspan="6" style="text-align:' . $printSetup->gst_p . ';">GST No: ' . $gstNo . '</td></tr>';
        }

        // Customer Section
        $customerDetails = '';
        if (!empty($sale->clientname)) {
            $customerDetails .= '<tr><td colspan="6" style="text-align:' . $printSetup->customer_p . ';">Name: ' . $sale->clientname . '</td></tr>';
        }
        if (!empty($client->customeraddress)) {
            $customerDetails .= '<tr><td colspan="6" style="text-align:' . $printSetup->customer_p . ';">Address: ' . $client->customeraddress . '</td></tr>';
        }
        if (!empty($sale->mobnnm)) {
            $customerDetails .= '<tr><td colspan="6" style="text-align:' . $printSetup->customer_p . ';">Mobile: ' . $sale->mobnnm . '</td></tr>';
        }
        if (!empty($client->gstno)) {
            $customerDetails .= '<tr><td colspan="6" style="text-align:' . $printSetup->customer_p . ';">GST: ' . $client->gstno . '</td></tr>';
        }

        if ($printSetup->customer_sh == 1) {
            $ticket .= '<tr><td colspan="6">' . $customerDetails . '</td></tr>';
        }

        // Header Line
        $ticket .= '<tr>';
        if ($printSetup->product_sh == 1) $ticket .= '<th>' . label("Product") . '</th>';
        if ($printSetup->qt_sh == 1) $ticket .= '<th>' . label("QTY") . '</th>';
        if ($printSetup->mrp_sh == 1) $ticket .= '<th>' . label("MRP") . '</th>';
        if ($printSetup->rate_sh == 1) $ticket .= '<th>' . label("Rate") . '</th>';
        if ($printSetup->tax_sh == 1) $ticket .= '<th>' . label("Tax") . '</th>';
        if ($printSetup->amt_sh == 1) $ticket .= '<th>' . label("Amount") . '</th>';
        $ticket .= '</tr>';

        // Items Loop
        foreach ($saleItems as $item) {
            $product = $db->table('products')->where('id', $item->product_id)->get()->getRow();

            $ticket .= '<tr>';
            if ($printSetup->product_sh == 1) $ticket .= '<td>' . esc($item->name) . '</td>';
            if ($printSetup->qt_sh == 1) $ticket .= '<td>' . $item->qt . '</td>';
            if ($printSetup->mrp_sh == 1) $ticket .= '<td>' . number_format($product->rrate, 2) . '</td>';
            if ($printSetup->rate_sh == 1) $ticket .= '<td>' . number_format($item->price, 2) . '</td>';
            if ($printSetup->tax_sh == 1) $ticket .= '<td>' . $product->tax . '%</td>';
            if ($printSetup->amt_sh == 1) $ticket .= '<td>' . number_format($item->qt * $item->price, 2) . '</td>';
            $ticket .= '</tr>';
        }

        // Summary
        $ticket .= '<tr><td colspan="3"><b>Total</b></td><td colspan="3" style="text-align:right;"><b>' . $currency . ' ' . number_format($sale->total, 2) . '</b></td></tr>';
        $ticket .= '<tr><td colspan="6" style="text-align:center;">' . $footer . '</td></tr>';
        $ticket .= '</tbody></table></div>';

        echo $ticket;
        exit;
    }

    public function ShowTicket($id)
    {
        $lkmm = $this->db->query(("SELECT * FROM  settings"))->getRowArray();
        $sales = "sales";
        $lxzmm = ($this->db->query("SELECT * FROM settings"))->getRowArray();
        if ($id == 0) {
            if ($lxzmm['themblock'] == 1) {
                $sales = "dsales";
            } else {
                $sales = "sales";
            }
            // $sales_id = ($this->db->query("select id from $sales where salesperson='" . $this->session->get('user_id') . "' order by id desc limit 1"))->getRowArray();
            $sales_id = $this->db->table($sales)->select('id')->where('salesperson', $this->session->get('user_id'))->orderBy('id', 'DESC')->get()->getRowArray();
            $id = $sales_id['id'];
        }

        if (isset($lxzmm['themblock']) && $lxzmm['themblock'] == 1) {
            $sale = $this->DsaleModel->find($id);
            $posales = $this->DsaleItemModel
                ->where(['sale_id' => $id])->findAll();
        } else {
            $sale = $this->SaleModel->find($id);
            $posales = $this->SaleItemModel->where(['sale_id' => $id])->findAll();
        }



        $client = $this->CustomerModel->where(array('id' => $sale->client_id))->find();

        $reg_ffrf = ($this->db->query("SELECT id,store_id FROM registers where id='" . $sale->register_id . "'  "))->getRowArray();
        @$mstoe = $reg_ffrf['store_id'];
        $mstoef = ($this->db->query("SELECT * FROM stores where id='" . $mstoe . "' "))->getRowArray();

        $ccname1 = $sale->clientname;
        $ccname3 = $sale->mobnnm;


        if ($sale->client_id > 0) {
            $tybm = ($this->db->query("SELECT * FROM customers WHERE id='" . $sale->client_id . "' "))->getRowArray();
            $ccname2 = $tybm['customeraddress'];
        } else {
            $ccname2 = "";
        }
        $print_tb = ($this->db->query("SELECT * FROM print_setup WHERE dp_id=3 "))->getRow();
        $rfkkkk = $print_tb->dp_pt_width . "mm";
        $olp = "5px";


        $ticket = '<div style="width:' . $rfkkkk . ';font-size:' . $print_tb->font_size_l . 'px;margin-left:' . $print_tb->margin_left . 'px;padding:0px;" >
          <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;"><tbody>';

        if ($print_tb->logo_sh == 1) {
            $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->logo_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 25px; "></td></tr>';
        }

        if ($print_tb->reciptheader_sh == 1) {
            $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->reciptheader_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;">' . $this->setting->receiptheader . '</td></tr>';
        }


        if ($print_tb->companyname_sh == 1) {
            $ticket .= ' <tr><td colspan="6"  style="text-align:' . $print_tb->companyname_p . ';border: 0px solid #fff;background-color: white;font-size:' . $print_tb->font_size_b . 'px;"><b>' . $mstoef['name'] . '</b></td></tr>';
        }

        if ($print_tb->address_sh == 1) {

            $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['adresse'] . '</td></tr>';
            $ticket .= '<tr><td colspan="6" style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['city'] . ',' . $mstoef['phone'] . '</td></tr>';
        }

        if ($print_tb->gst_sh == 1) {
            $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->gst_p . ';border: 0px solid #fff;background-color: white;">' . label("GST No") . ': ' . $this->setting->gstnoo . '</td></tr>';
        }

        $PayMethode = explode('~', $sale->paidmethod);
        $payment_mmode = '';
        if ($PayMethode[0] == 2) {

            $payment_mmode .= '<td colspan="3"  style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . label("CreditCard") . '</td>';
        } elseif ($PayMethode[0] == 1) {
            $payment_mmode .= '<td  colspan="3" style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ':' . label("Cash") . '</td>';
        } else {
            $pp_mm = ($this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' "))->getRowArray();

            $payment_mmode .= '<td  colspan="3" style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . (isset($pp_mm['name']) ? $pp_mm['name'] : '') . '</td>';
        }


        $customer_ddetaii = '<tr><td colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Customer") . '</td></tr>';
        if ($ccname1)
            $customer_ddetaii .= '<tr><td   colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Name") . ' : ' . $ccname1 . '</td></tr> ';

        if (isset($custrrf))
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Ref No") . ' : ' . $custrrf . '</td></tr> ';
        if ($ccname2)
            $customer_ddetaii .= '
                <tr><td  colspan="6"  style="text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Address") . '</td></tr>
                <tr>
                <td   colspan="6"  style="text-align:left;border: 0px solid #fff;background-color: white;"> : ' . $ccname2 . '</td>
                </tr>';
        if ($ccname3)
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Mobile") . ' : ' . $ccname3 . '</td></tr> ';

        if (isset($client->gstno))
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("GST") . ' : ' . isset($client->gstno) . '</td></tr> ';



        $line_1 = '';
        $line_2 = '';
        $line_3 = '';
        $line_4 = '';
        $line_5 = '';
        $line_6 = '';
        $line_7 = '';
        for ($fv = 1; $fv < 8; $fv++) {
            $fv_t = $fv;

            if ($print_tb->salesno_l == $fv && $print_tb->salesno_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td  colspan="3"   style="text-align:' . $print_tb->salesno_p . ';border: 0px solid #fff;background-color: white;">' . label("SaleNum") . '.: ' . $sale->id  . '/' . $sale->yyear . '</td>';

                $fv = $fv_t;
            }






            if ($print_tb->cashier_l == $fv && $print_tb->cashier_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->cashier_p . ';border: 0px solid #fff;background-color: white;">' . label("Cashier") . ': ' . $sale->created_by  . '</td>';
                $fv = $fv_t;
            }




            if ($print_tb->paymentmode_l == $fv && $print_tb->paymentmode_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  $payment_mmode;
                $fv = $fv_t;
            }



            if ($print_tb->date_l == $fv && $print_tb->date_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->date_p . ';border: 0px solid #fff;background-color: white;">' . label("Date") . ': ' . date("d-m-Y", strtotime($sale->attime))   . '</td>';
                $fv = $fv_t;
            }


            if ($print_tb->time_l == $fv && $print_tb->time_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  '<td colspan="3"  style="text-align:' . $print_tb->time_p . ';border: 0px solid #fff;background-color: white;">' . label("Time") . ': ' . date("H:i:s", strtotime($sale->attime))   . '</td>';
                $fv = $fv_t;
            }

            if ($print_tb->customer_l == $fv && $print_tb->customer_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  $customer_ddetaii;
                $fv = $fv_t;
            }
        }



        for ($fvb = 1; $fvb < 7; $fvb++) {
            $lint_temp = 'line_' . $fvb;
            $linef = $$lint_temp;



            $ticket .= '<tr>' . $linef . '</tr>';
        }

        $ticket .= '';


        $ticket .= '<tr>';



        $pro_width = $print_tb->dp_pt_width * 0.1 * 3;

        if ($print_tb->product_sh == 1)
            $ticket .= '<th  style="width:' . $pro_width . 'mm;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Product") . '</b></th>';
        if ($print_tb->qt_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("QTY") . '</b></th>';
        if ($print_tb->mrp_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("MRP") . '</b></th>';
        if ($print_tb->rate_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Rate") . '</b></th>';
        if ($print_tb->tax_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Tax") . '</b></th>';
        if ($print_tb->amt_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Amount") . '</b></th>';


        $ticket .= '</tr>';



        $i = 1;
        $vamttt = 0;
        $tkmx45 = 0;
        $mkm = 0;

        $cgst = 0;
        $cgsta = 0;
        foreach ($posales as $posale) {
            $mkm++;
            $kmkm = ($this->db->query("select * from products where id='" . $posale->product_id . "' "))->getRowArray();
            $ovtax = (int)$kmkm['tax'];
            $rtcc = 0;
            $txcvukp = 1;
            if (isset($txcvukp) && $txcvukp == 1) {
                $ovtax = (int)$kmkm['tax'];
            } else {
                $ovtax = (int)$kmkm['igst'];
            }
            $cgsttax = array();
            $tymsk = $ovtax;
            $tymsk1 = ($tymsk / 100) + 1;
            $rtcc = round($posale->price / $tymsk1, 2); //10
            $yrq = $this->db->query("select * from taxprolist where proid='" . $posale->product_id . "'  and custtype='" . $txcvukp . "'  ")->getResultArray();
            foreach ($yrq  as $yrqf) {

                $myrtax[] = $yrqf['taxid'];
                if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                {
                    $ll = $yrqf['taxid'];
                    $mn = 'cgg_' . $ll;
                    $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                    $cgst = $$mn + $cgsta;
                    $$mn = $cgst;
                } else {
                    $ll = $yrqf['taxid']; //taxid
                    $mn = 'cgg_' . $ll;
                    $cgsttax[] = $yrqf['taxid'];
                    $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                    $$mn = $cgst;
                }
            }













            $vper = !empty($_SESSION['dper_' . $posale->id]) ? $_SESSION['dper_' . $posale->id] : 0;
            $vamt = !empty($_SESSION['tper_' . $posale->id]) ? $_SESSION['tper_' . $posale->id] : 0;
            $totaltaxg = intval($kmkm['tax']) + intval($kmkm['sgst']);




            $tkmx1 = (int) $kmkm['rrate'] * (int) $posale->qt;
            $tkmx2 = (int) $posale->price * (int) $posale->qt;
            $tkmx3 = $tkmx1 - $tkmx2;
            $tkmx45 = $tkmx3 + $tkmx45;



            if ($print_tb->productlist_one_two == 1) {
                $ticket .= '<tr>';
                if ($print_tb->product_sh == 1) {
                    $ticket .= '<td   style="width:' . $pro_width . 'mm;text-align:left;    border-top: 0px solid #ddd; ">' . $kmkm['name'] . '</td>';
                }
                if ($print_tb->qt_sh == 1) {
                    $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
                }
                if ($print_tb->mrp_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$kmkm['rrate'], DECIMALS, '.', '') . ' </td>';
                }
                if ($print_tb->rate_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$posale->price, DECIMALS, '.', '') . ' </td>';
                }
                if ($print_tb->tax_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
                }
                if ($print_tb->amt_sh == 1) {

                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float)($posale->qt * $posale->price), DECIMALS, '.', '') . ' </td>';
                }

                $ticket .= '<tr>';
            } else {

                if ($print_tb->product_sh == 1) {

                    $ticket .= '<tr><td  colspan="6"  style="text-align:left;    border-top: 0px solid #ddd; ">' . $kmkm['name'] . '</td></tr>';
                }
                $ticket .= '<tr><td style="text-align:center;    border-top: 0px solid #ddd;">&nbsp;</td>';
                if ($print_tb->qt_sh == 1) {
                    $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
                }
                if ($print_tb->mrp_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$kmkm['rrate'], DECIMALS, '.', '') . ' </td>';
                }
                if ($print_tb->rate_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$posale->price, DECIMALS, '.', '') . ' </td>';
                }
                if ($print_tb->tax_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
                }
                if ($print_tb->amt_sh == 1) {

                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float)($posale->qt * $posale->price), DECIMALS, '.', '') . ' </td>';
                }

                $ticket .= '</tr>';
            }





            $vamttt = $vamt + $vamttt;
            $i++;
        }
        $tgbbb = ($sale->subtotal * $sale->discount) / 100;
        $bcs = 'code128';
        $height = 20;
        $width = 3;
        $ticket .= '<br>

        <tr>
        <td  style="text-align:left;"><b>' . label("TotalItems") . '</b></td>
        <td style="text-align:left; "><b>' . $sale->totalitems . '</b></td>
        <td  style="text-align:left; "><b>' . label("Total") . '</b></td>
        <td colspan="3" style="text-align:right;"><b>Rs.' . $sale->subtotal . '</b></td>
       
        </tr>';



        if (intval($sale->disamtssh)) {
            $ticket .= '<tr>
          
          <td colspan="2" style="text-align:left;">' . label("Shipping") . '</td>
          <td colspan="4" style="text-align:right;font-weight:bold;">Rs.' . number_format((float)$sale->disamtssh, DECIMALS, '.', '') . ' </td>
          
          </tr>';
        }





        $ticket .= '<tr>
             <td colspan="2" style="text-align:left; ">' . label("Discount") . ' ' . label("Amount") . '</td>
             <td colspan="4" style="text-align:right;">Rs.' . number_format((float)($sale->discount_indujul + $sale->discountamount), DECIMALS, '.', '') . '</td><td style="text-align:left;    border-top: 0px solid #ddd;width:' . $olp . ' "></td></tr>';





        $ticket .= '<tr>
        <td colspan="2" style="border-top:0px dashed #000;font-weight:bold;text-align:left;  padding-top:5px;font-weight:bold;;"><b>' . label("GrandTotal") . '</b></td>
        <td colspan="4" style="border-top:0px dashed #000; padding-top:5px; text-align:right;font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;">Rs.' . number_format((float)$sale->total, DECIMALS, '.', '') . ' </td>
        </tr><tr>';

        $lmoxx = ($this->db->query("SELECT * FROM $sales WHERE id='" . $sale->id . "' ORDER BY id DESC"))->getRowArray();
        $lkson = $sale->total - $lmoxx['paid'];
        $rrr = $lmoxx['recivamt'];
        $bbb = $lmoxx['ballamtt'];
        $lmqqq = ($this->db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc "))->getRowArray();



        if ($print_tb->paid_sh == 1) {
            if ($PayMethode[0] == 2) {

                $ticket .= '<td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("CreditCard") . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">xxxx xxxx xxxx ' . substr($PayMethode[1], -4) . '</td></tr>

                <tr><td colspan="2" style="text-align:left; border-top: 0px solid #ddd; padding-top:5px;">' . label("CreditCardHold") . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">' . $PayMethode[2] . '</td></tr>';
            } elseif ($PayMethode[0] == 1) {

                $ticket .= '<td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Paid") . ' </td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float)$sale->paid, DECIMALS, '.', '') . '</td></td>
                </tr>';
            } else {
                $pp_mm = ($this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' "))->getResultArray();
                $ticket .= '<td colspan="2" style="border-top: 0px solid #ddd;text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . (isset($pp_mm['name']) ? $pp_mm['name'] : '') . ' Ref No.</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $PayMethode[1] . '</td></tr>';
            }
        }

        if ($sale->tot_creaditpoint > 0) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Points</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . number_format((float)($sale->tot_creaditpoint), DECIMALS, '.', '') . '</td></td>   
                </tr>';
        }

        if ($sale->lalamt > 0) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Exchange (Ret.ID:' . $sale->lalid . ')</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float)($sale->lalamt), DECIMALS, '.', '') . '</td> </td>   
                </tr>';

            $ticket .= '<tr>
                <td colspan="3" style="text-align:left; padding-top:5px;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">Item</td>
                <td colspan="1" style="padding-top:5px; text-align:right;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">QTY</td> </td>
                <td colspan="2" style="padding-top:5px; text-align:right;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">Amount</td> </td>   
                </tr>';



            $ret_items = $this->db->query("select retunn_items.*,products.name as pname from retunn_items 
                                left join returnss on returnss.re_id=retunn_items.ret_id
                                left join products on products.id=retunn_items.prodd_ids  where returnss.purcha_sales_id='" . (isset($sale->id) ? $sale->id : 0) . "' and returnss.rsale_type='" . $lkmm['themblock'] . "'  ")->getResultArray();
            foreach ($ret_items as $ret_itemsf) {
                $ticket .= '<tr>            
                        <td    colspan="3" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">' . $ret_itemsf['pname'] . '</td> 
                        <td colspan="1" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $ret_itemsf['sl_newqt'] . '</td>
                        <td colspan="2" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $ret_itemsf['sl_subtotal'] . '</td>
                        </tr>';
            }
        }

        if ($print_tb->received_sh == 1) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left;  padding-top:5px;border-top: 1px solid #ddd;">' . label("Receivedamount") . ' </td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 1px solid #ddd;">Rs.' . number_format((float)($rrr), DECIMALS, '.', '') . ' </td>
                </tr>';
        }
        if ($print_tb->balance_sh == 1) {
            $amount_wordins = '';
            if ($bbb > 0) {
                $amount_wordins = '(Give balance to customer)';
            } else {
                $amount_wordins = '(Get balance from customer)';
            }
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left;  padding-top:5px;border-top: 1px solid #ddd;">' . label("Balanceamt") . ' ' . $amount_wordins  . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 1px solid #ddd;font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;"">Rs.' . number_format((float)($bbb), DECIMALS, '.', '') . ' </td>


                </tr>';
        }



        if ($print_tb->todaysaving_sh == 1) {


            $ticket .= '<tr>
                <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;border-top: 1px solid #ddd;">' . label("Saving") . '  </td>
                <td colspan="3" style="font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;text-align:left; padding-top:5px;border-top: 1px solid #ddd;"> : Rs.' . number_format((float)($tkmx45), DECIMALS, '.', '') . '</td>
                <td colspan="2" style="font-size:16px;font-weight:bold;padding-top:5px; text-align:right; border-top: 1px solid #ddd;"> </td><td style="text-align:left;    border-top: 1px solid #ddd;"></td>

                </tr>';
        }

        $ticket .= '</tbody></table><br>';

        if ($print_tb->taxx_sh == 1) {


            $ticket .= '<table class="table"  cellspacing="0" border="0"><thead><tr>';

            if ($print_tb->taxname_sh == 1) {
                $ticket .= '<th style="border-top: 1px solid #ddd;padding:8px;" >Tax Name</th>';
            }
            if ($print_tb->taxpersontage_sh == 1) {

                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">%</th>';
            }
            if ($print_tb->taxamt_sh == 1) {
                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">Amt</th>';
            }
            if ($print_tb->taxtotal_sh == 1) {
                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">Total</th>';
            }
            $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">&nbsp;</th></tr></thead><tbody>';





            $oklzw = $this->db->query("select * from tax_summary where salesid='" . $id . "' ")->getResultArray();
            foreach ($oklzw as $oklzwf) {

                $ticket .= '<tr>';
                if ($print_tb->taxname_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;" >' . $oklzwf['taxname'] . '</td>';
                }
                if ($print_tb->taxpersontage_sh == 1) {

                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' . round(@$oklzwf['taxpercent'], 2) . '</td>';
                }
                if ($print_tb->taxamt_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' .  round(@$oklzwf['taxamount'], 2)   . '</td>';
                }
                if ($print_tb->taxtotal_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' . round(@$oklzwf['taxfrom'], 2) . '</td>';
                }
                $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">&nbsp;</td></tr>';
            }

            $ticket .= '</table>';
        }

        $ticket .= '<table class="table" cellspacing="0" border="0" >
 
    <tr>
          <td style="text-align:left;    border-top: 0px solid #ddd;"></td>
          <td style="text-align:left;    border-top: 0px solid #ddd;">' . $this->setting->receiptfooter . '</td>
          </tr>
          </tr>
          </table></div>';



        echo $ticket;
        die;
    }

    public function ShowTicket4($id)
    {
        $sale = $this->SaleModel->find($id);
        $posales = $this->SaleItemModel->where(['sale_id' => $id])->findAll();

        $client = $this->CustomerModel->find('first', [
            'conditions' => ['id = ?', $sale->client_id]
        ]);

        $register = $this->db->table('registers')
            ->where('id', $sale->register_id)
            ->get()
            ->getRowArray();

        $store = $this->db->table('stores')
            ->where('id', $register['store_id'] ?? 0)
            ->get()
            ->getRowArray();

        $settings = $this->db->table('settings')->where('id', 1)->get()->getRowArray();

        $customerAddress = '';
        if ($sale->client_id > 0) {
            $customer = $this->db->table('customers')->where('id', $sale->client_id)->get()->getRowArray();
            $customerAddress = $customer['customeraddress'] ?? '';
        }

        $data = [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'store' => $store,
            'settings' => $settings,
            'customerAddress' => $customerAddress,
        ];

        return view('invoice/show_ticket4', $data);
    }

    // public function ShowTicket2($id)
    // {
    //     $sale = $this->SaleModel->find($id);
    //     $posales = $this->SaleItemModel->where(['sale_id' => $id])->findAll();
    //     $client = $this->CustomerModel->find('first', [
    //         'conditions' => ['id = ?', $sale->client_id]
    //     ]);

    //     $register = $this->db->table('registers')
    //         ->where('id', $sale->register_id)
    //         ->get()
    //         ->getRowArray();

    //     $store = $this->db->table('stores')
    //         ->where('id', $register['store_id'] ?? 0)
    //         ->get()
    //         ->getRowArray();

    //     $customerAddress = '';
    //     if ($sale->client_id > 0) {
    //         $customer = $this->db->table('customers')->where('id', $sale->client_id)->get()->getRowArray();
    //         $customerAddress = $customer['customeraddress'] ?? '';
    //     }

    //     $printSetup = $this->db->table('print_setup')->where('dp_id', 4)->get()->getRow();

    //     $data = [
    //         'sale' => $sale,
    //         'posales' => $posales,
    //         'client' => $client,
    //         'store' => $store,
    //         'customerAddress' => $customerAddress,
    //         'printSetup' => $printSetup,
    //         'settings' => $this->setting
    //     ];

    //     return view('invoice/show_ticket2', $data);
    // }

    public function ShowTicket2($id)
    {
        $sale = $this->SaleModel->find($id);
        $posales = $this->SaleItemModel->where(['sale_id' => $id])->findAll();
        $client = $this->CustomerModel->where(['id' => $sale->client_id])->find();

        $reg_ffrf = $this->db->query("select id,store_id from registers where id='" . $sale->register_id . "'  ")->getRowArray();
        @$mstoe = $reg_ffrf['store_id'];
        $mstoef = $this->db->query("select * from stores where id='" . $mstoe . "' ")->getRowArray();


        $ccname1 = $sale->clientname;
        $ccname3 = $sale->mobnnm;


        if ($sale->client_id > 0) {
            $tybm = $this->db->query("select * from customers where id='" . $sale->client_id . "' ")->getRowArray();
            $ccname2 = $tybm['customeraddress'];
        } else {
            $ccname2 = "";
        }
        $print_tb = $this->db->query("select * from print_setup where dp_id=4 ")->getRow();
        $rfkkkk = $print_tb->dp_pt_width . "mm";
        $olp = "5px";


        $ticket = '<div style="width:' . $rfkkkk . ';font-size:' . $print_tb->font_size_l . 'px;margin-left:' . $print_tb->margin_left . 'px;padding:0px;" >
          <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;"><tbody>';

        if ($print_tb->logo_sh == 1) {

            $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->logo_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 25px; "></td></tr>';
        }

        if ($print_tb->reciptheader_sh == 1) {

            $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->reciptheader_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;">' . $this->setting->receiptheader . '</td></tr>';
        }


        if ($print_tb->companyname_sh == 1) {
            $ticket .= ' <tr><td colspan="6"  style="text-align:' . $print_tb->companyname_p . ';border: 0px solid #fff;background-color: white;font-size:' . $print_tb->font_size_b . 'px;"><b>' . $mstoef['name'] . '</b></td></tr>';
        }


        if ($print_tb->address_sh == 1) {

            $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['adresse'] . '</td></tr>';
            $ticket .= '<tr><td colspan="6" style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['city'] . ',' . $mstoef['phone'] . '</td></tr>';
        }

        if ($print_tb->gst_sh == 1) {
            $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->gst_p . ';border: 0px solid #fff;background-color: white;">' . label("GST No") . ': ' . $this->setting->gstnoo . '</td></tr>';
        }

        $PayMethode = explode('~', $sale->paidmethod);
        $payment_mmode = '';
        if ($PayMethode[0] == 2) {

            $payment_mmode .= '<td colspan="3"  style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . label("CreditCard") . '</td>';
        } elseif ($PayMethode[0] == 1) {
            $payment_mmode .= '<td  colspan="3" style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ':' . label("Cash") . '</td>';
        } else {
            $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

            $payment_mmode .= '<td  colspan="3" style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . (isset($pp_mm['name']) ? $pp_mm['name'] : '') . '</td>';
        }


        $customer_ddetaii = '<tr><td colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Customer") . '</td></tr>';
        if ($ccname1)
            $customer_ddetaii .= '<tr><td   colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Name") . ' : ' . $ccname1 . '</td></tr> ';

        if (isset($custrrf))
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Ref No") . ' : ' . $custrrf . '</td></tr> ';
        if ($ccname2)
            $customer_ddetaii .= '
          <tr><td  colspan="6"  style="text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Address") . '</td></tr>
          <tr>
          <td   colspan="6"  style="text-align:left;border: 0px solid #fff;background-color: white;"> : ' . $ccname2 . '</td>
          </tr>';
        if ($ccname3)
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Mobile") . ' : ' . $ccname3 . '</td></tr> ';

        if (isset($client->gstno))
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("GST") . ' : ' . isset($client->gstno) . '</td></tr> ';



        $line_1 = '';
        $line_2 = '';
        $line_3 = '';
        $line_4 = '';
        $line_5 = '';
        $line_6 = '';
        $line_7 = '';
        for ($fv = 1; $fv < 8; $fv++) {
            $fv_t = $fv;

            if ($print_tb->salesno_l == $fv && $print_tb->salesno_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td  colspan="3"   style="text-align:' . $print_tb->salesno_p . ';border: 0px solid #fff;background-color: white;">' . label("SaleNum") . '.: ' . $sale->id  . '/' . $sale->yyear . '</td>';

                $fv = $fv_t;
            }






            if ($print_tb->cashier_l == $fv && $print_tb->cashier_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->cashier_p . ';border: 0px solid #fff;background-color: white;">' . label("Cashier") . ': ' . $sale->created_by  . '</td>';
                $fv = $fv_t;
            }




            if ($print_tb->paymentmode_l == $fv && $print_tb->paymentmode_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  $payment_mmode;
                $fv = $fv_t;
            }



            if ($print_tb->date_l == $fv && $print_tb->date_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->date_p . ';border: 0px solid #fff;background-color: white;">' . label("Date") . ': ' . date("d-m-Y", strtotime($sale->attime))   . '</td>';
                $fv = $fv_t;
            }


            if ($print_tb->time_l == $fv && $print_tb->time_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  '<td colspan="3"  style="text-align:' . $print_tb->time_p . ';border: 0px solid #fff;background-color: white;">' . label("Time") . ': ' . date("H:i:s", strtotime($sale->attime))   . '</td>';
                $fv = $fv_t;
            }

            if ($print_tb->customer_l == $fv && $print_tb->customer_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  $customer_ddetaii;
                $fv = $fv_t;
            }
        }



        for ($fvb = 1; $fvb < 7; $fvb++) {
            $lint_temp = 'line_' . $fvb;
            $linef = $$lint_temp;



            $ticket .= '<tr>' . $linef . '</tr>';
        }

        $ticket .= '';


        $ticket .= '<br><tr>';



        $pro_width = $print_tb->dp_pt_width * 0.1 * 3;

        if ($print_tb->product_sh == 1)
            $ticket .= '<th  style="width:' . $pro_width . 'mm;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Product") . '</b></th>';
        if ($print_tb->qt_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("QTY") . '</b></th>';
        if ($print_tb->mrp_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("MRP") . '</b></th>';
        if ($print_tb->rate_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Rate") . '</b></th>';
        if ($print_tb->tax_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Tax") . '</b></th>';
        if (
            $print_tb->amt_sh == 1
        )
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Amount") . '</b></th>';


        $ticket .= '</tr>';



        $i = 1;
        $vamttt = 0;
        $tkmx45 = 0;
        $mkm = 0;

        $cgst = 0;
        $cgsta = 0;
        foreach ($posales as $posale) {
            $mkm++;
            $kmkm = $this->db->query("select * from products where id='" . $posale->product_id . "' ")->getRowArray();
            $ovtax = $kmkm['tax'];
            $rtcc = 0;
            $txcvukp = 1;
            $cgsttax = [];
            if ($txcvukp == 1) {
                $ovtax = $kmkm['tax'];
            } else {
                $ovtax = $kmkm['igst'];
            }
            $tymsk = $ovtax;
            $tymsk1 = ($tymsk / 100) + 1;
            $rtcc = round($posale->price / $tymsk1, 2); //10
            $yrq = $this->db->query("select * from taxprolist where proid='" . $posale->product_id . "'  and custtype='" . $txcvukp . "'  ")->getResultArray();
            foreach ($yrq as $yrqf) {

                $myrtax[] = $yrqf['taxid'];
                if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                {
                    $ll = $yrqf['taxid'];
                    $mn = 'cgg_' . $ll;
                    $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                    $cgst = $$mn + $cgsta;
                    $$mn = $cgst;
                } else {
                    $ll = $yrqf['taxid']; //taxid
                    $mn = 'cgg_' . $ll;
                    $cgsttax[] = $yrqf['taxid'];
                    $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                    $$mn = $cgst;
                }
            }













            $vper = isset($_SESSION['dper_' . $posale->id]) ? $_SESSION['dper_' . $posale->id] : '';
            $vamt = isset($_SESSION['tper_' . $posale->id]) ? $_SESSION['tper_' . $posale->id] : '';
            $totaltaxg = (int)$kmkm['tax'] + (int)$kmkm['sgst'];




            $tkmx1 = intval($kmkm['rrate']) * intval($posale->qt);
            $tkmx2 = intval($posale->price) * intval($posale->qt);
            $tkmx3 = $tkmx1 - $tkmx2;
            $tkmx45 = $tkmx3 + $tkmx45;



            if ($print_tb->productlist_one_two == 1) {
                $ticket .= '<tr>';
                if ($print_tb->product_sh == 1) {
                    $ticket .= '<td   style="width:' . $pro_width . 'mm;text-align:left;    border-top: 0px solid #ddd; ">' . $posale->name . '</td>';
                }
                if ($print_tb->qt_sh == 1) {
                    $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
                }
                if ($print_tb->mrp_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$kmkm['rrate'], DECIMALS, '.', '') . ' </td>';
                }
                if ($print_tb->rate_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format(
                        (float)$posale->price,
                        DECIMALS,
                        '.',
                        ''
                    ) . ' </td>';
                }
                if ($print_tb->tax_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
                }
                if ($print_tb->amt_sh == 1) {

                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float)($posale->qt * $posale->price), DECIMALS, '.', '') . ' </td>';
                }

                $ticket .= '<tr>';
            } else {

                if ($print_tb->product_sh == 1) {

                    $ticket .= '<tr><td  colspan="6"  style="text-align:left;    border-top: 0px solid #ddd; ">' . $posale->name . '</td></tr>';
                }
                $ticket .= '<tr><td style="text-align:center;    border-top: 0px solid #ddd;">&nbsp;</td>';
                if ($print_tb->qt_sh == 1) {
                    $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
                }
                if ($print_tb->mrp_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$kmkm['rrate'], DECIMALS, '.', '') . ' </td>';
                }
                if ($print_tb->rate_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$posale->price, DECIMALS, '.', '') . ' </td>';
                }
                if ($print_tb->tax_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
                }
                if ($print_tb->amt_sh == 1) {

                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float)($posale->qt * $posale->price), DECIMALS, '.', '') . ' </td>';
                }

                $ticket .= '</tr>';
            }





            $vamttt = intval($vamt) + intval($vamttt);
            $i++;
        }
        $tgbbb = ($sale->subtotal * $sale->discount) / 100;
        $bcs = 'code128';
        $height = 20;
        $width = 3;
        $ticket .= '<br>
                    <tr>
                        <td  style="text-align:left;"><b>' . label("TotalItems") . '</b></td>
                        <td style="text-align:left; "><b>' . $sale->totalitems . '</b></td>
                        <td  style="text-align:left; "><b>' . label("Total") . '</b></td>
                        <td colspan="3" style="text-align:right;"><b>Rs.' . $sale->subtotal . '</b></td>
                    </tr>';

        if (intval($sale->disamtssh)) {
            $ticket .= '<tr>
                            <td colspan="2" style="text-align:left;">' . label("Shipping") . '</td>
                            <td colspan="4" style="text-align:right;font-weight:bold;">Rs.' . number_format((float)$sale->disamtssh, DECIMALS, '.', '') . ' </td>
                        </tr>';
        }




        $ticket .= '<tr>
             <td colspan="2" style="text-align:left; ">' . label("Discount") . ' ' . label("Amount") . '</td>
             <td colspan="4" style="text-align:right;">Rs.' . number_format((float)($sale->discount_indujul + $sale->discountamount), DECIMALS, '.', '') . '</td><td style="text-align:left;    border-top: 0px solid #ddd;width:' . $olp . ' "></td></tr>';





        $ticket .= '<tr>
                    <td colspan="2" style="border-top:0px dashed #000;font-weight:bold;text-align:left;  padding-top:5px;font-weight:bold;;"><b>' . label("GrandTotal") . '</b></td>
                    <td colspan="4" style="border-top:0px dashed #000; padding-top:5px; text-align:right;font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;">Rs.' . number_format((float)$sale->total, DECIMALS, '.', '') . ' </td>
                    </tr>
                    <tr>';

        $lmoxx = $this->db->query("SELECT * FROM sales WHERE id='" . $sale->id . "'  ORDER BY id DESC")->getRowArray();
        $lkson = $sale->total - $lmoxx['paid'];
        $rrr = $lmoxx['recivamt'];
        $bbb = $lmoxx['ballamtt'];
        $lmqqq = $this->db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ")->getRowArray();



        if ($print_tb->paid_sh == 1) {
            if ($PayMethode[0] == 2) {

                $ticket .= '<td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("CreditCard") . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">xxxx xxxx xxxx ' . substr($PayMethode[1], -4) . '</td></tr>

                <tr><td colspan="2" style="text-align:left; border-top: 0px solid #ddd; padding-top:5px;">' . label("CreditCardHold") . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">' . $PayMethode[2] . '</td></tr>';
            } elseif ($PayMethode[0] == 1) {

                $ticket .= '<td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Paid") . ' </td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float)$sale->paid, DECIMALS, '.', '') . '</td></td>
                </tr>';
            } else {
                $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();
                $ticket .= '<td colspan="2" style="border-top: 0px solid #ddd;text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . (isset($pp_mm['name']) ? $pp_mm['name'] : '') . ' Ref No.</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $PayMethode[1] . '</td></tr>';
            }
        }

        if (
            $sale->tot_creaditpoint > 0
        ) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Points</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . number_format((float)($sale->tot_creaditpoint), DECIMALS, '.', '') . '</td></td>   
                </tr>';
        }

        if ($sale->lalamt > 0) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Exchange (Ret.ID:' . $sale->lalid . ')</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float)($sale->lalamt), DECIMALS, '.', '') . '</td> </td>   
                </tr>';

            $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Exchange (Ret.ID:' . $sale->lalid . ')</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float)($sale->lalamt), DECIMALS, '.', '') . '</td> </td>   
                </tr>';
        }

        if ($print_tb->received_sh == 1) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Receivedamount") . ' </td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float)($rrr), DECIMALS, '.', '') . ' </td>
                </tr>';
        }
        if ($print_tb->balance_sh == 1) {

            $ticket .= '<tr>
                <td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Balanceamt") . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float)($bbb), DECIMALS, '.', '') . ' </td>


                </tr>';
        }



        if ($print_tb->todaysaving_sh == 1) {


            $ticket .= '<tr>
                <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;border-top: 1px solid #ddd;">' . label("Saving") . '  </td>
                <td colspan="3" style="font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;text-align:left; padding-top:5px;border-top: 1px solid #ddd;"> : Rs.' . number_format((float)($tkmx45), DECIMALS, '.', '') . '</td>
                <td colspan="2" style="font-size:16px;font-weight:bold;padding-top:5px; text-align:right; border-top: 1px solid #ddd;"> </td><td style="text-align:left;    border-top: 1px solid #ddd;"></td>

                </tr>';
        }

        $ticket .= '</tbody></table><br>';

        if ($print_tb->taxx_sh == 1) {


            $ticket .= '<table class="table"  cellspacing="0" border="0"><thead><tr>';

            if (
                $print_tb->taxname_sh == 1
            ) {
                $ticket .= '<th style="border-top: 1px solid #ddd;padding:8px;" >Tax Name</th>';
            }
            if ($print_tb->taxpersontage_sh == 1) {

                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">%</th>';
            }
            if ($print_tb->taxamt_sh == 1) {
                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">Amt</th>';
            }
            if ($print_tb->taxtotal_sh == 1) {
                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">Total</th>';
            }
            $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">&nbsp;</th></tr></thead><tbody>';





            $oklzw = $this->db->query("select * from tax_summary where salesid='" . $id . "' ")->getResultArray();
            foreach ($oklzw as $oklzwf) {

                $ticket .= '<tr>';
                if ($print_tb->taxname_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;" >' . $oklzwf['taxname'] . '</td>';
                }
                if (
                    $print_tb->taxpersontage_sh == 1
                ) {

                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' . round(floatval(@$oklzwf['taxpercent']), 2) . '</td>';
                }
                if ($print_tb->taxamt_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' .  round(floatval(@$oklzwf['taxamount']), 2)   . '</td>';
                }
                if ($print_tb->taxtotal_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' . round(floatval(@$oklzwf['taxfrom']), 2) . '</td>';
                }
                $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">&nbsp;</td></tr>';
            }

            $ticket .= '</table>';
        }

        $ticket .= '<table class="table" cellspacing="0" border="0" >
                    <tr>
                        <td style="text-align:left;    border-top: 0px solid #ddd;"></td>
                        <td style="text-align:left;    border-top: 0px solid #ddd;">' . $this->setting->receiptfooter . '</td>
                    </tr>
                </tr>
                </table></div>';



        echo $ticket;
        die;
    }


    public function ShowTickett($id)
    {
        $sale = $this->DsaleModel->find($id);
        $posales = $this->DsaleItemModel->where('sale_id', $id)->findAll();
        $client = $this->CustomerModel->find($sale->client_id);

        $reg_ffrf = $this->db->query("select id,store_id from registers where id='" . $sale->register_id . "'  ")->getRowArray();
        @$mstoe = $reg_ffrf['store_id'];
        $mstoef = $this->db->query("select * from stores where id='" . $mstoe . "' ")->getRowArray();


        $ccname1 = $sale->clientname;
        $ccname3 = $sale->mobnnm;


        if ($sale->client_id > 0) {
            $tybm = $this->db->query("select * from customers where id='" . $sale->client_id . "' ")->getRowArray();
            $ccname2 = $tybm['customeraddress'];
        } else {
            $ccname2 = "";
        }
        $print_tb = $this->db->query("select * from print_setup where dp_id=3 ")->getRow();
        $rfkkkk = $print_tb->dp_pt_width . "mm";
        $olp = "5px";


        $ticket = '<div style="width:' . $rfkkkk . ';font-size:' . $print_tb->font_size_l . 'px;margin-left:' . $print_tb->margin_left . 'px;padding:0px;" >
          <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;"><tbody>';

        if ($print_tb->logo_sh == 1) {

            $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->logo_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 25px; "></td></tr>';
        }

        if ($print_tb->reciptheader_sh == 1) {

            $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->reciptheader_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;">' . $this->setting->receiptheader . '</td></tr>';
        }


        if ($print_tb->companyname_sh == 1) {
            $ticket .= ' <tr><td colspan="6"  style="text-align:' . $print_tb->companyname_p . ';border: 0px solid #fff;background-color: white;font-size:' . $print_tb->font_size_b . 'px;"><b>' . $mstoef['name'] . '</b></td></tr>';
        }


        if ($print_tb->address_sh == 1) {

            $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['adresse'] . '</td></tr>';
            $ticket .= '<tr><td colspan="6" style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['city'] . ',' . $mstoef['phone'] . '</td></tr>';
        }

        if ($print_tb->gst_sh == 1) {
            $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->gst_p . ';border: 0px solid #fff;background-color: white;">' . label("GST No") . ': ' . $this->setting->gstnoo . '</td></tr>';
        }

        $PayMethode = explode('~', $sale->paidmethod);
        $payment_mmode = '';
        if ($PayMethode[0] == 2) {

            $payment_mmode .= '<td colspan="3"  style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . label("CreditCard") . '</td>';
        } elseif ($PayMethode[0] == 1) {
            $payment_mmode .= '<td  colspan="3" style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ':' . label("Cash") . '</td>';
        } else {
            $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

            $payment_mmode .= '<td  colspan="3" style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . (isset($pp_mm['name']) ? $pp_mm['name'] : '') . '</td>';
        }


        $customer_ddetaii = '<tr><td colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Customer") . '</td></tr>';
        if ($ccname1)
            $customer_ddetaii .= '<tr><td   colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Name") . ' : ' . $ccname1 . '</td></tr> ';

        if (isset($custrrf))
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Ref No") . ' : ' . $custrrf . '</td></tr> ';
        if ($ccname2)
            $customer_ddetaii .= '
          <tr><td  colspan="6"  style="text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Address") . '</td></tr>
          <tr>
          <td   colspan="6"  style="text-align:left;border: 0px solid #fff;background-color: white;"> : ' . $ccname2 . '</td>
          </tr>';
        if ($ccname3)
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Mobile") . ' : ' . $ccname3 . '</td></tr> ';

        if (isset($client->gstno))
            $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("GST") . ' : ' . isset($client->gstno) . '</td></tr> ';



        $line_1 = '';
        $line_2 = '';
        $line_3 = '';
        $line_4 = '';
        $line_5 = '';
        $line_6 = '';
        $line_7 = '';
        for ($fv = 1; $fv < 8; $fv++) {
            $fv_t = $fv;

            if ($print_tb->salesno_l == $fv && $print_tb->salesno_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td  colspan="3"   style="text-align:' . $print_tb->salesno_p . ';border: 0px solid #fff;background-color: white;">' . label("SaleNum") . '.: ' . $sale->id  . '/' . $sale->yyear . '</td>';

                $fv = $fv_t;
            }






            if ($print_tb->cashier_l == $fv && $print_tb->cashier_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->cashier_p . ';border: 0px solid #fff;background-color: white;">' . label("Cashier") . ': ' . $sale->created_by  . '</td>';
                $fv = $fv_t;
            }




            if ($print_tb->paymentmode_l == $fv && $print_tb->paymentmode_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  $payment_mmode;
                $fv = $fv_t;
            }



            if ($print_tb->date_l == $fv && $print_tb->date_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->date_p . ';border: 0px solid #fff;background-color: white;">' . label("Date") . ': ' . date("d-m-Y", strtotime($sale->attime))   . '</td>';
                $fv = $fv_t;
            }


            if ($print_tb->time_l == $fv && $print_tb->time_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  '<td colspan="3"  style="text-align:' . $print_tb->time_p . ';border: 0px solid #fff;background-color: white;">' . label("Time") . ': ' . date("H:i:s", strtotime($sale->attime))   . '</td>';
                $fv = $fv_t;
            }

            if ($print_tb->customer_l == $fv && $print_tb->customer_sh == 1) {
                $tt = 'line_' . $fv;
                $$tt .=  $customer_ddetaii;
                $fv = $fv_t;
            }
        }



        for ($fvb = 1; $fvb < 7; $fvb++) {
            $lint_temp = 'line_' . $fvb;
            $linef = $$lint_temp;



            $ticket .= '<tr>' . $linef . '</tr>';
        }

        $ticket .= '';


        $ticket .= '<br><tr>';



        $pro_width = $print_tb->dp_pt_width * 0.1 * 3;

        if ($print_tb->product_sh == 1)
            $ticket .= '<th  style="width:' . $pro_width . 'mm;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Product") . '</b></th>';
        if ($print_tb->qt_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("QTY") . '</b></th>';
        if ($print_tb->mrp_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("MRP") . '</b></th>';
        if ($print_tb->rate_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Rate") . '</b></th>';
        if ($print_tb->tax_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Tax") . '</b></th>';
        if ($print_tb->amt_sh == 1)
            $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;padding:8px;"><b>' . label("Amount") . '</b></th>';


        $ticket .= '</tr>';



        $i = 1;
        $vamttt = 0;
        $tkmx45 = 0;
        $mkm = 0;

        $cgst = 0;
        $cgsta = 0;
        foreach ($posales as $posale) {
            $mkm++;
            $kmkm = $this->db->query("SELECT * FROM products WHERE id='" . $posale->product_id . "' ")->getRowArray();
            $ovtax = (int)$kmkm['tax'];
            $rtcc = 0;
            $txcvukp = 1;
            if (isset($txcvukp) && $txcvukp == 1) {
                $ovtax = (int)$kmkm['tax'];
            } else {
                $ovtax = (int)$kmkm['igst'];
            }
            $cgsttax = array();
            $tymsk = $ovtax;
            $tymsk1 = ($tymsk / 100) + 1;
            $rtcc = round($posale->price / $tymsk1, 2); //10
            // $yrq = mysql_query("SELECT * FROM dtaxprolist WHERE proid=$posale->product_id  AND custtype=$txcvukp");
            $yrq = $this->db->table('taxprolist')
                ->where(['proid' => $posale->product_id, 'custtype' => $txcvukp])
                ->get()->getResultArray();
            foreach ($yrq as $yrqf) {

                $myrtax[] = $yrqf['taxid'];
                if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                {
                    $ll = $yrqf['taxid'];
                    $mn = 'cgg_' . $ll;
                    $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                    $cgst = $$mn + $cgsta;
                    $$mn = $cgst;
                } else {
                    $ll = $yrqf['taxid']; //taxid
                    $mn = 'cgg_' . $ll;
                    $cgsttax[] = $yrqf['taxid'];
                    $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                    $$mn = $cgst;
                }
            }













            $vper = !empty($_SESSION['dper_' . $posale->id]) ? $_SESSION['dper_' . $posale->id] : 0;
            $vamt = !empty($_SESSION['tper_' . $posale->id]) ? $_SESSION['tper_' . $posale->id] : 0;
            $totaltaxg = (int)$kmkm['tax'] + (int)$kmkm['sgst'];




            $tkmx1 = (int) $kmkm['rrate'] * (int) $posale->qt;
            $tkmx2 = (int) $posale->price * (int) $posale->qt;
            $tkmx3 = $tkmx1 - $tkmx2;
            $tkmx45 = $tkmx3 + $tkmx45;



            if ($print_tb->productlist_one_two == 1) {
                $ticket .= '<tr>';
                if ($print_tb->product_sh == 1) {
                    $ticket .= '<td   style="width:' . $pro_width . 'mm;text-align:left;    border-top: 0px solid #ddd; ">' . $posale->name . '</td>';
                }
                if ($print_tb->qt_sh == 1) {
                    $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
                }
                if ($print_tb->mrp_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$kmkm['rrate'], $this->setting->decimals, '.', '') . ' </td>';
                }
                if ($print_tb->rate_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$posale->price, $this->setting->decimals, '.', '') . ' </td>';
                }
                if ($print_tb->tax_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
                }
                if ($print_tb->amt_sh == 1) {

                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float)($posale->qt * $posale->price), $this->setting->decimals, '.', '') . ' </td>';
                }

                $ticket .= '<tr>';
            } else {

                if ($print_tb->product_sh == 1) {

                    $ticket .= '<tr><td  colspan="6"  style="text-align:left;    border-top: 0px solid #ddd; ">' . $posale->name . '</td></tr>';
                }
                $ticket .= '<tr><td style="text-align:center;    border-top: 0px solid #ddd;">&nbsp;</td>';
                if ($print_tb->qt_sh == 1) {
                    $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
                }
                if ($print_tb->mrp_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$kmkm['rrate'], $this->setting->decimals, '.', '') . ' </td>';
                }
                if ($print_tb->rate_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float)$posale->price, $this->setting->decimals, '.', '') . ' </td>';
                }
                if ($print_tb->tax_sh == 1) {
                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
                }
                if ($print_tb->amt_sh == 1) {

                    $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float)($posale->qt * $posale->price), $this->setting->decimals, '.', '') . ' </td>';
                }

                $ticket .= '</tr>';
            }





            $vamttt = $vamt + $vamttt;
            $i++;
        }
        $tgbbb = ($sale->subtotal * $sale->discount) / 100;
        $bcs = 'code128';
        $height = 20;
        $width = 3;
        $ticket .= '<br>

        <tr>
        <td  style="text-align:left;"><b>' . label("TotalItems") . '</b></td>
        <td style="text-align:left; "><b>' . $sale->totalitems . '</b></td>
        <td  style="text-align:left; "><b>' . label("Total") . '</b></td>
        <td colspan="3" style="text-align:right;"><b>Rs.' . $sale->subtotal . '</b></td>
       
        </tr>';



        if (intval($sale->disamtssh)) {
            $ticket .= '<tr>
          
          <td colspan="2" style="text-align:left;">' . label("Shipping") . '</td>
          <td colspan="4" style="text-align:right;font-weight:bold;">Rs.' . number_format((float)$sale->disamtssh, $this->setting->decimals, '.', '') . ' </td>
          
          </tr>';
        }





        $ticket .= '<tr>
             <td colspan="2" style="text-align:left; ">' . label("Discount") . ' ' . label("Amount") . '</td>
             <td colspan="4" style="text-align:right;">Rs.' . number_format((float)($sale->discount_indujul + $sale->discountamount), $this->setting->decimals, '.', '') . '</td><td style="text-align:left;    border-top: 0px solid #ddd;width:' . $olp . ' "></td></tr>';





        $ticket .= '<tr>
        <td colspan="2" style="border-top:0px dashed #000;font-weight:bold;text-align:left;  padding-top:5px;font-weight:bold;;"><b>' . label("GrandTotal") . '</b></td>
        <td colspan="4" style="border-top:0px dashed #000; padding-top:5px; text-align:right;font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;">Rs.' . number_format((float)$sale->total, $this->setting->decimals, '.', '') . ' </td>
        </tr><tr>';

        $lmoxx = $this->db->query("select * from dsales where id='" . $sale->id . "'  order by id desc ")->getRowArray();
        $lkson = $sale->total - $lmoxx['paid'];
        $rrr = $lmoxx['recivamt'];
        $bbb = $lmoxx['ballamtt'];
        $lmqqq = $this->db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ")->getRowArray();



        if ($print_tb->paid_sh == 1) {
            if ($PayMethode[0] == 2) {

                $ticket .= '<td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("CreditCard") . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">xxxx xxxx xxxx ' . substr($PayMethode[1], -4) . '</td></tr>

                <tr><td colspan="2" style="text-align:left; border-top: 0px solid #ddd; padding-top:5px;">' . label("CreditCardHold") . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">' . $PayMethode[2] . '</td></tr>';
            } elseif ($PayMethode[0] == 1) {

                $ticket .= '<td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Paid") . ' </td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float)$sale->paid, $this->setting->decimals, '.', '') . '</td></td>
                </tr>';
            } else {
                $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();
                $ticket .= '<td colspan="2" style="border-top: 0px solid #ddd;text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . (isset($pp_mm['name']) ? $pp_mm['name'] : '') . ' Ref No.</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $PayMethode[1] . '</td></tr>';
            }
        }

        if ($sale->tot_creaditpoint > 0) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Points</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . number_format((float)($sale->tot_creaditpoint), $this->setting->decimals, '.', '') . '</td></td>   
                </tr>';
        }

        if ($sale->lalamt > 0) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Exchange (Ret.ID:' . $sale->lalid . ')</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float)($sale->lalamt), $this->setting->decimals, '.', '') . '</td> </td>   
                </tr>';

            $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Exchange (Ret.ID:' . $sale->lalid . ')</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float)($sale->lalamt), $this->setting->decimals, '.', '') . '</td> </td>   
                </tr>';
        }

        if ($print_tb->received_sh == 1) {
            $ticket .= '<tr>
                <td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Receivedamount") . ' </td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float)($rrr), $this->setting->decimals, '.', '') . ' </td>
                </tr>';
        }
        if ($print_tb->balance_sh == 1) {

            $ticket .= '<tr>
                <td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Balanceamt") . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float)($bbb), $this->setting->decimals, '.', '') . ' </td>


                </tr>';
        }



        if ($print_tb->todaysaving_sh == 1) {


            $ticket .= '<tr>
                <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;border-top: 1px solid #ddd;">' . label("Saving") . '  </td>
                <td colspan="3" style="font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;text-align:left; padding-top:5px;border-top: 1px solid #ddd;"> : Rs.' . number_format((float)($tkmx45), $this->setting->decimals, '.', '') . '</td>
                <td colspan="2" style="font-size:16px;font-weight:bold;padding-top:5px; text-align:right; border-top: 1px solid #ddd;"> </td><td style="text-align:left;    border-top: 1px solid #ddd;"></td>

                </tr>';
        }

        $ticket .= '</tbody></table><br>';

        if ($print_tb->taxx_sh == 1) {


            $ticket .= '<table class="table"  cellspacing="0" border="0"><thead><tr>';

            if ($print_tb->taxname_sh == 1) {
                $ticket .= '<th style="border-top: 1px solid #ddd;padding:8px;" >Tax Name</th>';
            }
            if ($print_tb->taxpersontage_sh == 1) {

                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">%</th>';
            }
            if ($print_tb->taxamt_sh == 1) {
                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">Amt</th>';
            }
            if ($print_tb->taxtotal_sh == 1) {
                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">Total</th>';
            }
            $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;padding:8px;">&nbsp;</th></tr></thead><tbody>';





            $oklzw = mysql_query("SELECT * FROM dtax_summary WHERE salesid='" . $id . "' ");
            while ($oklzwf = mysql_fetch_array($oklzw)) {

                $ticket .= '<tr>';
                if ($print_tb->taxname_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;" >' . $oklzwf['taxname'] . '</td>';
                }
                if ($print_tb->taxpersontage_sh == 1) {

                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' . round(@$oklzwf['taxpercent'], 2) . '</td>';
                }
                if ($print_tb->taxamt_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' .  round(@$oklzwf['taxamount'], 2)   . '</td>';
                }
                if ($print_tb->taxtotal_sh == 1) {
                    $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">' . round(@$oklzwf['taxfrom'], 2) . '</td>';
                }
                $ticket .= '<td style="border-top: 1px solid #ddd;text-align:right;">&nbsp;</td></tr>';
            }

            $ticket .= '</table>';
        }

        $ticket .= '<table class="table" cellspacing="0" border="0" >
 
                    <tr>
                    <td style="text-align:left;    border-top: 0px solid #ddd;"></td>
                    <td style="text-align:left;    border-top: 0px solid #ddd;">' . $this->setting->receiptfooter . '</td>
                    </tr>
                    </tr>
                    </table></div>';



        echo $ticket;
        die;
    }

    // public function showInvoice4($id)
    // {
    //     $saleModel = new SaleModel();
    //     $saleItemModel = new SaleItemModel();
    //     $CustomerModel = new CustomerModel();

    //     // $sale = Sale::find($id);
    //     // $posales = $saleModel->findAll(['sale_id' => $id]);
    //     // $client = $CustomerModel->find(['id' => $sale->client_id]);

    //     $sale = $saleModel->find($id);
    //     $posales = $saleItemModel->getItemsBySaleId($id);
    //     // $posales = $this->db->table('sales')->where('sale_id', $id)->get()->getResult();

    //     $client = $CustomerModel->find(['id' => $sale->client_id]);

    //     $register = $this->db->table('registers')
    //         ->where('id', $sale->register_id)
    //         ->get()
    //         ->getRowArray();

    //     $store = $this->db->table('stores')
    //         ->where('id', $register['store_id'] ?? 0)
    //         ->get()
    //         ->getRow();

    //     $settings = $this->db->table('settings')->where('id', 1)->get()->getRow();

    //     $customerAddress = '';
    //     $customerShipping = '';
    //     $customerGst = '';

    //     if ($sale->client_id > 0 && $client) {
    //         $customerAddress = $client->customeraddress ?? '';
    //         $customerShipping = $client->shppingad ?? '';
    //         $customerGst = $client->gstno ?? '';
    //     }

    //     $data = [
    //         'sale' => $sale,
    //         'posales' => $posales,
    //         'client' => $client,
    //         'store' => $store,
    //         'settings' => $settings,
    //         'customerAddress' => $customerAddress,
    //         'customerShipping' => $customerShipping,
    //         'customerGst' => $customerGst,
    //     ];

    //     return view('invoice/show_invoice4', $data);
    // }

    public function showInvoice4($id)
    {

        $sale = $this->SaleModel->find($id);

        $posales = $this->SaleItemModel->where(['sale_id' => $id])->findAll();
        $client = $this->CustomerModel->where(['id' => $sale->client_id])->find();

        $ClientData = $client ? 'Customer_model: ' . $client->name . '<br>' . $client->phone . '<br>' . $client->email : label('WalkinCustomer');



        $reg_ffrf = $this->db->table('registers')
            ->select('id, store_id')
            ->where('id', $sale->register_id)
            ->get()
            ->getRowArray();

        @$mstoe = $reg_ffrf['store_id'];




        $mstoef = $this->db->query("select * from stores where id='" . $mstoe . "' ")->getRowArray();
        $ccname1 = $sale->clientname;
        $ccname3 = $sale->mobnnm;

        if ($sale->client_id > 0) {
            $ccname2 = $client->customeraddress;
            $ccname569 = $client->shppingad;
            $ccname570 = isset($client->gstno);
        } else {
            $ccname2 = "";
            $ccname569 = "";
            $ccname570 = "";
        }





        $ticket = '<h2 style="text-align:center;margin-bottom:-15px;font-size:16px;">TAX INVOICE </h2> <div style="width:210mm;font-size:10px;margin-top:1px;margin-left: -10px;padding:30px;" >';





        $ticket .= '<div style="border: 1px solid #333;padding:3px;">

            <table class="table" style="width:100%;border-top: 0px solid #333;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;margin-top:30px;" cellspacing="0" border="0"  > 
            <tr>
            <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">

            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
         

            <tr>
            <td style="border-top: 0px;font-size:15px;color:#333;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 45px; "></td>
            </tr>  
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>' . $mstoef['name'] . '</b></td>
            </tr>
            <tr>
            <td style="border-top: 0px;">' . nl2br($mstoef['adresse']) . ',' . $mstoef['city'] . ',' . $mstoef['country'] . '</td>
            </tr>';
        if ($mstoef['phone']) {
            $ticket .= '<tr>
            <td style="border-top: 0px;" >PHONE: ' . $mstoef['phone'] . '</td>
            
            </tr>';
        }

        if ($this->setting->gstnoo) {
            $ticket .= '<tr>
            <td style="border-top: 0px;">GSTIN  : ' . $this->setting->gstnoo . '</td>
            </tr>';
        }

        $rrar = strtotime($sale->created_at);
        $rrarf = date("M d,Y", $rrar);

        $rrarfa = "+" . intval($sale->creddate) . "day";

        $rrarfb = date('M d,Y', strtotime($rrarfa, $rrar));


        $ticket .= '</tbody>
            </table></td>';

        $ticket .= '
            <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

 
            
            <td style="width:60%;border-top: 0px;font-size:15px;"><b>Invoice No </b> </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $sale->id  . '</td>
            </tr>


             <tr style="background:#89b03e !important;color:#fff;">
            
            <td style="border-top: 0px;font-size:13px;">Amount Due</td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . number_format((float)$sale->total, DECIMALS, '.', '')  . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;font-size:13px;">Invoice Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarf  . '</td>
            </tr>

            <tr>
            
            <td style="border-top: 0px;font-size:13px;">Due Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarfb  . '</td>
            </tr>
            </tr>

            </tbody>
            </table></td></tr></table><br>';


        $ticket .= '<table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0"  > 
            <tr>
            <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Buyer</b></td>
            </tr>';
        if ($sale->clientname) {
            $ticket .= '<tr>
            <td style="border-top: 0px;">' . $sale->clientname . '</td>
            </tr>';
        }
        if ($ccname2) {

            $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname2) . '</td>
            </tr>';
        }
        if ($sale->mobnnm) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
        }

        if ($ccname570) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
        }


        $ticket .= '</tbody>
            </table></td>';

        $ticket .= '
            <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Ship To</b></td>
            </tr>';


        if ($ccname569) {

            $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname569) . '</td>
            </tr>';
        }
        if ($sale->mobnnm) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
        }

        if ($ccname570) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
        }
        $ticket .= '</tbody>
            </table></td></tr></table></div>';



        $PayMethode = explode('~', $sale->paidmethod);


        $ticket .= '<br>';

        $ticket .= '<table class="table" cellspacing="0" border="0" style="margin-bottom: 0px;"><thead>
                    <tr style="background:#89b03e !important;color:#fff;font-weight:600;">
                    <th style="width:10px;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;padding:8px;">S.No</th>

                    <th style="width:60mm;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;padding:8px;">' . label("Product") . ' Description</th>

                    <th style="width:15mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("HSN") . '</th>
                    <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("GST") . '</th>

                

                    <th style="width:10mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Qty") . '</th>
                

                    
                    
                    <th  style="width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Rate") . '</th>
                <th  style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Per") . '</th>

                    <th style="text-align:center;width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;padding:8px;">' . label("Total") . '</th>
                    </tr></thead><tbody>';








        $i = 1;
        $t1 = 0;
        $t2 = 0;
        $t3 = 0;
        $t4 = 0;
        $myrtax  = array();
        $iimyrtax  = array();
        $cgsttax = array();
        $iicgsttax = array();
        $cgsttaxamt = array();
        $iicgsttaxamt = array();
        $sgsttax = array();
        $sgsttaxamt = array();

        $summa = array('summ');
        $iisumma = array('iisumm');

        $cgpa = array('cgp');
        $iicgpa = array('cgp');
        $cgamta = array('cgamt');
        $iicgamta = array('cgamt');

        $sgpa = array('sgp');
        $sgpamta = array('sgpamt');
        $ik3 = 0;

        foreach ($posales as $posale) {


            $kmkm = $this->db->query("select * from sale_items where id='" . $posale->id . "' ")->getRowArray();




            $ik1 = $kmkm['price'] * floatVal($kmkm['qt']);
            $ik2 = floatVal($kmkm['mrpp']) * floatVal($kmkm['qt']);

            $fik3 = $ik2 - $ik1;
            $ik3 = $ik3 + $fik3;
            $myrtax[] = (int)$kmkm['cgst'];
            $iimyrtax[] = (int)$kmkm['igstt'];
            $myrtax[] = (int)$kmkm['sgst'];




            if (in_array($kmkm['cgst'], $cgsttax)) {
                $ll = (int)$kmkm['cgst'];
                $mn = 'cgg_' . $ll;
                $amtt = 'amtgg_' . $ll;
                $cgsta = (floatVal($kmkm['subtotal2']) * (int)$kmkm['cgst']) / 100;
                $cgst = $$mn + $cgsta;
                $$mn = $cgst;
            } else {
                $ll = (int)$kmkm['cgst'];
                $mn = 'cgg_' . $ll;
                $cgsttax[] = (int)$kmkm['cgst'];
                $cgst = (floatVal($kmkm['subtotal2']) * (int)$kmkm['cgst']) / 100;
                $$mn = $cgst;
            }
            if (in_array($kmkm['sgst'], $sgsttax)) {
                $ol = (int)$kmkm['sgst'];
                $ms = 'sgg_' . $ol;
                $sgsta = (floatVal($kmkm['subtotal2']) * (int)$kmkm['sgst']) / 100;
                $sgst = $$ms + $sgsta;
                $$ms = $sgst;
            } else {
                $ol = (int)$kmkm['sgst'];
                $ms = 'sgg_' . $ol;
                $sgsttax[] = (int)$kmkm['sgst'];
                $sgst = (intval(floatVal($kmkm['subtotal2'])) * intval($kmkm['sgst'])) / 100;
                $$ms = $sgst;
            }
            $rvv = intval($kmkm['cgst']) + (int)$kmkm['sgst'];
            $mrr = floatVal($kmkm['mrpp']);





            if (in_array($kmkm['igstt'], $iicgsttax)) {
                $llkg = (int)$kmkm['igstt'];
                $iimn = 'iicgg_' . $llkg;

                $iicgsta = (int)(floatVal($kmkm['subtotal2']) * (int)$kmkm['igstt']) / 100;
                $iicgst = $$iimn + $iicgsta;
                $$iimn = $iicgst;
            } else {
                $llkg = (int)$kmkm['igstt'];
                $iimn = 'iicgg_' . $llkg;
                $iicgsttax[] = (int)$kmkm['igstt'];
                $iicgst = ((int)floatVal($kmkm['subtotal2']) * (int)$kmkm['igstt']) / 100;
                $$iimn = $iicgst;
            }








            $jtax = (int)floatVal($posale->cgst) + (int)$posale->sgst;
            $omzz = $this->db->query("select id,unit,hsn  from products where id='" . $posale->product_id . "' ")->getRowArray();

            $ccnn = ((int)floatVal($posale->cgst) * (int)$posale->price * (int)$posale->qt) / 100;
            $t1 = $t1 + $ccnn;
            $ynn = ((int)$posale->sgst * (int)$posale->price * (int)$posale->qt) / 100;
            $t2 = $t2 + $ynn;
            $kkmm = (int)$posale->qt * (int)$posale->price;
            $t3 = $t3 + $kkmm;
            $totot = $ynn + $ccnn + ((int)$posale->qt * (int)$posale->price);
            $t4 = $t4 + $totot;
            $kmmmk = ($sale->discount * $sale->subtotal) / 100;

            if (floatVal($posale->cgst) > 0) {
                $ovtax = floatVal($posale->cgst);
            } else {
                $ovtax = $posale->igstt;
            }



            $ticket .= '
                <tr>
                <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;text-align: center;" >' . $i . '</td>

                <td style="border-top: 0px solid #333;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->name . '</td>
                    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $omzz['hsn'] . '</td>

                <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $ovtax . '%</td>
                    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->qt . '</td>


                    <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' .  number_format((float)$posale->price, DECIMALS, '.', '') . '</td>

                    <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' .  $omzz['unit'] . '</td>

                    <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float)($posale->qt * $posale->price), DECIMALS, '.', '') . ' </td>
            

                
                </tr>';








            $i++;
        }

        for ($xsx = $i; $xsx < 18; $xsx++) {

            $ticket .= '
            <tr>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >&nbsp;</td>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >&nbsp;</td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>


        


            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>

            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>

            <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>
           

            
            </tr>';
        }



        $bcs = 'code128';
        $height = 20;
        $width = 3;

        $ticket .= '

         <tr>
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;border-right: 1px solid #333;" ><b>' . label("Total QTY") . '</b></td>           
            <td  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;text-align:right;" >' . $sale->totalitems . '</td>
            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>' . label("Total") . '</b></td>
            
            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->subtotal, DECIMALS, '.', '') . '</td>
            </tr>';



        $ticket .= '
        



          <tr class="ooooo">
            
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></b></td>
            

            <td style="padding:3px;border-left: 0px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></td>
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Discount 

            </td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discount_indujul + $sale->discountamount), DECIMALS, '.', '') . '</td>
           

            
            </tr>


            ';



        if (intval($sale->disamtssh))
            $ticket .= '



         <tr class="yyyyy">
            
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            

            
            

            <td  colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Shipping
            </td>
            
            

            <td  style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->disamtssh), DECIMALS, '.', '') . '</td>
           

            
            </tr>


            ';





        $numberkkr = $sale->total;

        $decimalkkr = round($numberkkr - ($no = floor($numberkkr)), 2) * 100;
        $hundred = null;
        $digits_length = strlen($no);
        $i = 0;
        $str = array();
        $words = array(
            0 => '',
            1 => 'one',
            2 => 'two',
            3 => 'three',
            4 => 'four',
            5 => 'five',
            6 => 'six',
            7 => 'seven',
            8 => 'eight',
            9 => 'nine',
            10 => 'ten',
            11 => 'eleven',
            12 => 'twelve',
            13 => 'thirteen',
            14 => 'fourteen',
            15 => 'fifteen',
            16 => 'sixteen',
            17 => 'seventeen',
            18 => 'eighteen',
            19 => 'nineteen',
            20 => 'twenty',
            30 => 'thirty',
            40 => 'forty',
            50 => 'fifty',
            60 => 'sixty',
            70 => 'seventy',
            80 => 'eighty',
            90 => 'ninety'
        );
        $digits = array('', 'hundred', 'thousand', 'lakh', 'crore');
        while ($i < $digits_length) {
            $divider = ($i == 2) ? 10 : 100;
            $numberkkr = floor($no % $divider);
            $no = floor($no / $divider);
            $i += $divider == 10 ? 1 : 2;
            if ($numberkkr) {
                $plural = (($counter = count($str)) && $numberkkr > 9) ? 's' : null;
                $hundred = ($counter == 1 && $str[0]) ? ' and ' : null;
                $str[] = ($numberkkr < 21) ? $words[$numberkkr] . ' ' . $digits[$counter] . $plural . ' ' . $hundred : $words[floor($numberkkr / 10) * 10] . ' ' . $words[$numberkkr % 10] . ' ' . $digits[$counter] . $plural . ' ' . $hundred;
            } else $str[] = null;
        }
        $Rupees = implode('', array_reverse($str));
        $paise = ($decimalkkr) ? "." . ($words[$decimalkkr / 10] . " " . $words[$decimalkkr % 10]) . ' Paise' : '';



        $yhh = ucwords($Rupees) . ' Rupees Only';


        $ticket .= '<tr>
            
            <td colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>
            

          
            

            <td colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>Grand Total</b></td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;"><b>' . number_format(
            (float)$sale->total,
            DECIMALS,
            '.',
            ''
        ) . '</b></td>
           

            
            </tr>';



        $lmoxx = $this->db->query("select * from sales where id='" . $sale->id . "'  order by id desc ")->getRowArray();
        $lkson = $sale->total - $lmoxx['paid'];
        $rrr = $lmoxx['recivamt'];
        $bbb = $lmoxx['ballamtt'];
        $lmqqq = $this->db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ")->getRowArray();

        if ($PayMethode[0] == 2) {


            $ticket .= '
               <tr>            
                <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("CreditCard") . ' (xxxx xxxx xxxx ' . substr($PayMethode[1], -4) . ')<br>' . label("CreditCardHold") . '-' . substr($PayMethode[2], 0, 8) . '</td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, DECIMALS, '.', '') . '</td>
                </tr>
                ';
        } else if ($PayMethode[0] == 1) {
            $ticket .= '<tr>            
                    <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                    <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Paid") . ' (' . label("Cash") . ')</td>

                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, DECIMALS, '.', '') . '</td>
                    </tr>';
        } else {
            $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

            $ticket .= '<tr>            
                    <td   colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                    <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . (isset($pp_mm['name']) ? (isset($pp_mm['name']) ? $pp_mm['name'] : '') : '') . '<br>Ref No.' . $PayMethode[1] . '</td>

                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">&nbsp;</td>
                    </tr>
                    ';
        }

        if ($sale->lalamt > 0) {
            $ticket .= '<tr>            
                        <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                        <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '(Ret ID:' . $sale->lalid . ' )</td>

                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, DECIMALS, '.', '') . '</td>
                        </tr>';

            $ticket .= '<tr>            
                        <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                        <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '  ' . $PayMethode[1] . '</td>

                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->lalamt, DECIMALS, '.', '') . '</td>
                        </tr>';
        }

        $ticket .= '
                <tr>            
                <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Receivedamount") . ' </td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$rrr, DECIMALS, '.', '') . '</td>
                </tr>



                <tr>            
                <td  colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;" ><b>' . $yhh . '</b></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;">' . label("Balanceamt") . ' </td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-bottom:1px solid #333;border-right: 1px solid #333;">' . number_format((float)$bbb, DECIMALS, '.', '') . '</td>
                </tr>


                ';









        $ticket .= '</tbody></table>
          <br>';




        $lxzmm = $this->db->query("select * from settings where id=1 ")->getRowArray();
        if ($lxzmm['gst_tax'] == 1) {
            if ($sale->kms == 1) {

                $ticket .= '<table width="60%"  >

                        <tr>            
                        <td style="padding: 3px;text-align:left;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>Tax Name</b></td>        
                        <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>%</b></td>
                        <td  style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;"><b>Amt</b></td>

                        <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;"><b>Total</b></td>
                        </tr>
                        ';


                $oklzw = mysql_query("select * from tax_summary where salesid='" . $id . "' ");
                while ($oklzwf = mysql_fetch_array($oklzw)) {

                    $ticket .= '
                            <tr>            
                        <td style="padding: 3px;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . $oklzwf['taxname'] . '</td>        
                        <td style=" padding: 3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . number_format((float)@$oklzwf['taxpercent'], DECIMALS, '.', '') . '</td>
                        <td  style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float)@$oklzwf['taxamount'], DECIMALS, '.', '')    . '</td>

                        <td style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float)@$oklzwf['taxfrom'], DECIMALS, '.', '') . '</td>
                        </tr>


                        ';
                }
            }
            $ticket .= '</table>';
        }

        $ticket .= '

                <table class="table" style="margin-bottom:0px; width:100%;margin-top:1px;border: 1px solid #333;padding:10px;" cellspacing="0" border="0"  > 
                <tr style="border: 0px solid #ddd;">

                <td style="width:15%;border-top: 0px solid #ddd;padding: 0px;border-right: 1px solid #333;padding:3px;">
                <span >Customer Seal & Sign</span></td>


                <td style="width:30%;border-top: 0px solid #ddd;padding: 0px;">

                <table class="table" style="width:100%;margin-top:1px;margin-bottom: 1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
                        
                        
                            <tr>
                            <td style="border-top: 0px;padding-left:5px;"><b>Terms & conditions </b>: <br>' . $this->setting->declaration . '</td>
                            </tr>
                </table></td>
            <td style="width:25%;border-top: 0px solid #ddd;border-left: 1px solid #333;padding: 0px;">
            <table class="table" style="width:100%;margin-bottom: 1px;margin-top:1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

            <tr >
             <td style="border-top: 0px;padding-left:5px;">Bank</td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->bbank . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;padding-left:5px;">Acc No  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->aaco . '</td>
            </tr> <tr>
            
            <td style="border-top: 0px;padding-left:5px;">IFS   </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->iifs . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Branch  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->bbranch . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Pan  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->pann . '</td>
            </tr>
            </tr>
            </tbody>
            </table></td>


            <td style="width:30%;border-top: 0px solid #ddd;padding: 0px;border-left: 1px solid #333;padding:3px;">
            For ' . ucwords($this->setting->companyname) . '</td>

            </tr></table>

            ';


        $ticket .= '<table style="margin-top:20px;" class="table" cellspacing="0" border="0" >
 
                    <tr><td colspan="2" style="text-align:center;border: 0px solid #fff;background-color: white;padding:0px;">

                ' . $this->setting->receiptfooter . '
                </td>

                </tr>
                
                </table></div>
                ';



        echo $ticket;
        die;
    }

    public function showInvoice44_new($id)
    {
        $sale = $this->DsaleModel->find($id);

        if (!$sale) {
            // Sale not found, handle gracefully
            return redirect()->back()->with('error', 'Sale not found.');
        }

        $posales = $this->DsaleItemModel->where(['sale_id' => $id])->findAll();

        $client = null;
        if (!empty($sale->client_id)) {
            $client = $this->CustomerModel->where(['id' => $sale->client_id])->first(); // use `first()` instead of `find()` for single row
        }

        $register = $this->db->table('registers')
            ->where('id', $sale->register_id)
            ->get()
            ->getRowArray();

        $store = $this->db->table('stores')
            ->where('id', $register['store_id'] ?? 0)
            ->get()
            ->getRowArray();

        $settings = $this->db->table('settings')->where('id', 1)->get()->getRow();

        $customerAddress = '';
        $customerShipping = '';
        $customerGst = '';

        if ($sale->client_id > 0 && $client) {
            $customerAddress = $client->customeraddress ?? '';
            $customerShipping = $client->shppingad ?? '';
            $customerGst = $client->gstno ?? '';
        }

        $data = [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'store' => $store,
            'settings' => $settings,
            'customerAddress' => $customerAddress,
            'customerShipping' => $customerShipping,
            'customerGst' => $customerGst
        ];

        return view('invoice/show_invoice44', $data);
    }


    public function showInvoice44($id)
    {
        $sale = $this->DsaleModel->find($id);

        $posales = $this->DsaleItemModel->where(['sale_id' => $id])->findAll();
        $client = $this->CustomerModel->find($sale->client_id);

        $ClientData = $client ? 'Customer_model: ' . $client->name . '<br>' . $client->phone . '<br>' . $client->email : label('WalkinCustomer');



        $reg_ffrf = $this->db->query("select id,store_id from registers where id='" . $sale->register_id . "'  ")->getRowArray();
        @$mstoe = $reg_ffrf['store_id'];




        $mstoef = $this->db->query("select * from stores where id='" . $mstoe . "' ")->getRowArray();
        $ccname1 = $sale->clientname;
        $ccname3 = $sale->mobnnm;

        if ($sale->client_id > 0) {


            $ccname2 = $client->customeraddress;
            $ccname569 = $client->shppingad;
            $ccname570 = isset($client->gstno);
        } else {
            $ccname2 = "";
            $ccname569 = "";
            $ccname570 = "";
        }





        $ticket = '<h2 style="text-align:center;margin-bottom:-15px;font-size:16px;">TAX INVOICE </h2> <div style="width:210mm;font-size:10px;margin-top:1px;margin-left: -10px;padding:30px;" >';





        $ticket .= '<div style="border: 1px solid #333;padding:3px;">

            <table class="table" style="width:100%;border-top: 0px solid #333;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;margin-top:30px;" cellspacing="0" border="0"  > 
            <tr>
            <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">

            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
         

            <tr>
            <td style="border-top: 0px;font-size:15px;color:#333;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 45px; "></td>
            </tr>  
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>' . $mstoef['name'] . '</b></td>
            </tr>
            <tr>
            <td style="border-top: 0px;">' . nl2br($mstoef['adresse']) . ',' . $mstoef['city'] . ',' . $mstoef['country'] . '</td>
            </tr>';
        if ($mstoef['phone']) {
            $ticket .= '<tr>
            <td style="border-top: 0px;" >PHONE: ' . $mstoef['phone'] . '</td>
            
            </tr>';
        }

        if ($this->setting->gstnoo) {
            $ticket .= '<tr>
            <td style="border-top: 0px;">GSTIN  : ' . $this->setting->gstnoo . '</td>
            </tr>';
        }

        $rrar = strtotime($sale->created_at);
        $rrarf = date("M d,Y", $rrar);

        $rrarfa = "+" . $sale->creddate . "day";

        $rrarfb = date('M d,Y', strtotime($rrarfa, $rrar));




        $ticket .= '</tbody>
            </table></td>';

        $ticket .= '
            <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

 
            
            <td style="width:60%;border-top: 0px;font-size:15px;"><b>Invoice No </b> </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $sale->id  . '</td>
            </tr>


             <tr style="background:#89b03e !important;color:#fff;">
            
            <td style="border-top: 0px;font-size:13px;">Amount Due</td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . number_format((float)$sale->total, DECIMALS, '.', '')  . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;font-size:13px;">Invoice Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarf  . '</td>
            </tr>

            <tr>
            
            <td style="border-top: 0px;font-size:13px;">Due Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarfb  . '</td>
            </tr>

         
      

            </tr>
            </tbody>
            </table></td></tr></table><br>';


        $ticket .= '<table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0"  > 
                    <tr>
                    <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
                    <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
                    <tr>
                    <td style="border-top: 0px;font-size:13px;color:#333;"><b>Buyer</b></td>
                    </tr>';
        if ($sale->clientname) {
            $ticket .= '<tr>
            <td style="border-top: 0px;">' . $sale->clientname . '</td>
            </tr>';
        }
        if ($ccname2) {

            $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname2) . '</td>
            </tr>';
        }
        if ($sale->mobnnm) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
        }

        if ($ccname570) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
        }


        $ticket .= '</tbody>
            </table></td>';

        $ticket .= '
            <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Ship To</b></td>
            </tr>';


        if ($ccname569) {

            $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname569) . '</td>
            </tr>';
        }
        if ($sale->mobnnm) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
        }

        if ($ccname570) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
        }
        $ticket .= '</tbody>
                    </table></td></tr></table></div>';



        $PayMethode = explode('~', $sale->paidmethod);


        $ticket .= '<br>';

        $ticket .= '<table class="table" cellspacing="0" border="0" style="margin-bottom: 0px;"><thead>
                <tr style="background:#89b03e !important;color:#fff;font-weight:600;">
                <th style="width:10px;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;padding:8px;">S.No</th>
                <th style="width:60mm;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;padding:8px;">' . label("Product") . ' Description</th>
                <th style="width:15mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("HSN") . '</th>
                <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("GST") . '</th>
                <th style="width:10mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Qty") . '</th>
                <th  style="width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Rate") . '</th>
                <th  style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Per") . '</th>
                <th style="text-align:center;width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;padding:8px;">' . label("Total") . '</th>
                </tr></thead><tbody>';



        $i = 1;
        $t1 = 0;
        $t2 = 0;
        $t3 = 0;
        $t4 = 0;
        $myrtax  = array();
        $iimyrtax  = array();
        $cgsttax = array();
        $iicgsttax = array();
        $cgsttaxamt = array();
        $iicgsttaxamt = array();
        $sgsttax = array();
        $sgsttaxamt = array();

        $summa = array('summ');
        $iisumma = array('iisumm');

        $cgpa = array('cgp');
        $iicgpa = array('cgp');
        $cgamta = array('cgamt');
        $iicgamta = array('cgamt');

        $sgpa = array('sgp');
        $sgpamta = array('sgpamt');
        $ik3 = 0;

        foreach ($posales as $posale) {


            $kmkm = $this->db->query("select * from dsale_items where id='" . $posale->id . "' ")->getRowArray();




            $ik1 = $kmkm['price'] * floatval($kmkm['qt']);
            $ik2 = floatVal($kmkm['mrpp']) * floatVal($kmkm['qt']);

            $fik3 = $ik2 - $ik1;
            $ik3 = $ik3 + $fik3;
            $myrtax[] = (int)$kmkm['cgst'];
            $iimyrtax[] = (int)$kmkm['igstt'];
            $myrtax[] = (int)$kmkm['sgst'];




            if (in_array($kmkm['cgst'], $cgsttax)) {
                $ll = (int)$kmkm['cgst'];
                $mn = 'cgg_' . $ll;
                $amtt = 'amtgg_' . $ll;
                $cgsta = (floatVal($kmkm['subtotal2']) * (int)$kmkm['cgst']) / 100;
                $cgst = $$mn + $cgsta;
                $$mn = $cgst;
            } else {
                $ll = (int)$kmkm['cgst'];
                $mn = 'cgg_' . $ll;
                $cgsttax[] = (int)$kmkm['cgst'];
                $cgst = (floatVal($kmkm['subtotal2']) * (int)$kmkm['cgst']) / 100;
                $$mn = $cgst;
            }
            if (in_array($kmkm['sgst'], $sgsttax)) {
                $ol = (int)$kmkm['sgst'];
                $ms = 'sgg_' . $ol;
                $sgsta = (floatVal($kmkm['subtotal2']) * (int)$kmkm['sgst']) / 100;
                $sgst = $$ms + $sgsta;
                $$ms = $sgst;
            } else {
                $ol = (int)$kmkm['sgst'];
                $ms = 'sgg_' . $ol;
                $sgsttax[] = (int)$kmkm['sgst'];
                $sgst = (int)(floatVal($kmkm['subtotal2']) * (int)($kmkm['sgst'])) / 100;
                $$ms = $sgst;
            }
            $rvv = (int)$kmkm['cgst'] + (int)$kmkm['sgst'];
            $mrr = floatVal($kmkm['mrpp']);





            if (in_array($kmkm['igstt'], $iicgsttax)) {
                $llkg = (int)$kmkm['igstt'];
                $iimn = 'iicgg_' . $llkg;

                $iicgsta = ((int)floatVal($kmkm['subtotal2']) * (int)$kmkm['igstt']) / 100;
                $iicgst = $$iimn + $iicgsta;
                $$iimn = $iicgst;
            } else {
                $llkg = (int)$kmkm['igstt'];
                $iimn = 'iicgg_' . $llkg;
                $iicgsttax[] = (int)$kmkm['igstt'];
                $iicgst = ((int)floatVal($kmkm['subtotal2']) * (int)$kmkm['igstt']) / 100;
                $$iimn = $iicgst;
            }








            $jtax = (int)floatVal($posale->cgst) + (int)$posale->sgst;
            $omzz = $this->db->query("select id,unit,hsn  from products where id='" . $posale->product_id . "' ")->getRowArray();

            $ccnn = (floatVal($posale->cgst) * $posale->price * $posale->qt) / 100;
            $t1 = $t1 + $ccnn;
            $ynn = ((int)$posale->sgst * (int)$posale->price * (int)$posale->qt) / 100;
            $t2 = $t2 + $ynn;
            $kkmm = (int)$posale->qt * (int)$posale->price;
            $t3 = $t3 + $kkmm;
            $totot = $ynn + $ccnn + ((int)$posale->qt * (int)$posale->price);
            $t4 = (int)$t4 + (int)$totot;
            $kmmmk = ((int)$sale->discount * (int)$sale->subtotal) / 100;

            if (floatVal($posale->cgst) > 0) {
                $ovtax = (int)floatVal($posale->cgst);
            } else {
                $ovtax = (int)$posale->igstt;
            }



            $ticket .= '
            <tr>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;text-align: center;" >' . $i . '</td>

            <td style="border-top: 0px solid #333;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->name . '</td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $omzz['hsn'] . '</td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $ovtax . '%</td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->qt . '</td>
            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' .  number_format((float)$posale->price, DECIMALS, '.', '') . '</td>

            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' .  $omzz['unit'] . '</td>

            <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float)($posale->qt * $posale->price), DECIMALS, '.', '') . ' </td>
           
            </tr>';

            $i++;
        }

        for ($xsx = $i; $xsx < 18; $xsx++) {

            $ticket .= '
            <tr>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >&nbsp;</td>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >&nbsp;</td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>

            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>

            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>

            <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>
           

            
            </tr>';
        }



        $bcs = 'code128';
        $height = 20;
        $width = 3;

        $ticket .= '

         <tr>
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;border-right: 1px solid #333;" ><b>' . label("Total QTY") . '</b></td>
            
            <td  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;text-align:right;" >' . $sale->totalitems . '</td>
            
            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>' . label("Total") . '</b></td>
            
            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->subtotal, DECIMALS, '.', '') . '</td>
           
            </tr>';



        $ticket .= '
          <tr class="ooooo">
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></b></td>
            <td style="padding:3px;border-left: 0px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></td>
            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Discount 
            </td>
            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discount_indujul + $sale->discountamount), DECIMALS, '.', '') . '</td>
           
            </tr>';

        if (intval($sale->disamtssh))
            $ticket .= '
         <tr class="yyyyy">
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            
            <td  colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Shipping
            </td>
            
            <td  style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->disamtssh), DECIMALS, '.', '') . '</td>
           
            </tr>';

        $numberkkr = $sale->total;

        $decimalkkr = round($numberkkr - ($no = floor($numberkkr)), 2) * 100;
        $hundred = null;
        $digits_length = strlen($no);
        $i = 0;
        $str = array();
        $words = array(
            0 => '',
            1 => 'one',
            2 => 'two',
            3 => 'three',
            4 => 'four',
            5 => 'five',
            6 => 'six',
            7 => 'seven',
            8 => 'eight',
            9 => 'nine',
            10 => 'ten',
            11 => 'eleven',
            12 => 'twelve',
            13 => 'thirteen',
            14 => 'fourteen',
            15 => 'fifteen',
            16 => 'sixteen',
            17 => 'seventeen',
            18 => 'eighteen',
            19 => 'nineteen',
            20 => 'twenty',
            30 => 'thirty',
            40 => 'forty',
            50 => 'fifty',
            60 => 'sixty',
            70 => 'seventy',
            80 => 'eighty',
            90 => 'ninety'
        );
        $digits = array('', 'hundred', 'thousand', 'lakh', 'crore');
        while ($i < $digits_length) {
            $divider = ($i == 2) ? 10 : 100;
            $numberkkr = floor($no % $divider);
            $no = floor($no / $divider);
            $i += $divider == 10 ? 1 : 2;
            if ($numberkkr) {
                $plural = (($counter = count($str)) && $numberkkr > 9) ? 's' : null;
                $hundred = ($counter == 1 && $str[0]) ? ' and ' : null;
                $str[] = ($numberkkr < 21) ? $words[$numberkkr] . ' ' . $digits[$counter] . $plural . ' ' . $hundred : $words[floor($numberkkr / 10) * 10] . ' ' . $words[$numberkkr % 10] . ' ' . $digits[$counter] . $plural . ' ' . $hundred;
            } else $str[] = null;
        }
        $Rupees = implode('', array_reverse($str));
        $paise = ($decimalkkr) ? "." . ($words[$decimalkkr / 10] . " " . $words[$decimalkkr % 10]) . ' Paise' : '';



        $yhh = ucwords($Rupees) . ' Rupees Only';


        $ticket .= '<tr>
            
            <td colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>
            

          
            

            <td colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>Grand Total</b></td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;"><b>' . number_format((float)$sale->total, DECIMALS, '.', '') . '</b></td>
           

            
            </tr>';



        $lmoxx = $this->db->query("select * from dsales where id='" . $sale->id . "'  order by id desc ")->getRowArray();
        $lkson = $sale->total - $lmoxx['paid'];
        $rrr = $lmoxx['recivamt'];
        $bbb = $lmoxx['ballamtt'];
        $lmqqq = $this->db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ")->getRowArray();

        if ($PayMethode[0] == 2) {


            $ticket .= '
               <tr>            
                <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("CreditCard") . ' (xxxx xxxx xxxx ' . substr($PayMethode[1], -4) . ')<br>' . label("CreditCardHold") . '-' . substr($PayMethode[2], 0, 8) . '</td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, DECIMALS, '.', '') . '</td>
                </tr>
                ';
        } else if ($PayMethode[0] == 1) {
            $ticket .= '<tr>            
                    <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                    <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Paid") . ' (' . label("Cash") . ')</td>

                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, DECIMALS, '.', '') . '</td>
                    </tr>';
        } else {
            $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

            $ticket .= '<tr>            
                    <td   colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                    <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . (isset($pp_mm['name']) ? $pp_mm['name'] : '') . '<br>Ref No.' . $PayMethode[1] . '</td>

                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">&nbsp;</td>
                    </tr>
                    ';
        }

        if ($sale->lalamt > 0) {
            $ticket .= '<tr>            
                        <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                        <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '(Ret ID:' . $sale->lalid . ' )</td>

                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, DECIMALS, '.', '') . '</td>
                        </tr>';

            $ticket .= '<tr>            
                        <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                        <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '  ' . $PayMethode[1] . '</td>

                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->lalamt, DECIMALS, '.', '') . '</td>
                        </tr>';
        }

        $ticket .= '
                <tr>            
                <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Receivedamount") . ' </td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$rrr, DECIMALS, '.', '') . '</td>
                </tr>



                <tr>            
                <td  colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;" ><b>' . $yhh . '</b></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;">' . label("Balanceamt") . ' </td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-bottom:1px solid #333;border-right: 1px solid #333;">' . number_format((float)$bbb, DECIMALS, '.', '') . '</td>
                </tr>';









        $ticket .= '</tbody></table>
          <br>';




        $lxzmm = $this->db->query("select * from settings where id=1 ")->getRowArray();
        if ($lxzmm['gst_tax'] == 1) {
            if ($sale->kms == 1) {

                $ticket .= '<table width="60%"  >

                        <tr>            
                        <td style="padding: 3px;text-align:left;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>Tax Name</b></td>        
                        <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>%</b></td>
                        <td  style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;"><b>Amt</b></td>

                        <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;"><b>Total</b></td>
                        </tr>
                        ';


                $oklzw = mysql_query("select * from dtax_summary where salesid='" . $id . "' ");
                while ($oklzwf = mysql_fetch_array($oklzw)) {

                    $ticket .= '
                        <tr>            
                        <td style="padding: 3px;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . $oklzwf['taxname'] . '</td>        
                        <td style=" padding: 3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . number_format((float)@$oklzwf['taxpercent'], DECIMALS, '.', '') . '</td>
                        <td  style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float)@$oklzwf['taxamount'], DECIMALS, '.', '')    . '</td>

                        <td style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float)@$oklzwf['taxfrom'], DECIMALS, '.', '') . '</td>
                        </tr>';
                }
            }
            $ticket .= '</table>';
        }

        $ticket .= '

                <table class="table" style="margin-bottom:0px; width:100%;margin-top:1px;border: 1px solid #333;padding:10px;" cellspacing="0" border="0"  > 
                <tr style="border: 0px solid #ddd;">

                <td style="width:15%;border-top: 0px solid #ddd;padding: 0px;border-right: 1px solid #333;padding:3px;">
                <span >Customer Seal & Sign</span></td>


                <td style="width:30%;border-top: 0px solid #ddd;padding: 0px;">

                <table class="table" style="width:100%;margin-top:1px;margin-bottom: 1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
         
           
            <tr>
            <td style="border-top: 0px;padding-left:5px;"><b>Terms & conditions </b>: <br>' . $this->setting->declaration . '</td>
            </tr>
            </table></td>
            <td style="width:25%;border-top: 0px solid #ddd;border-left: 1px solid #333;padding: 0px;">
            <table class="table" style="width:100%;margin-bottom: 1px;margin-top:1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

            <tr >
             <td style="border-top: 0px;padding-left:5px;">Bank</td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->bbank . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;padding-left:5px;">Acc No  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->aaco . '</td>
            </tr> <tr>
            
            <td style="border-top: 0px;padding-left:5px;">IFS   </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->iifs . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Branch  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->bbranch . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Pan  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->pann . '</td>
            </tr>
            </tr>
            </tbody>
            </table></td>


            <td style="width:30%;border-top: 0px solid #ddd;padding: 0px;border-left: 1px solid #333;padding:3px;">
            For ' . ucwords($this->setting->companyname) . '</td>

            </tr></table>

            ';


        $ticket .= '<table style="margin-top:20px;" class="table" cellspacing="0" border="0" >
 
            <tr><td colspan="2" style="text-align:center;border: 0px solid #fff;background-color: white;padding:0px;">

          ' . $this->setting->receiptfooter . '
          </td>

          </tr>
          
          </table></div>
          ';



        echo $ticket;
        die;
    }

    public function qshowInvoice4($id)
    {
        helper(['text', 'number']);

        $db = db_connect();

        $sale = (new Saleq())->find($id);
        $posales = (new SaleItemq())->where('sale_id', $id)->findAll();
        $client = (new CustomerModel())->where('id', $sale['client_id'])->first();

        $mstoe = $db->table('registers')->select('store_id')->where('id', $sale['register_id'])->get()->getRowArray()['store_id'] ?? null;
        $store = $db->table('stores')->where('id', $mstoe)->get()->getRowArray();

        $customerAddress = $client ? $client['customeraddress'] : '';
        $customerShipping = $client ? $client['shppingad'] : '';
        $customerGst = $client['gstno'] ?? '';

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();

        echo view('invoices/qshow_invoice4', [
            'sale' => (object) $sale,
            'posales' => $posales,
            'client' => (object) $client,
            'store' => $store,
            'settings' => (object) $settings,
            'customerAddress' => $customerAddress,
            'customerShipping' => $customerShipping,
            'customerGst' => $customerGst,
        ]);
    }

    public function qshowInvoice($id)
    {
        $db = db_connect();

        $sale = (new Saleq())->find($id);
        $posales = (new SaleItemq())->where('sale_id', $id)->findAll();
        $client = (new CustomerModel())->find($sale->client_id);

        $register = $db->table('registers')->where('id', $sale->register_id)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $register['store_id'])->get()->getRowArray();

        $customerAddress = $client ? $client->customeraddress : '';
        $customerShipping = $client ? $client->shppingad : '';
        $customerGst = $client ? $client->gstno : '';

        $viewData = [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'store' => $store,
            'settings' => $this->setting,
            'customerAddress' => $customerAddress,
            'customerShipping' => $customerShipping,
            'customerGst' => $customerGst,
        ];

        echo view('invoices/qshow_invoice', $viewData);
    }


    public function showInvoice($id)
    {
        $saleModel = new SaleModel();
        $saleItemModel = new SaleItemModel();
        $customerModel = new CustomerModel();
        $registerModel = new RegisterModel();
        $storeModel = new StoreModel();

        $sale = $saleModel->find($id);
        $posales = $saleItemModel->where('sale_id', $id)->findAll();
        $client = $customerModel->where('id', $sale['client_id'])->first();

        $store_id = $registerModel->select('store_id')->find($sale['register_id'])['store_id'] ?? null;
        $store = $storeModel->find($store_id);

        $data = [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $client,
            'store' => $store,
            'setting' => $this->setting
        ];

        return view('invoices/invoice_view', $data);
    }

    public function Edit_Ajax($id)
    {
        $customerModel = new CustomerModel();
        $saleModel = new SaleModel();

        $sale = $saleModel->asArray()->find($id);
        $customers = $customerModel->asArray()->findAll();

        $data = [
            'sale' => $sale,
            'customers' => $customers,
        ];

        return view('invoice/edit_ajax', $data);
    }

    public function Update_Sale($id)
    {

        $saleModel = new SaleModel();

        $data = [
            'client_id'    => $this->request->getPost('customerId'),
            'clientname'   => $this->request->getPost('customer'),
            'status'       => $this->request->getPost('Status'),
            'modified_at'  => date('Y-m-d H:i:s'),
        ];

        $saleModel->update($id, $data);

        return redirect()->back();
    }

    public function payaments($id)
    {

        $sale = $this->SaleModel->asArray()->find($id);
        $payements = $this->PaymentModel->where('sale_id', $id)->asArray()->findAll();

        $data = [
            'sale' => $sale,
            'payements' => $payements,
            'setting' => $this->setting
        ];

        return view('invoice/payments', $data);
    }

    public function addPayament($type)
    {
        $saleModel = $this->SaleModel;
        $PaymentModel = $this->PaymentModel;

        $sale = $saleModel->asArray()->find($this->request->getPost('sale_id'));
        $paid = floatval($this->request->getPost('paid'));
        $newPaid = $sale['paid'] + $paid;

        $status = ($newPaid >= $sale['total']) ? 0 : 2;

        $PaymentModel->insert([
            'sale_id' => $sale['id'],
            'paid' => $paid,
            'date' => date('Y-m-d H:i:s'),
            'paidmethod' => $this->request->getPost('paidmethod'),
            'created_by' => session()->get('user_id')
        ]);

        $saleModel->update($sale['id'], ['paid' => $newPaid, 'status' => $status]);

        return $this->response->setJSON(['status' => true]);
    }

    public function deletePayement($id, $sale_id)
    {
        $payementModel = new PayementModel();
        $saleModel = new SaleModel();

        $payement = $payementModel->find($id);
        $sale = $saleModel->find($sale_id);
        $newPaid = $sale['paid'] - $payement['paid'];
        $status = ($newPaid <= 0) ? 1 : 2;

        $saleModel->update($sale_id, ['paid' => $newPaid, 'status' => $status]);
        $payementModel->delete($id);

        return $this->response->setJSON(['status' => true]);
    }

    public function sendEmailTok($id)
    {
        $to = $this->request->getPost('emaill');
        $saleModel = new SaleModel();
        $sale = $saleModel->find($id);

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'contactforms01@gmail.com';
        $mail->Password = 'contactform';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = 465;

        $mail->setFrom('karu@codetechnology.in', 'POS');
        $mail->addAddress($to);
        $mail->Subject = 'Pos Purchase Order Detail';
        $mail->isHTML(true);

        $data = ['sale' => $sale, 'setting' => $this->setting];
        $mailContent = view('invoices/email_invoice', $data);
        $mail->Body = $mailContent;

        if (!$mail->send()) {
            return $this->response->setJSON(['status' => false, 'message' => $mail->ErrorInfo]);
        }

        return $this->response->setJSON(['status' => true]);
    }

    public function showTicketk($id)
    {
        $saleModel = new SaleModel();
        $sale = $saleModel->find($id);

        $data = ['sale' => $sale];

        return view('invoices/ticket', $data);
    }
}
