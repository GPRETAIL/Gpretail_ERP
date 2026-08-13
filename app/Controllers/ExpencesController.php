<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\ExpenceModel;
use App\Models\UserModel;
use App\Models\SettingModel;
use App\Models\StoreModel;
use App\Models\CategorieExpenceModel;
use App\Models\Expence;
use CodeIgniter\HTTP\ResponseInterface;

class ExpencesController extends BaseController
{
    protected $expence;
    protected $user;
    protected $setting;

    public function __construct()
    {
        $UserModel = new UserModel();
        $SettingModel = new SettingModel();
        $CategorieExpence = new CategorieExpenceModel();
        $this->expence = new ExpenceModel();
        $this->user = session()->get('user_id') ? $UserModel->find(session()->get('user_id')) : false;
        $lang = session()->get('lang') ?? 'english';
        $this->setting = $SettingModel->find(1);
    }

    public function ajax_list(): ResponseInterface
    {
        $CategorieExpence = new CategorieExpenceModel();
        $StoreModel = new StoreModel();
        $UserModel = new UserModel();
        $rolr = $this->user->role;
        $kkar = db_connect()->query("SELECT * FROM permission_new WHERE nname = '$rolr'")->getRowArray();
        date_default_timezone_set($this->setting->timezone);

        $list = $this->expence->get_datatables();
        $data = [];
        $no = $this->request->getPost('start');

        foreach ($list as $expence) {
            $no++;
            $row = [];
            $row[] = date('d-m-Y', strtotime($expence->date));
            $row[] = $expence->reference;
            $row[] = number_format((float) $expence->amount, $this->setting->decimals, '.', '');

            $row[] = $CategorieExpence->find($expence->category_id)->name ?? '-';
            $row[] = $StoreModel->find($expence->store_id)->name ?? '-';
            $row[] = $UserModel->find($expence->created_by)->username ?? '-';

            $row[] = '<div class="btn-group">'
                . ($kkar['exxd'] ? '<a class="btn btn-default" href="javascript:void(0)" onclick="delete_expences(' . $expence->id . ')" title="' . lang('App.delete') . '"><i class="fa fa-times"></i></a>' : '')
                . ($kkar['exxe'] ? '<a class="btn btn-default" href="' . site_url('expences/edit/' . $expence->id) . '" title="' . lang('App.edit') . '"><i class="fa fa-pencil"></i></a>' : '')
                . ($expence->attachment ? '<a class="btn color02 white open-modalimage" target="_blank" href="' . site_url('files/expences/' . $expence->attachment) . '" title="' . lang('App.viewFile') . '"><i class="fa fa-file-archive-o"></i></a>' : '')
                . '</div>';

            $data[] = $row;
        }

        $output = [
            'draw' => $this->request->getPost('draw'),
            'recordsTotal' => $this->expence->countAll(),
            'recordsFiltered' => $this->expence->countFiltered(),
            'data' => $data,
        ];

        return $this->response->setJSON($output);
    }

    public function ajax_delete($id): ResponseInterface
    {
        $expenceM = new ExpenceModel();
        $expence = $expenceM->find($id);
        if ($expence && $expence['attachment'] !== '') {
            @unlink(ROOTPATH . 'public/files/expences/' . $expence->attachment);
        }
        $this->expence->delete($id);
        return $this->response->setJSON(['status' => true]);
    }
}
