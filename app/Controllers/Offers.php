<?php

namespace App\Controllers;

use App\Models\SettingModel;
use App\Models\UserModel;
use App\Models\RegisterModel;
use CodeIgniter\Controller;

class Offers extends BaseController
{
    protected $setting;
    protected $register;
    protected $store;
    protected $user;

    public function __construct()
    {
        helper(['url', 'form']); // load common helpers
        $session = session();

        // Load language
        $lang = $session->get('langr') ?? 'english';
        $this->request = service('request');
        $this->lang = \Config\Services::language();
        $this->lang->setLocale($lang);

        // Set session values
        $this->register = $session->get('registerr') ?? false;
        $this->store = $session->get('store') ?? false;

        // Load setting
        $settingModel = new \App\Models\SettingModel();
        $this->setting = $settingModel->find(1);

        // Fallback in case timezone is not set
        date_default_timezone_set($this->setting->timezone ?? 'Asia/Dhaka');
    }
    public function index()
    {
        return $this->render('offers', [
            'register' => $this->register
        ]);
    }
    public function addrowret()
    {
        $countId = $this->request->getPost('countid');

        return view('returnnew', [
            'count' => $countId
        ]);
    }
    public function deleteUser($id)
    {
        $userModel = new UserModel();
        $user = $userModel->find($id);

        if ($user && !empty($user['avatar'])) {
            $avatarPath = FCPATH . 'files/Avatars/' . $user['avatar'];
            if (is_file($avatarPath)) {
                @unlink($avatarPath);
            }
        }

        $userModel->delete($id);
        return redirect()->to('/settings?tab=users');
    }
    public function findState()
    {
        $brandId = $this->request->getGet('country');

        $db = \Config\Database::connect();
        $builder = $db->table('products');
        $builder->where('brandd', $brandId);
        $query = $builder->get();

        echo '<option value="">Select</option>';
        foreach ($query->getResult() as $row) {
            echo '<option value="' . esc($row->id) . '">' . esc($row->name) . '</option>';
        }

        return; // or exit;
    }
    public function findStatebran()
    {
        $productId = $this->request->getGet('country');

        $db = \Config\Database::connect();

        // Get product row
        $product = $db->table('products')
            ->where('id', $productId)
            ->get()
            ->getRow();

        if ($product) {
            $brand = $db->table('brand')
                ->where('id', $product->brandd)
                ->get()
                ->getRow();

            if ($brand) {
                echo '<option selected="selected" value="' . esc($brand->id) . '">' . esc($brand->name) . '</option>';
            }
        }

        return;
    }
    public function stockadd()
    {
        $db = \Config\Database::connect();

        // Fetch register and user info
        $register = (new RegisterModel())->find($this->register);
        $user = (new UserModel())->find($register['user_id'] ?? 0);
        $storeid = $register['store_id'] ?? null;
        $createdBy = ($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? '');

        // Input values
        $warr     = $this->request->getPost('warr');
        $avvl     = (int) $this->request->getPost('avalqqt');
        $proiddd  = $this->request->getPost('statediv');
        $mnnnn    = $this->request->getPost('srrtr');

        $th = array_sum($mnnnn);
        $today = date('Y-m-d');

        if ($avvl >= $th) {
            $stores = $db->table('stores')->orderBy('name', 'asc')->get()->getResultArray();
            foreach ($stores as $index => $store) {
                $kmmwe = (int) $mnnnn[$index] ?? 0;
                $strid = $store['id'];

                if ($kmmwe > 0) {
                    // Check if stock exists
                    $stockRow = $db->table('stocks')
                        ->where(['product_id' => $proiddd, 'store_id' => $strid])
                        ->get()
                        ->getRowArray();

                    // Insert stock_transfer
                    $db->table('stock_transfer')->insert([
                        'war_id'        => $warr,
                        'store_id'      => $strid,
                        'pro_id'        => $proiddd,
                        'qty'           => $kmmwe,
                        'tyoftrans'     => 1,
                        'date'          => $today,
                        'bywhom'        => $createdBy,
                        'perselphy_ids' => 0,
                    ]);

                    if ($stockRow === null) {
                        // Insert new stock
                        $db->table('stocks')->insert([
                            'product_id'   => $proiddd,
                            'type'         => 'IN',
                            'store_id'     => $strid,
                            'warehouse_id' => $warr,
                            'quantity'     => $kmmwe,
                            'datte'        => $today,
                        ]);
                    } else {
                        // Update existing stock
                        $updatedQty = $stockRow['quantity'] + $kmmwe;
                        $db->table('stocks')
                            ->where(['product_id' => $proiddd, 'store_id' => $strid])
                            ->update([
                                'type'         => '0',
                                'quantity'     => $updatedQty,
                                'datte'        => $today,
                                'warehouse_id' => $warr,
                            ]);
                    }
                }
            }
        }

        return redirect()->to('purchase');
    }
    public function stockadd_raw()
    {
        $db = \Config\Database::connect();

        // Get register and user data
        $register = (new RegisterModel())->find($this->register);
        $user     = (new UserModel())->find($register['user_id'] ?? 0);
        $createdBy = ($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? '');

        // Get posted values
        $warr       = $this->request->getPost('warr');
        $avvl       = (int) $this->request->getPost('avalqqt');
        $proiddd    = $this->request->getPost('statediv');
        $mnnnn      = $this->request->getPost('srrtr');
        $srrtr_id   = $this->request->getPost('srrtr_id');
        $today      = date('Y-m-d');

        $totalRows = is_array($mnnnn) ? count($mnnnn) : 0;

        for ($i = 0; $i < $totalRows; $i++) {
            $qty   = (int) $mnnnn[$i];
            $store = $srrtr_id[$i] ?? null;

            if ($qty > 0 && $store) {
                $db->table('stock_transferraw')->insert([
                    'war_id'        => $warr,
                    'store_id'      => $store,
                    'pro_id'        => $proiddd,
                    'qty'           => $qty,
                    'tyoftrans'     => 1,
                    'date'          => $today,
                    'bywhom'        => $createdBy,
                    'perselphy_ids' => 0
                ]);
            }
        }

        return redirect()->to('rawmaterial/purchase');
    }
    public function addrow()
    {
        $count = $this->request->getPost('countid');
        return view('problemaddrow', ['count' => $count]);
    }
    public function addrowphy()
    {
        $count = $this->request->getPost('countid');
        return view('problemaddrowphy', ['count' => $count]);
    }
    public function findcctn()
    {
        $productId = $this->request->getGet('country');
        $db = \Config\Database::connect();

        $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();

        if ($product) {
            if ($settings && isset($settings['gst_tax']) && $settings['gst_tax'] == 1) {
                echo $product['cost'] . ',' . $product['price'] . ',' . $product['tax'] . ',' . $product['sgst'];
            } else {
                echo $product['cost'] . ',' . $product['price'] . ',0,0';
            }
        }

        return;
    }
    public function findcctnqqty()
    {
        $productId = $this->request->getGet('country');
        $storeId   = $this->request->getGet('warr');

        $db = \Config\Database::connect();

        $stock = $db->table('stocks')
            ->where(['store_id' => $storeId, 'product_id' => $productId])
            ->get()
            ->getRowArray();

        echo $stock ? $stock['quantity'] : 0;

        return;
    }
    public function findssss()
    {
        $productId = (int) $this->request->getGet('country');
        $warehouseId = (int) $this->request->getGet('sss');

        if ($productId > 0 && $warehouseId > 0) {
            $db = \Config\Database::connect();

            // Total purchased quantity
            $purchaseSum = $db->table('purchase_items')
                ->selectSum('qt')
                ->where(['warehouse_id' => $warehouseId, 'product_id' => $productId])
                ->get()
                ->getRow();

            $totalPurchased = $purchaseSum->qt ?? 0;

            // Total transferred quantity
            $transferSum = $db->table('stock_transfer')
                ->selectSum('qty')
                ->where(['war_id' => $warehouseId, 'pro_id' => $productId])
                ->get()
                ->getRow();

            $totalTransferred = $transferSum->qty ?? 0;

            echo $totalPurchased - $totalTransferred;
        } else {
            echo 0;
        }

        return;
    }
    public function findssss_raw()
    {
        $productId = (int) $this->request->getGet('country');
        $warehouseId = (int) $this->request->getGet('sss');

        if ($productId > 0 && $warehouseId > 0) {
            $db = \Config\Database::connect();

            // Total raw material purchase
            $purchaseSum = $db->table('purchase_itemsraw')
                ->selectSum('qt')
                ->where(['warehouse_id' => $warehouseId, 'product_id' => $productId])
                ->get()
                ->getRow();

            $totalPurchased = $purchaseSum->qt ?? 0;

            // Total raw transfer
            $transferSum = $db->table('stock_transferraw')
                ->selectSum('qty')
                ->where(['war_id' => $warehouseId, 'pro_id' => $productId])
                ->get()
                ->getRow();

            $totalTransferred = $transferSum->qty ?? 0;

            echo $totalPurchased - $totalTransferred;
        } else {
            echo 0;
        }

        return;
    }
    public function findchange()
    {
        $status   = (int) $this->request->getGet('country');
        $entryId  = (int) $this->request->getGet('sss');

        if ($status > 0 && $entryId > 0) {
            $db = \Config\Database::connect();
            $db->table('prentrypurchases')
                ->where('id', $entryId)
                ->update(['status' => $status]);

            echo 1;
        } else {
            echo 0;
        }

        return;
    }
    public function add()
    {
        $db = \Config\Database::connect();
        $role = $this->user->role ?? '';

        $permission = $db->table('permission_new')
            ->where('nname', $role)
            ->get()
            ->getRowArray();

        if (!isset($permission['pua']) || $permission['pua'] != 1) {
            return redirect()->to('/');
        }

        return $this->render('addpurchase_offer');
    }

