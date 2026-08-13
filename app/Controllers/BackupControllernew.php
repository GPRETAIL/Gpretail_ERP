<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Config\Database;

class BackupControllerNew extends BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    public function full_backup($param = null)
    {
        // Placeholder for full backup logic
        return $this->response->setJSON([
            'message' => 'New full backup executed.',
            'param' => $param
        ]);
    }

    public function incremental_backup()
    {
        // Placeholder for incremental backup logic
        return $this->response->setJSON([
            'message' => 'New incremental backup executed.'
        ]);
    }
}
