<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\RegisterModel;
use App\Models\StockModel;
use CodeIgniter\Database\BaseConnection;

class Returns extends BaseController
{
    protected $db;
    protected $session;
    protected $register;
    protected $store;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->session = session();
        $this->db = \Config\Database::connect();

        if (!$this->session->get('user')) {
            return redirect()->to('/login')->send();
        }

        $this->register = $this->session->get('register') ?? false;
        $this->store = $this->session->get('store') ?? false;
        $this->RegisterModel = new RegisterModel();
    }

    public function edit($kmm)
    {
        return view('rpos'); // CI4 view loader
    }

    public function checkret($kmm)
    {
        $query = $this->db->query("SELECT * FROM returnss WHERE re_id = ? AND retrn_amt_mtd = 2 AND retun_amt_stas = 0", [$kmm]);
        $result = $query->getRowArray();
        echo $result['tootal'] ?? 0;
        return;
    }

    // public function addre($kmm)
    // {
    //     if (!$this->register) {
    //         return $this->response->setJSON(['error' => true, 'message' => "No registered store available"]);
    //     }

    //     $storeid = $this->db->table('registers')->where('id', $this->register)->get()->getRow('store_id');
    //     $oi = $this->db->table('registers')->where('id', $this->register)->get()->getRowArray();
    //     $oi_sett = $this->db->table('settings')->where('id', 1)->get()->getRowArray();
    //     $oi_stft = $this->request->getPost('ret_idd') ?? 0;

    //     $createdBy = '';
    //     if (!empty($oi['user_id'])) {
    //         $user = $this->db->table('users')->where('id', $oi['user_id'])->get()->getRowArray();
    //         $createdBy = ($user['firstname'] ?? '') . ($user['lastname'] ?? '');
    //     }

    //     $gtot = $this->request->getPost('gtot');
    //     if ($gtot <= 0) return;

    //     $dispp = $this->request->getPost('discper');
    //     $distot = $this->request->getPost('distot');
    //     $gltot = $this->request->getPost('gltot');
    //     $rrtyp = $this->request->getPost('rrtyp');

    //     $rramstaus = $rrtyp == 1 ? 1 : 0;
    //     $redate = $rrtyp == 1 ? date('Y-m-d H:i:s') : '0000-00-00 00:00';
    //     $kmx = date('Y-m-d H:i:s');

    //     $retq = explode('|', $this->request->getPost('retq'));
    //     $stot = explode('|', $this->request->getPost('stot'));
    //     $numItems = $this->request->getPost('numrowc');
    //     $reiemt = 0;

    //     for ($i = 0; $i < $numItems; $i++) {
    //         if (!empty($retq[$i]) && !empty($stot[$i])) {
    //             $reiemt += $retq[$i];
    //         }
    //     }

    //     // Begin insert returnss
    //     $retData = [
    //         'rsale_type' => 0,
    //         'register_idd' => $this->register,
    //         'storeid' => $storeid,
    //         're_sales_id' => $oi_stft == 1 ? $this->db->table('dsales')->where('id', $kmm)->get()->getRow('sales_org_id') : $kmm,
    //         'discper' => $dispp,
    //         'discamt' => $distot,
    //         'sutott' => $gtot,
    //         'tootal' => $gltot,
    //         'iteems' => $reiemt,
    //         'retrn_amt_mtd' => $rrtyp,
    //         'retun_amt_stas' => $rramstaus,
    //         'date_retun' => $redate,
    //         'purcha_sales_id' => 0,
    //         'todate' => $kmx,
    //     ];

    //     $this->db->table('returnss')->insert($retData);
    //     $lmm = $this->db->insertID();
    //     $ddlmm = 0;

    //     if ($oi_stft == 1) {
    //         $retData['rsale_type'] = $oi_stft;
    //         $retData['re_sales_id'] = $kmm;
    //         $this->db->table('returnss')->insert($retData);
    //         $ddlmm = $this->db->insertID();
    //     }

    //     // Insert retunn_items and update stocks
    //     $idd = explode('|', $this->request->getPost('idd'));
    //     for ($i = 0; $i < $numItems; $i++) {
    //         $qtyret = $retq[$i] ?? null;
    //         $qtysubtot = $stot[$i] ?? null;
    //         $imk = $idd[$i] ?? null;
    //         $datt = date('Y-m-d H:i:s');
    //         $datt_todd = date('Y-m-d');

    //         if ($qtyret > 0 && $qtysubtot > 0) {
    //             $table = $this->setting->themblock == 0 ? 'sale_items' : 'dsale_items';
    //             $saleItem = $this->db->table($table)->where('id', $this->request->getPost('idd'))->get()->getRowArray();
    //             $pk1 = $saleItem['product_id'];

    //             // Update stock
    //             $stock = $this->db->table('stocks')->where(['store_id' => $storeid, 'product_id' => $pk1])->get()->getRowArray();
    //             $newQty = ($stock['quantity'] ?? 0) + $qtyret;
    //             $this->db->table('stocks')->where(['store_id' => $storeid, 'product_id' => $pk1])->update(['quantity' => $newQty]);

    //             // Log transfer
    //             $this->db->table('stock_transfer')->insert([
    //                 'war_id' => 0,
    //                 'store_id' => $storeid,
    //                 'pro_id' => $pk1,
    //                 'qty' => $qtyret,
    //                 'tyoftrans' => 4,
    //                 'date' => date('Y-m-d'),
    //                 'bywhom' => $createdBy,
    //                 'perselphy_ids' => 0
    //             ]);

    //             // Insert return items (for both if required)
    //             $itemInsert = [
    //                 'rsaleit_type' => $oi_stft,
    //                 'store_idsi' => $storeid,
    //                 'to_datte' => $datt_todd,
    //                 'prodd_ids' => $pk1,
    //                 'sall_idd' => $kmm,
    //                 'ret_id' => $ddlmm ?: $lmm,
    //                 'sl_id' => $imk,
    //                 'sl_newqt' => $qtyret,
    //                 'sl_subtotal' => $qtysubtot,
    //                 'todatt' => $datt
    //             ];
    //             $this->db->table('retunn_items')->insert($itemInsert);

    //             if ($oi_stft == 1) {
    //                 $saleItem = $this->db->table('sale_items')->where(['sale_id' => $retData['re_sales_id'], 'product_id' => $pk1])->get()->getRowArray();
    //                 $itemInsert['rsaleit_type'] = 0;
    //                 $itemInsert['sall_idd'] = $retData['re_sales_id'];
    //                 $itemInsert['ret_id'] = $lmm;
    //                 $itemInsert['sl_id'] = $saleItem['id'] ?? 0;
    //                 $this->db->table('retunn_items')->insert($itemInsert);
    //             }
    //         }
    //     }

    //     $this->session->set('reidd', $lmm);
    //     $this->session->set('ammt', $gltot);

    //     echo "{$lmm}~{$ddlmm}-{$gltot}-{$oi_stft}";
    //     return;
    // }


    public function addre($kmm)
    {
        if ($this->register) {

            $storeid = $this->RegisterModel->find($this->register)->store_id;

            $mkl = $this->session->get('register') ? $this->session->get('register') : false;
            $oi = $this->db->query("SELECT * FROM registers WHERE id='" . $mkl . "' ")->getRowArray();
            $oi_sett = $this->db->query('SELECT  themblock FROM settings WHERE id=1 ')->getRowArray();
            $oi_stft = isset($_POST['ret_idd']) ? $_POST['ret_idd'] : 0;
            // $oi_stft = $this->setting->themblock;

            $ddlmm = 0;

            $crea = $oi['user_id'];
            $ozzzi = $this->db->query("SELECT * FROM users WHERE id='" . $crea . "' ")->getRowArray();
            $createdBy = $ozzzi['firstname'] . '' . $ozzzi['lastname'];

            $gtot = $_POST['gtot'];
            if ($gtot > 0) {
                $reiemt = 0;
                $dispp = $_POST['discper'];
                $distot = $_POST['distot'];
                $gtot = $_POST['gtot'];
                $gltot = $_POST['gltot'];
                $distot = $_POST['distot'];
                $rrtyp = $_POST['rrtyp'];
                if ($rrtyp == 1) {
                    $rramstaus = 1;
                    $redate = date('Y-m-d H:i:s');
                } else {
                    $rramstaus = 0;
                    $redate = '0000-00-00 00:00';
                }
                $kmx = date('Y-m-d H:i:s');
                $totitems = $_POST['numrowc'];
                $vv = explode('|', $_POST['retq']);
                $ss = explode('|', $_POST['stot']);
                for ($i = 0; $i < $totitems; $i++) {
                    $qtyret = isset($vv[$i]) ? $vv[$i] : null;
                    $qtysubtot = isset($ss[$i]) ? $ss[$i] : null;

                    if ($qtyret > 0 && $qtysubtot > 0) {
                        $reiemt = $reiemt + $qtyret;
                    }
                }

                $lmm = 0;
                $ddlmm = 0;
                $stockModel = new StockModel();
                $this->db->transStart();
                if ($oi_stft == 1) {
                    $dsales = $this->db->query("SELECT sales_org_id FROM dsales WHERE id='" . $kmm . "' ")->getRowArray();

                    $dsalesf = $dsales['sales_org_id'];

                    $data = [
                        'rsale_type'      => 0,
                        'register_idd'    => $this->register,
                        'storeid'         => $storeid,
                        're_sales_id'     => $dsalesf,
                        'discper'         => $dispp,
                        'discamt'         => $distot,
                        'sutott'          => $gtot,
                        'tootal'          => $gltot,
                        'iteems'          => $reiemt,
                        'retrn_amt_mtd'   => $rrtyp,
                        'retun_amt_stas'  => $rramstaus,
                        'date_retun'      => $redate,
                        'purcha_sales_id' => 0,
                        'todate'          => $kmx,
                        'attime'          => $kmx,
                    ];

                    $this->db->table('returnss')->insert($data);
                    $lmm = $this->db->insertID();


                    $returnss_data = [
                        'rsale_type'      => $oi_stft,
                        'register_idd'    => $this->register,
                        'storeid'         => $storeid,
                        're_sales_id'     => $kmm,
                        'discper'         => $dispp,
                        'discamt'         => $distot,
                        'sutott'          => $gtot,
                        'tootal'          => $gltot,
                        'iteems'          => $reiemt,
                        'retrn_amt_mtd'   => $rrtyp,
                        'retun_amt_stas'  => $rramstaus,
                        'date_retun'      => $redate,
                        'purcha_sales_id' => 0,
                        'todate'          => $kmx,
                        'attime'          => $kmx,
                    ];

                    $this->db->table('returnss')->insert($returnss_data);
                    $ddlmm = $this->db->insertID();
                } else {
                    $returnss_data = [
                        'rsale_type'      => 0, // fixed value
                        'register_idd'    => $this->register,
                        'storeid'         => $storeid,
                        're_sales_id'     => $kmm,
                        'discper'         => $dispp,
                        'discamt'         => $distot,
                        'sutott'          => $gtot,
                        'tootal'          => $gltot,
                        'iteems'          => $reiemt,
                        'retrn_amt_mtd'   => $rrtyp,
                        'retun_amt_stas'  => $rramstaus,
                        'date_retun'      => $redate,
                        'purcha_sales_id' => 0,
                        'todate'          => $kmx,
                        'attime'          => $kmx,
                    ];

                    $this->db->table('returnss')->insert($returnss_data);
                    $lmm = $this->db->insertID();
                }

                $vv = explode('|', $_POST['retq']);
                $ss = explode('|', $_POST['stot']);
                $ddd = explode('|', $_POST['idd']);

                for ($i = 0; $i < $totitems; $i++) {
                    $qtyret = isset($vv[$i]) ? $vv[$i] : null;
                    $qtysubtot = isset($ss[$i]) ? $ss[$i] : null;

                    $datt = date('Y-m-d H:i:s');
                    $datt_todd = date('Y-m-d');
                    if ($qtyret > 0 && $qtyret > 0) {
                        $imk = isset($ddd[$i]) ? $ddd[$i] : null;
                        if ($oi_stft == 0) {
                            $sales = 'sales';
                            $sale_items = 'sale_items';
                            $otvvm = $this->db->query("SELECT * FROM sale_items WHERE id='" . $imk . "' ")->getRowArray();
                        } else {
                            $sales = 'dsales';
                            $sale_items = 'dsale_items';

                            $otvvm = $this->db->query("SELECT * FROM dsale_items WHERE id='" . $imk . "' ")->getRowArray();
                            $dsalesf = $otvvm['id'];
                        }
                        // print_r($otvvm);
                        // die;
                        $pk1 = $otvvm['product_id'];

                        // Cap this return at what's actually left to return for
                        // this sale item, so a duplicate/resubmitted return
                        // can't push more quantity back into stock than was
                        // ever sold.
                        $originalQty = (float) ($otvvm['qt'] ?? 0);
                        $alreadyReturned = (float) ($this->db->query(
                            "SELECT COALESCE(SUM(sl_newqt),0) AS qty FROM retunn_items WHERE sl_id='" . $imk . "' AND rsaleit_type='" . $oi_stft . "'"
                        )->getRowArray()['qty'] ?? 0);
                        $remainingReturnable = max(0, $originalQty - $alreadyReturned);
                        $qtyret = min((float) $qtyret, $remainingReturnable);

                        if ($qtyret <= 0) {
                            continue;
                        }

                        $stockModel->adjustQuantity((int) $storeid, (int) $pk1, (int) $qtyret);

                        $stock_transfer_data = [
                            'war_id'        => 0,
                            'store_id'      => $storeid,
                            'pro_id'        => $pk1,
                            'qty'           => $qtyret,
                            'tyoftrans'     => 4,
                            'date'          => date('Y-m-d'),
                            'bywhom'        => $createdBy,
                            'perselphy_ids' => 0,
                            'attime'        => $datt,
                        ];

                        $this->db->table('stock_transfer')->insert($stock_transfer_data);


                        if ($oi_stft == 0) {
                            $data = [
                                'rsaleit_type'  => $oi_stft,
                                'store_idsi'    => $storeid,
                                'to_datte'      => $datt_todd,
                                'prodd_ids'     => $pk1,
                                'sall_idd'      => $kmm,
                                'ret_id'        => $lmm,
                                'sl_id'         => $imk,
                                'sl_newqt'      => $qtyret,
                                'sl_subtotal'   => $qtysubtot,
                                'todatt'        => $datt,
                                'attime'        => $datt,
                            ];

                            $this->db->table('retunn_items')->insert($data);

                            // To get the insert ID:
                            // $insertID = $this->db->insertID();


                            // $this->db->query("INSERT INTO retunn_items(rsaleit_type , store_idsi,to_datte,prodd_ids,sall_idd,ret_id,sl_id,sl_newqt,sl_subtotal,todatt) VALUES('" . $oi_stft . "','" . $storeid . "','" . $datt_todd . "','" . $pk1 . "','" . $kmm . "','" . $lmm . "','" . $imk . "','" . $qtyret . "','" . $qtysubtot . "','" . $datt . "')");
                        } else {
                            $this->db->query("INSERT INTO retunn_items(rsaleit_type , store_idsi,to_datte,prodd_ids,sall_idd,ret_id,sl_id,sl_newqt,sl_subtotal,todatt) VALUES('" . $oi_stft . "','" . $storeid . "','" . $datt_todd . "','" . $pk1 . "','" . $kmm . "','" . $ddlmm . "','" . $imk . "','" . $qtyret . "','" . $qtysubtot . "','" . $datt . "')");

                            // $otvvm = $this->db->query("SELECT id FROM $sale_items WHERE sale_id='" . $dsalesf . "' AND  product_id='" . $pk1 . "'   ")->getRowArray();

                            // $imk = $otvvm['id'];

                            // $this->db->query("INSERT INTO retunn_items(rsaleit_type , store_idsi,to_datte,prodd_ids,sall_idd,ret_id,sl_id,sl_newqt,sl_subtotal,todatt) VALUES(0,'" . $storeid . "','" . $datt_todd . "','" . $pk1 . "','" . $dsalesf . "','" . $lmm . "','" . $imk . "','" . $qtyret . "','" . $qtysubtot . "','" . $datt . "')");
                        }
                    }
                }

                $this->db->transComplete();

                $_SESSION['reidd'] = $lmm;
                $_SESSION['ammt'] = $gltot;

                echo $lmm . '~' . $ddlmm . '-' . $gltot . '-' . $oi_stft;
                exit();
            } else {
                exit();
            }
        } else {
            echo json_encode(['error' => true, 'message' => "No registered store available"]);
            die;
        }
    }
}