    public function addtodbb()
    {
        $db = \Config\Database::connect();
        $session = session();

        $register = (new RegisterModel())->find($this->register);
        $user = (new UserModel())->find($register['user_id']);
        $storeid = $register['store_id'];
        $createdBy = $user['firstname'] . ' ' . $user['lastname'];
        $today = date('Y-m-d');

        // Gather posted data
        $totalBeforeTax = $this->request->getPost('betot');
        $invoiceNo = $this->request->getPost('innvno');
        $purchaseDate = $this->request->getPost('pddate');
        $purchaseType = $this->request->getPost('pptye');
        $invoiceDate = $this->request->getPost('innvdda');
        $invoiceAmount = $this->request->getPost('innvamt');
        $cgst = $this->request->getPost('cskgst');
        $sgst = $this->request->getPost('sskgst');
        $discountAmt = $this->request->getPost('ddkst');
        $totalAfterTax = $this->request->getPost('afftot');
        $storeIdTarget = $this->request->getPost('storrid');
        $warehouseId = $this->request->getPost('warr');
        $note = $this->request->getPost('nott');
        $supplierId = $this->request->getPost('supp');
        $ref = $storeIdTarget . 'C' . time();

        // Reformat date
        $purchaseDateFormatted = date('Y-m-d', strtotime(str_replace('/', '-', $purchaseDate)));

        // Insert purchase if totals are valid
        if ($totalBeforeTax > 0 && $totalAfterTax > 0) {
            $db->table('purchases')->insert([
                'discper'      => 0,
                'discamt'      => $discountAmt,
                'invno'        => $invoiceNo,
                'purdat'       => $purchaseDateFormatted,
                'purtpy'       => $purchaseType,
                'invdat'       => $invoiceDate,
                'invamt'       => $invoiceAmount,
                'betot'        => $totalBeforeTax,
                'cgst'         => $cgst,
                'sgst'         => $sgst,
                'ref'          => $ref,
                'date'         => $today,
                'total'        => $totalAfterTax,
                'attachement'  => 1,
                'supplier_id'  => $supplierId,
                'status'       => 1,
                'created_by'   => $user['id'],
                'type'         => 0,
                'store_id'     => $storeIdTarget,
                'warehouse_id' => $warehouseId,
                'note'         => $note,
                'modified_at'  => null
            ]);
        }

        $purchaseId = $db->insertID();

        // Now insert purchase items
        $productIds  = $this->request->getPost('statediv');
        $quantities  = $this->request->getPost('qty');
        $costs       = $this->request->getPost('cosst');
        $subtotals   = $this->request->getPost('subtt');
        $selling     = $this->request->getPost('selling');
        $cgsts       = $this->request->getPost('cgst') ?? [];
        $sgsts       = $this->request->getPost('sgst') ?? [];
        $ttcgsts     = $this->request->getPost('ttcgst') ?? [];
        $ttsgsts     = $this->request->getPost('ttsgst') ?? [];

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $isGST = $settings['gst_tax'] ?? 0;

        foreach ((array) $productIds as $i => $productId) {
            if ($productId > 0 && isset($quantities[$i]) && $purchaseId > 0) {
                // Get brand ID
                $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
                $brandId = $product['brandd'] ?? null;

                // Insert purchase item
                $db->table('purchase_items')->insert([
                    'store_idd'    => $storeid,
                    'selling'      => $selling[$i] ?? 0,
                    'avlqty'       => $quantities[$i],
                    'supplier'     => $supplierId,
                    'brandidd'     => $brandId,
                    'warehouse_id' => $warehouseId,
                    'purchase_id'  => $purchaseId,
                    'product_id'   => $productId,
                    'qt'           => $quantities[$i],
                    'cost'         => $costs[$i],
                    'subtot'       => $subtotals[$i],
                    'cgst'         => $isGST ? ($cgsts[$i] ?? 0) : 0,
                    'sgst'         => $isGST ? ($sgsts[$i] ?? 0) : 0,
                    'ttcg'         => $isGST ? ($ttcgsts[$i] ?? 0) : 0,
                    'ttsg'         => $isGST ? ($ttsgsts[$i] ?? 0) : 0,
                    'ndate'        => $purchaseDateFormatted
                ]);
                $itemId = $db->insertID();

                // Stock transfer
                $db->table('stock_transfer')->insert([
                    'war_id'        => $warehouseId,
                    'store_id'      => $storeIdTarget,
                    'pro_id'        => $productId,
                    'qty'           => $quantities[$i],
                    'totsold'       => 0,
                    'peritemid'     => $itemId,
                    'totamt'        => $subtotals[$i],
                    'tyoftrans'     => 1,
                    'date'          => $today,
                    'bywhom'        => $user['id'],
                    'perchaseid'    => $purchaseId,
                    'perselphy_ids' => 0
                ]);

                // Update/create stock
                if (empty($warehouseId)) {
                    $existingStock = $db->table('stocks')
                        ->where(['product_id' => $productId, 'store_id' => $storeIdTarget])
                        ->get()
                        ->getRowArray();

                    if ($existingStock) {
                        $updatedQty = $existingStock['quantity'] + $quantities[$i];
                        $db->table('stocks')
                            ->where(['product_id' => $productId, 'store_id' => $storeIdTarget])
                            ->update(['quantity' => $updatedQty]);
                    } else {
                        $db->table('stocks')->insert([
                            'product_id'   => $productId,
                            'type'         => '0',
                            'store_id'     => $storeIdTarget,
                            'warehouse_id' => $warehouseId,
                            'quantity'     => $quantities[$i],
                            'price'        => $costs[$i],
                            'puritem_id'   => $purchaseId,
                            'datte'        => $today
                        ]);
                    }
                }
            }
        }

        // Clear temporary sale preview
        $userId = $session->get('user_id');
        $tempData = $db->table('possalprs')->where('userid', $userId)->get()->getResultArray();

        foreach ($tempData as $row) {
            $db->table('possalprs')->where('ats', $row['ats'])->delete();
        }

        return redirect()->to('purchase');
    }

