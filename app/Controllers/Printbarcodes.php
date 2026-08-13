<?php

namespace App\Controllers;


use CodeIgniter\Controller;
use Config\Services;
use Config\Database;


use App\Libraries\Ciqrcode;
use Laminas\Barcode\Barcode;

class Printbarcodes extends BaseController
{
    protected $db;
    protected $session;

    public function __construct()
    {
        $this->db = Database::connect();
        $this->session = session();

        // Redirect if user is not logged in
        if (!$this->session->get('user')) {
            header('Location: ' . site_url('login'));
            exit;
        }
    }

    public function index()
    {
        return view('printlogin');
    }

    public function productlabel($code = '', $rrow = '', $lablee = '')
    {
        // Load QR Code library if you're using a package like Endroid or others
        // Make sure you register the library correctly or use a service class

        return view('layouts/productlabel', [
            'code' => $code,
            'rrow' => $rrow,
            'lablee' => $lablee,
            'uri' => $this->uri,
            'db' => $this->db,
            'setting' => $this->setting,
            'session' => $this->session,
            'ciqrcode' => new Ciqrcode()
        ]);
    }

    public function purchaselabel($code = '', $rrow = '', $lablee = '')
    {
        return view('layouts/purchaselabel', [
            'code' => $code,
            'rrow' => $rrow,
            'lablee' => $lablee,
            'db'    => $this->db,
            'settings' => $this->setting,
            'session'  => session(),
            'ciqrcode' => new Ciqrcode()
        ]);
    }

    public function PurchaseLabelPrint($id)
    {
        $db = \Config\Database::connect();

        $items = $db->table('purchase_items pi')
            ->select('pi.product_id, pi.qt, p.name, p.code')
            ->join('products p', 'p.id = pi.product_id', 'left')
            ->where('pi.purchase_id', $id)
            ->get()
            ->getResultArray();

        $arrayidd = [];
        $arrayqtt = [];
        foreach ($items as $item):
            $arrayidd[]  = $item['code'];
            $arrayqtt[]  = $item['qt'];
        endforeach;
        $_POST['arrayidd'] = $arrayidd;
        $_POST['arrayqtt'] = $arrayqtt;
        return view('layouts/purchaselabel', [
            // 'code' => $code,
            // 'rrow' => $rrow,
            // 'lablee' => $lablee,
            'db'    => $this->db,
            'settings' => $this->setting,
            'session'  => session(),
            'ciqrcode' => new Ciqrcode()
        ]);
    }
}
