<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductModel extends Model
{
    protected $table            = 'products';
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'code',
        'name',
        'cost',
        'price',
        'tax',
        'supplier',
        'type',
        'brandd',
        'category',
        'attime',
        'purid',
        'store_irrdd'
        // Add all your product table fields here
    ];
    protected $returnType       = 'object';

    /**
     * Filtered Products with Pagination
     */
    // public function getFilteredProducts($offset, $perPage)
    // {
    //     if (isset($_POST['productInput']) && !empty($_POST['productInput'])) {
    //         $productInput = $_POST['productInput'];

    //         if (is_numeric($productInput)) {
    //             $this->like('code', $productInput);
    //         } else {
    //             $this->like('name', $productInput);
    //         }
    //     }

    //     $totalRows = $this->countAllResults(false);

    //     $products = $this->limit($perPage, $offset)->findAll();

    //     return ['num_rows' => $totalRows, 'products' => $products];
    // }

    public function filtered_products($offset, $per_page)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('products');
        $request = service('request');

        // Apply filters if productInput is set
        $productInput = $request->getPost('productInput');
        if (!empty($productInput)) {
            if (is_numeric($productInput)) {
                $builder->like('code', $productInput, 'both');
            } else {
                $builder->like('name', $productInput, 'both');
            }
        }

        // Clone for counting rows without limit
        $countBuilder = clone $builder;
        $totalrows = $countBuilder->countAllResults(false);

        // Apply limit/offset for pagination
        $builder->limit($per_page, $offset);
        $query = $builder->get();
        $products = $query->getResult();

        return [
            'num_rows' => $totalrows,
            'products' => $products,
        ];
    }

    public function getFilteredProducts($offset, $perPage, $productInput = null)
    {
        // Count query (base table only)
        $countBuilder = $this->db->table('products');

        if (!empty($productInput)) {
            if (is_numeric($productInput)) {
                $countBuilder->where('products.code', $productInput);
            } else {
                $countBuilder->like('products.name', $productInput);
            }
        }

        $totalRows = $countBuilder->countAllResults();

        // Data query with joins
        $builder = $this->db->table('products')
            ->select('products.*, suppliers.name AS spname, purchase_items.purchase_id AS purid, brand.name AS bname, stores.name AS store_name, stocks.quantity')
            ->join('suppliers', 'products.supplier = suppliers.id', 'left')
            ->join('purchase_items', 'products.id = purchase_items.product_id', 'left')
            ->join('brand', 'products.brandd = brand.id', 'left')
            ->join('stocks', 'stocks.product_id = products.id', 'left')
            ->join('stores', 'stores.id = stocks.store_id', 'left');

        if (!empty($productInput)) {
            if (is_numeric($productInput)) {
                $builder->where('products.code', $productInput);
            } else {
                $builder->like('products.name', $productInput);
            }
        }

        $products = $builder->limit($perPage, $offset)->get()->getResult();

        return [
            'num_rows' => $totalRows,
            'products' => $products,
        ];
    }


    /**
     * Get All Products with optional WHERE condition
     */
    public function getAllProducts(array $where = [])
    {
        if (!empty($where)) {
            return $this->where($where)->findAll();
        }

        return $this->findAll();
    }

    /**
     * Create a new product
     */
    public function createProduct(array $data)
    {
        return $this->insert($data, true); // true returns inserted ID
    }

    /**
     * Find a single product
     */
    public function findProduct($id)
    {
        if (is_array($id)) {
            return $this->where($id)->first();
        }

        return $this->find($id);
    }

    /**
     * Paginated and filtered product listing (Advanced Filtering)
     */
    public function getProducts($limit, $offset, $searchQuery = '', $supplier = '99', $type = '99')
    {
        if ($supplier !== '99') {
            $this->where('supplier', $supplier);
        }

        if ($type !== '99') {
            $this->where('type', $type);
        }

        if (!empty($searchQuery)) {
            $this->groupStart()
                ->like('name', $searchQuery)
                ->orWhere('id', $searchQuery)
                ->groupEnd();
        }

        return $this->limit($limit, $offset)->findAll();
    }

    /**
     * Count products for pagination (Advanced Filtering)
     */
    public function getProductCount($searchQuery = '', $supplier = '99', $type = '99')
    {
        if ($supplier !== '99') {
            $this->where('supplier', $supplier);
        }

        if ($type !== '99') {
            $this->where('type', $type);
        }

        if (!empty($searchQuery)) {
            $this->groupStart()
                ->like('name', $searchQuery)
                ->orWhere('id', $searchQuery)
                ->groupEnd();
        }

        return $this->countAllResults();
    }
}
