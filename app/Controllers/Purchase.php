<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Config\Database;
use App\Models\ProductModel;
use App\Models\CategoryModel;
use App\Models\SupplierModel;
use App\Models\RegisterModel;
use App\Models\UserModel;



class Purchase extends BaseController
{
    protected $register;
    protected $store;
    protected $setting;
    protected $user;
    public function __construct()
    {
        $session = session();
        $this->user = $session->get('user');
        $this->ProductModel = new ProductModel();
        $this->CategoryModel  = new CategoryModel();
        $this->SupplierModel   = new SupplierModel();
        $this->RegisterModel   = new RegisterModel();
        $this->UserModel   = new UserModel();


        $lang = $session->get("lang") ?? "english";
        service('language')->setLocale($lang);

        $this->register = $session->get('register') ?? false;
        $this->store = $session->get('store') ?? false;

        $this->setting = (new \App\Models\SettingModel())->find(1);
        date_default_timezone_set($this->setting->timezone);
    }

    public function index()
    {
        $data['register'] = session()->get('register');
        $data['setting'] = $this->setting;
        return $this->render('purchasee', $data);
    }


    public function addrow_ex()
    {
        $data['count'] = $this->input->post('countid');
        $this->load->view('problemaddrow_exp', $data);
    }


    // public function add_mul()
    // {
    //     $db = \Config\Database::connect();
    //     $session = session();

    //     // $register = $this->register;
    //     $register = $this->RegisterModel;
    //     $userId = $session->get('user')->id;
    //     $user = $db->table('users')->where('id', $userId)->get()->getRow();
    //     $registerData = $db->table('registers')->where('id', $register)->get()->getRow();
    //     dd($registerData);
    //     $storeid = $registerData->store_id;
    //     $createdby = $user->firstname . ' ' . $user->lastname;
    //     $today = date("Y-m-d");

    //     $avlqtyList = $this->request->getPost('avlqty');
    //     $transtyList = $this->request->getPost('transty');
    //     $dishnameList = $this->request->getPost('dishname');
    //     $store_1 = $this->request->getPost('store_1');
    //     $warehouseList = $this->request->getPost('warehouse');

    //     $countt = count($avlqtyList);

    //     if ($countt > 0) {
    //         for ($i = 0; $i < $countt; $i++) {
    //             $avlqty = $avlqtyList[$i];
    //             $transty = $transtyList[$i];
    //             if ($avlqty > 0 && $transty > 0) {
    //                 $productId = $dishnameList[$i];
    //                 $storeId = $store_1;
    //                 $warehouseId = $warehouseList[$i];
    //                 $transferQty = $transty;

    //                 $stock = $db->table('stocks')
    //                     ->where('product_id', $productId)
    //                     ->where('store_id', $storeId)
    //                     ->get()
    //                     ->getRow();

    //                 if (!$stock) {
    //                     // Insert new stock_transfer
    //                     $db->table('stock_transfer')->insert([
    //                         'war_id' => $warehouseId,
    //                         'store_id' => $storeId,
    //                         'pro_id' => $productId,
    //                         'qty' => $transferQty,
    //                         'tyoftrans' => 1,
    //                         'date' => $today,
    //                         'bywhom' => $createdby,
    //                         'perselphy_ids' => 0,
    //                     ]);

    //                     // Insert new stock record
    //                     $db->table('stocks')->insert([
    //                         'product_id' => $productId,
    //                         'type' => 'IN',
    //                         'store_id' => $storeId,
    //                         'warehouse_id' => $warehouseId,
    //                         'quantity' => $transferQty,
    //                         'datte' => $today,
    //                     ]);
    //                 } else {
    //                     $updatedQty = $stock->quantity + $transferQty;

    //                     // Insert stock_transfer log
    //                     $db->table('stock_transfer')->insert([
    //                         'war_id' => $warehouseId,
    //                         'store_id' => $storeId,
    //                         'pro_id' => $productId,
    //                         'qty' => $transferQty,
    //                         'tyoftrans' => 1,
    //                         'date' => $today,
    //                         'bywhom' => $createdby,
    //                         'perselphy_ids' => 0,
    //                     ]);

    //                     // Update existing stock
    //                     $db->table('stocks')
    //                         ->where('product_id', $productId)
    //                         ->where('store_id', $storeId)
    //                         ->update([
    //                             'type' => '0',
    //                             'quantity' => $updatedQty,
    //                             'datte' => $today,
    //                             'warehouse_id' => $warehouseId,
    //                         ]);
    //                 }
    //             }
    //         }

    //         return redirect()->to('purchase');
    //     }

    //     return redirect()->to('purchase');
    // }


    public function add_mul()
    {
        $registerId = session()->get('register');
        $userId = session()->get('user_id');


        $register = $this->RegisterModel->find($registerId);
        $user = $this->UserModel->find($userId);

        if (!$register || !$user) {
            return redirect()->to('purchase')->with('error', 'Invalid register or user.');
        }

        $storeid = $register->store_id ?? null;
        $createdby = $user->firstname . ' ' . $user->lastname;
        $kmddwe = date("Y-m-d");

        $avlqty = $this->request->getPost('avlqty');
        $transty = $this->request->getPost('transty');
        $dishname = $this->request->getPost('dishname');
        $store_1 = $this->request->getPost('store_1');
        $warehouse = $this->request->getPost('warehouse');

        $countt = count($avlqty);

        if ($countt > 0) {
            $db = \Config\Database::connect();

            for ($i = 0; $i < $countt; $i++) {
                if ($avlqty[$i] > 0 && $transty[$i] > 0) {
                    $proiddd = $dishname[$i];
                    $strid = $store_1;
                    $warr = $warehouse[$i];
                    $kmmwe = $transty[$i];

                    // Check if stock record exists
                    $stockCheck = $db->table('stocks')
                        ->where('product_id', $proiddd)
                        ->where('store_id', $strid)
                        ->get()
                        ->getRowArray();

                    if (!$stockCheck) {
                        // No stock found, insert new
                        $db->table('stock_transfer')->insert([
                            'war_id' => $warr,
                            'store_id' => $strid,
                            'pro_id' => $proiddd,
                            'qty' => $kmmwe,
                            'tyoftrans' => 1,
                            'date' => $kmddwe,
                            'bywhom' => $createdby,
                            'perselphy_ids' => 0
                        ]);

                        $db->table('stocks')->insert([
                            'product_id' => $proiddd,
                            'type' => 'IN',
                            'store_id' => $strid,
                            'warehouse_id' => $warr,
                            'quantity' => $kmmwe,
                            'datte' => $kmddwe
                        ]);
                    } else {
                        // Update existing stock
                        $newQty = $stockCheck['quantity'] + $kmmwe;

                        $db->table('stock_transfer')->insert([
                            'war_id' => $warr,
                            'store_id' => $strid,
                            'pro_id' => $proiddd,
                            'qty' => $kmmwe,
                            'tyoftrans' => 1,
                            'date' => $kmddwe,
                            'bywhom' => $createdby,
                            'perselphy_ids' => 0
                        ]);

                        $db->table('stocks')
                            ->where('product_id', $proiddd)
                            ->where('store_id', $strid)
                            ->update([
                                'type' => 0,
                                'quantity' => $newQty,
                                'datte' => $kmddwe,
                                'warehouse_id' => $warr
                            ]);
                    }
                }
            }

            return redirect()->to('purchase')->with('success', 'Stock transfer(s) processed successfully.');
        }

        return redirect()->to('purchase')->with('warning', 'No valid stock entries found.');
    }


    public function get_subcatqtt()
    {
        $db = \Config\Database::connect();
        $productId = $this->request->getGet('country');
        $warehouseId = $this->request->getGet('warr');

        if ($productId > 0 && $warehouseId > 0) {
            // Total purchased quantity
            $purchased = $db->table('purchase_items')
                ->selectSum('qt')
                ->where('warehouse_id', $warehouseId)
                ->where('product_id', $productId)
                ->get()
                ->getRow()
                ->qt ?? 0;

            // Total transferred quantity
            $transferred = $db->table('stock_transfer')
                ->selectSum('qty')
                ->where('war_id', $warehouseId)
                ->where('pro_id', $productId)
                ->where('tyoftrans', 1)
                ->where('store_id >', 0)
                ->get()
                ->getRow()
                ->qty ?? 0;

            // Available quantity
            $available = $purchased - $transferred;

            echo $available;
        } else {
            echo 0;
        }
        exit;
    }

