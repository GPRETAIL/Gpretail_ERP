<?php

namespace App\Controllers;

use App\Models\WarehouseModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use App\Models\SettingModel;
use CodeIgniter\Controller;

class Settings extends BaseController
{
    protected $session;
    protected $db;

    public function __construct()
    {
        $this->session = session();
        $this->db = \Config\Database::connect();

        if (!$this->session->get('user')) {
            return redirect()->to('/login')->send();
        }

        if ($this->session->get('user')->role !== 'admin') {
            return redirect()->to('/');
        }
    }

    public function index()
    {
        $warehouseModel = new \App\Models\WarehouseModel();
        $storeModel = new \App\Models\StoreModel();
        $userModel = new \App\Models\UserModel();

        $data = [
            'warehouses' => $warehouseModel->findAll(),
            'Stores'     => $storeModel->findAll(),
            'Users'      => $userModel->findAll(),
            'Timezones'  => $this->tz_list(),
        ];

        return $this->render('setting/setting', $data);
    }


    public function deleteUser($id)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('sales');

        // Check if user has sales
        $ol = $builder->where('salesperson', $id)->countAllResults();

        if ($ol == 0) {
            // Delete user if no related sales
            $userModel = new \App\Models\UserModel();
            $userModel->delete($id);
        }

