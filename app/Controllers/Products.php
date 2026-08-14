<?php

namespace App\Controllers;

use App\Models\ProductModel;
use App\Models\CategoryModel;
use App\Models\SupplierModel;
use App\Models\StockModel;
use App\Models\SettingModel;
use CodeIgniter\Controller;
use CodeIgniter\Files\File;
// use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\IOFactory;
use App\Services\ProductService;

class Products extends BaseController
{
    protected $productModel;
    protected $categoryModel;
    protected $supplierModel;
    protected $setting;

    public function __construct()
    {
        $this->pager   = \Config\Services::pager();
        $this->productModel = new ProductModel();
        $this->categoryModel = new CategoryModel();
        $this->supplierModel = new SupplierModel();

        if (!session()->get('user_id')) {
            return redirect()->to('/login');
        }

        $this->setting = (new SettingModel())->find(1);
        // date_default_timezone_set($this->setting['timezone']);
    }

    public function index($offset = 0)
    {
        // NOTE: this used to also run $this->productModel->getFilteredProducts()
        // here and pass productList/total_pages/paginate/per_page/pager/offset
        // to the view - the product grid is now a server-side AJAX DataTable
        // (see datatableList() below) that fetches its own data directly, so
        // all of that was going completely unused while still paying for its
        // cost (unindexed purchase_items/stocks joins, full table scans) on
        // every single page load. Removed; $categories/$suppliers are kept
        // since the add/edit product modals further down the view still use them.
        $data['categories'] = $this->categoryModel->findAll();
        $data['suppliers'] = $this->supplierModel->findAll();

        return $this->render('product/view', $data);
    }

    // public function warehouseProducts()
    // {
    //     $request = service('request');
    //     $session = session();
    //     $pager = \Config\Services::pager();
    //     $ProductModel = new ProductModel();

    //     $offset = (int) ($this->request->getGet('page') ?? 1);
    //     $perPage = (int) ($this->request->getGet('per_page') ?? 50);

    //     $response = $ProductModel::filteredProducts(($offset - 1) * $perPage, $perPage);
    //     $totalRows = $response['num_rows'];
    //     $products = $response['products'];

    //     $pagerLinks = $pager->makeLinks($offset, $perPage, $totalRows, 'default_full');

    //     $supplier = $request->getPost('filtersupp') ?? '99';
    //     $supplierF = ($supplier === '99') ? '99' : 'supplier';

    //     $type = $request->getPost('filtertype');
    //     $type = ($type !== null || $type === '0') ? $type : '99';
    //     $typeF = ($type === '99') ? '99' : 'type';

    //     $data = [
    //         'paginate'     => $pagerLinks,
    //         'per_page'     => $perPage,
    //         'extra_per_page' => $perPage,
    //         'offset'       => ($offset - 1) * $perPage,
    //         'productList'  => $products,
    //         'user_id'      => $session->get('user_id'),
    //         'products'     => model('ProductModel')->where('combo_id', 0)->findAll(),
    //         'supplierF'    => $supplier,
    //         'typeF'        => $type,
    //         'categories'   => model('CategoryModel')->findAll(),
    //         'suppliers'    => model('SupplierModel')->findAll(),
    //     ];

    //     return $this->render('product/warehouse_product_view', $data);
    // }




    public function warehouseProducts()
    {
        $request = service('request');
        $pager = \Config\Services::pager();
        $session = session();

        $perPage = $request->getGet('per_page') ?? 50;
        $offset = $request->getGet('offset') ?? 0;

        // Load filtered products
        $response = $this->productModel->filtered_products($offset, $perPage);
        $totalRows = $response['num_rows'];
        $productList = $response['products'];

        // Get filters from POST
        $supplier = $request->getPost('filtersupp') ?? '99';
        $type = $request->getPost('filtertype');
        $type = ($type === null || $type === '') ? '99' : $type;

        $data = [
            'paginate'     => $pager->makeLinks($offset, $perPage, $totalRows, 'default_full'),
            'per_page'     => $perPage,
            'extra_per_page' => $perPage,
            'offset'       => $offset,
            'productList'  => $productList,
            'user_id'      => $session->get('user_id'),
            'products'     => model(ProductModel::class)->where('combo_id', 0)->findAll(),
            'supplierF'    => $supplier,
            'typeF'        => $type,
            'categories'   => model(CategoryModel::class)->findAll(),
            'suppliers'    => model(SupplierModel::class)->findAll(),
        ];

        return $this->render('product/warehouse_product_view', $data);
    }

