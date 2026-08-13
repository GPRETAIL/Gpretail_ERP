<?php

namespace App\Controllers;

use App\Models\SettingModel;
use App\Models\PosaleModel;
use App\Models\HoldModel;
use App\Models\SaleModel;
use App\Models\DsaleModel;
use App\Models\DsaleItemModel;
use App\Models\SaleItemModel;
use App\Models\CustomerModel;
use App\Models\RegisterModel;
use App\Models\StockModel;
use App\Models\UserModel;
use App\Models\PosaleqModel;
use App\Models\ProductModel;
use App\Models\StoreModel;
use CodeIgniter\HTTP\ResponseInterface;
use Zend\Barcode\Barcode;
use App\Controllers\BaseController; // important!
use App\Libraries\Pdf;

class Pos extends BaseController
{
    protected $setting;
    protected $register;
    protected $store;

    public function __construct()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }

        $this->setting = (new SettingModel())->find(1);


        $this->register = session('register');
        $this->store = session()->get('store');
        $this->PosaleModel = new PosaleModel();
        $this->ProductModel = new ProductModel();
        $this->RegisterModel = new RegisterModel();
        $this->StockModel = new StockModel();
        $this->HoldModel = new HoldModel();
        $this->SaleItemModel = new SaleItemModel();
        $this->UserModel = new UserModel();
        $this->PosaleqModel = new PosaleqModel();
        $this->StoreModel = new StoreModel();
        $this->SaleModel = new SaleModel();
        $this->DsaleItemModel = new DsaleItemModel();
        $this->CustomerModel = new CustomerModel();
        $this->DsaleModel = new DsaleModel();
        date_default_timezone_set('Asia/Kolkata');
    }
    public function getCustomerCredit($customerId)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('sales');

        $session = session();

        $builder->select('SUM(avail_point) as avlppit');
        $builder->where('client_id', $customerId);
        $builder->where("attime >", "DATE_SUB(NOW(), INTERVAL '{$this->setting->ct_month}' MONTH)", false);
        $result = $builder->get()->getRowArray();

        $insertId = 0;
        $amount = 0;

        if ($result && $result['avlppit'] >= $this->setting->min_ponint) {
            $amount = $result['avlppit'];

            $data = [
                'rr_custid' => $customerId,
                'rr_usedpoint' => $amount,
                'rr_datetime' => date("Y-m-d H:i:s"),
                'rr_created' => $session->get('user_id'),
                'rr_soldid' => 0
            ];

            $db->table('redeem_tab')->insert($data);
            $insertId = $db->insertID();
        }

        echo "{$insertId}~{$amount}~{$amount}";
        return;
    }
    public function load_pogoodpurrdel_offer()
    {
        $db = \Config\Database::connect();
        $session = session();

        $data = '';
        $stack = [];
        $count = 0;

        $rid = $this->request->getPost('rid');
        $userId = $session->get('user_id');

        // Delete existing offers
        $db->table('possalprs_offers')
            ->where('userid', $userId)
            ->where('ats', $rid)
            ->delete();

        // Get GST setting
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstEnabled = $settings['gst_tax'] ?? 0;

        // Get remaining offers
        $offers = $db->table('possalprs_offers')
            ->where('userid', $userId)
            ->get()
            ->getResultObject();

        foreach ($offers as $offer) {
            $count = $offer->ats;
            $stack[] = $count;

            $row = '<tr id="add' . $count . '"> 
            <td style="padding:1px;"><div class="form-group">
                <input readonly class="form-control" type="text" value="' . esc($offer->prname) . '" id="countryname_' . $count . '" name="countryname[]"/>
                <input type="hidden" class="form-control" value="' . esc($offer->producnum) . '" id="statediv_' . $count . '" name="statediv[]" />
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cosst_' . $count . '" name="cosst[]" value="' . esc($offer->purrs) . '" >
            </div></td>';

            if ($gstEnabled) {
                $row .= '<td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($offer->cgstt) . '" placeholder="Cgst">
                <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($offer->tax_methord) . '" placeholder="Tax Method">
            </div></td>
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($offer->sgst) . '" placeholder="Sgst">';
            } else {
                $row .= '<input type="hidden" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($offer->cgstt) . '" placeholder="Cgst">
            <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($offer->tax_methord) . '" placeholder="Tax Method">
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($offer->sgst) . '" placeholder="Sgst">';
            }

            $row .= '<td>
            <input type="text" readonly required class="form-control" id="qty_' . $count . '" name="qty[]" value="' . esc($offer->qqty) . '" placeholder="Quantity">
            </td>
            <input type="hidden" class="form-control" name="innvddad[]" id="innvdda_' . $count . '" value="' . esc($offer->innvdda) . '">
            <input type="hidden" class="form-control" name="pddated[]" id="pddate_' . $count . '" value="' . esc($offer->pddate) . '">
            <td style="padding:1px;"><div class="form-group">
                <input type="text" onkeyup="return callcc_rss(this.value,this.id);" class="form-control" id="selling_' . $count . '" name="selling[]" value="' . esc($offer->sellrs) . '" placeholder="Cost">
            </div></td>
            <td style="padding:1px;"><div class="input-group">
                <input readonly type="text" class="form-control" id="subtt_' . $count . '" name="subtt[]" value="' . esc($offer->toto) . '" placeholder="Subtotal">
                <div class="input-group-btn">
                    <button class="btn btn-danger" type="button" onclick="remove_education_fields(' . $count . ');"><span class="glyphicon glyphicon-minus" aria-hidden="true"></span></button>
                </div>
            </div></td>
        </tr>';

            $data .= $row;
        }

        $stackt = implode(',', $stack);
        $data .= '<input type="hidden" class="form-control" id="ll" name="ll" value="' . esc($stackt) . '">';
        $data .= '<input type="hidden" class="form-control" id="totelemt" name="totelemt" value="' . esc($count) . '">';

        return $this->response->setBody($data);
    }
    public function load_posalesmsk_offers()
    {
        $db = \Config\Database::connect();
        $session = session();

        $data = '';
        $stack = [];

        $userId = $session->get('user_id');

        // Load settings
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstEnabled = $settings['gst_tax'] ?? 0;

        // Fetch offers for current user
        $offers = $db->table('possalprs_offers')->where('userid', $userId)->get()->getResultObject();

        foreach ($offers as $offer) {
            $count = $offer->ats;
            $stack[] = $count;

            $row = '<tr id="add' . $count . '"> 
            <td style="padding:1px;"><div class="form-group">
                <input readonly class="form-control" type="text" value="' . esc($offer->prname) . '" id="countryname_' . $count . '" name="countryname[]"/>
                <input type="hidden" class="form-control" value="' . esc($offer->producnum) . '" id="statediv_' . $count . '" name="statediv[]" />
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cosst_' . $count . '" name="cosst[]" value="' . esc($offer->purrs) . '">
            </div></td>';

            if ($gstEnabled) {
                $row .= '<td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($offer->cgstt) . '" placeholder="Cgst">
                <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($offer->tax_methord) . '">
            </div></td>
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($offer->sgst) . '" placeholder="Sgst">';
            } else {
                $row .= '<input type="hidden" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($offer->cgstt) . '">
            <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($offer->tax_methord) . '">
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($offer->sgst) . '">';
            }

            $row .= '<td>
                <input type="text" required readonly class="form-control" id="qty_' . $count . '" name="qty[]" value="' . esc($offer->qqty) . '" placeholder="Quantity">
            </td>
            <input type="hidden" class="form-control" name="innvddad[]" id="innvdda_' . $count . '" value="' . esc($offer->innvdda) . '">
            <input type="hidden" class="form-control" name="pddated[]" id="pddate_' . $count . '" value="' . esc($offer->pddate) . '">
            <td style="padding:1px;"><div class="form-group">
                <input type="text" onkeyup="return callcc_rss(this.value,this.id);" class="form-control" id="selling_' . $count . '" name="selling[]" value="' . esc($offer->sellrs) . '" placeholder="Cost">
            </div></td>
            <td style="padding:1px;"><div class="input-group">
                <input readonly type="text" class="form-control" id="subtt_' . $count . '" name="subtt[]" value="' . esc($offer->toto) . '" placeholder="Cost">
                <div class="input-group-btn">
                    <button class="btn btn-danger" type="button" onclick="remove_education_fields(' . $count . ');">
                        <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
                    </button>
                </div>
            </div></td>
        </tr>';

            $data .= $row;
        }

        // Add hidden fields
        $stackt = implode(",", $stack);
        $data .= '<input type="hidden" class="form-control" id="ll" name="ll" value="' . esc($stackt) . '">';

        return $this->response->setBody($data);
    }
    public function load_pogoodpurr_offer()
    {
        $db = $this->db;
        $session = session();

        $data = '';
        $stack = [];
        $userId = $session->get('user_id');

        // Parse expire date and mmexpire date
        $expireDateInput = $this->request->getPost('expiredate');
        $expireDate = $this->parseDate($expireDateInput);

        $mmexpireInput = $this->request->getPost('mmexpiredat');
        $mmexpireDate = $this->parseDate($mmexpireInput);

        // Get product name
        $productId = $this->request->getPost('producnum');
        $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
        $productName = $product['name'] ?? '';

        // Insert new offer
        $insertData = [
            'producnum'    => $productId,
            'prname'       => $productName,
            'purrs'        => $this->request->getPost('sellrs'),
            'sellrs'       => $this->request->getPost('purrs'),
            'qqty'         => $this->request->getPost('qqty'),
            'cgstt'        => $this->request->getPost('cgstt'),
            'tax_methord'  => $this->request->getPost('tax_methord'),
            'sgst'         => $this->request->getPost('sgst'),
            'toto'         => $this->request->getPost('toto'),
            'innvdda'      => $this->request->getPost('innvdda'),
            'pddate'       => $this->request->getPost('pddate'),
            'userid'       => $userId
        ];
        $db->table('possalprs_offers')->insert($insertData);

        // Get GST flag from settings
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstEnabled = $settings['gst_tax'] ?? 0;

        // Get offers
        $offers = $db->table('possalprs_offers')->where('userid', $userId)->get()->getResultObject();

        foreach ($offers as $offer) {
            $count = $offer->ats;
            $stack[] = $count;

            $row = '<tr id="add' . $count . '"> 
            <td style="padding:1px;"><div class="form-group">
                <input readonly class="form-control" type="text" value="' . esc($offer->prname) . '" id="countryname_' . $count . '" name="countryname[]"/>
                <input type="hidden" class="form-control" value="' . esc($offer->producnum) . '" id="statediv_' . $count . '" name="statediv[]" />
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cosst_' . $count . '" name="cosst[]" value="' . esc($offer->purrs) . '" >
            </div></td>';

            if ($gstEnabled) {
                $row .= '<td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($offer->cgstt) . '" placeholder="Cgst">
                <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($offer->tax_methord) . '">
            </div></td>
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($offer->sgst) . '">';
            } else {
                $row .= '<input type="hidden" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($offer->cgstt) . '">
            <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($offer->tax_methord) . '">
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($offer->sgst) . '">';
            }

            $row .= '<td>
            <input type="text" required readonly class="form-control" id="qty_' . $count . '" name="qty[]" value="' . esc($offer->qqty) . '" placeholder="Quantity">
        </td>
        <input type="hidden" class="form-control" name="innvddad[]" id="innvdda_' . $count . '" value="' . esc($offer->innvdda) . '">
        <input type="hidden" class="form-control" name="pddated[]" id="pddate_' . $count . '" value="' . esc($offer->pddate) . '">
        <td style="padding:1px;"><div class="form-group">
            <input type="text" onkeyup="return callcc_rss(this.value,this.id);" class="form-control" id="selling_' . $count . '" name="selling[]" value="' . esc($offer->sellrs) . '" placeholder="Cost">
        </div></td>
        <td style="padding:1px;"><div class="input-group">
            <input readonly type="text" class="form-control" id="subtt_' . $count . '" name="subtt[]" value="' . esc($offer->toto) . '" placeholder="Cost">
            <div class="input-group-btn">
                <button class="btn btn-danger" type="button" onclick="remove_education_fields(' . $count . ');">
                    <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
                </button>
            </div>
        </div></td>
        </tr>';

            $data .= $row;
        }

        $stackt = implode(',', $stack);
        $data .= '<input type="hidden" class="form-control" id="ll" name="ll" value="' . esc($stackt) . '">';
        $data .= '<input type="hidden" class="form-control" id="totelemt" name="totelemt" value="' . esc($count) . '">';

        return $this->response->setBody($data);
    }
    public function load_pogoodpurrdel_combo()
    {
        $db = \Config\Database::connect();
        $session = session();
        $count = '';
        $rid = $this->request->getPost('rid');
        $userId = $session->get('user_id');
        $stack = [];
        $sn = 0;
        $data = '';


        // Delete matching combos
        $db->table('possalprs_combo')
            ->where('userid', $userId)
            ->where('ats', $rid)
            ->delete();

        // Get GST setting
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstEnabled = $settings['gst_tax'] ?? 0;

        // Fetch remaining combos for the user
        $combos = $db->table('possalprs_combo')->where('userid', $userId)->get()->getResultObject();

        foreach ($combos as $combo) {
            $sn++;
            $count = $combo->ats;
            $stack[] = $count;

            $row = '<tr id="add' . $count . '" class="">
            <td style="padding:1px;"><div class="form-group">' . $sn . '</div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly class="form-control" type="text" value="' . esc($combo->prname) . '" id="countryname_' . $count . '" name="countryname[]"/>
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input class="form-control" value="' . esc($combo->producnum) . '" type="text" id="statediv_' . $count . '" name="statediv[]" readonly/>
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cosst_' . $count . '" name="cosst[]" value="' . esc($combo->purrs) . '" >
            </div></td>';

            if ($gstEnabled) {
                $row .= '<td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($combo->cgstt) . '" placeholder="Cgst">
                <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($combo->tax_methord) . '">
            </div></td>
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($combo->sgst) . '">';
            } else {
                $row .= '<input type="hidden" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($combo->cgstt) . '">
            <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($combo->tax_methord) . '">
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($combo->sgst) . '">';
            }

            $row .= '<td style="padding:1px;"><div class="form-group">
            <input type="text" onkeyup="return callcc_qtt(this.value,this.id);" required class="form-control" id="qty_' . $count . '" name="qty[]" value="' . esc($combo->qqty) . '" placeholder="Quantity">
            </div></td>
            <td style="padding:1px;"><div class="form-group">
            <input type="text" onkeyup="return callcc_rss(this.value,this.id);" class="form-control" id="selling_' . $count . '" name="selling[]" value="' . esc($combo->sellrs) . '" placeholder="Cost">
            </div></td>
            <td style="padding:1px;"><div class="input-group">
            <input readonly type="text" class="form-control" id="subtt_' . $count . '" name="subtt[]" value="' . esc($combo->toto) . '" placeholder="Cost">
            <div class="input-group-btn">
                <button class="btn btn-danger" type="button" onclick="remove_education_fields(' . $count . ');">
                    <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
                </button>
            </div>
        </div></td>
        </tr>';

            $data .= $row;
        }

        $stackt = implode(',', $stack);
        $data .= '<input type="hidden" class="form-control" id="ll" name="ll" value="' . esc($stackt) . '">';
        $data .= '<input type="hidden" class="form-control" id="totelemt" name="totelemt" value="' . esc($count) . '">';

        return $this->response->setBody($data);
    }
    public function load_pogoodpurr_com()
    {
        $db = \Config\Database::connect();
        $session = session();
        $request = $this->request;

        $data = '';
        $stack = [];
        $sn = 0;

        $userId = $session->get('user_id');
        $productId = $request->getPost('producnum');

        // Convert expire date and mmexpire date if needed (you may store these later)
        $expireDate = $this->parseDate($request->getPost('expiredate'));
        $mmExpireDate = $this->parseDate($request->getPost('mmexpiredat'));

        // Get product name
        $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
        $productName = $product['name'] ?? '';

        // Insert the new combo entry
        $db->table('possalprs_combo')->insert([
            'producnum'    => $productId,
            'prname'       => $productName,
            'purrs'        => $request->getPost('sellrs'),
            'sellrs'       => $request->getPost('purrs'),
            'qqty'         => $request->getPost('qqty'),
            'cgstt'        => $request->getPost('cgstt'),
            'tax_methord'  => $request->getPost('tax_methord'),
            'sgst'         => $request->getPost('sgst'),
            'toto'         => $request->getPost('toto'),
            'valid_from'   => $request->getPost('valid_from'),
            'valid_to'     => $request->getPost('valid_to'),
            'userid'       => $userId
        ]);

        // GST setting
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstEnabled = $settings['gst_tax'] ?? 0;

        // Load all current combo entries for this user
        $combos = $db->table('possalprs_combo')->where('userid', $userId)->get()->getResultObject();

        foreach ($combos as $combo) {
            $sn++;
            $count = $combo->ats;
            $stack[] = $count;

            $row = '<tr id="add' . $count . '" class="">
            <td style="padding:1px;"><div class="form-group">' . $sn . '</div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly class="form-control" type="text" value="' . esc($combo->prname) . '" id="countryname_' . $count . '" name="countryname[]"/>
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input class="form-control" value="' . esc($combo->producnum) . '" type="text" id="statediv_' . $count . '" name="statediv[]" readonly/>
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cosst_' . $count . '" name="cosst[]" value="' . esc($combo->purrs) . '">
            </div></td>';

            if ($gstEnabled) {
                $row .= '<td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($combo->cgstt) . '" placeholder="Cgst">
                <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($combo->tax_methord) . '">
            </div></td>
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($combo->sgst) . '">';
            } else {
                $row .= '<input type="hidden" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($combo->cgstt) . '">
            <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($combo->tax_methord) . '">
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($combo->sgst) . '">';
            }

            $row .= '<td style="padding:1px;"><div class="form-group">
            <input type="text" onkeyup="return callcc_qtt(this.value,this.id);" required class="form-control" id="qty_' . $count . '" name="qty[]" value="' . esc($combo->qqty) . '" placeholder="Quantity">
        </div></td>
        <td style="padding:1px;"><div class="form-group">
            <input type="text" onkeyup="return callcc_rss(this.value,this.id);" class="form-control" id="selling_' . $count . '" name="selling[]" value="' . esc($combo->sellrs) . '" placeholder="Cost">
        </div></td>
        <td style="padding:1px;"><div class="input-group">
            <input readonly type="text" class="form-control" id="subtt_' . $count . '" name="subtt[]" value="' . esc($combo->toto) . '" placeholder="Cost">
            <div class="input-group-btn">
                <button class="btn btn-danger" type="button" onclick="remove_education_fields(' . $count . ');">
                    <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
                </button>
            </div>
        </div></td>
        </tr>';

            $data .= $row;
        }

        $stackt = implode(',', $stack);
        $data .= '<input type="hidden" class="form-control" id="ll" name="ll" value="' . esc($stackt) . '">';
        $data .= '<input type="hidden" class="form-control" id="totelemt" name="totelemt" value="' . esc($count) . '">';

        return $this->response->setBody($data);
    }
    private function parseDate($dateStr)
    {
        if (empty($dateStr)) return '0000-00-00';
        $parts = explode('/', $dateStr);
        return (count($parts) === 3) ? "{$parts[2]}-{$parts[0]}-{$parts[1]}" : '0000-00-00';
    }

    public function searchItems34()
    {
        $db = \Config\Database::connect();
        $request = service('request');

        $returnArr = [];

        $param = $request->getGet('name_startsWith');
        $rowNum = $request->getGet('row_num');

        $builder = $db->table('products');
        $builder->select('*');
        $builder->like('name', $param, 'both');
        $builder->where('combo_id', 0);
        $builder->orderBy('id', 'ASC');
        $builder->limit(10);

        $query = $builder->get()->getResultArray();

        foreach ($query as $row) {
            $tg = $row['tax'] + $row['sgst'];
            $postPrice = floatval($row['price']);
            $price = (!$row['taxmethod'] || $row['taxmethod'] == '0')
                ? $postPrice
                : $postPrice * (1 + ($tg / 100));

            $rowArray = $row['name'] . '|' . $row['id'] . '|' . $price . '|' . $row['cost'] . '|' . $row['tax'] . '|' . $row['sgst'] . '|' . $rowNum;
            $returnArr[] = $rowArray;
        }

        return $this->response->setJSON($returnArr);
    }


    // public function loadPosalesmskCombo()
    // {
    //     $db = \Config\Database::connect();
    //     $session = session();

    //     // Fetch settings
    //     $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();

    //     // Fetch combo sale products for current user
    //     $userId = $session->get('user_id');
    //     $items = $db->table('possalprs_combo')->where('userid', $userId)->get()->getResult();

    //     // Prepare stack and row numbering
    //     $stack = [];
    //     $sn = 0;

    //     // Pass all necessary data to view
    //     return view('Pos/pos_combo_rows', [
    //         'items'    => $items,
    //         'setting'  => $setting,
    //         'stack'    => &$stack,
    //         'sn'       => &$sn
    //     ]);
    // }


    public function load_posalesmsk_combo()
    {
        $db = \Config\Database::connect();
        $session = session();

        $data = '';
        $stack = [];
        $sn = 0;

        $userId = $session->get('user_id');


        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstEnabled = $settings['gst_tax'] ?? 0;


        $combos = $db->table('possalprs_combo')->where('userid', $userId)->get()->getResultObject();

        foreach ($combos as $combo) {
            $sn++;
            $count = $combo->ats;
            $stack[] = $count;

            $row = '<tr id="add' . $count . '" class="">
            <td style="padding:1px;"><div class="form-group">' . $sn . '</div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly class="form-control" type="text" value="' . esc($combo->prname) . '" id="countryname_' . $count . '" name="countryname[]"/>
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input class="form-control" value="' . esc($combo->producnum) . '" type="text" id="statediv_' . $count . '" name="statediv[]" readonly/>
            </div></td>
            <td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cosst_' . $count . '" name="cosst[]" value="' . esc($combo->purrs) . '">
            </div></td>';

            if ($gstEnabled) {
                $row .= '<td style="padding:1px;"><div class="form-group">
                <input readonly type="text" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($combo->cgstt) . '" placeholder="Cgst">
                <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($combo->tax_methord) . '">
            </div></td>
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($combo->sgst) . '">';
            } else {
                $row .= '<input type="hidden" class="form-control" id="cgst_' . $count . '" name="cgst[]" value="' . esc($combo->cgstt) . '">
            <input type="hidden" class="form-control" id="tax_methord_' . $count . '" name="tax_methord[]" value="' . esc($combo->tax_methord) . '">
            <input type="hidden" class="form-control" id="sgst_' . $count . '" name="sgst[]" value="' . esc($combo->sgst) . '">';
            }

            $row .= '<td style="padding:1px;"><div class="form-group">
            <input type="text" onkeyup="return callcc_qtt(this.value,this.id);" required class="form-control" id="qty_' . $count . '" name="qty[]" value="' . esc($combo->qqty) . '" placeholder="Quantity">
        </div></td>
        <td style="padding:1px;"><div class="form-group">
            <input type="text" onkeyup="return callcc_rss(this.value,this.id);" class="form-control" id="selling_' . $count . '" name="selling[]" value="' . esc($combo->sellrs) . '" placeholder="Cost">
        </div></td>
        <td style="padding:1px;"><div class="input-group">
            <input readonly type="text" class="form-control" id="subtt_' . $count . '" name="subtt[]" value="' . esc($combo->toto) . '" placeholder="Cost">
            <div class="input-group-btn">
                <button class="btn btn-danger" type="button" onclick="remove_education_fields(' . $count . ');">
                    <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
                </button>
            </div>
        </div></td>
        </tr>';

            $data .= $row;
        }

        $stackt = implode(',', $stack);
        $data .= '<input type="hidden" class="form-control" id="ll" name="ll" value="' . esc($stackt) . '">';

        return $this->response->setBody($data);
    }


    // public function load_pogoodpurr()
    // {
    //     $request = service('request');
    //     $db = db_connect();
    //     $session = session();

    //     $data = '';
    //     $custtype = $request->getPost('taxtype');
    //     $builder = $db->table('tax');

    //     if ($custtype == '') {
    //         $builder->where('taxdefault', 1);
    //     } else {
    //         $builder->where('custtype', $custtype);
    //     }
    //     $builder->where('status', 1);
    //     $alltaxes = $builder->get()->getResult();

    //     $total_inclusive = 0;
    //     $total_exclusive = 0;
    //     $toto = (float) $request->getPost('toto');

    //     $taxtype = 0;
    //     foreach ($alltaxes as $tax) {
    //         $taxtype = $tax->taxtype;
    //         if ($tax->taxtype == 1) {
    //             $total_inclusive += $tax->valueper;
    //         } else {
    //             $total_exclusive += $tax->valueper;
    //         }
    //     }

    //     $qty = (float) $request->getPost('qqty');
    //     $pur_price = $qty > 0 ? floatval($toto / $qty) : 0;

    //     $totalExclusiveAmount = ($total_exclusive / 100) * $toto;
    //     $totalInclusiveAmount = ($total_inclusive / 100) * $toto;
    //     $taxAmount = $totalExclusiveAmount - $totalInclusiveAmount;

    //     $expiredate = $request->getPost('expiredate');
    //     $expire_parts = explode('/', $expiredate);
    //     $expire_date = count($expire_parts) === 3 ? "$expire_parts[2]-$expire_parts[0]-$expire_parts[1]" : '00-00-00';

    //     $mmexpiredat = $request->getPost('mmexpiredat');
    //     $mm_parts = explode('/', $mmexpiredat);
    //     $mm_date = count($mm_parts) === 3 ? "$mm_parts[2]-$mm_parts[0]-$mm_parts[1]" : '00-00-00';

    //     $brand_new_id = null;
    //     if ($request->getPost('branddd')) {
    //         $brandName = $request->getPost('brandInput');
    //         $brandId = $request->getPost('branddd');
    //         if (is_numeric($brandId) && $brandId > 0) {
    //             $brand_new_id = $brandId;
    //         } else {
    //             $brand = $db->table('brand')->where('name', $brandName)->get()->getRow();
    //             if ($brand) {
    //                 $brand_new_id = $brand->id;
    //             } else {
    //                 $db->table('brand')->insert(['name' => $brandName, 'created_at' => date('Y-m-d h:i:s'), 'status' => 1]);
    //                 $brand_new_id = $db->insertID();
    //             }
    //         }
    //     }

    //     $discount_percentage = $request->getPost('discount_percentage');
    //     $discount_amount = $request->getPost('discount_amount');

    //     $producnum = $request->getPost('producnum');
    //     $countryname = $request->getPost('countryname_1m');

    //     if (empty($producnum) || $producnum == '0') {
    //         $lastProduct = $db->table('products')->orderBy('id', 'DESC')->get(1)->getRow();
    //         $lastCode = $lastProduct ? ($lastProduct->code ?? $lastProduct->id) : 0;
    //         $new_barcode = intval($lastCode) + 1;

    //         $productData = [
    //             'code' => (string) $new_barcode,
    //             'alertqt' => 0,
    //             'type' => 0,
    //             'name' => $countryname,
    //             'supplier' => $request->getPost('supp'),
    //             'cost' => $pur_price,
    //             'tax' => 5,
    //             'price' => $request->getPost('sellrs'),
    //             'brandd' => $brand_new_id,
    //             'rrate' => $request->getPost('sellrs'),
    //         ];

    //         $db->table('products')->insert($productData);
    //         $rssf = $db->insertID();

    //         if ($request->getPost('barcodecc')) {
    //             $db->table('products')->update(['code' => $request->getPost('barcodecc')], ['id' => $rssf]);
    //         }

    //         foreach ($alltaxes as $value) {
    //             $db->table('taxprolist')->insert([
    //                 'proid' => $rssf,
    //                 'taxid' => $value->id,
    //                 'taxamount' => $value->valueper,
    //                 'dated' => date('Y-m-d'),
    //             ]);
    //         }

    //         $store_id = $session->get('store');
    //         $db->table('stocks')->insert([
    //             'product_id' => $rssf,
    //             'type' => 0,
    //             'store_id' => 1,
    //             'warehouse_id' => 0,
    //             'quantity' => $qty,
    //             'price' => 0,
    //             'puritem_id' => 0,
    //             'datte' => date('Y-m-d'),
    //         ]);

    //         $producnum = $rssf;
    //         $prname = $countryname;
    //     } else {
    //         $product = $db->table('products')->where('id', $producnum)->get()->getRowArray();
    //         $prname = $product['name'] ?? '';
    //     }

    //     $db->table('possalprs')->insert([
    //         'producnum' => $producnum,
    //         'prname' => $prname,
    //         'purrs' => $pur_price,
    //         'sellrs' => $request->getPost('sellrs'),
    //         'qqty' => $qty,
    //         'cgstt' => 2.5,
    //         'packed_1m' => $request->getPost('packed_1m'),
    //         'batch_1m' => $request->getPost('batch_1m'),
    //         'expire_1m' => $request->getPost('expire_1m'),
    //         'sgst' => 2.5,
    //         'toto' => $toto,
    //         'lev_1m' => $request->getPost('lev_1m'),
    //         'mrpp' => $request->getPost('mrpp'),
    //         'rack_1m' => $request->getPost('rack_1m'),
    //         'barcodecc' => $request->getPost('barcodecc'),
    //         'userid' => $session->get('user_id'),
    //         'discount_percentage' => $discount_percentage,
    //         'discount_amount' => $discount_amount,
    //         'taxtype' => $taxtype,
    //         'taxtotal' => $taxAmount,
    //     ]);

    //     $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    //     $stack = [];
    //     $smkt = $settings['expi'] == 1 ? 2 : 3;
    //     $smko = $settings['expi'] == 1 ? 1 : 2;

    //     $items = $db->table('possalprs')->where('userid', $session->get('user_id'))->get()->getResult();
    //     $brands = $db->table('brand')->orderBy('name', 'ASC')->get()->getResultArray();

    //     return view('pur_pro_list', [
    //         'stack' => $stack,
    //         'lxzmm' => $settings,
    //         'tyy' => $items,
    //         'imnn' => $brands,
    //     ]);
    // }

    public function load_pogoodpurr()
    {
        if (!$this->store) {
            echo json_encode(['error' => true, 'message' => 'Please Open Store Fisrt']);
            return false;
        }
        $data = '';
        $custtype = 0;
        $taxId = $this->request->getPost('taxtype');  // Replaced $_POST with request->getPost()
        $category = $this->request->getPost('category');
        $input_barcode = $this->request->getPost('barcodecc');
        $store_id = $this->store;
        $store = $this->StoreModel->find($store_id);


        $barcode_prefix = strtoupper(mb_substr($store->name, 0, 1, "UTF-8")) . strtoupper(mb_substr($store->city, 0, 1, "UTF-8"));
        // Build query based on custtype
        $taxQuery = $this->db->table('tax');
        if ($taxId == '') {
            $taxQuery->where('taxdefault', 1);
        } else {
            // $taxQuery->where('custtype', $custtype);
            $taxQuery->where('id', $taxId);
        }
        $taxQuery->where('tax_for', 1);

        $alltaxes = $taxQuery->where('status', 1)->get()->getResult();  // CI4 method to execute query and get result

        $total_inclusive = 0;
        $total_exclusive = 0;
        $toto = $this->request->getPost('toto');  // Get 'toto' from POST
        $total_amount = $toto; //qty*pur_price

        $_cgst = 0;
        $_sgst = 0;
        $_igst = 0;
        $_gst = 0;
        $taxtype = 0;
        // $purchase_tax = 0;
        foreach ($alltaxes as $tax) {
            $custtype = $tax->custtype;
            $taxtype = $tax->taxtype;
            if ($tax->taxtype == 1) { //1 Inclusive
                $_cgst += $tax->cgst;
                $_sgst += $tax->sgst;
                $_igst += $tax->igst;
                $_gst += $tax->gst;

                $total_inclusive += $tax->cgst;
                $total_inclusive += $tax->sgst;
                $total_inclusive += $tax->igst;
                $total_inclusive += $tax->gst;
                // $total_inclusive = $total_inclusive;
                // $total_inclusive += $tax->valueper;
            } else {
                $_cgst += $tax->cgst;
                $_sgst += $tax->sgst;
                $_igst += $tax->igst;
                $_gst += $tax->gst;

                $total_exclusive += $tax->cgst;
                $total_exclusive += $tax->sgst;
                $total_exclusive += $tax->igst;
                $total_exclusive += $tax->gst;
                // $total_exclusive += $tax->valueper;
            }
        }
        $taxType = $total_inclusive > $total_exclusive ? 2 : 1;
        $value_per = $total_inclusive - $total_exclusive; // getting the percentage of tax 
        if ($taxId != '') {
            $getTax = $this->db->table('tax')->where(['taxtype' => $custtype, 'tax_for' => 1, 'valueper !=' => false])->get()->getRow();
            if (!empty($getTax)) {
                $value_per = $getTax->valueper;
            } else {
                // $this->db->table('tax')
                //     ->insert([
                //         'name' => '',
                //         'valueper' => $value_per,
                //         'status' => 1,
                //         'custtype' => $custtype,
                //         'taxtype' => $taxType,
                //         'taxdefault' => 1
                //     ]);
            }
        }

        // echo $value_per;
        // print_r($alltaxes);
        // die;

        // Calculate purchase price
        $pur_price = $this->request->getPost('qqty') != 0 ? floatval($toto / $this->request->getPost('qqty')) : 0;
        $_POST['purrs'] = $pur_price;

        $totalInclusiveAmount = ($total_inclusive / 100) * $toto;
        $totalExclusiveAmount = ($total_exclusive / 100) * $toto;
        $taxAmount =  $totalExclusiveAmount - $totalInclusiveAmount;

        if ($totalInclusiveAmount < $totalExclusiveAmount) {
            $toto += ($totalExclusiveAmount);
        }

        $_cgst =  ($total_amount / 100) * $_cgst;
        $_sgst = ($total_amount / 100) * $_sgst;
        $_igst =  ($total_amount / 100) * $_igst;
        $_gst  = ($total_amount / 100) * $_gst;

        $_taxtotal = $_cgst + $_sgst + $_igst + $_gst;

        // Date conversion from 'expiredate'
        $ty = $this->request->getPost('expiredate');
        $tyt = !empty($ty) ? explode("/", $ty) : '';
        $tytt = isset($tyt[2]) && isset($tyt[0]) && isset($tyt[1]) ? $tyt[2] . '-' . $tyt[0] . '-' . $tyt[1] : '00-00-00';

        // Similar for second date field
        $xty = $this->request->getPost('mmexpiredat');
        $xtyt = !empty($xty) ? explode("/", $xty) : '';
        $xtytt = isset($xtyt[2]) && isset($xtyt[0]) && isset($xtyt[1]) ? $xtyt[2] . '-' . $xtyt[0] . '-' . $xtyt[1] : '00-00-00';

        // Handle brand logic
        if ($this->request->getPost('branddd')) {
            $brandName = $this->request->getPost('brandInput');
            if (is_numeric($this->request->getPost('branddd')) && $this->request->getPost('branddd') > 0) {
                $brand_new_id = $this->request->getPost('branddd');
            } else {
                // Load brand by name
                $availableBrand = $this->db->table('brand')->where('name', $brandName)->get()->getRow();
                if (isset($availableBrand->id)) {
                    $brand_new_id = $availableBrand->id;
                } else {
                    // Insert new brand
                    $this->db->table('brand')->insert([
                        'name' => $brandName,
                        'created_at' => date('Y-m-d h:i:s'),
                        'status' => 1
                    ]);
                    $brand_new_id = $this->db->insertID();
                }
            }
        }

        // Discount values
        $discount_percentage = $this->request->getPost('discount_percentage');
        $discount_amount = $this->request->getPost('discount_amount');
        $pro_size = $this->request->getPost('pro_size');


        // Handle product logic
        // Handle insert new product
        $date = date("Y-m-d H:i:s");

        // Get last product code
        $last_product = $this->db->table('products')->orderBy('id', 'desc')->get()->getRow();
        $last_product_code = isset($last_product->id) ? (!empty($last_product->id) ? $last_product->id : (isset($last_product->id) ? $last_product->id : 0)) : 0;
        $new_barcode = intval($last_product_code) + 1;

        $qty = $this->request->getPost('qqty');
        $is_barcode_exist = [];
        if (!empty($input_barcode)) {
            $is_barcode_exist = $this->db->table('products')->where('code', $input_barcode)->get()->getRow();
        }
        if (!empty($is_barcode_exist) && !empty($input_barcode)) {
            $rssf = $is_barcode_exist->id;
            $producnum = $is_barcode_exist->code;
        } else {
            // Insert new product
            $this->db->table('products')->insert([
                // 'code' => $barcode_prefix . ($new_barcode),
                'alertqt' => '0',
                'type' => '0',
                'name' => $this->request->getPost('countryname_1m'),
                'supplier' => $this->request->getPost('supp'),
                'cost' => $this->request->getPost('purrs'),
                'tax' => $value_per,
                'price' => $this->request->getPost('sellrs'),
                'brandd' => $this->request->getPost('branddd'),
                'rrate' => $this->request->getPost('mrpp'),
                'taxtotal' => $taxAmount,
                'category' => $category,
                'alertqt'  => $this->request->getPost('alert_qty'),
                'dis_per'  => $this->request->getPost('sel_dis'),
                'dis_amt'  => $this->request->getPost('dis_amt'),
            ]);
            $rssf = $this->db->insertID();
            $producnum =  !empty(trim($input_barcode)) ?  $input_barcode : $barcode_prefix . $rssf;
            log_message('debug', 'Updating product ID on Purchase: ' . $rssf . ' with code: ' . $producnum);

            $this->db->table('products')->where('id', $rssf)->update(['code' => $producnum]);
        }
        // Handle barcode
        // if (!empty($this->request->getPost('barcodecc'))) {
        //     $this->db->table('products')->where('id', $rssf)->update(['code' => $this->request->getPost('barcodecc')]);
        // }




        // Insert related tax data
        $alltaxes = $this->db->table('tax')->where('custtype', $custtype)->where('status', 1)->where('tax_for', 1)->where('valueper !=', false)->get()->getResult();
        foreach ($alltaxes as $tax) {
            $this->db->table('taxprolist')->insert([
                'proid' => $rssf,
                'taxid' => $tax->id,
                'taxamount' => $tax->valueper,
                'dated' => date("Y-m-d")
            ]);
        }

        // Insert stock
        // $this->db->table('stocks')->insert([
        //     'product_id' => $rssf,
        //     'type' => 0,
        //     'store_id' => 1,
        //     'warehouse_id' => 0,
        //     'quantity' => 0,
        //     'price' => 0,
        //     'puritem_id' => 0,
        //     'datte' => date('Y-m-d')
        // ]);
        // $stock_id = $this->db->insertID();
        // $producnum = $rssf;
        $prname = $this->request->getPost('countryname_1m');
        // $prname = $existing_product->name;




        // Insert into `posalprs` table
        $this->db->table('possalprs')->insert([
            'producnum' =>  $rssf,
            'prname' => $prname ?? '',
            'purrs' => $this->request->getPost('purrs'),
            'sellrs' => $this->request->getPost('sellrs'),
            'qqty' => $this->request->getPost('qqty'),
            'cgstt' => '2.5',
            'packed_1m' => $this->request->getPost('packed_1m'),
            'batch_1m' => $this->request->getPost('batch_1m'),
            'expire_1m' => $this->request->getPost('expire_1m'),
            'sgst' => '2.5',
            'toto' => $toto,
            'lev_1m' => $this->request->getPost('lev_1m'),
            'mrpp' => $this->request->getPost('mrpp'),
            'rack_1m' => $this->request->getPost('rack_1m'),
            'barcodecc' => $this->request->getPost('barcodecc'),
            'userid' => session()->get('user_id'),
            'discount_percentage' => $discount_percentage,
            'discount_amount' => $discount_amount,
            'taxtype' => $taxtype,
            'taxtotal' => $taxAmount,
            '_cgst' => $_cgst,
            '_sgst' => $_sgst,
            '_igst' => $_igst,
            '_gst' => $_gst,
            '_taxtotal' => $_taxtotal,
            // '_taxper' => $value_per,
        ]);

        // Load data for view
        $stack = [];
        $lxzmm = $this->db->table('settings')->where('id', 1)->get()->getRowArray();
        $smkt = $lxzmm['expi'] == 1 ? 2 : 3;
        $smko = $lxzmm['expi'] == 1 ? 1 : 2;

        $tyy = $this->db->table('possalprs')->where('userid', $this->session->get('user_id'))->orderBy('ats', 'asc')->get()->getResult();
        $imnn = $this->db->table('brand')->orderBy('name', 'asc')->get()->getResultArray();

        // Stack result
        $sn = 0;
        foreach ($tyy as $tyyf) {
            $sn++;
            $stack[] = $tyyf->ats;
        }

        // Return the result
        echo view('pur_pro_list', [
            'stack' => $stack,
            'lxzmm' => $lxzmm,
            'tyy' => $tyy,
            'imnn' => $imnn,
            'setting' => $this->setting,
            'db' => $this->db,
            'user' => $this->user,
            'id'   => '',
            'producnum' => $producnum,
        ]);
    }


    public function load_pogood_upd()
    {
        $cc   = $this->request->getPost('cc');
        $kmxx = $this->request->getPost('kmxx');
        $jj   = $this->request->getPost('jj');

        $builder = $this->db->table('possalprs');
        $builder->where('ats', $jj);
        $builder->update([
            'qqty' => $cc,
            'toto' => $kmxx,
        ]);

        return $this->response->setStatusCode(ResponseInterface::HTTP_OK)->setBody('Updated');
    }

    public function load_pogood_updf()
    {
        $cc   = $this->request->getPost('cc');
        $kmxx = $this->request->getPost('kmxx');
        $jj   = $this->request->getPost('jj');

        $builder = $this->db->table('possalprs');
        $builder->where('ats', $jj);
        $builder->update([
            'purrs' => $cc,
            'toto'  => $kmxx,
        ]);

        return $this->response->setStatusCode(ResponseInterface::HTTP_OK)->setBody('Updated');
    }

    public function load_posalesmskpp()
    {
        $db = \Config\Database::connect();
        $session = session();
        $userId = $session->get('user_id');

        $stack = [];
        $posItems = $db->table('possalprspp')->where('userid', $userId)->get()->getResult();
        $settingRow = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstTax = $settingRow['gst_tax'] ?? 0;

        $formattedItems = [];

        foreach ($posItems as $item) {
            $count = $item->ats;
            $stack[] = $count;

            $product = $db->table('products')->where('id', $item->producnum)->get()->getRow();

            $formattedItems[] = [
                'count'     => $count,
                'item'      => $item,
                'product'   => $product,
            ];
        }

        $stackt = implode(',', $stack);

        return view('pos/load_posalesmskpp', [
            'items'     => $formattedItems,
            'stackList' => $stackt,
            'gstTax'    => $gstTax,
            'decimals'  => $this->setting->decimals ?? 2, // Adjust as needed
        ]);
    }
    public function load_posalesmsk($id = '')
    {
        $db = \Config\Database::connect();
        $session = session();
        $userId = $session->get('user_id');

        $stack = [];

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $smkt = ($settings['expi'] == 1) ? 2 : 3;
        $smko = ($settings['expi'] == 1) ? 1 : 2;
        if ($id != '') {
            $saleItems = $db->table('possalprspp')
                ->where('userid', $userId)
                ->orderBy('ats', 'ASC')
                ->where('ppid', $id)
                ->get()
                ->getResult();
        } else {
            $saleItems = $db->table('possalprs')
                ->where('userid', $userId)
                ->orderBy('ats', 'ASC')
                ->get()
                ->getResult();
        }
        $brands = $db->table('brand')->orderBy('name', 'ASC')->get()->getResultArray();

        if (empty($saleItems)) {
            return $this->response->setJSON(['data' => []]);
        }

        if ($this->request->isAJAX()) {
            config('View')->debug = false;
        }


        // Render view as string
        $html = view('pur_pro_list', [
            'stack'    => $stack,
            'lxzmm'    => $settings,
            'tyy'      => $saleItems,
            'imnn'     => $brands,
            'smkt'     => $smkt,
            'smko'     => $smko,
            'sn'       => 1,
            'db'       => $this->db,
            'setting'  => $this->setting,
            'response' => $this->response,
            'id'       => $id != '' ? $id : '',
        ]);

        $html = preg_replace('/<!-- DEBUG-VIEW START.*?-->/', '', $html);
        $html = preg_replace('/<!-- DEBUG-VIEW ENDED.*?-->/', '', $html);

        echo $html;
        // Return as JSON for DataTables
        // return $this->response->setJSON(['data' => [$html]]);
    }

    public function load_pogoodpurrdel($id = '')
    {
        $db = \Config\Database::connect();
        $session = session();
        $request = service('request');

        $rid = $request->getPost('rid');
        $userId = $session->get('user_id');

        // Delete the item
        $db->table('possalprs')
            ->where('userid', $userId)
            ->where('ats', $rid)
            ->delete();

        // Get settings
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstTax = $settings['gst_tax'] ?? 0;
        $expi   = $settings['expi'] ?? 0;
        $smkt = ($expi == 1) ? 2 : 3;
        $smko = ($expi == 1) ? 1 : 2;

        // Get brands
        $brands = $db->table('brand')->orderBy('name', 'ASC')->get()->getResultArray();

        // Get all user product rows
        $items = $db->table('possalprs')->where('userid', $userId)->get()->getResult();

        // Get all product info by ID for taxmethod lookup
        $productMap = [];
        foreach ($items as $item) {
            $product = $db->table('products')->where('id', $item->producnum)->get()->getRow();
            $productMap[$item->producnum] = $product;
        }
        $saleItems = $db->table('possalprs')->where('userid', $userId)->get()->getResult();
        $brands = $db->table('brand')->orderBy('name', 'ASC')->get()->getResultArray();

        $html = view('pur_pro_list', [
            'items'       => $items,
            'tyy'         => $items,
            'imnn'        => $brands,
            'brands'      => $brands,
            'settings'    => $settings,
            'lxzmm'    => $settings,
            'smkt'        => $smkt,
            'smko'        => $smko,
            'productMap'  => $productMap,
            'decimals'    => $this->setting->decimals ?? 2,
            'db'          => $this->db,
            'id'          => $id
        ]);

        $html = preg_replace('/<!-- DEBUG-VIEW START.*?-->/', '', $html);
        $html = preg_replace('/<!-- DEBUG-VIEW ENDED.*?-->/', '', $html);

        return $this->response->setBody($html);
    }
    public function load_pogoodpurrdelpp()
    {
        $rid = $this->request->getPost('rid');
        $userId = session()->get('user_id');

        // Delete the temporary items
        $db = \Config\Database::connect();
        $builder = $db->table('possalprspp');
        $builder->where(['userid' => $userId, 'ats' => $rid])->delete();

        // Fetch settings
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $gstTaxEnabled = isset($settings['gst_tax']) && $settings['gst_tax'] == 1;

        // Fetch updated items
        $query = $db->table('possalprspp')->where('userid', $userId)->get();
        $items = $query->getResultObject();

        $stack = [];
        $html = '';

        foreach ($items as $item) {
            $count = $item->ats;
            $stack[] = $count;

            $product = $db->table('products')->where('id', $item->producnum)->get()->getRow();

            $html .= view('pos/partials/pogoodpurrdelpp_row', [
                'count' => $count,
                'item' => $item,
                'product' => $product,
                'decimals' => $settings['decimals'] ?? 2,
                'gstTaxEnabled' => $gstTaxEnabled
            ]);
        }

        $html .= '<input class="form-control" readonly="readonly" type="hidden" id="ll" name="ll" value="' . implode(',', $stack) . '" >';

        return $this->response->setBody($html);
    }
    public function searchitems452()
    {
        $param = $this->request->getGet('name_startsWith');
        $row_num = $this->request->getGet('row_num');
        $db = \Config\Database::connect();

        $builder = $db->table('products');
        $builder->select('products.*, stocks.quantity');
        $builder->join('stocks', 'stocks.product_id = products.id');
        $builder->where('combo_id', 0);

        if (is_numeric($param)) {
            $builder->where('code', $param);
        } else {
            $builder->like('name', $param);
        }

        $builder->groupBy('code');
        $builder->orderBy('id', 'ASC');
        $builder->limit(10);
        $query = $builder->get();

        $result = [];
        foreach ($query->getResultArray() as $row) {
            $result[] = implode('|', [
                $row['name'],
                $row['id'],
                $row['price'],
                $row['cost'],
                $row['tax'],
                $row['sgst'],
                $row_num,
                $row['taxmethod'],
                $row['quantity']
            ]);
        }

        return $this->response->setJSON($result);
    }
    public function getNotificationForStudent($studentid = null, $class_id = null, $section_id = null)
    {
        $where = "";
        if ($section_id != null) {
            $where .= " AND send_notification.section_id = " . $this->db->escape($section_id);
        }
        if ($class_id != null) {
            $where .= " AND send_notification.class_id = " . $this->db->escape($class_id);
        }

        $query = $this->db->query("
        SELECT 
            students.id AS student_id,
            send_notification.id AS notification_id,
            send_notification.title,
            send_notification.publish_date,
            send_notification.date,
            send_notification.message,
            send_notification.class_id,
            send_notification.section_id,
            IF(read_notification.id IS NULL, 'unread', 'read') AS read_status,
            send_notification.created_at AS created_at_time
        FROM send_notification
        LEFT JOIN read_notification 
            ON send_notification.id = read_notification.notification_id 
            AND read_notification.student_id = " . $this->db->escape($studentid) . "
        LEFT JOIN students 
            ON students.id = read_notification.student_id
        WHERE send_notification.visible_student = 'Yes' $where
        ORDER BY send_notification.publish_date DESC
    ");

        return $query->result_array();
    }
    public function searchitems2()
    {
        $db = \Config\Database::connect();
        $request = service('request');

        $return_arr = [];

        $param = $request->getGet('name_startsWith');
        $row_num = $request->getGet('row_num');
        $iklm = $request->getGet('iklm');

        if (!empty($iklm) && is_numeric($iklm)) {
            $builder = $db->table('products');
            $builder->where('category', $iklm);
            $builder->like('name', $param);
            $builder->orderBy('id', 'ASC');
            $builder->limit(10);
        } else {
            $builder = $db->table('products');
            $builder->like('name', $param);
            $builder->orderBy('id', 'ASC');
            $builder->limit(10);
        }

        $results = $builder->get()->getResultArray();

        foreach ($results as $row) {
            $row_array = implode('|', [
                $row['name'],
                $row['id'],
                $row['price'],
                $row['cost'],
                $row['tax'],
                0,
                $row['rrate'],
                $row_num
            ]);
            $return_arr[] = $row_array;
        }

        return $this->response->setJSON($return_arr);
    }
    public function searchitems_offer()
    {
        $return_arr = [];
        $param = $this->request->getGet('name_startsWith');
        $row_num = $this->request->getGet('row_num');

        $db = \Config\Database::connect();
        $builder = $db->table('products');
        $builder->select('products.*, stocks.quantity');
        $builder->join('stocks', 'stocks.product_id = products.id');
        $builder->where('combo_id', 0);
        $builder->where('offer_id', 0);

        if (is_numeric($param)) {
            $builder->where('code', $param);
        } else {
            $builder->like('name', $param);
        }

        $builder->groupBy('code');
        $builder->orderBy('id', 'ASC');
        $builder->limit(10);

        $results = $builder->get()->getResultArray();

        foreach ($results as $row) {
            $row_array = $row['name'] . '(' . $row['quantity'] . ')' . '|' . $row['id'] . '|' . $row['price'] . '|' . $row['cost'] . '|' . $row['tax'] . '|' . $row['sgst'] . '|' . $row_num . '|' . $row['taxmethod'] . '|' . $row['quantity'];
            $return_arr[] = $row_array;
        }

        return $this->response->setJSON($return_arr);
    }

    public function brandSearch()
    {
        $db = \Config\Database::connect();
        $request = service('request');
        $response = service('response');

        $return_arr = [];
        $brandName = $request->getGet('brandName');

        $builder = $db->table('brand');
        $builder->like('name', $brandName);
        $builder->orderBy('id', 'ASC');
        $builder->limit(10);

        $results = $builder->get()->getResultArray();

        foreach ($results as $row) {
            $return_arr[] = $row['name'] . '|' . $row['id'];
        }

        return $response->setJSON($return_arr);
    }

    public function searchitems_bar($ttt)
    {
        $row_num = '';
        $iklm = $ttt;

        $row = $this->db->table('products')->where(['code' => $iklm])->get()->getRowArray();

        if (!empty($row)) {
            $row_array = implode('|', [
                $row['name'],
                $row['name'],
                $row['id'],
                $row['price'],
                $row['cost'],
                $row['tax'],
                $row['sgst'],
                $row['rrate'],
                $row_num
            ]);
            echo json_encode($row_array);
        } else {
            echo json_encode(['error' => 'Product not found']);
        }
        exit;
    }
    public function searchitems511()
    {
        $return_arr = [];
        $param = $this->request->getGet('name_startsWith');
        $row_num = $this->request->getGet('row_num');

        if (!empty($param)) {
            $builder = db_connect()->table('products');
            if (is_numeric($param)) {
                $builder->like('code', $param);
            } else {
                $builder->like('name', $param);
            }
            $builder->orderBy('id', 'ASC')->limit(10);
            $fetch = $builder->get()->getResultArray();

            foreach ($fetch as $row) {
                $row_array = $row['name'] . '|' . $row['id'] . '|' . $row['price'] . '|' . $row['cost'] . '|' . $row['tax'] . '|' . $row['sgst'] . '|' . $row_num;
                $return_arr[] = $row_array;
            }
        }

        return $this->response->setJSON($return_arr);
    }
    public function searchitems51()
    {
        $return_arr = [];
        $param = $this->request->getGet('name_startsWith');
        $row_num = (int)$this->request->getGet('row_num');
        $offset = $row_num * 10;

        if (!empty($param)) {
            $db = db_connect();
            $sql = "SELECT id, name, price, cost, tax, sgst 
                FROM products 
                WHERE name LIKE ? 
                ORDER BY id ASC 
                LIMIT 10 OFFSET ?";
            $query = $db->query($sql, [$param . '%', $offset]);

            foreach ($query->getResultArray() as $row) {
                $row_array = $row['name'] . '|' . $row['id'] . '|' . $row['price'] . '|' . $row['cost'] . '|' . $row['tax'] . '|' . $row['sgst'] . '|' . $row_num;
                $return_arr[] = $row_array;
            }
        }

        return $this->response->setJSON($return_arr);
    }
    public function sessstt()
    {
        $session = session();
        $t1 = $this->request->getPost('zzz');
        $t2 = $this->request->getPost('xxzx');
        $t3 = $this->request->getPost('ty');

        $session->set('dper_' . $t1, $t2);
        $session->set('tper_' . $t1, $t3);
        echo json_encode(['return' => true]);
    }
    public function findproduct($code)
    {
        $db = db_connect();
        $store_id = $this->store;
        $store = $this->StoreModel->find($store_id);


        $barcode_prefix = strtoupper(mb_substr($store->name, 0, 1, "UTF-8")) . strtoupper(mb_substr($store->city, 0, 1, "UTF-8"));
        // $code = str_replace($barcode_prefix, '', $code);

        $product = $db->table('products')->where('code', $code)->get()->getRow();
        // if (is_numeric($code)) {
        //     $product = $db->table('products')->where('id', $code)->get()->getRow();
        // } else {
        //     $product = $db->table('products')->like('code', $code)->get()->getRow();
        // }

        echo $product ? $product->id : '';
        return;
    }
    public function findproductkar($code)
    {
        $product = db_connect()->table('products')->where('code', $code)->get()->getRow();
        echo $product ? $product->id : '';
    }
    public function lookupcc()
    {
        $q = $this->request->getPost('keyword');
        $v = $this->request->getPost('vv');

        $html = '';

        if (!empty($q)) {
            $builder = db_connect()->table('products');
            $builder->like('name', $q);
            $results = $builder->get()->getResult();

            $html .= '<ul id="state-list">';
            foreach ($results as $row) {
                $html .= '<li onClick=\'selectState("' . $row->name . '",' . $v . ',' . $row->id . ',' . $row->price . ',' . $row->tax . ',' . $row->sgst . ')\'>'
                    . $row->name . '</li>';
            }
            $html .= '</ul>';
        }

        echo $html;
    }

    public function openregister($id = 0)
    {
        $db = db_connect();
        $session = session();

        // Insert log entry
        $db->table('logfiles')->insert([
            'type' => 6,
            'ttime' => date("Y-m-d H:i:s")
        ]);

        // Get settings
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();

        if ($this->request->getMethod() == 'POST' && $this->request->getPost()) {
            $cash = $this->request->getPost('cash');
            $id = $this->request->getPost('store');

            $register_data = [
                'status' => 1,
                'user_id' => $session->get('user_id'),
                'cash_inhand' => $cash,
                'store_id' => $id
            ];
            $db->table('registers')->insert($register_data);
            $register_id = $db->insertID();

            $db->table('holds')->insert([
                'number' => 1,
                'time' => date("H:i"),
                'register_id' => $register_id
            ]);

            $db->table('stores')->where('id', $id)->update(['status' => 1]);

            $session->set('register', $register_id);
            $session->set('store', $id);

            return redirect()->to('/');
        }

        $open_reg = $db->table('registers')->where([
            'store_id' => $id,
            'status' => 1
        ])->get()->getRow();

        if ($open_reg) {
            $session->set('register', $open_reg->id);
            $session->set('store', $id);
        } else {
            $db->table('registers')->insert([
                'status' => 1,
                'user_id' => $session->get('user_id'),
                'cash_inhand' => 0,
                'store_id' => $id
            ]);

            $insertID = $db->insertID();

            session()->set('register', $insertID);
            session()->set('store', $id);
        }

        return redirect()->to('/dashboard/posview');
    }

    public function switshregister()
    {
        $session = session();
        $session->set('register', 0);
        $session->set('store', 0);
        return redirect()->to('/');
    }
    public function addpdc()
    {
        $db = db_connect();
        $session = session();

        $prty = $this->request->getPost('product_id');
        $payment_price = $this->request->getPost('payment_price');
        $session->set('payment_price', $payment_price);

        // Check active offer
        $today = date('Y-m-d');
        $is_offer = $db->table('offers')
            ->where('of_proid', $prty)
            ->where('of_validfrom <=', $today)
            ->where('of_validtill >=', $today)
            ->get()->getRow();

        // Check sale qty
        $check_qty = $db->table('sale_items')
            ->select("SUM(qt) AS sale_qty")
            ->where('product_id', $prty)
            ->where('date <=', $today)
            ->where('date >=', $today)
            ->get()->getRow();

        // Get product
        $product = $this->ProductModel->find($prty);


        if (!$product) {
            echo "ERROR~Product not found";
            return;
        }
        $PostPrice = $product->price;
        if (!empty($is_offer)) {
            $offer_qty = $is_offer->qty ?? 0;
            if (($check_qty->sale_qty ?? 0) <= $offer_qty) {
                $PostPrice = $is_offer->of_offerprice;
            }
        }

        $rrate = $product->rrate ?? 0;

        // Get settings
        $settings = $this->setting; // assume already loaded or injected

        $xcust = (int)$this->request->getPost('xcust');
        if ($xcust > 0) {
            $custstate = $db->table('customers')->select('custstate')->where('id', $xcust)->get()->getRow('custstate');
            $tg = ($settings->mystate == $custstate) ?
                ((int)$product->tax + (int)$product->sgst) :
                (int)$product->igst;
        } else {
            $tg = (int)$product->tax + (int)$product->sgst;
        }

        // Calculate price
        $register_id = $this->request->getPost('registerid');
        $register = $this->RegisterModel->find($this->register); // Assuming you're using a model or custom class
        $price = (!$product->taxmethod || $product->taxmethod == '0')
            ? (float)$PostPrice
            : (float)$PostPrice * (1 + $tg / 100);

        // Stock quantity check
        $quantity = (isset($settings->maininv) && (int)$settings->maininv == 1)
            ? ($db->table('stocks')->select('COALESCE(quantity, 0) as quantity')
                ->where(['store_id' => $register->store_id, 'product_id' => $prty])
                ->get()->getRow('quantity'))
            : 100000;

        // Check if product already exists in posales
        $posale = $db->table('posales')
            ->select('id, qt')
            ->where([
                'status' => 1,
                'register_id' => $this->register,
                'product_id' => $prty,
                'user_id' => $session->get('user_id')
            ])
            ->get()->getRow();

        if ($posale) {
            if ($posale->qt < $quantity) {
                $db->table('posales')->where('id', $posale->id)->set('qt', 'qt+1', false)->update();
            } else {
                echo 'stock~0~0~' . $quantity;
                return;
            }
        } else if ($quantity > 0) {
            $db->table('posales')->insert([
                "product_id" => $prty,
                "name" => $product->name,
                "price" => $price,
                "org_price" => $PostPrice,
                "mrpp" => $rrate,
                "number" => $this->request->getPost('number'),
                "register_id" => $register_id,
                "user_id" => $session->get('user_id'),
                "qt" => 1,
                "status" => 1
            ]);
        } else {
            echo 'stock~0~0~' . $quantity;
            return;
        }

        echo "TRUE~" . $this->calculateTotals();
    }
    private function calculateTotals()
    {
        $db = db_connect();
        $session = session();

        $result = $db->table('posales')
            ->select('COALESCE(SUM(qt), 0) as sub, COALESCE(SUM(price * qt), 0) as subtotal')
            ->where([
                'status' => 1,
                'register_id' => $this->register,
                'user_id' => $session->get('user_id')
            ])
            ->get()->getRow();

        return $result->sub . '~' . $result->subtotal;
    }
    public function addpdc_qt()
    {
        $db = db_connect();
        $session = session();

        $productId = $this->request->getPost('product_id');
        $xcust = $this->request->getPost('xcust');

        $product = $this->ProductModel->find($productId);
        $postPrice = $product->price;

        if ($xcust > 0) {
            $rty = $db->table('settings')->where('id', 1)->get()->getRowArray();
            $rtct = $db->table('customers')->where('id', $xcust)->get()->getRowArray();
            $tg = ($rty['mystate'] == $rtct['custstate']) ? $product->tax + $product->sgst : $product->igst;
        } else {
            $tg = $product->tax + $product->sgst;
        }

        $register = $this->RegisterModel->find($this->register);
        $price = (!$product->taxmethod || $product->taxmethod == '0') ? (float)$postPrice : (float)$postPrice * (1 + $tg / 100);

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $quantity = (intval($settings['maininv']) === 1)
            ? ($stock = $this->StockModel->where('store_id', $register->store_id)->where('product_id', $productId)->first())?->quantity ?? 0
            : 100000;

        $posale = Posaleq::where([
            'status' => 1,
            'register_id' => $this->register,
            'product_id' => $productId,
            'user_id' => $session->get('user_id')
        ])->first();

        if ($posale) {
            if ($posale->qt < $quantity) {
                $db->table('posaleqs')->where('id', $posale->id)->set('qt', 'qt+1', false)->update();
                return $this->response->setJSON(['status' => true]);
            } else {
                echo 'stock~' . $quantity;
                return;
            }
        } elseif ($quantity != 0) {
            Posaleq::insert([
                "product_id" => $productId,
                "name" => $this->request->getPost('name'),
                "price" => $price,
                "number" => $this->request->getPost('number'),
                "register_id" => $this->request->getPost('registerid'),
                "user_id" => $session->get('user_id'),
                "qt" => 1,
                "status" => 1
            ]);
            return $this->response->setJSON(['status' => true]);
        } else {
            echo 'stock~' . $quantity;
        }
    }
    public function qttaddpdc()
    {
        $db = db_connect();
        $session = session();
        $jk = $this->request->getPost('jk');
        $xcust = $this->request->getPost('xcust');

        $_SESSION['custkid'] = $xcust;

        $items = $db->table('sale_itemqs')->where('sale_id', $jk)->get()->getResult();

        foreach ($items as $item) {
            $prty = $item->purcitemid;
            $kpqt = $item->qt;

            $purchaseItem = $db->table('purchase_items')->where('id', $prty)->get()->getRow();
            $posale = $db->table('posales')
                ->where('purid', $prty)
                ->where('user_id', $session->get('user_id'))
                ->get()->getRow();

            $product = $this->ProductModel->find($purchaseItem->product_id);
            $postPrice = $purchaseItem->selling;

            $tg = ($xcust > 0)
                ? (($db->table('settings')->where('id', 1)->get()->getRow()->mystate == $db->table('customers')->where('id', $xcust)->get()->getRow()->custstate)
                    ? $product->tax + $product->sgst
                    : $product->igst)
                : $product->tax + $product->sgst;

            $price = (!$product->taxmethod || $product->taxmethod == '0') ? floatval($postPrice) : floatval($postPrice) * (1 + $tg / 100);
            $quantity = $purchaseItem->avlqty;

            $ffmal = ($kpqt <= $quantity) ? $kpqt : (($quantity > 0) ? 1 : 0);

            if ($product->type === '0') {
                $existing = $this->PosaleModel->where([
                    'status' => 1,
                    'register_id' => $this->register,
                    'product_id' => $product->id,
                    'purid' => $prty
                ])->find()->first();

                if ($existing) {
                    if ($kpqt <= $quantity) {
                        $existing->qt++;
                        $existing->save();
                        return $this->response->setJSON(['status' => true]);
                    } else {
                        echo 'stock';
                        return;
                    }
                } elseif ($quantity > 0) {
                    $this->PosaleModel->insert([
                        "product_id" => $product->id,
                        "purid" => $prty,
                        "name" => $product->name,
                        "price" => $price,
                        "number" => 1,
                        "register_id" => $this->register,
                        "user_id" => $session->get('user_id'),
                        "qt" => $ffmal,
                        "status" => 1
                    ]);
                } else {
                    echo 'stock';
                    return;
                }
            }
        }

        return $this->response->setJSON(['status' => true]);
    }
    public function searchitems()
    {
        $term = $this->request->getGet('term');
        $db = db_connect();

        $results = $db->query("SELECT * FROM products WHERE name REGEXP '^{$term}' LIMIT 5")->getResultArray();

        $return_arr = [];
        foreach ($results as $row) {
            $return_arr[] = [
                'itemCode' => $row['id'],
                'itemDesc' => $row['name'],
                'itemPrice' => $row['price']
            ];
        }

        return $this->response->setJSON($return_arr);
    }
    public function addpdckkar()
    {
        $db = db_connect();
        $session = session();

        $productId = $this->request->getPost('product_id');
        $PostPrice = $this->request->getPost('price');
        $war = $this->request->getPost('warsel');
        $session->set('warrrr', $war);

        $product = $this->ProductModel->find($productId);

        // Get warehouse stock quantity
        $purchaseQty = $db->table('purchase_items')
            ->selectSum('qt', 'wer_qty')
            ->where(['warehouse_id' => $war, 'product_id' => $productId])
            ->get()->getRow('wer_qty') ?? 0;

        $transferInQty = $db->table('stock_transfer')
            ->selectSum('qty', 'add_qty')
            ->where(['war_id' => $war, 'pro_id' => $productId, 'perchaseid' => '', 'tyoftrans' => 1])
            ->get()->getRow('add_qty') ?? 0;

        $transferOutQty = $db->table('stock_transfer')
            ->selectSum('qty', 'add_qty')
            ->where(['war_id' => $war, 'pro_id' => $productId, 'tyoftrans' => 6])
            ->get()->getRow('add_qty') ?? 0;

        $availableStock = intval($purchaseQty) - intval($transferInQty) - intval($transferOutQty);

        // $price = (!$product->taxmethod || $product->taxmethod == '0') ?
        $price = (!isset($product['taxmethod']) || $product['taxmethod'] == '0') ?
            floatval($PostPrice) :
            floatval($PostPrice) * (1 + $product->tax / 100);

        $existingSale = $this->PosaleModel->where([
            'status' => 5,
            'register_id' => $this->register,
            'product_id' => $productId,
            'user_id' => $session->get('user_id'),
        ])->first();

        if ($existingSale) {
            if ($existingSale->qt < $availableStock) {
                $existingSale->qt += 1;
                $db->table('posales')->where('id', $existingSale->id)->update(['qt' => $existingSale->qt]);
                return $this->response->setJSON(['status' => true]);
            } else {
                echo 'stock~' . $availableStock;
                return;
            }
        } elseif ($availableStock > 0) {
            $this->PosaleModel->insert([
                'product_id' => $productId,
                'name' => $this->request->getPost('name'),
                'price' => $price,
                'number' => $this->request->getPost('number'),
                'register_id' => $this->request->getPost('registerid'),
                'user_id' => $session->get('user_id'),
                'qt' => 1,
                'status' => 5
            ]);
            return $this->response->setJSON(['status' => true]);
        } else {
            echo 'stock~' . $availableStock;
        }
    }


    public function load_pogoods($cc = 0)
    {
        $db = db_connect();
        $session = session();
        $currency = Setting_model::find(1)->currency;

        $posales = $this->PosaleModel->where([
            'status' => 5,
            'register_id' => $this->register,
            'user_id' => $session->get('user_id')
        ])->findAll();

        $data = '';

        if (!empty($posales)) {
            foreach ($posales as $posale) {
                $war = $session->get('warrrr');
                $productId = $posale['product_id'];

                // Inventory calculations
                $purchaseQty = $db->table('purchase_items')->selectSum('qt', 'wer_qty')->where(['warehouse_id' => $war, 'product_id' => $productId])->get()->getRow('wer_qty') ?? 0;
                $transferIn = $db->table('stock_transfer')->selectSum('qty', 'add_qty')->where(['war_id' => $war, 'pro_id' => $productId, 'perchaseid' => '', 'tyoftrans' => 1])->get()->getRow('add_qty') ?? 0;
                $transferOut = $db->table('stock_transfer')->selectSum('qty', 'add_qty')->where(['war_id' => $war, 'pro_id' => $productId, 'tyoftrans' => 6])->get()->getRow('add_qty') ?? 0;
                $stockQty = intval($purchaseQty) - intval($transferIn) - intval($transferOut);

                // Session discounts
                $dperKey = 'dper_' . $posale['id'];
                $tperKey = 'tper_' . $posale['id'];

                if (!session()->has($dperKey)) session()->set($dperKey, 0);
                if (!session()->has($tperKey)) session()->set($tperKey, 0);

                $product = $this->ProductModel->find($productId);
                $discountAmount = (int)$product->descountperr * (float)$posale['price'] * (int)$posale['qt'] / 100;

                session()->set($dperKey, $product->descountperr);
                session()->set($tperKey, $discountAmount);

                $alert = ($stockQty <= $posale['qt']) ? 'background-color:pink' : '';

                // HTML row (same as CI3, should move to view file ideally)
                $row = '<div class="col-xs-12"><div class="panel panel-default product-details"><div class="panel-body" style="' . $alert . ';padding: 5px;">
                <div class="col-xs-2 nopadding">
                    <div class="col-xs-4 nopadding">
                        <a href="javascript:void(0)" onclick="delete_posale(' . "'" . $posale['id'] . "'" . ')"><span class="fa-stack fa-sm productD"><i class="fa fa-circle fa-stack-2x delete-product"></i><i class="fa fa-times fa-stack-1x fa-fw fa-inverse" style="color: #fff;"></i></span></a>
                    </div>
                    <div class="col-xs-8 nopadding">
                        <span class="textPD">' . $posale['product_id'] . '</span>
                    </div>
                </div>
                <div class="col-xs-3 nopadding">
                    <span class="textPD">' . $posale['name'] . '</span>
                </div>
                <div class="col-xs-2 nopadding productNum">
                    <input type="hidden" name="idd[]" id="idd-' . $posale['id'] . '" value="' . $posale['product_id'] . '">
                    <input type="text" name="qtt[]" id="qt-' . $posale['id'] . '" onchange="edit_posale(' . $posale['id'] . ')" class="form-control" value="' . $posale['qt'] . '">
                </div>
                <div class="col-xs-2 nopadding"><span class="textPD" id="subtot-' . $posale['id'] . '">' . $stockQty . '</span></div>
            </div></div></div>';

                $data .= $row;
            }

            // Append script for +/– buttons
            $data .= '<script type="text/javascript">$(".incbutton").on("click", function() {
            var $button = $(this);
            var oldValue = $button.closest("div").find("input").val();
            var newVal = parseFloat(oldValue) + 1;
            $button.closest("div").find("input").val(newVal);
            edit_posale($button.closest("div").find("input").attr("id").slice(3));
        });
        $(".decbutton").on("click", function() {
            var $button = $(this);
            var oldValue = $button.closest("div").find("input").val();
            var newVal = oldValue > 1 ? parseFloat(oldValue) - 1 : 1;
            $button.closest("div").find("input").val(newVal);
            edit_posale($button.closest("div").find("input").attr("id").slice(3));
        });</script>';
        } else {
            $data = '<div class="messageVide">' . label("EmptyList") . ' <span>(' . label("SelectProduct") . ')</span></div>';
        }

        echo $data;
    }
    public function load_pogoodsed($segg)
    {
        $db = db_connect();
        $session = session();
        $setting = Setting_model::find(1);
        $data = '';

        $goodsItems = $db->table('goodsitems')->where('goodsid', $segg)->get()->getResultArray();

        foreach ($goodsItems as $posale) {
            $war = $session->get('warrrr');
            $productId = $posale['product_id'];

            // Calculate total stock
            $purchaseItems = $db->table('purchase_items')->where(['warehouse_id' => $war, 'product_id' => $productId])->get()->getResultArray();
            $purchaseQty = array_sum(array_column($purchaseItems, 'qt'));

            $stockTransfers = $db->table('stock_transfer')->where(['war_id' => $war, 'pro_id' => $productId])->get()->getResultArray();
            $transferQty = array_sum(array_column($stockTransfers, 'qty'));

            $availableStock = $purchaseQty - $transferQty;

            // Discount session keys
            $dperKey = 'dper_' . $posale['id'];
            $tperKey = 'tper_' . $posale['id'];

            if (!isset($_SESSION[$dperKey])) $_SESSION[$dperKey] = 0;
            if (!isset($_SESSION[$tperKey])) $_SESSION[$tperKey] = 0;

            $product = $this->ProductModel->find($productId);
            $storeId = $this->RegisterModel->find($this->register)->store_id;
            $productRow = $db->table('products')->where('id', $productId)->get()->getRowArray();

            $discountValue = ($productRow['descountperr'] * $posale['price'] * $posale['qt']) / 100;

            $_SESSION[$dperKey] = $productRow['descountperr'];
            $_SESSION[$tperKey] = $discountValue;

            $highlightStyle = $availableStock <= $posale['qt'] ? 'background-color:pink' : '';

            // Generate HTML row (same structure as original)
            $row = '<div class="col-xs-12"><div class="panel panel-default product-details"><div class="panel-body" style="' . $highlightStyle . ';padding: 5px;">
        <div class="col-xs-2 nopadding"><div class="col-xs-4 nopadding">
        <a href="javascript:void(0)" onclick="delete_posale(\'' . $posale['id'] . '\')">
        <span class="fa-stack fa-sm productD"><i class="fa fa-circle fa-stack-2x delete-product"></i>
        <i class="fa fa-times fa-stack-1x fa-fw fa-inverse"></i></span></a></div>
        <div class="col-xs-8 nopadding"><span class="textPD">' . $productId . '</span></div></div>
        <div class="col-xs-3 nopadding"><span class="textPD">' . $posale['name'] . '</span></div>
        <div class="col-xs-2 nopadding productNum">
        <input type="text" name="idd[]" id="idd-' . $posale['id'] . '" value="' . $productId . '" maxlength="4">
        <input type="text" name="qtt[]" id="qt-' . $posale['id'] . '" onchange="edit_posale(' . $posale['id'] . ')" class="form-control" value="' . $posale['qt'] . '" maxlength="4"></div>
        <div class="col-xs-2 nopadding "><span class="textPD" id="subtot-' . $posale['id'] . '">' . $availableStock . '</span></div></div></div></div>';

            $data .= $row;
        }

        if (empty($goodsItems)) {
            $data = '<div class="messageVide">' . label("EmptyList") . ' <span>(' . label("SelectProduct") . ')</span></div>';
        }

        echo $data;
    }
    public function load_posales($cc = 0)
    {
        $db = $this->db;
        $session = session();
        $data = '';
        $setting = $this->setting;

        $filter = ['status' => 1, 'register_id' => $this->register, 'user_id' => $session->get('user_id')];

        $posales = $this->PosaleModel->where($filter)->orderBy('id', 'DESC')->findAll();

        // print_r($posales);

        foreach ($posales as $posale) {
            $product = $this->ProductModel->find($posale->product_id);
            $PostPrice = $posale->price;
            $mrpp = $posale->mrpp;
            $storeid = $this->RegisterModel->find($this->register)->store_id;

            $productRow = $db->table('products')->select('id, descountperr')->where('id', $posale->product_id)->get()->getRowArray();

            $olqp = (floatval($productRow['descountperr']) * floatval($PostPrice) * floatval($posale->qt)) / 100;
            $olxx = floatval($PostPrice) * floatval($posale->qt);

            $stock = $this->StockModel->where(['product_id' => $posale->product_id, 'store_id' => $storeid])->first();
            $quantity = $stock->quantity ?? 0;

            $highlightStyle = ($product->type == '0' && ($quantity - $posale->qt) <= $product->alertqt) ? 'background-color:pink' : '';

            $row = '<div class="col-xs-12" style="padding: 0px;"><div class="panel panel-default product-details"><div class="panel-body" style="' . $highlightStyle . ';padding: 5px;">';
            $row .= '<div class="col-xs-1 nopadding" style="padding-right: 5px;width: 5%;  padding-left: 5px;"><span class="textPDrm">' . $productRow['id'] . '</span></div>';
            $row .= '<div class="col-xs-3 nopadding"  style="text-align: center; width: 25%;"><span class="textPD">' . $posale->name . '</span></div>';
            $row .= '<div class="col-xs-1" style="padding-right: 5px;padding-left: 5px;text-align: center; width: 10%;"><span class="textPDr">' . number_format((float)$mrpp, $setting->decimals, '.', '') . '</span></div>';
            $row .= '<div class="col-xs-1" style="padding-right: 5px;padding-left: 5px;text-align: center; width: 10%;"><input style="width: 100%;" onchange="edit_posalepp(' . $posale->id . ')" type="text" id="rrt-' . $posale->id . '" class="form-control" value="' . number_format((float)$PostPrice, $setting->decimals, '.', '') . '"></div>';
            $row .= '<div class="col-xs-1" style="padding-right: 1px;padding-left: 5px;text-align: center; width: 10%;"><input style="width: 100%;" type="text" id="qt-' . $posale->id . '" onkeyup="edit_posale(' . $posale->id . ')" class="form-control" value="' . $posale->qt . '"></div>';

            if ($setting->disc_pro == 1) {
                $session->set('tper_' . $posale->id, $productRow['descountperr']);
                $session->set('dper_' . $posale->id, $olqp);
                $row .= '<div class="col-xs-1" style="width:10%;text-align: center;padding-right: 1px;padding-left: 1px;"><input style="width: 100%;" type="text" id="dispe-' . $posale->id . '" onkeyup="return discounn(' . $posale->id . ')" class="form-control" value="' . $productRow['descountperr'] . '"></div>';
                $row .= '<div class="col-xs-1" style="width:10%;text-align: center;padding-right: 1px;padding-left: 1px;"><input style="width: 100%;" readonly type="text" id="disamt-' . $posale->id . '" class="form-control" value="' . $olqp . '"></div>';
            }

            $row .= '<div class="col-xs-1" style="text-align: center;width: 10%;"><span class="-2 textPD-2" style="float: center;" id="subtot-' . $posale->id . '">' . number_format($olxx, $setting->decimals, '.', '') . '</span></div>';
            $row .= '<div class="col-xs-1" style="width: 10%;"><a href="javascript:void(0)" onclick="delete_posale(\'' . $posale->id . '\')"><span class="fa fa-times"></span></a></div>';

            if ($setting->disc_pro != 1) {
                $row .= '<div class="col-xs-1"><input type="checkbox" name="ckks-' . $posale->id . '" id="ckks-' . $posale->id . '" value="1" checked></div>';
            }

            $row .= '</div></div></div>';
            $data .= $row;
        }

        if (empty($posales)) {
            $data = '<div class="messageVide">' . label("EmptyList") . ' <span>(' . label("SelectProduct") . ')</span></div>';
        }

        echo $data;
        $db->close();
    }



    public function payment_price_list($payment_price)
    {
        $db = db_connect();
        $session = session();
        $session->set('payment_price', $payment_price);

        $userId = $session->get('user_id');

        $posales = $db->table('posales')
            ->where([
                'status' => 1,
                'register_id' => $this->register,
                'user_id' => $userId
            ])
            ->get()
            ->getResultArray();

        foreach ($posales as $sale) {
            $product = $this->ProductModel->find($sale['product_id']);
            $tg = intval($product->tax) + intval($product->sgst);

            if ($payment_price == 0) {
                $PostPrice = $product->price;
                $org_price = $product->price;
                $mrpp = $product->rrate;
            } else {
                $priceAlt = $db->table('price_marterr')
                    ->where(['pp_pro_id' => $product->id, 'pp_price_type' => $payment_price])
                    ->get()->getRowArray();

                $priceMrp = $db->table('price_mrp')
                    ->where(['pp_pro_id' => $product->id, 'pp_price_type' => $payment_price])
                    ->get()->getRowArray();

                if ($priceAlt) {
                    $PostPrice = $priceAlt['pp_pro_price'];
                    $org_price = $priceAlt['pp_pro_price'];
                    $mrpp = $priceMrp['pp_pro_price'] ?? $product->rrate;
                } else {
                    $PostPrice = $product->price;
                    $org_price = $product->price;
                    $mrpp = $product->rrate;
                }
            }

            $price = (!$product->taxmethod || $product->taxmethod == '0') ?
                floatval($PostPrice) :
                floatval($PostPrice) * (1 + $tg / 100);

            $db->table('posales')->where('id', $sale['id'])->update([
                'price' => $PostPrice,
                'org_price' => $org_price,
                'mrpp' => $mrpp
            ]);
        }
    }
    public function qload_posales($cc = 0)
    {
        $session = session();
        $db = db_connect();
        $setting = Setting_model::find(1);
        $userId = $session->get('user_id');
        $data = '';

        $posales = Posaleq::where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => $userId
        ])->findAll();

        if (!empty($posales)) {
            foreach ($posales as $posale) {
                $product = $this->ProductModel->find($posale['product_id']);
                $storeid = $this->RegisterModel->find($this->register)->store_id;
                $PostPrice = $posale['price'];
                $mrpp = $product->rrate;

                $olqp = ($product->descountperr * $PostPrice * $posale['qt']) / 100;
                $olxx = $PostPrice * $posale['qt'];

                $stock = $this->StockModel->where(['product_id' => $product->id, 'store_id' => $storeid])->first();
                $qty = $stock->quantity ?? 0;

                $alert = ($product->type == '0' && ($qty - $posale['qt']) <= $product->alertqt) ? 'background-color:pink' : '';

                $row = '<div class="col-xs-12"><div class="panel panel-default product-details"><div class="panel-body" style="' . $alert . ';padding: 5px;">
                <div class="col-xs-1"><span class="textPDrm">' . $product->id . '</span></div>
                <div class="col-xs-3">';

                if ($this->setting->editpro == 1) {
                    $row .= '<input onchange="edit_proeditt(' . $posale['id'] . ')" id="prodname-' . $posale['id'] . '" class="form-control" value="' . $posale['name'] . '" />';
                } else {
                    $row .= '<span class="textPD">' . $posale['name'] . '</span>';
                }

                $row .= '</div><div class="col-xs-1"><span>' . number_format($mrpp, $setting->decimals) . '</span></div>';
                $row .= '<div class="col-xs-1"><input id="rrt-' . $posale['id'] . '" onchange="edit_posalepp(' . $posale['id'] . ')" class="form-control" value="' . number_format($PostPrice, $setting->decimals) . '" /></div>';
                $row .= '<div class="col-xs-1"><input id="qt-' . $posale['id'] . '" onchange="edit_posale(' . $posale['id'] . ')" class="form-control" value="' . $posale['qt'] . '" /></div>';

                if ($setting->disc_pro == 1) {
                    $session->set('tper_' . $posale['id'], $product->descountperr);
                    $session->set('dper_' . $posale['id'], $olqp);
                    $row .= '<div class="col-xs-1"><input id="dispe-' . $posale['id'] . '" onkeyup="return discounn(' . $posale['id'] . ')" class="form-control" value="' . $product->descountperr . '"></div>';
                    $row .= '<div class="col-xs-1"><input readonly id="disamt-' . $posale['id'] . '" class="form-control" value="' . $olqp . '"></div>';
                }

                $row .= '<div class="col-xs-2"><span class="subtotal textPD" id="subtot-' . $posale['id'] . '">' . number_format($olxx, $setting->decimals) . '</span></div>';
                $row .= '<div class="col-xs-1"><a href="javascript:void(0)" onclick="delete_posale(\'' . $posale['id'] . '\')"><span class="fa fa-times"></span></a></div>';

                if ($setting->disc_pro != 1) {
                    $row .= '<div class="col-xs-1"><input type="checkbox" name="ckks-' . $posale['id'] . '" id="ckks-' . $posale['id'] . '" checked /></div>';
                }

                $row .= '</div></div></div>';
                $data .= $row;
            }

            // Add optional JS (button controls)
            $data .= '<script>
        $(".incbutton").on("click", function() {
            var $button = $(this);
            var $input = $button.closest("div").find("input");
            $input.val(parseFloat($input.val()) + 1);
            edit_posale($input.attr("id").slice(3));
        });
        $(".decbutton").on("click", function() {
            var $button = $(this);
            var $input = $button.closest("div").find("input");
            var newVal = Math.max(1, parseFloat($input.val()) - 1);
            $input.val(newVal);
            edit_posale($input.attr("id").slice(3));
        });
        </script>';
        } else {
            $data = '<div class="messageVide">' . label("EmptyList") . ' <span>(' . label("SelectProduct") . ')</span></div>';
        }

        echo $data;
    }
    public function delete($id)
    {
        $db = db_connect();
        $db->table('posales')->where('id', $id)->delete();

        return $this->response->setJSON(['status' => true]);
    }
    public function qdelete($id)
    {
        $db = db_connect();
        $db->table('posaleqs')->where('id', $id)->delete();

        return $this->response->setJSON(['status' => true]);
    }
    public function edit($id)
    {
        $db = db_connect();
        $session = session();
        $qt = (int) $this->request->getPost('qt');

        $posale = $this->PosaleModel->find($id);
        if (!$posale) {
            return $this->response->setBody('ERROR~Sale not found');
        }

        $register = $this->RegisterModel->find($this->register);
        $stock = $this->StockModel->where(['store_id' => $register->store_id, 'product_id' => $posale->product_id])->first();

        $is_offer = $db->table('offers')
            ->where('of_proid', $posale->product_id)
            ->where('of_validfrom <=', date('Y-m-d'))
            ->where('of_validtill >=', date('Y-m-d'))
            ->get()->getRow();

        $check_qty = $db->table('sale_items')
            ->select('SUM(qt) AS sale_qty')
            ->where('product_id', $posale->product_id)
            ->where('date <=', date('Y-m-d'))
            ->where('date >=', date('Y-m-d'))
            ->get()->getRow();

        if (!empty($is_offer)) {
            $offer_qty = $is_offer->qty;
            $current_sale_qty = intval($check_qty->sale_qty ?? 0);
            if ($current_sale_qty + $qt > $offer_qty) {
                return $this->response->setBody('stock~' . $offer_qty);
            }
        }

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $maininv = $settings['maininv'] ?? 0;

        $quantity = ($maininv == 1) ? ($stock->quantity ?? 0) : 10000;

        if ($qt <= $quantity) {
            $data = ['qt' => $qt];
            $db->table('posales')->where('id', $id)->update($data);

            $posales = $this->PosaleModel->where([
                'status' => 1,
                'register_id' => $this->register,
                'user_id' => $session->get('user_id')
            ])->asArray()->findAll();

            $sub = 0;
            $subtot = 0;
            foreach ($posales as $item) {
                $sub += $item['qt'];
                $subtot += $item['price'] * $item['qt'];
            }

            return $this->response->setBody('TRUE~' . $sub . '~' . $subtot);
        } else {
            return $this->response->setBody('stock~' . $quantity);
        }
    }
    public function qedit($id)
    {
        $db = db_connect();
        $session = session();
        $qt = (int) $this->request->getPost('qt');

        $posale = Posaleq::find($id);
        if (!$posale) {
            return $this->response->setBody('ERROR~Sale not found');
        }

        $product = $this->ProductModel->find($posale->product_id);
        $register = $this->RegisterModel->find($this->register);

        $stock = $this->StockModel->where([
            'store_id' => $register->store_id,
            'product_id' => $posale->product_id
        ])->first();

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $maininv = $settings['maininv'] ?? 0;

        $quantity = ($maininv == 1) ? ($stock->quantity ?? 0) : 10000;

        if ($qt <= $quantity) {
            $db->table('posaleqs')->where('id', $id)->update(['qt' => $qt]);
            return $this->response->setJSON(['status' => true]);
        } else {
            return $this->response->setBody('stock~' . $quantity);
        }
    }
    public function editkar($id)
    {
        $db = db_connect();
        $qt = (int) $this->request->getPost('qt');
        $session = session();

        $posale = $this->PosaleModel->find($id);
        if (!$posale) {
            return $this->response->setBody('ERROR~Sale not found');
        }

        $product = $this->ProductModel->find($posale->product_id);
        $war = $session->get('warrrr');
        $productId = $posale->product_id;

        // Total quantity from purchase_items
        $purchase = $db->table('purchase_items')
            ->selectSum('qt', 'wer_qty')
            ->where(['warehouse_id' => $war, 'product_id' => $productId])
            ->get()->getRow();

        $purchaseQty = (int) ($purchase->wer_qty ?? 0);

        // Quantity from stock_transfer IN
        $stockIn = $db->table('stock_transfer')
            ->selectSum('qty', 'add_qty')
            ->where([
                'war_id' => $war,
                'pro_id' => $productId,
                'perchaseid' => '',
                'tyoftrans' => 1
            ])
            ->get()->getRow();

        $stockInQty = (int) ($stockIn->add_qty ?? 0);

        // Quantity from stock_transfer OUT
        $stockOut = $db->table('stock_transfer')
            ->selectSum('qty', 'add_qty')
            ->where([
                'war_id' => $war,
                'pro_id' => $productId,
                'tyoftrans' => 6
            ])
            ->get()->getRow();

        $stockOutQty = (int) ($stockOut->add_qty ?? 0);

        $availableStock = $purchaseQty - $stockInQty - $stockOutQty;

        if ($qt <= $availableStock) {
            $db->table('posales')->where('id', $id)->update(['qt' => $qt]);
            return $this->response->setJSON(['status' => true]);
        } else {
            return $this->response->setBody('stock');
        }
    }

    public function subtot()
    {
        $session = session();
        $userId = $session->get('user_id');

        $posales = $this->PosaleModel->where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => $userId
        ])->findAll();

        $sub = 0;
        foreach ($posales as $posale) {
            $sub += $posale->price * $posale->qt;
        }

        echo number_format((float) $sub, $this->setting->decimals, '.', '');
    }
    public function qsubtot()
    {
        $session = session();
        $userId = $session->get('user_id');

        $posales = Posaleq::where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => $userId
        ])->findAll();

        $sub = 0;
        foreach ($posales as $posale) {
            $sub += $posale['price'] * $posale['qt'];
        }

        echo number_format((float) $sub, $this->setting->decimals, '.', '');
    }
    public function calcgst()
    {
        echo 0;
    }
    public function calsgst()
    {
        echo 0;
    }
    public function qcalcgst()
    {
        $db = db_connect();
        $session = session();
        $userId = $session->get('user_id');

        $posales = Posaleq::where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => $userId
        ])->findAll();

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $sub = 0;

        if (!empty($settings) && ($settings['gst_tax'] ?? 0) == 1) {
            foreach ($posales as $posale) {
                $product = $this->ProductModel->find($posale['product_id']);
                if ($product && $product->taxmethod == 0) {
                    // Add GST logic here if needed
                    $sub += 0;
                }
            }
            echo number_format((float) $sub, $this->setting->decimals, '.', '');
        } else {
            echo 0;
        }
    }
    public function qcalsgst()
    {
        $db = db_connect();
        $session = session();
        $userId = $session->get('user_id');

        $posales = Posaleq::where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => $userId
        ])->findAll();

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $sub = 0;

        if (!empty($settings) && ($settings['gst_tax'] ?? 0) == 1) {
            foreach ($posales as $posale) {
                $product = $this->ProductModel->find($posale['product_id']);
                if ($product && $product->taxmethod == 0) {
                    // Placeholder logic for SGST if needed
                    $sub += 0;
                }
            }
            echo number_format((float) $sub, $this->setting->decimals, '.', '');
        } else {
            echo 0;
        }
    }
    public function totiems()
    {
        $session = session();
        $userId = $session->get('user_id');

        $posales = $this->PosaleModel->where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => $userId
        ])->findAll();

        $totalItems = 0;
        foreach ($posales as $posale) {
            $totalItems += $posale->qt;
        }

        echo $totalItems;
    }
    public function qtotiems()
    {
        $session = session();
        $userId = $session->get('user_id');

        $posales = Posaleq::where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => $userId
        ])->findAll();

        $totalItems = 0;
        foreach ($posales as $posale) {
            $totalItems += $posale->qt;
        }

        echo $totalItems;
    }
    public function GetDiscount($id)
    {
        $db = db_connect();
        $session = session();
        $userId = $session->get('user_id');

        $posales = $db->table('posales')
            ->where([
                'status' => 1,
                'register_id' => $this->register,
                'user_id' => $userId
            ])
            ->get()->getResultArray();

        foreach ($posales as $sale) {
            $product = $this->ProductModel->find($sale['product_id']);
            $PostPrice = $sale['org_price'];

            if ($id > 0) {
                $customer = $this->CustomerModel->find($id);
                $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
                $custRow = $db->table('customers')->where('id', $id)->get()->getRowArray();

                $tg = ($settings['mystate'] == $custRow['custstate']) ?
                    intval($product->tax) + intval($product->sgst) :
                    intval($product->igst);
            } else {
                $tg = intval($product->tax) + intval($product->sgst);
            }

            $price = (!$product->taxmethod || $product->taxmethod == '0') ?
                floatval($PostPrice) :
                floatval($PostPrice) * (1 + $tg / 100);

            $db->table('posales')->where('id', $sale['id'])->update(['price' => $price]);
        }

        if ($id > 0) {
            $customer = $this->CustomerModel->find($id);
            echo $customer->discount . '~' . $customer->name . '~' . $customer->phone . '~' . $customer->creddate . '~' . $customer->tot_creaditpoint;
        } else {
            echo '0~Walkin Customer~0~0~0';
        }
    }
    // File: app/Controllers/Pos.php

    public function qGetDiscount()
    {
        $product_id = $this->request->getPost('product_id');
        $cart = session()->get('cart') ?? [];
        $discount = '';

        foreach ($cart as $item) {
            if ($item['id'] === $product_id) {
                $discount = $item['discount'] ?? '';
                break;
            }
        }

        return $this->response->setJSON(['discount' => $discount]);
    }
    // File: app/Controllers/Pos.php

    public function ResetPos()
    {
        session()->set('custkid', 0);
        $this->PosaleModel->where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => session()->get('user_id')
        ])->delete();


        echo json_encode(array(
            "status" => TRUE
        ));


        // session()->remove([
        //     'cart',
        //     'customer',
        //     'registerid',
        //     'custtypediscount',
        //     'customerid'
        // ]);


        // echo json_encode(['status' => true]);
    }
    // File: app/Controllers/Pos.php

    public function qResetPos()
    {
        $session = session();

        $session->remove([
            'cart',
            'customer',
            'registerid',
            'custtypediscount',
            'customerid'
        ]);

        return $this->response->setJSON(['status' => 'success']);
    }


    public function addNewSaleNew($type)
    {
        $session = session();

        $postData = $this->request->getPost([
            'mobnnm',
            'kms',
            'custrrf',
            'clientname',
            'client_id',
            'total',
            'subtotal',
            'discountamount',
            'discount_indujul',
            'paid',
            'recivamt2',
            'recivamt',
            'qt_id'
        ]);

        $registerId = $session->get('register');
        $userId = $session->get('user_id');

        $posaleModel = new PosaleModel();
        $posales = $posaleModel->where([
            'status' => 1,
            'register_id' => $registerId,
            'user_id' => $userId
        ])->findAll();

        if (empty($posales) || floatval($postData['total']) <= 0) {
            return '<center><h1 style="color:#34495E">Empty</h1></center>';
        }

        $custModel = new CustomerModel();
        $custId = (int) $postData['client_id'];

        if ($custId == 0 && strlen($postData['mobnnm']) > 9) {
            $existingCustomer = $custModel->where('phone', $postData['mobnnm'])->first();
            if (!$existingCustomer) {
                $custId = $custModel->insert([
                    'name' => $postData['mobnnm'],
                    'phone' => $postData['mobnnm'],
                    'email' => '',
                    'discount' => 0,
                    'created_at' => date("Y-m-d H:i:s"),
                    'custstate' => 'YourState',
                    'custtype' => 1,
                    'birthday_date' => date("Y-m-d"),
                    'anniversary_date' => date("Y-m-d")
                ]);
            } else {
                $custId = $existingCustomer['id'];
            }
        }

        // Stripe Payment handling
        if ($type == 2) {
            Stripe::setApiKey(env('stripe.secretKey'));
            try {
                $charge = Charge::create([
                    'source' => [
                        'number' => $this->request->getPost('ccnum'),
                        'exp_month' => $this->request->getPost('ccmonth'),
                        'exp_year' => $this->request->getPost('ccyear'),
                        'cvc' => $this->request->getPost('ccv')
                    ],
                    'amount' => intval(floatval($postData['paid']) * 100),
                    'currency' => 'usd'
                ]);
            } catch (\Exception $e) {
                return "<p class='bg-danger text-center'>{$e->getMessage()}</p>";
            }
        }

        // Insert sale data into Sales table
        $saleModel = new SaleModel();
        $saleData = [
            'client_id' => $custId,
            'subtotal' => $postData['subtotal'],
            'total' => $postData['total'],
            'paid' => $postData['paid'],
            'register_id' => $registerId,
            // 'created_at' => date("Y-m-d H:i:s"),
            'salesperson' => $userId,
            'totalitems' => array_sum(array_column($posales, 'qt')),
            'mobnnm' => $postData['mobnnm'],
            'discountamount' => $postData['discountamount'],
            'recivamt' => $postData['recivamt'],
        ];

        $saleId = $saleModel->insert($saleData);

        // Update Stock quantities
        $stockModel = new StockModel();
        foreach ($posales as $item) {
            $stock = $stockModel->where([
                'store_id' => $registerId,
                'product_id' => $item->product_id
            ])->asArray()->first();

            if ($stock) {
                $newQty = max(0, $stock['quantity'] - $item->qt);
                $stockModel->update($stock['id'], ['quantity' => $newQty]);
            } else {
                $stockModel->insert([
                    'product_id' => $item->product_id,
                    'store_id' => $registerId,
                    'quantity' => 0,
                    'datte' => date("Y-m-d")
                ]);
            }
        }
        if ($this->setting->disc_all == 1) {
            $sssd = $this->request->getPost('discountamount');
        } else {
            $sssd = $this->request->getPost('discount_indujul');
        }
        // Pass sale data to view for receipt generation
        $store = $this->StoreModel->find($this->register);
        print_r($store);
        return view('sales_invoice_print', [
            'sale' => $saleModel->find($saleId),
            'items' => $posales,
            'customer' => $custModel->find($custId),
            'posales' => $posales,
            'db' => $this->db,
            'setting' => $this->setting,
            'sssd' => $sssd,
            'storeid' => $store->id,
        ]);
    }

    public function AddNewSale($type)
    {


        $kms = $this->request->getPost('kms');
        $custrrf = $this->request->getPost('custrrf');
        $taname = $this->request->getPost('clientname');
        $tycvzz = $this->request->getPost('mobnnm');
        $custidkk = $this->request->getPost('client_id');

        $totasssl = $this->request->getPost('total');

        $session = session();

        $posales = $this->PosaleModel->where(['status' => 1, 'register_id' => $this->register, 'user_id' => $session->get('user_id')])->findAll();
        // print_r($posales);
        // die;
        $sub = 0;
        $subtot = 0;
        foreach ($posales as $posale) {
            $sub += $posale->qt;
            $subtot += $posale->price * $posale->qt;
        }

        if ($totasssl <= 0 || empty($posales)) {
            echo '<center><h1 style="color:#34495E">Empty</h1></center>';
            exit;
        }
        if ($subtot != $subtot) {
            echo '<center><h1 style="color:#34495E">Please check date...</h1></center>';
            exit;
        }



        if ($custidkk == 0 && $tycvzz > 999999999) {
            $checkmy = $this->db->query("SELECT * FROM  customers WHERE phone='" . $tycvzz . "' ORDER BY id ASC ");
            if ($checkmy->getNumRows() == 0) {
                $this->db->query("insert into customers set 
                        name='" . $tycvzz . "',  phone='" . $tycvzz . "', email=0, discount=0,  created_at='" . date("Y-m-d H:i:s") . "',  customeraddress=0, custstate='" . $this->setting->mystate . "', custtype=1,  gstno=0, creddate=0,  shppingad=0, tot_creaditpoint=0,  birthday_date='" . date("Y-m-d") . "', anniversary_date='" . date("Y-m-d") . "' ");
                $custidkk = $this->db->insertID();
                $_POST['client_id'] = $custidkk;
            } else {
                $checkmyf = $checkmy->getRowArray();
                $custidkk = $checkmyf['id'];
                $_POST['client_id'] = $custidkk;
            }
        }

        $sssb = $this->request->getPost('subtotal');
        $qt_id = $this->request->getPost('qt_id');


        if ($this->setting->disc_all == 1) {
            $sssd = $this->request->getPost('discountamount');
        } else {
            $sssd = $this->request->getPost('discount_indujul');
        }

        // $client = $this->CustomerModel->where('id', $custidkk)->find();
        $client = $this->db->table('customers')->where('id', $custidkk)->get()->getRowArray();
        $pott = intval($this->request->getPost('total')) / intval($this->setting->ct_point_perrs);
        $potti = intval($pott);

        $_POST['tot_creaditpoint'] = $potti;
        $_POST['avail_point'] = $potti;
        if ($custidkk > 0 && $potti > 0) {
            // $toototototot = $client->tot_creaditpoint + $potti;
            $toototototot = (isset($client['tot_creaditpoint']) ? $client['tot_creaditpoint'] : 0) + $potti;
            $this->db->query("UPDATE customers SET tot_creaditpoint='" . $toototototot . "' WHERE id='" . $custidkk . "' ");
        }

        if ($custidkk > 0) {
            $tymvxp = $this->db->query("SELECT * FROM customers WHERE id='" . $custidkk . "' ")->getRowArray();
            if ($tymvxp['custstate'] == $this->setting->mystate) {
                $_POST['custstattype'] = 1;
                $txcvukp = 1;
            } else {
                $_POST['custstattype'] = 2;
                $txcvukp = 2;
            }
        } else {
            $_POST['custstattype'] = 1;
            $txcvukp = 1;
        }


        $storeid = $this->RegisterModel->find($this->register)->store_id;
        $date = date("Y-m-d");
        $kmddwe = date("Y-m-d");
        $_POST['created_at'] = $date;
        // $_POST['store_irrdd'] = $storeid;
        $_POST['attime'] = date('Y-m-d H:i:s');
        // $_POST['selddate'] = $kmddwe;
        $_POST['salesperson'] = session()->get('user_id');
        $_POST['yyear'] = $this->setting->regidd;
        $_POST['register_id'] = $this->register;
        $register = $this->RegisterModel->find($this->register);
        $store = $this->StoreModel->find($register->store_id);
        if ($type == 2) {
            try {
                Stripe::setApiKey($this->setting->stripe_secret_key);
                $myCard = array(
                    'number' => $this->request->getPost('ccnum'),
                    'exp_month' => $this->request->getPost('ccmonth'),
                    'exp_year' => $this->request->getPost('ccyear'),
                    "cvc" => $this->request->getPost('ccv')
                );
                $charge = Stripe_Charge::create(array(
                    'card' => $myCard,
                    'amount' => (floatval($this->request->getPost('paid')) * 100),
                    'currency' => $this->setting->currency
                ));
                echo "<p class='bg-success text-center'>" . label('saleStripesccess') . '</p>';
            } catch (Stripe_CardError $e) {
                // Since it's a decline, Stripe_CardError will be caught
                $body = $e->getJsonBody();
                $err = $body['error'];
                echo "<p class='bg-danger text-center'>" . $err['message'] . '</p>';
            }
        }
        unset($_POST['ccnum']);
        unset($_POST['ccmonth']);
        unset($_POST['qt_id']);
        unset($_POST['ccyear']);
        unset($_POST['sals_iidr']);

        unset($_POST['ccv']);
        $paystatus = intval($_POST['paid']) - intval($_POST['total']);
        $_POST['firstpayement'] = $paystatus > 0 ? $_POST['total'] : $_POST['paid'];

        $lkmm = $this->db->query("SELECT * FROM settings")->getRowArray();
        $themblock = $lkmm['themblock'];

        $mes_cash = ((intval($_POST['total']) - intval($_POST['recivamt2'])) <= $_POST['recivamt']) ? ($_POST['total'] - $_POST['recivamt2']) : $_POST['recivamt'];

        $_POST['recivamt'] = $mes_cash;
        $sale_id = $this->SaleModel->createSale($_POST);
        $sale = $this->SaleModel->find($sale_id);
        if ($themblock == 1) {
            $this->db->query("UPDATE sales SET sale_type=1 WHERE id='" . $sale->id . "'");
        }


        $lalid_expl = explode('-', $sale->lalid);

        if (isset($lalid_expl[1]) && $lalid_expl[1] == '0' || isset($lalid_expl[1]) && $lalid_expl[1] == '1') {
            $themblock = $lalid_expl[1];
        }
        // $themblock = 1;


        $ppp = $sale->id;
        $dppp = 0;
        // echo '<pre>';
        if ($themblock == 1) {
            // $dsale_data = $this->request->getPost();
            // $dsale_data['sales_org_id'] = $sale->id;
            // $dsale_data['created_at'] = date("Y-m-d");
            $_POST['sales_org_id'] = $sale->id;
            // $_POST['created_at'] = date("Y-m-d");
            // echo 'POST: ';
            // print_r($_POST);
            // echo 'Dsale array Input: ';
            if (!empty($_POST) && isset($_POST['sales_org_id'])) {
                $dsale_data = $this->request->getPost();
                // $dsale_id = $this->DsaleModel->createDsale($_POST);

                unset($_POST['sale_type']);
                $this->db->table('dsales')->insert($_POST);
                $dsale_id = $this->db->insertID();
                $dsale = $this->DsaleModel->find($dsale_id);
                $dppp = $dsale->id;
                // echo 'Dsale array Output: ';
                // print_r($dsale);
            }
        }
        // echo '</pre>';
        // die;

        if ($themblock == 1) {
            $ttrrt = $dsale->id;
        } else {
            $ttrrt = $sale->id;
        }

        if ($qt_id > 0) {
            $this->db->query("UPDATE saleqs SET sal_id='" . $ppp . "' WHERE id='" . $qt_id . "' ");
        }

        $llk = date("Y-m-d");
        $paidd = $sale->lalamt;
        $pidddd = 0;
        $lalid_expl = explode('~', $sale->lalid);
        for ($tyu = 0; $tyu < count($lalid_expl); $tyu++) {
            if ($lalid_expl[$tyu] > 0) {
                $pidddd++;
            }
        }

        //$pidddd=$sale->lalid;

        $otot = $sale->total;

        $tyhcrr = $sale->created_by;
        if ($pidddd > 0 && $paidd > 0) {
            $paiddrrr = intval($paidd) + intval($sale->recivamt);

            $tyh = $sale->register_id;

            $this->db->query("UPDATE sales SET paid='" . $paiddrrr . "' WHERE id='" . $ppp . "' ");


            if ($themblock == 1) {
                $this->db->query("UPDATE dsales set paid='" . $paiddrrr . "' where id='" . $dppp . "' ");
            }

            if ($otot <= $paiddrrr) {
                $this->db->query("UPDATE sales set status=0 where id='" . $ppp . "' ");

                if ($themblock == 1) {
                    $this->db->query("UPDATE dsales set status=0 where id='" . $dppp . "' ");
                }
            }

            $hhdat = date("Y-m-d H:i:s");
            $this->db->query("INSERT INTO payements ( `date`,paid,paidmethod,created_by,register_id,sale_id) values('" . $llk . "','" . $paidd . "','4','" . $tyhcrr . "','" . $tyh . "','" . $ppp . "')");


            for ($tyu = 0; $tyu < count($lalid_expl); $tyu++) {
                if ($lalid_expl[$tyu] > 0) {
                    $pidddd = $lalid_expl[$tyu];



                    if ($tyu == 1) {
                        $this->db->query("UPDATE  returnss set purcha_sales_id ='" . $ppp . "' , retun_amt_stas=1 , date_retun='" . $hhdat . "'  where re_id='" . $pidddd . "' and rsale_type=0 ");
                    } else if ($tyu == 2) {
                        $this->db->query("UPDATE  returnss set purcha_sales_id ='" . $dppp . "' , retun_amt_stas=1 , date_retun='" . $hhdat . "'  where re_id='" . $pidddd . "' and rsale_type=1 ");
                    }
                }
            }
        }

        $recivamt2 = $sale->recivamt2;
        $firstpayement = $sale->firstpayement;

        $fvom = intval($recivamt2) + intval($firstpayement);


        if ($recivamt2 > 0) {

            $Padtext = explode('~', $sale->paidmethod);
            if ($Padtext[0] == 4) {
                $this->db->query("UPDATE redeem_tab set rr_soldid ='" . $sale->id . "'   where rr_id='" . $Padtext[1] . "' and rr_custid='" . $sale->client_id . "' ");
                $this->db->query("UPDATE sales set  avail_point=0  where client_id='" . $sale->client_id . "' and id!= '" . $sale->id . "' and avail_point>0 ");
            }

            $paisddrcr = $sale->paid + $recivamt2;
            $this->db->query("UPDATE sales set paid='" . $paisddrcr . "' where id='" . $ppp . "' ");

            if ($otot <= $fvom) {
                $this->db->query("UPDATE sales set status=0 where id='" . $ppp . "' ");
                if ($themblock == 1) {
                    $this->db->query("UPDATE dsales set paid='" . $paisddrcr . "' where id='" . $dppp . "' ");
                    $this->db->query("UPDATE dsales set status=0 where id='" . $dppp . "' ");
                }
            }
        }








        foreach ($posales as $posale) {

            $kmll = $this->db->query("SELECT * from products where id='" . $posale->product_id . "' ")->getRowArray();
            if ($this->setting->gst_tax == 1) {
                $cgst = $kmll['tax'];
                $sgst = $kmll['sgst'];
                $gst = intval($cgst) + intval($sgst);
            } else {
                $cgst = 0;
                $sgst = 0;
                $gst = 0;
            }


            $lxm11 = $this->db->query("SELECT * from settings where id=1 ")->getRowArray();

            if (isset($lxm11['disc_pro']) && $lxm11['disc_pro'] == 1) {
                $vper = session()->set('dper_' . $posale->id);
                if ($vper > 0) {
                    $vper = session()->set('dper_' . $posale->id);
                } else {
                    $vper = 0;
                }

                $vamt = session()->set('tper_' . $posale->id);
                if ($vamt > 0) {
                    $vamt = session()->set('tper_' . $posale->id);
                } else {
                    $vamt = 0;
                }
            } else {
                $vper = 0;
                $vamt = 0;
            }




            $nwtc = intval($posale->price) * intval($posale->qt);
            $peral = (100 * $sssd) / $sssb; //persantage

            $nwtcf = intval($nwtc) - intval(intval($nwtc) * intval($peral)) / 100; //persantage



            $this->db->query("INSERT INTO stock_transfer(llvel,rrack,peritemid,war_id,store_id,pro_id,qty,tyoftrans,date,bywhom,perselphy_ids,totamt) 
                        VALUES(1,1,'" . $posale->purid . "',0,'" . $storeid . "','" . $posale->product_id . "','" . $posale->qt . "','2','" . $kmddwe . "','" . $tyhcrr . "','0','" . $nwtcf . "')  ");




            if (isset($kmll['taxmethod']) && $kmll['taxmethod'] > 0) {
                $sinmn = intval($kmll['price']) * intval($posale->qt);
            } else {
                $tyui = 1 + ($gst / 100);
                $tyuif = round($kmll['price'] / $tyui, 2);
                $sinmn = intval($tyuif) * intval($posale->qt);
            }

            $luip = $this->db->query("select * from customers where id='" . $custidkk . "' ")->getRowArray();
            $ccname1 = $taname;
            $ccname3 = $tycvzz;
            if ($custidkk > 0) {
                $ccname2 = $luip['customeraddress'];
                $ccname569 = $luip['shppingad'];
                $ccname570 = $luip['gstno'];
            } else {
                $ccname2 = "";
                $ccname569 = "";
                $ccname570 = "";
            }



            // if (isset($lxm11['mystate']) && isset($luip['custstate']) && $lxm11['mystate'] == $luip['custstate'] || $custidkk == 0 || $custidkk == '') {
            if (isset($lxm11['mystate']) && isset($luip['custstate']) && $lxm11['mystate'] == $luip['custstate'] || $custidkk == 0 || $custidkk == '') {
                $data = array(
                    "product_id" => $posale->product_id,
                    "name" => $posale->name,
                    "price" => $posale->price,
                    "qt" => $posale->qt,
                    "subtotal" => $posale->qt * $posale->price,
                    "sale_id" => $sale->id,
                    "store_irrdd" => $storeid,
                    "cgst" => $cgst,
                    "sgst" => $sgst,
                    "igstt" => 0,
                    "date" => $date,
                    "dis_per" => $vper,
                    "dis_amt" => $vamt,
                    "perprice" => $kmll['cost'],
                    "mrpp" => $kmll['rrate'],
                    "subtotal2" => $sinmn,
                    "tottax" => $gst
                );

                $ddata = array(
                    "product_id" => $posale->product_id,
                    "name" => $posale->name,
                    "price" => $posale->price,
                    "qt" => $posale->qt,
                    "subtotal" => $posale->qt * $posale->price,
                    "sale_id" => isset($dsale->id) ? $dsale->id : 0,
                    "store_irrdd" => $storeid,
                    "cgst" => $cgst,
                    "sgst" => $sgst,
                    "igstt" => 0,
                    "date" => $date,
                    "dis_per" => $vper,
                    "dis_amt" => $vamt,
                    "perprice" => $kmll['cost'],
                    "mrpp" => $kmll['rrate'],
                    "subtotal2" => $sinmn,
                    "tottax" => $gst
                );
            } else {
                $data = array(
                    "product_id" => $posale->product_id,
                    "name" => $posale->name,
                    "price" => $posale->price,
                    "qt" => $posale->qt,
                    "subtotal" => $posale->qt * $posale->price,
                    "sale_id" => $sale->id,
                    "store_irrdd" => $storeid,
                    "cgst" => 0,
                    "sgst" => 0,
                    "igstt" => $kmll['igst'],
                    "date" => $date,
                    "dis_per" => $vper,
                    "dis_amt" => $vamt,
                    "perprice" => $kmll['cost'],
                    "mrpp" => $kmll['rrate'],
                    "subtotal2" => $sinmn,
                    "tottax" => 0
                );

                $ddata = array(
                    "product_id" => $posale->product_id,
                    "name" => $posale->name,
                    "price" => $posale->price,
                    "qt" => $posale->qt,
                    "subtotal" => $posale->qt * $posale->price,
                    "sale_id" => $posale->id,
                    "store_irrdd" => $storeid,
                    "cgst" => 0,
                    "sgst" => 0,
                    "igstt" => $kmll['igst'],
                    "date" => $date,
                    "dis_per" => $vper,
                    "dis_amt" => $vamt,
                    "perprice" => $kmll['cost'],
                    "mrpp" => $kmll['rrate'],
                    "subtotal2" => $sinmn,
                    "tottax" => 0
                );
            }



            $number = $posale->number;
            $register = $this->RegisterModel->find($this->register);
            $prod = $this->ProductModel->find($posale->product_id);




            if ($prod->combo_id > 0) {

                $dif_ttask = $this->db->query("SELECT * FROM purchase_items_combo WHERE purchase_id='" . $prod->combo_id . "'  ")->getResultArray();
                foreach ($dif_ttask as $dif_ttaskf) {
                    $solldd = $dif_ttaskf['qt'] * $posale->qt;

                    $this->StockModel->adjustQuantity((int) $register->store_id, (int) $dif_ttaskf['product_id'], -(int) $solldd);
                }
            } else {
                $this->StockModel->adjustQuantity((int) $register->store_id, (int) $posale->product_id, -(int) $posale->qt);
            }


            $data['store_irrdd'] = $storeid;
            // $data['perprice'] = $perprice;
            $pos = $this->SaleItemModel->createSaleItem($data);
            $ddata['store_irrdd'] = $storeid;
            if ($themblock == 1) {
                $dpos_id = $this->DsaleItemModel->createItem($ddata);
                $dpos = $this->DsaleItemModel->find($dpos_id);
            }
        }



        $myrtax = array();
        $iimyrtax = array();
        $cgsttax = array();
        $iicgsttax = array();
        $cgsttaxamt = array();
        $iicgsttaxamt = array();
        $sgsttax = array();
        $sgsttaxamt = array();
        $summa = array('summ');
        $iisumma = array('iisumm');
        $cgpa = array('cgp');
        $iicgpa = array('cgp');
        $cgamta = array('cgamt');
        $iicgamta = array('cgamt');
        $sgpa = array('sgp');
        $sgpamta = array('sgpamt');
        $mstoe = session()->get('store');

        $mstoef = $this->db->query("select * from stores where id='" . $mstoe . "' ")->getRowArray();

        if ($lxm11['printersizew'] == "1") {

            $ticket = '<h2 style="text-align:center;margin-bottom:-15px;">TAX INVOICE </h2> <div style="width:210mm;font-size:10px;margin-top:1px;margin-left: -10px;padding:30px;" >';

            $ticket .= '<div style="border: 1px solid #333;padding:3px;">
                        <table class="table" style="width:100%;border-top: 0px solid #333;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;margin-top:30px;" cellspacing="0" border="0"  > 
                        <tr>
                        <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
                        <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
                        <tr>
                        <td style="border-top: 0px;font-size:15px;color:#333;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 45px; "></td>
                        </tr>  
                        <tr>
                        <td style="border-top: 0px;font-size:13px;color:#333;"><b>' . $mstoef['name'] . '</b></td>
                        </tr>
                        <tr>
                        <td style="border-top: 0px;">' . nl2br($mstoef['adresse']) . ',' . $mstoef['city'] . ',' . $mstoef['country'] . '</td>
                        </tr>';
            if ($mstoef['phone']) {
                $ticket .= '<tr>
                        <td style="border-top: 0px;" >PHONE: ' . $mstoef['phone'] . '</td>
                        
                        </tr>';
            }

            if ($this->setting->gstnoo) {
                $ticket .= '<tr>
            <td style="border-top: 0px;">GSTIN  : ' . $this->setting->gstnoo . '</td>
            </tr>';
            }

            $rrar = strtotime($sale->created_at);
            $rrarf = date("M d,Y", $rrar);

            $rrarfa = "+" . $sale->creddate . "day";

            $rrarfb = date('M d,Y', strtotime($rrarfa, $rrar));

            $ticket .= '</tbody>
                    </table></td>';



            $ticket .= '
                    <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
                    <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
                                <td style="width:60%;border-top: 0px;font-size:15px;"><b>Invoice No </b> </td>
                                <td style="border-top: 0px;font-size:13px;text-align:right;">' . $ttrrt . '</td>
                                </tr>
                                <tr style="background:#89b03e !important;color:#fff;">
                                <td style="border-top: 0px;font-size:13px;">Amount Due</td>
                                <td style="border-top: 0px;font-size:13px;text-align:right;">' . number_format((float) $sale->total, $this->setting->decimals, '.', '') . '</td>
                                </tr>
                            <tr>
                                <td style="border-top: 0px;font-size:13px;">Invoice Date  </td>
                                <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarf . '</td>
                                </tr>
                                <tr>
                                <td style="border-top: 0px;font-size:13px;">Due Date  </td>
                                <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarfb . '</td>
                                </tr>
                                </tr>
                    </tbody>
                    </table></td></tr></table><br>';

            $ticket .= '<table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0"  > 
                <tr>
                <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
                <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Buyer</b></td>
            </tr>';
            if ($sale->clientname) {
                $ticket .= '<tr>
            <td style="border-top: 0px;">' . $sale->clientname . '</td>
            </tr>';
            }
            if ($ccname2) {

                $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname2) . '</td>
            </tr>';
            }
            if ($sale->mobnnm) {

                $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
            }

            if ($ccname570) {

                $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
            }


            $ticket .= '</tbody>
            </table></td>';

            $ticket .= '
            <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Ship To</b></td>
            </tr>';


            if ($ccname569) {

                $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname569) . '</td>
            </tr>';
            }
            if ($sale->mobnnm) {

                $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
            }

            if ($ccname570) {

                $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
            }
            $ticket .= '</tbody>
            </table></td></tr></table></div>';



            $PayMethode = explode('~', $sale->paidmethod);


            $ticket .= '<br>';

            $ticket .= '<table class="table" cellspacing="0" border="0" style="margin-bottom: 0px;"><thead>
            <tr style="background:#89b03e !important;color:#fff;font-weight:600;">
            <th style="width:10px;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">S.No</th>

            <th style="width:60mm;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">' . label("Product") . ' Description</th>

            <th style="width:15mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("HSN") . '</th>
            <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("GST") . '</th>

        

            <th style="width:10mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Qty") . '</th>
        

            
            
            <th  style="width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Rate") . '</th>
            <th  style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Per") . '</th>

            <th style="text-align:center;width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . label("Total") . '</th>
            </tr></thead><tbody>';


            $i = 1;
            $vamttt = 0;
            $tkmx45 = 0;
            $mkm = 0;
            $cgst = 0;
            $cgsta = 0;
            foreach ($posales as $posale) {

                $mkm++;
                $kmkm = ($this->db->query("SELECT * FROM products WHERE id='" . $posale->product_id . "' "))->getRowArray();


                if ($txcvukp == 1) {
                    $ovtax = $kmkm['tax'];
                } else {
                    $ovtax = $kmkm['igst'];
                }
                $tymsk = $ovtax;
                $tymsk1 = ($tymsk / 100) + 1;


                $rtcc = round($posale->price / $tymsk1, 2); //10
                if ($kmkm['combo_id'] > 0) {


                    $dif_ttask = $this->db->query("SELECT * FROM purchase_items_combo WHERE purchase_id='" . $kmkm['combo_id'] . "'  ")->getResultArray();
                    foreach ($dif_ttask as $dif_ttaskf) {
                        $posale_product_id = $dif_ttaskf['product_id'];


                        $ovtax = $dif_ttaskf['cgst'];
                        $rtcc = 0;
                        $tymsk = $ovtax;
                        $tymsk1 = ($tymsk / 100) + 1;


                        $act_price = $dif_ttaskf['subtot'] / $dif_ttaskf['qt'];
                        $rtcc = round($act_price / $tymsk1, 2);


                        $yrq = $this->db->query("SELECT * FROM taxprolist WHERE proid='" . $posale_product_id . "' ")->getResultArray();
                        foreach ($yrq as $yrqf) {


                            $myrtax[] = $yrqf['taxid'];

                            if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                            {

                                $ll = $yrqf['taxid'];
                                $mn = 'cgg_' . $ll;
                                $cgsta = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100;
                                $cgst = $$mn + $cgsta;
                                $$mn = $cgst;
                            } else {
                                $ll = $yrqf['taxid']; //taxid
                                $mn = 'cgg_' . $ll;
                                $cgsttax[] = $yrqf['taxid'];
                                $cgst = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                                $$mn = $cgst;
                            }
                        }
                    }
                } else {

                    $yrq = $this->db->query("select * from taxprolist where proid='" . $posale->product_id . "' ")->getResultArray();
                    foreach ($yrq as $yrqf) {


                        $myrtax[] = $yrqf['taxid'];

                        if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                        {

                            $ll = $yrqf['taxid'];
                            $mn = 'cgg_' . $ll;
                            $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                            $cgst = $$mn + $cgsta;
                            $$mn = $cgst;
                        } else {
                            $ll = $yrqf['taxid']; //taxid
                            $mn = 'cgg_' . $ll;
                            $cgsttax[] = $yrqf['taxid'];
                            $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                            $$mn = $cgst;
                        }
                    }
                }













                $vper = session()->set('dper_' . $posale->id);
                $vamt = session()->set('tper_' . $posale->id);
                $totaltaxg = intval($kmkm['tax']) + intval($kmkm['sgst']);




                $tkmx1 = intval($kmkm['rrate']) * $posale->qt;
                $tkmx2 = $posale->price * $posale->qt;
                $tkmx3 = $tkmx1 - $tkmx2;
                $tkmx45 = $tkmx3 + $tkmx45;




                $ticket .= '
                        <tr>
                        <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;text-align: center;" >' . $i . '</td>

                        <td style="border-top: 0px solid #333;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $kmkm['name'] . '</td>
                        <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $kmkm['hsn'] . '</td>

                        <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $ovtax . '%</td>
                        <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->qt . '</td>


                        <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float) $posale->price, $this->setting->decimals, '.', '') . '</td>

                        <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . $kmkm['unit'] . '</td>

                        <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float) ($posale->qt * $posale->price), $this->setting->decimals, '.', '') . ' </td>
                    

                        
                        </tr>';
                $vamttt = is_numeric($vamt) ? intval($vamt) + intval($vamttt) : 0;
                $i++;
            }


            for ($xsx = $i; $xsx < 18; $xsx++) {

                $ticket .= '
            <tr>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >&nbsp;</td>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >&nbsp;</td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>

            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>

            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>

            <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>
            </tr>';
            }


            $tgbbb = ($sale->subtotal * $sale->discount) / 100;
            $bcs = 'code128';
            $height = 20;
            $width = 3;
            $ticket .= '<tr>
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;border-right: 1px solid #333;" ><b>' . label("Total QTY") . '</b></td>
            <td  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;text-align:right;" >' . $sale->totalitems . '</td>
            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>' . label("Total") . '</b></td>
            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->subtotal, $this->setting->decimals, '.', '') . '</td>
           </tr>';

            if ($this->setting->disc_all == 1) {
                $ticket .= '
                <tr class="ooooo">
                
                <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></b></td>
                
                <td style="padding:3px;border-left: 0px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></td>
                
                <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Discount';
                if (intval($sale->discount))

                    $ticket .= '( ' . $sale->discount . ' % )';

                $ticket .= '
                </td>
                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discountamount), $this->setting->decimals, '.', '') . '</td>
                </tr>';
            }


            if (intval($sale->disamtssh))
                $ticket .= '

            <tr class="yyyyy">
            
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            
            <td  colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Shipping
            </td>
            
            <td  style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->disamtssh), $this->setting->decimals, '.', '') . '</td>
           
            </tr>
            ';

            if ($this->setting->disc_pro == 1) {
                $ticket .= '
             <tr class="dddss">
            
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            
            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">' . label("Discount") . '</td>
            
            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discount_indujul), $this->setting->decimals, '.', '') . '</td>
           

            
            </tr>

           ';
            }

            $numberkkr = $sale->total;

            $decimalkkr = round($numberkkr - ($no = floor($numberkkr)), 2) * 100;
            $hundred = null;
            $digits_length = strlen($no);
            $i = 0;
            $str = array();
            $words = array(
                0 => '',
                1 => 'one',
                2 => 'two',
                3 => 'three',
                4 => 'four',
                5 => 'five',
                6 => 'six',
                7 => 'seven',
                8 => 'eight',
                9 => 'nine',
                10 => 'ten',
                11 => 'eleven',
                12 => 'twelve',
                13 => 'thirteen',
                14 => 'fourteen',
                15 => 'fifteen',
                16 => 'sixteen',
                17 => 'seventeen',
                18 => 'eighteen',
                19 => 'nineteen',
                20 => 'twenty',
                30 => 'thirty',
                40 => 'forty',
                50 => 'fifty',
                60 => 'sixty',
                70 => 'seventy',
                80 => 'eighty',
                90 => 'ninety'
            );
            $digits = array('', 'hundred', 'thousand', 'lakh', 'crore');
            while ($i < $digits_length) {
                $divider = ($i == 2) ? 10 : 100;
                $numberkkr = floor($no % $divider);
                $no = floor($no / $divider);
                $i += $divider == 10 ? 1 : 2;
                if ($numberkkr) {
                    $plural = (($counter = count($str)) && $numberkkr > 9) ? 's' : null;
                    $hundred = ($counter == 1 && $str[0]) ? ' and ' : null;
                    $str[] = ($numberkkr < 21) ? $words[$numberkkr] . ' ' . $digits[$counter] . $plural . ' ' . $hundred : $words[floor($numberkkr / 10) * 10] . ' ' . $words[$numberkkr % 10] . ' ' . $digits[$counter] . $plural . ' ' . $hundred;
                } else
                    $str[] = null;
            }
            $Rupees = implode('', array_reverse($str));
            $paise = ($decimalkkr) ? "." . ($words[$decimalkkr / 10] . " " . $words[$decimalkkr % 10]) . ' Paise' : '';



            $yhh = ucwords($Rupees) . ' Rupees Only';

            $ticket .= '<tr>
            
            <td colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>
            
            <td colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>Grand Total</b></td>
            
            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;"><b>' . number_format((float) $sale->total, $this->setting->decimals, '.', '') . '</b></td>
           
            </tr>


            ';

            $lmoxx = ($this->db->query("SELECT * FROM sales WHERE id='" . $sale->id . "'  ORDER BY id DESC "))->getRowArray();
            $lkson = $sale->total - $lmoxx['paid'];
            $rrr = $lmoxx['recivamt'];
            $bbb = $lmoxx['ballamtt'];


            $ticket .= '<tr>            
            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Paid") . ' (' . label("Cash") . ')</td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $rrr, $this->setting->decimals, '.', '') . '</td>
            </tr>';


            $lmqqq = $this->db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ")->getRowArray();

            if ($PayMethode[0] == 2) {


                $ticket .= '
               <tr>            
                <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("CreditCard") . ' <br> Ref No.' . $PayMethode[3] . ' <br>' . $PayMethode[2] . '<br> xxxx ' . substr($PayMethode[1], -4) . '</td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->recivamt2, $this->setting->decimals, '.', '') . '</td>
                </tr>
                ';
            } else if ($PayMethode[0] > 2) {
                $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

                $ticket .= '<tr>            
                    <td   colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                    <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . $pp_mm['name'] . ' <br> Ref No.' . $PayMethode[1] . '</td>

                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->recivamt2), $this->setting->decimals, '.', '') . '</td>
                    </tr>
                    ';
            }









            if ($sale->lalamt > 0) {
                $ticket .= '<tr>            
                <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;"><b>' . label("Exchange") . '(Ret ID:' . $sale->lalid . ' )<b></td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->paid, $this->setting->decimals, '.', '') . '</td>
                </tr>';


                $ticket .= '<tr>            
                    <td    style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" >Item</td> 
                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">QTY</td>
                    </tr>';
                $ret_items = $this->db->query("select retunn_items.*,products.name as pname from retunn_items 
                        left join returnss on returnss.re_sales_id=retunn_items.ret_id
                        left join products on products.id=retunn_items.prodd_ids  where re_sales_id='" . $sale->id . "' and rsale_type='" . $themblock . "'  ")->getResultArray();
                foreach ($ret_items as $ret_itemsf) {
                    $ticket .= '<tr>            
                    <td    style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" >' . $ret_itemsf['pname'] . '</td> 
                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . $ret_itemsf['sl_newqt'] . '</td>
                    </tr>';
                }


                $ticket .= '<tr>            
                        <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                        <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '  ' . $PayMethode[1] . '</td>

                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->lalamt, $this->setting->decimals, '.', '') . '</td>
                        </tr>';
            }

            $ticket .= '<tr>            
            <td  colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;" ><b>' . $yhh . '</b></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;">' . label("Balanceamt") . ' </td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-bottom:1px solid #333;border-right: 1px solid #333;">' . number_format((float) $bbb, $this->setting->decimals, '.', '') . '</td>
            </tr>
            ';

            $ticket .= '</tbody></table>
                        <br>';


            if ($this->setting->gst_tax == 1) {




                if ($kms == 1) {
                    $ticket .= '<table width="60%"  >
                        <tr>            
                        <td style="padding: 3px;text-align:left;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>Tax Name</b></td>        
                        <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>%</b></td>
                        <td  style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;"><b>Amt</b></td>

                        <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;"><b>Total</b></td>
                        </tr>
                        ';
                }


                $array = array_values(array_flip(array_flip($myrtax)));



                $myrtaxu = array_unique($array);

                $countb = count($myrtaxu);
                $tax_total = 0;
                for ($kmv = 0; $kmv < $countb; $kmv++) {
                    $pop = $myrtaxu[$kmv];
                    $lkll = 'cgg_' . $pop;
                    $ckll = 'sgg_' . $pop;
                    $tax = 0;
                    $tax_amount = 0;
                    $naray = ($this->db->query("SELECT * FROM  tax WHERE id='" . $myrtaxu[$kmv] . "' "))->getRowArray();
                    if (isset($naray['valueper'])) {
                        $tax_amount = round(($sssb / 100) * floatval($naray['valueper']));
                    }
                    $sss56 = $sssb + $tax_amount;
                    // if (@$$lkll > 0) {


                    //     $naray = $this->db->query("select * from  tax where id='" . $myrtaxu[$kmv] . "' "));

                    //     $cddd = $myrtaxu[$kmv];
                    //     $poo = $naray['valueper'] != 0 && intval($lkll) != 0 ? (intval($lkll) * 100) / floatval($naray['valueper']) : 0;
                    // } else {
                    //     $cddd = "---";
                    //     $poo = '---';
                    // }




                    // $sss54 = $$lkll;
                    // $sss51 = (100 * $sssd) / $sssb; //persantage
                    // $sss52 = ($poo * $sss51) / 100; //persantage
                    // $sss53 = $poo - $sss52; //poo

                    // $sss55 = ($sss54 * $sss51) / 100; //persantage
                    // $sss56 = $sss54 - $sss55; //lkll
                    $tax_total += $sss56;




                    $this->db->query("insert into tax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
                            values('" . $ppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sssb . "','" . $tax_amount . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");

                    $this->db->query("insert into dtax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
                            values('" . $dppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sssb . "','" . $tax_amount . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");




                    if ($kms == 1) {

                        $ticket .= '
                            <tr>            
                            <td style="padding: 3px;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . $naray['name'] . '</td>        
                            <td style=" padding: 3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . number_format((float) @$naray['valueper'], $this->setting->decimals, '.', '') . '</td>
                            <td  style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float) @$sssb, $this->setting->decimals, '.', '') . '</td>

                            <td style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float) @$tax_amount, $this->setting->decimals, '.', '') . '</td>
                            </tr>
                            ';
                    }
                }
                $ticket .= '</table>';
            }
        } elseif ($lxm11['printersizew'] == "2") {




            $ticket = '<h2 style="text-align:center;margin-bottom:-15px;">TAX INVOICE </h2> 
            <div style="width:148mm;font-size:10px;;margin-top:1px;margin-left:20px;margin:25px auto;padding: 15px;" >';




            $ticket .= '<div style="border: 1px solid #333;padding:3px;">

            <table class="table" style="width:100%;border-top: 0px solid #333;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;margin-top:30px;" cellspacing="0" border="0"  > 
            <tr>
            <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">

            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
         

            <tr>
            <td style="border-top: 0px;font-size:15px;color:#333;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 45px; "></td>
            </tr>  
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>' . $mstoef['name'] . '</b></td>
            </tr>
            <tr>
            <td style="border-top: 0px;">' . nl2br($mstoef['adresse']) . ',' . $mstoef['city'] . ',' . $mstoef['country'] . '</td>
            </tr>';
            if ($mstoef['phone']) {
                $ticket .= '<tr>
            <td style="border-top: 0px;" >PHONE: ' . $mstoef['phone'] . '</td>
            
            </tr>';
            }

            if ($this->setting->gstnoo) {
                $ticket .= '<tr>
            <td style="border-top: 0px;">GSTIN  : ' . $this->setting->gstnoo . '</td>
            </tr>';
            }

            $rrar = strtotime($sale->created_at);
            $rrarf = date("M d,Y", $rrar);

            $rrarfa = "+" . $sale->creddate . "day";

            $rrarfb = date('M d,Y', strtotime($rrarfa, $rrar));




            $ticket .= '</tbody>
                </table></td>';

            $ticket .= '
                <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
                <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

 
            
                    <td style="width:60%;border-top: 0px;font-size:15px;"><b>Invoice No </b> </td>
                    <td style="border-top: 0px;font-size:13px;text-align:right;">' . $ttrrt . '</td>
                    </tr>


                    <tr style="background:#89b03e !important;color:#fff;">
                    
                    <td style="border-top: 0px;font-size:13px;">Amount Due</td>
                    <td style="border-top: 0px;font-size:13px;text-align:right;">' . number_format((float) $sale->total, $this->setting->decimals, '.', '') . '</td>
                    </tr>

                <tr>
                    
                    <td style="border-top: 0px;font-size:13px;">Invoice Date  </td>
                    <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarf . '</td>
                    </tr>

                    <tr>
                    
                    <td style="border-top: 0px;font-size:13px;">Due Date  </td>
                    <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarfb . '</td>
                    </tr>

                    </tr>
                    </tbody>
                    </table></td></tr></table><br>';


            $ticket .= '<table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0"  > 
            <tr>
            <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Buyer</b></td>
            </tr>';
            if ($sale->clientname) {
                $ticket .= '<tr>
            <td style="border-top: 0px;">' . $sale->clientname . '</td>
            </tr>';
            }
            if ($ccname2) {

                $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname2) . '</td>
            </tr>';
            }
            if ($sale->mobnnm) {

                $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
            }

            if ($ccname570) {

                $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
            }


            $ticket .= '</tbody>
            </table></td>';

            $ticket .= '
            <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Ship To</b></td>
            </tr>';


            if ($ccname569) {

                $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname569) . '</td>
            </tr>';
            }
            if ($sale->mobnnm) {

                $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
            }

            if ($ccname570) {

                $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
            }
            $ticket .= '</tbody>
            </table></td></tr></table></div>';



            $PayMethode = explode('~', $sale->paidmethod);


            $ticket .= '<br>';

            $ticket .= '<table class="table" cellspacing="0" border="0" style="margin-bottom: 0px;"><thead>
                <tr style="background:#89b03e !important;color:#fff;font-weight:600;">
                <th style="width:10px;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">S.No</th>

                <th style="width:60mm;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">' . label("Product") . ' Description</th>

                <th style="width:15mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("HSN") . '</th>
                <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("GST") . '</th>

            

                <th style="width:10mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Qty") . '</th>
            

                
                
                <th  style="width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Rate") . '</th>
            <th  style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Per") . '</th>

                <th style="text-align:center;width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . label("Total") . '</th>
                </tr></thead><tbody>';












            $i = 1;
            $vamttt = 0;
            $tkmx45 = 0;
            $mkm = 0;
            $cgst = 0;
            $cgsta = 0;
            foreach ($posales as $posale) {

                $mkm++;
                $kmkm = $this->db->query("select * from products where id='" . $posale->product_id . "' ")->getRowArray();


                if ($txcvukp == 1) {
                    $ovtax = $kmkm['tax'];
                } else {
                    $ovtax = $kmkm['igst'];
                }
                $tymsk = $ovtax;
                $tymsk1 = ($tymsk / 100) + 1;


                $rtcc = round($posale->price / $tymsk1, 2); //10
                if ($kmkm['combo_id'] > 0) {


                    $dif_ttask = $this->db->query("select * from purchase_items_combo where purchase_id='" . $kmkm['combo_id'] . "'")->getResultArray();
                    foreach ($dif_ttask as $dif_ttaskf) {
                        $posale_product_id = $dif_ttaskf['product_id'];


                        $ovtax = $dif_ttaskf['cgst'];
                        $rtcc = 0;
                        $tymsk = $ovtax;
                        $tymsk1 = ($tymsk / 100) + 1;


                        $act_price = $dif_ttaskf['subtot'] / $dif_ttaskf['qt'];
                        $rtcc = round($act_price / $tymsk1, 2);


                        $yrq = $this->db->query("select * from taxprolist where proid='" . $posale_product_id . "' and custtype='" . $txcvukp . "'  ")->getResultArray();
                        foreach ($yrq as $yrqf) {


                            $myrtax[] = $yrqf['taxid'];

                            if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                            {

                                $ll = $yrqf['taxid'];
                                $mn = 'cgg_' . $ll;
                                $cgsta = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100;
                                $cgst = $$mn + $cgsta;
                                $$mn = $cgst;
                            } else {
                                $ll = $yrqf['taxid']; //taxid
                                $mn = 'cgg_' . $ll;
                                $cgsttax[] = $yrqf['taxid'];
                                $cgst = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                                $$mn = $cgst;
                            }
                        }
                    }
                } else {

                    $yrq = $this->db->query("select * from taxprolist where proid='" . $posale->product_id . "' and custtype='" . $txcvukp . "'  ")->getResultArray();
                    foreach ($yrq as $yrqf) {


                        $myrtax[] = $yrqf['taxid'];

                        if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                        {

                            $ll = $yrqf['taxid'];
                            $mn = 'cgg_' . $ll;
                            $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                            $cgst = $$mn + $cgsta;
                            $$mn = $cgst;
                        } else {
                            $ll = $yrqf['taxid']; //taxid
                            $mn = 'cgg_' . $ll;
                            $cgsttax[] = $yrqf['taxid'];
                            $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                            $$mn = $cgst;
                        }
                    }
                }













                $vper = session()->set('dper_' . $posale->id);
                $vamt = session()->set('tper_' . $posale->id);
                $totaltaxg = $kmkm['tax'] + $kmkm['sgst'];




                $tkmx1 = $kmkm['rrate'] * $posale->qt;
                $tkmx2 = $posale->price * $posale->qt;
                $tkmx3 = $tkmx1 - $tkmx2;
                $tkmx45 = $tkmx3 + $tkmx45;




                $ticket .= '
                                <tr>
                                <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;text-align: center;" >' . $i . '</td>

                                <td style="border-top: 0px solid #333;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->name . '</td>
                                <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $kmkm['hsn'] . '</td>

                                <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $ovtax . '%</td>
                                <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->qt . '</td>


                                <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float) $posale->price, $this->setting->decimals, '.', '') . '</td>

                                <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . $kmkm['unit'] . '</td>

                                <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float) ($posale->qt * $posale->price), $this->setting->decimals, '.', '') . ' </td>
                                    
                                </tr>';
                $vamttt = $vamt + $vamttt;
                $i++;
            }



            $tgbbb = ($sale->subtotal * $sale->discount) / 100;
            $bcs = 'code128';
            $height = 20;
            $width = 3;
            $ticket .= '<tr><td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;border-right: 1px solid #333;" ><b>' . label("Total QTY") . '</b></td>
                            <td  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;text-align:right;" >' . $sale->totalitems . '</td>
                            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>' . label("Total") . '</b></td>
                            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->subtotal, $this->setting->decimals, '.', '') . '</td>
                            </tr>';

            if ($this->setting->disc_all == 1) {
                $ticket .= '<tr class="ooooo">
                            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></b></td>
                             <td style="padding:3px;border-left: 0px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></td>
                             <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Discount';
                if (intval($sale->discount))

                    $ticket .= '( ' . $sale->discount . ' % )';

                $ticket .= '
                            </td>
                            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discountamount), $this->setting->decimals, '.', '') . '</td>
                        </tr>';
            }


            if (intval($sale->disamtssh))
                $ticket .= '<tr class="yyyyy">
                            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
                            <td  colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Shipping
                            </td>
                            <td  style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->disamtssh), $this->setting->decimals, '.', '') . '</td>
                        </tr>';



            if ($this->setting->disc_pro == 1) {
                $ticket .= '
                        <tr class="dddss">
                        <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
                        <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">' . label("Discount") . '</td>
                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discount_indujul), $this->setting->decimals, '.', '') . '</td>
                        </tr>';
            }

            $numberkkr = $sale->total;

            $decimalkkr = round($numberkkr - ($no = floor($numberkkr)), 2) * 100;
            $hundred = null;
            $digits_length = strlen($no);
            $i = 0;
            $str = array();
            $words = array(
                0 => '',
                1 => 'one',
                2 => 'two',
                3 => 'three',
                4 => 'four',
                5 => 'five',
                6 => 'six',
                7 => 'seven',
                8 => 'eight',
                9 => 'nine',
                10 => 'ten',
                11 => 'eleven',
                12 => 'twelve',
                13 => 'thirteen',
                14 => 'fourteen',
                15 => 'fifteen',
                16 => 'sixteen',
                17 => 'seventeen',
                18 => 'eighteen',
                19 => 'nineteen',
                20 => 'twenty',
                30 => 'thirty',
                40 => 'forty',
                50 => 'fifty',
                60 => 'sixty',
                70 => 'seventy',
                80 => 'eighty',
                90 => 'ninety'
            );
            $digits = array('', 'hundred', 'thousand', 'lakh', 'crore');
            while ($i < $digits_length) {
                $divider = ($i == 2) ? 10 : 100;
                $numberkkr = floor($no % $divider);
                $no = floor($no / $divider);
                $i += $divider == 10 ? 1 : 2;
                if ($numberkkr) {
                    $plural = (($counter = count($str)) && $numberkkr > 9) ? 's' : null;
                    $hundred = ($counter == 1 && $str[0]) ? ' and ' : null;
                    $str[] = ($numberkkr < 21) ? $words[$numberkkr] . ' ' . $digits[$counter] . $plural . ' ' . $hundred : $words[floor($numberkkr / 10) * 10] . ' ' . $words[$numberkkr % 10] . ' ' . $digits[$counter] . $plural . ' ' . $hundred;
                } else
                    $str[] = null;
            }
            $Rupees = implode('', array_reverse($str));
            $paise = ($decimalkkr) ? "." . ($words[$decimalkkr / 10] . " " . $words[$decimalkkr % 10]) . ' Paise' : '';



            $yhh = ucwords($Rupees) . ' Rupees Only';

            $ticket .= '<tr>
                    <td colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>
                    <td colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>Grand Total</b></td>
                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;"><b>' . number_format((float) $sale->total, $this->setting->decimals, '.', '') . '</b></td>
                </tr>';

            $lmoxx = ($this->db->query("select * from sales where id='" . $sale->id . "'  order by id desc "))->getRowArray();
            $lkson = $sale->total - $lmoxx['paid'];
            $rrr = $lmoxx['recivamt'];
            $bbb = $lmoxx['ballamtt'];


            $ticket .= '<tr>            
                        <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                        <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Paid") . ' (' . label("Cash") . ')</td>

                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $rrr, $this->setting->decimals, '.', '') . '</td>
                        </tr>';





            $lmqqq = ($this->db->query("SELECT * FROM payements WHERE sale_id='" . $sale->id . "' AND paidmethod=4 ORDER BY id DESC"))->getRowArray();

            if ($PayMethode[0] == 2) {


                $ticket .= '
                        <tr>            
                        <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                        <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("CreditCard") . ' <br> Ref No.' . $PayMethode[3] . ' <br>' . $PayMethode[2] . '<br> xxxx ' . substr($PayMethode[1], -4) . '</td>

                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->recivamt2, $this->setting->decimals, '.', '') . '</td>
                        </tr>
                        ';
            } else if ($PayMethode[0] > 2) {
                $pp_mm = ($this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' "))->getRowArray();

                $ticket .= '<tr>            
                            <td   colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                            <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . $pp_mm['name'] . ' <br> Ref No.' . $PayMethode[1] . '</td>

                            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->recivamt2), $this->setting->decimals, '.', '') . '</td>
                            </tr>
                            ';
            }









            if ($sale->lalamt > 0) {
                $ticket .= '<tr>            
                            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '(Ret ID:' . $sale->lalid . ' )</td>

                            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->paid, $this->setting->decimals, '.', '') . '</td>
                            </tr>';

                $ticket .= '<tr>            
                            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                            <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '  ' . $PayMethode[1] . '</td>

                            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->lalamt, $this->setting->decimals, '.', '') . '</td>
                            </tr>';
            }

            $ticket .= '<tr>            
                        <td  colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;" ><b>' . $yhh . '</b></td>        
                        <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;">' . label("Balanceamt") . ' </td>
                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-bottom:1px solid #333;border-right: 1px solid #333;">' . number_format((float) $bbb, $this->setting->decimals, '.', '') . '</td>
                        </tr>';
            $ticket .= '</tbody></table><br>';

            if ($this->setting->gst_tax == 1) {
                if ($kms == 1) {
                    $ticket .= '<table width="60%"  >
                                <tr>            
                                <td style="padding: 3px;text-align:left;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>Tax Name</b></td>        
                                <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>%</b></td>
                                <td  style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;"><b>Amt</b></td>

                                <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;"><b>Total</b></td>
                                </tr>
                                ';
                }

                $array = array_values(array_flip(array_flip($myrtax)));
                $myrtaxu = array_unique($array);
                $countb = count($myrtaxu);
                for ($kmv = 0; $kmv < $countb; $kmv++) {
                    $pop = $myrtaxu[$kmv];
                    $lkll = 'cgg_' . $pop;
                    $ckll = 'sgg_' . $pop;
                    if (@$$lkll > 0) {
                        $naray = ($this->db->query("select * from  tax where id='" . $myrtaxu[$kmv] . "' "))->getRowArray();
                        $cddd = $myrtaxu[$kmv];
                        $poo = ($$lkll * 100) / $naray['valueper'];
                    } else {
                        $cddd = "---";
                        $poo = '---';
                    }

                    $sss54 = $$lkll;
                    $sss51 = (100 * $sssd) / $sssb; //persantage
                    $sss52 = ($poo * $sss51) / 100; //persantage
                    $sss53 = $poo - $sss52; //poo

                    $sss55 = ($sss54 * $sss51) / 100; //persantage
                    $sss56 = $sss54 - $sss55; //lkll

                    $this->db->query("insert into tax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
                        values('" . $ppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sss53 . "','" . $sss56 . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");

                    $this->db->query("insert into dtax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
                        values('" . $dppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sss53 . "','" . $sss56 . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");


                    if ($kms == 1) {
                        $ticket .= '
                                <tr>            
                                    <td style="padding: 3px;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . $naray['name'] . '</td>        
                                    <td style=" padding: 3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . number_format((float) @$naray['valueper'], $this->setting->decimals, '.', '') . '</td>
                                    <td  style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float) @$sss53, $this->setting->decimals, '.', '') . '</td>
                                    <td style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float) @$sss56, $this->setting->decimals, '.', '') . '</td>
                                </tr>
                                ';
                    }
                }
                $ticket .= '</table>';
            }
        } elseif ($lxm11['printersizew'] > 2) {

            $print_tb = ($this->db->query("select * from print_setup where dp_id='" . $lxm11['printersizew'] . "' "))->getRow();
            $rfkkkk = $print_tb->dp_pt_width . "mm";
            $olp = "5px";



            $ticket = '<div style="width:' . $rfkkkk . ';font-size:' . $print_tb->font_size_l . 'px;margin-left:' . $print_tb->margin_left . 'px;padding:0px;" >
                    <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;"><tbody>';

            if ($print_tb->logo_sh == 1) {

                $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->logo_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 25px; "></td></tr>';
            }

            if ($print_tb->reciptheader_sh == 1) {

                $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->reciptheader_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;">' . $this->setting->receiptheader . '</td></tr>';
            }


            if ($print_tb->companyname_sh == 1) {
                $ticket .= ' <tr><td colspan="6"  style="text-align:' . $print_tb->companyname_p . ';border: 0px solid #fff;background-color: white;font-size:' . $print_tb->font_size_b . 'px;"><b>' . $mstoef['name'] . '</b></td></tr>';
            }


            if ($print_tb->address_sh == 1) {

                $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['adresse'] . '</td></tr>';
                $ticket .= '<tr><td colspan="6" style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['city'] . ',' . $mstoef['phone'] . '</td></tr>';
            }

            if ($print_tb->gst_sh == 1) {
                $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->gst_p . ';border: 0px solid #fff;background-color: white;">' . label("GST No") . ': ' . $this->setting->gstnoo . '</td></tr>';
            }

            $PayMethode = explode('~', $sale->paidmethod);
            $payment_mmode = '';
            if ($PayMethode[0] == 2) {

                $payment_mmode .= '<td colspan="3"  style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . label("CreditCard") . '</td>';
            } elseif ($PayMethode[0] == 1) {
                $payment_mmode .= '<td  colspan="3" style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ':' . label("Cash") . '</td>';
            } else {
                $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

                $payment_mmode .= '<td  colspan="3" style="text-align:' . (isset($print_tb->paymentmode_p) ? $print_tb->paymentmode_p : "") . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . (isset($pp_mm['name']) ? $pp_mm['name'] : "") . '</td>';
            }


            $customer_ddetaii = '<tr><td colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Customer") . '</td></tr>';
            if ($ccname1)
                $customer_ddetaii .= '<tr><td   colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Name") . ' : ' . $ccname1 . '</td></tr> ';

            if ($custrrf)
                $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Ref No") . ' : ' . $custrrf . '</td></tr> ';
            if ($ccname2)
                $customer_ddetaii .= '
          <tr><td  colspan="6"  style="text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Address") . '</td></tr>
          <tr>
          <td   colspan="6"  style="text-align:left;border: 0px solid #fff;background-color: white;"> : ' . $ccname2 . '</td>
          </tr>';
            if ($ccname3)
                $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Mobile") . ' : ' . $ccname3 . '</td></tr> ';

            if (isset($client->gstno) && $client->gstno)
                $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("GST") . ' : ' . $client->gstno . '</td></tr> ';



            $line_1 = '';
            $line_2 = '';
            $line_3 = '';
            $line_4 = '';
            $line_5 = '';
            $line_6 = '';
            $line_7 = '';
            for ($fv = 1; $fv < 8; $fv++) {
                $fv_t = $fv;

                if ($print_tb->salesno_l == $fv && $print_tb->salesno_sh == 1) {

                    $tt = 'line_' . $fv;
                    /*if($sale->org_sam==2){ $kmkkkk="(S)";}else{$kmkkkk='';}*/
                    $$tt .= '<td  colspan="2"   style="text-align:' . $print_tb->salesno_p . ';border: 0px solid #fff;background-color: white;">' . label("SaleNum") . '.:' . $ttrrt . '</td>';
                    $fv = $fv_t;
                }
                if ($print_tb->cashier_l == $fv && $print_tb->cashier_sh == 1) {
                    $tt = 'line_' . $fv;
                    $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->cashier_p . ';border: 0px solid #fff;background-color: white;">' . label("Cashier") . ': ' . $sale->created_by . '</td>';
                    $fv = $fv_t;
                }
                if ($print_tb->paymentmode_l == $fv && $print_tb->paymentmode_sh == 1) {
                    $tt = 'line_' . $fv;
                    $$tt .= $payment_mmode;
                    $fv = $fv_t;
                }

                if ($print_tb->date_l == $fv && $print_tb->date_sh == 1) {
                    $tt = 'line_' . $fv;
                    $$tt .= '<td colspan="3"  style="text-align:' . (isset($print_tb->date_p) ? $print_tb->date_p : "") . ';border: 0px solid #fff;background-color: white;width:50%;">' . label("Date") . ':' . date('d-m-Y') . '</td>';
                    $fv = $fv_t;
                }

                if ($print_tb->time_l == $fv && $print_tb->time_sh == 1) {
                    $tt = 'line_' . $fv;
                    $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->time_p . ';border: 0px solid #fff;background-color: white;width:50%;">' . label("Time") . ':' . date('H:i') . '</td>';
                    $fv = $fv_t;
                }

                if ($print_tb->customer_l == $fv && $print_tb->customer_sh == 1) {
                    $tt = 'line_' . $fv;
                    $$tt .= $customer_ddetaii;
                    $fv = $fv_t;
                }
            }


            for ($fvb = 1; $fvb < 7; $fvb++) {
                $lint_temp = 'line_' . $fvb;
                $linef = $$lint_temp;
                $ticket .= '<tr>' . $linef . '</tr>';
            }
            $ticket .= '';
            $ticket .= '<tr>';

            $pro_width = $print_tb->dp_pt_width * 0.1 * 3;

            if ($print_tb->product_sh == 1)
                $ticket .= '<th  style="width:' . $pro_width . 'mm;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("Product") . '</b></th>';
            if ($print_tb->qt_sh == 1)
                $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("QTY") . '</b></th>';
            if ($print_tb->mrp_sh == 1)
                $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("MRP") . '</b></th>';
            if ($print_tb->rate_sh == 1)
                $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("Rate") . '</b></th>';
            if ($print_tb->tax_sh == 1)
                $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("Tax") . '</b></th>';
            if ($print_tb->amt_sh == 1)
                $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("Amount") . '</b></th>';


            $ticket .= '</tr>';

            $i = 1;
            $vamttt = 0;
            $tkmx45 = 0;
            $mkm = 0;

            $cgst = 0;
            $cgsta = 0;
            foreach ($posales as $posale) {
                $mkm++;
                $kmkm = $this->db->query("SELECT * FROM products WHERE id='" . $posale->product_id . "' ")->getRowArray();
                $ovtax = $kmkm['tax'];
                $rtcc = 0;
                if ($txcvukp == 1) {
                    $ovtax = $kmkm['tax'];
                } else {
                    $ovtax = $kmkm['igst'];
                }
                $tymsk = $ovtax;
                $tymsk1 = (floatval($tymsk) / 100) + 1;
                $rtcc = round($posale->price / $tymsk1, 2); //10

                $rtcc = round($posale->price / $tymsk1, 2); //10
                if ($kmkm['combo_id'] > 0) {
                    $dif_ttask = $this->db->query("SELECT * FROM purchase_items_combo WHERE purchase_id='" . $kmkm['combo_id'] . "'  ")->getResultArray();
                    foreach ($dif_ttask as $dif_ttaskf) {
                        $posale_product_id = $dif_ttaskf['product_id'];


                        $ovtax = $dif_ttaskf['cgst'];
                        $rtcc = 0;
                        $tymsk = $ovtax;
                        $tymsk1 = ($tymsk / 100) + 1;


                        $act_price = $dif_ttaskf['subtot'] / $dif_ttaskf['qt'];
                        $rtcc = round($act_price / $tymsk1, 2);


                        $yrq = $this->db->query("select * from taxprolist where proid='" . $posale_product_id . "' and custtype='" . $txcvukp . "'  ")->getResultArray();
                        foreach ($yrq as $yrqf) {


                            $myrtax[] = $yrqf['taxid'];

                            if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                            {

                                $ll = $yrqf['taxid'];
                                $mn = 'cgg_' . $ll;
                                $cgsta = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100;
                                $cgst = $$mn + $cgsta;
                                $$mn = $cgst;
                            } else {
                                $ll = $yrqf['taxid']; //taxid
                                $mn = 'cgg_' . $ll;
                                $cgsttax[] = $yrqf['taxid'];
                                $cgst = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                                $$mn = $cgst;
                            }
                        }
                    }
                } else {
                    $yrq = $this->db->query("select * from taxprolist where proid='" . $posale->product_id . "' and custtype='" . $txcvukp . "'  ")->getResultArray();
                    foreach ($yrq as $yrqf) {
                        $myrtax[] = $yrqf['taxid'];
                        if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                        {
                            $ll = $yrqf['taxid'];
                            $mn = 'cgg_' . $ll;
                            $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                            $cgst = $$mn + $cgsta;
                            $$mn = $cgst;
                        } else {
                            $ll = $yrqf['taxid']; //taxid
                            $mn = 'cgg_' . $ll;
                            $cgsttax[] = $yrqf['taxid'];
                            $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                            $$mn = $cgst;
                        }
                    }
                }

                $vper = session()->set('dper_' . $posale->id);
                $vamt = session()->set('tper_' . $posale->id);
                $totaltaxg = intval($kmkm['tax']) + intval($kmkm['sgst']);


                $tkmx1 = intval($kmkm['rrate']) * intval($posale->qt);
                $tkmx2 = intval($posale->price) * intval($posale->qt);
                $tkmx3 = intval($tkmx1) - intval($tkmx2);
                $tkmx45 = intval($tkmx3) + intval($tkmx45);

                if ($print_tb->productlist_one_two == 1) {
                    $ticket .= '<tr>';
                    if ($print_tb->product_sh == 1) {
                        $ticket .= '<td   style="width:' . $pro_width . 'mm;text-align:left;    border-top: 0px solid #ddd; ">' . substr($posale->name, 0, 15) . '</td>';
                    }
                    if ($print_tb->qt_sh == 1) {
                        $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
                    }
                    if ($print_tb->mrp_sh == 1) {
                        $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float) $kmkm['rrate'], $this->setting->decimals, '.', '') . ' </td>';
                    }
                    if ($print_tb->rate_sh == 1) {
                        $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float) $posale->price, $this->setting->decimals, '.', '') . ' </td>';
                    }
                    if ($print_tb->tax_sh == 1) {
                        $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
                    }
                    if ($print_tb->amt_sh == 1) {

                        $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float) ($posale->qt * $posale->price), $this->setting->decimals, '.', '') . ' </td>';
                    }

                    $ticket .= '<tr>';
                } else {

                    if ($print_tb->product_sh == 1) {

                        $ticket .= '<tr><td  colspan="6"  style="text-align:left;    border-top: 0px solid #ddd; ">' . substr($posale->name, 0, 15) . '</td></tr>';
                    }
                    $ticket .= '<tr><td style="text-align:center;    border-top: 0px solid #ddd;">&nbsp;</td>';
                    if ($print_tb->qt_sh == 1) {
                        $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
                    }
                    if ($print_tb->mrp_sh == 1) {
                        $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float) $kmkm['rrate'], $this->setting->decimals, '.', '') . ' </td>';
                    }
                    if ($print_tb->rate_sh == 1) {
                        $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float) $posale->price, $this->setting->decimals, '.', '') . ' </td>';
                    }
                    if ($print_tb->tax_sh == 1) {
                        $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
                    }
                    if ($print_tb->amt_sh == 1) {

                        $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float) ($posale->qt * $posale->price), $this->setting->decimals, '.', '') . ' </td>';
                    }

                    $ticket .= '</tr>';
                }





                $vamttt = intval($vamt) + intval($vamttt);
                $i++;
            }




            $tgbbb = ($sale->subtotal * $sale->discount) / 100;
            $bcs = 'code128';
            $height = 20;
            $width = 3;
            $ticket .= '<tr>
                    <td  style="text-align:left;"><b>' . label("TotalItems") . '</b></td>
                    <td style="text-align:left; "><b>' . $sale->totalitems . '</b></td>
                    <td  style="text-align:left; "><b>' . label("Total") . '</b></td>
                    <td colspan="3" style="text-align:right;"><b>Rs.' . $sale->subtotal . '</b></td>
                
                    </tr>';






            if ($this->setting->disc_all == 1 && $sale->discountamount > 0) {
                $ticket .= '<tr>
                            <td colspan="2" style="text-align:left;">' . label("OverAllDiscount") . '</td>
                            <td colspan="4" style="text-align:right;font-weight:bold;">Rs.' . number_format((float) $sale->discountamount, $this->setting->decimals, '.', '') . ' </td>
                            
                            </tr>';
            }


            if (intval($sale->disamtssh)) {
                $ticket .= '<tr>
                        <td colspan="2" style="text-align:left;">' . label("Shipping") . '</td>
                        <td colspan="4" style="text-align:right;font-weight:bold;">Rs.' . number_format((float) $sale->disamtssh, $this->setting->decimals, '.', '') . ' </td>
                        </tr>';
            }




            if ($this->setting->disc_pro == 1) {
                $ticket .= '<tr>
                        <td colspan="2" style="text-align:left; ">' . label("Discount") . ' ' . label("Amount") . '</td>
                        <td colspan="4" style="text-align:right;">Rs.' . number_format((float) $sale->discount_indujul, $this->setting->decimals, '.', '') . '</td><td style="text-align:left;    border-top: 0px solid #ddd;width:' . $olp . ' "></td></tr>';
            }



            $ticket .= '<tr>
                        <td colspan="2" style="border-top:0px dashed #000;font-weight:bold;text-align:left;  padding-top:5px;font-weight:bold;;"><b>' . label("GrandTotal") . '</b></td>
                        <td colspan="4" style="border-top:0px dashed #000; padding-top:5px; text-align:right;font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;">Rs.' . number_format((float) $sale->total, $this->setting->decimals, '.', '') . ' </td>
                        </tr><tr>';


            $lmoxx = ($this->db->query("select * from sales where id='" . $sale->id . "'  order by id desc "))->getRowArray();
            $lkson = $sale->total - $lmoxx['paid'];
            $rrr = $lmoxx['recivamt'];
            $bbb = $lmoxx['ballamtt'];


            if ($print_tb->received_sh == 111) {
                $ticket .= '<tr>
                            <td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Received(Cash)") . ' </td>
                            <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float) ($rrr), $this->setting->decimals, '.', '') . ' </td>
                            </tr>';
            }
            $lmqqq = ($this->db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc "))->getRowArray();

            if ($print_tb->paid_sh == 1) {
                if ($PayMethode[0] == 2) {
                    $ticket .= '<td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("CreditCard") . ' <br> Ref No.' . $PayMethode[3] . ' <br>' . $PayMethode[2] . '<br> xxxx ' . substr($PayMethode[1], -4) . '</td>
                                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float) ($sale->recivamt2), $this->setting->decimals, '.', '') . '</td></tr>
                ';
                } else if ($PayMethode[0] > 2) {
                    $pp_mm = ($this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' "))->getRowArray();
                    $ticket .= '<td colspan="2" style="border-top: 0px solid #ddd;text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . $pp_mm['name'] . ' <br> Ref No.' . $PayMethode[1] . '</td>
                                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float) ($sale->recivamt2), $this->setting->decimals, '.', '') . '</td></tr>';
                }
            }

            if ($sale->lalamt > 0) {
                $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Exchange (Ret.ID:' . (isset($sale->lalid) ? $sale->lalid : '') . ')</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float) ($sale->lalamt), $this->setting->decimals, '.', '') . '</td> </td>   
                </tr>';

                $ticket .= '<tr>
                <td colspan="3" style="text-align:left; padding-top:5px;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">Item</td>
                <td colspan="1" style="padding-top:5px; text-align:right;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">QTY</td> </td>
                <td colspan="2" style="padding-top:5px; text-align:right;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">Amount</td> </td>   
                </tr>';

                $ret_items = $this->db->query("SELECT retunn_items.*,products.name as pname from retunn_items 
                            left join returnss on returnss.re_id=retunn_items.ret_id
                            left join products on products.id=retunn_items.prodd_ids  where returnss.purcha_sales_id='" . $sale->id . "' and returnss.rsale_type='0'  ")->getResultArray();
                foreach ($ret_items as $ret_itemsf) {
                    $ticket .= '<tr>            
                                    <td    colspan="3" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">' . substr($ret_itemsf['pname'], 0, 15) . '</td> 
                                    <td colspan="1" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $ret_itemsf['sl_newqt'] . '</td>
                                    <td colspan="2" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $ret_itemsf['sl_subtotal'] . '</td>
                                </tr>';
                }
            }


            if ($print_tb->balance_sh) {
                $amount_wordins = '';
                if ($bbb > 0) {
                    $amount_wordins = '(Give balance to customer)';
                } else {
                    $amount_wordins = '(Get balance from customer)';
                }

                $ticket .= '<tr>
                    <td colspan="2" style="border-top:1px solid #ccc;font-weight:bold;text-align:left;  padding-top:5px;font-weight:bold;;">' . label("Balanceamt") . '<br> <span>' . $amount_wordins . '</span></td>
                    <td colspan="4" style="border-top:1px solid #ccc; padding-top:5px; text-align:right;font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;">Rs.' . number_format((float) ($bbb), $this->setting->decimals, '.', '') . ' </td></tr>';
            }

            if ($print_tb->todaysaving_sh == 1) {
                $ticket .= '<tr>
                    <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;border-top: 1px solid #ddd;">' . label("Saving") . '  </td>
                    <td colspan="3" style="font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;text-align:left; padding-top:5px;border-top: 1px solid #ddd;"> : Rs.' . number_format((float) ($tkmx45), $this->setting->decimals, '.', '') . '</td>
                    <td colspan="2" style="font-size:16px;font-weight:bold;padding-top:5px; text-align:right; border-top: 1px solid #ddd;"> </td><td style="text-align:left;    border-top: 1px solid #ddd;"></td>
                    </tr>';
            }

            $ticket .= '</tbody></table><br>';
            if ($print_tb->taxx_sh == 1) {
                $ticket .= '<table class="table"  cellspacing="0" border="0"><thead><tr>';
                if ($print_tb->taxname_sh == 1) {
                    $ticket .= '<th style="border-top: 1px solid #ddd;" >Tax Name</th>';
                }
                if ($print_tb->taxpersontage_sh == 1) {
                    $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;">%</th>';
                }
                if ($print_tb->taxamt_sh == 1) {
                    $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;">Amt</th>';
                }
                if ($print_tb->taxtotal_sh == 1) {
                    $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;">Total</th>';
                }
                $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;">&nbsp;</th></tr></thead><tbody>';
            }



            $array = array_values(array_flip(array_flip($myrtax)));


            $myrtaxu = array_unique($array);

            $countb = count($myrtaxu);
            for ($kmv = 0; $kmv < $countb; $kmv++) {
                $pop = $myrtaxu[$kmv];
                $lkll = 'cgg_' . $pop;
                $ckll = 'sgg_' . $pop;
                if (@$$lkll > 0) {


                    $naray = ($this->db->query("select * from  tax where id='" . $myrtaxu[$kmv] . "' "))->getRowArray();

                    $cddd = $myrtaxu[$kmv];
                    $poo = ($$lkll * 100) / $naray['valueper'];
                } else {
                    $cddd = "---";
                    $poo = '---';
                }

                $sss54 = $$lkll;
                $sss51 = (100 * $sssd) / $sssb; //persantage
                $sss52 = ($poo * $sss51) / 100; //persantage
                $sss53 = $poo - $sss52; //poo

                $sss55 = ($sss54 * $sss51) / 100; //persantage
                $sss56 = $sss54 - $sss55; //lkll


                $this->db->query("INSERT INTO tax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i)VALUES('" . $ppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sss53 . "','" . $sss56 . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");
                if ($themblock == 1) {
                    $this->db->query("INSERT INTO dtax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i)VALUES('" . $dppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sss53 . "','" . $sss56 . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");
                }


                if ($print_tb->taxx_sh == 1) {
                    $ticket .= '<tr>';

                    if ($print_tb->taxname_sh == 1) {
                        $ticket .= '<td style="text-align:left;border-top: 0px solid #ddd;">' . $naray['name'] . '</td>';
                    }
                    if ($print_tb->taxpersontage_sh == 1) {

                        $ticket .= '<td style="text-align:right;border-top: 0px solid #ddd;">' . $naray['valueper'] . '</td>';
                    }
                    if ($print_tb->taxamt_sh == 1) {
                        $ticket .= '
            <td style="text-align:right;border-top: 0px solid #ddd; ">' . round(@$sss53, 2) . '</td>';
                    }
                    if ($print_tb->taxtotal_sh == 1) {
                        $ticket .= '
            <td style="text-align:right;border-top: 0px solid #ddd; ">' . round(@$sss56, 2) . '</td>';
                    }



                    $ticket .= '<td colspan="2" style="text-align:right;border-top: 0px solid #ddd; "></td>';
                    $ticket .= '</tr>';
                }
            }




            $ticket .= '</table>';
        }




        if ($lxm11['printersizew'] < 3) {

            $ticket .= '

  <table class="table" style="margin-bottom:0px; width:100%;margin-top:1px;border: 1px solid #333;padding:10px;" cellspacing="0" border="0"  > 
  <tr style="border: 0px solid #ddd;">

  <td style="width:15%;border-top: 0px solid #ddd;padding: 0px;border-right: 1px solid #333;padding:3px;">
<span >Customer Seal & Sign</span></td>


  <td style="width:30%;border-top: 0px solid #ddd;padding: 0px;">

  <table class="table" style="width:100%;margin-top:1px;margin-bottom: 1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
         
           
            <tr>
            <td style="border-top: 0px;padding-left:5px;"><b>Terms & conditions </b>: <br>' . $this->setting->declaration . '</td>
            </tr>
</table></td>
 <td style="width:25%;border-top: 0px solid #ddd;border-left: 1px solid #333;padding: 0px;">
 <table class="table" style="width:100%;margin-bottom: 1px;margin-top:1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

            <tr >
             <td style="border-top: 0px;padding-left:5px;">Bank</td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->bbank . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;padding-left:5px;">Acc No  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->aaco . '</td>
            </tr> <tr>
            
            <td style="border-top: 0px;padding-left:5px;">IFS   </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->iifs . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Branch  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->bbranch . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Pan  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->pann . '</td>
            </tr>
 </tr>
</tbody>
</table></td>


<td style="width:30%;border-top: 0px solid #ddd;padding: 0px;border-left: 1px solid #333;padding:3px;">
For ' . ucwords($this->setting->companyname) . '</td>

</tr></table>

  ';
        }




        $ticket .= '<table style="margin-top:10px;" class="table" cellspacing="0" border="0" >
 


          <tr><td colspan="6" style="text-align:center;border: 0px solid #fff;background-color: white;padding:0px;">

          ' . $this->setting->receiptfooter . '
          </td>

          </tr>
          
          </table></div>
          ';










        $this->PosaleModel
            ->where([
                'status'      => 1,
                'register_id' => $this->register,
                'user_id'     => session()->get('user_id')
            ])
            ->delete();


        /*      if (isset($number)) {
            if ($number != 1)
                Hold_model::delete_all(array(
                    'conditions' => array(
                        'number = ? AND register_id = ? AND user_id =?',
                        $number,
                        $this->register,
                      session()->set('user_id')
                    )
                ));
        }*/

        $hold = $this->HoldModel
            ->where('register_id', $this->register)
            ->orderBy('id', 'DESC') // or use your primary key
            ->first();

        if ($hold) {
            $this->PosaleModel
                ->where('number', $hold->number)
                ->where('register_id', $this->register)
                ->where('user_id', session()->get('user_id'))
                ->set(['status' => 1])
                ->update();
        }



        if ($this->setting->smsset == 1) {
            $kmsen = ($this->db->query("select * from smstabble_new where ss_status=1 "))->getRowArray();
            $mobileNumber = $tycvzz;

            $amtt = number_format((float) $sale->paid);
            $bilnum = sprintf('%05d', $sale->id);
            $lmdornn = $sale->created_by;
            $ccname2 = ' ';
            $date = date("d-m-Y");
            $taname = $sale->clientname;

            $searchArray = array("{bill_number}", "{total_amount}", "{emp_name}", "{delivery_address}", "{date}", "{customer_name}", "{birthday_date}", "{anniversary_date}", "{store_address}");
            $replaceArray = array($bilnum, $amtt, $lmdornn, $ccname2, $date, $taname, '', '', $mstoef['adresse']);
            $intoString = $this->setting->billing_sms;
            $message = str_replace($searchArray, $replaceArray, $intoString);

            $s_array = array("{mobile_number}", "{message_details}");
            $r_array = array(urlencode($mobileNumber), urlencode($message));
            $url = str_replace($s_array, $r_array, $kmsen['ss_url']);


            $json = json_decode(file_get_contents($url), true);
            if ($json["status"] === "success") {
            } else {
            }
        }

        for ($oio = 1; $oio <= $this->setting->pptt; $oio++) {

            echo $ticket;
            die;
        }
    }
    public function load_posalesdd($purchase_type = 0)
    {
        $this->db->table('settings')
            ->where('id', 1)
            ->update([
                'themblock' => 1,
                'purchase_type' => $purchase_type
            ]);

        return $this->response->setJSON(['status' => 1]);
    }

    public function load_posalesddall()
    {
        $this->db->table('settings')
            ->where('id', 1)
            ->update([
                'themblock' => 1,
                'purchase_type' => ''
            ]);

        return $this->response->setJSON(['status' => 1]);
    }


    public function qAddNewSale()
    {
        helper(['form']);

        $session = session();

        $cus = $this->request->getPost('custrrf');
        $name = $this->request->getPost('clientname');
        $mobnnm = $this->request->getPost('mobnnm');
        $custidkk = $this->request->getPost('client_id');
        $kms = $this->request->getPost('kms');
        $total = $this->request->getPost('total');
        $discount = $this->request->getPost('discount');
        $gst = $this->request->getPost('gst');
        $payment = $this->request->getPost('payment');
        $totalitems = $this->request->getPost('totalitems');

        $register_id = $this->register; // assuming you’ve loaded this already
        $user_id = $session->get('user_id');

        $posaleModel = new \App\Models\PosaleModel();

        $posales = $posaleModel
            ->where('status', 1)
            ->where('register_id', $register_id)
            ->where('user_id', $user_id)
            ->findAll();

        if (empty($posales) || $total <= 0) {
            return view('pos/empty_sale');
        }

        $saleData = [
            'customer_id'     => $custidkk,
            'clientname'      => $name,
            'mobnnm'          => $mobnnm,
            'custrrf'         => $cus,
            'kms'             => $kms,
            'total'           => $total,
            'discount'        => $discount,
            'gst'             => $gst,
            'payment'         => $payment,
            'totalitems'      => $totalitems,
            'register_id'     => $register_id,
            'user_id'         => $user_id,
            'created_at'      => date('Y-m-d H:i:s')
        ];

        // Save the sale
        $db = \Config\Database::connect();
        $db->table('sales')->insert($saleData);
        $sale_id = $db->insertID();

        // Link posales to this new sale
        foreach ($posales as $item) {
            $itemData = [
                'sale_id'     => $sale_id,
                'item_id'     => $item['item_id'],
                'price'       => $item['price'],
                'quantity'    => $item['qt'],
                'tax'         => $item['tax'],
                'subtotal'    => $item['price'] * $item['qt'],
                'created_at'  => date('Y-m-d H:i:s'),
            ];
            $db->table('sale_items')->insert($itemData);
        }

        // Clear POS temporary items
        $posaleModel
            ->where('status', 1)
            ->where('register_id', $register_id)
            ->where('user_id', $user_id)
            ->delete();

        // Load the ticket view
        return view('pos/ticket_qaddnewsale', [
            'saleData' => $saleData,
            'sale_id'  => $sale_id,
            'items'    => $posales,
        ]);
    }
    public function AddNewSaleqt()
    {
        helper(['form']);

        $mobnnm = $this->request->getPost('mobnnm');
        $kms = $this->request->getPost('kms');
        $custrrf = $this->request->getPost('custrrf');
        $clientname = $this->request->getPost('clientname');
        $client_id = $this->request->getPost('client_id');
        $total = (float) $this->request->getPost('total');

        $posaleModel = new \App\Models\PosaleModel();
        $registerModel = new \App\Models\RegisterModel();
        $saleModel = new \App\Models\SaleModel();

        $userId = session()->get('user_id');
        $registerId = session()->get('register_id');

        $posales = $posaleModel
            ->where('status', 1)
            ->where('register_id', $registerId)
            ->where('user_id', $userId)
            ->findAll();

        $sub = 0;
        $subtot = 0;

        foreach ($posales as $item) {
            $sub += $item['qt'];
            $subtot += $item['price'] * $item['qt'];
        }

        if ($total <= 0 || empty($posales)) {
            return view('empty_sale');
        }

        if ($subtot != $total) {
            return view('total_mismatch');
        }

        $saleData = [
            'mobnnm'      => $mobnnm,
            'kms'         => $kms,
            'custrrf'     => $custrrf,
            'clientname'  => $clientname,
            'client_id'   => $client_id,
            'total'       => $total,
            'created_at'  => date('Y-m-d H:i:s'),
            'register_id' => $registerId,
            'user_id'     => $userId,
        ];

        $saleId = $saleModel->insert($saleData);

        foreach ($posales as $item) {
            $saleModel->insertSaleItem($saleId, $item); // You’ll need to implement this method if not already done
        }

        // Optionally clear POS sale items
        $posaleModel->where('register_id', $registerId)->where('user_id', $userId)->delete();

        return view('pos/receipt_qt', [
            'saleId'    => $saleId,
            'saleData'  => $saleData,
            'posales'   => $posales,
            'sub'       => $sub,
            'subtot'    => $subtot,
        ]);
    }


    public function generateBarcode($code = null, $bcs = 'code128', $height = 60, $width = 1)
    {
        if (!$code) {
            return 'Barcode code required.';
        }

        $barcodeOptions = [
            'text' => $code,
            'barHeight' => $height,
            'barThinWidth' => $width,
            'drawText' => false,
        ];

        $rendererOptions = [
            'imageType' => 'png',
            'horizontalPosition' => 'center',
            'verticalPosition' => 'middle',
        ];

        // Render and output barcode image directly
        header('Content-Type: image/png');
        Barcode::factory($bcs, 'image', $barcodeOptions, $rendererOptions)->render();
        exit;
    }

    public function holdList($registerid)
    {
        $holds = $this->HoldModel->where('register_id', $registerid)->asArray()->findAll();
        $posale = model('App\Models\PosaleModel')
            ->where([
                'status' => 1,
                'register_id' => $registerid, // assuming this is correct
                'user_id' => session('user_id'),
            ])
            ->orderBy('id', 'desc')
            ->get()
            ->getRowArray();

        $Tholds = '';

        if (empty($holds)) {
            $Tholds = '<span class="Hold selectedHold">1<span id="Time">' . date("H:i") . '</span></span>';
        } else {
            if (empty($posale)) {
                $numItems = count($holds);
                $i = 0;
                foreach ($holds as $hold) {
                    $i++;
                    $selected = ($i === $numItems) ? 'selectedHold' : '';
                    $Tholds .= '<span class="Hold ' . $selected . '" id="' . esc($hold['number']) . '" onclick="SelectHold(' . esc($hold['number']) . ')">'
                        . esc($hold['number']) . '<span id="Time">' . esc($hold['time']) . '</span></span>';
                }
            } else {
                foreach ($holds as $hold) {
                    $selected = ($hold['number'] == $posale['number']) ? 'selectedHold' : '';
                    $Tholds .= '<span class="Hold ' . $selected . '" id="' . esc($hold['number']) . '" onclick="SelectHold(' . esc($hold['number']) . ')">'
                        . esc($hold['number']) . '<span id="Time">' . esc($hold['time']) . '</span></span>';
                }
            }
        }

        return $this->response->setBody($Tholds);
    }
    public function addHold($registerid)
    {
        $holdModel = model('App\Models\HoldModel');
        $posaleModel = model('App\Models\PosaleModel');

        $lastHold = $holdModel
            ->where('register_id', $registerid)
            ->orderBy('id', 'desc')
            ->first();

        $number = !empty($lastHold) ? intval($lastHold->number) + 1 : 1;

        // Update Posales status
        $posaleModel->where([
            'status' => 1,
            'register_id' => $registerid,
            'user_id' => session('user_id')
        ])->set(['status' => 0])->update();

        // Insert into Hold
        $holdModel->insert([
            'number' => $number,
            'time' => date("H:i"),
            'register_id' => $registerid
        ]);

        return $this->response->setJSON(["status" => true]);
    }
    public function editpp($id)
    {
        $price = $this->request->getPost('price');

        // You can load models using model() helper or manually
        $posaleModel = $this->PosaleModel;
        $updated = $this->db->table('posales')->where('id', $id)->update([
            'price'     => $price,
            'org_price' => $price
        ]);


        return $this->response->setJSON(["status" => true]);
    }
    public function qeditpp($id)
    {
        $qt = $this->request->getPost('qt');

        $posaleqModel = model('App\Models\PosaleqModel');
        $posaleqModel->update($id, [
            'price' => $qt
        ]);

        return $this->response->setJSON(["status" => true]);
    }
    public function edit_proname($id)
    {
        $qt = $this->request->getPost('qt');

        $posaleModel = model('App\Models\PosaleModel');
        $productModel = model('App\Models\ProductModel');

        $posale = $posaleModel->find($id);
        $product = $productModel->find($posale['product_id']);

        $posaleModel->update($id, ['name' => $qt]);

        return $this->response->setJSON(["status" => true]);
    }
    public function qedit_proname($id)
    {
        $qt = $this->request->getPost('qt');

        $posaleqModel = model('App\Models\PosaleqModel');
        $productModel = model('App\Models\ProductModel');

        $posale = $posaleqModel->find($id);
        $product = $productModel->find($posale['product_id']);

        $db = \Config\Database::connect();
        $builder = $db->table('posales');
        $builder->where('id', $id)->update(['name' => $qt]);

        return $this->response->setJSON(["status" => true]);
    }
    public function removeHold($number, $registerid)
    {
        $db = \Config\Database::connect();

        // Delete the hold
        $builder = $db->table('holds');
        $builder->where(['number' => $number, 'register_id' => $registerid])->delete();

        // Clear posales with status = 1
        $posaleModel = model('App\Models\PosaleModel');
        $posaleModel->where([
            'status' => 1,
            'register_id' => session()->get('register_id'),
            'user_id' => session()->get('user_id')
        ])->delete();

        // Get last hold
        $holdModel = model('App\Models\HoldModel');
        $hold = $holdModel->where('register_id', $registerid)
            ->orderBy('id', 'DESC')
            ->first();

        if ($hold) {
            // Reassign the posales with the hold number to active
            $posaleModel->where([
                'number' => $hold->number,
                'register_id' => $registerid,
                'user_id' => session()->get('user_id')
            ])->set(['status' => 1])->update();
        }

        return $this->response->setJSON(["status" => true]);
    }
    public function selectHold($number)
    {
        $session = session();

        // Set all posales to inactive
        $this->PosaleModel->where([
            'status' => 1,
            'register_id' => $session->get('register'),
            'user_id' => $session->get('user_id')
        ])->set(['status' => 0])->update();

        // Set the selected hold's posales to active
        $this->PosaleModel->where([
            'number' => $number,
            'register_id' => $session->get('register'),
            'user_id' => $session->get('user_id')
        ])->set(['status' => 1])->update();

        return $this->response->setJSON(["status" => true]);
    }



    public function closeRegister()
    {
        $db = \Config\Database::connect();
        $register = $db->table('registers')->where('id', $this->register)->get()->getRow();
        $user = $db->table('users')->where('id', $register->user_id)->get()->getRow();
        $setting = $db->table('settings')->where('id', 1)->get()->getRow();

        $salesTable = $setting->themblock == 0 ? 'sales' : 'dsales';
        $ret_idd = $setting->themblock;

        $ff_ss = $db->query("SELECT SUM(total) AS CreditCardTotal FROM $salesTable WHERE register_id = '{$this->register}' AND status != 3")->getRow();
        $ff_sspay = $db->query("SELECT SUM(paid) AS CreditCardTotal1 FROM payements WHERE register_id = '{$this->register}' AND paidmethod = 0")->getRow();
        $mkimk = floatval($ff_sspay->CreditCardTotal1) + floatval($ff_ss->CreditCardTotal);

        $categories = $db->table('payment_mode')->where('id >', 1)->orderBy('id', 'ASC')->get()->getResult();

        $returns = $db->query("SELECT SUM(tootal) AS returntot FROM returnss WHERE register_idd = '{$this->register}' AND rsale_type = '$ret_idd'")->getRow();
        $returnAmount = floatval($returns->returntot);
        $totalExpected = $mkimk;

        $html = '<form id="closereg" name="closereg" action="' . base_url('pos/SubmitRegister') . '" method="POST">';
        $html .= '<div class="col-md-4"><footer><b>Opened by</b></footer><p>' . $user->firstname . ' ' . $user->lastname . '</p></div>';
        $html .= '<div class="col-md-4"><footer><b>Cash in Hand</b></footer><p>' . number_format($register->cash_inhand, 2) . ' ' . $setting->currency . '</p></div>';
        $html .= '<div class="col-md-4"><footer><b>Opening Time</b></footer><p>' . date('d-m-Y H:i:s') . '</p></div>';

        $html .= '<div class="col-md-12" style="height: 400px; overflow: auto;">';
        $html .= '<h3>Payments Summary</h3>';
        $html .= '<table class="table table-striped"><thead><tr><th>Payment Type</th><th>Expected (' . $setting->currency . ')</th><th>Counted</th><th>Difference</th></tr></thead><tbody>';

        // Cash row
        $html .= '<tr>
        <td>Cash</td>
        <td><input readonly class="form-control text-end" value="' . number_format($mkimk, 2) . '" name="expectedcash_1"></td>
        <td><input readonly class="form-control text-end" value="0.00" name="countedcash_1"></td>
        <td><input readonly class="form-control text-end" value="-' . number_format($mkimk, 2) . '" name="diffcash_1"></td>
    </tr>';

        // Dynamic payment rows
        foreach ($categories as $cat) {
            $expected = 0;
            if ($cat->id == 2) {
                $row = $db->query("SELECT SUM(paid) AS total FROM payements WHERE register_id = '{$this->register}' AND paidmethod = 1")->getRow();
                $expected += floatval($row->total);
            } elseif ($cat->id == 5) {
                $row = $db->query("SELECT SUM(paid) AS total FROM payements WHERE register_id = '{$this->register}' AND paidmethod = 2")->getRow();
                $expected += floatval($row->total);
            }
            $row = $db->query("SELECT SUM(total) AS total FROM $salesTable WHERE register_id = '{$this->register}' AND status != 3 AND paidmethod LIKE '{$cat->id}~%'")->getRow();
            $expected += floatval($row->total);

            $html .= '<tr>
            <td>' . esc($cat->name) . '</td>
            <td><input readonly class="form-control text-end" value="' . number_format($expected, 2) . '" name="expectedcash_' . $cat->id . '"></td>
            <td><input readonly class="form-control text-end" value="' . number_format($expected, 2) . '" name="countedcash_' . $cat->id . '"></td>
            <td><input readonly class="form-control text-end" value="0.00" name="diffcash_' . $cat->id . '"></td>
        </tr>';

            $totalExpected += $expected;
        }

        // Returns
        $html .= '<tr>
        <td>Returns</td>
        <td><input readonly class="form-control text-end" value="' . number_format($returnAmount, 2) . '" name="exp_retutn"></td>
        <td><input readonly class="form-control text-end" value="' . number_format($returnAmount, 2) . '" name="calc_retutn"></td>
        <td><input readonly class="form-control text-end" value="0.00" name="diff_retutn"></td>
    </tr>';

        // Totals
        $adjustedTotal = $totalExpected - $returnAmount;
        $countedTotal = $adjustedTotal - floatval($ff_ss->CreditCardTotal);
        $difference = 0 - floatval($ff_ss->CreditCardTotal);

        $html .= '<tr class="table-warning">
        <td><b>Total</b></td>
        <td><input readonly class="form-control text-end" value="' . number_format($adjustedTotal, 2) . '" name="total_cl"></td>
        <td><input readonly class="form-control text-end" value="' . number_format($countedTotal, 2) . '" name="countedtotal"></td>
        <td><input readonly class="form-control text-end" value="' . number_format($difference, 2) . '" name="difftotal"></td>
    </tr>';

        $html .= '</tbody></table></div>';

        // Cash Denominations (2000 - 10, Other)
        $html .= '<div class="col-md-4"><h4>Cash Denominations</h4><table class="table">';
        $denoms = [2000, 500, 200, 100, 50, 20, 10, 'Other'];
        foreach ($denoms as $i => $val) {
            $idx = $i + 1;
            $label = is_numeric($val) ? "$val X" : $val;
            $html .= '<tr>
            <td>' . $label . '</td>
            <td><input type="hidden" id="saa_' . $idx . '" name="saa_' . $idx . '" value="' . (is_numeric($val) ? $val : 1) . '">
                <input class="form-control" type="text" id="caa_' . $idx . '" name="caa_' . $idx . '" value="0" onkeyup="total_noots()">
            </td>
            <td><input class="form-control" type="text" id="kaa_' . $idx . '" name="kaa_' . $idx . '" value="0.00" readonly></td>
        </tr>';
        }
        $html .= '<tr><td colspan="2">Total</td><td><input class="form-control" name="subtott" id="subtott" readonly value="0.00"></td></tr>';
        $html .= '</table></div>';

        $html .= '<div class="col-md-4"><h4>Note</h4><textarea id="RegisterNote" name="RegisterNote" rows="5" class="form-control"></textarea><br>';
        $html .= '<input type="submit" class="btn btn-success" value="Save"></div>';
        $html .= '</form>';

        echo $html;
        exit;
    }


    public function submitGoods()
    {
        $date = date("Y-m-d H:i:s");

        $wareId = $this->request->getPost('warr');
        $refNo = $this->request->getPost('reff');
        $dateInput = $this->request->getPost('ppd');
        $numberOf = $this->request->getPost('cccc');
        $quantities = $this->request->getPost('qtt');
        $productIds = $this->request->getPost('idd');

        if ($dateInput) {
            $parts = explode('-', $dateInput); // expected format: dd-mm-yyyy
            $formattedDate = $parts[2] . '-' . $parts[1] . '-' . $parts[0];
        } else {
            $formattedDate = null;
        }

        $count = is_array($productIds) ? count($productIds) : 0;

        if ($refNo && $dateInput && $numberOf && $wareId && $count > 0) {
            // Insert into goodsout
            $db = \Config\Database::connect();
            $builder = $db->table('goodsout');
            $builder->insert([
                'wareid' => $wareId,
                'dateof' => $formattedDate,
                'refno' => $refNo,
                'nofof' => $numberOf,
                'createdbb' => 'admin', // consider replacing with logged-in user
                'todatedate' => $date
            ]);

            $goodsoutId = $db->insertID();

            for ($i = 0; $i < $count; $i++) {
                $productId = $productIds[$i];
                $qty = $quantities[$i];

                // Get product price
                $product = $db->table('products')->getWhere(['id' => $productId])->getRow();
                $totalPrice = $product ? $product->price * $qty : 0;

                // Insert into goodsitems
                $db->table('goodsitems')->insert([
                    'wareid' => $wareId,
                    'datea' => $formattedDate,
                    'producid' => $productId,
                    'qtyy' => $qty,
                    'nowdatt' => $date,
                    'goodsid' => $goodsoutId,
                    'totprice' => $totalPrice
                ]);

                // Insert into stock_transfer
                $db->table('stock_transfer')->insert([
                    'war_id' => $wareId,
                    'pro_id' => $productId,
                    'qty' => $qty,
                    'tyoftrans' => 6,
                    'date' => $formattedDate,
                    'perselphy_ids' => $goodsoutId
                ]);
            }
        }
    }
    public function submitRegister()
    {
        $date = date("Y-m-d H:i:s");

        $db = \Config\Database::connect();
        $builder = $db->table('registers');

        $data = [
            "cash_total" => $this->request->getPost('expectedcash_1'),
            "cash_sub" => $this->request->getPost('countedcash_1'),
            "cc_total" => 0,
            "cc_sub" => 0,
            "cheque_total" => 0,
            "cheque_sub" => 0,
            "note" => $this->request->getPost('RegisterNote'),
            "closed_by" => session('user_id'),
            "closed_at" => $date,
            "status" => 0
        ];

        $register = (new \App\Models\RegisterModel())->find($this->register);
        $store = (new \App\Models\StoreModel())->find($register->store_id);
        $store->status = 0;
        (new \App\Models\StoreModel())->update($register->store_id, $store);

        $builder->where('id', $this->register)->update($data);

        // Insert into registers_paymentmode
        $pmodes = $db->table('payment_mode')->orderBy('id', 'ASC')->get()->getResult();
        foreach ($pmodes as $mode) {
            $id = $mode->id;
            $db->table('registers_paymentmode')->insert([
                'reg_idd' => $this->register,
                'pay_m_id' => $id,
                'expectedcash' => $this->request->getPost('expectedcash_' . $id),
                'countedcash' => $this->request->getPost('countedcash_' . $id),
                'diffcash' => $this->request->getPost('diffcash_' . $id),
            ]);
        }

        // Insert returns
        $db->table('registers_ret_tot')->insert([
            'reg_idd' => $this->register,
            'pay_m_id' => 1,
            'expectedcash' => $this->request->getPost('exp_retutn'),
            'countedcash' => $this->request->getPost('calc_retutn'),
            'diffcash' => $this->request->getPost('diff_retutn'),
        ]);

        $db->table('registers_ret_tot')->insert([
            'reg_idd' => $this->register,
            'pay_m_id' => 2,
            'expectedcash' => $this->request->getPost('total_cl'),
            'countedcash' => $this->request->getPost('countedtotal'),
            'diffcash' => $this->request->getPost('difftotal'),
        ]);

        // Insert note counts
        for ($i = 1; $i <= 8; $i++) {
            $db->table('registers_note_count')->insert([
                'reg_idd' => $this->register,
                'pay_m_id' => $i,
                'expectedcash' => $this->request->getPost('saa_' . $i),
                'countedcash' => $this->request->getPost('caa_' . $i),
                'diffcash' => $this->request->getPost('kaa_' . $i),
            ]);
        }

        // Cleanup
        (new \App\Models\HoldModel())->where('register_id', $this->register)->delete();
        (new \App\Models\PosaleModel())
            ->where('status', 1)
            ->where('register_id', $this->register)
            ->where('user_id', session('user_id'))
            ->delete();

        session()->set('register', 0);

        return redirect()->to(base_url());
    }
    public function email()
    {
        $email = $this->request->getPost('email');
        $content = $this->request->getPost('content');

        $emailService = \Config\Services::email();

        $emailService->setTo($email);
        $emailService->setFrom('no-reply@' . setting('App.companyname') . '.com', setting('App.companyname'));
        $emailService->setSubject('Your Receipt');
        $emailService->setMessage($content);
        $emailService->setMailType('html');

        if ($emailService->send()) {
            return $this->response->setJSON(['status' => true]);
        } else {
            return $this->response->setJSON(['status' => false, 'error' => $emailService->printDebugger()]);
        }
    }
    // public function pdfreceipt()
    // {
    //     $content = $this->request->getPost('content');

    //     // Load the TCPDF library
    //     $pdf = new Pdf('P', 'mm', 'A4', true, 'UTF-8', false);
    //     $pdf->SetTitle('Pdf');
    //     $pdf->SetHeaderMargin(30);
    //     $pdf->SetTopMargin(20);
    //     $pdf->SetFooterMargin(20);
    //     $pdf->SetAutoPageBreak(true);
    //     $pdf->SetAuthor('Author');
    //     $pdf->SetDisplayMode('real', 'default');

    //     $pdf->AddPage();
    //     $pdf->writeHTMLCell(0, 0, '', '', $content, 0, 1, 0, true, '', true);

    //     if (ob_get_contents()) {
    //         ob_end_clean();
    //     }

    //     $pdf->Output('pdfexample.pdf', 'D'); // Download the PDF
    //     exit;
    // }


    public function pdfreceipt()
    {
        $content = $this->request->getPost('content');

        $pdf = new Pdf('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->SetTitle('Pdf');
        $pdf->SetHeaderMargin(30);
        $pdf->SetTopMargin(20);
        $pdf->setFooterMargin(20);
        $pdf->SetAutoPageBreak(true);
        $pdf->SetAuthor('Author');
        $pdf->SetDisplayMode('real', 'default');

        $pdf->AddPage();
        $pdf->writeHTMLCell(0, 0, '', '', $content, 0, 1, 0, true, '', true);


        if (ob_get_length()) {
            ob_end_clean();
        }
        return $this->response
            ->setContentType('application/pdf')
            ->setHeader('Content-Disposition', 'attachment; filename="pdfexample.pdf"')
            ->setBody($pdf->Output('pdfexample.pdf', 'S')); // 'S' = return as string
    }

    public function excelreceipt()
    {
        $content = $this->request->getPost('content');

        try {
            $file = $this->request->getFile('file');
            if (!$file->isValid()) {
                throw new \Exception('Invalid file upload');
            }

            require_once(APPPATH . 'ThirdParty/PHPExcel/IOFactory.php');
            $filePath = WRITEPATH . 'uploads/' . $file->getName();
            $file->move(WRITEPATH . 'uploads');

            $objPHPExcel = \PHPExcel_IOFactory::load($filePath);
        } catch (\Exception $e) {
            return $this->response->setJSON([
                'success' => false,
                'msg' => 'Error Uploading file: ' . $e->getMessage()
            ]);
        }

        $allDataInSheet = $objPHPExcel->getActiveSheet()->toArray(null, true, true, true);

        foreach ($allDataInSheet as $import) {
            echo $import['A'] ?? '';
            echo $import['B'] ?? '';
            echo $import['C'] ?? '';
            echo $import['D'] ?? '';
        }
    }

    public function addNewSaleTest($type)
    {
        $request = service('request');
        $session = session();
        $db = db_connect();

        $total = $request->getPost('total');
        if ($total <= 0) {
            return view('errors/html/empty'); // Move this to a view for better control
        }

        $clientId = $request->getPost('client_id');
        $client = (new CustomerModel())->find($clientId);

        $creditPoint = intval($total / 100);
        if ($clientId > 0 && $creditPoint > 0 && $client) {
            $db->table('customers')->where('id', $clientId)->update([
                'tot_creaditpoint' => $client['tot_creaditpoint'] + $creditPoint
            ]);
        }

        $custStateType = 1;
        if ($clientId > 0 && $client && $client['custstate'] != $this->setting->mystate) {
            $custStateType = 2;
        }

        $register = (new RegisterModel())->find($this->register);
        $storeId = $register['store_id'];
        $now = date('Y-m-d H:i:s');

        $saleData = [
            'mobnnm'       => $request->getPost('mobnnm'),
            'kms'          => $request->getPost('kms'),
            'custrrf'      => $request->getPost('custrrf'),
            'clientname'   => $request->getPost('clientname'),
            'client_id'    => $clientId,
            'subtotal'     => $request->getPost('subtotal'),
            'discount'     => $this->setting->disc_all == 1
                ? $request->getPost('discountamount')
                : $request->getPost('discount_indujul'),
            'yyear'        => $this->setting->regidd,
            'register_id'  => $this->register,
            'created_at'   => $now,
            'attime'       => $now,
            'salesperson'  => $session->get('user_id'),
            'tot_creaditpoint' => $creditPoint,
            'custstattype' => $custStateType,
            'firstpayement' => ($request->getPost('paid') - $total > 0) ? $total : $request->getPost('paid')
        ];

        // Handle Stripe Payment
        if ($type == 2) {
            try {
                \Stripe\Stripe::setApiKey($this->setting->stripe_secret_key);

                \Stripe\Charge::create([
                    'source'   => [
                        'object' => 'card',
                        'number' => $request->getPost('ccnum'),
                        'exp_month' => $request->getPost('ccmonth'),
                        'exp_year'  => $request->getPost('ccyear'),
                        'cvc'       => $request->getPost('ccv')
                    ],
                    'amount'   => floatval($request->getPost('paid')) * 100,
                    'currency' => $this->setting->currency,
                ]);
                echo "<p class='bg-success text-center'>" . lang('saleStripesccess') . "</p>";
            } catch (\Stripe\Exception\CardException $e) {
                $body = $e->getJsonBody();
                $err  = $body['error'];
                echo "<p class='bg-danger text-center'>" . $err['message'] . "</p>";
            }
        }

        // Clean up sensitive fields
        $saleData['paid'] = $request->getPost('paid');
        $saleData['total'] = $total;
        unset($saleData['ccnum'], $saleData['ccmonth'], $saleData['ccyear'], $saleData['ccv']);

        // Save Sale
        $saleModel = new SaleModel();
        $saleId = $saleModel->insert($saleData, true); // return insert ID
        $sale = $saleModel->find($saleId);

        // Update related sale quote
        if ($request->getPost('qt_id')) {
            $db->table('saleqs')->where('id', $request->getPost('qt_id'))->update([
                'sal_id' => $saleId
            ]);
        }

        // You can continue from here to convert:
        // - payment handling
        // - posale iteration
        // - tax breakdowns
        // - printer rendering
        // - SMS dispatching
        // - return value or final receipt

        return $this->response->setJSON(['success' => true, 'sale_id' => $saleId]);
    }

    public function addNewSaleTest2ndPart()
    {
        $posaleModel = new PosaleModel();
        $posales = $posaleModel->where([
            'status' => 1,
            'register_id' => $this->register,
            'user_id' => $session->get('user_id')
        ])->findAll();

        $productModel = new \App\Models\ProductModel();
        $stockModel = new \App\Models\StockModel();
        $saleItemModel = new \App\Models\SaleItemModel();

        foreach ($posales as $posale) {
            $product = $productModel->find($posale['product_id']);
            $priceTotal = $posale['price'] * $posale['qt'];

            // Discount calculations
            $discountAmount = 0;
            $discountPercent = 0;
            if ($this->setting->disc_pro == 1) {
                $discountPercent = $session->get('dper_' . $posale['id']) ?? 0;
                $discountAmount = $session->get('tper_' . $posale['id']) ?? 0;
            }

            // Tax
            $cgst = $this->setting->gst_tax == 1 ? ($product['tax'] ?? 0) : 0;
            $sgst = $this->setting->gst_tax == 1 ? ($product['sgst'] ?? 0) : 0;
            $igst = ($custStateType == 2) ? ($product['igst'] ?? 0) : 0;
            $totalTax = $cgst + $sgst;

            // Calculate subtotal based on discount
            $discountRate = ($request->getPost('discountamount') / $request->getPost('subtotal')) * 100;
            $discountedSubtotal = $priceTotal - ($priceTotal * $discountRate / 100);

            // Insert into stock_transfer (CI4 Query Builder)
            $db->table('stock_transfer')->insert([
                'llvel' => 1,
                'rrack' => 1,
                'peritemid' => $posale['purid'],
                'war_id' => 0,
                'store_id' => $storeId,
                'pro_id' => $posale['product_id'],
                'qty' => $posale['qt'],
                'tyoftrans' => 2,
                'date' => date('Y-m-d'),
                'bywhom' => $sale['created_by'],
                'perselphy_ids' => 0,
                'totamt' => $discountedSubtotal
            ]);

            // Reduce stock
            $stock = $stockModel
                ->where(['store_id' => $storeId, 'product_id' => $posale['product_id']])
                ->first();

            if ($stock) {
                $newQty = $stock['quantity'] - $posale['qt'];
                $stockModel->update($stock['id'], ['quantity' => $newQty]);
            }

            // Add sale item
            $saleItemModel->insert([
                'product_id' => $posale['product_id'],
                'name' => $posale['name'],
                'price' => $posale['price'],
                'qt' => $posale['qt'],
                'subtotal' => $priceTotal,
                'sale_id' => $saleId,
                'store_irrdd' => $storeId,
                'cgst' => $cgst,
                'sgst' => $sgst,
                'igstt' => $igst,
                'date' => date('Y-m-d H:i:s'),
                'dis_per' => $discountPercent,
                'dis_amt' => $discountAmount,
                'perprice' => $product['cost'],
                'mrpp' => $product['rrate'],
                'subtotal2' => $priceTotal, // Adjust if needed
                'tottax' => $totalTax
            ]);
        }
    }


    // addNewSaleTest 2nd Part 
    public function print_ticket()
    {
        $myrtax = [];
        $cgstTax = [];
        $taxSummaryTable = $db->table('tax_summary');

        foreach ($posales as $posale) {
            $product = $productModel->find($posale['product_id']);
            $basePrice = $posale['price'];
            $qt = $posale['qt'];

            $rtcc = ($custStateType == 1)
                ? $basePrice / (1 + ($product['tax'] + $product['sgst']) / 100)
                : $basePrice / (1 + $product['igst'] / 100);

            $taxList = $db->table('taxprolist')
                ->where([
                    'proid' => $posale['product_id'],
                    'custtype' => $custStateType
                ])
                ->get()
                ->getResultArray();

            foreach ($taxList as $taxRow) {
                $taxId = $taxRow['taxid'];
                $myrtax[$taxId] = $myrtax[$taxId] ?? 0;

                $taxAmount = ($rtcc * $qt * $taxRow['taxamount']) / 100;
                $myrtax[$taxId] += $taxAmount;
            }
        }

        // Insert summarized tax rows
        foreach ($myrtax as $taxId => $amount) {
            $tax = $db->table('tax')->where('id', $taxId)->get()->getRowArray();
            if (!$tax) continue;

            $gross = ($amount * 100) / $tax['valueper'];
            $discountPercent = $request->getPost('discountamount') / $request->getPost('subtotal') * 100;
            $netGross = $gross - ($gross * $discountPercent / 100);
            $netTax = $amount - ($amount * $discountPercent / 100);

            $taxSummaryTable->insert([
                'salesid'   => $saleId,
                'taxname'   => $tax['name'],
                'taxpercent' => $tax['valueper'],
                'taxamount' => round($netTax, 2),
                'taxfrom'   => round($netGross, 2),
                'datedd'    => date("Y-m-d"),
                'c_s_i'     => $tax['custtype']
            ]);
        }
        return view('receipts/print_ticket', [
            'sale'      => $sale,
            'posales'   => $posales,
            'store'     => (new StoreModel())->find($storeId),
            'customer'  => $client ?? null,
            'discount'  => $request->getPost('discountamount'),
            'subtotal'  => $request->getPost('subtotal'),
            'taxSummary' => $myrtax
        ]);
    }


    public function AddNewSaletest_old($type)
    {
        helper(['form', 'url']);

        $request = service('request');
        $session = session();
        $db = db_connect();

        $tycvzz = $request->getPost('mobnnm');
        $kms = $request->getPost('kms');
        $custrrf = $request->getPost('custrrf');
        $taname = $request->getPost('clientname');
        $custidkk = $request->getPost('client_id');
        $sssb = $request->getPost('subtotal');
        $sssd = $request->getPost('discountamount');

        $customerModel = new CustomerModel();
        $settingModel = new SettingModel();
        $saleModel = new SaleModel();
        $posaleModel = new PosaleModel();
        $registerModel = new RegisterModel();
        $storeModel = new StoreModel();

        $client = $customerModel->find($custidkk);
        $setting = $settingModel->find(1);

        if ($custidkk > 0) {
            $customer = $db->table('customers')->getWhere(['id' => $custidkk])->getRowArray();
            $_POST['custstattype'] = ($customer['custstate'] == $setting['mystate']) ? 1 : 2;
        } else {
            $_POST['custstattype'] = 1;
        }

        $date = date("Y-m-d H:i:s");
        $kmddwe = date("Y-m-d");

        $_POST['created_at'] = $date;
        $_POST['attime'] = $date;
        $_POST['salesperson'] = $session->get('user_id');
        $_POST['yyear'] = $setting['regidd'];
        $_POST['register_id'] = $session->get('register');

        if ($type == 2) {
            try {
                \Stripe\Stripe::setApiKey($setting['stripe_secret_key']);
                \Stripe\Charge::create([
                    'card' => [
                        'number' => $request->getPost('ccnum'),
                        'exp_month' => $request->getPost('ccmonth'),
                        'exp_year' => $request->getPost('ccyear'),
                        'cvc' => $request->getPost('ccv')
                    ],
                    'amount' => floatval($request->getPost('paid')) * 100,
                    'currency' => $setting['currency']
                ]);
                echo "<p class='bg-success text-center'>Stripe payment successful.</p>";
            } catch (\Stripe\Exception\CardException $e) {
                echo "<p class='bg-danger text-center'>" . $e->getError()->message . "</p>";
            }
        }

        unset($_POST['ccnum'], $_POST['ccmonth'], $_POST['ccyear'], $_POST['ccv'], $_POST['sals_iidr']);

        $paystatus = $_POST['paid'] - $_POST['total'];
        $_POST['firstpayement'] = ($paystatus > 0) ? $_POST['total'] : $_POST['paid'];
        $saleModel->insert($_POST);
        $saleID = $saleModel->getInsertID();

        $posales = $posaleModel
            ->where('status', 1)
            ->where('register_id', $session->get('register'))
            ->where('user_id', $session->get('user_id'))
            ->findAll();

        // Render receipt view with all required data
        $receiptData = [
            'setting' => $setting,
            'sale' => $saleModel->find($saleID),
            'store' => $storeModel->find($registerModel->find($session->get('register'))->store_id),
            'posales' => $posales,
            'customer' => $client,
            'taname' => $taname,
            'tycvzz' => $tycvzz,
            'custrrf' => $custrrf,
            'subtotal' => $sssb,
            'discountamount' => $sssd
        ];

        // Include a placeholder for printer rendering (you would invoke your print service here)
        echo view('receipts/full_receipt', $receiptData);

        // Clear POS cart after print
        $posaleModel->where('status', 1)
            ->where('register_id', $session->get('register'))
            ->where('user_id', $session->get('user_id'))
            ->delete();

        return;
    }


    public function searchitemscap()
    {
        $return_arr = '';
        $inm = $this->db->query("select * from products order by name asc");
        while ($inmf = mysql_fetch_object($inm)) {
            $inmfcal = $inmf->taxmethod == 0 ? $inmf->price : $inmf->price * (1 + $inmf->tax / 100);
            $imfg = $inmf->photothumb != '' ? base_url('files/products/' . $inmf->photothumb) : base_url('files/products/noimage.png');

            $return_arr .= '<li style="list-style: none;" class="table-view-cell media">
            <a onclick="barcode(' . $inmf->id . ')" class="item" href="javascript:void(0);">
                <div style="width:12%;float:left;">
                    <img style="width: 50px;height:50px;border: 0px;background: transparent;" class="media-object small pull-left" src="' . $imfg . '">
                </div>
                <div style="width:68%;float:left;padding: 5px;">
                    <h4 class="item-note">' . $inmf->name . '</h4>
                    <h5>2898</h5>
                </div>
                <div style="width:20%;float:left;padding: 5px;text-align:right;">
                    <h4>' . $inmfcal . '</h4>
                </div>
            </a>
        </li>';
        }

        echo $return_arr;
    }
    public function addpdcphonegap($rr, $uu, $reg)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('products');
        $product = $builder->where('id', $rr)->get()->getRow();

        if (!$product) {
            return $this->response->setJSON(['error' => 'Product not found']);
        }

        $postPrice = $product->price;
        $price = (!$product->taxmethod || $product->taxmethod == '0')
            ? floatval($postPrice)
            : floatval($postPrice) * (1 + $product->tax / 100);

        $posalesBuilder = $db->table('posales');

        $existing = $posalesBuilder
            ->where('product_id', $rr)
            ->where('register_id', $reg)
            ->where('user_id', $uu)
            ->get()
            ->getRow();

        if (!$existing) {
            // Insert new row
            $posalesBuilder->insert([
                'product_id' => $rr,
                'name' => $product->name,
                'price' => $price,
                'qt' => 1,
                'status' => 1,
                'register_id' => $reg,
                'number' => 1,
                'user_id' => $uu
            ]);
        } else {
            // Update existing quantity
            $newQt = $existing->qt + 1;
            $posalesBuilder
                ->where('product_id', $rr)
                ->where('register_id', $reg)
                ->where('user_id', $uu)
                ->update(['qt' => $newQt]);
        }

        // Fetch updated totals
        $totalBuilder = $db->table('posales')
            ->select('SUM(qt) as tyu, SUM(price * qt) as ppric')
            ->where('user_id', $uu)
            ->where('register_id', $reg)
            ->get()
            ->getRow();

        return $this->response->setJSON([$totalBuilder->tyu, $totalBuilder->ppric]);
    }
    public function addpdcphonegapc($uuw, $uu)
    {
        $db = \Config\Database::connect();

        $result = $db->table('posales')
            ->select('SUM(qt) as ttu, SUM(price * qt) as ppric')
            ->where('user_id', $uuw)
            ->where('register_id', $uu)
            ->get()
            ->getRow();

        $response = [
            'ttu' => (float) $result->ttu ?? 0,
            'ppric' => (float) $result->ppric ?? 0
        ];

        return $this->response->setJSON($response);
    }
    public function searchitemscapby()
    {
        $searchTerm = $this->request->getPost('custrrf');
        $db = \Config\Database::connect();
        $builder = $db->table('products');
        $builder->like('name', $searchTerm);
        $builder->orderBy('name', 'ASC');
        $products = $builder->get()->getResult();

        $returnHTML = '';

        foreach ($products as $product) {
            $price = ($product->taxmethod == 0)
                ? $product->price
                : $product->price * (1 + $product->tax / 100);

            $image = !empty($product->photothumb)
                ? base_url('files/products/' . $product->photothumb)
                : base_url('files/products/noimage.png');

            $returnHTML .= '
        <li style="list-style: none;" class="table-view-cell media">
            <a onclick="barcode(' . $product->id . ')" class="item" href="javascript:void(0);">
                <div style="width:12%;float:left;">
                    <img style="width: 50px;height:50px;border: 0px;background: transparent;" class="media-object small pull-left" src="' . $image . '">
                </div>
                <div style="width:68%;float:left;padding: 5px;">
                    <h4 class="item-note">' . esc($product->name) . '</h4>
                    <h5>2898</h5>
                </div>
                <div style="width:20%;float:left;padding: 5px;text-align:right;">
                    <h4>' . number_format($price, 2) . '</h4>
                </div>
            </a>
        </li>';
        }

        return $this->response->setBody($returnHTML);
    }
    public function searchitemscapcatres($rrv)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('products');

        if ((int)$rrv > 0) {
            $builder->where('category', $rrv);
        }

        $builder->orderBy('name', 'ASC');
        $products = $builder->get()->getResult();

        $returnHTML = '';

        foreach ($products as $product) {
            $price = ($product->taxmethod == 0)
                ? $product->price
                : $product->price * (1 + $product->tax / 100);

            $image = !empty($product->photothumb)
                ? base_url('files/products/' . $product->photothumb)
                : base_url('files/products/noimage.png');

            $returnHTML .= '
        <li style="list-style: none;" class="table-view-cell media">
            <a onclick="barcode(' . $product->id . ')" class="item" href="javascript:void(0);">
                <div style="width:12%;float:left;">
                    <img style="width: 50px;height:50px;border: 0px;background: transparent;" class="media-object small pull-left" src="' . $image . '">
                </div>
                <div style="width:68%;float:left;padding: 5px;">
                    <h4 class="item-note">' . esc($product->name) . '</h4>
                    <h5>2898</h5>
                </div>
                <div style="width:20%;float:left;padding: 5px;text-align:right;">
                    <h4>' . number_format($price, 2) . '</h4>
                </div>
            </a>
        </li>';
        }

        return $this->response->setBody($returnHTML);
    }
    public function searchreceipt($uuw, $tymnn)
    {
        $db = \Config\Database::connect();

        $builder = $db->table('posales');
        $builder->where('user_id', $uuw)
            ->where('register_id', $tymnn)
            ->orderBy('id', 'ASC');
        $query = $builder->get();

        $receiptHTML = '';

        foreach ($query->getResult() as $row) {
            $totalPrice = $row->price * $row->qt;

            $receiptHTML .= '
        <li onclick="kkll(' . $row->id . ');" style="list-style: none;" class="table-view-cell media">
            <a class="item" href="javascript:void(0);">
                <div style="width:78%;float:left;padding: 5px;">
                    <h4 class="item-note">' . esc($row->name) . ' * ' . $row->qt . '</h4>
                    <h5>' . esc($row->product_id) . '</h5>
                </div>
                <div style="width:20%;float:left;padding: 5px;text-align:right;">
                    <h4>' . number_format($totalPrice, 2) . '</h4>
                </div>
            </a>
        </li>';
        }

        return $this->response->setBody($receiptHTML);
    }
    public function additemsmore($rc)
    {
        $db = \Config\Database::connect();

        // Fetch current quantity
        $posale = $db->table('posales')->where('id', $rc)->get()->getRow();

        if ($posale) {
            $newQty = $posale->qt + 1;

            // Update quantity
            $db->table('posales')->where('id', $rc)->update(['qt' => $newQty]);

            return $this->response->setBody('1');
        } else {
            return $this->response->setBody('0'); // Not found
        }
    }
    public function subbbitemsmore($rc)
    {
        $db = \Config\Database::connect();

        // Fetch current quantity
        $posale = $db->table('posales')->where('id', $rc)->get()->getRow();

        if ($posale && $posale->qt > 1) {
            $newQty = $posale->qt - 1;

            // Update quantity
            $db->table('posales')->where('id', $rc)->update(['qt' => $newQty]);

            return $this->response->setBody('1');
        } elseif ($posale && $posale->qt == 1) {
            // Optional: If quantity is 1, you can delete the row or keep it as is.
            // $db->table('posales')->where('id', $rc)->delete();
            return $this->response->setBody('1');
        } else {
            return $this->response->setBody('0'); // Not found
        }
    }
    public function totcalitemsmore($rc = null, $tt = null)
    {
        if (!$rc || !$tt) {
            return $this->response->setBody('0');
        }

        $db = \Config\Database::connect();

        $updated = $db->table('posales')
            ->where('id', $rc)
            ->update(['qt' => $tt]);

        return $this->response->setBody($updated ? '1' : '0');
    }
    public function addNewSalePhonegap($type)
    {
        $request = service('request');
        $db = \Config\Database::connect();
        $setting = $this->setting;

        $tycvzz = $request->getPost('mobnnm');
        $reggkkr = $request->getPost('regg');
        $created_byf = $request->getPost('created_by');
        $custrrf = $request->getPost('custrrf');
        $taname = $request->getPost('clientname');
        $custidkk = $request->getPost('client_id');

        $created_by = $db->table('users')->where('id', $created_byf)->get()->getRow('firstname') . ' ' . $db->table('users')->where('id', $created_byf)->get()->getRow('lastname');

        $lxzmm = $db->table('settings')->where('id', 1)->get()->getRowArray();
        if ($custidkk > 0) {
            $cust = $db->table('customers')->where('id', $custidkk)->get()->getRowArray();
            $_POST['custstattype'] = ($cust['custstate'] == $lxzmm['mystate']) ? 1 : 2;
        } else {
            $_POST['custstattype'] = 1;
        }

        $now = date("Y-m-d H:i:s");

        $_POST['created_at'] = $now;
        $_POST['created_by'] = $created_by;
        $_POST['attime'] = $now;
        $_POST['yyear'] = $setting->regidd;
        $_POST['register_id'] = $reggkkr;

        // Handle Stripe payment if type == 2
        if ($type == 2) {
            try {
                Stripe::setApiKey($setting->stripe_secret_key);
                $charge = Stripe_Charge::create([
                    'card' => [
                        'number' => $request->getPost('ccnum'),
                        'exp_month' => $request->getPost('ccmonth'),
                        'exp_year' => $request->getPost('ccyear'),
                        'cvc' => $request->getPost('ccv')
                    ],
                    'amount' => floatval($request->getPost('paid')) * 100,
                    'currency' => $setting->currency
                ]);
            } catch (\Exception $e) {
                return "<p class='bg-danger text-center'>{$e->getMessage()}</p>";
            }
        }

        unset($_POST['ccnum'], $_POST['ccmonth'], $_POST['ccyear'], $_POST['ccv']);

        $_POST['firstpayement'] = ($_POST['paid'] - $_POST['total']) > 0 ? $_POST['total'] : $_POST['paid'];

        $sale = new Sale();
        $sale->insert($_POST);
        $saleId = $sale->getInsertID();

        $posales = (new PosaleModel())->where([
            'status' => 1,
            'register_id' => $reggkkr,
            'user_id' => $created_byf
        ])->findAll();

        // Generate sale items from posales
        foreach ($posales as $posale) {
            $product = $db->table('products')->where('id', $posale['product_id'])->get()->getRowArray();

            // Tax calculations
            $cgst = $lxzmm['gst_tax'] == 1 ? $product['tax'] : 0;
            $sgst = $lxzmm['gst_tax'] == 1 ? $product['sgst'] : 0;
            $gst = $cgst + $sgst;

            $price = $product['taxmethod'] > 0 ? $product['price'] * $posale['qt'] : round($product['price'] / (1 + $gst / 100), 2) * $posale['qt'];

            $item = [
                'product_id' => $posale['product_id'],
                'name' => $posale['name'],
                'price' => $posale['price'],
                'qt' => $posale['qt'],
                'subtotal' => $posale['price'] * $posale['qt'],
                'sale_id' => $saleId,
                'cgst' => $cgst,
                'sgst' => $sgst,
                'igstt' => 0,
                'date' => $now,
                'dis_per' => session()->get("dper_{$posale['id']}") ?? 0,
                'dis_amt' => session()->get("tper_{$posale['id']}") ?? 0,
                'perprice' => $product['cost'],
                'mrpp' => $product['rrate'],
                'subtotal2' => $price,
                'tottax' => $gst
            ];

            (new SaleItem())->insert($item);
        }

        // Delete posales
        (new PosaleModel())->where([
            'status' => 1,
            'register_id' => $reggkkr,
            'user_id' => $created_byf
        ])->delete();

        // Generate and return the ticket view
        $data = [
            'sale' => $sale->find($saleId),
            'posales' => $posales,
            'setting' => $setting,
            'store' => $db->table('stores')->where('id', 1)->get()->getRowArray()
        ];

        return view('receipts/sale_ticket', $data);
    }
    public function addNewSaleQtNext($type)
    {
        $request = service('request');
        $session = session();

        $post = $request->getPost();

        $client_id = $post['client_id'];
        $customerModel = new CustomerModel();
        $registerModel = new RegisterModel();
        $saleqModel = new SaleqModel();
        $storeModel = new StoreModel();
        $settingsModel = new SettingsModel();
        $posaleModel = new PosaleModel();
        $productModel = new ProductModel();
        $purchaseItemModel = new PurchaseItemModel();

        $setting = $settingsModel->find(1);

        $client = $customerModel->find($client_id);

        // Determine customer state type
        $custStateType = 1;
        if ($client_id > 0 && isset($client['custstate']) && $client['custstate'] != $setting['mystate']) {
            $custStateType = 2;
        }

        // Set up basic sale info
        $register_id = $session->get('register');
        $store_id = $registerModel->find($register_id)['store_id'];
        $created_at = date('Y-m-d H:i:s');
        $post['created_at'] = $created_at;
        $post['attime'] = $created_at;
        $post['salesperson'] = $session->get('user_id');
        $post['yyear'] = $setting['regidd'];
        $post['register_id'] = $register_id;

        // Process Stripe payment if type is 2 (optional: to implement)

        // Calculate payment status
        $paystatus = $post['paid'] - $post['total'];
        $post['firstpayement'] = $paystatus > 0 ? $post['total'] : $post['paid'];

        // Insert new sale
        $saleId = $saleqModel->insert($post);
        $sale = $saleqModel->find($saleId);

        // If linked return sale, update payments
        if (!empty($sale['lalid']) && !empty($sale['lalamt'])) {
            $updatedPaid = $sale['lalamt'] + $sale['paid'];

            $saleqModel->update($saleId, [
                'paid' => $updatedPaid,
                'status' => ($sale['total'] <= $updatedPaid) ? 0 : $sale['status']
            ]);

            $paymentModel = new PayementModel();
            $paymentModel->insert([
                'date' => date('Y-m-d'),
                'paid' => $sale['lalamt'],
                'paidmethod' => 4,
                'created_by' => $sale['created_by'],
                'register_id' => $sale['register_id'],
                'sale_id' => $saleId
            ]);

            // Update returnss
            db_connect()->table('returnss')->where('re_id', $sale['lalid'])->update([
                'purcha_sales_id' => $saleId,
                'retun_amt_stas' => 1,
                'date_retun' => date('Y-m-d H:i:s')
            ]);
        }

        // Load all POS sale items for user
        $user_id = $session->get('user_id');
        $posales = $posaleModel
            ->where(['status' => 1, 'register_id' => $register_id, 'user_id' => $user_id])
            ->findAll();

        // Now loop through each posale to update stock, transfer, create sale items (to be done)

        // Delete posales for user
        $posaleModel
            ->where(['status' => 1, 'register_id' => $register_id, 'user_id' => $user_id])
            ->delete();

        // Restore from last hold if exists
        $holdModel = new HoldModel();
        $lastHold = $holdModel->where('register_id', $register_id)->orderBy('id', 'desc')->first();
        if ($lastHold) {
            $posaleModel->where([
                'number' => $lastHold['number'],
                'register_id' => $register_id,
                'user_id' => $user_id
            ])->set(['status' => 1])->update();
        }

        // Optional: Send SMS if enabled

        // Render view
        return view('pos/receipt_ticket', [
            'sale' => $sale,
            'client' => $client,
            'posales' => $posales,
            'custStateType' => $custStateType,
            'store' => $storeModel->find($store_id),
            'setting' => $setting,
            'printCount' => $this->setting->pptt ?? 1
        ]);
    }
    // ======    

    public function remotesave($table)
    {
        //print_r(json_encode($_POST));exit;
        $table = 'sales';
        $itemtbale = 'sale_items';

        //$arr = array('a' => 1, 'b' => 2, 'c' => 3, 'd' => 4, 'e' => 5);    


        $data = $_POST;
        $stre_ids = array();
        foreach ($data as $dta) {
            if ($table == 'sales') {
                $saleModel = new SaleModel();
            } else if ($table == 'dsales') {

                $saleModel = new DsaleModel();
            }

            $prod_data = $dta;

            $stre_ids[] = $dta['id'];

            unset($prod_data['items']);



            // saleModel = new SaleModel();
            /*$saleData = [
                'client_id' => $dta['client_id'],
                'subtotal' => $dta['subtotal'],
                'total' => $dta['total'],
                'paid' => $dta['paid'],
                'register_id' => $dta['register_id'],
                // 'created_at' => date("Y-m-d H:i:s"),
                'salesperson' => $dta['salesperson'],
                'totalitems' => $dta['totalitems'],
                'mobnnm' => $dta['mobnnm'],
                'discountamount' => $dta['discountamount'],
                'recivamt' => $dta['recivamt'],
            ];*/

            //

            $saleId = $saleModel->insert($prod_data);




            //$saleId    = $saleModel->insert($saleData, true); // return insert ID
            //$sale      = $saleModel->find($saleId);


            foreach ($dta['items'] as $item) {


                $storeId = $item['store_irrdd'];
                $item['sale_id'] = $saleId;
                $stockModel = new StockModel();

                $stock     = $stockModel->where(['store_id' => $storeId, 'product_id' => $item['product_id']])->first();


                if (!empty($stock)) {

                    //echo $stock['id'];

                    //return $this->response->setJSON(['success' => true, 'sale_id' => $saleId]);


                    //print_r( json_encode($stock->quantity));exit;

                    // $rr =  $stock['quantity'];
                    if ($table == 'sales') {

                        $newQty = $stock->quantity - $item['qt'];

                        $stockModel->update($stock->id, ['quantity' => $newQty]);
                    }
                }

                if ($table == 'sales') {
                    $saleItemModel = new SaleItemModel();
                } elseif ($table == 'dsales') {
                    $saleItemModel = new DsaleItemModel();
                }

                $saleItemModel->insert($item);
                // Add sale item
                /*$saleItemModel->insert([
                    'product_id' => $posale['product_id'],
                    'name' => $posale['name'],
                    'price' => $posale['price'],
                    'qt' => $posale['qt'],
                    'subtotal' => $priceTotal,
                    'sale_id' => $saleId,
                    'store_irrdd' => $storeId,
                    'cgst' => $cgst,
                    'sgst' => $sgst,
                    'igstt' => $igst,
                    'date' => date('Y-m-d H:i:s'),
                    'dis_per' => $discountPercent,
                    'dis_amt' => $discountAmount,
                    'perprice' => $product['cost'],
                    'mrpp' => $product['rrate'],
                    'subtotal2' => $priceTotal, // Adjust if needed
                    'tottax' => $totalTax
                ]);*/
            }
        }

        return $this->response->setJSON(['success' => true, 'stre_ids' => $stre_ids]);
    }
}
