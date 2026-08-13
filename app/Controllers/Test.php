<?php

namespace App\Controllers;

use App\Models\UserModel;
use CodeIgniter\Controller;

class Test extends Controller
{
    public function index()
    {
        $userModel = new UserModel();
        $user = $userModel->find(1);

        echo '<pre>';
        print_r($user);
        echo '</pre>';
    }
}