    public function edit($id = null)
    {
        $role = $this->role;

        $permission = $this->db->table('permission_new')->where('nname', $role)->get()->getRowArray();
        if (($permission['pre'] ?? 0) != 1) {
            return redirect()->to('/');
        }

        $productModel = new \App\Models\ProductModel();
        $taxModel = $this->db->table('tax');
        $taxProListModel = $this->db->table('taxprolist');

        $data['categories'] = (new \App\Models\CategoryModel())->findAll();
        $data['suppliers'] = (new \App\Models\SupplierModel())->findAll();
        $data['product'] = $productModel->find($id);
        $data['setting'] = $this->setting;

        $date = date('Y-m-d H:i:s');

        if ($this->request->getMethod() === 'POST') {
            $tgzxx = $this->request->getPost('ckk') ?? [];

            $nwp = $ignwp = 0;
            foreach ($tgzxx as $taxId) {
                $tax = $taxModel->where('id', $taxId)->get()->getRow();
                if ($tax) {
                    if ($tax->custtype == 1) {
                        $nwp += intval($tax->valueper);
                    } else {
                        $ignwp += intval($tax->valueper);
                    }
                }
            }

            // Handle file upload
            $file = $this->request->getFile('userfile');
            $image = $image_thumb = null;

            if ($file && $file->isValid() && !$file->hasMoved()) {
                $newName = $file->getRandomName();
                $file->move(ROOTPATH . 'public/files/products', $newName);

                if (!empty($data['product']['photo'])) {
                    @unlink(ROOTPATH . 'public/files/products/' . $data['product']['photo']);
                    @unlink(ROOTPATH . 'public/files/products/' . $data['product']['photothumb']);
                }

                $image = $newName;
                $image_thumb = pathinfo($newName, PATHINFO_FILENAME) . '_thumb.' . pathinfo($newName, PATHINFO_EXTENSION);
                // Optional: implement image resize logic
            }

            $updateData = [
                'type' => $this->request->getPost('type'),
                'code' => $this->request->getPost('code'),
                'name' => $this->request->getPost('name'),
                'hsn' => $this->request->getPost('hsn'),
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
                'taxmethod' => $this->request->getPost('taxmethod'),
                'brandd' => $this->request->getPost('brandd'),
                'descountperr' => $this->request->getPost('dispx'),
                'measur' => $this->request->getPost('measur'),
                'best_before' => $this->request->getPost('best_before'),
                'packed_1m' => $this->request->getPost('packed_1m'),
                'net_wight' => $this->request->getPost('net_wight'),
                'rrate' => $this->request->getPost('rrate'),
                'igst' => $ignwp,
                'created_at' => $date,
                'modified_at' => $date
            ];

            if ($image) {
                $updateData['photo'] = $image;
                $updateData['photothumb'] = $image_thumb;
            }

            $result = $this->db->table('products')->where('id', $id)->update($updateData);

            if ($result) {
                $taxProListModel->where('proid', $id)->delete();

                foreach ($tgzxx as $taxId) {
                    $tax = $taxModel->where('id', $taxId)->get()->getRow();
                    if ($tax) {
                        $taxProListModel->insert([
                            'proid' => $id,
                            'taxid' => $taxId,
                            'taxamount' => $tax->valueper,
                            'custtype' => $tax->custtype,
                            'dated' => date('Y-m-d')
                        ]);
                    }
                }

                return redirect()->to('/products');
            } else {
                $session->setFlashdata('error', label('codeerror'));
                return redirect()->to('/products/edit/' . $id);
            }
        }

        return $this->render('product/edit', $data);
    }


