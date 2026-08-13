<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\Database\RawSql;

class PaymentMode extends BaseController
{
    public function __construct()
    {
        helper(['url', 'form']);
        $this->db = \Config\Database::connect();
        $this->session = session();

        if (! $this->session->get('user')) {
            return redirect()->to('/login')->send();
        }
    }

    public function index()
    {
        return $this->render('payment_mode/view');
    }

    public function add()
    {
        $timezone = config('App')->appTimezone ?? 'Asia/Dhaka';
        date_default_timezone_set($timezone);
        $date = date("Y-m-d H:i:s");

        $name = $this->request->getPost('CategoryName');
        $validate = $this->request->getPost('validate_it');

        $exists = $this->db->table('payment_mode')
            ->where('name', $name)
            ->countAllResults();

        if ($exists == 0) {
            $this->db->table('payment_mode')->insert([
                'name' => $name,
                'created_at' => $date,
                'status' => 1,
                'validate_it' => $validate
            ]);
        }

        return redirect()->to('/paymentMode');
    }


    public function addajax()
    {
        $timezone = config('App')->appTimezone ?? 'Asia/Dhaka';
        date_default_timezone_set($timezone);
        $date = date("Y-m-d H:i:s");

        $name = $this->request->getPost('name');

        $this->db->table('payment_mode')->insert([
            'name' => $name,
            'created_at' => $date,
            'status' => 1
        ]);

        $options = '';
        $result = $this->db->table('payment_mode')->orderBy('name', 'ASC')->get()->getResultArray();

        foreach ($result as $row) {
            $options .= '<option value="' . esc($row['id']) . '">' . esc($row['name']) . '</option>';
        }

        return $this->response->setBody($options);
    }

    public function edit($id = null)
    {
        $user = $this->session->get('user');
        $role = $user->role ?? null;

        $permission = $this->db->table('permission_new')->where('nname', $role)->get()->getRowArray();
        if (($permission['bre'] ?? 0) != 1) {
            return redirect()->to('/');
        }

        if ($this->request->getMethod() === 'POST') {
            $name = $this->request->getPost('CategoryName');
            $validate = $this->request->getPost('validate_it');

            $exists = $this->db->table('payment_mode')
                ->where('id !=', $id)
                ->where('name', $name)
                ->countAllResults();

            if ($exists == 0) {
                $this->db->table('payment_mode')
                    ->where('id', $id)
                    ->update([
                        'name' => $name,
                        'validate_it' => $validate
                    ]);
            }

            return redirect()->to('/paymentMode');
        }

        $record = $this->db->table('payment_mode')->where('id', $id)->get()->getRowArray();
        if (!$record) {
            return redirect()->to('/paymentMode')->with('error', 'Record not found');
        }

        // Prefer using view() over custom render unless you have defined it
        return $this->render('payment_mode/edit', ['record' => $record]);
    }


    public function delete($id)
    {
        $exists = $this->db->table('payment_mode')
            ->where('id', $id)
            ->where('status', 1)
            ->countAllResults();

        if ($exists == 1) {
            // $this->db->table('payment_mode')
            //     ->where('id', $id)
            //     ->update(['status' => 0]);

            $this->db->table('payment_mode')
                ->where('id', $id)
                ->delete();
        }

        return redirect()->to('/paymentMode');
    }
}
