<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\Problemcategory_model;
use CodeIgniter\HTTP\ResponseInterface;

class Problemcategory extends BaseController
{
    protected $model;

    public function __construct()
    {
        helper('url');
        $this->model = new Problemcategory_model();
    }

    public function add_prob_category()
    {
        $prob_cat_name = $this->request->getPost('prob_cat_name');
        $prob_code     = $this->request->getPost('prob_code');
        $model         = $this->request->getPost('model');
        $p_description = $this->request->getPost('p_description');

        if (is_array($prob_cat_name)) {
            $count = count($prob_cat_name);

            for ($i = 0; $i < $count; $i++) {
                if (!empty($prob_cat_name[$i])) {
                    $data = [
                        'prob_category'     => $prob_cat_name[$i],
                        'model'             => $model[$i],
                        'prob_code'         => $prob_code[$i],
                        'prob_description'  => $p_description[$i],
                    ];
                    $this->model->add_problem_category($data);
                }
            }
        }

        return $this->response->setStatusCode(ResponseInterface::HTTP_CREATED)->setJSON(['status' => 'success']);
    }

    public function addrow()
    {
        $data['count']      = $this->request->getPost('countid');
        $data['modellist']  = $this->model->modellist();

        return view('problemaddrow', $data);
    }
}
