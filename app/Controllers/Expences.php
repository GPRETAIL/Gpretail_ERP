<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\CategorieExpenceModel;
use App\Models\RegisterModel;
use App\Models\StoreModel;
use App\Models\Expence;
use App\Models\ExpenceModel;
use CodeIgniter\HTTP\RedirectResponse;

class Expences extends BaseController
{
    protected $session;
    protected $user;
    protected $register;

    public function __construct()
    {
        $this->session = session();
        $this->user = $this->session->get('user');

        if (! $this->user) {
            return redirect()->to('/login');
        }

        $this->register = $this->session->get('register') ?? false;
    }

    public function index()
    {
        $CategorieExpenceModel = new CategorieExpenceModel();
        $StoreModel = new StoreModel();
        $RegisterModel = new RegisterModel();
        $data = [];

        if ($this->register) {
            $register = $RegisterModel->find($this->register);
            $store = $StoreModel->find($register->store_id);
            $data['storeName'] = $store->name;
            $data['storeId'] = $store->id;
        } else {
            $data['stores'] = $StoreModel->findAll();
        }

        $data['categories'] = $CategorieExpenceModel->findAll();

        return $this->render('expence/view', $data);
    }

    public function add()
    {
        $ExpenceModel = new ExpenceModel();

        $file = $this->request->getFile('attachment');
        $attachment = '';

        if ($file && $file->isValid() && !$file->hasMoved()) {
            $file->move(FCPATH . 'files/expences/', $file->getRandomName());
            $attachment = $file->getName();
        }

        $data = [
            'date' => date('Y-m-d', strtotime($this->request->getPost('date'))),
            'reference' => $this->request->getPost('reference'),
            'category_id' => $this->request->getPost('category'),
            'store_id' => $this->request->getPost('store_id'),
            'amount' => $this->request->getPost('amount'),
            'note' => $this->request->getPost('note'),
            'attachment' => $attachment,
            'created_by' => $this->session->get('user_id')
        ];

        $ExpenceModel->insert($data);

        return redirect()->to('/expences');
    }

    public function edit($id = null)
    {
        $role = $this->user->role;
        $perm = db_connect()->table('permission_new')->where('nname', $role)->get()->getRowArray();

        if ($perm['exxe'] != 1) {
            return redirect()->to('/');
        }

        $StoreModel = new StoreModel();
        $expenceModel = new ExpenceModel();
        $CategorieExpenceModel = new CategorieExpenceModel();

        if ($this->request->getMethod() === 'POST') {
            $file = $this->request->getFile('attachment');
            $expence = $expenceModel->find($id);
            $attachment = $expence['attachment'] ?? '';

            if ($file && $file->isValid() && !$file->hasMoved()) {
                if ($attachment) {
                    @unlink(FCPATH . 'files/expences/' . $attachment);
                }
                $file->move(FCPATH . 'files/expences/', $file->getRandomName());
                $attachment = $file->getName();
            }

            $data = [
                'date' => date('Y-m-d', strtotime($this->request->getPost('date'))),
                'reference' => $this->request->getPost('reference'),
                'category_id' => $this->request->getPost('category'),
                'store_id' => $this->request->getPost('store_id'),
                'amount' => $this->request->getPost('amount'),
                'note' => $this->request->getPost('note'),
                'attachment' => $attachment,
                'created_by' => $this->session->get('user_id')
            ];

            $expenceModel->update($id, $data);

            return redirect()->to('/expences');
        }

        $expenceModel = $expenceModel->find($id);
        $store = ($expenceModel['store_id'] == 0) ? false : $StoreModel->find($expenceModel['store_id']);

        $data = [
            'storeName' => $store ? $store->name : 'Store',
            'stores' => $StoreModel->findAll(),
            'categories' => $CategorieExpenceModel->findAll(),
            'expenceModel' => $expenceModel
        ];

        return $this->render('expence/edit', $data);
    }
}
