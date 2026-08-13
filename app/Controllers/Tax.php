<?php

namespace App\Controllers;
// use App\Controllers\BaseController;
// use CodeIgniter\Database\BaseConnection;
use App\Models\TaxModel;

class Tax extends BaseController
{
    public function __construct()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }
    }

    public function index()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }
        $categories = $this->db
            ->table('tax')
            ->where('status', 1)
            ->orderBy('name', 'ASC')
            ->get()
            ->getResultArray();


        return $this->render('tax/view', ['categories' => $categories]);
    }

    public function add()
    {
        $data = [
            'name'        => $this->request->getPost('CategoryName'),
            'created_at'  => date('Y-m-d H:i:s'),
            'status'      => 1,
            'valueper'    => $this->request->getPost('persent'),
            'custtype'    => $this->request->getPost('custtype'),
            'taxtype'     => $this->request->getPost('taxtype'),
            'taxdefault'  => $this->request->getPost('default')
        ];
        if (!empty($this->request->getPost('cgst'))) {
            $data['cgst'] = $this->request->getPost('cgst');
            $data['tax_for'] = 1;
        }
        if (!empty($this->request->getPost('sgst'))) {
            $data['sgst'] = $this->request->getPost('sgst');
            $data['tax_for'] = 1;
        }
        if (!empty($this->request->getPost('igst'))) {
            $data['igst'] = $this->request->getPost('igst');
            $data['tax_for'] = 1;
        }
        if (!empty($this->request->getPost('gst'))) {
            $data['gst'] = $this->request->getPost('gst');
            $data['tax_for'] = 1;
        }

        $this->db->table('tax')->insert($data);
        return redirect()->to('/tax');
    }

    public function add_type()
    {
        $data = [
            'created_at' => date('Y-m-d H:i:s'),
            'taxtype'    => $this->request->getPost('taxtype')
        ];

        $this->db->table('taxtype')->insert($data);
        return redirect()->to('/tax');
    }

    public function addajax()
    {
        $data = [
            'name'       => $this->request->getPost('taxName'),
            'created_at' => date('Y-m-d H:i:s'),
            'status'     => 1,
            'valueper'   => $this->request->getPost('persent'),
            'custtype'   => $this->request->getPost('custtype')
        ];

        $this->db->table('tax')->insert($data);

        $taxes = $this->db->table('tax')->where('status', 1)->orderBy('name', 'asc')->get()->getResult();
        $output = '';

        foreach ($taxes as $tax) {
            $output .= '<div class="col-xs-4">
                <span style="float: left;width: 10%">
                    <input type="checkbox" style="display: block;" name="ckk[]" id="ckc" value="' . esc($tax->id) . '">
                </span>
                <span style="float: left;width:80%;margin-left:5%;">' . esc($tax->name) . '-' . esc($tax->valueper) . '%</span>
            </div>';
        }

        return $this->response->setBody($output);
    }

    public function edit($id = null)
    {
        $uri = service('uri');
        $user = $this->session->get('user');
        $perm = $this->db->table('permission_new')->where('nname', $user->role)->get()->getRow();

        if ($perm && $perm->bre != 1) {
            return redirect()->to('/');
        }

        if ($this->request->getMethod() === 'POST') {
            $this->db->table('tax')->where('id', $id)->update($this->request->getPost());
            return redirect()->to('/tax');
        }

        $tax = $this->db->table('tax')->where('id', $id)->get()->getRow();
        return $this->render('tax/edit', ['tax' => $tax, 'uri' => $uri]);
    }

    public function delete($id)
    {
        $this->db->table('tax')->where('id', $id)->update(['status' => 0]);
        return redirect()->to('/tax');
    }

    public function edit_taxtype($id = null)
    {
        $uri = service('uri');

        $user = $this->session->get('user');
        $perm = $this->db->table('permission_new')->where('nname', $user->role)->get()->getRow();


        if ($perm && $perm->bre != 1) {
            return redirect()->to('/');
        }

        if ($this->request->getMethod() === 'POST') {

            $this->db->table('taxtype')->where('id', $id)->update($this->request->getPost());
            return redirect()->to('/tax');
        }

        $type = $this->db->table('taxtype')->where('id', $id)->get()->getRow();
        return $this->render('tax/edit_taxtype', ['taxtype' => $type, 'uri' => $uri]);
    }

    public function delete_taxtype($id)
    {
        $this->db->table('taxtype')->where('id', $id)->delete();
        return redirect()->to('/tax');
    }
}
