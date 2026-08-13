<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Config\Database;

class Createdb extends BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    public function index()
    {
        return view('createdb/index');
    }

    public function create()
    {
        $query = "CREATE DATABASE IF NOT EXISTS my_new_database";

        if ($this->db->query($query)) {
            return $this->response->setJSON(['message' => 'Database created successfully.']);
        } else {
            return $this->response->setJSON(['error' => 'Failed to create database.']);
        }
    }
}
