<?php

namespace App\Controllers;

use App\Models\ProductModel;
use App\Models\WarehouseModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use App\Models\SettingModel;
use App\Models\StockModel;
use CodeIgniter\Controller;
use Config\Services;



class ProductController extends BaseController
{
    protected $session;
    protected $setting;
    protected $user;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->session = session();

        $userId = $this->session->get('user_id');
        if ($userId) {
            $this->user = (new UserModel())->find($userId);
        }

        $this->setting = (new SettingModel())->find(1);

        $lang = $this->session->get('lang') ?? 'english';
        Services::language()->setLocale($lang);
    }

    public function add()
    {
        $productModel = new ProductModel();
        $warehouseModel = new WarehouseModel();
        $storeModel = new StoreModel();

        $store_id = $this->store;
        $store = $storeModel->find($store_id);


        $barcode_prefix = strtoupper(mb_substr($store->name, 0, 1, "UTF-8")) . strtoupper(mb_substr($store->city, 0, 1, "UTF-8"));
        $code = $barcode_prefix . $this->request->getPost('code');

        $existing = $productModel->where('code', $code)->countAllResults();
        if ($existing > 0) {
            return $this->response->setJson(['error' => 'This Barcode already exists']);
        }


        $date = date('Y-m-d H:i:s');

        $image = '';
        $image_thumb = '';

        $file = $this->request->getFile('userfile');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(ROOTPATH . 'public/files/products', $newName);
            $image = $newName;
            $image_thumb = pathinfo($newName, PATHINFO_FILENAME) . '_thumb.' . pathinfo($newName, PATHINFO_EXTENSION);
            // Thumbnail creation would need image manipulation library
        }

        $taxIds = $this->request->getPost('ckk');
        $nwp = 0;
        $ignwp = 0;
        if (is_array($taxIds)) {
            foreach ($taxIds as $taxId) {
                $tax = $this->db->table('tax')->where('id', $taxId)->get()->getRowArray();
                if ($tax) {
                    if ($tax['custtype'] == 1) {
                        $nwp += $tax['valueper'];
                    } else {
                        $ignwp += $tax['valueper'];
                    }
                }
            }
        }

        $data = [
            'type' => $this->request->getPost('type'),
            'code' => $code,
            'hsn' => $this->request->getPost('hsn'),
            'name' => $this->request->getPost('name'),
            'category' => $this->request->getPost('category'),
            'cost' => $this->request->getPost('cost'),
            'description' => $this->request->getPost('description'),
            'tax' => $nwp,
            'sgst' => 0,
            'alertqt' => $this->request->getPost('alertqt'),
            'price' => $this->request->getPost('price'),
            'color' => $this->request->getPost('color'),
            'supplier' => $this->request->getPost('supplier'),
            'unit' => $this->request->getPost('unit'),
            'descountperr' => $this->request->getPost('dispx'),
            'taxmethod' => $this->request->getPost('taxmethod'),
            'measur' => $this->request->getPost('measur'),
            'net_wight' => $this->request->getPost('net_wight'),
            'best_before' => $this->request->getPost('best_before'),
            'packed_1m' => $this->request->getPost('packed_1m'),
            'rrate' => $this->request->getPost('rrate'),
            'igst' => $ignwp,
            'photo' => $image,
            'brandd' => $this->request->getPost('brandd'),
            'photothumb' => $image_thumb,
            'created_at' => $date,
            'modified_at' => $date,
        ];


        $productId = $productModel->insert($data);

        $stores = $this->db->table('stores')->where('id', $this->store)->get()->getResult();
        foreach ($stores as $key => $store) {
            $stock_data = [
                'product_id' => $productId,
                'store_id' => $store->id,
                // 'warehouse_id' => $warehouse,
                'quantity' => $this->request->getPost('ini_stock'),
                'price' => $this->request->getPost('cost'),
            ];
            $this->db->table('stocks')->insert($stock_data);

            $stock_transfer_table = $this->db->table('stock_transfer');
            $stock_transfer_table->insert([
                'war_id'            => 0,
                'store_id'          => $store->id,
                'pro_id'            => $productId,
                'qty'               => $this->request->getPost('ini_stock'),
                'tyoftrans'         => 5,
                'date'              => date("Y-m-d"),
                'bywhom'            => 'admin',
                'perselphy_ids'     => 1,
                'perchaseid'        => 0,
                'peritemid'         => 0,
                'productionitemsid' => 0,
                'llvel'             => 0,
                'rrack'             => 1,
                'totamt'            => 1
            ]);
        }


        if ($productId) {
            return $this->response->setJson(['success' => 'Product added successfully.']);
            // return redirect()->to('/products')->with('message', 'Product added successfully.');
        }

        return $this->response->setJson(['success' => 'Failed to add product.']);
    }

    public function addn()
    {
        $productModel = new ProductModel();

        date_default_timezone_set($this->setting->timezone);
        $date = date('Y-m-d H:i:s');

        $file = $this->request->getFile('userfile');
        $image = '';
        $image_thumb = '';

        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(ROOTPATH . 'public/files/products', $newName);
            $image = $newName;
            $image_thumb = pathinfo($newName, PATHINFO_FILENAME) . '_thumb.' . pathinfo($newName, PATHINFO_EXTENSION);
            // Optionally resize the image here
        }

        $taxIds = $this->request->getPost('ckk');
        $nwp = 0;
        $ignwp = 0;
        if (is_array($taxIds)) {
            foreach ($taxIds as $taxId) {
                $tax = $this->db->table('tax')->where('id', $taxId)->get()->getRowArray();
                if ($tax) {
                    if ($tax['custtype'] == 1) {
                        $nwp += $tax['valueper'];
                    } else {
                        $ignwp += $tax['valueper'];
                    }
                }
            }
        }

        $data = [
            'type' => $this->request->getPost('type'),
            'code' => $this->request->getPost('code'),
            'hsn' => $this->request->getPost('hsn'),
            'name' => $this->request->getPost('name'),
            'category' => $this->request->getPost('category'),
            'cost' => $this->request->getPost('cost'),
            'description' => $this->request->getPost('description'),
            'tax' => $nwp,
            'sgst' => 0,
            'alertqt' => $this->request->getPost('alertqt'),
            'price' => $this->request->getPost('price'),
            'color' => $this->request->getPost('color'),
            'supplier' => $this->request->getPost('supplier'),
            'unit' => $this->request->getPost('unit'),
            'descountperr' => $this->request->getPost('dispx'),
            'taxmethod' => $this->request->getPost('taxmethod'),
            'measur' => $this->request->getPost('measur'),
            'net_wight' => $this->request->getPost('net_wight'),
            'best_before' => $this->request->getPost('best_before'),
            'packed_1m' => $this->request->getPost('packed_1m'),
            'rrate' => $this->request->getPost('rrate'),
            'igst' => $ignwp,
            'photo' => $image,
            'brandd' => $this->request->getPost('brandd'),
            'photothumb' => $image_thumb,
            'created_at' => $date,
            'modified_at' => $date,
        ];

        $productId = $productModel->insert($data);

        if ($productId) {
            // Update product code with ID
            $productModel->update($productId, ['code' => $productId]);
            return redirect()->to('/')->with('message', 'Product added successfully.');
        }

        return redirect()->back()->with('error', 'Failed to add product.');
    }


    public function addn_frompur()
    {
        $productModel = new ProductModel();

        date_default_timezone_set($this->setting->timezone);
        $date = date('Y-m-d H:i:s');

        $file = $this->request->getFile('userfile');
        $image = '';
        $image_thumb = '';

        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(ROOTPATH . 'public/files/products', $newName);
            $image = $newName;
            $image_thumb = pathinfo($newName, PATHINFO_FILENAME) . '_thumb.' . pathinfo($newName, PATHINFO_EXTENSION);
            // Thumbnail logic can be added
        }

        $taxIds = $this->request->getPost('ckk');
        $nwp = 0;
        $ignwp = 0;
        if (is_array($taxIds)) {
            foreach ($taxIds as $taxId) {
                $tax = $this->db->table('tax')->where('id', $taxId)->get()->getRowArray();
                if ($tax) {
                    if ($tax['custtype'] == 1) {
                        $nwp += $tax['valueper'];
                    } else {
                        $ignwp += $tax['valueper'];
                    }
                }
            }
        }

        $data = [
            'type' => $this->request->getPost('type'),
            'code' => $this->request->getPost('code'),
            'hsn' => $this->request->getPost('hsn'),
            'name' => $this->request->getPost('name'),
            'category' => $this->request->getPost('category'),
            'cost' => $this->request->getPost('cost'),
            'description' => $this->request->getPost('description'),
            'tax' => $nwp,
            'sgst' => 0,
            'alertqt' => $this->request->getPost('alertqt'),
            'price' => $this->request->getPost('price'),
            'color' => $this->request->getPost('color'),
            'supplier' => $this->request->getPost('supplier'),
            'unit' => $this->request->getPost('unit'),
            'descountperr' => $this->request->getPost('dispx'),
            'taxmethod' => $this->request->getPost('taxmethod'),
            'measur' => $this->request->getPost('measur'),
            'net_wight' => $this->request->getPost('net_wight'),
            'best_before' => $this->request->getPost('best_before'),
            'packed_1m' => $this->request->getPost('packed_1m'),
            'rrate' => $this->request->getPost('rrate'),
            'igst' => $ignwp,
            'photo' => $image,
            'brandd' => $this->request->getPost('brandd'),
            'photothumb' => $image_thumb,
            'created_at' => $date,
            'modified_at' => $date,
        ];

        $productId = $productModel->insert($data);

        if ($productId) {
            return redirect()->to('/purchase/add')->with('message', 'Product added from purchase successfully.');
        }

        return redirect()->back()->with('error', 'Failed to add product from purchase.');
    }


    public function modifystock($id)
    {
        $warehouseModel = new WarehouseModel();
        $storeModel = new StoreModel();
        $stockModel = new StockModel();

        $warehouses = $warehouseModel->findAll();
        $stores = $storeModel->findAll();

        $storeStocks = [];
        foreach ($stores as $store) {
            $stock = $stockModel->where(['store_id' => $store['id'], 'product_id' => $id])->first();
            $storeStocks[] = [
                'store' => $store,
                'quantity' => $stock['quantity'] ?? '0',
                'price' => $stock['price'] ?? '0'
            ];
        }

        $warehouseStocks = [];
        foreach ($warehouses as $warehouse) {
            $stock = $stockModel->where(['warehouse_id' => $warehouse['id'], 'product_id' => $id])->first();
            $warehouseStocks[] = [
                'warehouse' => $warehouse,
                'quantity' => $stock['quantity'] ?? '0'
            ];
        }

        // You would typically pass $storeStocks and $warehouseStocks to a view here
    }


    public function viewProduct($id)
    {
        $db = \Config\Database::connect();
        $product = (new \App\Models\ProductModel())->asArray()->find($id);
        $stores = (new \App\Models\StoreModel())->asArray()->findAll();
        $warehouses = (new \App\Models\WarehouseModel())->asArray()->findAll();
        $setting = (new \App\Models\SettingModel())->asArray()->find(1);

        // Fetch category and supplier using Query Builder
        $category = $db->table('categories')->where('id', $product['category'])->get()->getRowArray();
        $supplier = $db->table('suppliers')->where('id', $product['supplier'])->get()->getRowArray();

        $photo = $product['photo']
            ? '<img class="media-object img-rounded" src="' . base_url('files/products/' . $product['photo']) . '" width="200px">'
            : '<img class="media-object img-rounded" src="http://dummyimage.com/200x200/e3e0e3/fff" width="200px">';

        $html = '<div class="col-md-6"><div class="media">
        <div class="media-left">' . $photo . '</div>
        <div class="media-body">
            <h1 class="media-heading">' . esc($product['name']) . '</h1>
            <b>' . label('Category') . ':</b> ' . esc($category->name ?? '') . '<br>
            <b>' . label('Cost') . ':</b> ' . $product['cost'] . ' ' . $setting['currency'] . '<br>
            <b>' . label('ProductTax') . ':</b> ' . $product['tax'] . '<br>
            <b>' . label('Price') . ':</b> ' . $product['price'] . ' ' . $setting['currency'] . '<br>
            <b>' . label('Supplier') . ':</b> ' . esc($supplier->name ?? '') . '<br>
            <b>' . label('Discount') . ':</b> ' . $product['descountperr'] . '%<br>
            <b>' . label('ProductDescription') . ':</b> ' . esc($product['description']) . '
        </div>
    </div></div>';

        // Store table
        $html .= '<div class="col-md-6">
    <table class="table"><thead><tr>
        <th>' . label('Store') . '</th>
        <th>' . label('Available Qty') . '</th>
        <th><i class="fa fa-eye"></i></th>
    </tr></thead><tbody>';

        $invisList = explode(',', trim($product['h_stores'], ','));
        foreach ($stores as $store) {
            $stock = $db->table('stocks')
                ->where('store_id', $store['id'])
                ->where('product_id', $product['id'])
                ->get()->getRow();

            $qty = $product['type'] == '0' ? ($stock->quantity ?? 0) : '-';
            $checked = in_array($store['id'], $invisList) ? '' : 'checked';

            $html .= '<tr>
            <td>' . esc($store['name']) . '</td>
            <td><b>' . $qty . '</b></td>
            <td><label><input type="checkbox" value="1" ' . $checked .
                ' onclick="makePrdInvis(' . $store['id'] . ',' . $product['id'] . ')"></label></td>
        </tr>';
        }

        $html .= '</tbody></table>';

        // Warehouse table
        $html .= '<table class="table"><thead><tr>
        <th>' . label('Warehouses') . '</th>
        <th>' . label('Available Qty') . '</th>
        <th><i class="fa fa-eye"></i></th>
    </tr></thead><tbody>';

        foreach ($warehouses as $wh) {
            $whStock = $db->table('stocks')
                ->where('warehouse_id', $wh['id'])
                ->where('product_id', $product['id'])
                ->get()->getRow();

            $qty = $product['type'] == '0' ? ($whStock->quantity ?? 0) : '-';

            $html .= '<tr>
            <td>' . esc($wh['name']) . '</td>
            <td><b>' . $qty . '</b></td>
            <td>-</td>
        </tr>';
        }

        $html .= '</tbody></table></div>';

        // Combo items (if product type = 2)
        if ($product['type'] == 2) {
            $comboItems = $db->table('combo_items')->where('product_id', $id)->get()->getResult();

            $html .= '<div class="row"><div class="col-md-12"><h1>' . label('combinations') . '</h1>
        <table class="table"><thead><tr>
            <th>' . label('ProductName') . '</th>
            <th>' . label('Quantity') . '</th>
        </tr></thead><tbody>';

            foreach ($comboItems as $combo) {
                $comboProd = (new \App\Models\ProductModel())->find($combo->item_id);
                $html .= '<tr>
                <td><a href="javascript:void(0)" onclick="Viewproduct(' . $combo->item_id . ')">'
                    . esc($comboProd['name']) . ' (' . esc($comboProd['code']) . ')</a></td>
                <td><b>' . $combo->quantity . '</b></td>
            </tr>';
            }

            $html .= '</tbody></table></div></div>
        <button class="btn btn-add col-md-12" onclick="modifycombo(' . $id . ')">' . label('Modify') . '</button>';
        }

        return $this->response->setBody($html);
    }



    public function barcode($row, $num, $productBcode)
    {
        $store = $this->db->table('stores')
            ->where('id', $this->session->get('store'))
            ->get()->getRowArray();

        $product = $this->db->table('products')
            ->where('id', $productBcode)
            ->get()->getRowArray();

        if (!$product || !$store) {
            return 'Invalid product or store';
        }

        $compname = $store['name'];
        $productName = $product['name'];
        $postPrice = (float) $product['price'];
        $taxRate = (float) $product['tax'] + (float) $product['sgst'];
        $finalPrice = ($product['taxmethod'] == '1')
            ? $postPrice * (1 + $taxRate / 100)
            : $postPrice;

        $barcodeText = $product['code'];
        $unit = $product['unit'];
        $netWeight = $product['net_wight'];
        $mrp = $product['rrate'];
        $packed = $product['packed_1m'];
        $bestBefore = $product['best_before'];
        $address = $store['adresse'];
        $city = $store['city'];
        $email = $store['email'];
        $phone = $store['phone'];

        $barcodeSettings = [
            'bcs' => 'code128',
            'height' => 30,
            'width' => 2,
            'marginTop' => 0.5,
            'labelWidth' => (12 / $row) * 66,
            'repeat' => $num
        ];

        $data = [
            'productName' => $productName,
            'finalPrice' => $finalPrice,
            'barcodeText' => $barcodeText,
            'netWeight' => $netWeight,
            'unit' => $unit,
            'mrp' => $mrp,
            'packed' => $packed,
            'bestBefore' => $bestBefore,
            'compname' => $compname,
            'address' => $address,
            'city' => $city,
            'email' => $email,
            'phone' => $phone,
            'barcodeSettings' => $barcodeSettings
        ];

        // Would typically pass $data to a view to render barcode labels
    }


    public function barcode5025($row, $num, $productBcode)
    {
        $settings = $this->db->table('settings')
            ->where('id', 1)
            ->get()
            ->getRowArray();

        $companyName = $settings['companyname'] ?? 'Company';

        $product = $this->db->table('products')
            ->where('id', $productBcode)
            ->get()
            ->getRowArray();

        if (!$product) {
            return 'Invalid product';
        }

        $productName = $product['name'];
        $postPrice = (float) $product['price'];
        $taxRate = (float) $product['tax'] + (float) $product['sgst'];

        $finalPrice = ($product['taxmethod'] == '1')
            ? $postPrice * (1 + $taxRate / 100)
            : $postPrice;

        $barcodeText = $product['code'];

        $barcodeSettings = [
            'bcs' => 'code128',
            'height' => 30,
            'width' => 2,
            'marginTop' => 0.5,
            'labelWidth' => (12 / $row) * 51,
            'repeat' => $num
        ];

        $data = [
            'companyName' => $companyName,
            'productName' => $productName,
            'finalPrice' => $finalPrice,
            'barcodeText' => $barcodeText,
            'barcodeSettings' => $barcodeSettings
        ];

        // Would typically pass $data to a view for barcode rendering
    }


    public function getProductNames($term)
    {
        $products = $this->db->table('products')
            ->select('name')
            ->groupStart()
            ->like('name', $term)
            ->orLike('code', $term)
            ->groupEnd()
            ->where('type !=', 2)
            ->get()
            ->getResultArray();

        return $products ?: false;
    }


    public function suggest()
    {
        $term = $this->request->getGet('term');
        $products = $this->getProductNames($term);

        if ($products) {
            $suggestions = [];

            foreach ($products as $productRow) {
                $product = $this->db->table('products')
                    ->select('id, name, code, cost')
                    ->where('name', $productRow['name'])
                    ->get()
                    ->getRowArray();

                if ($product) {
                    $suggestions[] = [
                        'id' => $product['id'],
                        'label' => $product['name'],
                        'name' => $product['name'],
                        'code' => $product['code'],
                        'cost' => $product['cost']
                    ];
                }
            }

            return $this->response->setJSON($suggestions);
        }

        return $this->response->setJSON([
            'id' => 0,
            'label' => 'No Product Found'
        ]);
    }


    public function addcombo()
    {
        $quantities = $this->request->getPost('strrr');
        $quantAmounts = $this->request->getPost('qrrt');
        $productId = $this->request->getPost('prodd');

        $registerId = $this->session->get('register');
        $register = $this->db->table('registers')->where('id', $registerId)->get()->getRowArray();
        $user = $this->db->table('users')->where('id', $register['user_id'])->get()->getRowArray();
        $createdBy = $user['firstname'] . ' ' . $user['lastname'];

        if (is_array($quantities) && is_array($quantAmounts)) {
            for ($i = 0; $i < count($quantities); $i++) {
                $storeId = $quantities[$i];
                $qty = $quantAmounts[$i];

                $this->db->table('stocks')->insert([
                    'product_id' => $productId,
                    'type' => '',
                    'store_id' => $storeId,
                    'warehouse_id' => '',
                    'quantity' => $qty,
                    'price' => '',
                    'puritem_id' => '',
                    'datte' => date('Y-m-d'),
                ]);

                $this->db->table('stock_transfer')->insert([
                    'war_id' => '',
                    'store_id' => $storeId,
                    'pro_id' => $productId,
                    'qty' => $qty,
                    'tyoftrans' => '5',
                    'date' => date('Y-m-d'),
                    'bywhom' => $createdBy,
                    'perselphy_ids' => '',
                ]);
            }

            return $this->response->setJSON(['status' => true]);
        }

        return $this->response->setJSON(['status' => false]);
    }


    public function modifycombo($id)
    {
        $comboItems = $this->db->table('combo_item')
            ->where('product_id', $id)
            ->get()
            ->getResultArray();

        $products = [];
        foreach ($comboItems as $combo) {
            $product = $this->db->table('products')
                ->where('id', $combo['item_id'])
                ->get()
                ->getRowArray();

            if ($product) {
                $products[] = [
                    'item_id' => $combo['item_id'],
                    'product_name' => $product['name'],
                    'product_code' => $product['code'],
                    'quantity' => $combo['quantity']
                ];
            }
        }

        $data = [
            'product_id' => $id,
            'combo_items' => $products
        ];

        // You would typically return this data to a view:
        // return view('products/combo_edit', $data);
    }


    public function getcombos($id)
    {
        $comboItems = $this->db->table('combo_item')
            ->where('product_id', $id)
            ->get()
            ->getResultArray();

        $result = [];

        foreach ($comboItems as $item) {
            $product = $this->db->table('products')
                ->where('id', $item['item_id'])
                ->get()
                ->getRowArray();

            if ($product) {
                $result[] = [
                    'item_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'code' => $product['code'],
                    'name' => $product['name']
                ];
            }
        }

        return $this->response->setJSON($result);
    }


    public function makePrdInvis($id, $productId)
    {
        $product = $this->db->table('products')
            ->where('id', $productId)
            ->get()
            ->getRowArray();

        if (!$product) {
            return $this->response->setJSON([
                'status' => false,
                'message' => 'Product not found'
            ]);
        }

        $hiddenStores = $product['h_stores'] ?? '';
        $storeArray = array_filter(explode(',', trim($hiddenStores, ',')));

        if (in_array($id, $storeArray)) {
            // Remove store ID
            $storeArray = array_diff($storeArray, [$id]);
        } else {
            // Add store ID
            $storeArray[] = $id;
        }

        $newHiddenStores = implode(',', $storeArray);

        $this->db->table('products')
            ->where('id', $productId)
            ->update(['h_stores' => $newHiddenStores]);

        return $this->response->setJSON([
            'status' => true,
            'h_stores' => $newHiddenStores
        ]);
    }
}