    public function get_subcat_exp()
    {
        $db = \Config\Database::connect();
        $brandId = $this->request->getGet('country');

        echo '<option value="">Select</option>';

        $products = $db->table('products')
            ->where('brandd', $brandId)
            ->orderBy('name', 'asc')
            ->get()
            ->getResult();

        foreach ($products as $product) {
            echo '<option value="' . esc($product->id) . '">' . esc(ucfirst($product->name)) . '</option>';
        }

        exit;
    }
    public function addtodbb_combo()
    {
        if (!$this->session->get('register')) {
            return redirect()->to('combooffer/add?error=Please Open Store');
        }

        $register = new RegisterModel();
        $userModel = new UserModel();
        $productModel = new ProductModel();

        $db = $this->db;
        $session = session();

        $registerData = $register->find($session->get('register'));
        $userData = $userModel->find($registerData->user_id);
        $storeId = $registerData->store_id;
        $createdBy = $userData->firstname . ' ' . $userData->lastname;

        $data = $this->request->getPost();
        $la32 = date("Y-m-d", strtotime($data['pddate']));

        if ($data['betot'] > 0 && $data['afftot'] > 0) {
            $comboData = [
                'discper'      => 0,
                'discamt'      => $data['ddkst'],
                'invno'        => $data['innvno'],
                'purdat'       => $la32,
                'purtpy'       => $data['pptye'],
                'invdat'       => $data['innvdda'],
                'invamt'       => $data['innvamt'],
                'betot'        => $data['betot'],
                'cgst'         => $data['cskgst'],
                'sgst'         => $data['sskgst'],
                'ref'          => $data['ref'],
                'date'         => date("Y-m-d"),
                'total'        => $data['afftot'],
                'attachement'  => 1,
                'supplier_id'  => $data['supp'],
                'status'       => 1,
                'created_by'   => $createdBy,
                'type'         => 0,
                'store_id'     => $data['storrid'],
                'warehouse_id' => $data['warr'],
                'note'         => $data['nott'] ?? '',
                'valid_from'   => $data['valid_from'],
                'valid_to'     => $data['valid_to'],
                'modified_at'  => null
            ];

            $db->table('purchases_combo')->insert($comboData);
            $purchaseId = $db->insertID();
            $productLines = '';
            $totalAmount = 0;

            $gstEnabled = $db->table('settings')->where('id', 1)->get()->getRow('gst_tax');

            foreach ($data['statediv'] as $i => $pid) {
                if ($data['qty'][$i] > 0) {
                    $postPrice = $data['cosst'][$i];
                    if ($data['tax_methord'][$i] == 1 && $gstEnabled) {
                        $postPrice = floatval($postPrice) * (1 + floatval($data['cgst'][$i]) / 100);
                    }
                    $totalAmount += ($data['qty'][$i] * $postPrice);

                    $productInfo = $db->table('products')->where('id', $pid)->get()->getRowArray();
                    $productLines .= $productInfo['name'] . '-' . $data['qty'][$i] . ',<br>';

                    $purchaseItem = [
                        'tax_methord'   => $data['tax_methord'][$i],
                        'store_idd'     => $storeId,
                        'selling'       => $data['selling'][$i],
                        'avlqty'        => $data['qty'][$i],
                        'supplier'      => $data['supp'],
                        'brandidd'      => $productInfo['brandd'],
                        'warehouse_id'  => $data['warr'],
                        'purchase_id'   => $purchaseId,
                        'product_id'    => $pid,
                        'qt'            => $data['qty'][$i],
                        'cost'          => $data['cosst'][$i],
                        'subtot'        => $data['subtt'][$i],
                        'cgst'          => $data['cgst'][$i] ?? 0,
                        'sgst'          => $data['sgst'][$i] ?? 0,
                        'ttcg'          => $data['ttcgst'][$i] ?? 0,
                        'ttsg'          => $data['ttsgst'][$i] ?? 0,
                        'ndate'         => $la32,
                        'valid_from'    => $data['valid_from'],
                        'valid_to'      => $data['valid_to'],
                    ];
                    $db->table('purchase_items_combo')->insert($purchaseItem);
                }
            }

            $productData = [
                'type'           => 0,
                'name'           => $data['ref'] . '<br>=> ' . $productLines,
                'category'       => 11,
                'description'    => $data['ref'],
                'alertqt'        => 0,
                'cost'           => $totalAmount,
                'hsn'            => 0,
                'tax'            => 0,
                'sgst'           => 0,
                'price'          => $data['afftot'],
                'color'          => 'color07',
                'descountperr'   => 0,
                'supplier'       => 0,
                'unit'           => 'nos',
                'taxmethod'      => 0,
                'brandd'         => 0,
                'rrate'          => $totalAmount,
                'igst'           => 0,
                'combo_id'       => $purchaseId,
                'photo'          => '',
                'photothumb'     => '',
                'created_at'     => date("Y-m-d H:i:s"),
                'modified_at'    => date("Y-m-d H:i:s"),
            ];

            $productId = $productModel->insert($productData, true);
            $stores = $db->table('stores')->get()->getResultArray();

            foreach ($stores as $store) {
                $db->table('stocks')->insert([
                    'product_id' => $productId,
                    'type'       => 0,
                    'store_id'   => $store['id'],
                    'warehouse_id' => 0,
                    'quantity'   => 1,
                    'price'      => 0,
                    'puritem_id' => 0,
                    'datte'      => date('Y-m-d')
                ]);
            }

            $db->table('products')->where('id', $productId)->update(['code' => $productId]);
        }

        return redirect()->to('combooffer');
    }

