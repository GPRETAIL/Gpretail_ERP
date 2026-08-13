<?php

namespace App\Controllers;

use App\Models\SettingModel;
use App\Models\CategoryModel;
use CodeIgniter\Controller;

class PhysicalStock extends BaseController
{
    protected $setting;
    protected $register;
    protected $store;

    public function __construct()
    {
        helper(['url', 'form', 'text']);
        $this->session = session();

        // Language loading (simulate CI3 behavior)
        $lang = $this->session->get('lang') ?? 'english';
        $this->lang = \Config\Services::language();
        $this->lang->setLocale($lang);

        // Register/store sessions
        $this->register = $this->session->get('register') ?? false;
        $this->store = $this->session->get('store') ?? false;

        // Load setting model & timezone
        $settingModel = new SettingModel();
        $this->setting = $settingModel->find(1);

        if (!empty($this->setting) && isset($this->setting->timezone)) {
            date_default_timezone_set($this->setting->timezone);
        }
    }

    public function index()
    {
        return $this->render('physicalstock', [
            'register' => $this->register,
        ]);
    }
    public function deleteUser($id)
    {
        $userModel = new User();
        $user = $userModel->find($id);

        if ($user) {
            // Delete avatar file if exists
            $avatarPath = FCPATH . 'files/Avatars/' . $user['avatar'];
            if (is_file($avatarPath)) {
                unlink($avatarPath);
            }
            // Delete user
            $userModel->delete($id);
        }
        return redirect()->to('/settings?tab=users');
    }
    public function findState()
    {
        $brand = $this->request->getGet('country');

        $db = \Config\Database::connect();
        $builder = $db->table('products');
        $builder->where('brandd', $brand);
        $query = $builder->get();

        $options = '';
        foreach ($query->getResult() as $row) {
            $options .= '<option value="' . esc($row->id) . '">' . esc($row->name) . '</option>';
        }

        return $this->response->setBody($options);
    }
    public function stockadd()
    {
        $db = \Config\Database::connect();

        // Fetch current register
        $register = Register::find($this->register);
        $user = User::find($register->user_id);
        $storeId = $register->store_id;
        $createdBy = $user->firstname . ' ' . $user->lastname;

        // Inputs
        $warehouseId = $this->request->getPost('warr');
        $availableQty = $this->request->getPost('avalqqt');
        $productId = $this->request->getPost('statediv');
        $storeQuantities = $this->request->getPost('srrtr'); // array of quantities

        // Total quantity requested
        $totalQty = array_sum($storeQuantities);

        if ($availableQty >= $totalQty) {
            // Get all stores
            $storesQuery = $db->table('stores')->orderBy('name', 'asc')->get();
            $storeRows = $storesQuery->getResultArray();

            $today = date('Y-m-d');
            $index = 0;

            foreach ($storeRows as $storeRow) {
                $qtyToAdd = (int) ($storeQuantities[$index] ?? 0);
                $storeId = $storeRow['id'];

                if ($qtyToAdd > 0) {
                    // Insert into stock_transfer
                    $db->table('stock_transfer')->insert([
                        'war_id' => $warehouseId,
                        'store_id' => $storeId,
                        'pro_id' => $productId,
                        'qty' => $qtyToAdd,
                        'tyoftrans' => 1,
                        'date' => $today,
                        'bywhom' => $createdBy,
                        'perselphy_ids' => 0
                    ]);

                    (new \App\Models\StockModel())->adjustQuantity((int) $storeId, (int) $productId, $qtyToAdd);
                }

                $index++;
            }
        }

        return redirect()->to(site_url('purchase'));
    }
    public function addrow()
    {
        $data['count'] = $this->request->getPost('countid');

        return view('problemaddrow', $data);
    }
    public function findcctn()
    {
        $db = \Config\Database::connect();
        $productId = $this->request->getGet('country');

        // Fetch product
        $product = $db->table('products')
            ->where('id', $productId)
            ->get()
            ->getRowArray();

        // Fetch settings
        $settings = $db->table('settings')
            ->where('id', 1)
            ->get()
            ->getRowArray();

        if ($product) {
            if (!empty($settings) && $settings['gst_tax'] == 1) {
                echo $product['cost'] . ',' . $product['price'] . ',' . $product['tax'] . ',' . $product['sgst'];
            } else {
                echo $product['cost'] . ',' . $product['price'] . ',0,0';
            }
        } else {
            echo '0,0,0,0';
        }

        exit;
    }
    public function findssss()
    {
        $db = \Config\Database::connect();
        $productId = $this->request->getGet('country');
        $warehouseId = $this->request->getGet('sss');

        if ($productId > 0 && $warehouseId > 0) {
            // Total purchased quantity
            $purchaseItems = $db->table('purchase_items')
                ->selectSum('qt')
                ->where('warehouse_id', $warehouseId)
                ->where('product_id', $productId)
                ->get()
                ->getRowArray();

            $totalPurchased = $purchaseItems['qt'] ?? 0;

            // Total stock quantity
            $stockItems = $db->table('stocks')
                ->selectSum('quantity')
                ->where('warehouse_id', $warehouseId)
                ->where('product_id', $productId)
                ->get()
                ->getRowArray();

            $totalStock = $stockItems['quantity'] ?? 0;

            // Calculate available quantity
            $available = $totalPurchased - $totalStock;

            echo $available;
        } else {
            echo 0;
        }

        exit;
    }
    public function add()
    {
        $db = \Config\Database::connect();
        $session = session();
        $user = $session->get('user'); // Assumes user session is stored as an array
        $role = $user->role ?? null;

        if (!$role) {
            return redirect()->to('/'); // No role found, redirect
        }

        $builder = $db->table('permission_new');
        $permission = $builder->where('nname', $role)->get()->getRowArray();

        if (!isset($permission['pha']) || $permission['pha'] != 1) {
            return redirect()->to('/');
        }

        return $this->render('addphysicalstock');
    }
    public function addtodbb()
    {
        $db = \Config\Database::connect();
        $session = session();

        // Get current register and user info
        $register = Register::find($this->register);
        if (!$register) {
            return redirect()->to('purchase')->with('error', 'Register not found');
        }

        $user = User::find($register->user_id);
        if (!$user) {
            return redirect()->to('purchase')->with('error', 'User not found');
        }

        $storeId = $register->store_id;
        $createdBy = $user->firstname . ' ' . $user->lastname;

        // Get POST data safely
        $request = service('request');
        $betot = $request->getPost('betot');
        $invNo = $request->getPost('innvno');
        $pdDate = $request->getPost('pddate'); // MM/DD/YYYY
        $purType = $request->getPost('pptye');
        $invDate = $request->getPost('innvdda');
        $invAmt = $request->getPost('innvamt');
        $csgst = $request->getPost('cskgst');
        $ssgst = $request->getPost('sskgst');
        $ddkst = $request->getPost('ddkst');
        $affTot = $request->getPost('afftot');
        $warehouseId = $request->getPost('warr');
        $supplierId = $request->getPost('supp');
        $note = $request->getPost('nott');
        $products = $request->getPost('statediv');  // array of product IDs
        $brandIds = $request->getPost('customerSelect'); // array of brand IDs or something similar
        $subtot = $request->getPost('subtt'); // array of subtotals
        $qtys = $request->getPost('qty'); // array of quantities
        $costs = $request->getPost('cosst'); // array of costs

        // Convert date from MM/DD/YYYY to YYYY-MM-DD
        $pdDateParts = explode('/', $pdDate);
        if (count($pdDateParts) === 3) {
            $purDate = $pdDateParts[2] . '-' . $pdDateParts[0] . '-' . $pdDateParts[1];
        } else {
            $purDate = date('Y-m-d');
        }

        // Validation: check amounts and warehouse id
        if ($betot > 0 && $affTot > 0 && $betot == $invAmt && $warehouseId > 0) {

            $ref = $storeId . 'C' . time();
            $dateNow = date('Y-m-d');

            // Insert into purchases
            $purchaseData = [
                'discper'      => 0, // $la37 in original
                'discamt'      => $ddkst,
                'invno'        => $invNo,
                'purdat'       => $purDate,
                'purtpy'       => $purType,
                'invdat'       => $invDate,
                'invamt'       => $invAmt,
                'betot'        => $betot,
                'cgst'         => $csgst,
                'sgst'         => $ssgst,
                'ref'          => $ref,
                'date'         => $dateNow,
                'total'        => $affTot,
                'attachement'  => 1,
                'supplier_id'  => $supplierId,
                'status'       => 1,
                'created_by'   => $user->id ?? null,
                'type'         => 0,
                'store_id'     => $storeId,
                'warehouse_id' => $warehouseId,
                'note'         => $note,
                'modified_at'  => null,
            ];

            $builder = $db->table('purchases');
            $builder->insert($purchaseData);
            $purchaseId = $db->insertID();

            if ($purchaseId && is_array($products)) {
                $count = count($products);
                for ($i = 0; $i < $count; $i++) {
                    if (!empty($products[$i]) && !empty($qtys[$i]) && !empty($costs[$i])) {
                        $purchaseItemData = [
                            'store_idd'   => $storeId,
                            'supplier'    => $supplierId,
                            'brandidd'    => $brandIds[$i] ?? null,
                            'warehouse_id' => $warehouseId,
                            'purchase_id' => $purchaseId,
                            'product_id'  => $products[$i],
                            'qt'          => $qtys[$i],
                            'cost'        => $costs[$i],
                            'subtot'      => $subtot[$i] ?? 0,
                            'cgst'        => 0,
                            'sgst'        => 0,
                            'ttcg'        => 0,
                            'ttsg'        => 0,
                            'ndate'       => $purDate,
                        ];

                        $builderItems = $db->table('purchase_items');
                        $builderItems->insert($purchaseItemData);
                    }
                }
            }
        }

        return redirect()->to('purchase');
    }
    public function edit($id = null)
    {
        // Pass the ID to the view data
        $data['id'] = $id;

        // Load the view with the data
        return $this->render('editphysicalstock', $data);
    }
    public function edittodbb($id = null)
    {
        $db = \Config\Database::connect();
        $session = session();

        $newprr = $this->request->getPost('proid');

        // Delete existing purchase items and corresponding stocks
        $purchaseItems = $db->table('purchase_items')->where('purchase_id', $id)->get()->getResultArray();
        foreach ($purchaseItems as $item) {
            $tppr = $item['id'];
            $db->table('stocks')->where('puritem_id', $tppr)->delete();
            $db->table('purchase_items')->where('id', $tppr)->delete();
        }

        // Find register and user details
        $register = Register::find($this->register);
        $user = User::find($register->user_id);

        $storeid = $register->store_id;
        $createdBy = $user->firstname . ' ' . $user->lastname;

        // Inputs
        $lal1 = $this->request->getPost('betot');
        $lal2 = $this->request->getPost('ttrcgst');
        $lal3 = $this->request->getPost('ttrsgst');
        $lal4 = $this->request->getPost('aftot');

        $la31 = $this->request->getPost('innvno');
        $la322 = $this->request->getPost('pddate');

        $la322x = explode('/', $la322);
        $la32 = $la322x[2] . '-' . $la322x[0] . '-' . $la322x[1];

        $la33 = $this->request->getPost('pptye');
        $la34 = $this->request->getPost('innvdda');
        $la35 = $this->request->getPost('innvamt');

        $la37 = $this->request->getPost('distx');
        $la38 = $this->request->getPost('discct');

        if ($lal1 > 0 && $lal4 > 0 && $lal4 == $la35) {
            $datt = date("Y-m-d");
            $attach = 1;
            $supllir = $this->request->getPost('supp');

            // Get register id from session
            $mkl = $session->get('register') ?? false;
            $oi = $db->table('registers')->where('id', $mkl)->get()->getRowArray();

            $createdby = $oi['user_id'] ?? null;
            $strid = $session->get('store') ?? false;

            $ref = $strid . 'C' . time();

            $warehoseid = $this->request->getPost('warr');
            $nott = $this->request->getPost('nott');

            // Update purchases
            $db->table('purchases')
                ->where('id', $id)
                ->update([
                    'discper'       => $la37,
                    'discamt'       => $la38,
                    'invno'         => $la31,
                    'purdat'        => $la32,
                    'purtpy'        => $la33,
                    'invdat'        => $la34,
                    'invamt'        => $la35,
                    'betot'         => $lal1,
                    'cgst'          => $lal2,
                    'sgst'          => $lal3,
                    'ref'           => $ref,
                    'date'          => $datt,
                    'total'         => $lal4,
                    'attachement'   => $attach,
                    'supplier_id'   => $supllir,
                    'status'        => 1,
                    'created_by'    => $createdby,
                    'type'          => 0,
                    'store_id'      => $strid,
                    'warehouse_id'  => $warehoseid,
                    'note'          => $nott,
                    'modified_at'   => $datt,
                ]);
        }

        if ($lal4 == 0 && $la35 == 0) {
            $db->table('purchases')->where('id', $id)->delete();
        }

        $oll = $id;

        $lal5 = $this->request->getPost('country');
        $lal6 = $this->request->getPost('proid');
        $lal7 = $this->request->getPost('subtt');
        $lal8 = $this->request->getPost('qty');
        $lal9 = $this->request->getPost('cosst');
        $lal10 = $this->request->getPost('cgst');
        $lal11 = $this->request->getPost('sgst');
        $lal12 = $this->request->getPost('ttcgst');
        $lal13 = $this->request->getPost('ttsgst');

        $mm = count($lal5);
        for ($ii = 0; $ii < $mm; $ii++) {
            if ($oll > 0 && !empty($lal6[$ii]) && !empty($lal8[$ii]) && !empty($lal9[$ii])) {

                // Insert purchase_items
                $db->table('purchase_items')->insert([
                    'store_idd'    => $strid,
                    'supplier'     => $supllir,
                    'purchase_id'  => $oll,
                    'product_id'   => $lal6[$ii],
                    'qt'           => $lal8[$ii],
                    'cost'         => $lal9[$ii],
                    'subtot'       => $lal7[$ii],
                    'cgst'         => $lal10[$ii],
                    'sgst'         => $lal11[$ii],
                    'ttcg'         => $lal12[$ii],
                    'ttsg'         => $lal13[$ii],
                    'ndate'        => $la32,
                ]);

                $szpp = $db->insertID();

                // Insert stocks
                $db->table('stocks')->insert([
                    'product_id'   => $lal6[$ii],
                    'type'         => '',
                    'store_id'     => $storeid,
                    'warehouse_id' => $warehoseid,
                    'quantity'     => $lal8[$ii],
                    'price'        => $lal9[$ii],
                    'puritem_id'   => $szpp,
                    'datte'        => $la32,
                ]);
            }
        }

        return redirect()->to(site_url('purchase'));
    }
}
