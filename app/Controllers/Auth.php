<?php

namespace App\Controllers;

use App\Models\UserModel;
use CodeIgniter\Controller;
use App\Models\StoreModel;
use App\Models\SettingModel;
use Config\Database;

class Auth extends Controller
{
    protected $userModel;
    protected $session;

    public function __construct()
    {
        $this->userModel = new UserModel();
        $this->session   = session();
        $this->db = Database::connect();

        $settingModel = new SettingModel();
        $this->setting = $settingModel->find(1);
    }

    // public function login()
    // {
    //     if ($this->request->getMethod() === 'POST') {
    //         $username = $this->request->getPost('username');
    //         $password = $this->request->getPost('password');
    //         $store_id = $this->request->getPost('store_id') ?? 0;

    //         $user = $this->userModel->validateLogin($username, $password);

    //         if ($user) {
    //             if ($user->role === 'admin') {
    //                 $store = $this->db->table('stores')->get()->getRow();
    //                 if ($store) {
    //                     $this->userModel->login($user->id);
    //                     return redirect()->to('pos/openregister/' . $store->id);
    //                 }
    //             } else {
    //                 if ((isset($store_id) && $store_id == $user->store_id) || (!isset($store_id) && $user->store_id)) {
    //                     $this->userModel->login($user->id);
    //                     return redirect()->to('pos/openregister/' . $user->store_id);
    //                 } else {
    //                     return view('auth/login', [
    //                         'username' => $username,
    //                         'message' => "YOU DON'T HAVE ACCESS TO `" . $this->getStoreName($store_id) . "` STORE"
    //                     ]);
    //                 }
    //             }
    //         } else {
    //             $this->session->remove('user_id');
    //             return view('layouts/login', [
    //                 'username' => $username,
    //                 // 'message' => lang('Auth.loginIncorrect'),
    //                 'message' => lang('Login Incorrect!'),
    //                 'db' => $this->db,
    //                 'setting' => $this->setting
    //             ]);
    //         }
    //     }

    //     return view('layouts/login', ['db' => $this->db, 'setting' => $this->setting]);
    //     // return $this->render('layouts/login');
    // }

    public function login()
    {
        $StoreModel = new StoreModel();
        $stores = $StoreModel->findAll();

        $request = \Config\Services::request(); // ✅ Use request service

        if ($request->getMethod() === 'POST') {
            $username  = $request->getPost('username');
            $password  = $request->getPost('password');
            $store_id  = $request->getPost('store_id') ?? 0;

            $user = $this->userModel->validateLogin($username, $password);

            if ($user) {
                if ($user->role === 'admin') {
                    $store = $StoreModel->get()->getRow();
                    if ($store_id == 0) {
                        $this->userModel->login($user->id);
                        return redirect()->to('pos/openregister/' . $store->id);
                    } else {
                        $this->userModel->login($user->id);
                        return redirect()->to('pos/openregister/' . $store_id);
                    }
                } else {
                    if (($store_id && $store_id == $user->store_id) || (!$store_id && $user->store_id)) {
                        $this->userModel->login($user->id);
                        return redirect()->to('pos/openregister/' . $user->store_id);
                    } else {
                        return view('layouts/login', [
                            'username' => $username,
                            'message'  => "YOU DONT HAVE ACCESS TO `" . $this->getStoreName($store_id) . "` STORE",
                            'db'       => $this->db,
                            'setting'  => $this->setting,
                            'stores' => $stores,
                            'StoreModel' => $StoreModel,
                        ]);
                    }
                }
            } else {
                $this->session->remove('user_id');
                return view('layouts/login', [
                    'username' => $username,
                    'message'  => lang('Login Incorrect!'),
                    'db'       => $this->db,
                    'setting'  => $this->setting,
                    'stores' => $stores,
                    'StoreModel' => $StoreModel,
                ]);
            }
        }

        return view('layouts/login', ['db' => $this->db, 'setting' => $this->setting]);
    }


    public function logout()
    {
        $session = \Config\Services::session();
        // Simplified logout without CURL hacks
        $session->destroy();
        return redirect()->to('login')->with('message', 'Logged out successfully.');
    }

    public function logsess()
    {
        // Implement Database Backup Here
        // Recommendation: Use CI4 Database Utilities
        return $this->backupDatabase('log', 3);
    }

    public function logsesslocal()
    {
        return $this->backupDatabase('local', 4);
    }


    public function logoutnext()
    {
        $session = session(); // ✅ CI4 session service

        if (!$session->has('user_id')) {
            return redirect()->to('login');
        }

        $userId = $session->get('user_id');

        // Update user status in DB
        $this->userModel->update($userId, [
            'last_active' => date('Y-m-d H:i:s'),
            'loginstatus' => 0,
        ]);

        // Optional: if you have a logout() method
        if (method_exists($this->userModel, 'logout')) {
            $this->userModel->logout();
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            $session->destroy();
        }



        return redirect()->to('login');
    }


    public function logouts()
    {
        return $this->logoutnext();
    }

    public static function alreadyloged()
    {
        return redirect()->to('login');
    }

    // Helper function
    private function getStoreName($store_id)
    {
        $store = db_connect()->table('stores')->where('id', $store_id)->get()->getRow();
        return $store ? $store->name : 'Unknown';
    }

    private function backupDatabase($type, $logType)
    {
        $db = db_connect();
        $forge = \Config\Services::forge();
        $backupPath = WRITEPATH . 'backups/' . date('Y-m-d');

        if (!is_dir($backupPath)) {
            mkdir($backupPath, 0777, true);
        }

        $filename = $backupPath . '/backup_' . date('H') . '.sql';

        $prefs = [
            'format' => 'txt',
            'filename' => $filename,
        ];

        helper('filesystem');
        write_file($filename, $db->backup($prefs));

        // Log backup
        $db->table('logfiles')->insert([
            'type' => $logType,
            'ttime' => date('Y-m-d H:i:s')
        ]);

        return $this->response->setJSON(['status' => 'success', 'file' => $filename]);
    }
}