        return redirect()->to('/settings?tab=users');
    }

    public function addUser()
    {
        // Set timezone based on settings table
        $setting = $this->db->table('settings')->where('id', 1)->get()->getRow();
        date_default_timezone_set($setting->timezone);
        $date = date('Y-m-d H:i:s');

        $avatar = null;

        $file = $this->request->getFile('userfile'); // Adjust field name if needed

        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'files/Avatars/', $newName);
            $avatar = $newName;
        }

        $data = $this->request->getPost();
        unset($data['PasswordRepeat']);

        if (!empty($data['password'])) {
            $data['hashed_password'] = _hash($data['password']); // Make sure _hash() is defined
        }
        unset($data['password']);

        $data['created_at'] = $date;
        if ($avatar) {
            $data['avatar'] = $avatar;
        }

        $userModel = new UserModel();
        $userModel->insert($data);

        return redirect()->to('/settings?tab=users');
    }
    public function editprint($id)
    {
        return $this->render('setting/modifyprint');
    }
    public function updateprint($id)
    {
        $data = $this->request->getPost();

        $this->db->table('print_setup')
            ->where('dp_id', $id)
            ->update($data);

        return redirect()->to("settings/editprint/" . $id);
    }
    public function editUser($id = null)
    {
        // Set timezone from settings
        $setting = $this->db->table('settings')->where('id', 1)->get()->getRow();
        date_default_timezone_set($setting->timezone);
        $date = date('Y-m-d H:i:s');

        $userModel = new UserModel();

        if ($this->request->getPost()) {
            $user = $userModel->find($id);
            $data = $this->request->getPost();
            $file = $this->request->getFile('userfile'); // Adjust field name if different

            // Handle avatar upload
            if ($file && $file->isValid() && !$file->hasMoved()) {
                $newName = $file->getRandomName();
                $file->move(FCPATH . 'files/Avatars/', $newName);

                // Remove old avatar
                if ($user && !empty($user->avatar)) {
                    @unlink(FCPATH . 'files/Avatars/' . $user->avatar);
                }

                $data['avatar'] = $newName;
            }

            // Clean up and hash password
            unset($data['PasswordRepeat']);
            if (!empty($data['password'])) {
                $data['hashed_password'] = _hash($data['password']); // Ensure _hash is defined
            }
            unset($data['password']);

            $data['created_at'] = $date;

            $userModel->update($id, $data);

            return redirect()->to('/settings?tab=users');
        } else {
            $user = $userModel->find($id);
            $this->view_data['user'] = $user;
            return $this->render('setting/modifyUser', ['user' => $user]);
        }
    }
    public function updateSettings()
    {
        $settingModel = new \App\Models\SettingModel();
        $db = \Config\Database::connect();

        $postData = $this->request->getPost();
        // dd($postData);
        // Handle themblock toggle

        // if ($postData['pport'] == 49825) {
        //     $db->table('settings')->where('id', 1)->update(['themblock' => 1, 'sales_type' => 1]);
        // } elseif ($postData['pport'] == 49826) {
        //     $db->table('settings')->where('id', 1)->update(['themblock' => 1, 'sales_type' => 1]);
        // }
        // if (isset($postData['pport']) && $postData['pport'] == 49825) {
        //     $db->table('settings')->where('id', 1)->update(['themblock' => 1]);
        // } elseif (isset($postData['pport']) && $postData['pport'] == 49826) {
        //     $db->table('settings')->where('id', 1)->update(['themblock' => 0]);
        // }


        $postData['pport'] = $postData['pport'];

        // Handle file upload
        $file = $this->request->getFile('userfile'); // ensure input name matches in the form

        $setting = $settingModel->find(1);
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'files/Setting/', $newName);

            // Remove old logo if exists
            if ($setting && !empty($setting['logo']) && file_exists(FCPATH . 'files/Setting/' . $setting['logo'])) {
                @unlink(FCPATH . 'files/Setting/' . $setting['logo']);
            }

            $postData['logo'] = $newName;
        }

        // Update settings
        $settingModel->update(1, $postData);

        return redirect()->to('/settings?tab=setting');
    }


    // public function updatepermiss()
    // {
    //     $request = $this->request;
    //     // dd($request->getPost());

    //     $db = \Config\Database::connect();

    //     $role = $request->getPost('role');

    //     $data = [
    //         // Sales
    //         'ssv' => !empty($request->getPost('ssv')) ? $request->getPost('ssv') : 0,
    //         'ssa' => !empty($request->getPost('ssa')) ? $request->getPost('ssa') : 0,
    //         'sse' => !empty($request->getPost('sse')) ? $request->getPost('sse') : 0,
    //         'ssd' => !empty($request->getPost('ssd')) ? $request->getPost('ssd') : 0,

    //         // Quotation
    //         'qtv' => !empty($request->getPost('qtv')) ? $request->getPost('qtv') : 0,
    //         'qta' => !empty($request->getPost('qta')) ? $request->getPost('qta') : 0,
    //         'qte' => !empty($request->getPost('qte')) ? $request->getPost('qte') : 0,
    //         'qtd' => !empty($request->getPost('qtd')) ? $request->getPost('qtd') : 0,

    //         // Purchase
    //         'puv' => !empty($request->getPost('puv')) ? $request->getPost('puv') : 0,
    //         'pua' => !empty($request->getPost('pua')) ? $request->getPost('pua') : 0,
    //         'pue' => !empty($request->getPost('pue')) ? $request->getPost('pue') : 0,
    //         'pud' => !empty($request->getPost('pud')) ? $request->getPost('pud') : 0,

    //         // Expense Type
    //         'excv' => !empty($request->getPost('excv')) ? $request->getPost('excv') : 0,
    //         'exca' => !empty($request->getPost('exca')) ? $request->getPost('exca') : 0,
    //         'exce' => !empty($request->getPost('exce')) ? $request->getPost('exce') : 0,
    //         'excd' => !empty($request->getPost('excd')) ? $request->getPost('excd') : 0,

    //         // Expense
    //         'exxv' => !empty($request->getPost('exxv')) ? $request->getPost('exxv') : 0,
    //         'exxa' => !empty($request->getPost('exxa')) ? $request->getPost('exxa') : 0,
    //         'exxe' => !empty($request->getPost('exxe')) ? $request->getPost('exxe') : 0,
    //         'exxd' => !empty($request->getPost('exxd')) ? $request->getPost('exxd') : 0,

    //         // Combo Offers
    //         'comv' => !empty($request->getPost('comv')) ? $request->getPost('comv') : 0,
    //         'coma' => !empty($request->getPost('coma')) ? $request->getPost('coma') : 0,
    //         'comd' => !empty($request->getPost('comd')) ? $request->getPost('comd') : 0,

    //         // Offers
    //         'offv' => !empty($request->getPost('offv')) ? $request->getPost('offv') : 0,
    //         'offa' => !empty($request->getPost('offa')) ? $request->getPost('offa') : 0,
    //         'offe' => !empty($request->getPost('offe')) ? $request->getPost('offe') : 0,
    //         // 'offd' => !empty($request->getPost('offd')) ? $request->getPost('offd') : 0,

    //         // Brand
    //         'brv' => !empty($request->getPost('brv')) ? $request->getPost('brv') : 0,
    //         'bra' => !empty($request->getPost('bra')) ? $request->getPost('bra') : 0,
    //         'bre' => !empty($request->getPost('bre')) ? $request->getPost('bre') : 0,
    //         'brd' => !empty($request->getPost('brd')) ? $request->getPost('brd') : 0,

    //         // Category
    //         'caav' => !empty($request->getPost('caav')) ? $request->getPost('caav') : 0,
    //         'caaa' => !empty($request->getPost('caaa')) ? $request->getPost('caaa') : 0,
    //         'caae' => !empty($request->getPost('caae')) ? $request->getPost('caae') : 0,
    //         'caad' => !empty($request->getPost('caad')) ? $request->getPost('caad') : 0,

    //         // Tax
    //         'taxv' => !empty($request->getPost('taxv')) ? $request->getPost('taxv') : 0,
    //         'taxa' => !empty($request->getPost('taxa')) ? $request->getPost('taxa') : 0,
    //         'taxe' => !empty($request->getPost('taxe')) ? $request->getPost('taxe') : 0,
    //         'taxd' => !empty($request->getPost('taxd')) ? $request->getPost('taxd') : 0,

    //         // Customer
    //         'cuv' => !empty($request->getPost('cuv')) ? $request->getPost('cuv') : 0,
    //         'cua' => !empty($request->getPost('cua')) ? $request->getPost('cua') : 0,
    //         'cue' => !empty($request->getPost('cue')) ? $request->getPost('cue') : 0,
    //         'cud' => !empty($request->getPost('cud')) ? $request->getPost('cud') : 0,

    //         // Supplier
    //         'suv' => !empty($request->getPost('suv')) ? $request->getPost('suv') : 0,
    //         'sua' => !empty($request->getPost('sua')) ? $request->getPost('sua') : 0,
    //         'sue' => !empty($request->getPost('sue')) ? $request->getPost('sue') : 0,
    //         'sud' => !empty($request->getPost('sud')) ? $request->getPost('sud') : 0,

    //         // Product
    //         'prv' => !empty($request->getPost('prv')) ? $request->getPost('prv') : 0,
    //         'pra' => !empty($request->getPost('pra')) ? $request->getPost('pra') : 0,
    //         'pre' => !empty($request->getPost('pre')) ? $request->getPost('pre') : 0,
    //         'prd' => !empty($request->getPost('prd')) ? $request->getPost('prd') : 0,

    //         // Initial Stock
    //         'prinv' => !empty($request->getPost('prinv')) ? $request->getPost('prinv') : 0,
    //         // 'prina' => !empty($request->getPost('prina')) ? $request->getPost('prina') : 0,
    //         // 'prine' => !empty($request->getPost('prine')) ? $request->getPost('prine') : 0,
    //         // 'prind' => !empty($request->getPost('prind')) ? $request->getPost('prind') : 0,

    //         // Price Method
    //         'promov' => !empty($request->getPost('promov')) ? $request->getPost('promov') : 0,
    //         // 'promoa' => !empty($request->getPost('promoa')) ? $request->getPost('promoa') : 0,
    //         // 'promoe' => !empty($request->getPost('promoe')) ? $request->getPost('promoe') : 0,
    //         // 'promod' => !empty($request->getPost('promod')) ? $request->getPost('promod') : 0,

    //         // Price Price
    //         // 'proprv' => !empty($request->getPost('proprv')) ? $request->getPost('proprv') : 0,
    //         // 'propra' => !empty($request->getPost('propra')) ? $request->getPost('propra') : 0,
    //         // 'propre' => !empty($request->getPost('propre')) ? $request->getPost('propre') : 0,
    //         // 'proprd' => !empty($request->getPost('proprd')) ? $request->getPost('proprd') : 0,

    //         // Price MRP
    //         // 'promrpv' => !empty($request->getPost('promrpv')) ? $request->getPost('promrpv') : 0,
    //         // 'promrpa' => !empty($request->getPost('promrpa')) ? $request->getPost('promrpa') : 0,
    //         // 'promrpe' => !empty($request->getPost('promrpe')) ? $request->getPost('promrpe') : 0,
    //         // 'promrpd' => !empty($request->getPost('promrpd')) ? $request->getPost('promrpd') : 0,

    //         // PaymentMethod
    //         'payv' => !empty($request->getPost('payv')) ? $request->getPost('payv') : 0,
    //         'paya' => !empty($request->getPost('paya')) ? $request->getPost('paya') : 0,
    //         'paye' => !empty($request->getPost('paye')) ? $request->getPost('paye') : 0,
    //         'payd' => !empty($request->getPost('payd')) ? $request->getPost('payd') : 0,

    //         // Roles
    //         'rolesv' => !empty($request->getPost('rolesv')) ? $request->getPost('rolesv') : 0,
    //         'rolesa' => !empty($request->getPost('rolesa')) ? $request->getPost('rolesa') : 0,
    //         'rolese' => !empty($request->getPost('rolese')) ? $request->getPost('rolese') : 0,
    //         // 'rolesd' => !empty($request->getPost('rolesd')) ? $request->getPost('rolesd') : 0,

    //         // Physical Stock
    //         'phv' => !empty($request->getPost('phv')) ? $request->getPost('phv') : 0,
    //         'pha' => !empty($request->getPost('pha')) ? $request->getPost('pha') : 0,
    //         'phe' => !empty($request->getPost('phe')) ? $request->getPost('phe') : 0,
    //         'phd' => !empty($request->getPost('phd')) ? $request->getPost('phd') : 0,

    //         // GoodsOut
    //         'gov' => !empty($request->getPost('gov')) ? $request->getPost('gov') : 0,
    //         'goa' => !empty($request->getPost('goa')) ? $request->getPost('goa') : 0,
    //         'goe' => !empty($request->getPost('goe')) ? $request->getPost('goe') : 0,
    //         'god' => !empty($request->getPost('god')) ? $request->getPost('god') : 0,

    //         // Sales Return
    //         'salretv' => !empty($request->getPost('salretv')) ? $request->getPost('salretv') : 0,

    //         'salreta' => !empty($request->getPost('salreta')) ? $request->getPost('salreta') : 0,
    //         'salrete' => !empty($request->getPost('salrete')) ? $request->getPost('salrete') : 0,
    //         'salretd' => !empty($request->getPost('salretd')) ? $request->getPost('salretd') : 0,

    //         // Reports
    //         'rev' => !empty($request->getPost('rev')) ? $request->getPost('rev') : 0,

    //         // 'rea' => !empty($request->getPost('rea')) ? $request->getPost('rea') : 0,
    //         // 'ree' => !empty($request->getPost('ree')) ? $request->getPost('ree') : 0,
    //         // 'red' => !empty($request->getPost('red')) ? $request->getPost('red') : 0,

    //         // StockTransfer
    //         'stv' => !empty($request->getPost('stv')) ? $request->getPost('stv') : 0,
    //         'sta' => !empty($request->getPost('sta')) ? $request->getPost('sta') : 0,

    //         // 'ste' => !empty($request->getPost('ste')) ? $request->getPost('ste') : 0,
    //         // 'std' => !empty($request->getPost('std')) ? $request->getPost('std') : 0,
    //     ];





    //     $db->table('permission_new')->where('nname', $role)->update($data);

    //     return redirect()->to('/settings?tab=setting');
    // }

    public function updatepermiss()
    {
        $db = \Config\Database::connect();
        $request = \Config\Services::request();

        $role = $request->getPost('role');

        $fields = [
            'tallypur',
            'tallypurlog',
            'tallysale',
            'tallysalelog',
            'tallyupallv',
            'qtv',
            'prinv',
            'promov',
            'proprp',
            'promrpp',
            'rolesa',
            'rolesv',
            'rolese',
            'qta',
            'qte',
            'qtd',
            'comv',
            'coma',
            'comd',
            'offv',
            'offa',
            'offe',
            'taxv',
            'taxa',
            'taxe',
            'taxd',
            'ssv',
            'ssa',
            'sse',
            'ssd',
            'puv',
            'pua',
            'pue',
            'pud',
            'prv',
            'pra',
            'pre',
            'prd',
            'cuv',
            'cua',
            'cue',
            'cud',
            'suv',
            'sua',
            'sue',
            'sud',
            'caav',
            'caaa',
            'caae',
            'caad',
            'brv',
            'bra',
            'bre',
            'brd',
            'excv',
            'exca',
            'exce',
            'excd',
            'exxv',
            'exxa',
            'exxe',
            'exxd',
            'phv',
            'pha',
            'phe',
            'phd',
            'gov',
            'goa',
            'goe',
            'god',
            'payv',
            'paya',
            'paye',
            'payd',
            'prdenv',
            'prdena',
            'prdene',
            'prdend',
            'stv',
            'rev',
            'salretv'
        ];

        $data = [];
        foreach ($fields as $field) {
            $data[$field] = $request->getPost($field) ?? '';
        }

        $db->table('permission_new')
            ->where('nname', $role)
            ->update($data);

        return redirect()->to('/settings?tab=setting');
    }


    public function updategsttax()
    {
        $post = $this->request->getPost();

        $discPro = ($post['prowise'] ?? 0) == 1 ? 1 : 0;
        $discAll = $discPro == 1 ? 0 : 1;

        $updateData = [
            'gst_tax'          => $post['gsttax'] ?? '',
            'keyboard'         => $post['ttouch'] ?? '',
            'destpp'           => $post['destpp'] ?? '',
            'smsset'           => $post['smsset'] ?? '',
            'igsttax'          => $post['igsttax'] ?? '',
            'ddsp'             => $post['ddsp'] ?? '',
            'warstore'         => $post['warstore'] ?? '',
            'ddspct'           => $post['ddspct'] ?? '',
            'cat_pur'          => $post['cat_pur'] ?? '',
            'editpro'          => $post['editpro'] ?? '',
            'mlp_rss'          => $post['mlp_rss'] ?? '',
            'combo'            => $post['combo'] ?? '',
            'ooffr'            => $post['ooffr'] ?? '',
            'expi'             => $post['expi'] ?? '',
            'ct_mgt'           => $post['ct_mgt'] ?? '',
            'backtimfrecon'    => $post['backtimfrecon'] ?? '',
            'backsorno'        => $post['backsorno'] ?? '',
            'backuplogout'     => $post['backuplogout'] ?? '',
            'taxsho'           => $post['taxsho'] ?? '',
            'decln'            => $post['decln'] ?? '',
            'maininv'          => $post['maininv'] ?? '',
            'auto_birth'       => $post['auto_birth'] ?? '',
            'auto_anniver'     => $post['auto_anniver'] ?? '',
            'ddirectprint'     => $post['ddirectprint'] ?? '',
            'send_sales_email' => $post['send_sales_email'] ?? '',
            'disc_pro'         => $discPro,
            'disc_all'         => $discAll,
        ];

        $this->db->table('settings')->where('id', 1)->update($updateData);

        return redirect()->to('/settings?tab=setting');
    }
    public function updatreportts()
    {
        $post = $this->request->getPost();

        $data = [
            'r1'  => $post['r1'] ?? '',
            'r2'  => $post['r2'] ?? '',
            'r3'  => $post['r3'] ?? '',
            'r4'  => $post['r4'] ?? '',
            'r5'  => $post['r5'] ?? '',
            'r6'  => $post['r6'] ?? '',
            'r7'  => $post['r7'] ?? '',
            'r8'  => $post['r8'] ?? '',
            'r9'  => $post['r9'] ?? '',
            'r10' => $post['r10'] ?? '',
            'r11' => $post['r11'] ?? '',
            'r12' => $post['r12'] ?? '',
            'r13' => $post['r13'] ?? '',
            'r14' => $post['r14'] ?? '',
            'r15' => $post['r15'] ?? '',
            'r16' => $post['r16'] ?? '',
            'r17' => $post['r17'] ?? '',
        ];

        $this->db->table('report_stting')->where('rsi', 1)->update($data);

        return redirect()->to('/settings?tab=setting');
    }

    public function updateSalesType()
    {
        $keyID = $this->request->getPost('keyCode');
        // if ($keyID == 113) { // F2 invoice only
        //     $themblock = 0;
        //     $sales_type = 0;
        // } elseif ($keyID == 115) { // F4 non-invoice only
        //     $sales_type = 1;
        //     $themblock = 1;
        // } elseif ($keyID == 119) { // F8 all
        //     $sales_type = 2;
        //     $themblock = 1;
        // }

        if ($keyID == 113) { // F2 invoice only sales
            $themblock = 0;
            $sales_type = 0;
            $this->db->table('settings')->update(['sales_type' => $sales_type, 'themblock' => $themblock]);
        } elseif ($keyID == 115) { // F4 non-invoice only color dsales
            $sales_type = 1;
            $themblock = 1;
            $this->db->table('settings')->update(['sales_type' => $sales_type, 'themblock' => $themblock]);
        } elseif ($keyID == 119) { // F8 all
            $sales_type = 2;
            // $themblock = 1;
            $this->db->table('settings')->update(['sales_type' => $sales_type]);
        }

        return $this->response->setJSON(['success' => true]);
    }
}
