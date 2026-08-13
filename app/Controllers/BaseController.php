<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\SettingModel;
use App\Models\UserModel;
use Config\Database;
use CodeIgniter\Config\Services;
use CodeIgniter\API\ResponseTrait;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;
use CodeIgniter\HTTP\RedirectResponse;


class BaseController extends Controller
{
    protected $user = false;
    protected $user_id = null;
    protected $setting = null;
    protected $register = false;
    protected $view_data = [];
    protected $layout_view = 'application'; // layouts/application.php
    protected $content_view = '';
    protected $db;
    protected $uri;
    protected $store;

    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        parent::initController($request, $response, $logger);
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }
        // Do Not Edit This Line

        $this->db = Database::connect();

        $this->session = session();
        $this->store   = $this->session->get('store') ?? false;
        $this->uri = service('uri');
        $this->user_id = $this->session->get('user_id');
        $this->user = !empty($this->user_id) ? (new UserModel())->find($this->user_id) : false;
        $this->register = $this->session->get('register') ?? false;
        $this->role = $this->user->role;

        $settingModel = new SettingModel();
        $this->setting = $settingModel->find(1);

        $this->permission = $this->db->query("select * from permission_new where nname='" . $this->role . "'")->getRowArray();

        if ($this->setting) {
            $this->session->set('lang', $this->setting->language ?? 'english');
        }

        // Language loading
        $lang = $this->session->get('lang') ?? 'english';
        if (is_file(APPPATH . "Language/{$lang}/app.php")) {
            $this->lang = \Config\Services::language();
            $this->lang->setLocale($lang);
        }

        define('DECIMALS', $this->setting->decimals);
    }

    /**
     * Timezone list (like old tz_list)
     */
    public function tz_list()
    {
        $zones_array = [];
        $timestamp = time();
        foreach (timezone_identifiers_list() as $zone) {
            $zones_array[] = [
                'zone' => $zone,
                'diff_from_GMT' => 'UTC/GMT ' . date('P', $timestamp)
            ];
        }
        return $zones_array;
    }

    /**
     * Render the layout + content view (similar to old _output)
     */
    protected function render($content_view = '', $data = [])
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }

        $uri = service('uri');

        $rolr = $this->user->role;
        $kkar = $this->db->query("select * from permission_new where nname='" . $rolr . "'  ")->getRowArray();
        $sharedData = [
            'db'   => $this->db,
            'setting' => $this->setting,
            'user' => $this->user,
            'session' => session(),
            'kkar' => $kkar,
            'uri' => $uri,
            'permisson' => $this->permission,
            'response' => $this->response,
        ];

        $data2 = array_merge($sharedData, $data);
        $this->view_data = array_merge($this->view_data, $data2);

        if (!$content_view) {
            $router = service('router');
            $controller = strtolower(str_replace('App\\Controllers\\', '', $router->controllerName()));
            $method = $router->methodName();
            $content_view = "{$controller}/{$method}";
        }

        // $this->view_data['db'] = $this->db;
        $this->view_data['yield'] = view($content_view, $this->view_data);

        if ($this->layout_view) {
            return view('layouts/' . $this->layout_view, $this->view_data);
        } else {
            return $this->view_data['yield'];
        }
    }

    protected function initializeTimezone()
    {
        $db = \Config\Database::connect();
        $setting = $db->table('settings')->where('id', 1)->get()->getRow();

        if ($setting && !empty($setting->timezone)) {
            date_default_timezone_set($setting->timezone);
        } else {
            date_default_timezone_set('UTC'); // fallback
        }
    }

    protected function checkLogin()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }
    }
}