    public function addtodbb_offers()
    {
        // dd($this->request->getPost());
        $db = $this->db;
        $session = session();

        $register = new RegisterModel();
        $userModel = new UserModel();

        $registerData = $register->find($this->register);
        if (!isset($registerData->store_id)) {
            return redirect()->to('/');
        }
        $userData = $userModel->find($registerData->user_id);

        $storeId = $registerData->store_id;
        $createdBy = $userData->firstname . ' ' . $userData->lastname;

        $data = $this->request->getPost();

        $productIds = $data['statediv'] ?? [];
        $quantities = $data['qty'] ?? [];
        $costs = $data['cosst'] ?? [];
        $sellingPrices = $data['selling'] ?? [];
        $pddated = $data['pddated'] ?? [];
        $innvddad = $data['innvddad'] ?? [];

        $mm = count($productIds);

        for ($i = 0; $i < $mm; $i++) {
            if (!empty($productIds[$i]) && !empty($quantities[$i])) {
                $product = $db->table('products')->where('id', $productIds[$i])->get()->getRowArray();
                if (!$product) continue;

                $insertOffer = [
                    'of_proid'       => $productIds[$i],
                    'of_sellingprice' => $costs[$i],
                    'of_offerprice'  => $sellingPrices[$i],
                    'of_validfrom'   => date('Y-m-d', strtotime($pddated[$i])),
                    'of_validtill'   => date('Y-m-d', strtotime($innvddad[$i])),
                    'qty'            => $quantities[$i],
                    'of_category'    => $product['category'],
                    'of_today'       => date('Y-m-d'),
                    'of_created'     => $session->get('user_id'),
                    'of_status'      => 1
                ];

                $db->table('offers')->insert($insertOffer);
                $offerId = $db->insertID();

                $db->table('products')->where('id', $productIds[$i])->update([
                    'category'    => 12,
                    'offer_id'    => $offerId,
                    'offer_price' => $sellingPrices[$i]
                ]);
            }
        }

        // Clear temporary table
        $offers = $db->table('possalprs_offers')
            ->where('userid', $session->get('user_id'))
            ->get()
            ->getResultArray();

        foreach ($offers as $row) {
            $db->table('possalprs_offers')->where('ats', $row['ats'])->delete();
        }

        return redirect()->to('offers');
    }
    public function addrowret()
    {
        $request = \Config\Services::request();

        $data = [
            'retunbill' => $request->getPost('retunbill'),
            'count'     => $request->getPost('countid'),
            'sals_time' => $request->getPost('sals_time'),
            'db' => $this->db,
            'setting' => $this->setting,
        ];

        return view('returnnew', $data);
    }
    public function addrowret_probarcode()
    {
        $request = $this->request;
        $db      = $this->db;

        $barcodee = $request->getPost('countid');

        // Fetch settings to determine table names
        $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $salesTable = $setting['themblock'] == 0 ? 'sales' : 'dsales';
        $itemsTable = $setting['themblock'] == 0 ? 'sale_items' : 'dsale_items';

        $result = '
        <div class="modal-dialog" role="document" style="width:800px;">
            <div class="modal-content">
                <div class="modal-header">Sales List
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div style="overflow-y: scroll;height: 400px;width: 100%;">
                    <table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
                        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
                            <th style="border: 1px solid #1c76bc;text-align:center;">Date Time</th>
                            <th style="border: 1px solid #1c76bc;text-align:center;">Sales ID</th>
                            <th style="text-align:center;border: 1px solid #1c76bc;">Product Name</th>
                            <th style="text-align:center;border: 1px solid #1c76bc;">Barcode</th>
                            <th style="text-align:center;border: 1px solid #1c76bc;">QT</th>
                            <th style="text-align:center;border: 1px solid #1c76bc;">Price</th>
                        </tr>
                    </thead>
                    <tbody>';

        $builder = $db->table($itemsTable);
        $builder->select("{$itemsTable}.name, {$itemsTable}.qt, {$itemsTable}.subtotal, {$itemsTable}.date, {$itemsTable}.sale_id, products.code");
        $builder->join('products', "products.id = {$itemsTable}.product_id");
        // $builder->where("{$itemsTable}.product_id", $barcodee);
        $builder->where("products.code", $barcodee);
        $builder->orderBy("{$itemsTable}.id", 'DESC');

        $products = $builder->get()->getResult();

        foreach ($products as $prd) {
            $sales_time = $db->table($salesTable)->select('attime')->where('id', $prd->sale_id)->get()->getRow();
            if (isset($sales_time->attime)) {
                $attime = date("d-m-Y H:i:s", strtotime($sales_time->attime));
            } else {
                $attime = '';
            }
            $result .= '
                <tr>
                    <td style="border: 1px solid #1c76bc;text-align:center;">' . $attime . '</td>
                    <td style="border: 1px solid #1c76bc;text-align:center;">' . $prd->sale_id . '</td>
                    <td style="border: 1px solid #1c76bc;">' . esc($prd->name) . '</td>
                    <td style="border: 1px solid #1c76bc;text-align:center;">' . esc($prd->code) . '</td>
                    <td style="border: 1px solid #1c76bc;text-align:center;">' . $prd->qt . '</td>
                    <td style="border: 1px solid #1c76bc;text-align:right;">' . $prd->subtotal . '</td>
                </tr>';
        }

        $result .= '</tbody></table></div></div></div></div></div>';

        echo $result;
        exit;
    }
    public function addrowret_amt()
    {
        $request = \Config\Services::request();
        $countId = $request->getPost('countid');

        return view('returnnew_amt', [
            'count' => $countId,
            'db' => $this->db,
            'request' => $this->request,
        ]);
    }
    public function addrowretckk()
    {
        $request = \Config\Services::request();
        $countId = $request->getPost('countid');

        return view('ckeckqty', [
            'count' => $countId
        ]);
    }
    public function deleteUser($id)
    {
        $userModel = new \App\Models\UserModel();
        $user = $userModel->find($id);

        if ($user && isset($user->avatar)) {
            $avatarPath = FCPATH . 'files/Avatars/' . $user->avatar;
            if (is_file($avatarPath)) {
                unlink($avatarPath);
            }
        }

        $userModel->delete($id);

        return redirect()->to(base_url('settings?tab=users'));
    }
    public function findState()
    {
        $brandId = $this->request->getGet('country');

        echo '<option value="">Select</option>';

        $db = \Config\Database::connect();
        $builder = $db->table('products');
        $query = $builder->where('brandd', $brandId)->get();

        foreach ($query->getResult() as $row) {
            echo '<option value="' . esc($row->id) . '">' . esc($row->name) . '</option>';
        }

        exit;
    }
    public function findStatebran()
    {
        $productId = $this->request->getGet('country');

        $db = \Config\Database::connect();

        // Get the product and its associated brand ID
        $product = $db->table('products')->where('id', $productId)->get()->getRowArray();

        if ($product && isset($product['brandd'])) {
            $brand = $db->table('brand')->where('id', $product['brandd'])->get()->getRowArray();

            if ($brand) {
                echo '<option selected="selected" value="' . esc($brand['id']) . '">' . esc($brand['name']) . '</option>';
            }
        }

        exit;
    }
    public function stockadd()
    {
        $register = \App\Models\Register::find($this->register);
        $user = \App\Models\User_model::find($register->user_id);
        $createdby = $user->firstname . ' ' . $user->lastname;

        $db = \Config\Database::connect();
        $request = \Config\Services::request();

        $warr = $request->getPost('warr');
        $avvl = $request->getPost('avalqqt');
        $proiddd = $request->getPost('statediv');
        $mnnnn = $request->getPost('srrtr'); // array of quantities to distribute to each store

        $cct = count($mnnnn);
        $th = array_sum($mnnnn);

        if ($avvl >= $th) {
            $storeQuery = $db->table('stores')->orderBy('name', 'asc')->get();
            $kmddwe = date('Y-m-d');
            $i = 0;

            foreach ($storeQuery->getResultArray() as $storeRow) {
                $kmmwe = $mnnnn[$i] ?? 0;
                $strid = $storeRow['id'];

                if ($kmmwe > 0) {
                    $existingStock = $db->table('stocks')
                        ->where('product_id', $proiddd)
                        ->where('store_id', $strid)
                        ->get()
                        ->getRowArray();

                    // Insert stock_transfer record
                    $db->table('stock_transfer')->insert([
                        'war_id'       => $warr,
                        'store_id'     => $strid,
                        'pro_id'       => $proiddd,
                        'qty'          => $kmmwe,
                        'tyoftrans'    => 1,
                        'date'         => $kmddwe,
                        'bywhom'       => $createdby,
                        'perselphy_ids' => 0
                    ]);

                    if (!$existingStock) {
                        // Insert new stock entry
                        $db->table('stocks')->insert([
                            'product_id'   => $proiddd,
                            'type'         => 'IN',
                            'store_id'     => $strid,
                            'warehouse_id' => $warr,
                            'quantity'     => $kmmwe,
                            'datte'        => $kmddwe
                        ]);
                    } else {
                        // Update existing stock
                        $newQty = $existingStock['quantity'] + $kmmwe;
                        $db->table('stocks')
                            ->where('product_id', $proiddd)
                            ->where('store_id', $strid)
                            ->update([
                                'type'         => '0',
                                'quantity'     => $newQty,
                                'datte'        => $kmddwe,
                                'warehouse_id' => $warr
                            ]);
                    }
                }

                $i++;
            }
        }

        return redirect()->to('purchase');
    }
    public function addrow()
    {
        $request = \Config\Services::request();

        $data['count'] = $request->getPost('countid');

        return view('problemaddrow', $data);
    }
    public function addrowphy()
    {
        $request = \Config\Services::request();

        $data['count'] = $request->getPost('countid');

        return $this->render('problemaddrowphy', $data);
    }

