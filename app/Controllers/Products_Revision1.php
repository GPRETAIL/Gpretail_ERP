<?php

namespace App\Controllers;

use App\Models\ProductModel;
use App\Models\CategoryModel;
use App\Models\SupplierModel;
use App\Models\StockModel;
use App\Models\SettingModel;
use CodeIgniter\Controller;
use CodeIgniter\Files\File;
use PhpOffice\PhpSpreadsheet\IOFactory;


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

    public function index()
    {
        $db = \Config\Database::connect();
        $perPage = 100;
        $currentPage = (int) $this->request->getGet('page') ?: 1;
        $offset = ($currentPage - 1) * $perPage;

        $builder = $db->table('products');
        $total = $builder->countAllResults(false); // Keep query state
        $products = $builder->limit($perPage, $offset)->get()->getResult();

        return view('products/view_final_with_pagination_js', [
            'products' => $products,
            'total' => $total,
            'perPage' => $perPage,
            'currentPage' => $currentPage,
        ]);
    }



        return $this->render('product/view', $data);
    }

    public function edit($id = null)
    {
        $product = $this->productModel->find($id);
        if ($this->request->getPost()) {
            // Handle validation and upload
            // Update product logic
        }

        return view('product/edit', ['product' => $product]);
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
}