    public function delete($id)
    {
        $hasSales = db_connect()->table('sale_items')->where('product_id', $id)->countAllResults();
        if ($hasSales == 0) {
            $this->productModel->delete($id);
        } else {
            return redirect()->to('/products?error=Product has sales');
        }

        return redirect()->to('/products');
    }

    public function deactive($id)
    {
        $this->productModel->update($id, ['statuss' => 1]);
        return redirect()->to('/products');
    }

    public function active($id)
    {
        $this->productModel->update($id, ['statuss' => 0]);
        return redirect()->to('/products');
    }

    public function csv()
    {
        $db = db_connect();
        $builder = $db->table('products');
        $query = $builder->select('code, name, category, cost, tax, description, price')->get();
        $data = $this->dbutil->csvFromResult($query);

        return $this->response->download('products.csv', $data);
    }

    public function importcsv()
    {
        $file = $this->request->getFile('userfile');
        if ($file->isValid() && !$file->hasMoved()) {
            $file->move(WRITEPATH . 'uploads/products', $file->getName());
            $path = WRITEPATH . 'uploads/products/' . $file->getName();

            $handle = fopen($path, 'r');
            $header = fgetcsv($handle);
            while (($row = fgetcsv($handle)) !== false) {
                $productData = array_combine($header, $row);
                $productData['created_at'] = date('Y-m-d H:i:s');
                $productData['modified_at'] = date('Y-m-d H:i:s');
                $this->productModel->insert($productData);
            }
            fclose($handle);
        }

        return redirect()->to('/products');
    }
    public function importcsvnew()
    {
        $session = session();
        $userId = $session->get('user_id');

        $file = $this->request->getFile('userfile');
        if (!$file->isValid()) {
            return redirect()->back()->with('error', $file->getErrorString());
        }

        $newName = time() . $file->getClientName();
        $uploadPath = ROOTPATH . 'public/files/products/';
        $file->move($uploadPath, $newName);
        $inputFileName = $uploadPath . $newName;

        try {
            $spreadsheet = IOFactory::load($inputFileName);
            $sheet = $spreadsheet->getActiveSheet();
            $highestRow = $sheet->getHighestRow();
            $highestColumn = $sheet->getHighestColumn();
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error loading file: ' . $e->getMessage());
        }

        $db = \Config\Database::connect();

        for ($row = 2; $row <= $highestRow; $row++) {
            $rowData = $sheet->rangeToArray('A' . $row . ':' . $highestColumn . $row, null, true, false)[0];

            // Sanitize / default empty values
            $defaults = array_fill(0, 22, 0);
            $rowData = array_replace($defaults, $rowData);

            $data = [
                'name'         => $rowData[0],
                'brandd'       => $rowData[2],
                'category'     => $rowData[3],
                'cost'         => $rowData[4],
                'tax'          => $rowData[7],
                'description'  => $rowData[10],
                'price'        => $rowData[5],
                'descountperr' => $rowData[11],
                'photo'        => '',
                'photothumb'   => '',
                'color'        => 'color01',
                'created_at'   => date('Y-m-d'),
                'modified_at'  => date('Y-m-d'),
                'type'         => 0,
                'alertqt'      => $rowData[12],
                'supplier'     => $rowData[13],
                'unit'         => $rowData[14],
                'taxmethod'    => $rowData[15],
                'h_stores'     => '',
                'sgst'         => 0,
                'hsn'          => 0,
                'igst'         => $rowData[9],
                'rrate'        => $rowData[6],
                'packed_1m'    => $rowData[19],
                'net_wight'    => $rowData[18],
                'best_before'  => $rowData[20],
            ];

            if (!empty($rowData[0])) {
                $db->table('products')->insert($data);
                $productId = $db->insertID();

                // Set product code
                $code = ($rowData[1] == '' || $rowData[1] == 0) ? $productId : $rowData[1];
                $db->table('products')->update(['code' => $code], ['id' => $productId]);

                // Tax
                $tax1 = $db->table('tax')->where('id', $rowData[7])->get()->getRowArray();
                $tax2 = $db->table('tax')->where('id', $rowData[8])->get()->getRowArray();
                $val1 = floatval($tax1['valueper'] ?? 0);
                $val2 = floatval($tax2['valueper'] ?? 0);
                $totalTax = $val1 + $val2;

                $db->table('taxprolist')->insert([
                    'proid'     => $productId,
                    'taxid'     => $rowData[7],
                    'taxamount' => $val1,
                    'dated'     => date('Y-m-d'),
                ]);
                $db->table('taxprolist')->insert([
                    'proid'     => $productId,
                    'taxid'     => $rowData[8],
                    'taxamount' => $val2,
                    'dated'     => date('Y-m-d'),
                ]);
                $db->table('products')->update(['tax' => $totalTax], ['id' => $productId]);

                // Insert stock_transfer
                $db->table('stock_transfer')->insert([
                    'store_id' => $rowData[16],
                    'pro_id'   => $productId,
                    'qty'      => $rowData[17],
                    'tyoftrans' => 5,
                    'llvel'    => $rowData[19],
                    'rrack'    => $rowData[20],
                    'date'     => date('Y-m-d'),
                    'bywhom'   => $userId,
                ]);

                // Insert stocks for all stores
                $stores = $db->table('stores')->select('id')->get()->getResultArray();
                foreach ($stores as $store) {
                    $db->table('stocks')->insert([
                        'product_id'   => $productId,
                        'type'         => 0,
                        'store_id'     => $store['id'],
                        'warehouse_id' => 0,
                        'quantity'     => $rowData[17],
                        'price'        => 0,
                        'puritem_id'   => 0,
                        'datte'        => date('Y-m-d'),
                    ]);
                }
            }
        }

        return redirect()->to(site_url('products'))->with('success', 'CSV Imported Successfully');
    }
    public function updatestock()
    {
        $quant = $this->request->getPost('quant');
        $quantw = $this->request->getPost('quantw');
        $pricest = $this->request->getPost('pricest');
        $productID = $this->request->getPost('productID');

        $stockModel = new StockModel();

        if ($quant) {
            foreach ($quant as $qt) {
                $stockModel->updateOrInsert($qt, $productID, 'quantity');
            }
        }

        if ($pricest) {
            foreach ($pricest as $pr) {
                $stockModel->updateOrInsert($pr, $productID, 'price');
            }
        }

        if ($quantw) {
            foreach ($quantw as $qt) {
                $stockModel->updateOrInsert($qt, $productID, 'quantity', true);
            }
        }

        return redirect()->to('/products');
    }

