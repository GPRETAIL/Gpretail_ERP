<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\WarehouseModel;

class Warehouses extends BaseController
{
    protected $db;
    protected $session;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->session = session();

        if (! $this->session->get('user')) {
            redirect()->to('/login')->send();
        }
    }

    public function add()
    {
        $date = date("Y-m-d H:i:s");
        $data = $this->request->getPost();
        $data['created_at'] = $date;

        $model = new WarehouseModel();
        $model->insert($data);

        return redirect()->to('/settings?tab=warehouses');
    }

    public function edit($id = null)
    {
        $model = new WarehouseModel();

        if ($this->request->getMethod() === 'POST') {
            $data = $this->request->getPost();
            $model->update($id, $data);
            // return redirect()->to('/settings?tab=warehouses');
            return redirect()->to('/settings?tab=setting');
        }

        $warehouse = $model->find($id);
        return $this->render('setting/modifyWarehouse', ['warehouse' => $warehouse]);
    }


    public function delete($id)
    {
        $model = new WarehouseModel();
        $model->delete($id);

        return redirect()->to('/settings?tab=warehouses');
    }
}
