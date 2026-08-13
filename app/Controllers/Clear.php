<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Config\Database;

class Clear extends BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    public function index()
    {
        // Placeholder logic: Clear specific tables or entries
        $tablesToClear = ['logfiles', 'sessions'];

        foreach ($tablesToClear as $table) {
            $this->db->table($table)->truncate();
        }

        return $this->response->setJSON(['message' => 'Selected tables cleared successfully.']);
    }

    public function truncateTable($table)
    {
        if ($this->db->tableExists($table)) {
            $this->db->table($table)->truncate();
            return $this->response->setJSON(['message' => "Table {$table} truncated successfully."]);
        }

        return $this->response->setJSON(['error' => "Table {$table} does not exist."]);
    }
}