    protected function resize($path, $file)
    {
        $image = \Config\Services::image()
            ->withFile($path)
            ->resize(120, 120, true, 'height')
            ->save(FCPATH . 'uploads/products/' . $file);
    }

    /**
     * Server-side-paginated data grid for the Products page, replacing the
     * old ag-Grid setup that fetched every product in one request
     * (brand/fetch_all_records) and paginated/filtered entirely client-side.
     * Same DataTables serverSide contract used for the Sales Report grid.
     */
    public function datatableList()
    {
        $svc = new ProductService();
        $request = service('request');
        $draw   = intval($request->getPost('draw'));
        $start  = intval($request->getPost('start'));
        $length = intval($request->getPost('length'));
        $orderCol = $request->getPost('order')[0]['column'] ?? 3;
        $orderDir = $request->getPost('order')[0]['dir'] ?? 'asc';
        $search = trim((string) ($request->getPost('search')['value'] ?? ''));

        $columns = $svc->columnMap();
        $orderBy = $columns[$orderCol] ?? 'pr.name';

        $colFilters = [];
        $posted = $request->getPost('columns') ?? [];
        foreach ($columns as $i => $field) {
            $val = trim((string) ($posted[$i]['search']['value'] ?? ''));
            if ($val !== '') {
                $colFilters[$i] = $val;
            }
        }

        $db = db_connect();
        $recordsTotal = $db->table('products')->countAllResults();
        $recordsFiltered = $svc->buildQuery($search, $colFilters)->countAllResults(false);

        $rows = $svc->buildQuery($search, $colFilters)
            ->orderBy($orderBy, $orderDir)
            ->limit($length, $start)
            ->get()
            ->getResultArray();

        $data = [];
        foreach ($rows as $r) {
            $data[] = [
                (int) $r['id'],
                esc($r['code']),
                esc($r['hsn']),
                esc($r['name']),
                esc($r['tax']),
                (float) $r['cost'],
                (float) $r['price'],
                (float) $r['rrate'],
                (float) $r['discount_per'],
                esc($r['bname'] ?? ''),
                esc($r['sname'] ?? ''),
                (float) $r['store_stock'],
            ];
        }

        return $this->response->setJSON([
            'draw' => $draw,
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data' => $data,
        ]);
    }