    public function addtodbbraw()
    {
        $db = \Config\Database::connect();
        $session = session();

        // Fetch register and user info
        $register = (new RegisterModel())->find($this->register);
        $user = (new UserModel())->find($register['user_id'] ?? 0);
        $storeid = $register['store_id'];
        $createdBy = ($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? '');
        $today = date('Y-m-d');

        // Collect form inputs
        $totalBeforeTax = $this->request->getPost('betot');
        $invoiceNo      = $this->request->getPost('innvno');
        $purchaseDate   = $this->request->getPost('pddate');
        $purchaseType   = $this->request->getPost('pptye');
        $invoiceDate    = $this->request->getPost('innvdda');
        $invoiceAmount  = $this->request->getPost('innvamt');
        $cgst           = $this->request->getPost('cskgst');
        $sgst           = $this->request->getPost('sskgst');
        $discountAmt    = $this->request->getPost('ddkst');
        $totalAfterTax  = $this->request->getPost('afftot');
        $storeTarget    = $this->request->getPost('storrid');
        $warehouseId    = $this->request->getPost('warr');
        $note           = $this->request->getPost('nott');
        $supplierId     = $this->request->getPost('supp');

        $purchaseDateFormatted = date('Y-m-d', strtotime(str_replace('/', '-', $purchaseDate)));
        $ref = $storeTarget . 'C' . time();

        // Proceed only if total is valid
        if ($totalBeforeTax > 0 && $totalAfterTax > 0 && $totalBeforeTax == $invoiceAmount) {
            $db->table('purchasesraw')->insert([
                'discper'      => 0,
                'discamt'      => $discountAmt,
                'invno'        => $invoiceNo,
                'purdat'       => $purchaseDateFormatted,
                'purtpy'       => $purchaseType,
                'invdat'       => $invoiceDate,
                'invamt'       => $invoiceAmount,
                'betot'        => $totalBeforeTax,
                'cgst'         => $cgst,
                'sgst'         => $sgst,
                'ref'          => $ref,
                'date'         => $today,
                'total'        => $totalAfterTax,
                'attachement'  => 1,
                'supplier_id'  => $supplierId,
                'status'       => 1,
                'created_by'   => $user['id'],
                'type'         => 0,
                'store_id'     => $storeTarget,
                'warehouse_id' => $warehouseId,
                'note'         => $note,
                'modified_at'  => null
            ]);
        }

        $purchaseId = $db->insertID();

        // Insert purchase_itemsraw
        $productIds = $this->request->getPost('statediv');
        $quantities = $this->request->getPost('qty');
        $costs      = $this->request->getPost('cosst');
        $subtotals  = $this->request->getPost('subtt');
        $cgsts      = $this->request->getPost('cgst') ?? [];
        $sgsts      = $this->request->getPost('sgst') ?? [];
        $ttcgsts    = $this->request->getPost('ttcgst') ?? [];
        $ttsgsts    = $this->request->getPost('ttsgst') ?? [];

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $isGST = $settings['gst_tax'] ?? 0;

        foreach ((array) $productIds as $i => $productId) {
            if ($productId > 0 && isset($quantities[$i], $costs[$i])) {
                $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
                $brandId = $product['brandd'] ?? null;

                $db->table('purchase_itemsraw')->insert([
                    'supplier'     => $supplierId,
                    'brandidd'     => $brandId,
                    'warehouse_id' => $warehouseId,
                    'purchase_id'  => $purchaseId,
                    'product_id'   => $productId,
                    'qt'           => $quantities[$i],
                    'cost'         => $costs[$i],
                    'subtot'       => $subtotals[$i],
                    'cgst'         => $isGST ? ($cgsts[$i] ?? 0) : 0,
                    'sgst'         => $isGST ? ($sgsts[$i] ?? 0) : 0,
                    'ttcg'         => $isGST ? ($ttcgsts[$i] ?? 0) : 0,
                    'ttsg'         => $isGST ? ($ttsgsts[$i] ?? 0) : 0,
                    'ndate'        => $purchaseDateFormatted
                ]);

                $itemId = $db->insertID();

                // Insert stock_transferraw if no warehouse
                if (empty($warehouseId)) {
                    $db->table('stock_transferraw')->insert([
                        'war_id'        => $warehouseId,
                        'store_id'      => $storeTarget,
                        'suppid'        => $supplierId,
                        'pro_id'        => $productId,
                        'avlqty'        => $quantities[$i],
                        'pur_rate'      => $costs[$i],
                        'qty'           => $quantities[$i],
                        'peritemid'     => $itemId,
                        'tyoftrans'     => 1,
                        'date'          => $today,
                        'bywhom'        => $user['id'],
                        'perchaseid'    => $purchaseId,
                        'perselphy_ids' => 0
                    ]);
                }
            }
        }

        // Cleanup possalprsraw
        $userId = $session->get('user_id');
        $tmpRows = $db->table('possalprsraw')->where('userid', $userId)->get()->getResultArray();
        foreach ($tmpRows as $row) {
            $db->table('possalprsraw')->where('ats', $row['ats'])->delete();
        }

        return redirect()->to('rawmaterial/purchase');
    }

