<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class Updatedb extends Controller
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function index()
    {
        // === customers table ===
        $this->addColumnIfNotExists('customers', 'tot_creaditpoint', 'DOUBLE NOT NULL DEFAULT 0');
        $this->addColumnIfNotExists('customers', 'birthday_date', 'DATE NOT NULL');
        $this->addColumnIfNotExists('customers', 'anniversary_date', 'DATE NOT NULL');

        // === permission_new table ===
        $this->addColumnIfNotExists('permission_new', 'smsp', 'DOUBLE NOT NULL');
        $this->addColumnIfNotExists('permission_new', 'payv', 'DOUBLE NOT NULL');
        $this->addColumnIfNotExists('permission_new', 'paya', 'DOUBLE NOT NULL');
        $this->addColumnIfNotExists('permission_new', 'paye', 'DOUBLE NOT NULL');
        $this->addColumnIfNotExists('permission_new', 'payd', 'DOUBLE NOT NULL');
        $this->addColumnIfNotExists('permission_new', 'qtv', 'DOUBLE NOT NULL');
        $this->addColumnIfNotExists('permission_new', 'qta', 'DOUBLE NOT NULL');
        $this->addColumnIfNotExists('permission_new', 'qte', 'DOUBLE NOT NULL');
        $this->addColumnIfNotExists('permission_new', 'qtd', 'DOUBLE NOT NULL');

        // Add other columns like prinv, promov, etc. as needed...

        echo 'Database schema update completed.';
    }

    /**
     * Helper: Add a column if it does not exist
     */
    protected function addColumnIfNotExists(string $table, string $column, string $definition)
    {
        $builder = $this->db->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        if ($builder->getNumRows() == 0) {
            $this->db->query("ALTER TABLE `$table` ADD `$column` $definition");
        }
    }
}