    /**
     * Streamed CSV/Excel export of every product matching the current
     * filters (not just the current page), same technique used for the
     * Sales Report export - fetched in bounded batches so memory stays
     * flat regardless of catalog size.
     */
    public function exportProducts()
    {
        $svc = new ProductService();
        $request = service('request');
        $format = $request->getVar('format') === 'xlsx' ? 'xlsx' : 'csv';
        $search = trim((string) $request->getVar('search'));

        $headers = ['ID', 'Code', 'HSN', 'Name', 'Tax', 'Pur Price', 'Selling Price', 'MRP', 'Discount', 'Brand', 'Supplier', 'Stock'];
        $rowMapper = function (array $r) {
            return [
                $r['id'], $r['code'], $r['hsn'], $r['name'], $r['tax'],
                $r['cost'], $r['price'], $r['rrate'], $r['discount_per'],
                $r['bname'] ?? '', $r['sname'] ?? '', $r['store_stock'],
            ];
        };
        $baseBuilderFn = fn() => $svc->buildQuery($search, [])->orderBy('pr.name', 'asc');

        set_time_limit(0);
        $filename = 'Products-' . date('Y-m-d');

        if ($format === 'csv') {
            $this->response->setHeader('Content-Type', 'text/csv');
            $this->response->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '.csv"');
            $this->response->sendHeaders();

            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            $batch = 500;
            $offset = 0;
            while (true) {
                $rows = $baseBuilderFn()->limit($batch, $offset)->get()->getResultArray();
                if (empty($rows)) {
                    break;
                }
                foreach ($rows as $r) {
                    fputcsv($out, $rowMapper($r));
                }
                $offset += $batch;
                if (count($rows) < $batch) {
                    break;
                }
            }
            fclose($out);
            exit;
        }

        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '.xls"');
        echo '<table border="1"><thead><tr>';
        foreach ($headers as $h) {
            echo '<th>' . esc($h) . '</th>';
        }
        echo '</tr></thead><tbody>';
        $batch = 500;
        $offset = 0;
        while (true) {
            $rows = $baseBuilderFn()->limit($batch, $offset)->get()->getResultArray();
            if (empty($rows)) {
                break;
            }
            foreach ($rows as $r) {
                echo '<tr>';
                foreach ($rowMapper($r) as $cell) {
                    echo '<td>' . esc((string) $cell) . '</td>';
                }
                echo '</tr>';
            }
            $offset += $batch;
            if (count($rows) < $batch) {
                break;
            }
        }
        echo '</tbody></table>';
        exit;
    }
}
