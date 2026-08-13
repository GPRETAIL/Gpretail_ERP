<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Config\Services;

class InvoicesPurnew extends Controller
{
    protected $invoice;
    protected $user;
    protected $setting;
    protected $register;

    public function __construct()
    {
        helper(['url', 'form']);
        $session = session();
        $this->invoice = model('App\\Models\\InvoiceModelPur'); // replace with actual namespace
        $this->user = $session->get('user_id') ? model('App\\Models\\UserModel')->find($session->get('user_id')) : false;
        $this->register = $session->get('register') ?? false;
        $lang = $session->get('lang') ?? 'english';
        Services::language()->setLocale($lang);
        $this->setting = model('App\\Models\\SettingModel')->find(1);
    }

    public function ajaxList()
    {
        if (!$this->request->isAJAX()) {
            return $this->response->setStatusCode(403)->setJSON(['status' => false, 'message' => 'Invalid request']);
        }

        $db = \Config\Database::connect();
        $start = $this->request->getPost('start');
        $draw = $this->request->getPost('draw');

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $permission = $db->table('permission_new')->where('nname', $this->user->role)->get()->getRowArray();

        $list = $this->invoice->getDatatables(); // assumes method exists in model
        $data = [];

        foreach ($list as $invoice) {
            $supplier = $db->table('suppliers')->where('id', $invoice['supplier_id'])->get()->getRowArray();
            $store = $db->table('stores')->where('id', $invoice['store_id'])->get()->getRowArray();
            $warehouse = $db->table('warehouses')->where('id', $invoice['warehouse_id'])->get()->getRowArray();
            $creator = $db->table('users')->where('id', $invoice['created_by'])->get()->getRowArray();

            $row = [
                date("d-m-Y", strtotime($invoice['purdat'])),
                sprintf("%05d", $invoice['id']),
                $invoice['cgst'] * 2,
                $invoice['total'],
                $supplier['name'] ?? '',
                $store['name'] ?? '',
                $warehouse['name'] ?? '',
                trim(($creator['firstname'] ?? '') . ' ' . ($creator['lastname'] ?? ''))
            ];

            $action = '<a class="btn btn-primary" href="javascript:void(0)" data-toggle="dropdown">
                        <i class="fa fa-cog fa-fw"></i>' . label("Action") . '</a>
                       <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown">
                           <span class="fa fa-caret-down"></span></a>
                       <ul class="dropdown-menu">
                           <li><a href="javascript:void(0)" onclick="showTicket(' . $invoice['id'] . ')"><i class="fa fa-ticket fa-fw"></i>' . label("View") . '</a></li>
                           <li><a href="javascript:void(0)" onclick="payaments(' . $invoice['id'] . ')"><i class="fa fa-ticket fa-fw"></i>' . label("Payements") . '</a></li>';

            if (!empty($permission['pue']) && $permission['pue'] == 1) {
                $action .= '<li><a href="' . base_url('purchase/edit/' . $invoice['id']) . '"><i class="fa fa-pencil"></i>' . label("Edit") . '</a></li>';
            }

            if (!empty($permission['pud']) && $permission['pud'] == 1) {
                $action .= '<li><a href="javascript:void(0)" onclick="delete_invoice(' . $invoice['id'] . ')"><i class="fa fa-trash"></i>' . label("Delete") . '</a></li>';
            }

            $action .= '</ul>';
            $row[] = $action;

            $data[] = $row;
        }

        $output = [
            'draw' => (int)$draw,
            'recordsTotal' => $this->invoice->countAll(),
            'recordsFiltered' => $this->invoice->countFiltered(),
            'data' => $data
        ];

        return $this->response->setJSON($output);
    }
}
