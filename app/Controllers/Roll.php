<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\CategoryModel;
use CodeIgniter\Database\Exceptions\DatabaseException;

class Roll extends BaseController
{
    protected $categoryModel;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->session = session();

        if (!$this->session->get('user')) {
            return redirect()->to(base_url('login'))->send();
        }

        $this->categoryModel = new CategoryModel();
    }

    public function index()
    {
        $data['categories'] = $this->categoryModel->findAll();
        $data['user'] = $this->user;
        return $this->render('roll/view', $data);
    }

    public function add()
    {

        $kmjj = $this->request->getPost('CategoryName');

        $db = db_connect();
        $builder = $db->table('rolls');
        $exists = $builder->where('r_name', $kmjj)->countAllResults();

        if ($exists == 0) {
            $builder->insert(['r_name' => $kmjj, 'r_stas' => 1]);
            $yuii = $db->insertID();

            $db->table('permission_new')->insert(['nname' => $kmjj, 'iid' => $yuii]);
        }

        return redirect()->to(site_url('roll'));
    }

    public function addajax()
    {
        date_default_timezone_set(setting()->timezone ?? 'Asia/Dhaka');
        $date = date("Y-m-d H:i:s");

        $nann = $this->request->getPost('name');

        $db = db_connect();
        $db->table('brand')->insert(['name' => $nann, 'created_at' => $date, 'status' => 1]);

        $options = '';
        $brands = $db->table('brand')->orderBy('name', 'ASC')->get()->getResultArray();

        foreach ($brands as $brand) {
            $options .= '<option value="' . $brand['id'] . '">' . esc($brand['name']) . '</option>';
        }

        return $this->response->setBody($options);
    }

    public function edit($id = null)
    {
        $rolr = $this->session->get('user')->role ?? '';
        $db = db_connect();
        $permission = $db->table('permission_new')->where('nname', $rolr)->get()->getRowArray();

        if (!isset($permission['bre']) || $permission['bre'] != 1) {
            return redirect()->to('/');
        }

        if ($this->request->getMethod() === 'POST') {
            $kmjj = $this->request->getPost('CategoryName');

            $exists = $db->table('rolls')
                ->where('r_id !=', $id)
                ->where('r_name', $kmjj)
                ->countAllResults();

            if ($exists == 0) {
                $db->table('rolls')->where('r_id', $id)->update(['r_name' => $kmjj]);
                $db->table('permission_new')->where('iid', $id)->update(['nname' => $kmjj]);
                return redirect()->to(site_url('roll'));
            }
        }

        return $this->render('roll/edit');
    }

    public function role_delete($id = null)
    {
        $db = db_connect();
        $exists = $db->table('rolls')->where('r_id', $id)->countAllResults();

        if ($exists == 1) {
            $db->table('rolls')->where('r_id', $id)->delete();
            $db->table('permission_new')->where('iid', $id)->delete();
        }

        return redirect()->to(site_url('roll'));
    }

    public function delete($id = null)
    {
        $db = db_connect();
        $exists = $db->table('brand')->where(['id' => $id, 'status' => 0])->countAllResults();

        if ($exists == 1) {
            $db->table('brand')->where(['id' => $id, 'status' => 0])->delete();
        }

        return redirect()->to(site_url('brand'));
    }
}