    public function addtodbbphy()
    {
        $db = \Config\Database::connect();
        $session = session();

        // Get register/user info
        $register = (new RegisterModel())->find($this->register);
        $user = (new UserModel())->find($register['user_id']);
        $storeid = $register['store_id'];
        $createdBy = $user['firstname'] . ' ' . $user['lastname'];
        $today = date('Y-m-d');

        // Get input
        $invoiceNo  = $this->request->getPost('innvno');
        $inputDate  = $this->request->getPost('pddate');
        $storeInput = (int) $this->request->getPost('warr');
        $itemCount  = (int) $this->request->getPost('discct');
        $signedQty  = $this->request->getPost('signn');

        // Optional
        $cgst       = $this->request->getPost('cskgst');
        $sgst       = $this->request->getPost('sskgst');
        $discount   = $this->request->getPost('ddkst');
        $total      = $this->request->getPost('afftot');
        $supplierId = $this->request->getPost('supp');
        $note       = $this->request->getPost('nott');

        // Parsed date
        $formattedDate = date('Y-m-d', strtotime(str_replace('/', '-', $inputDate)));

        $productIds = $this->request->getPost('statediv');
        $quantities = $this->request->getPost('qty');
        $costs      = $this->request->getPost('cosst');
        $subtotals  = $this->request->getPost('subtt');
        $reasons    = $this->request->getPost('reson');

        if ($storeInput > 0 && count((array)$productIds) > 0 && $itemCount > 0) {
            // Insert physical entry
            $db->table('physicals')->insert([
                'storeid'  => $storeInput,
                'date'     => $formattedDate,
                'totitem'  => $itemCount,
                'craeted'  => $user['id']
            ]);
            $physicalId = $db->insertID();
        } else {
            return redirect()->to('physicalstock');
        }

        foreach ((array)$productIds as $i => $productId) {
            if ($productId > 0 && isset($quantities[$i])) {
                $qtySign = intval($signedQty[$i] . $quantities[$i]);

                // Fetch current stock
                $stockRow = $db->table('stocks')
                    ->where(['store_id' => $storeInput, 'product_id' => $productId])
                    ->get()
                    ->getRowArray();

                $currentQty = $stockRow['quantity'] ?? 0;
                $newQty = $currentQty + $qtySign;

                // Update stock
                $db->table('stocks')
                    ->where(['store_id' => $storeInput, 'product_id' => $productId])
                    ->update(['quantity' => $newQty]);

                // Insert physical stock log
                $db->table('physivcal_stock')->insert([
                    'befqty'   => $costs[$i] ?? 0,
                    'affqty'   => $subtotals[$i] ?? 0,
                    'phy_id'   => $physicalId,
                    'storeid'  => $storeInput,
                    'produid'  => $productId,
                    'userid'   => $createdBy,
                    'qty'      => $qtySign,
                    'resonn'   => $reasons[$i] ?? '',
                    'date'     => $formattedDate,
                    'status'   => 1
                ]);

                // Insert stock transfer
                $db->table('stock_transfer')->insert([
                    'war_id'        => 0,
                    'store_id'      => $storeInput,
                    'pro_id'        => $productId,
                    'qty'           => $qtySign,
                    'tyoftrans'     => 3,
                    'date'          => $formattedDate,
                    'bywhom'        => $createdBy,
                    'perselphy_ids' => 0
                ]);
            }
        }

        return redirect()->to('physicalstock');
    }
    public function edit($id = null)
    {
        $db = \Config\Database::connect();
        $role = $this->user->role ?? '';

        $permission = $db->table('permission_new')
            ->where('nname', $role)
            ->get()
            ->getRowArray();

        if (!$permission || ($permission['pue'] ?? 0) != 1) {
            return redirect()->to('/');
        }

        return $this->render('expence/edit_offer', [
            'iid' => $id
        ]);
    }
    public function delete_offer($id)
    {
        $db = \Config\Database::connect();
        $db->table('offers')->where('of_id', $id)->delete();

        return redirect()->to('offers');
    }
    public function updateedit($id = null)
    {
        if ($id && $this->request->getPost()) {
            $offerPrice  = $this->request->getPost('of_offerprice');
            $validFrom   = date('Y-m-d', strtotime($this->request->getPost('of_validfrom')));
            $validTill   = date('Y-m-d', strtotime($this->request->getPost('of_validtill')));

            $db = \Config\Database::connect();

            // Update offer
            $db->table('offers')->where('of_id', $id)->update([
                'of_offerprice'  => $offerPrice,
                'of_validfrom'   => $validFrom,
                'of_validtill'   => $validTill
            ]);

            // Update related product offer price
            $db->table('products')->where('offer_id', $id)->update([
                'offer_price' => $offerPrice
            ]);
        }

        return redirect()->to('offers');
    }

