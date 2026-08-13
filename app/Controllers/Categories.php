<?php

namespace App\Controllers;

use App\Models\CategoryModel;
use App\Models\UserModel;
use CodeIgniter\Controller;

class Categories extends BaseController
{
    protected $db;
    protected $session;
    protected $categoryModel;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->session = session();


        $this->UserModel = new UserModel();
        $this->categoryModel = new CategoryModel();
    }

    public function index()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }
        $data['categories'] = $this->categoryModel->orderBy('name', 'asc')->findAll();
        $data['user'] = $this->user;
        $data['db'] = $this->db;
        return $this->render('category/view', $data);
    }

    public function add()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }
        $data = $this->request->getPost();
        $this->categoryModel->insert($data);

        return redirect()->to('/categories');
    }

    public function addajax()
    {
        $data = [
            'name'       => $this->request->getPost('taxName'),
        ];
        $this->categoryModel->insert($data);

        $options = '';
        $categories = $this->categoryModel->orderBy('name', 'asc')->findAll();
        foreach ($categories as $cat) {
            $options .= '<option value="' . esc($cat['id']) . '">' . esc($cat['name']) . '</option>';
        }

        return $this->response->setBody($options);
    }

    public function adel_chart($ftt)
    {
        $userId = $this->session->get('user')['id'];
        $column = match ($ftt) {
            1 => 'd_s_re',
            2 => 'd_p_re',
            3 => 'm_s_re',
            4 => 'm_p_re',
            default => null,
        };

        if ($column) {
            $this->db->table('users')->where('id', $userId)->update([$column => 1]);
        }
    }

    public function ashh_chart($ftt)
    {
        $userId = $this->session->get('user')['id'];
        $user = $this->db->table('users')->select('d_s_sh,d_p_sh,m_s_sh,m_p_sh')->where('id', $userId)->get()->getRow();

        $map = [1 => 'd_s_sh', 2 => 'd_p_sh', 3 => 'm_s_sh', 4 => 'm_p_sh'];
        if (isset($map[$ftt])) {
            $col = $map[$ftt];
            $newVal = ($user->$col == 1) ? 0 : 1;
            $this->db->table('users')->where('id', $userId)->update([$col => $newVal]);
        }

        return $this->response->setBody('1');
    }

    public function chageitt($ftt)
    {
        $session_user = $this->session->get('user');
        $userId = $session_user->id;
        $user = $this->UserModel->find($userId);

        $map = [1 => 'd_s_re', 2 => 'd_p_re', 3 => 'm_s_re', 4 => 'm_p_re'];
        if (isset($map[$ftt])) {
            $col = $map[$ftt];
            $newVal = ($user->$col == 1) ? 0 : 1;
            $this->db->table('users')->where('id', $userId)->update([$col => $newVal]);
        }

        return redirect()->to('/dashboard/posview');
    }

    public function edit($id = null)
    {
        $session = session();
        $role = $session->get('user')->role;
        $permission = $this->db->table('permission_new')->where('nname', $role)->get()->getRowArray();

        // Check permission
        if (!isset($permission['caae']) || $permission['caae'] != 1) {
            return redirect()->to('/');
        }

        // Process form submission
        if ($this->request->getMethod() === 'POST') {
            $postData = $this->request->getPost();
            $this->categoryModel->update($id, $postData);
            return redirect()->to('/categories');
        }

        // Load category
        $category = $this->categoryModel->find($id);
        if (!$category) {
            return redirect()->to('/categories')->with('error', 'Category not found.');
        }

        return $this->render('category/edit', ['category' => $category]);
        // return view('category/edit', ['category' => $category]);
    }



    public function delete($id)
    {
        $this->categoryModel->delete($id);
        return redirect()->to('/categories');
    }
}
