<?php

namespace App\Controllers;

use App\Models\CategorieExpenceModel;
use CodeIgniter\Controller;

class CategorieExpences extends BaseController
{
    protected $categorieExpencesModel;

    public function __construct() {}

    public function index()
    {
        $categorieExpenceModel = new CategorieExpenceModel();
        $categories = $categorieExpenceModel->findAll();
        return $this->render('categorie_expence/view', ['categories' => $categories]);
    }

    public function add()
    {

        $categorieExpenceModel = new CategorieExpenceModel();

        if ($this->request->getMethod() === 'POST') {
            $data = [
                'name' => $this->request->getPost('name')
            ];

            $categorieExpenceModel->insert($data);
            return redirect()->to('/categorieExpences');
        }

        return $this->render('categorie_expence/add');
    }

    public function edit($id)
    {
        $categorieExpenceModel = new CategorieExpenceModel();
        $category = $categorieExpenceModel->find($id);

        if ($this->request->getMethod() === 'POST') {
            $data = [
                'name' => $this->request->getPost('name')
            ];

            $categorieExpenceModel->update($id, $data);
            return redirect()->to('/categorieExpences');
        }

        return $this->render('categorie_expence/edit', ['category' => $category]);
    }

    public function delete($id)
    {
        $categorieExpenceModel = new CategorieExpenceModel();
        $categorieExpenceModel->delete($id);
        return redirect()->to('/CategorieExpences');
    }
}
