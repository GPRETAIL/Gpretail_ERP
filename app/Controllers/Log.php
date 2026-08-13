<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use Config\Database;

class Log extends BaseController
{
    protected $db;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->db = Database::connect();
    }

    public function index()
    {
        return view('log/index');
    }

    public function purchasetallylog()
    {
        $log = $this->db->table('tallylog')
                       ->where('xmml', 'purchase')
                       ->orderBy('id', 'desc')
                       ->get()
                       ->getResultArray();

        return view('log/purchasetallylog', ['log' => $log]);
    }

    public function updateall()
    {
        $purchaseLogs = $this->db->table('tallylog')
                                 ->where('xmml', 'purchase')
                                 ->orderBy('id', 'DESC')
                                 ->get()
                                 ->getResultArray();

        foreach ($purchaseLogs as $row) {
            $this->updatepurchasetally($row['id']);
        }

        $salesLogs = $this->db->table('tallylog')
                              ->where('xmml', 'sales')
                              ->orderBy('id', 'DESC')
                              ->get()
                              ->getResultArray();

        foreach ($salesLogs as $row) {
            $this->updatesalestally($row['id']);
        }
    }

    public function updatepurchasetally($id = null)
    {
        $id = $id ?? $this->request->getPost('id');

        $pur = $this->db->table('tallylog')
                        ->where('id', $id)
                        ->get()
                        ->getRowArray();

        if ($pur) {
            $this->db->table('tallylog')
                     ->where('id', $id)
                     ->update(['updated' => 1]);

            return $this->response->setBody($pur['xml']);
        }

        return $this->response->setStatusCode(404)->setBody('Not Found');
    }

    public function salestallylog()
    {
        $log = $this->db->table('tallylog')
                       ->where('xmml', 'sales')
                       ->orderBy('id', 'desc')
                       ->get()
                       ->getResultArray();

        return view('log/salestallylog', ['log' => $log]);
    }

    public function add()
    {
        return view('log/add');
    }

    public function edit($id = null)
    {
        if (!$id) {
            return redirect()->to('/log/salestallylog');
        }

        $log = $this->db->table('tallylog')
                        ->where('id', $id)
                        ->get()
                        ->getRowArray();

        return view('log/edit', ['log' => $log]);
    }

    public function delete($id = null)
    {
        if ($id) {
            $this->db->table('tallylog')
                     ->where('id', $id)
                     ->delete();
        }

        return redirect()->to(site_url('log/salestallylog'));
    }

    public function product()
    {
        $product = $this->db->table('product')
                            ->get()
                            ->getResultArray();

        return view('log/product', ['product' => $product]);
    }

    public function purdownloadxml($xmml = null)
    {
        $log = $this->db->table('tallylog')
                        ->where('xmml', $xmml)
                        ->get()
                        ->getResultArray();

        $output = '';
        foreach ($log as $row) {
            $output .= $row['xml'];
        }

        return $this->response
                    ->setHeader('Content-Type', 'text/xml')
                    ->setHeader('Content-Disposition', 'attachment; filename="purchase.xml"')
                    ->setBody($output);
    }

    public function updatesalestally($tg = null)
    {
        $log = $this->db->table('tallylog')
                        ->where('id', $tg)
                        ->get()
                        ->getRowArray();

        if ($log) {
            $this->db->table('tallylog')
                     ->where('id', $tg)
                     ->update(['updated' => 1]);

            return $this->response->setBody($log['xml']);
        }

        return $this->response->setStatusCode(404)->setBody('Not Found');
    }

    public function tax()
    {
        $tax = $this->db->table('tax')
                        ->get()
                        ->getResultArray();

        return view('log/tax', ['tax' => $tax]);
    }

    public function units()
    {
        $units = $this->db->table('units')
                          ->get()
                          ->getResultArray();

        return view('log/units', ['units' => $units]);
    }

    public function group()
    {
        $group = $this->db->table('group')
                          ->get()
                          ->getResultArray();

        return view('log/group', ['group' => $group]);
    }

    public function seldownloadxml($tgpp = null)
    {
        $log = $this->db->table('tallylog')
                        ->where('xmml', $tgpp)
                        ->get()
                        ->getResultArray();

        $output = '';
        foreach ($log as $row) {
            $output .= $row['xml'];
        }

        return $this->response
                    ->setHeader('Content-Type', 'text/xml')
                    ->setHeader('Content-Disposition', 'attachment; filename="sales.xml"')
                    ->setBody($output);
    }
}
