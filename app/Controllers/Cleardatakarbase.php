<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Config\Database;

class Cleardatakarbase extends BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    public function index()
    {
        $tablesToTruncate = [
            'brand',
            'categorie_expences',
            'customers',
            'email_todat',
            'expences',
            'goodsitems',
            'goodsout',
            'holds',
            'logfiles',
            'offers',
            'payements',
            'payementsq',
            'payements_advance',
            'payment_suplls',
            'physicals',
            'physivcal_stock',
            'posaleqs',
            'posales',
            'possalprs',
            'possalprspp',
            'possalprs_combo',
            'possalprs_offers',
            'prentrypurchases_combo',
            'price_marterr',
            'price_mrp',
            'prodpurchase_items_combo',
            'productionen',
            'productionitems',
            'products',
            'purchases',
            'purchases_combo',
            'purchase_items',
            'purchase_items_combo',
            'registers_note_count',
            'registers_paymentmode',
            'redeem_tab',
            'registers_ret_tot',
            'retunn_items',
            'returnss',
            'saleqs',
            'sales',
            'sale_itemqs',
            'sale_items',
            'stocks',
            'stock_transfer',
            'suppliers',
            'tax',
            'taxprolist',
            'tax_summary',
            'tax_summaryq',
            'warehouses'
        ];

        foreach ($tablesToTruncate as $table) {
            try {
                $this->db->query("TRUNCATE TABLE `$table`");
            } catch (\Throwable $e) {
                log_message('error', "Failed to truncate table `$table`: " . $e->getMessage());
            }
        }

        // Reset AUTO_INCREMENT
        $this->db->query("ALTER TABLE `customers` AUTO_INCREMENT = 1001");
        $this->db->query("ALTER TABLE `products` AUTO_INCREMENT = 1001");

        return $this->response->setJSON([
            'status'  => 'success',
            'message' => 'All specified tables were truncated and reset.'
        ]);
    }
}
