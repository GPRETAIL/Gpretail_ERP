<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\InvoiceModel;
use App\Models\UserModel;
use App\Models\SettingModel;
use App\Models\PayementModel;
use Stripe\Stripe;
use Stripe\Charge as StripeCharge;

class InvoicesPur extends BaseController
{
    protected $invoice;
    protected $user;
    protected $setting;
    protected $register;

    public function __construct()
    {
        $session = session();
        $this->invoice = new InvoiceModel(); // FIX: properly instantiate the model
    }
    public function ajax_list()
    {
        $request = service('request');
        $db = \Config\Database::connect();
        $start = $request->getPost('start');
        $draw = $request->getPost('draw');

        $list = $this->invoice->get_datatables(); // CI4 model
        $data = [];
        $no = $start;

        foreach ($list as $invoice) {
            $no++;
            $row = [];
            $row[] = date("d-m-Y", strtotime($invoice['purdat']));
            $row[] = sprintf("%05d", $invoice['id']);

            $row[] = $invoice['cgst'] * 2;

            $role = $this->user['role'];
            $permission = $db->table('permission_new')->where('nname', $role)->get()->getRowArray();

            $row[] = $invoice['total'];

            $supplier = $db->table('suppliers')->where('id', $invoice['supplier_id'])->get()->getRowArray();
            $row[] = $supplier['name'] ?? '';

            $store = $db->table('stores')->where('id', $invoice['store_id'])->get()->getRowArray();
            $row[] = $store['name'] ?? '';

            $warehouse = $db->table('warehouses')->where('id', $invoice['warehouse_id'])->get()->getRowArray();
            $row[] = $warehouse['name'] ?? '';

            $createdBy = $db->table('users')->where('id', $invoice['created_by'])->get()->getRowArray();
            $row[] = $createdBy['firstname'] . ' ' . $createdBy['lastname'];

            $action = view('invoice/invoices_pur/_ajax_actions', [
                'invoice' => $invoice,
                'permissions' => $permission
            ]);

            $row[] = $action;
            $data[] = $row;
        }

        $output = [
            "draw" => intval($draw),
            "recordsTotal" => $this->invoice->count_all(),
            "recordsFiltered" => $this->invoice->count_filtered(),
            "data" => $data
        ];

        return $this->response->setJSON($output);
    }


    public function ShowTicket_combo($id)
    {
        $db = \Config\Database::connect();
        $session = session();

        // $storeId = $session->get('storer');
        $storeId = $this->request->getPost('storer');

        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray() ?? [];

        $purchase = $db->table('purchases_combo')->where('id', $id)->get()->getRowArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $items = $db->table('purchase_items_combo')->where('purchase_id', $id)->get()->getResultArray();

        $productData = [];
        $taxSummary = [];
        foreach ($items as $item) {
            $product = $db->table('products')->where('id', $item['product_id'])->get()->getRowArray();

            $cgst = $item['cgst'];
            $sgst = $item['sgst'];
            $qty = (int) $item['qt'];
            $cost = (float) $item['cost'];

            $cgstAmount = ($cost * $qty * $cgst) / 100;
            $sgstAmount = ($cost * $qty * $sgst) / 100;

            // Track tax-wise totals
            $taxSummary['cgst'][$cgst] = ($taxSummary['cgst'][$cgst] ?? 0) + $cgstAmount;
            $taxSummary['sgst'][$sgst] = ($taxSummary['sgst'][$sgst] ?? 0) + $sgstAmount;

            $productData[] = [
                'product_name' => $product['name'] ?? '',
                'selling' => $item['selling'],
                'qt' => $item['qt'],
                'tax' => $cgst + $sgst,
                'subtot' => $item['subtot']
            ];
        }

        $data = [
            'store' => $store,
            'purchase' => $purchase,
            'items' => $productData,
            'taxEnabled' => $settings['gst_tax'],
            'totalQty' => array_sum(array_column($productData, 'qty')),
            'totalAmount' => $purchase['betot'],
            'setting' => $this->setting,
            'taxSummary' => $taxSummary,
            'id' => $id,
        ];

        return view('invoice/invoices_pur/show_ticket_combo', $data);
    }

