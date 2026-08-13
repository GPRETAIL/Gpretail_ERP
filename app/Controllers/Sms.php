<?php

namespace App\Controllers;

use App\Models\CustomerModel;
use CodeIgniter\Controller;
use CodeIgniter\Database\BaseConnection;

class Sms extends BaseController
{
    protected $customerModel;
    protected $db;

    public function __construct()
    {
        helper(['url']);
        $this->customerModel = new CustomerModel();
        $this->db = \Config\Database::connect();

        if (!session()->get('user')) {
            return redirect()->to('/login')->send();
        }
    }

    public function index()
    {
        $data['customers'] = $this->customerModel->findAll();
        return $this->render('sms/view', $data);
    }

    public function birthday_date()
    {
        $setting = $this->db->table('settings')->where('id', 1)->get()->getRowArray();

        if ($setting && $setting['auto_birth'] == 1 && $setting['birth_anni_modul'] == 1) {
            $customers = $this->db->table('customers')->where('birthday_date', date('Y-m-d'))->get()->getResultArray();

            foreach ($customers as $customer) {
                $mobileNumber = $customer['phone'];
                if ($mobileNumber) {
                    $smsConfig = $this->db->table('smstabble')->where('si', 1)->get()->getRowArray();

                    $searchArray = [
                        "{bill_number}",
                        "{total_amount}",
                        "{emp_name}",
                        "{delivery_address}",
                        "{date}",
                        "{customer_name}",
                        "{birthday_date}",
                        "{anniversary_date}"
                    ];

                    $replaceArray = [
                        0,
                        0,
                        "Admin",
                        $customer['customeraddress'],
                        date("Y-m-d"),
                        $customer['name'],
                        $customer['birthday_date'],
                        $customer['anniversary_date']
                    ];

                    $message = str_replace($searchArray, $replaceArray, $setting['birthday_date']);
                    $url = "http://{$smsConfig['serurl']}/api/sendhttp.php?authkey={$smsConfig['authkey']}&mobiles=$mobileNumber&message=" . urlencode($message) . "&sender={$smsConfig['sendid']}&route={$smsConfig['routid']}";

                    $this->sendCurl($url);
                }
            }
        }
    }

    public function anniversary_date()
    {
        $setting = $this->db->table('settings')->where('id', 1)->get()->getRowArray();

        if ($setting && $setting['auto_anniver'] == 1 && $setting['birth_anni_modul'] == 1) {
            $customers = $this->db->table('customers')->where('anniversary_date', date('Y-m-d'))->get()->getResultArray();

            foreach ($customers as $customer) {
                $mobileNumber = $customer['phone'];
                if ($mobileNumber) {
                    $smsConfig = $this->db->table('smstabble')->where('si', 1)->get()->getRowArray();

                    $searchArray = [
                        "{bill_number}",
                        "{total_amount}",
                        "{emp_name}",
                        "{delivery_address}",
                        "{date}",
                        "{customer_name}",
                        "{birthday_date}",
                        "{anniversary_date}"
                    ];

                    $replaceArray = [
                        0,
                        0,
                        "Admin",
                        $customer['customeraddress'],
                        date("Y-m-d"),
                        $customer['name'],
                        $customer['birthday_date'],
                        $customer['anniversary_date']
                    ];

                    $message = str_replace($searchArray, $replaceArray, $setting['anniversary_date']);
                    $url = "http://{$smsConfig['serurl']}/api/sendhttp.php?authkey={$smsConfig['authkey']}&mobiles=$mobileNumber&message=" . urlencode($message) . "&sender={$smsConfig['sendid']}&route={$smsConfig['routid']}";

                    $this->sendCurl($url);
                }
            }
        }
    }

    private function sendCurl($url)
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}
