 <table id="serverside" class="table table-striped table-bordered" cellspacing="0" width="100%">
                        <thead>
                            <tr style="color:#fff;border: 1px solid #1c76bc;">
                                <th style="border: 1px solid #1c76bc;">Bill No</th>
                                <th style="border: 1px solid #1c76bc;">Store</th>
                                <th style="border: 1px solid #1c76bc;">customers</th>
                                <th style="border: 1px solid #1c76bc;width:100px;">Date</th>
                                <th style="border: 1px solid #1c76bc;">No Of Items </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Total Amount </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Tax </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Summary </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Discount </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Shipping </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Total Amount </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Status </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Cancel</th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Exchange</th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                                //echo "<pre>"; print_r($result);
                            $this->setting = (new \App\Models\SettingModel())->find(1);
                            if ($this->setting->sales_type == 1) {
					            $sales = "sales";
					            $sale_items = "sale_items";
					            $tax_summary = "tax_summary";
					        } else if ($this->setting->sales_type == 0) {
					            $sales = "dsales";
					            $sale_items = "dsale_items";
					            $tax_summary = "dtax_summary";
					        }

					        
								        $sub_total_amount = 0;
								        $tax_total = 0;
								        $discount_total = 0;
								        $shiping_total = 0;
								        $total_amount_ = 0;
								        $cancel_total = 0;
								        $exchange_total = 0;
								        $return_total = 0;
								        $grand_total_amount = 0;
                            if (!empty($result)): 

                            		 $db = \Config\Database::connect();

                            		 $storeId = session()->get('store');
                            		 $poql = $db->query("select logo,themblock,companyname from settings where id=1 ")->getRowArray();
						        $poss = $db->query("select adresse from stores where id=" . $storeId)->getRowArray();
						        $kmmokk = base_url() . 'files/Setting/' . ($poql['logo'] ?? 'default_logo.png');
					        $ret_idd = $poql['themblock'];

                            		// echo $db->getLastQuery();exit;

                            		  $count_rows = 0;
                            		  $sr =0;

                            	?>
                                <?php foreach ($result as $prd): 


                                			$count_rows += 1;
								            $sr += 1;

								            $tt = 1;
								            $billamt = 0;
								            $tottax = 0;
								            $tottaxs = 0;
								            $tottaxi = 0;
								            $discc = 0;
								            $toott = 0;
								            $paidd = 0;
								            $mes_cashtt = 0;

								            $cashr = 0;
								            $coupr = 0;
								            $carddr = 0;
								            $cpointr = 0;
								            $sub2 = 0;
								            $csub2 = 0;
								            $ssub2 = 0;
								            $isub2 = 0;

								            $billamt_cc = 0;
								            $tottax_cc = 0;
								            $fimdis_cc = 0;
								            $toott_cc = 0;
								            $cashr_cc = 0;
								            $coupr_cc = 0;
								            $carddr_cc = 0;
								            $cpointr_cc = 0;
								            $billamt_rr = 0;
								            $tottax_rr = 0;
								            $fimdis_rr = 0;
								            $toott_rr = 0;
								            $cashr_rr = 0;
								            $coupr_rr = 0;
								            $carddr_rr = 0;
								            $cpointr_rr = 0;
								            $toott_ship = 0;
								            $toott_ship_cc = 0;
								            $billamtrr_tot = 0;
								            $billamtee_tot = 0;
								            $fimdis = 0;
								            $custt_namef = $prd->cname;
								            $oltaxl = '';
            								$overal_tax = 0;

                                		 $return_ck = $db->query("SELECT * FROM  returnss WHERE re_sales_id='" . $prd->ssid . "' ");

                                		 if ($prd->ssstatus == 3) {
							                $bil_ststy = "style=background:#f86e50;";
							                $sstaus_w = "<span class='cancel'>Cancel</span>";
							            } elseif ($return_ck->getNumRows() > 0) {
							                $bil_ststy = "style=background:#f86e50;";
							                $sstaus_w = "<span class='return'>Return</span>";
							            } else {
							                $bil_ststy = '';
							                $sstaus_w = "<span class='sales'>Sales</span>";
							            }

							            $cancel_amt = 0;
							            if ($prd->ssstatus == 3) {
							                $cancel_amt = $prd->total;
							            }
							            $billamtrr = 0;
							            $billamtee = 0;
							            if (($return_ck->getNumRows()) > 0) {
							                while ($return_sal = $return_ck->getUnbufferedRow('object')) {
							                    if ($return_sal->retrn_amt_mtd == 1) {
							                        $billamtrr = $billamtrr + $return_sal->sutott;
							                        $billamtrr_tot = $billamtrr_tot + $return_sal->sutott;
							                    } else {
							                        $billamtee = $billamtee + $return_sal->sutott;
							                        $sstaus_w = "<span class='exchange'>Exchange</span>";
							                        $billamtee_tot = $billamtee_tot + $return_sal->sutott;
							                    }
							           		 }
           								}

           								if ($this->setting->sales_type == 2) {
							                $tax_summary = $prd->tax_summary;
							                $sale_items = $prd->sale_items;
							            }

							            $yuikk_query = ("select * from  " . $tax_summary . " where salesid='" . $prd->ssid . "' ");
							            $yuikk = $db->query($yuikk_query, FALSE)->getResult();
							            foreach ($yuikk as $yuikkf) {
							                $oltaxl .= $yuikkf->taxname . '-' . number_format((float)$yuikkf->taxfrom, $this->setting->decimals, '.', '') . '<br>';
							                $overal_tax = $overal_tax + $yuikkf->taxfrom;
							            }


							            $sslalf = $prd->discountamount;
								            $discout_per = !empty($prd->discountamount) ? ($prd->discountamount * 100) / $prd->subtotal : 0;

								            $mkj = $db->query("SELECT * from payment_mode where id!=1 order by id asc ")->getResultArray();
								            foreach ($mkj as $mkjf) {

								                $ll = $mkjf['id'];
								                $mn = 'sss_' . $ll;
								                $$mn = 0;
								                /*if (is_array($pamode_id) && in_array($ll, $pamode_id)) {

								                    // $result .= '<th style="border: 1px solid #1c76bc;"   >' . $mkjf['name'] . '</th>';
								                }*/
								            }

								           // echo $sale_items;
								           $uyjhh = ("SELECT * FROM " . $sale_items . " WHERE sale_id='" . $prd->ssid . "'   ");
								            // $uyjhh_query = $this->builder->where('sale_id', $prd->ssid)->get($sale_items)->result_array();
								            $uyjhh = $db->query($uyjhh, FALSE)->getResultArray();

								            $sslalf_rr =  0;
								            $csubrr_2 = 0;
								            $itax_rr = 0;
								            foreach ($uyjhh as $uyjhhf) {
								                $iknmm = $db->query("select * from retunn_items where sl_id='" . $uyjhhf['id'] . "' and sall_idd='" . $prd->ssid . "' and rsaleit_type='" . $ret_idd . "' ")->getResultArray();
								                if (count($iknmm)  > 1) {
								                    foreach ($iknmm as $retun_res) {
								                        $discout_amt_rr = ($retun_res['sl_subtotal'] * floatval($discout_per)) / 100;
								                        $sslalf_rr = $discout_amt_rr + $sslalf_rr;
								                        $sslalff_rr = $retun_res['sl_subtotal'] - $discout_amt_rr;
								                        if (intval($uyjhhf['cgst']) > 0) {
								                            $ctax_rr = $sslalff_rr - ($sslalff_rr / (1 + (intval($uyjhhf['cgst']) / 100)));
								                            $itax = 0;
								                            $csubrr_2 = $csubrr_2 + $ctax_rr;
								                        } else {
								                            $ctax_rr = 0;
								                            $itax_rr = $sslalff_rr - ($sslalff_rr / (1 + (intval($uyjhhf['igstt']) / 100)));
								                            $csubrr_2 = $csubrr_2 + $itax_rr;
								                        }
								                    }
								                }
								                $discout_amt = $discout_per != 0 && is_numeric($discout_per) ? (intval($uyjhhf['subtotal']) * intval($discout_per)) / 100 : 0;


								                $sslalff = intval($uyjhhf['subtotal']) - intval($discout_amt);
								                if (intval($uyjhhf['cgst']) > 0) {
								                    $ctax = $sslalff - ($sslalff / (1 + (intval($uyjhhf['cgst']) / 100)));
								                    $itax = 0;
								                    $csub2 = $csub2 + $ctax;
								                } else {
								                    $ctax = 0;
								                    $itax = $sslalff - ($sslalff / (1 + (intval($uyjhhf['igstt']) / 100)));
								                    $csub2 = $csub2 + $itax;
								                }
								            }

								           


								            $oll = explode(" ", $prd->attime);
								            if ($prd->paidmethod == 6) {
								                $cash = 0;
								                $coup = 0;
								                $cardd = 0;
								                $cpoint = $prd->paid;
								            } elseif ($prd->paidmethod == 1) {
								                $cash = 0;
								                $coup = 0;
								                $cardd = $prd->paid;
								                $cpoint = 0;
								            } elseif ($prd->paidmethod == 10) {
								                $cash = 0;
								                $coup = $prd->paid;
								                $cardd = 0;
								                $cpoint = 0;
								            } else {
								                $cash = $prd->paid;
								                $coup = 0;
								                $cardd = 0;
								                $cpoint = 0;
								            }

								            $pxxx = $csub2;
								            $pxxxs = $ssub2;
								            $pxxxi = $isub2;
								            $dixxss = $prd->discount_indujul + $prd->discountamount;

								            /*if ($prd->ssstatus == 3) {
								                $bil_ststy = "style=background:#f86e50;";
								                $sstaus_w = "<span class='cancel'>Cancel</span>";
								            } elseif ($return_ck->getNumRows() > 0) {
								                $bil_ststy = "style=background:#f86e50;";
								                $sstaus_w = "<span class='return'>Return</span>";
								            } else {
								                $bil_ststy = '';
								                $sstaus_w = "<span class='sales'>Sales</span>";
								            }*/
								            $ee = explode('~', $prd->paidmethod);
								            $mes_cash = $prd->recivamt;


								            $exchange_amount = '0.00';
								            // if (!empty($pamode_id) && in_array($ee[0], $pamode_id)) {
								            if (!empty($pamode_id) && in_array($ee[0], (array) $pamode_id)) {
								                foreach ($mkj as $mkjf) {
								                    $ll = $mkjf['id'];
								                    $mn = 'sss_' . $ll;
								                    $ee = explode('~', $prd->paidmethod);

								                    if (isset($ll) && $ll != '' && in_array($ll, $pamode_id)) {
								                        if ($ee[0] == $ll) {
								                            if ($prd->total <= $prd->paid) {
								                                $$mn = $$mn + $prd->recivamt2;
								                                $exchange_amount = number_format((float)$prd->recivamt2, $this->setting->decimals, '.', ' ');
								                            } else {
								                                $$mn = $$mn + $prd->recivamt2;
								                                $exchange_amount = number_format((float)$prd->recivamt2, $this->setting->decimals, '.', ' ');
								                            }
								                        } else {
								                            $exchange_amount = '0.00';
								                        }
								                    }
								                }
								            } else {
								                // $ddd = !empty($pamode_id) ? count($pamode_id) : 0;
								                $ddd = !empty($pamode_id) ? count((array) $pamode_id) : 0;
								                for ($nml = 0; $nml < $ddd; $nml++) {
								                    if ($pamode_id[$nml] > 0) {

								                        $exchange_amount = '0.00';
								                    }
								                }
								            }
           
								            	$sub_total_amount += $prd->subtotal;
									            $tax_total += $overal_tax;
									            $discount_total += $dixxss;
									            $shiping_total += $prd->disamtssh;
									            $total_amount_ += $prd->total;
									            $cancel_total += $cancel_amt;
									            $exchange_total += $billamtee;
									            $return_total += $billamtrr;

            $grand_total_amount = $total_amount_ - ($cancel_total + $exchange_total + $return_total);

                                	?>
                                    <tr>
                                        <td><?php echo $prd->ssid; ?></td>
                                        <td><?php echo $prd->ssname; ?></td>
                                        <td><?php echo ($prd->client_id > 0) ?$prd->cname:"Walk in Customer"; ?></td>
                                        <td><?php echo (!empty($prd->selddate) ? date("d-m-Y", strtotime($prd->selddate)) : ""); ?></td>
                                        <td><?php echo $prd->totalitems; ?></td>
                                        <td><?php echo number_format((float)$prd->subtotal, $this->setting->decimals, '.', ''); ?></td>
                                        <td><?php echo number_format((float)$overal_tax, $this->setting->decimals, '.', ''); ?></td>
                                        <td><?php echo $oltaxl; ?></td>
                                        <td><?php echo number_format((float)$dixxss, $this->setting->decimals, '.', ''); ?></td>
                                        <td><?php echo number_format((float)$prd->disamtssh, $this->setting->decimals, '.', ''); ?></td>
                                        <td><?php echo number_format((float)$prd->total, $this->setting->decimals, '.', ''); ?></td>
                                        <td><?php echo $sstaus_w; ?></td>
                                        <td><?php echo number_format((float)$cancel_amt, $this->setting->decimals, '.', ''); ?></td>
                                        <td><?php echo $billamtee; ?></td>
                                        <td><?php echo $billamtrr; ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="2" class="text-center">No users found.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:center;border: 1px solid #1c76bc; ">
                                    <b id="">Sub Total</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="sub_total_amount"><?php echo $sub_total_amount; ?></b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="tax_total"><?php echo  $tax_total; ?></b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="discount_total"><?php echo $discount_total; ?></b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="shiping_total"><?php echo $shiping_total; ?></b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="total_amount_"><?php echo $total_amount_; ?></b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="cancel_total"><?php echo $cancel_total; ?></b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="exchange_total"><?php echo $exchange_total; ?></b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="return_total"><?php echo $return_total; ?></b>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:center;border: 1px solid #1c76bc; ">
                                    <b>Total</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="grand_total"><?php echo $grand_total_amount; ?></b>
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                </div>
                 <!-- Pagination Links -->
               <!--  <div id="paginate">
               <?php  if(!empty($pager)){ ?>
                    <?= isset($pager)?$pager->links():''; ?>
                    <?php } ?>
                </div> -->


<div style="margin-top:10px">
    <?= $pager->links() ?>
</div>