    public function ajax_delete_combo($id = null)
    {
        if (!$id || !is_numeric($id)) {
            return $this->response->setJSON(['status' => false, 'message' => 'Invalid ID']);
        }

        $db = \Config\Database::connect();

        try {
            // Start transaction
            $db->transStart();

            // Delete combo purchase record
            $db->table('purchases_combo')->where('id', $id)->delete();
            $db->table('purchase_items_combo')->where('purchase_id', $id)->delete();

            // Reset combo products status
            $db->table('products')->where('combo_id', $id)->update(['status' => 1]);

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->response->setJSON(['status' => false, 'message' => 'Delete failed.']);
            }

            return $this->response->setJSON(['status' => true]);
        } catch (\Exception $e) {
            return $this->response->setJSON([
                'status' => false,
                'message' => 'Error: ' . $e->getMessage()
            ]);
        }
    }



    public function showTicketsales($id)
    {
        $db = \Config\Database::connect();
        $session = session();

        $storeId = $session->get('store');
        $sale = $db->table('returnss')->where('re_id', $id)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $sale['storeid'])->get()->getRowArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $items = $db->table('retunn_items')->where('ret_id', $id)->get()->getResultArray();

        $saleItems = [];

        foreach ($items as $item) {
            $saleItem = $db->table('sale_items')->where('id', $item['sl_id'])->get()->getRowArray();
            $saleItems[] = [
                'product_id' => $saleItem['product_id'] ?? '',
                'name'       => $saleItem['name'] ?? '',
                'quantity'   => $item['sl_subtotal']
            ];
        }

        $data = [
            'store' => $store,
            'sale' => $sale,
            'items' => $saleItems,
            'setting' => $this->setting
        ];

        return view('invoice/invoices_pur/show_ticketsales', $data);
    }


    public function ajaxListsales()
    {
        $invoiceModel = new \App\Models\InvoiceModel();
        $db = \Config\Database::connect();

        $list = $invoiceModel->getDatatables();
        $data = [];
        $no = (int) $this->request->getPost('start');

        $oll = $db->query("SELECT * FROM returnss ORDER BY re_id DESC")->getResult();

        foreach ($oll as $invoice) {
            $ssal = $db->query("SELECT * FROM sales WHERE id = ?", [$invoice->re_sales_id])->getRowArray();
            $rsal = $db->query("SELECT * FROM sales WHERE id = ?", [$invoice->purcha_sales_id])->getRowArray();

            $newc = date("d-m-Y", strtotime($invoice->todate));
            $newy = date("Y", strtotime($invoice->todate));
            $no++;

            $row = [];
            $row[] = $newc;
            $row[] = $invoice->re_id;
            // $row[] = $invoice->re_sales_id . '/' . $ssal['yyear'];
            $row[] = $invoice->re_sales_id . '/' . ($ssal['yyear'] ?? '');
            $row[] = $invoice->purcha_sales_id . '/' . ($rsal['yyear'] ?? '');
            $row[] = $invoice->tootal;
            $row[] = $invoice->iteems;

            $lklx = $db->query("SELECT * FROM stores WHERE id = ?", [$invoice->storeid])->getRowArray();
            $row[] = $lklx['name'];

            $user = session()->get('user'); // Ensure you store user data in session

            if ($user->role === "admin") {
                $row[] = '
                    <div class="btn-group">
                        <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown"><i class="fa fa-cog fa-fw"></i> ' . label("Action") . '</a>
                        <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#"><span class="fa fa-caret-down"></span></a>
                        <ul class="dropdown-menu">
                            <li><a href="javascript:void(0)" onclick="showTicket(\'' . $invoice->re_id . '\')"><i class="fa fa-ticket fa-fw"></i>' . label("View") . '</a></li> 
                        </ul>
                    </div>';
            } else {
                $row[] = '
                    <div class="btn-group">
                        <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown"><i class="fa fa-cog fa-fw"></i> ' . label("Action") . '</a>
                        <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#"><span class="fa fa-caret-down"></span></a>
                        <ul class="dropdown-menu">
                            <li><a href="javascript:void(0)" onclick="showTicket(\'' . $invoice->re_id . '\')"><i class="fa fa-ticket fa-fw"></i>' . label("View") . '</a></li>
                        </ul>
                    </div>';
            }

            $data[] = $row;
        }

        // Get search value
        $searchValue = $this->request->getPost('search')['value'] ?? '';

        $output = [
            "draw" => (int) $this->request->getPost('draw'),
            "recordsTotal" => $invoiceModel->countAll(), // built-in method
            // "recordsFiltered" => $invoiceModel->countFiltered($searchValue), // must pass $search
            "data" => $data
        ];

        return $this->response->setJSON($output);
    }



    public function ajaxListProduction()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $start = $request->getPost('start') ?? 0;
        $draw = $request->getPost('draw') ?? 1;

        $results = $db->table('productionen')->orderBy('date', 'DESC')->get()->getResultArray();
        $data = [];
        $no = $start;

        foreach ($results as $entry) {
            $no++;

            $store = $db->table('stores')->where('id', $entry['storeid'])->get()->getRowArray();

            $row = [
                date('d-m-Y', strtotime($entry['date'])),
                $entry['idd'],
                $entry['totitems'],
                $store['name'] ?? ''
            ];

            $action = '<div class="btn-group">
            <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
                <i class="fa fa-cog fa-fw"></i> ' . label("Action") . '
                <span class="fa fa-caret-down"></span>
            </a>
            <ul class="dropdown-menu">
                <li><a href="javascript:void(0)" onclick="showTicket_phycal(\'' . $entry['idd'] . '\')">
                    <i class="fa fa-ticket fa-fw"></i> ' . label("View") . '</a></li>
            </ul>
        </div>';

            $row[] = $action;
            $data[] = $row;
        }

        $output = [
            "draw" => intval($draw),
            "recordsTotal" => $this->invoice->count_all(),
            "recordsFiltered" => $this->invoice->count_filtered(),
            "data" => $data
        ];

        return $this->response->setJSON($output);
    }


    public function ajaxListPhysical()
    {
        $request = service('request');
        $db = \Config\Database::connect();
        $this->invoice = new InvoiceModel();

        $start = $request->getPost('start') ?? 0;
        $draw = $request->getPost('draw') ?? 1;

        $results = $db->table('physicals')->orderBy('date', 'DESC')->get()->getResultArray();
        $data = [];
        $no = $start;

        foreach ($results as $record) {
            $no++;

            $store = $db->table('stores')->where('id', $record['storeid'])->get()->getRowArray();
            $user = $db->table('users')->where('id', $record['craeted'])->get()->getRowArray();

            $row = [
                date('d-m-Y', strtotime($record['date'])),
                $record['id'],
                $record['totitem'],
                $store['name'] ?? '',
                trim(($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? ''))
            ];

            $row[] = '<div class="btn-group">
            <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
                <i class="fa fa-cog fa-fw"></i> ' . label("Action") . '
                <span class="fa fa-caret-down"></span>
            </a>
            <ul class="dropdown-menu">
                <li><a href="javascript:void(0)" onclick="showTicket_phycal(' . "'" . $record['id'] . "'" . ')">
                    <i class="fa fa-ticket fa-fw"></i> ' . label("View") . '</a></li>
                <li><a href="' . base_url('PhysicalStock/edit/' . $record['id']) . '">
                    <i class="fa fa-pencil"></i> ' . label("Edit") . '</a></li>
                <li><a href="javascript:void(0)" onclick="delete_physical_stock(' . "'" . $record['id'] . "'" . ')">
                    <i class="fa fa-trash"></i> ' . label("Delete") . '</a></li>
            </ul>
        </div>';

            $data[] = $row;
        }

        $output = [
            "draw" => intval($draw),
            "recordsTotal" => $this->invoice->countAll(),
            // "recordsFiltered" => $this->invoice->countFiltered(),
            "data" => $data
        ];

        return $this->response->setJSON($output);
    }


    public function deletePhysicalStock($id = null)
    {
        if (!$id || !is_numeric($id)) {
            return redirect()->to(site_url('physicalstock'))->with('error', 'Invalid ID');
        }

        $db = \Config\Database::connect();

        try {
            $db->table('physicals')->where('id', $id)->delete();

            return redirect()->to(site_url('Physicaltock'))->with('success', 'Physical stock entry deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->to(site_url('PhysicalStock'))->with('error', 'Failed to delete entry: ' . $e->getMessage());
        }
    }

    public function ajaxListpurr()
    {
        $request = service('request');
        $db = \Config\Database::connect();
        $session = session();

        $draw = $request->getPost('draw') ?? 1;
        $start = $request->getPost('start') ?? 0;
        $list = $this->invoice->get_datatables(); // assumes model handles filtering/paging

        $data = [];
        $no = $start;

        foreach ($list as $invoice) {
            $no++;

            $status = match ($invoice['status']) {
                1 => 'unpaid',
                2 => 'Partiallypaid',
                default => 'paid',
            };

            $row = [
                sprintf("%05d", $invoice['id']),
                $invoice['clientname'],
                $invoice['taxamount'],
                $invoice['sgsttaxamt'],
                $invoice['discount'],
                number_format((float)$invoice['total'], $this->setting->decimals, '.', ''),
                $invoice['created_by'],
                $invoice['totalitems'],
                '<span class="' . $status . '">' . label($status) . '</span>'
            ];

            if ($this->user['role'] === "admin") {
                $row[] = '<div class="btn-group">
                <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
                    <i class="fa fa-cog fa-fw"></i> ' . label("Action") . '
                    <span class="fa fa-caret-down"></span>
                </a>
                <ul class="dropdown-menu">
                    <li><a href="javascript:void(0)" onclick="showTicket(\'' . $invoice['id'] . '\')">
                        <i class="fa fa-ticket fa-fw"></i> ' . label("View") . '</a></li>
                </ul></div>';
            } else {
                $row[] = '<div class="btn-group">
                <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
                    <i class="fa fa-cog fa-fw"></i> ' . label("Action") . '
                    <span class="fa fa-caret-down"></span>
                </a>
                <ul class="dropdown-menu">
                    <li><a href="javascript:void(0)" onclick="Edit_Sale(\'' . $invoice['id'] . '\')">
                        <i class="fa fa-pencil fa-fw"></i> ' . label("Edit") . '</a></li>
                    <li><a href="javascript:void(0)" onclick="payaments(\'' . $invoice['id'] . '\')">
                        <i class="fa fa-credit-card-alt fa-fw"></i> ' . label("Payements") . '</a></li>
                    <li><a href="javascript:void(0)" onclick="showInvoice(\'' . $invoice['id'] . '\')">
                        <i class="fa fa-sticky-note"></i> ' . label("invoice") . '</a></li>
                    <li><a href="javascript:void(0)" onclick="showTicket(\'' . $invoice['id'] . '\')">
                        <i class="fa fa-ticket fa-fw"></i> ' . label("View") . '</a></li>
                </ul></div>';
            }

            $data[] = $row;
        }

        $output = [
            "draw" => intval($draw),
            "recordsTotal" => $this->invoice->count_all(),
            "recordsFiltered" => $this->invoice->count_filtered(),
            "data" => $data
        ];

        return $this->response->setJSON($output);
    }


    public function ajaxDelete($id)
    {
        $ksddmc = $this->db->query("select * from  purchases where id='" . $id . "' ")->getRowArray();
        $ksddmcf = $ksddmc['store_id'];

        $kmc = $this->db->query("select * from purchase_items where purchase_id='" . $id . "' ")->getResultArray();
        foreach ($kmc as $kmcf) {
            $kmcff = $kmcf['id'];
            $kprodid = $kmcf['product_id'];
            $kprodqt = $kmcf['qt'];

            $qtclc = $this->db->query("select * from  stocks where store_id='" . $ksddmcf . "' and product_id='" . $kprodid . "' ")->getRowArray();
            $qtclcf = $qtclc['quantity'] - $kprodqt;


            $this->db->query("UPDATE stocks SET quantity='" . $qtclcf . "'  WHERE store_id='" . $ksddmcf . "' AND product_id='" . $kprodid . "'  ");


            $this->db->query("DELETE FROM purchase_items WHERE id='" . $kmcff . "'  ");
            $this->db->query("DELETE FROM stock_transfer WHERE peritemid='" . $kmcff . "' and tyoftrans=1  ");
        }


        $this->invoice->delete_by_id($id);

        echo json_encode(array(
            "status" => TRUE
        ));
        die;
    }


    public function showTicketnot($id)
    {
        $db = \Config\Database::connect();
        $session = session();

        $storeId = $session->get('store');
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();
        $purchase = $db->table('purchases')->where('id', $id)->get()->getRowArray();

        $storeList = $db->table('stores')->select('id, name')->get()->getResultArray();
        $warehouseList = $db->table('warehouses')->select('id, name')->get()->getResultArray();

        $stockInputs = $db->table('stocks')->where('product_id', $purchase['product_id'])->get()->getResultArray();

        $data = [
            'purchase'     => $purchase,
            'currentStore' => $store,
            'stores'       => $storeList,
            'warehouses'   => $warehouseList,
            'product_id'   => $purchase['product_id']
        ];

        return view('invoice/invoices_pur/show_ticket_not', $data);
    }
    public function showTicketPhysi($id)
    {
        $db = \Config\Database::connect();

        $adjustments = $db->table('physivcal_stock')->where('phy_id', $id)->get()->getResultArray();

        $products = [];
        foreach ($adjustments as $item) {
            $product = $db->table('products')->where('id', $item['produid'])->get()->getRowArray();

            $products[] = [
                'name'      => $product['name'] ?? '',
                'befqty'    => $item['befqty'],
                'qty'       => $item['qty'],
                'affqty'    => $item['affqty'],
                'reason'    => match ((int) $item['resonn']) {
                    1 => 'Damaged',
                    2 => 'Expired',
                    default => 'Other Reason'
                }
            ];
        }

        return view('invoice/invoices_pur/show_ticket_physi', ['products' => $products]);
    }


    public function printStocts($id)
    {
        $db = \Config\Database::connect();

        $items = $db->table('purchase_items pi')
            ->select('pi.product_id, pi.qt, p.name')
            ->join('products p', 'p.id = pi.product_id', 'left')
            ->where('pi.purchase_id', $id)
            ->get()
            ->getResultArray();

        echo view('invoice/invoices_pur/print_stocts', [
            'items' => $items,
            'id'    => $id,
        ]);
    }
    public function showTicketProduction($id)
    {
        $db = \Config\Database::connect();

        $items = $db->table('productionitems')->where('productionid', $id)->get()->getResultArray();
        $ticketData = [];

        foreach ($items as $i => $item) {
            $fromProduct = $db->table('products')->where('id', $item['fromproid'])->get()->getRowArray();
            $toProduct = $db->table('products')->where('id', $item['toproid'])->get()->getRowArray();

            $ticketData[] = [
                'serial'     => $i + 1,
                'from_name'  => $fromProduct['name'] ?? '',
                'to_name'    => $toProduct['name'] ?? '',
                'quantity'   => $item['toqty']
            ];
        }

        return view('invoice/invoices_pur/show_ticket_production', ['items' => $ticketData]);
    }

    public function showTicket($id)
    {
        $db = \Config\Database::connect();
        $session = session();

        $storeId = $session->get('store');
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();
        $purchase = $db->table('purchases')->where('id', $id)->get()->getRowArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $items = $db->table('purchase_items')->where('purchase_id', $id)->get()->getResultArray();

        $productRows = [];
        $totalQty = 0;

        foreach ($items as $item) {
            $product = $db->table('products')->where('id', $item['product_id'])->get()->getRowArray();

            $qty = $item['qt'];
            $totalQty += $qty;

            $taxRate = (int)($item['cgst'] ?? 0); // CGST + SGST, but SGST is not printed in original
            $total = $item['qt'] * $item['cost'];

            $productRows[] = [
                'name'     => $product['name'] ?? '',
                'cost'     => $item['cost'],
                'qty'      => $qty,
                'tax'      => $taxRate,
                'subtotal' => $total,
            ];
        }

        echo view('invoice/invoices_pur/show_ticket', [
            'purchase'    => $purchase,
            'store'       => $store,
            'items'       => $productRows,
            'settings'    => $settings,
            'totalQty'    => $totalQty,
            'companyName' => $this->setting->companyname,
            'phone'       => $this->setting->phone,
            'footer'      => $this->setting->receiptfooter,
            'decimals'    => $this->setting->decimals,
        ]);
        die;
    }

    public function showInvoice($id)
    {
        $db = \Config\Database::connect();

        $purchase = $db->table('purchases')->where('id', $id)->get()->getRowArray();
        $items = $db->table('purchase_items')->where('purchase_id', $id)->get()->getResultArray();
        $customer = $db->table('customers')->where('id', $purchase['client_id'])->get()->getRowArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();

        // Format customer block
        $clientData = $customer
            ? "Customer: {$customer['name']}<br>{$customer['phone']}<br>{$customer['email']}"
            : label('WalkinCustomer');

        // Format payment method
        $payMethod = explode('~', $purchase['paidmethod']);

        return view('invoice/invoices_pur/show_invoice', [
            'purchase'     => $purchase,
            'items'        => $items,
            'clientData'   => $clientData,
            'payMethod'    => $payMethod,
            'settings'     => $settings
        ]);
    }

    public function editAjax($id)
    {
        $db = \Config\Database::connect();

        $sale = $db->table('sales')->where('id', $id)->get()->getRowArray();
        $customers = $db->table('customers')->get()->getResultArray();

        $statusClass = match ((int)$sale['status']) {
            1 => 'unpaid',
            2 => 'Partiallypaid',
            default => 'paid',
        };

        $change = $sale['total'] - $sale['paid'];

        echo view('invoice/invoices_pur/edit_ajax', [
            'sale'       => $sale,
            'customers'  => $customers,
            'status'     => $statusClass,
            'change'     => $change,
        ]);
    }

    public function updateSale($id)
    {
        if (!$this->request->isAJAX()) {
            return $this->response->setStatusCode(403)->setBody('Forbidden');
        }

        $db = \Config\Database::connect();
        $request = $this->request;

        $clientId = $request->getPost('customerId');
        $clientName = $request->getPost('customer');
        $status = $request->getPost('Status');

        $now = date('Y-m-d H:i:s'); // Set to timezone via PHP settings or config

        $updateData = [
            'client_id'   => $clientId,
            'clientname'  => $clientName,
            'status'      => $status,
            'modified_at' => $now
        ];

        $db->table('sales')->where('id', $id)->update($updateData);

        return $this->response->setJSON([
            'status' => true,
            'message' => 'Sale updated successfully.'
        ]);
    }

    public function payaments($id)
    {
        $db = \Config\Database::connect();

        $sale = $db->table('sales')->where('id', $id)->get()->getRowArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();

        $payments = $db->table('payements')->where('sale_id', $id)->get()->getResultArray();

        $payMethodRaw = explode('~', $sale['paidmethod']);
        $initialPayMethod = match ($payMethodRaw[0] ?? '0') {
            '1' => 'Credit Card',
            '2' => 'Cheque',
            default => 'Cash'
        };

        return view('invoice/invoices_pur/payaments', [
            'sale'         => $sale,
            'payments'     => $payments,
            'initialMethod' => $initialPayMethod,
            'initialPay'   => $sale['firstpayement'],
            'settings'     => $settings,
        ]);
    }

    public function payamentsrr($id)
    {
        $db = \Config\Database::connect();

        $purchase = $db->table('purchases')->where('id', $id)->get()->getRowArray();
        $payments = $db->table('payment_suplls')->where('purchaid', $id)->get()->getResultArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();

        $totalPaid = array_sum(array_column($payments, 'amtpaid'));
        $balance = $purchase['total'] - $totalPaid;

        echo view('invoice/invoices_pur/payamentsrr', [
            'purchase'   => $purchase,
            'payments'   => $payments,
            'totalPaid'  => $totalPaid,
            'balance'    => $balance,
            'settings'   => $settings
        ]);
    }



    public function addPayament($type)
    {
        helper('text');
        $db = \Config\Database::connect();
        $request = $this->request;

        $data = $request->getPost();
        $data['date'] = date('Y-m-d H:i:s');
        $data['register_id'] = session('register');

        if ($type == 2) {
            try {
                Stripe::setApiKey($this->setting->stripe_secret_key);
                $charge = StripeCharge::create([
                    'card'     => [
                        'number'    => $data['ccnum'],
                        'exp_month' => $data['ccmonth'],
                        'exp_year'  => $data['ccyear'],
                        'cvc'       => $data['ccv'],
                    ],
                    'amount'   => (floatval($data['paid']) * 100),
                    'currency' => $this->setting->currency,
                ]);

                echo "<p class='bg-success text-center'>" . label('saleStripesccess') . '</p>';
            } catch (\Stripe\Exception\CardException $e) {
                $body = $e->getJsonBody();
                $err  = $body['error'];
                echo "<p class='bg-danger text-center'>" . $err['message'] . '</p>';
                return;
            }
        }

        // Remove card data before inserting into database
        unset($data['ccnum'], $data['ccmonth'], $data['ccyear'], $data['ccv']);

        // Insert into payements table
        $db->table('payements')->insert($data);

        // Update the sale record
        $saleId = $data['sale_id'];
        $sale = $db->table('sales')->where('id', $saleId)->get()->getRowArray();

        $newPaid = $sale['paid'] + floatval($data['paid']);
        $status  = $newPaid >= floatval($sale['total']) ? 0 : 2; // 0 = paid, 2 = partially paid

        $db->table('sales')->where('id', $saleId)->update([
            'paid'  => $newPaid,
            'status' => $status
        ]);

        return $this->response->setJSON(['status' => true]);
    }

    public function addPayamentRrr($type)
    {
        $db = \Config\Database::connect();
        $request = $this->request;

        $saleId = $request->getPost('sale_id');
        $paid = floatval($request->getPost('paid'));
        $bank = $request->getPost('bannk');
        $cheque = $request->getPost('chkk');
        $methodId = intval($request->getPost('paidmethod'));
        $createdBy = $request->getPost('created_by');
        $paymentDate = $request->getPost('pddate');

        // Get original purchase record
        $purchase = $db->table('purchases')->where('id', $saleId)->get()->getRowArray();

        // Calculate updated paid and balance
        $previousPayments = $db->table('payment_suplls')
            ->where('purchaid', $saleId)
            ->selectSum('amtpaid')
            ->get()
            ->getRowArray();

        $totalPaidSoFar = floatval($previousPayments['amtpaid'] ?? 0);
        $totalInvoice = floatval($purchase['total']);

        $newTotalPaid = $totalPaidSoFar + $paid;
        $newBalance = $totalInvoice - $newTotalPaid;

        // Update paid amount in purchases table
        $db->table('purchases')->where('id', $saleId)->update([
            'paiddd' => $newTotalPaid
        ]);

        // Insert payment record
        $db->table('payment_suplls')->insert([
            'innvamt'   => $totalInvoice,
            'balaccc'   => $newBalance,
            'sup_id'    => $purchase['supplier_id'],
            'invoicen'  => $purchase['invno'],
            'purchaid'  => $saleId,
            'amtpaid'   => $paid,
            'methid'    => $methodId,
            'bankname'  => $bank,
            'chechno'   => $cheque,
            'bycrted'   => $createdBy,
            'datetch'   => $paymentDate,
            'datet'     => date('Y-m-d')
        ]);

        return $this->response->setJSON(['status' => true]);
    }

    public function deletePayement($id, $sale_id)
    {
        $db = \Config\Database::connect();

        // Fetch the payment record
        $payment = $db->table('payements')->where('id', $id)->get()->getRowArray();

        if (!$payment) {
            return $this->response->setJSON([
                'status' => false,
                'message' => 'Payment not found.'
            ]);
        }

        // Fetch the related sale
        $sale = $db->table('sales')->where('id', $sale_id)->get()->getRowArray();

        if (!$sale) {
            return $this->response->setJSON([
                'status' => false,
                'message' => 'Sale not found.'
            ]);
        }

        // Recalculate paid and status
        $newPaid = floatval($sale['paid']) - floatval($payment['paid']);
        $newStatus = $newPaid <= 0 ? 1 : 2; // 1 = unpaid, 2 = partially paid

        $db->table('sales')->where('id', $sale_id)->update([
            'paid' => $newPaid,
            'status' => $newStatus,
        ]);

        // Delete payment
        $db->table('payements')->where('id', $id)->delete();

        return $this->response->setJSON([
            'status' => true,
            'message' => 'Payment deleted successfully.'
        ]);
    }

    public function deletePayementRrr($id, $sale_id)
    {
        $db = \Config\Database::connect();

        // Get the payment record to remove
        $payment = $db->table('payment_suplls')->where('idd', $id)->get()->getRowArray();

        if (!$payment) {
            return $this->response->setJSON([
                'status' => false,
                'message' => 'Payment not found.'
            ]);
        }

        // Get the related purchase
        $purchase = $db->table('purchases')->where('id', $payment['purchaid'])->get()->getRowArray();

        if (!$purchase) {
            return $this->response->setJSON([
                'status' => false,
                'message' => 'Purchase not found.'
            ]);
        }

        // Deduct the payment from total paiddd
        $newPaid = floatval($purchase['paiddd']) - floatval($payment['amtpaid']);

        $db->table('purchases')->where('id', $purchase['id'])->update([
            'paiddd' => $newPaid
        ]);

        // Delete payment record
        $db->table('payment_suplls')->where('idd', $id)->delete();

        return $this->response->setJSON([
            'status' => true,
            'message' => 'Supplier payment deleted successfully.'
        ]);
    }

    public function ajaxListGoods()
    {
        $db = \Config\Database::connect();
        $query = $db->table('goodsout')->orderBy('dateof', 'DESC')->get();
        $goodsList = $query->getResult();

        $data = [];
        $no = $this->request->getPost('start') ?? 1;

        foreach ($goodsList as $invoice) {
            $no++;
            $row = [];

            // Get warehouse name
            $warehouse = $db->table('warehouses')->where('id', $invoice->wareid)->get()->getRowArray();
            $warehouseName = $warehouse['name'] ?? 'Unknown';

            $row[] = date("d-m-Y", strtotime($invoice->dateof));
            $row[] = $invoice->idd;
            $row[] = $warehouseName;
            $row[] = $invoice->refno;

            // Inline view HTML
            $row[] = '
            <div class="btn-group">
                <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown">
                    <i class="fa fa-cog fa-fw"></i> ' . label("Action") . '
                </a>
                <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
                    <span class="fa fa-caret-down" title="Toggle dropdown menu"></span>
                </a>
                <ul class="dropdown-menu">
                    <li>
                        <a href="javascript:void(0)" onclick="showTicket(\'' . esc($invoice->idd) . '\')">
                            <i class="fa fa-ticket fa-fw" aria-hidden="true"></i> ' . label("View") . '
                        </a>
                    </li>
                </ul>
            </div>';

            $data[] = $row;
        }

        $output = [
            "draw" => $this->request->getPost('draw') ?? 0,
            "recordsTotal" => count($data),
            "recordsFiltered" => count($data),
            "data" => $data
        ];

        return $this->response->setJSON($output);
    }

    public function showTicketGoods($id)
    {
        $db = \Config\Database::connect();

        $goodsOut = $db->table('goodsout')->where('idd', $id)->get()->getRowArray();

        if (!$goodsOut) {
            return $this->response->setBody('Invalid goods ID.');
        }

        $warehouse = $db->table('warehouses')->where('id', $goodsOut['wareid'])->get()->getRowArray();
        $warehouseName = $warehouse['name'] ?? 'Unknown';

        $ticket = '<div class="col-md-12">';
        $ticket .= '<div class="col-sm-6"><div class="form-group"><b>' . label("Voucher") . ' ' . label("Number") . ' </b><br>' . esc($goodsOut['idd']) . '</div></div>';
        $ticket .= '<div class="col-sm-6"><div class="form-group"><b>' . label("Warehouses") . ' </b><br>' . esc($warehouseName) . '</div></div>';
        $ticket .= '<div class="col-sm-6"><div class="form-group"><b>' . label("Date") . ' </b><br>' . date('d-m-Y', strtotime($goodsOut['dateof'])) . '</div></div>';
        $ticket .= '<div class="col-sm-6"><div class="form-group"><b>' . label("Reference") . ' ' . label("Number") . ' </b><br>' . esc($goodsOut['refno']) . '</div></div>';
        $ticket .= '<b>' . label("Products") . ' </b>';
        $ticket .= '</div>';

        $ticket .= '<table class="table" cellspacing="0" border="0"><thead><tr>';
        $ticket .= '<th style="width: 20%;"><em>ID</em></th>';
        $ticket .= '<th style="width: 60%;">' . label("Product") . '</th>';
        $ticket .= '<th style="width: 20%;">Qty</th>';
        $ticket .= '</tr></thead><tbody>';

        $items = $db->table('goodsitems')->where('goodsid', $id)->get()->getResultArray();

        foreach ($items as $item) {
            $product = $db->table('products')->where('id', $item['producid'])->get()->getRowArray();
            $productName = $product['name'] ?? 'Unknown';

            $ticket .= '<tr>';
            $ticket .= '<td>' . esc($item['producid']) . '</td>';
            $ticket .= '<td>' . esc($productName) . '</td>';
            $ticket .= '<td>' . esc($item['qtyy']) . '</td>';
            $ticket .= '</tr>';
        }

        $ticket .= '</tbody></table>';

        return $this->response->setBody($ticket);
    }
}
