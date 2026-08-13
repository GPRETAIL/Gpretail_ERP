<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Config\Database;

class Api_new extends BaseController
{
    protected $db;
    protected $setting;

    public function __construct()
    {
        $this->db = Database::connect();

        // Optional: Replace with your own setting retrieval method
        $this->setting = model('SettingModel')->find(1); // Or use session/config

        // Check user session manually if needed
        if (! session('user_id')) {
            return redirect()->to('/login')->send();
        }
    }

    public function add()
    {
        date_default_timezone_set($this->setting->timezone ?? 'Asia/Dhaka');
        $date = date("Y-m-d H:i:s");

        $ss_url = $this->request->getPost('ss_url');

        $this->db->table('smstabble_new')->insert([
            'ss_url'    => $ss_url,
            'ss_status' => 0,
            'ss_date'   => $date
        ]);

        return redirect()->to('/settings?tab=setting');
    }

    public function edit($id = null)
    {
        if ($this->request->getMethod() === 'POST') {
            $ss_url = $this->request->getPost('ss_url');

            $this->db->table('smstabble_new')
                ->where('ss', $id)
                ->update(['ss_url' => $ss_url]);

            return redirect()->to('/settings?tab=setting');
        }

        return $this->render('setting/modifyapi', ['ss' => $id]);
    }

    public function deactive($id = null)
    {
        $this->db->table('smstabble_new')->where('ss', $id)->update(['ss_status' => 0]);
        return redirect()->to('/settings?tab=setting');
    }

    public function active($id = null)
    {
        // Reset all to 0
        $this->db->table('smstabble_new')->update(['ss_status' => 0]);

        // Set selected to 1
        $this->db->table('smstabble_new')->where('ss', $id)->update(['ss_status' => 1]);

        return redirect()->to('/settings?tab=setting');
    }

    public function delete($id = null)
    {
        $this->db->table('smstabble_new')->where('ss', $id)->delete();
        return redirect()->to('/settings?tab=setting');
    }
}
