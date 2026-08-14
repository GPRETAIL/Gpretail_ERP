<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\ProductModel;
use App\Models\CategoryModel;
use App\Models\SupplierModel;
use App\Services\ProductPriceService;
use Config\Services;

class ProductsPrice extends BaseController
{
    protected $productModel;
    protected $categoryModel;
    protected $supplierModel;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->productModel  = new ProductModel();
        $this->categoryModel = new CategoryModel();
        $this->supplierModel = new SupplierModel();

        if (!session('user_id')) {
            redirect()->to('/login')->send();
        }
    }

    public function index()
    {
        $request = service('request');
        $pager = Services::pager();

        // Get filters from POST
        $supplier = $request->getPost('filtersupp') ?? '99';
        $type     = $request->getPost('filtertype') ?? '99';
        $search   = $request->getPost('search_query') ?? '';

        $perPage = 50;
        $page    = (int) ($this->request->getVar('page') ?? 1);
        $offset  = ($page - 1) * $perPage;

        // Get products and count
        $products = $this->productModel->getProducts($perPage, $offset, $search, $supplier, $type);
        $total    = $this->productModel->getProductCount($search, $supplier, $type);

        // Load view with data
        return $this->render('product/view_price', [
            'products'     => $products,
            'pagination'   => $pager->makeLinks($page, $perPage, $total, 'default_full'),
            'supplierF'    => $supplier,
            'typeF'        => $type,
            'search_query' => $search,
            'categories'   => $this->categoryModel->findAll(),
            'suppliers'    => $this->supplierModel->findAll()
        ]);
    }

    /**
     * Server-side-paginated grid for the bulk price-update tool, replacing
     * the old approach of rendering every product on the page in one big
     * <form> (findAll() with no upper bound beyond a fixed 50/page PHP
     * pager) - same DataTables serverSide pattern used for Sales Report
     * and Products.
     */
    public function datatableList()
    {
        $svc = new ProductPriceService();
        $request = service('request');
        $draw   = intval($request->getPost('draw'));
        $start  = intval($request->getPost('start'));
        $length = intval($request->getPost('length'));
        $orderCol = $request->getPost('order')[0]['column'] ?? 3;
        $orderDir = $request->getPost('order')[0]['dir'] ?? 'asc';
        $search = trim((string) ($request->getPost('search')['value'] ?? ''));
        $supplier = trim((string) $request->getPost('supplier'));

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
        $recordsFiltered = $svc->buildQuery($search, $supplier, $colFilters)->countAllResults(false);

        $rows = $svc->buildQuery($search, $supplier, $colFilters)
            ->orderBy($orderBy, $orderDir)
            ->limit($length, $start)
            ->get()
            ->getResultArray();

        // NOTE: ProductsPrice's constructor doesn't call parent::__construct(),
        // so $this->setting (set by BaseController) is never populated here -
        // using the nullsafe operator rather than assuming it exists.
        $decimals = (int) ($this->setting?->decimals ?? 2);
        $data = [];
        foreach ($rows as $r) {
            $data[] = [
                (int) $r['id'],
                esc($r['code']),
                esc($r['name']),
                number_format((float) $r['price'], $decimals, '.', ''),
                number_format((float) $r['price'], $decimals, '.', ''), // starting value for the editable "Update Price" box
                $r['attime'] ? date('d-m-Y h:i A', strtotime($r['attime'])) : '',
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
     * Saves edited prices for whatever rows are currently on screen (AJAX,
     * no full-page reload). Because the grid is now server-side-paginated,
     * a bulk % adjustment only ever applies to the current page's visible
     * rows, same as any other paginated bulk-edit tool - there's no single
     * "save everything across every page" action, since not every row is
     * ever loaded into the browser at once.
     */
    public function savePrices()
    {
        $request = service('request');
        $updates = $request->getPost('updates'); // [{id, price}, ...]
        if (!is_array($updates) || empty($updates)) {
            return $this->response->setJSON(['status' => false, 'message' => 'No rows to save']);
        }

        $db = db_connect();
        $saved = 0;
        $db->transStart();
        foreach ($updates as $row) {
            $id = (int) ($row['id'] ?? 0);
            $price = (float) ($row['price'] ?? -1);
            if ($id > 0 && $price >= 0) {
                // attime has ON UPDATE CURRENT_TIMESTAMP at the DB level,
                // so it's automatically refreshed by this UPDATE - that's
                // what the grid's "Last Updated Price" column reads.
                $db->table('products')->where('id', $id)->update(['price' => $price]);
                $saved++;
            }
        }
        $db->transComplete();

        return $this->response->setJSON([
            'status' => (bool) $db->transStatus(),
            'saved' => $saved,
        ]);
    }
}
