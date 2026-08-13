<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\CategoryModel;
use CodeIgniter\Database\BaseConnection;
use Config\Database;

class Levels extends BaseController
{
    protected $db;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->db = Database::connect();

        if (!session()->get('user')) {
            return redirect()->to('/login')->send();
        }
    }

    public function index($ff = null)
    {
        $categoryModel = new CategoryModel();
        $data['categories'] = $categoryModel->findAll();

        return view('levels/view', $data);
    }

    public function viewlevels($ff)
    {
        $data['zsz'] = $ff;
        return view('levels/view', $data);
    }

    public function add()
    {
        date_default_timezone_set(setting()->get('App.timezone') ?? 'Asia/Kolkata');
        $date = date("Y-m-d H:i:s");

        $kmjj = $this->request->getPost('CategoryName');
        $persent = $this->request->getPost('persent');
        $warehousr = $this->request->getPost('warehousr');

        $builder = $this->db->table('levels');
        $exists = $builder->where('name', $kmjj)
                          ->where('warehousr', $warehousr)
                          ->countAllResults();

        if ($exists == 0 && $warehousr > 0) {
            $builder->insert([
                'name'       => $kmjj,
                'created_at' => $date,
                'status'     => 1,
                'valueper'   => $persent,
                'warehousr'  => $warehousr,
            ]);
        }

        return redirect()->to("levels/viewlevels/" . $warehousr);
    }

    public function edit($id = null)
    {
        $builder = $this->db->table('levels');
        $level = $builder->where('id', $id)->get()->getRowArray();

        if (!$level) {
            return redirect()->to('levels');
        }

        $warehousr = $level['warehousr'];

        if ($this->request->getMethod() === 'post') {
            $kmjj = $this->request->getPost('CategoryName');
            $kmjjd = $this->request->getPost('persent');

            $exists = $builder->where('name', $kmjj)
                              ->where('id !=', $id)
                              ->countAllResults();

            if ($exists == 0) {
                $builder->where('id', $id)->update([
                    'name'     => $kmjj,
                    'valueper' => $kmjjd
                ]);
            }

            return redirect()->to("levels/viewlevels/" . $warehousr);
        } else {
            $data['level'] = $level;
            return view('levels/edit', $data);
        }
    }

    public function delete($id)
    {
        $builder = $this->db->table('tax');
        $record = $builder->where('id', $id)->get();

        if ($record->getNumRows() == 1) {
            $builder->where('id', $id)->update(['status' => 0]);
        }

        return redirect()->to('levels');
    }
}
