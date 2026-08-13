<div class="container ">
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
        google.load("elements", "1", {
            packages: "transliteration"
        });

        function onLoad() {
            var options = {
                sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
                destinationLanguage: ['<?= label("languagek"); ?>'], // or [google.elements.transliteration.LanguageCode.HINDI],
                shortcutKey: 'ctrl+g',
                transliterationEnabled: true
            };
            var control = new google.elements.transliteration.TransliterationControl(options);
            var ids = ["username", "firstname", "lastname", "useraddr", "password", "PasswordRepeat"];
            control.makeTransliteratable(ids);
            control.showControl('translControl');
        }
        google.setOnLoadCallback(onLoad);
    </script>
    <h3> <?= label("Edit"); ?></h3>
    <hr>


    <?php
    $uri = service('uri');
    $uu_id = $uri->getSegment(3);
    $ikkxm = mysql_fetch_array(mysql_query("select * from print_setup where dp_id='" . $uu_id . "'  "));
    ?>

    <div class="row" style="margin-top:20px;">
        <a class="btn btn-default float-right" href="<?php echo base_url(); ?>settings?tab=printingsetup" style="margin-bottom:10px;">
            <i class="fa fa-arrow-left"></i> <?= label("Back"); ?></a>
        <?php echo form_open_multipart('settings/updateprint/' . $uu_id); ?>




        <div class="col-xs-6">

            <h3><?= label("Genaral"); ?></h3>
            <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
                <thead class="thead-inverse">
                    <tr>
                        <th><?= label('Title'); ?> </th>
                        <th><?= label('Position'); ?></th>
                        <th><?= label('Hide'); ?></th>
                        <th><?= label('Show'); ?></th>
                        <th><?= label('Line'); ?></th>
                    </tr>
                </thead>

                <tbody>




                    <tr>
                        <th> <?= label("Logo"); ?></th>
                        <th><select class="form-control " id="logo_p" name="logo_p" tabindex="-1">
                                <option <?php if ($ikkxm['logo_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['logo_p'] == 'center') { ?> selected="selected" <?php } ?> value="center"><?= label("center"); ?></option>
                                <option <?php if ($ikkxm['logo_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>
                            </select></th>

                        <th>
                            <input <?php if ($ikkxm['logo_sh'] == 0) { ?> checked="checked" <?php } ?> name="logo_sh" id="logo_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['logo_sh'] == 1) { ?> checked="checked" <?php } ?> name="logo_sh" id="logo_sh1" type="radio" value="1" />
                        </th>

                        <th>&nbsp;
                        </th>
                    </tr>

                    <tr>
                        <th> <?= label("Header"); ?></th>

                        <th><select class="form-control " id="reciptheader_p" name="reciptheader_p" tabindex="-1">
                                <option <?php if ($ikkxm['reciptheader_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['reciptheader_p'] == 'center') { ?> selected="selected" <?php } ?> value="center"><?= label("center"); ?></option>

                            </select></th>

                        <th>
                            <input <?php if ($ikkxm['reciptheader_sh'] == 0) { ?> checked="checked" <?php } ?> name="reciptheader_sh" id="reciptheader_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['reciptheader_sh'] == 1) { ?> checked="checked" <?php } ?> name="reciptheader_sh" id="reciptheader_sh1" type="radio" value="1" />
                        </th>

                        <th>&nbsp;
                        </th>
                    </tr>


                    <tr>
                        <th><b><?= label("Company"); ?></b></th>
                        <th><select class="form-control " id="companyname_p" name="companyname_p" tabindex="-1">

                                <option <?php if ($ikkxm['companyname_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['companyname_p'] == 'center') { ?> selected="selected" <?php } ?> value="center"><?= label("center"); ?></option>
                                <option <?php if ($ikkxm['companyname_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>



                            </select></th>

                        <th><input <?php if ($ikkxm['companyname_sh'] == 0) { ?> checked="checked" <?php } ?> name="companyname_sh" id="companyname_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['companyname_sh'] == 1) { ?> checked="checked" <?php } ?> name="companyname_sh" id="companyname_sh" type="radio" value="1" /></th>

                        <th>&nbsp;</th>
                    </tr>


                    <tr>
                        <th> <?= label("Adresse"); ?></th>
                        <th><select class="form-control " id="address_p" name="address_p" tabindex="-1">

                                <option <?php if ($ikkxm['address_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['address_p'] == 'center') { ?> selected="selected" <?php } ?> value="center"><?= label("center"); ?></option>
                                <option <?php if ($ikkxm['address_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>



                            </select></th>

                        <th><input <?php if ($ikkxm['address_sh'] == 0) { ?> checked="checked" <?php } ?> name="address_sh" id="address_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['address_sh'] == 1) { ?> checked="checked" <?php } ?> name="address_sh" id="address_sh" type="radio" value="1" /></th>

                        <th>&nbsp;</th>
                    </tr>


                    <tr>
                        <th> <?= label("GST"); ?></th>
                        <th><select class="form-control " id="gst_p" name="gst_p" tabindex="-1">
                                <option <?php if ($ikkxm['gst_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['gst_p'] == 'center') { ?> selected="selected" <?php } ?> value="center"><?= label("center"); ?></option>
                                <option <?php if ($ikkxm['gst_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>



                            </select></th>

                        <th><input <?php if ($ikkxm['gst_sh'] == 0) { ?> checked="checked" <?php } ?> name="gst_sh" id="gst_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['gst_sh'] == 1) { ?> checked="checked" <?php } ?> name="gst_sh" id="gst_sh" type="radio" value="1" /></th>

                        <th>&nbsp;</th>
                    </tr>


                    <tr>
                        <th> <?= label("Sales No"); ?></th>
                        <th><select class="form-control " id="salesno_p" name="salesno_p" tabindex="-1">
                                <option <?php if ($ikkxm['salesno_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>

                                <option <?php if ($ikkxm['salesno_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>



                            </select></th>

                        <th><input <?php if ($ikkxm['salesno_sh'] == 0) { ?> checked="checked" <?php } ?> name="salesno_sh" id="salesno_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['salesno_sh'] == 1) { ?> checked="checked" <?php } ?> name="salesno_sh" id="salesno_sh" type="radio" value="1" /></th>

                        <th><input name="salesno_l" id="salesno_l" type="text" value="<?php echo $ikkxm['salesno_l']; ?>" /></th>
                    </tr>


                    <tr>
                        <th> <?= label("Cashier"); ?></th>
                        <th><select class="form-control " id="cashier_p" name="cashier_p" tabindex="-1">
                                <option <?php if ($ikkxm['cashier_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['cashier_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>
                            </select></th>

                        <th><input <?php if ($ikkxm['cashier_sh'] == 0) { ?> checked="checked" <?php } ?> name="cashier_sh" id="cashier_sh" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['cashier_sh'] == 1) { ?> checked="checked" <?php } ?> name="cashier_sh" id="cashier_sh1" type="radio" value="1" /></th>

                        <th><input name="cashier_l" id="cashier_l" type="text" value="<?php echo $ikkxm['cashier_l']; ?>" /></th>
                    </tr>


                    <tr>
                        <th> <?= label("paymentMethod"); ?></th>
                        <th><select class="form-control " id="paymentmode_p" name="paymentmode_p" tabindex="-1">
                                <option <?php if ($ikkxm['paymentmode_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['paymentmode_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>
                            </select></th>

                        <th><input <?php if ($ikkxm['paymentmode_sh'] == 0) { ?> checked="checked" <?php } ?> name="paymentmode_sh" id="paymentmode_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['paymentmode_sh'] == 1) { ?> checked="checked" <?php } ?> name="paymentmode_sh" id="paymentmode_sh" type="radio" value="1" /></th>

                        <th><input name="paymentmode_l" id="paymentmode_l" type="text" value="<?php echo $ikkxm['paymentmode_l']; ?>" /></th>
                    </tr>


                    <tr>
                        <th> <?= label("Date"); ?></th>
                        <th><select class="form-control " id="date_p" name="date_p" tabindex="-1">
                                <option <?php if ($ikkxm['date_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['date_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>


                            </select></th>

                        <th><input <?php if ($ikkxm['date_sh'] == 0) { ?> checked="checked" <?php } ?> name="date_sh" id="date_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['date_sh'] == 1) { ?> checked="checked" <?php } ?> name="date_sh" id="date_sh" type="radio" value="1" /></th>

                        <th><input name="date_l" id="date_l" type="text" value="<?php echo $ikkxm['date_l']; ?>" /></th>
                    </tr>


                    <tr>
                        <th> <?= label("Time"); ?></th>
                        <th><select class="form-control " id="time_p" name="time_p" tabindex="-1">
                                <option <?php if ($ikkxm['time_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['time_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>


                            </select></th>

                        <th><input <?php if ($ikkxm['time_sh'] == 0) { ?> checked="checked" <?php } ?> name="time_sh" id="time_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['time_sh'] == 1) { ?> checked="checked" <?php } ?> name="time_sh" id="time_sh" type="radio" value="1" /></th>

                        <th><input name="time_l" id="time_l" type="text" value="<?php echo $ikkxm['time_l']; ?>" /></th>
                    </tr>


                    <tr>
                        <th> <?= label("Customer"); ?></th>
                        <th><select class="form-control " id="customer_p" name="customer_p" tabindex="-1">
                                <option <?php if ($ikkxm['customer_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['customer_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>



                            </select></th>

                        <th><input <?php if ($ikkxm['customer_sh'] == 0) { ?> checked="checked" <?php } ?> name="customer_sh" id="customer_sh" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['customer_sh'] == 1) { ?> checked="checked" <?php } ?> name="customer_sh" id="customer_sh1" type="radio" value="1" /></th>

                        <th><input name="customer_l" id="customer_l" type="text" value="<?php echo $ikkxm['customer_l']; ?>" /></th>
                    </tr>


                    <tr>
                        <th> <?= label("Paid"); ?></th>
                        <th>&nbsp;</th>

                        <th><input <?php if ($ikkxm['paid_sh'] == 0) { ?> checked="checked" <?php } ?> name="paid_sh" id="paid_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['paid_sh'] == 1) { ?> checked="checked" <?php } ?> name="paid_sh" id="paid_sh" type="radio" value="1" /></th>

                        <th>&nbsp;</th>
                    </tr>



                    <tr>
                        <th> <?= label("Receivedamount"); ?></th>
                        <th>&nbsp;</th>

                        <th><input <?php if ($ikkxm['received_sh'] == 0) { ?> checked="checked" <?php } ?> name="received_sh" id="received_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['received_sh'] == 1) { ?> checked="checked" <?php } ?> name="received_sh" id="received_sh" type="radio" value="1" /></th>

                        <th>&nbsp;</th>
                    </tr>



                    <tr>
                        <th> <?= label("Balanceamt"); ?></th>
                        <th>&nbsp;</th>

                        <th><input <?php if ($ikkxm['balance_sh'] == 0) { ?> checked="checked" <?php } ?> name="balance_sh" id="balance_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['balance_sh'] == 1) { ?> checked="checked" <?php } ?> name="balance_sh" id="balance_sh" type="radio" value="1" /></th>

                        <th>&nbsp;</th>
                    </tr>




                    <tr>
                        <th><b> <?= label("yousaved"); ?></b></th>
                        <th>&nbsp;</th>

                        <th><input <?php if ($ikkxm['todaysaving_sh'] == 0) { ?> checked="checked" <?php } ?> name="todaysaving_sh" id="todaysaving_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['todaysaving_sh'] == 1) { ?> checked="checked" <?php } ?> name="todaysaving_sh" id="todaysaving_sh" type="radio" value="1" /></th>

                        <th>&nbsp;</th>
                    </tr>



                    <tr>
                        <th> <?= label("Tax"); ?></th>

                        <th>
                            <select class="form-control " id="taxx_p" name="taxx_p" tabindex="-1">
                                <option <?php if ($ikkxm['taxx_p'] == 'left') { ?> selected="selected" <?php } ?> value="left"><?= label("left"); ?></option>
                                <option <?php if ($ikkxm['taxx_p'] == 'center') { ?> selected="selected" <?php } ?> value="center"><?= label("center"); ?></option>
                                <option <?php if ($ikkxm['taxx_p'] == 'right') { ?> selected="selected" <?php } ?> value="right"><?= label("right"); ?></option>



                            </select>
                        </th>
                        </th>

                        <th><input <?php if ($ikkxm['taxx_sh'] == 0) { ?> checked="checked" <?php } ?> name="taxx_sh" id="taxx_sh1" type="radio" value="0" /></th>

                        <th><input <?php if ($ikkxm['taxx_sh'] == 1) { ?> checked="checked" <?php } ?> name="taxx_sh" id="taxx_sh" type="radio" value="1" /></th>

                        <th>&nbsp;</th>
                    </tr>








                </tbody>






            </table>


            <h3><?= label("Tax"); ?></h3>
            <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
                <thead class="thead-inverse">
                    <tr>
                        <th><?= label('Title'); ?> </th>

                        <th><?= label('Hide'); ?></th>
                        <th><?= label('Show'); ?></th>
                    </tr>
                </thead>

                <tbody>




                    <tr>
                        <th> <?= label("Tax Name"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['taxname_sh'] == 0) { ?> checked="checked" <?php } ?> name="taxname_sh" id="taxname_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['taxname_sh'] == 1) { ?> checked="checked" <?php } ?> name="taxname_sh" id="taxname_sh1" type="radio" value="1" />
                        </th>


                    </tr>



                    <tr>
                        <th> <?= label("%"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['taxpersontage_sh'] == 0) { ?> checked="checked" <?php } ?> name="taxpersontage_sh" id="taxpersontage_sh1" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['taxpersontage_sh'] == 1) { ?> checked="checked" <?php } ?> name="taxpersontage_sh" id="taxpersontage_sh" type="radio" value="1" />
                        </th>

                    </tr>



                    <tr>
                        <th> <?= label("AMT"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['taxamt_sh'] == 0) { ?> checked="checked" <?php } ?> name="taxamt_sh" id="taxamt_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['taxamt_sh'] == 1) { ?> checked="checked" <?php } ?> name="taxamt_sh" id="taxamt_sh1" type="radio" value="1" />
                        </th>


                    </tr>



                    <tr>
                        <th> <?= label("Total"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['taxtotal_sh'] == 0) { ?> checked="checked" <?php } ?> name="taxtotal_sh" id="taxtotal_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['taxtotal_sh'] == 1) { ?> checked="checked" <?php } ?> name="taxtotal_sh" id="taxtotal_sh1" type="radio" value="1" />
                        </th>


                    </tr>






                </tbody>
            </table>


            <h3><?= label("Product"); ?></h3>
            <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
                <thead class="thead-inverse">
                    <tr>
                        <th><?= label('Title'); ?> </th>

                        <th><?= label('Hide'); ?></th>
                        <th><?= label('Show'); ?></th>

                    </tr>
                </thead>

                <tbody>




                    <tr>
                        <th> <?= label("Product Name"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['product_sh'] == 0) { ?> checked="checked" <?php } ?> name="product_sh" id="product_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['product_sh'] == 1) { ?> checked="checked" <?php } ?> name="product_sh" id="product_sh1" type="radio" value="1" />
                        </th>


                    </tr>



                    <tr>
                        <th> <?= label("QTY"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['qt_sh'] == 0) { ?> checked="checked" <?php } ?> name="qt_sh" id="qt_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['qt_sh'] == 1) { ?> checked="checked" <?php } ?> name="qt_sh" id="qt_sh1" type="radio" value="1" />
                        </th>


                    </tr>



                    <tr>
                        <th> <?= label("MRP"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['mrp_sh'] == 0) { ?> checked="checked" <?php } ?> name="mrp_sh" id="mrp_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['mrp_sh'] == 1) { ?> checked="checked" <?php } ?> name="mrp_sh" id="mrp_sh1" type="radio" value="1" />
                        </th>


                    </tr>



                    <tr>
                        <th> <?= label("Rate"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['rate_sh'] == 0) { ?> checked="checked" <?php } ?> name="rate_sh" id="rate_sh" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['rate_sh'] == 1) { ?> checked="checked" <?php } ?> name="rate_sh" id="rate_sh1" type="radio" value="1" />
                        </th>


                    </tr>


                    <tr>
                        <th> <?= label("Amount"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['amt_sh'] == 0) { ?> checked="checked" <?php } ?> name="amt_sh" id="amt_sh1" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['amt_sh'] == 1) { ?> checked="checked" <?php } ?> name="amt_sh" id="amt_sh" type="radio" value="1" />
                        </th>


                    </tr>

                    <tr>
                        <th> <?= label("Tax"); ?></th>

                        <th>
                            <input <?php if ($ikkxm['tax_sh'] == 0) { ?> checked="checked" <?php } ?> name="tax_sh" id="tax_sh1" type="radio" value="0" />
                        </th>

                        <th>
                            <input <?php if ($ikkxm['tax_sh'] == 1) { ?> checked="checked" <?php } ?> name="tax_sh" id="tax_sh" type="radio" value="1" />
                        </th>


                    </tr>



                </tbody>
            </table>

        </div>



        <div class="col-xs-6">





            <h3><?= label("Font"); ?></h3>
            <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
                <thead class="thead-inverse">
                    <tr>
                        <th><?= label('Title'); ?> </th>
                        <th><?= label('Value'); ?></th>
                    </tr>
                </thead>

                <tbody>




                    <tr>
                        <th> <?= label("Product Listting"); ?></th>
                        <th>
                            <select class="form-control " id="productlist_one_two" name="productlist_one_two" tabindex="-1">
                                <option <?php if ($ikkxm['productlist_one_two'] == 1) { ?> selected="selected" <?php } ?> value="1">One Row</option>
                                <option <?php if ($ikkxm['productlist_one_two'] == 2) { ?> selected="selected" <?php } ?> value="2">Two Row</option>


                            </select>
                        </th>
                    </tr>



                    <tr>
                        <th> <?= label("Font Name"); ?></th>

                        <th><input name="font_name" id="font_name" type="text" value="<?php echo $ikkxm['font_name']; ?>" /></th>


                    </tr>

                    <tr>
                        <th> <?= label("Font Size"); ?></th>

                        <th><input name="font_size_l" id="font_size_l" type="text" value="<?php echo $ikkxm['font_size_l']; ?>" /></th>


                    </tr>


                    <tr>
                        <th><b><?= label("Font Size"); ?></b></th>

                        <th><input name="font_size_b" id="font_size_b" type="text" value="<?php echo $ikkxm['font_size_b']; ?>" /></th>


                    </tr>

                    <tr>
                        <th><?= label("Margin Left"); ?></th>

                        <th><input name="margin_left" id="margin_left" type="text" value="<?php echo $ikkxm['margin_left']; ?>" /></th>


                    </tr>

                    <tr>
                        <th><?= label("Hight between lines"); ?></th>

                        <th><input name="hight_bw_line" id="hight_bw_line" type="text" value="<?php echo $ikkxm['hight_bw_line']; ?>" /></th>


                    </tr>


                    <tr>
                        <th><?= label("Font Width(D)"); ?></th>

                        <th><input name="d_f_w" id="d_f_w" type="text" value="<?php echo $ikkxm['d_f_w']; ?>" /></th>


                    </tr>
                    <tr>
                        <th><b><?= label("Font Width(D)"); ?></b></th>

                        <th><input name="d_f_wb" id="d_f_wb" type="text" value="<?php echo $ikkxm['d_f_wb']; ?>" /></th>


                    </tr>

                    <tr>
                        <th><?= label("Font Hight(D)"); ?></th>

                        <th><input name="d_f_h" id="d_f_h" type="text" value="<?php echo $ikkxm['d_f_h']; ?>" /></th>


                    </tr>


                    <tr>
                        <th><b><?= label("Font Hight(D)"); ?></b></th>
                        <th><input name="d_f_hb" id="d_f_hb" type="text" value="<?php echo $ikkxm['d_f_hb']; ?>" /></th>
                    </tr>


                    <tr>
                        <th><?= label("Print Size"); ?></th>
                        <th><input name="dp_printer_name" id="dp_printer_name" type="text" value="<?php echo $ikkxm['dp_printer_name']; ?>" /></th>
                    </tr>


                    <tr>
                        <th><?= label("Print Paper Width(in mm)"); ?></th>
                        <th><input name="dp_pt_width" id="dp_pt_width" type="text" value="<?php echo $ikkxm['dp_pt_width']; ?>" /></th>
                    </tr>







                </tbody>
            </table>


            <h3><?= label("Barcode Label"); ?></h3>
            <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
                <thead class="thead-inverse">
                    <tr>
                        <th><?= label('Title'); ?> </th>
                        <th><?= label('Value'); ?></th>
                    </tr>
                </thead>

                <tbody>







                    <tr>
                        <th> <?= label("Label Width"); ?></th>

                        <th><input name="bar_width" id="bar_width" type="text" value="<?php echo $ikkxm['bar_width']; ?>" /></th>


                    </tr>

                    <tr>
                        <th> <?= label("Label Hight"); ?></th>

                        <th><input name="bar_hight" id="bar_hight" type="text" value="<?php echo $ikkxm['bar_hight']; ?>" /></th>


                    </tr>


                    <tr>
                        <th> <?= label("Margin top"); ?></th>

                        <th><input name="bar_mar_top" id="bar_mar_top" type="text" value="<?php echo $ikkxm['bar_mar_top']; ?>" /></th>


                    </tr>

                    <tr>
                        <th> <?= label("Margin Bottom"); ?></th>

                        <th><input name="bar_mar_botom" id="bar_mar_botom" type="text" value="<?php echo $ikkxm['bar_mar_botom']; ?>" /></th>


                    </tr>


                    <tr>
                        <th> <?= label("Baroce Image Width"); ?></th>

                        <th><input name="bar_img_width" id="bar_img_width" type="text" value="<?php echo $ikkxm['bar_img_width']; ?>" /></th>


                    </tr>

                    <tr>
                        <th> <?= label("Baroce Image Hight"); ?></th>

                        <th><input name="bar_img_height" id="bar_img_height" type="text" value="<?php echo $ikkxm['bar_img_height']; ?>" /></th>


                    </tr>

                    <tr>
                        <th> <?= label("Baroce Image Font Size"); ?></th>

                        <th><input name="bar_img_fontsize" id="bar_img_fontsize" type="text" value="<?php echo $ikkxm['bar_img_fontsize']; ?>" /></th>


                    </tr>

                    <tr>
                        <th> <?= label("Baroce Image margin top"); ?></th>

                        <th><input name="bar_img_top" id="bar_img_top" type="text" value="<?php echo $ikkxm['bar_img_top']; ?>" /></th>


                    </tr>



                    <tr>
                        <th> <?= label("Store Name Font Size"); ?></th>

                        <th><input name="bar_store_name" id="bar_store_name" type="text" value="<?php echo $ikkxm['bar_store_name']; ?>" /></th>


                    </tr>


                    <tr>
                        <th> <?= label("Item Name Font Size"); ?></th>

                        <th><input name="bar_product" id="bar_product" type="text" value="<?php echo $ikkxm['bar_product']; ?>" /></th>


                    </tr>
                    <tr>
                        <th> <?= label("Price Font Size"); ?></th>

                        <th><input name="bar_price" id="bar_price" type="text" value="<?php echo $ikkxm['bar_price']; ?>" /></th>


                    </tr>




                </tbody>
            </table>
        </div>



        <div class="form-group">
            <button type="submit" class="btn btn-green float-right flat-box-btn"><?= label("Submit"); ?></button>
        </div>


        <?php echo form_close(); ?>

        <br>
        <br>
        <br>
    </div>
</div>

<br>
<br>
<br> <br>
<br>
<br>