    public function findcctn()
    {
        $db = \Config\Database::connect();
        $request = \Config\Services::request();

        $productId = $request->getGet('country');

        $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();

        if (!$product) {
            echo '0,0,0,0';
            return;
        }

        if ($settings && $settings['gst_tax'] == 1) {
            echo $product['cost'] . ',' . $product['price'] . ',' . $product['tax'] . ',' . $product['sgst'];
        } else {
            echo $product['cost'] . ',' . $product['price'] . ',0,0';
        }

        exit;
    }
    public function findcctnqqty()
    {
        $db = \Config\Database::connect();
        $request = \Config\Services::request();

        $productId = $request->getGet('country');
        $storeId = $request->getGet('warr');

        $stock = $db->table('stocks')
            ->where('store_id', $storeId)
            ->where('product_id', $productId)
            ->get()
            ->getRowArray();

        echo $stock ? $stock['quantity'] : 0;
        exit;
    }
    public function findssss()
    {
        $db = \Config\Database::connect();
        $request = \Config\Services::request();

        $productId = $request->getGet('country');
        $warehouseId = $request->getGet('sss');

        if ($productId > 0 && $warehouseId > 0) {
            // Total purchased quantity
            $purchaseItems = $db->table('purchase_items')
                ->selectSum('qt')
                ->where('warehouse_id', $warehouseId)
                ->where('product_id', $productId)
                ->get()
                ->getRowArray();
            $pstkk = $purchaseItems['qt'] ?? 0;

            // Total transferred quantity
            $stockTransfers = $db->table('stock_transfer')
                ->selectSum('qty')
                ->where('war_id', $warehouseId)
                ->where('pro_id', $productId)
                ->where('llvel', '')
                ->get()
                ->getRowArray();
            $stf = $stockTransfers['qty'] ?? 0;

            echo $pstkk - $stf;
        } else {
            echo 0;
        }

        exit;
    }
    public function add()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }

        $session = session();

        $db = \Config\Database::connect();

        $role = $this->user->role;
        $permission = $db->table('permission_new')->where('nname', $role)->get()->getRowArray();

        if (!isset($permission['pua']) || $permission['pua'] != 1) {
            return redirect()->to('/');
        }

        $supplier = $this->request->getPost('filtersupp') ?? '99';
        $type = $this->request->getPost('filtertype');
        $type = ($type !== null || $type === '0') ? $type : '99';

        $supplierF = $supplier === '99' ? '99' : 'supplier';
        $typeF = $type === '99' ? '99' : 'type';

        // Adjusted Product::all() to a compatible CI4 query or model scope
        $this->view_data['products'] = $this->ProductModel->where('supplier', $supplier)->where('type', $type)->get()->getResult();

        $this->view_data['supplierF'] = $supplier;
        $this->view_data['typeF'] = $type;
        $this->view_data['categories'] = $this->CategoryModel->findAll();
        $this->view_data['suppliers'] = $this->SupplierModel->findAll();

        $this->content_view = 'addpurchasenew';
        return $this->render('addpurchasenew');
    }
    public function addtodbb()
    {
        $session = session();
        $request = service('request');
        $db = \Config\Database::connect();

        $register = (new \App\Models\RegisterModel())->find($this->register);
        $user = (new \App\Models\UserModel())->find($session->get('user_id'));

        $storeid = $register->store_id ?? null;
        $createdby = $user->firstname . ' ' . $user->lastname;
        $purchaseType = $db->table('settings')->where('id', 1)->get()->getRowArray()['themblock_purchase'] ?? 0;

        $post = $request->getPost();
        $la322x = explode('-', $post['pddate']);
        $la32 = "{$la322x[2]}-{$la322x[1]}-{$la322x[0]}";

        $ref = $session->get('store') . 'C' . time();
        $data = [
            'discper'                        => 0,
            'discamt'                        => $post['ddkst'],
            'invno'                          => $post['innvno'],
            'purdat'                         => $la32,
            'purtpy'                         => $post['pptye'],
            'invdat'                         => $post['innvdda'],
            'invamt'                         => $post['innvamt'],
            'betot'                          => $post['betot'],
            // 'cgst'                           => $post['cskgst'],
            // 'sgst'                           => $post['sskgst'],
            'cgst'                          => $post['_cgst'],
            'sgst'                          => $post['_sgst'],
            'igst'                          => $post['_igst'],
            'gst'                            => $post['_gst'],
            'ref'                            => $ref,
            'date'                           => date("Y-m-d"),
            'total'                          => $post['afftot'],
            'attachement'                   => 1,
            'supplier_id'                   => $post['supp'],
            'status'                        => 1,
            'created_by'                    => $createdby,
            'type'                          => 0,
            'store_id'                      => $post['storrid'],
            'warehouse_id'                  => $post['warr'],
            'note'                          => $post['nott'] ?? '',
            'modified_at'                   => null,
            'ppurchase_type'                => $purchaseType,
            'credit_amount'                 => $post['credit_amount'] ?? null,
            'no_of_credit_days'             => $post['no_of_credit_days'] ?? null,
            'cheque_no'                     => $post['cheque_no'] ?? null,
            'cheque_date'                   => $post['cheque_date'] ?? null,
            'total_invoice_discount_amount' => $post['total_invoice_discount_amount'] ?? null,
            'total_invoice_discount_percentage' => $post['total_invoice_discount_percentage'] ?? null,
            'freight_cost'                  => $post['freight_cost'] ?? null,
            'agent_commission'              => $post['agent_commission_percentage'] ?? null,
            'agent_commission_amount'       => $post['agent_commission_amount'] ?? null,
            'agent_name'                    => $post['agent_name'] ?? null,
        ];

        $db->table('purchases')->insert($data);
        $purchase_id = $db->insertID();

        $items = $db->table('possalprs')->where('userid', $session->get('user_id'))->get()->getResult();

        foreach ($items as $index => $item) {
            $productData = $db->table('products')->where('id', $item->producnum)->get()->getRowArray();
            $product_id = $productData['id'];
            $brand_id = $productData['brandd'] ?? 0;

            // Optional duplication if needed
            if ($this->setting->expi == 1) {
                $sql = "INSERT INTO products (name, brandd, category, cost, tax, description, price, discount_per, photo, photo_thumb, color, created_at, modified_at, type, alert_qty, supplier, unit, tax_method, h_stores, sgst, hsn, igst, rrate, measure, status, combo_id, offer_id, offer_price, packed_1m, batch_1m, expire_1m, net_weight, best_before)
                        SELECT name, brandd, category, cost, tax, description, price, discount_per, photo, photo_thumb, color, created_at, modified_at, type, alert_qty, supplier, unit, tax_method, h_stores, sgst, hsn, igst, rrate, measure, status, combo_id, offer_id, offer_price, packed_1m, batch_1m, expire_1m, net_weight, best_before FROM products WHERE id = ?";
                $db->query($sql, [$product_id]);
                $product_id = $db->insertID();
            }

            // Insert into purchase_items
            $purchaseItem = [
                'pipurchase_type'      => $purchaseType,
                'selling'              => $item->sellrs,
                'avlqty'               => $item->qqty,
                'levelk'               => 0,
                'rackk'                => 0,
                'supplier'             => $post['supp'],
                'brandidd'             => $brand_id,
                'warehouse_id'         => $post['warr'],
                'purchase_id'          => $purchase_id,
                'product_id'           => $product_id,
                'qt'                   => $item->qqty,
                'cost'                 => $item->purrs,
                'subtot'               => $item->toto,
                'cgst'                 => $item->cgstt,
                'sgst'                 => $item->sgst,
                '_cgst'                => $item->_cgst,
                '_sgst'                => $item->_sgst,
                '_gst'                 => $item->_gst,
                '_igst'                => $item->_igst,
                'ttcg'                 => 0,
                'ttsg'                 => 0,
                'ndate'                => $la32,
                'packed_1m'            => $item->packed_1m,
                'batch_1m'             => $item->batch_1m,
                'expire_1m'            => $item->expire_1m,
                'store_idd'            => $post['storrid'],
                'discount_amount'      => $item->discount_amount,
                'discount_percentage'  => $item->discount_percentage,
                'taxmethod'            => $item->taxmethod,
                'pro_size'             => $item->pro_size,
                'taxtype'              => $item->taxtype,
                'taxtotal'             => $item->taxtotal,
                'agent_comission'      => $post['agent_comission'][$index] ?? 0,
            ];
            $db->table('purchase_items')->insert($purchaseItem);
            $purchase_item_id = $db->insertID();

            $db->query("
                    UPDATE products 
                    SET 
                        rrate='" . $item->mrpp . "',
                        cost='" . $item->purrs . "',
                        price='" . $item->sellrs . "',
                        packed_1m='" . $item->packed_1m . "',
                        batch_1m='" . $item->batch_1m . "',
                        expire_1m='" . $item->expire_1m . "' 
                    WHERE id='" . $product_id . "'
                    ");


            $stores = $this->db->table('stores')->where('id', $this->store)->get()->getResult();
            foreach ($stores as $key => $store) {
                // $db->query("INSERT INTO stocks SET product_id='" . $product_id . "',type=0,warehouse_id=0,quantity=0,price=0,store_id='" . $store->id . "',datte='" . date("Y-m-d H:i:s") . "',puritem_id=0  ");

                $data = [
                    'product_id'   => $product_id,
                    'type'         => 0,
                    'warehouse_id' => 0,
                    'quantity'     => $item->qqty,
                    'price'        => 0,
                    'store_id'     => $store->id,
                    'datte'        => date('Y-m-d H:i:s'),
                    'puritem_id'   => 0
                ];

                $this->db->table('stocks')->insert($data);

                $insertId = $this->db->insertID(); // get last inserted ID

            }

            // Add to stock_transfer
            $db->table('stock_transfer')->insert([
                'llvel'        => 0,
                'rrack'        => 0,
                'war_id'       => $post['warr'],
                'store_id'     => $this->session->store,
                'pro_id'       => $product_id,
                'qty'          => $item->qqty,
                'peritemid'    => $purchase_item_id,
                'totamt'       => $item->toto,
                'tyoftrans'    => 1,
                'date'         => date('Y-m-d'),
                'bywhom'       => $createdby,
                'perchaseid'   => $purchase_id,
                'perselphy_ids' => 0,
            ]);
        }

        // Clear user's possalprs session entries
        $db->table('possalprs')->where('userid', $session->get('user_id'))->delete();

        return $this->response->setJSON(['status' => 1, 'message' => 'Purchase recorded successfully', 'purid' => $purchase_id]);
    }

    public function addtodbb_update()
    {
        $session = session();
        $request = service('request');
        $db = \Config\Database::connect();
        $id = $request->getPost('purchase_id');
        $register = (new \App\Models\RegisterModel())->find($this->register);
        $user = (new \App\Models\UserModel())->find($session->get('user_id'));

        $storeid = $register->store_id ?? null;
        $createdby = $user->firstname . ' ' . $user->lastname;
        $purchaseType = $db->table('settings')->where('id', 1)->get()->getRowArray()['purchase_type'];

        $post = $request->getPost();
        $la322x = explode('-', $post['pddate']);
        $la32 = "{$la322x[2]}-{$la322x[1]}-{$la322x[0]}";

        $ref = $session->get('store') . 'C' . time();
        $data = [
            'discper'                        => 0,
            'discamt'                        => $post['ddkst'],
            'invno'                          => $post['innvno'],
            'purdat'                         => $la32,
            'purtpy'                         => $post['pptye'],
            'invdat'                         => $post['innvdda'],
            'invamt'                         => $post['innvamt'],
            'betot'                          => $post['betot'],
            // 'cgst'                           => $post['cskgst'],
            // 'sgst'                           => $post['sskgst'],
            'cgst'                          => $post['_cgst'],
            'sgst'                          => $post['_sgst'],
            'igst'                          => $post['_igst'],
            'gst'                            => $post['_gst'],
            'ref'                            => $ref,
            'date'                           => date("Y-m-d"),
            'total'                          => $post['afftot'],
            'attachement'                   => 1,
            'supplier_id'                   => $post['supp'],
            'status'                        => 1,
            'created_by'                    => $createdby,
            'type'                          => 0,
            'store_id'                      => $post['storrid'],
            'warehouse_id'                  => $post['warr'],
            'note'                          => $post['nott'] ?? '',
            'modified_at'                   => null,
            'ppurchase_type'                => $purchaseType,
            'credit_amount'                 => $post['credit_amount'] ?? null,
            'no_of_credit_days'             => $post['no_of_credit_days'] ?? null,
            'cheque_no'                     => $post['cheque_no'] ?? null,
            'cheque_date'                   => $post['cheque_date'] ?? null,
            'total_invoice_discount_amount' => $post['total_invoice_discount_amount'] ?? null,
            'total_invoice_discount_percentage' => $post['total_invoice_discount_percentage'] ?? null,
            'freight_cost'                  => $post['freight_cost'] ?? null,
            'agent_commission'              => $post['agent_commission_percentage'] ?? null,
            'agent_commission_amount'       => $post['agent_commission_amount'] ?? null,
            'agent_name'                    => $post['agent_name'] ?? null,
        ];

        $db->table('purchases')->where('id', $id)->update($data);
        $purchase_id = $id;

        // $items = $db->table('possalprspp')->where('userid', $session->get('user_id'))->get()->getResult();
        $items = $request->getPost('items');

        foreach ($items as $index => $item) {
            $item = (object) $item;
            $product_id = $item->producnum;
            $productData = $db->table('products')->where('id', $product_id)->get()->getRowArray();
            $brand_id = $productData['brandd'] ?? 0;

            // Optional duplication if needed
            if ($this->setting->expi == 1) {
                $sql = "INSERT INTO products (name, brandd, category, cost, tax, description, price, discount_per, photo, photo_thumb, color, created_at, modified_at, type, alert_qty, supplier, unit, tax_method, h_stores, sgst, hsn, igst, rrate, measure, status, combo_id, offer_id, offer_price, packed_1m, batch_1m, expire_1m, net_weight, best_before)
                        SELECT name, brandd, category, cost, tax, description, price, discount_per, photo, photo_thumb, color, created_at, modified_at, type, alert_qty, supplier, unit, tax_method, h_stores, sgst, hsn, igst, rrate, measure, status, combo_id, offer_id, offer_price, packed_1m, batch_1m, expire_1m, net_weight, best_before FROM products WHERE id = ?";
                $db->query($sql, [$product_id]);
                $product_id = $db->insertID();
            }

            // Insert into purchase_items
            $purchaseItem = [
                'pipurchase_type'      => $purchaseType,
                'selling'              => $item->sellrs,
                'avlqty'               => $item->qqty,
                'levelk'               => 0,
                'rackk'                => 0,
                'supplier'             => $post['supp'],
                'brandidd'             => $brand_id,
                'warehouse_id'         => $post['warr'],
                'purchase_id'          => $purchase_id,
                'product_id'           => $product_id,
                'qt'                   => $item->qqty,
                'cost'                 => $item->purrs,
                'subtot'               => $item->toto,
                'cgst'                 => $item->cgstt,
                'sgst'                 => $item->sgst,
                '_cgst'                => $item->_cgst_,
                '_sgst'                => $item->_sgst_,
                '_gst'                 => $item->_gst_,
                '_igst'                => $item->_igst_,
                'ttcg'                 => 0,
                'ttsg'                 => 0,
                'ndate'                => $la32,
                'packed_1m'            => $item->packed_1m,
                'batch_1m'             => $item->batch_1m,
                'expire_1m'            => $item->expire_1m,
                'store_idd'            => $post['storrid'],
                'discount_amount'      => $item->discount_amount,
                'discount_percentage'  => $item->discount_percentage,
                // 'taxmethod'            => $item->taxmethod,
                // 'pro_size'             => $item->pro_size,
                // 'taxtype'              => $item->taxtype,
                'taxtotal'             => $item->taxtotal,
                'agent_comission'      => $post['agent_comission'][$index] ?? 0,
            ];
            $db->table('purchase_items')->where('product_id', $product_id)->where('purchase_id', $id)->update($purchaseItem);
            $purchase_item_id = $item->ats;

            $this->db->table('products')->where('code', $product_id)->update([
                'alertqt' => '0',
                'type' => '0',
                'category' => $item->category,
                'brandd' => $item->branddd,
                'rrate' => $item->mrpp,
                'name' => $item->prname,
                'cost' => $item->purrs,
                'price' => floatval($item->sellrs) - floatval($item->discount_amount),
                'rrate' => $item->sellrs,
                'dis_per' => $item->discount_percentage,
                'dis_amt' => $item->discount_amount,
            ]);

            // Add to stock_transfer
            $db->table('stock_transfer')->where('pro_id', $product_id)->update([
                'llvel'        => 0,
                'rrack'        => 0,
                'war_id'       => $post['warr'],
                'store_id'     => 1,
                // 'pro_id'       => $product_id,
                'qty'          => $item->qqty,
                'peritemid'    => $purchase_item_id,
                'totamt'       => $item->toto,
                'tyoftrans'    => 5,
                'date'         => date('Y-m-d'),
                'bywhom'       => $createdby,
                'perchaseid'   => $purchase_id,
                'perselphy_ids' => 0,
            ]);
        }

        // Clear user's possalprs session entries
        $db->table('possalprs')->where('userid', $session->get('user_id'))->delete();

        return $this->response->setJSON(['status' => 1, 'message' => 'Purchase Updated successfully', 'purid' => $purchase_id]);
    }
    public function addtodbbphy()
    {
        $register = $this->RegisterModel->find($this->register);

        if (empty($register)) {
            return redirect()->to('/');
        }

        // Convert to object to avoid array vs object confusion
        $register = (object) $register;

        $user = $this->UserModel->find($register->user_id);
        if (!$user) {
            return redirect()->to('/');
        }

        $user = (object) $user;
        $storeid = $register->store_id;
        $createdby = $user->firstname . ' ' . $user->lastname;

        $request = service('request');
        $session = session();

        // POST fields
        $invoiceNo = $request->getPost('innvno');
        $postedDate = $request->getPost('pddate');
        $warehouse = $request->getPost('warr');
        $totalItems = $request->getPost('discct');
        $cgst = $request->getPost('cskgst');
        $sgst = $request->getPost('sskgst');
        $igst = $request->getPost('ddkst');
        $totalAfterTax = $request->getPost('afftot');
        $signs = $request->getPost('signn');
        $productIds = $request->getPost('statediv');
        $costs = $request->getPost('cosst');
        $quantities = $request->getPost('qty');
        $subtotals = $request->getPost('subtt');
        $reasons = $request->getPost('reson');
        $note = $request->getPost('nott');

        $phyDateParts = explode('-', $postedDate);
        $formattedDate = "{$phyDateParts[2]}-{$phyDateParts[1]}-{$phyDateParts[0]}";

        $karson = 0;

        if ((int)$warehouse > 0 && count($productIds) > 0 && (int)$totalItems > 0) {
            $this->db->table('physicals')->insert([
                'storeid' => $warehouse,
                'date' => $formattedDate,
                'totitem' => $totalItems,
                'craeted' => $createdby
            ]);
            $karson = $this->db->insertID();
        }

        // Loop through product entries
        foreach ($productIds as $i => $productId) {
            if (!empty($productId) && !empty($quantities[$i])) {
                $qtyWithSign = (int)($signs[$i] . $quantities[$i]);

                // Get current stock
                $stockRow = $this->db->table('stocks')
                    ->where(['store_id' => $warehouse, 'product_id' => $productId])
                    ->get()
                    ->getRowArray();

                $newQty = $qtyWithSign;
                if ($stockRow !== null) {
                    $newQty = $stockRow['quantity'] + $qtyWithSign;
                }

                // Update stock quantity
                $this->db->table('stocks')
                    ->where(['store_id' => $warehouse, 'product_id' => $productId])
                    ->update(['quantity' => $newQty]);

                // Insert physical stock record
                $this->db->table('physivcal_stock')->insert([
                    'befqty'   => $costs[$i] ?? 0,
                    'affqty'   => $subtotals[$i] ?? 0,
                    'phy_id'   => $karson,
                    'storeid'  => $warehouse,
                    'produid'  => $productId,
                    'userid'   => $createdby,
                    'qty'      => $qtyWithSign,
                    'resonn'   => $reasons[$i] ?? '',
                    'date'     => $formattedDate,
                    'status'   => 1
                ]);

                // Insert into stock_transfer
                $this->db->table('stock_transfer')->insert([
                    'war_id'       => 0,
                    'store_id'     => $warehouse,
                    'pro_id'       => $productId,
                    'qty'          => $qtyWithSign,
                    'tyoftrans'    => 3,
                    'date'         => $formattedDate,
                    'bywhom'       => $createdby,
                    'perselphy_ids' => 0
                ]);
            }
        }

        return redirect()->to('/PhysicalStock');
    }

    public function edit_old($id = null)
    {
        $session = session();
        $user = $session->get('user');
        // $userId = $user['id'] ?? null;
        $userId = $user->id ?? null;
        $role = $user->role ?? '';

        // Check permission
        $permission = $this->db->table('permission_new')
            ->where('nname', $role)
            ->get()
            ->getRowArray();

        if (!$permission || $permission['pue'] != 1) {
            return redirect()->to('/');
        }

        // Store purchase ID in session
        $session->set('nppid', $id);

        // Delete any existing possalprspp for current user
        $this->db->table('possalprspp')
            ->where('userid', $userId)
            ->delete();

        // Fetch all purchase items for the given purchase ID
        $purchaseItems = $this->db->table('purchase_items')
            ->where('purchase_id', $id)
            ->get()
            ->getResultArray();

        foreach ($purchaseItems as $item) {
            $product = $this->db->table('products')
                ->where('id', $item['product_id'])
                ->get()
                ->getRowArray();

            if (!$product) {
                continue;
            }

            $data = [
                'producnum' => $product['id'],
                'prname'    => $product['name'],
                'purrs'     => $item['cost'],
                'sellrs'    => $product['price'],
                'qqty'      => $item['qt'],
                'cgstt'     => $item['cgst'],
                'sgst'      => 0,
                'ppitemid'  => $item['id'],
                'toto'      => $item['subtot'],
                'ppid'      => $id,
                'userid'    => $userId,
            ];

            $this->db->table('possalprspp')->insert($data);
        }

        return $this->render('editpurchase');
    }

    public function edit($id = null)
    {
        if (!isLoggedIn()) {
            return redirect()->to('/');
        }
        $session = session();
        $user = $session->get('user');
        // $userId = $user['id'] ?? null;
        $userId = $user->id ?? null;
        $role = $user->role ?? '';

        // Check permission
        $permission = $this->db->table('permission_new')
            ->where('nname', $role)
            ->get()
            ->getRowArray();

        if (!$permission || $permission['pue'] != 1) {
            return redirect()->to('/');
        }

        // Store purchase ID in session
        $session->set('nppid', $id);

        // Delete any existing possalprspp for current user
        $this->db->table('possalprspp')
            ->where('userid', $userId)
            ->delete();

        // Fetch all purchase items for the given purchase ID
        $purchaseItems = $this->db->table('purchase_items')
            ->where('purchase_id', $id)
            ->get()
            ->getResultArray();

        foreach ($purchaseItems as $item) {
            $product = $this->db->table('products')
                ->where('id', $item['product_id'])
                ->get()
                ->getRowArray();

            if (!$product) {
                continue;
            }


            $data = [
                'producnum' => $item['product_id'],
                'prname'    => $product['name'],
                'purrs'     => $item['cost'],
                'sellrs'    => $product['price'],
                'qqty'      => $item['qt'],
                'cgstt'     => $item['cgst'],
                '_cgst'     => $item['_cgst'],
                '_sgst'     => $item['_sgst'],
                '_gst'      => $item['_gst'],
                '_igst'     => $item['_igst'],
                'sgst'      => 0,
                'ppitemid'  => $item['id'],
                'toto'      => $item['subtot'],
                'ppid'      => $id,
                'userid'    => $userId,
                'taxtype'   => $item['taxtype'],
                'taxtotal'  => $item['taxtotal'],
                'discount_amount'  => $item['discount_amount'],
                'discount_percentage'  => $item['discount_percentage'],
                'agent_comission'  => $item['agent_comission'],
            ];


            $this->db->table('possalprspp')->insert($data);
        }

        $role = $this->user->role;
        $permission = $this->db->table('permission_new')->where('nname', $role)->get()->getRowArray();

        if (!isset($permission['pua']) || $permission['pua'] != 1) {
            return redirect()->to('/');
        }

        $supplier = $this->request->getPost('filtersupp') ?? '99';
        $type = $this->request->getPost('filtertype');
        $type = ($type !== null || $type === '0') ? $type : '99';

        $supplierF = $supplier === '99' ? '99' : 'supplier';
        $typeF = $type === '99' ? '99' : 'type';

        // Adjusted Product::all() to a compatible CI4 query or model scope
        $this->view_data['products'] = $this->ProductModel->where('supplier', $supplier)->where('type', $type)->get()->getResult();

        $this->view_data['supplierF'] = $supplier;
        $this->view_data['id'] = $id;
        $this->view_data['typeF'] = $type;
        $this->view_data['categories'] = $this->CategoryModel->findAll();
        $this->view_data['suppliers'] = $this->SupplierModel->findAll();
        $this->view_data['purchase'] = $this->db->table('purchases')->where('id', $id)->get()->getRow();

        return $this->render('add_purchase_edit');
    }
    public function edittodbb($id = null)
    {
        helper('date');

        $db = \Config\Database::connect();
        $purchaseItems = $db->table('purchase_items')->where('purchase_id', $id)->get()->getResultArray();
        $purchase = $db->table('purchases')->where('id', $id)->get()->getRowArray();
        $storeId = $purchase['store_id'];
        $warehouseId = $purchase['warehouse_id'];

        $register = Register::find($this->register);
        $user = User_model::find($register->user_id);
        $createdBy = $user->firstname . ' ' . $user->lastname;

        $total = $this->request->getPost('betot');
        $invoiceNo = $this->request->getPost('innvno');
        $purchaseDate = $this->request->getPost('pddate');
        $purchaseType = $this->request->getPost('pptye');
        $invoiceDate = $this->request->getPost('innvdda');
        $invoiceAmt = $this->request->getPost('innvamt');
        $cgst = $this->request->getPost('cskgst');
        $sgst = $this->request->getPost('sskgst');
        $discount = $this->request->getPost('ddkst');
        $grandTotal = $this->request->getPost('afftot');
        $supplierId = $this->request->getPost('supp');
        $note = $this->request->getPost('nott');

        $purchaseDateFormatted = date('Y-m-d', strtotime($purchaseDate));
        $today = date('Y-m-d');
        $ref = $storeId . 'C' . time();

        // Update the main purchase record
        $db->table('purchases')->where('id', $id)->update([
            'discper' => 0,
            'discamt' => $discount,
            'invno' => $invoiceNo,
            'purdat' => $purchaseDateFormatted,
            'purtpy' => $purchaseType,
            'invdat' => $invoiceDate,
            'invamt' => $invoiceAmt,
            'betot' => $total,
            'cgst' => $cgst,
            'sgst' => $sgst,
            'ref' => $ref,
            'date' => $today,
            'total' => $grandTotal,
            'attachement' => 1,
            'supplier_id' => $supplierId,
            'status' => 1,
            'created_by' => $createdBy,
            'type' => 0,
            'note' => $note,
            'modified_at' => $today,
        ]);

        $productIds = $this->request->getPost('statediv');
        $perItemIds = $this->request->getPost('peritemid');
        $subtotals = $this->request->getPost('subtt');
        $quantities = $this->request->getPost('qty');
        $costs = $this->request->getPost('cosst');
        $cgstArray = $this->request->getPost('cgst');
        $sgstArray = $this->request->getPost('sgst');
        $ttcgArray = $this->request->getPost('ttcgst');
        $ttsgArray = $this->request->getPost('ttsgst');

        for ($i = 0; $i < count($productIds); $i++) {
            $productId = $productIds[$i];
            $perItemId = $perItemIds[$i];
            $qty = $quantities[$i];
            $cost = $costs[$i];
            $subtot = $subtotals[$i];

            $cgstVal = is_array($cgstArray) ? $cgstArray[$i] : 0;
            $sgstVal = is_array($sgstArray) ? $sgstArray[$i] : 0;
            $ttcgVal = is_array($ttcgArray) ? $ttcgArray[$i] : 0;
            $ttsgVal = is_array($ttsgArray) ? $ttsgArray[$i] : 0;

            $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
            $brandId = $product['brandd'] ?? 0;

            if ($perItemId) {
                // update existing purchase_item
                $itemRow = $db->table('purchase_items')->where('id', $perItemId)->get()->getRowArray();
                $oldQty = $itemRow['qt'];
                $deltaQty = $qty - $oldQty;

                $db->table('purchase_items')->where('id', $perItemId)->update([
                    'qt' => $qty,
                    'cost' => $cost,
                    'subtot' => $subtot,
                ]);

                $db->table('stock_transfer')->where('peritemid', $perItemId)->update([
                    'qty' => $qty,
                ]);

                $stock = $db->table('stocks')->where(['product_id' => $productId, 'store_id' => $storeId])->get()->getRowArray();
                if ($stock) {
                    $updatedQty = $stock['quantity'] + $deltaQty;
                    $db->table('stocks')->where(['product_id' => $productId, 'store_id' => $storeId])->update([
                        'quantity' => $updatedQty,
                    ]);
                }
            } else {
                // insert new purchase_item
                $insertData = [
                    'supplier' => $supplierId,
                    'brandidd' => $brandId,
                    'warehouse_id' => $warehouseId,
                    'purchase_id' => $id,
                    'product_id' => $productId,
                    'qt' => $qty,
                    'cost' => $cost,
                    'subtot' => $subtot,
                    'cgst' => $cgstVal,
                    'sgst' => $sgstVal,
                    'ttcg' => $ttcgVal,
                    'ttsg' => $ttsgVal,
                    'ndate' => $purchaseDateFormatted,
                ];

                $db->table('purchase_items')->insert($insertData);
                $perItemIdNew = $db->insertID();

                $stock = $db->table('stocks')->where(['product_id' => $productId, 'store_id' => $storeId])->get()->getRowArray();
                if ($stock) {
                    $updatedQty = $stock['quantity'] + $qty;
                    $db->table('stocks')->where(['product_id' => $productId, 'store_id' => $storeId])->update([
                        'quantity' => $updatedQty,
                    ]);
                } else {
                    $db->table('stocks')->insert([
                        'product_id' => $productId,
                        'type' => 0,
                        'store_id' => $storeId,
                        'warehouse_id' => $warehouseId,
                        'quantity' => $qty,
                        'price' => $cost,
                        'puritem_id' => $id,
                        'datte' => date('Y-m-d'),
                    ]);
                }

                $db->table('stock_transfer')->insert([
                    'war_id' => $warehouseId,
                    'store_id' => $storeId,
                    'pro_id' => $productId,
                    'qty' => $qty,
                    'peritemid' => $perItemIdNew,
                    'tyoftrans' => 1,
                    'date' => date('Y-m-d'),
                    'bywhom' => $createdBy,
                    'perchaseid' => $id,
                    'perselphy_ids' => 0,
                ]);
            }
        }

        // Cleanup: remove temporary pre-edit data
        $db->table('possalprspp')->where('userid', session('user_id'))->delete();

        return redirect()->to(base_url('purchase'));
    }


    public function updatepurchaetype()
    {
        $keyID = $this->request->getPost('KeyID');

        $status = null;
        $themblock = 0;
        $themblock_purchase = 0;

        if ($keyID == 113) { // F2 invoice only
            $status = 0;
            // $themblock = 1;
            $themblock_purchase = 0;
        } elseif ($keyID == 115) { // F4 non-invoice only color
            $status = 1;
            $themblock_purchase = 1;
        } elseif ($keyID == 119) { // F8 all
            $status = 2;
        }

        if (!is_null($status)) {
            $db = \Config\Database::connect();
            $db->table('settings')->where('id', 1)->update([
                'purchase_type' => $status,
                'themblock_purchase' => $themblock_purchase,
                // 'themblock'     => $themblock
            ]);
        }

        return $this->response->setJSON(['success' => true]);
    }
    public function purchase_stock_transfer()
    {
        return $this->render('stocktransfer_modal', [
            'register' => $this->register
        ]);
    }


    // Server-side endpoint consumed by DataTables
    public function getDataServerSide()
    {
        $request = $this->request;

        // DataTables core params
        $draw   = (int) $request->getPost('draw');
        $start  = (int) $request->getPost('start');       // offset
        $length = (int) $request->getPost('length');      // page size
        $searchValue = trim($request->getPost('search')['value'] ?? '');

        // Order (safe whitelist of columns)
        $order  = $request->getPost('order');
        $columns = [
            'p.purdat',           // 0 date
            'p.id',               // 1 id
            'p.invno',            // 2 invoice no
            'p.cgst',             // 3 cgst (we’ll display *2 in view)
            'p.total',            // 4 total
            's.name',             // 5 supplier
            'st.name',            // 6 store
            'w.name',             // 7 warehouse
            null,                 // 8 totals (computed) - keep unsortable
            null,                 // 9 created_by full name - we’ll sort by u.firstname as fallback
        ];
        $orderBy = 'p.id DESC';
        if (!empty($order[0]['column']) && isset($columns[$order[0]['column']])) {
            $colIdx = (int) $order[0]['column'];
            $dir    = strtolower($order[0]['dir']) === 'asc' ? 'ASC' : 'DESC';
            if ($columns[$colIdx]) {
                $orderBy = $columns[$colIdx] . ' ' . $dir;
            } elseif ($colIdx === 9) {
                $orderBy = 'u.firstname ' . $dir . ', u.lastname ' . $dir;
            }
        }

        // Purchase type filter (replicates your original logic)
        $settings = $this->db->query("SELECT purchase_type, decimals FROM settings WHERE id=1")->getRowArray();
        $purchaseType = $settings['purchase_type'];

        // Base query with joins and aggregated payments
        // SUM(payments) computed via LEFT JOIN subquery for better perf
        $builder = $this->db->table('purchases p')
            ->select("
                p.id, p.purdat, p.invno, p.cgst, p.total, p.supplier_id, p.store_id, p.warehouse_id, p.created_by,
                s.name AS supplier_name,
                st.name AS store_name,
                w.name AS warehouse_name,
                u.firstname, u.lastname,
                COALESCE(pay.paid, 0) AS paid,
                (p.total - COALESCE(pay.paid, 0)) AS balance
            ")
            ->join('suppliers s', 's.id = p.supplier_id', 'left')
            ->join('stores st', 'st.id = p.store_id', 'left')
            ->join('warehouses w', 'w.id = p.warehouse_id', 'left')
            ->join('users u', 'u.id = p.created_by', 'left')
            ->join('(SELECT purchaid, SUM(amtpaid) AS paid FROM payment_suplls GROUP BY purchaid) pay', 'pay.purchaid = p.id', 'left');

        if ($purchaseType != 2) {
            $builder->where('p.ppurchase_type', $purchaseType);
        }

        // Global search across a few columns
        if ($searchValue !== '') {
            $builder->groupStart()
                ->like('p.invno', $searchValue)
                ->orLike('s.name', $searchValue)
                ->orLike('st.name', $searchValue)
                ->orLike('w.name', $searchValue)
                ->orLike('u.firstname', $searchValue)
                ->orLike('u.lastname', $searchValue)
                ->groupEnd();
        }

        // Total records (without filtering)
        $countAllBuilder = clone $builder;
        $countAllBuilder->resetQuery(); // ensure clean
        $countAll = $this->db->table('purchases p');
        if ($purchaseType !== 2) {
            $countAll->where('p.ppurchase_type', $purchaseType);
        }
        $recordsTotal = $countAll->countAllResults(false); // false = don't reset

        // Total after filtering
        $countFilteredBuilder = clone $builder;
        $recordsFiltered = $countFilteredBuilder->countAllResults(false);

        // Data page
        $dataBuilder = clone $builder;
        $rows = $dataBuilder->orderBy($orderBy)
            ->limit($length, $start)
            ->get()
            ->getResultArray();

        $decimals = (int) ($settings['decimals'] ?? 2);

        // Build DataTables rows (arrays of columns)
        $data = [];
        foreach ($rows as $r) {
            $dateStr = date("d-m-Y", strtotime($r['purdat']));
            $idPadded = sprintf("%05d", $r['id']);
            $cgstDouble = (float)$r['cgst'] * 2;

            // money formatting
            $total   = number_format((float)$r['total'],  $decimals, '.', '');
            $paid    = number_format((float)$r['paid'],   $decimals, '.', '');
            $balance = number_format((float)$r['balance'], $decimals, '.', '');

            $totalsHtml = '<h6 style="margin:0"><b>Total:</b> Rs.' . $total .
                ' <br><b>Paid:</b> Rs.' . $paid .
                ' <br><b>Balance:</b> Rs.' . $balance . '</h6>';

            $creator = trim(($r['firstname'] ?? '') . ' ' . ($r['lastname'] ?? ''));

            // Action menu (permissions pulled in view too; here we include all, hide in view if needed)
            $actions = '
                <div class="btn-group">
                  <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown"><i class="fa fa-cog fa-fw"></i> Action</a>
                  <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#"><span class="fa fa-caret-down" title="Toggle dropdown menu"></span></a>
                  <ul class="dropdown-menu">
                    <li><a href="javascript:void(0)" onclick="showTicket(' . $r['id'] . ')"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> View</a></li>
                    <li><a href="javascript:void(0)" onclick="showTicketptint(' . $r['id'] . ')"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> Print</a></li>
                    <li><a href="javascript:void(0)" onclick="payaments(' . $r['id'] . ')"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> Payments</a></li>
                    <li><a href="' . base_url('purchase/edit/' . $r['id']) . '"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> Edit</a></li>
                    <li><a href="javascript:void(0)" onclick="delete_invoice(' . $r['id'] . ')"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> Delete</a></li>
                  </ul>
                </div>';

            $data[] = [
                $dateStr,
                $idPadded,
                esc($r['invno']),
                $cgstDouble,
                $total,
                esc($r['supplier_name'] ?? ''),
                esc($r['store_name'] ?? ''),
                esc($r['warehouse_name'] ?? ''),
                $totalsHtml,
                esc($creator),
                $actions,
            ];
        }

        return $this->response->setJSON([
            'draw'            => $draw,
            'recordsTotal'    => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data'            => $data,
        ]);
    }




    public function getPurchasesAgGrid()
    {
        $req = $this->request;

        // AG Grid can send JSON body or form posts. Support both:
        $input = $req->getJSON(true);
        if (!$input) {
            // fallback to POST form
            $input = $req->getPost();
        }

        // ---- AG Grid core params ----
        $startRow = (int)($input['startRow'] ?? 0);
        $endRow   = (int)($input['endRow'] ?? 100);
        $length   = max(0, $endRow - $startRow);

        // sortModel: [ { colId: 'invno', sort: 'asc'|'desc' }, ... ]
        $sortModel    = $input['sortModel']    ?? [];
        // filterModel: { invno: { filterType:'text', type:'contains', filter:'AB' }, ... }
        $filterModel  = $input['filterModel']  ?? [];

        // ---- Column whitelist & mapping (colId -> SQL) ----
        $colMap = [
            'purdat'     => 'p.purdat',
            'id'         => 'p.id',
            'invno'      => 'p.invno',
            'cgst'       => 'p.cgst',
            'total'      => 'p.total',
            'supplier'   => 's.name',
            'store'      => 'st.name',
            'warehouse'  => 'w.name',
            'creator'    => 'u.firstname', // for sort we’ll use firstname, lastname
            // 'totals' and 'actions' are computed/display only
        ];

        // ---- Settings & purchase type (your original logic) ----
        $settings = $this->db->query("SELECT purchase_type, decimals FROM settings WHERE id=1")->getRowArray();
        $purchaseType = (int)($settings['purchase_type'] ?? 2);
        $decimals = (int)($settings['decimals'] ?? 2);

        // ---- Base builder with joins & aggregated payments ----
        $base = $this->db->table('purchases p')
            ->select("
            p.id, p.purdat, p.invno, p.cgst, p.total,
            p.supplier_id, p.store_id, p.warehouse_id, p.created_by,
            s.name AS supplier_name,
            st.name AS store_name,
            w.name AS warehouse_name,
            u.firstname, u.lastname,
            COALESCE(pay.paid, 0) AS paid,
            (p.total - COALESCE(pay.paid, 0)) AS balance
        ")
            ->join('suppliers s', 's.id = p.supplier_id', 'left')
            ->join('stores st', 'st.id = p.store_id', 'left')
            ->join('warehouses w', 'w.id = p.warehouse_id', 'left')
            ->join('users u', 'u.id = p.created_by', 'left')
            ->join('(SELECT purchaid, SUM(amtpaid) AS paid FROM payment_suplls GROUP BY purchaid) pay', 'pay.purchaid = p.id', 'left');

        if ($purchaseType !== 2) {
            $base->where('p.ppurchase_type', $purchaseType);
        }

        // ---- Apply filters from AG Grid filterModel ----
        $builderFiltered = clone $base;

        // helper closures
        $applyText = function ($builder, $sqlCol, $f) {
            // $f: ['filterType'=>'text', 'type'=>'contains|equals|startsWith|endsWith|notEqual', 'filter'=>'val']
            $type   = strtolower($f['type']   ?? 'contains');
            $filter = (string)($f['filter'] ?? '');
            if ($filter === '') return;

            switch ($type) {
                case 'equals':
                    $builder->where($sqlCol, $filter);
                    break;
                case 'notequal':
                    $builder->where("$sqlCol !=", $filter);
                    break;
                case 'startswith':
                    $builder->like($sqlCol, $filter, 'after');
                    break;
                case 'endswith':
                    $builder->like($sqlCol, $filter, 'before');
                    break;
                case 'contains':
                default:
                    $builder->like($sqlCol, $filter, 'both');
                    break;
            }
        };

        $applyNumber = function ($builder, $sqlCol, $f) {
            // $f: {filterType:'number', type:'equals|notEqual|lessThan|lessThanOrEqual|greaterThan|greaterThanOrEqual|inRange', filter:123, filterTo:456}
            $type    = strtolower($f['type'] ?? 'equals');
            $filter  = $f['filter'] ?? null;
            $filterTo = $f['filterTo'] ?? null;

            switch ($type) {
                case 'equals':
                    $builder->where($sqlCol, (float)$filter);
                    break;
                case 'notequal':
                    $builder->where("$sqlCol !=", (float)$filter);
                    break;
                case 'lessthan':
                    $builder->where("$sqlCol <", (float)$filter);
                    break;
                case 'lessthanorequal':
                    $builder->where("$sqlCol <=", (float)$filter);
                    break;
                case 'greaterthan':
                    $builder->where("$sqlCol >", (float)$filter);
                    break;
                case 'greaterthanorequal':
                    $builder->where("$sqlCol >=", (float)$filter);
                    break;
                case 'inrange':
                    if ($filter !== null && $filterTo !== null) {
                        $builder->where("$sqlCol >=", (float)$filter)->where("$sqlCol <=", (float)$filterTo);
                    }
                    break;
            }
        };

        $applyDate = function ($builder, $sqlCol, $f) {
            // $f: {filterType:'date', type:'equals|notEqual|lessThan|greaterThan|inRange', dateFrom:'YYYY-MM-DD', dateTo:'YYYY-MM-DD'}
            $type     = strtolower($f['type'] ?? 'equals');
            $from     = $f['dateFrom'] ?? null;
            $to       = $f['dateTo'] ?? null;

            // Normalize to date only comparison
            switch ($type) {
                case 'equals':
                    if ($from) $builder->where("DATE($sqlCol)", $from);
                    break;
                case 'notequal':
                    if ($from) $builder->where("DATE($sqlCol) !=", $from);
                    break;
                case 'lessthan':
                    if ($from) $builder->where("DATE($sqlCol) <", $from);
                    break;
                case 'greaterthan':
                    if ($from) $builder->where("DATE($sqlCol) >", $from);
                    break;
                case 'inrange':
                    if ($from && $to) {
                        $builder->where("DATE($sqlCol) >=", $from)->where("DATE($sqlCol) <=", $to);
                    }
                    break;
            }
        };

        $applySet = function ($builder, $sqlCol, $f) {
            // $f: {filterType:'set', values: ['A','B',...]}
            $vals = $f['values'] ?? [];
            if (!is_array($vals) || empty($vals)) return;
            $builder->whereIn($sqlCol, $vals);
        };

        foreach ($filterModel as $colId => $f) {
            if (!isset($colMap[$colId])) continue; // skip non-whitelisted
            $sqlCol = $colMap[$colId];
            $filterType = strtolower($f['filterType'] ?? '');

            switch ($filterType) {
                case 'text':
                    $applyText($builderFiltered, $sqlCol, $f);
                    break;
                case 'number':
                    $applyNumber($builderFiltered, $sqlCol, $f);
                    break;
                case 'date':
                    $applyDate($builderFiltered, $sqlCol, $f);
                    break;
                case 'set':
                    $applySet($builderFiltered, $sqlCol, $f);
                    break;
                default:
                    // ignore unknown filter types
                    break;
            }

            // Special case: full name filtering (creator) if you expose it as one column
            if ($colId === 'creator') {
                // If text filter applied to firstname only above, also try lastname OR
                if (($f['filterType'] ?? '') === 'text') {
                    $type   = strtolower($f['type']   ?? 'contains');
                    $filter = (string)($f['filter'] ?? '');
                    if ($filter !== '') {
                        // Group: (firstname like X OR lastname like X)
                        $builderFiltered->groupStart();
                        $applyText($builderFiltered, 'u.firstname', $f);
                        $applyText($builderFiltered, 'u.lastname',  $f);
                        $builderFiltered->groupEnd();
                    }
                }
            }
        }

        // ---- Count total filtered (for lastRow) ----
        $countFilteredBuilder = clone $builderFiltered;
        $totalFiltered = (int)$countFilteredBuilder->countAllResults(false);

        // ---- Sorting ----
        if (!empty($sortModel) && is_array($sortModel)) {
            foreach ($sortModel as $s) {
                $colId = $s['colId'] ?? '';
                $dir   = strtolower($s['sort'] ?? 'asc') === 'desc' ? 'DESC' : 'ASC';
                if ($colId === 'creator') {
                    $builderFiltered->orderBy('u.firstname', $dir)->orderBy('u.lastname', $dir);
                } elseif (isset($colMap[$colId])) {
                    $builderFiltered->orderBy($colMap[$colId], $dir);
                }
            }
        } else {
            // default order
            $builderFiltered->orderBy('p.id', 'DESC');
        }

        // ---- Page slice ----
        if ($length > 0) {
            $builderFiltered->limit($length, $startRow);
        }

        // ---- Fetch rows ----
        $rows = $builderFiltered->get()->getResultArray();

        // ---- Build output rows like your old DataTables payload ----
        $outRows = [];
        foreach ($rows as $r) {
            $dateStr    = date("d-m-Y", strtotime($r['purdat']));
            $idPadded   = sprintf("%05d", $r['id']);
            $cgstDouble = (float)$r['cgst'] * 2;

            $total   = number_format((float)$r['total'],   $decimals, '.', '');
            $paid    = number_format((float)$r['paid'],    $decimals, '.', '');
            $balance = number_format((float)$r['balance'], $decimals, '.', '');

            $totalsHtml = '<h6 style="margin:0"><b>Total:</b> Rs.' . $total .
                ' <br><b>Paid:</b> Rs.' . $paid .
                ' <br><b>Balance:</b> Rs.' . $balance . '</h6>';

            $creator = trim(($r['firstname'] ?? '') . ' ' . ($r['lastname'] ?? ''));

            $actions = '
            <div class="btn-group">
              <a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown"><i class="fa fa-cog fa-fw"></i> Action</a>
              <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#"><span class="fa fa-caret-down" title="Toggle dropdown menu"></span></a>
              <ul class="dropdown-menu">
                <li><a href="javascript:void(0)" onclick="showTicket(' . (int)$r['id'] . ')"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> View</a></li>
                <li><a href="javascript:void(0)" onclick="showTicketptint(' . (int)$r['id'] . ')"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> Print</a></li>
                <li><a href="javascript:void(0)" onclick="payaments(' . (int)$r['id'] . ')"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> Payments</a></li>
                <li><a href="' . base_url('purchase/edit/' . (int)$r['id']) . '"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> Edit</a></li>
                <li><a href="javascript:void(0)" onclick="delete_invoice(' . (int)$r['id'] . ')"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> Delete</a></li>
              </ul>
            </div>';

            // Return an object keyed by your grid colIds
            $outRows[] = [
                'purdat'    => $dateStr,
                'id'        => $idPadded,
                'invno'     => esc($r['invno']),
                'cgst'      => $cgstDouble,
                'total'     => $total,
                'supplier'  => esc($r['supplier_name'] ?? ''),
                'store'     => esc($r['store_name'] ?? ''),
                'warehouse' => esc($r['warehouse_name'] ?? ''),
                'totals'    => $totalsHtml,
                'creator'   => esc($creator),
                'actions'   => $actions,
            ];
        }

        // AG Grid expects lastRow = total filtered rows (or -1 if unknown)
        $lastRow = $totalFiltered;

        return $this->response->setJSON([
            'rows'    => $outRows,
            'lastRow' => $lastRow,
        ]);
    }



    // ============================================== 
}