    public function edittodbb($id = null)
    {
        if (!$id) return redirect()->to('purchase');

        $db = \Config\Database::connect();
        $session = session();

        // Get POST data
        $invoiceNo   = $this->request->getPost('innvno');
        $purchaseDateInput = $this->request->getPost('pddate');
        $purchaseDate = date('Y-m-d', strtotime(str_replace('/', '-', $purchaseDateInput)));
        $purchaseType = $this->request->getPost('pptye');
        $invoiceDate  = $this->request->getPost('innvdda');
        $invoiceAmt   = $this->request->getPost('innvamt');
        $totalBefore  = $this->request->getPost('betot');
        $totalAfter   = $this->request->getPost('afftot');
        $cgst         = $this->request->getPost('cskgst');
        $sgst         = $this->request->getPost('sskgst');
        $discount     = $this->request->getPost('ddkst');
        $note         = $this->request->getPost('nott');
        $supplierId   = $this->request->getPost('supp');

        $register = (new RegisterModel())->find($this->register);
        $user     = (new UserModel())->find($register['user_id']);
        $storeId  = $register['store_id'];
        $createdBy = $user['firstname'] . ' ' . $user['lastname'];
        $createdById = $user['id'];
        $today = date('Y-m-d');
        $ref = $storeId . 'C' . time();

        // Fetch purchase and warehouse
        $purchase = $db->table('purchases')->where('id', $id)->get()->getRowArray();
        $warehouseId = $purchase['warehouse_id'];
        $storeTarget = $purchase['store_id'];

        // Update purchase record
        $db->table('purchases')->where('id', $id)->update([
            'discper'      => 0,
            'discamt'      => $discount,
            'invno'        => $invoiceNo,
            'purdat'       => $purchaseDate,
            'purtpy'       => $purchaseType,
            'invdat'       => $invoiceDate,
            'invamt'       => $invoiceAmt,
            'betot'        => $totalBefore,
            'cgst'         => $cgst,
            'sgst'         => $sgst,
            'ref'          => $ref,
            'date'         => $today,
            'total'        => $totalAfter,
            'attachement'  => 1,
            'supplier_id'  => $supplierId,
            'status'       => 1,
            'created_by'   => $createdById,
            'type'         => 0,
            'note'         => $note,
            'modified_at'  => $today
        ]);

        // Items
        $productIds  = $this->request->getPost('statediv');
        $itemIds     = $this->request->getPost('peritemid');
        $quantities  = $this->request->getPost('qty');
        $costs       = $this->request->getPost('cosst');
        $subtotals   = $this->request->getPost('subtt');
        $brands      = $this->request->getPost('customerSelect');
        $cgsts       = $this->request->getPost('cgst');
        $sgsts       = $this->request->getPost('sgst');
        $ttcgsts     = $this->request->getPost('ttcgst');
        $ttsgsts     = $this->request->getPost('ttsgst');

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $useGst = $settings['gst_tax'] ?? 0;

        foreach ($productIds as $i => $productId) {
            $qty = $quantities[$i];
            $cost = $costs[$i];
            $subtotal = $subtotals[$i];
            $itemId = $itemIds[$i] ?? 0;

            if (!$qty || !$cost || !$productId) continue;

            $brandId = $db->table('products')->select('brandd')->where('id', $productId)->get()->getRowArray()['brandd'] ?? null;

            if ($itemId > 0) {
                // Update existing
                $purchaseItem = $db->table('purchase_items')->where('id', $itemId)->get()->getRowArray();
                $oldQty = $purchaseItem['qt'];
                $soldQty = $oldQty - $purchaseItem['avlqty'];
                $newAvl = $qty - $soldQty;

                $db->table('purchase_items')->where('id', $itemId)->update([
                    'qt'      => $qty,
                    'avlqty'  => $newAvl,
                    'cost'    => $cost,
                    'subtot'  => $subtotal
                ]);

                $db->table('stock_transfer')->where('peritemid', $itemId)->update([
                    'qty' => $qty
                ]);

                // Adjust stock if needed
                if ($warehouseId < 1) {
                    $stockRow = $db->table('stocks')->where(['store_id' => $storeTarget, 'product_id' => $productId])->get()->getRowArray();
                    $updatedQty = ($stockRow['quantity'] ?? 0) + ($qty - $oldQty);
                    $db->table('stocks')->where(['store_id' => $storeTarget, 'product_id' => $productId])->update([
                        'quantity' => $updatedQty
                    ]);
                }
            } else {
                // New item
                $itemData = [
                    'store_idd'    => $storeTarget,
                    'supplier'     => $supplierId,
                    'brandidd'     => $brandId,
                    'warehouse_id' => $warehouseId,
                    'purchase_id'  => $id,
                    'product_id'   => $productId,
                    'qt'           => $qty,
                    'avlqty'       => $qty,
                    'cost'         => $cost,
                    'subtot'       => $subtotal,
                    'cgst'         => $useGst ? $cgsts[$i] : 0,
                    'sgst'         => $useGst ? $sgsts[$i] : 0,
                    'ttcg'         => $useGst ? $ttcgsts[$i] : 0,
                    'ttsg'         => $useGst ? $ttsgsts[$i] : 0,
                    'ndate'        => $purchaseDate
                ];

                $db->table('purchase_items')->insert($itemData);
                $newItemId = $db->insertID();

                // Add stock if not warehouse-managed
                if ($warehouseId < 1) {
                    $stock = $db->table('stocks')->where(['store_id' => $storeTarget, 'product_id' => $productId])->get()->getRowArray();
                    if ($stock) {
                        $newQty = $stock['quantity'] + $qty;
                        $db->table('stocks')->where(['product_id' => $productId, 'store_id' => $storeTarget])->update([
                            'quantity' => $newQty
                        ]);
                    } else {
                        $db->table('stocks')->insert([
                            'product_id'   => $productId,
                            'type'         => 0,
                            'store_id'     => $storeTarget,
                            'warehouse_id' => 0,
                            'quantity'     => $qty,
                            'price'        => $cost,
                            'puritem_id'   => $id,
                            'datte'        => $today
                        ]);
                    }
                }

                $db->table('stock_transfer')->insert([
                    'war_id'        => $warehouseId,
                    'store_id'      => $storeTarget,
                    'pro_id'        => $productId,
                    'qty'           => $qty,
                    'peritemid'     => $newItemId,
                    'tyoftrans'     => 1,
                    'date'          => $today,
                    'bywhom'        => $createdBy,
                    'perchaseid'    => $id,
                    'perselphy_ids' => 0
                ]);
            }
        }

        // Cleanup temp rows
        $userId = $session->get('user_id');
        $tempRows = $db->table('possalprspp')->where('userid', $userId)->get()->getResultArray();
        foreach ($tempRows as $row) {
            $db->table('possalprspp')->where('ats', $row['ats'])->delete();
        }

        return redirect()->to('purchase');
    }
}
