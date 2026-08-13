<!-- Page Content -->


<link rel="stylesheet" type="text/css" href="<?php echo base_url(); ?>assets/css/daterangepicker.css">
<link rel="stylesheet" type="text/css" href="<?php echo base_url(); ?>assets/css/bootstrap-datepicker.min.css">
<!-- Page Content -->




<script language="javascript" type="text/javascript">
    function getXMLHTTP() {
        var xmlhttp = false;
        try {
            xmlhttp = new XMLHttpRequest();
        } catch (e) {
            try {
                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e) {
                try {
                    xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
                } catch (e1) {
                    xmlhttp = false;
                }
            }
        }

        return xmlhttp;
    }


    function getdetals(countryId, vvv) {


        add_posale(countryId);



    }

    function getState(countryId, jjj) {


        var idxx = jjj;

        var items = idxx.split('_');
        var jj = items[1];


        var strURL = "<?php echo base_url(); ?>purchase/findState?country=" + countryId;
        var req = getXMLHTTP();
        if (req) {
            req.onreadystatechange = function() {
                if (req.readyState == 4) {
                    if (req.status == 200) {

                        document.getElementById('statediv_' + jj).innerHTML = req.responseText;
                    } else {
                        alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                    }
                }
            }
            req.open("GET", strURL, true);
            req.send(null);
        }
    }
</script>

<div class="container">
    <div class="row" style="margin-top:10px;">
        <div class="col-md-12">
            <h3><?= label("Add"); ?><a style="float: right;" class="btn btn-primary btn-red" href="<?php echo base_url(); ?>goodsout"><?= label("Back"); ?></a></h3>
            <hr>
            <?php

            $session = session();
            $msk = 3;
            if (!$session->get('register')) { ?>

                <script type="text/javascript">
                    function OpenRegister(status, storeid) {
                        if (status == 0) {
                            $('#CashinHand').modal('show');
                            $('#store').val(storeid);
                        } else {
                            // window.location.href = "<?php echo site_url('pos/openregister/') ?>/" + storeid;
                            window.location.href = "<?php echo site_url() ?>";
                        }
                    }
                    $(function() {
                        OpenRegister();
                    });
                </script>
                <!-- Modal add user -->
                <div class="modal fade" id="CashinHand" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="myModalLabel"><?= label("CashinHand"); ?></h4>
                            </div>
                            <?php echo form_open_multipart('Pos/openregister'); ?>
                            <div class="modal-body">
                                <div class="form-group">
                                    <label for="CashinHand"><?= label("CashinHand"); ?></label>
                                    <input type="number" step="any" name="cash" Required class="form-control" id="CashinHand" placeholder="<?= label("CashinHand"); ?>">
                                    <input type="hidden" name="store" class="form-control" id="store">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                                <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
                            </div>
                            <?php echo form_close(); ?>
                        </div>
                    </div>
                </div>
                <!-- /.Modal -->
            <?php
            } else { ?>

                <style>
                    .vvv ul {
                        background-color: #f8f1f1;
                        z-index: 1000;

                        cursor: pointer;
                        width: 90%;
                        position: absolute;
                        padding: 10px;
                    }

                    .vvv li {
                        padding: 5px;

                    }
                </style>
                <div class="panel-body">
                    <?php
                    @$oqpq = $db->query("select * from goodsout order by idd desc ")->getRowArray();
                    $lmll = @$oqpq['idd'] | +1;
                    ?>
                    <div class="col-sm-12">
                        <div class="col-sm-3">
                            <div class="form-group"><?= label("Voucher"); ?> <?= label("Number"); ?>
                                <input readonly="readonly" type="text" value="<?php echo $lmll; ?>" name="autoidd" id="autoidd" class="form-control">
                            </div>
                        </div>

                        <div class="col-sm-3">
                            <div class="form-group"><?= label("Warehouses"); ?>

                                <select class=" form-control" id="warSelect" name="warSelect">
                                    <?php $mkm = $db->query("select * from warehouses  order by name asc ")->getResult();

                                    foreach ($mkm as $mkmf) {
                                    ?>
                                        <option value="<?php echo $mkmf->id; ?>"><?php echo $mkmf->name; ?></option>

                                    <?php } ?>

                                </select>
                            </div>
                        </div>

                        <div class="col-sm-3">
                            <div class="form-group"><?= label("Date"); ?>
                                <input type="text" name="pddate" class="form-control" value="<?php echo date("d-m-Y"); ?>" id="pddate">

                            </div>
                        </div>

                        <div class="col-sm-3">
                            <div class="form-group"><?= label("Reference"); ?> <?= label("Number"); ?>
                                <input type="text" name="refff" class="form-control" id="refff">

                            </div>
                        </div>
                    </div>



                    <div class="col-sm-12">
                        <div class="col-sm-3">
                            <div class="form-group"><?= label("B.Code"); ?>
                                <form onsubmit="return barcodekar()">
                                    <input style="margin-top:0px;" type="text" autofocus id="<?= strval($setting->keyboard) === '1' ? 'keyboard' : '' ?>" class="form-control barcode" placeholder="<?= label('BarcodeScanner'); ?>">
                                </form>

                            </div>
                        </div>
                        <div class="col-sm-3 ">
                            <div class="form-group"><?= label("Brand"); ?>
                                <select required="required" onchange="getState(this.value,this.id)" class="js-select-options form-control" name="customerSelect[]" id="customerSelect_1">
                                    <option value="">Select</option>
                                    <?php
                                    $kmk = $db->query("select * from brand order by name asc ")->getResult();
                                    foreach ($kmk as $kmkf) { ?>
                                        <option value="<?= $kmkf->id; ?>"><?= $kmkf->name; ?></option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>


                        <div class="col-sm-3 ">
                            <div class="form-group"><?= label("Product"); ?>
                                <select required="required" class="js-select-options form-control" id="statediv_1" name="statediv[]" onchange="getdetals(this.value,this.id)">
                                    <option value="">Select </option>
                                    <?php
                                    $kmks = $db->query("select id,name from products order by name asc ")->getResult();
                                    foreach ($kmks as $kmksf) { ?>
                                        <option value="<?= $kmksf->id; ?>"><?= $kmksf->name; ?></option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>

                    </div>





                    <div class="col-sm-12">
                        <div class="panel panel-default">

                            <div class="panel-heading">Add Products</div>
                            <div class="panel-body">









                                <div style="text-align: center;" class="col-xs-2 table-header">
                                    <lable>B.code</lable>
                                </div>

                                <div class="col-xs-3 table-header">
                                    <lable style="margin-top:10px;text-align: left;"><?= label("Product"); ?></lable>
                                </div>

                                <div class="col-xs-2 table-header nopadding">
                                    <lable style="margin-top:10px;" class="text-left"><?= label("Quantity"); ?></lable>
                                </div>

                                <div class="col-xs-2 table-header nopadding">
                                    <lable style="margin-top:10px;text-align: right;"><?= label("Available"); ?> <?= label("Quantity"); ?></lable>
                                </div>

                                <br>
                                <hr>



                                <div id="productListkar">
                                    <!-- product List goes here  -->
                                </div>
                                <div class="footer-section">
                                    <div class="table-responsive col-sm-12 totalTab">
                                        <table class="table">
                                            <tr>
                                                <td style="margin-top:10px;text-align: right;padding: 4px;" class="" width="42%"></td>
                                                <td style="padding: 4px;" class="whiteBg" width="58%">
                                                    <span class="float-left"><b style="display: none;" id="ItemsNum"><span></span></b></span>


                                                </td>
                                            </tr>



                                        </table>
                                    </div>
                                    <button style="margin-left: 25px;" type="button" onclick="cancelPOS()" class="btn btn-red col-md-2"><?= label('CANCEL'); ?></button>


                                    <button style="margin-left: 25px;" type="button" class="btn btn-green col-md-2" data-toggle="modal" onclick=" kakkaka();">Submit</button>
                                </div>

                            </div>





                        </div>
                    </div>

                    <div>
                        <?php

                        $store = session()->get('store');

                        foreach ($products as $product) : ?>
                            <?php $cheked = true;
                            $invis = $product->h_stores;
                            $invis = !empty($invis) ? trim($invis, ",") : [];
                            $array = !empty($invis) ? explode(',', $invis) : []; //split string into array seperated by ', '
                            foreach ($array as $value) //loop over values
                            {
                                $cheked = $value == $store ? false : $cheked;
                            }
                            if ($cheked) {
                                $mnmz = (intval($product->descountperr) * intval($product->price)) / 100;
                            ?>


                                <input type="hidden" id="idname-<?= $product->id; ?>" name="name" value="<?= $product->name; ?>" />



                            <?php } ?>
                        <?php endforeach; ?>
                    </div>

                    <!-- /.container -->
                    <script type="text/javascript">
                        function kakkaka() {


                            var qtt = new Array();
                            $("input[name='qtt[]']").each(function() {
                                qtt.push($(this).val());
                            });


                            var idd = new Array();
                            $("input[name='idd[]']").each(function() {
                                idd.push($(this).val());
                            });


                            var warr = $('#warSelect').val();
                            var ppd = $('#pddate').val();
                            var reff = $('#refff').val();


                            var cccc = $('#ItemsNum').text();



                            if (cccc != '' && reff != '' && ppd != '' && warr != '' && qtt != '') {


                                $.ajax({
                                    url: "<?php echo site_url('Pos/Submitgoods') ?>",
                                    type: "POST",
                                    data: {
                                        warr: warr,
                                        reff: reff,
                                        ppd: ppd,
                                        qtt: qtt,
                                        idd: idd,
                                        cccc: cccc
                                    },
                                    success: function(data) {
                                        window.location.href = "<?php echo site_url() ?>goodsout";
                                    },
                                    error: function(jqXHR, textStatus, errorThrown) {
                                        alert("error");
                                    }
                                });


                            } else {
                                alert("Please fill all the fields...");
                                return false;
                            }


                        }


                        $(document).ready(function() {

                            $('#productListkar').load("<?php echo site_url('pos/load_posales') ?>/0");
                            $('#Subtot').load("<?php echo site_url('pos/subtot') ?>", null, total_change);


                            $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems') ?>");
                            $('.holdList').load("<?php echo site_url('pos/holdList/' . $register) ?>");





                            $.ajax({
                                url: "<?php echo site_url('pos/ResetPos') ?>/",
                                type: "POST",
                                success: function(data) {
                                    $('#productListkar').load("<?php echo site_url('pos/load_posales') ?>");


                                    $('#ItemsNum span, #ItemsNum2 span').text("0");
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });

                            disxn();
                            $('.Paid').show();
                            $('.Paidd').show();
                            $('.ReturnChange').show();
                            $('.CreditCardNum').hide();
                            $('.CreditCardHold').hide();
                            $('.ChequeNum').hide();
                            $('.stripe-btn').hide();



                            $("#paymentMethod").change(function() {

                                var p_met = $(this).find('option:selected').val();

                                if (p_met === '0') {
                                    $('.Paid').show();
                                    $('.ReturnChange').show();
                                    $('.CreditCardNum').hide();
                                    $('.CreditCardHold').hide();
                                    $('.CreditCardMonth').hide();
                                    $('.CreditCardYear').hide();
                                    $('.CreditCardCODECV').hide();
                                    $('#CreditCardNum').val('');
                                    $('#CreditCardHold').val('');
                                    $('#CreditCardYear').val('');
                                    $('#CreditCardMonth').val('');
                                    $('#CreditCardCODECV').val('');
                                    $('.stripe-btn').hide();
                                    $('.ChequeNum').hide();
                                } else if (p_met === '1') {
                                    $('.Paid').show();
                                    $('.ReturnChange').hide();
                                    $('.CreditCardNum').show();
                                    $('.CreditCardHold').show();
                                    $('.CreditCardMonth').show();
                                    $('.CreditCardYear').show();
                                    $('.CreditCardCODECV').show();
                                    $('.stripe-btn').show();
                                    $('.ChequeNum').hide();
                                } else if (p_met === '2') {
                                    $('.Paid').hide();
                                    $('.ReturnChange').hide();
                                    $('.CreditCardNum').hide();
                                    $('.CreditCardHold').hide();
                                    $('.CreditCardMonth').hide();
                                    $('.CreditCardYear').hide();
                                    $('.CreditCardCODECV').hide();
                                    $('#CreditCardNum').val('');
                                    $('#CreditCardHold').val('');
                                    $('#CreditCardYear').val('');
                                    $('#CreditCardMonth').val('');
                                    $('#CreditCardCODECV').val('');
                                    $('.stripe-btn').hide();
                                    $('.ChequeNum').show();
                                }

                            });
                            /********************************* Credit Card infos section ****************************************/
                            $('#CreditCardNum').validateCreditCard(function(result) {
                                var cardtype = result.card_type == null ? '-' : result.card_type.name;
                                $('.CreditCardNum i').removeClass('dark-blue');
                                $('#' + cardtype).addClass('dark-blue');
                            });

                            $('#CreditCardNum').keypress(function(e) {
                                var data = $(this).val();
                                if (data.length > 22) {

                                    if (e.keyCode == 13) {
                                        e.preventDefault();

                                        var c = new SwipeParserObj(data);

                                        $('#CreditCardNum').val(c.account);
                                        $('#CreditCardHold').val(c.account_name);
                                        $('#CreditCardYear').val(c.exp_year);
                                        $('#CreditCardMonth').val(c.exp_month);
                                        $('#CreditCardCODECV').val('');

                                    } else {
                                        $('#CreditCardNum').val('');
                                        $('#CreditCardHold').val('');
                                        $('#CreditCardYear').val('');
                                        $('#CreditCardMonth').val('');
                                        $('#CreditCardCODECV').val('');
                                    }

                                    $('#CreditCardCODECV').focus();
                                    $('#CreditCardNum').validateCreditCard(function(result) {
                                        var cardtype = result.card_type == null ? '-' : result.card_type.name;
                                        $('.CreditCardNum i').removeClass('dark-blue');
                                        $('#' + cardtype).addClass('dark-blue');
                                    });
                                }

                            });


                            // ********************************* change calculations
                            $('#Paid').on('keyup', function() {
                                var change = -(parseFloat($('#total').text()) - parseFloat($(this).val()));
                                if (change < 0) {
                                    $('#ReturnChange span').text(change.toFixed(<?= $setting->decimals; ?>));
                                    $('#ReturnChange span').addClass("red");
                                    $('#ReturnChange span').removeClass("light-blue");
                                } else {
                                    $('#ReturnChange span').text(change.toFixed(<?= $setting->decimals; ?>));
                                    $('#ReturnChange span').removeClass("red");
                                    $('#ReturnChange span').addClass("light-blue");
                                }
                            });



                            //  search product
                            $("#searchProd").keyup(function() {
                                // Retrieve the input field text
                                var filter = $(this).val();
                                // Loop through the list
                                $("#productList2 #proname").each(function() {
                                    // If the list item does not contain the text phrase fade it out
                                    if ($(this).text().search(new RegExp(filter, "i")) < 0) {
                                        $(this).parent().parent().parent().hide();
                                        // Show the list item if the phrase matches
                                    } else {
                                        $(this).parent().parent().parent().show();
                                    }
                                });
                            });
                        });
                        // barcode scanner


                        function barcodekar() {
                            var code = $('.barcode').val();


                            $.ajax({
                                url: "<?php echo site_url('pos/findproduct') ?>/" + code,
                                type: "POST",
                                dataType: "JSON",
                                success: function(data) {



                                    add_posale(data);
                                    $('.barcode').val('');
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                            return false;
                        };

                        //  **********************select categorie

                        $(".categories").on("click", function() {
                            // Retrieve the input field text
                            var filter = $(this).attr('id');
                            $(this).parent().children().removeClass('selectedGat');

                            $(this).addClass('selectedGat');
                            // Loop through the list
                            $("#productList2 #category").each(function() {
                                // If the list item does not contain the text phrase fade it out
                                if ($(this).val().search(new RegExp(filter, "i")) < 0) {
                                    $(this).parent().parent().parent().hide();
                                    // Show the list item if the phrase matches
                                } else {
                                    $(this).parent().parent().parent().show();
                                }
                            });
                        });
                        // function to calculate a percentage from a number
                        function percentage(tot, n) {
                            var perc;
                            perc = ((parseFloat(tot) * (parseFloat(n ? n : 0) * 0.01)));
                            return perc;
                        }
                        // function to calculate the total number
                        function total_change() {

                            var tot;

                            if (($('.TAX').val().indexOf('%') == -1) && ($('.Remise').val().indexOf('%') == -1)) {
                                tot = parseFloat($('#Subtot').text().replace(/ /g, '')) + parseFloat($('.TAX').val() ? $('.TAX').val() : 0);

                                $('#taxValue').text('<?= $setting->currency; ?>');
                                $('#RemiseValue').text('<?= $setting->currency; ?>');
                                tot = tot - parseFloat($('.Remise').val() ? $('.Remise').val() : 0);
                                $('#total').text(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#Paid').val(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#Paidd').val(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#TotalModal').text('<?= label("Total"); ?>Rs. ' + tot.toFixed(<?= $setting->decimals; ?>));
                            } else if (($('.TAX').val().indexOf('%') != -1) && ($('.Remise').val().indexOf('%') == -1)) {
                                tot = parseFloat($('#Subtot').text()) + percentage($('#Subtot').text(), $('.TAX').val());
                                $('#taxValue').text(percentage($('#Subtot').text(), $('.TAX').val()).toFixed(<?= $setting->decimals; ?>) + ' <?= $setting->currency; ?>');
                                $('#RemiseValue').text('<?= $setting->currency; ?>');
                                tot = tot - parseFloat($('.Remise').val() ? $('.Remise').val() : 0);
                                $('#total').text(tot.toFixed(<?= $setting->decimals; ?>));

                                $('#Paid').val(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#Paidd').val(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#TotalModal').text('<?= label("Total"); ?> Rs.' + tot.toFixed(<?= $setting->decimals; ?>));
                            } else if (($('.TAX').val().indexOf('%') != -1) && ($('.Remise').val().indexOf('%') != -1)) {
                                tot = parseFloat($('#Subtot').text()) + percentage($('#Subtot').text(), $('.TAX').val());
                                $('#taxValue').text(percentage($('#Subtot').text(), $('.TAX').val()).toFixed(<?= $setting->decimals; ?>) + ' <?= $setting->currency; ?>');
                                tot = tot - percentage($('#Subtot').text(), $('.Remise').val());

                                $('#RemiseValue').text(percentage($('#Subtot').text(), $('.Remise').val()).toFixed(<?= $setting->decimals; ?>));
                                $('#total').text(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#Paid').val(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#Paidd').val(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#TotalModal').text('<?= label("Total"); ?>Rs.' + tot.toFixed(<?= $setting->decimals; ?>));
                            } else if (($('.TAX').val().indexOf('%') == -1) && ($('.Remise').val().indexOf('%') != -1)) {
                                tot = parseFloat($('#Subtot').text()) + parseFloat($('.TAX').val() ? $('.TAX').val() : 0);
                                tot = tot - percentage($('#Subtot').text(), $('.Remise').val());
                                $('#taxValue').text('<?= $setting->currency; ?>');
                                var cghh = $('#cgstt').text();
                                var sghh = $('#sgstt').text();
                                var gsttot = parseFloat(cghh) + parseFloat(sghh);
                                tot = parseFloat(tot) + parseFloat(gsttot);

                                $('#RemiseValue').text(percentage($('#Subtot').text(), $('.Remise').val()).toFixed(<?= $setting->decimals; ?>));
                                $('#total').text(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#Paid').val(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#Paidd').val(tot.toFixed(<?= $setting->decimals; ?>));
                                $('#TotalModal').text('<?= label("Total"); ?> Rs.' + tot.toFixed(<?= $setting->decimals; ?>));
                            }
                        }


                        function delete_posale(id) {
                            // ajax delete data to database
                            $.ajax({
                                url: "<?php echo site_url('pos/delete') ?>/" + id,
                                type: "POST",
                                dataType: "JSON",
                                success: function(data) {
                                    $('#productListkar').load("<?php echo site_url('pos/load_pogoods') ?>");
                                    $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems') ?>");
                                    $('#Subtot').load("<?php echo site_url('pos/subtot') ?>", null, total_change);
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });

                        }

                        /********************************** Hold functions ************************************/
                        function AddHold() {
                            $.ajax({
                                url: "<?php echo site_url('pos/AddHold') ?>/<?= $register ?>",
                                type: "POST",
                                dataType: "JSON",
                                success: function(data) {
                                    $('#productListkar').load("<?php echo site_url('pos/load_posales') ?>");
                                    $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems') ?>");
                                    $('#Subtot').load("<?php echo site_url('pos/subtot') ?>", null, total_change);
                                    $('.holdList').load("<?php echo site_url('pos/holdList/' . $register) ?>");


                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });

                        }

                        function RemoveHold() {
                            var number = $('.selectedHold').clone().children().remove().end().text();
                            if (number != 1) {
                                swal({
                                        title: '<?= label("Areyousure"); ?>',
                                        text: '<?= label("Deletemessage"); ?>',
                                        type: "warning",
                                        showCancelButton: true,
                                        confirmButtonColor: "#DD6B55",
                                        confirmButtonText: '<?= label("yesiam"); ?>',
                                        closeOnConfirm: false
                                    },
                                    function() {
                                        // ajax delete data to database
                                        $.ajax({
                                            url: "<?php echo site_url('pos/RemoveHold') ?>/" + number + "/<?= $register; ?>",
                                            type: "POST",
                                            dataType: "JSON",
                                            success: function(data) {
                                                $('#productListkar').load("<?php echo site_url('pos/load_posales') ?>");
                                                $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems') ?>");
                                                $('#Subtot').load("<?php echo site_url('pos/subtot') ?>", null, total_change);
                                                $('.holdList').load("<?php echo site_url('pos/holdList/' . $register) ?>");


                                            },
                                            error: function(jqXHR, textStatus, errorThrown) {
                                                alert("error");
                                            }
                                        });
                                        swal.close();
                                    });
                            }

                        }

                        function SelectHold(number) {
                            // ajax delete data to database
                            $.ajax({
                                url: "<?php echo site_url('pos/SelectHold') ?>/" + number,
                                type: "POST",
                                dataType: "JSON",
                                success: function(data) {
                                    $('#productListkar').load("<?php echo site_url('pos/load_posales') ?>");
                                    $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems') ?>");
                                    $('#Subtot').load("<?php echo site_url('pos/subtot') ?>", null, total_change);

                                    $('#' + number).parent().children().removeClass('selectedHold');
                                    $('#' + number).addClass('selectedHold');

                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });

                        }

                        /********************************** end Hold functions ************************************/

                        function add_posale(id) {
                            var warsel = $('#warSelect').val();
                            if (warsel <= 0) {
                                alert("Please select a warehouse ");
                                return false;
                            }

                            var name1 = $('#idname-' + id).val();
                            var price1 = $('#idprice-' + id).val();


                            var mmn = <?= $register; ?>;
                            var number = $('.selectedHold').clone().children().remove().end().text();
                            $.ajax({
                                url: "<?php echo site_url('pos/addpdckkar') ?>/",
                                type: "POST",
                                data: {
                                    name: name1,
                                    price: price1,
                                    product_id: id,
                                    number: number,
                                    registerid: <?= $register; ?>,
                                    warsel: warsel
                                },
                                success: function(data) {
                                    var data = data.split('~');
                                    if (data[0] === 'stock') {
                                        swal("<?= label("Available Quantity: "); ?>" + data[1]);
                                    } else {
                                        $('#productListkar').load("<?php echo site_url('pos/load_pogoods') ?>");
                                        $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems') ?>");
                                    }
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                        }

                        function discounn(zzz) {

                            var xxz = $('#rrt-' + zzz).val();
                            var xxzx = $('#dispe-' + zzz).val();
                            var qqt = $('#qt-' + zzz).val();
                            var ty = (parseFloat(xxz) * parseFloat(xxzx) * parseFloat(qqt)) / 100;
                            $('#disamt-' + zzz).val(ty);
                            $.ajax({
                                url: "<?php echo site_url('pos/sessstt') ?>/",
                                type: "POST",
                                data: {
                                    zzz: zzz,
                                    xxzx: xxzx,
                                    ty: ty
                                },
                                success: function(data) {},
                            });
                            disxn();
                        }

                        function disxn() {

                            window.setTimeout(slowAlert, 800);
                            var nn = document.getElementsByName("disamt[]").length;
                            var o = 0;
                            var nnn = 0;
                            while (o < nn) {
                                var inputAtrib = document.getElementsByName("disamt[]")[o].value;
                                nnn = parseFloat(nnn) + parseFloat(inputAtrib);
                                o++;
                            }
                            document.getElementById("disamtt").innerHTML = nnn.toFixed(2);


                            var nmtot = document.getElementById("Subtot").innerHTML;

                            var sgstt = document.getElementById("sgstt").innerHTML;
                            var cgstt = document.getElementById("cgstt").innerHTML;
                            var RemiseValue = document.getElementById("RemiseValue").innerHTML;

                            var hjk = parseFloat(nmtot) - parseFloat(nnn) + parseFloat(sgstt) + parseFloat(cgstt) - parseFloat(RemiseValue);

                            document.getElementById("total").innerHTML = hjk.toFixed(2);
                            $('#Paid').val(hjk);
                            document.getElementById("TotalModal").innerHTML = hjk.toFixed(2);
                            $('#Paidd').val(hjk);


                        }


                        function edit_posale(id) {

                            var qt1 = $('#qt-' + id).val();
                            var decc = $('#dispe-' + id).val();

                            $.ajax({
                                url: "<?php echo site_url('pos/editkar') ?>/" + id,
                                type: "POST",
                                data: {
                                    qt: qt1,
                                    decc: decc
                                },
                                success: function(data) {

                                    if (data === 'stock') {
                                        swal("<?= label("Lowinventory"); ?>");
                                        $('#productListkar').load("<?php echo site_url('pos/load_pogoods') ?>");
                                    } else {
                                        $('#productListkar').load("<?php echo site_url('pos/load_pogoods') ?>/" + decc);
                                        $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems') ?>");
                                    }
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });

                        }


                        function slowAlert() {
                            disxn();
                        }



                        $("#customerSelect").change(function() {

                            var id = $(this).find('option:selected').val();
                            if (id === '0') {
                                $('.Remise').val('<?= $setting->discount; ?>');
                            } else {
                                $.ajax({
                                    url: "<?php echo site_url('pos/GetDiscount') ?>/" + id,
                                    type: "POST",
                                    success: function(data) {
                                        var values = data.split('~');
                                        $('#customerName span').text(values[1]);
                                        $('.Remise').val(values[0]);

                                    },
                                    error: function(jqXHR, textStatus, errorThrown) {
                                        alert("error");
                                    }
                                });
                            }
                        });






                        function cancelPOS() {
                            swal({
                                    title: '<?= label("Areyousure"); ?>',
                                    text: '<?= label("Deletemessage"); ?>',
                                    type: "warning",
                                    showCancelButton: true,
                                    confirmButtonColor: "#DD6B55",
                                    confirmButtonText: '<?= label("yesiam"); ?>',
                                    closeOnConfirm: false
                                },
                                function() {

                                    $('#customerSelect').val('0');
                                    $('#customerSelect').trigger('change.select2');
                                    $('.Remise').val('<?= $setting->discount; ?>');
                                    $('.TAX').val('<?= $setting->tax; ?>');

                                    $.ajax({
                                        url: "<?php echo site_url('pos/ResetPos') ?>/",
                                        type: "POST",
                                        success: function(data) {
                                            $('#productListkar').load("<?php echo site_url('pos/load_posales') ?>");


                                            $('#ItemsNum span, #ItemsNum2 span').text("0");
                                        },
                                        error: function(jqXHR, textStatus, errorThrown) {
                                            alert("error");
                                        }
                                    });
                                    swal('<?= label("Deleted"); ?>', '<?= label("Deletedmessage"); ?>', "success");
                                });
                        };


                        function saleBtn(type) {
                            var clientID = $('#customerSelect').find('option:selected').val();
                            var clientName = $('#customerName span').text();
                            var Tax = "10%";
                            var Discount = $('.Remise').val();

                            var lalid = $('#retidd').val();

                            var lalamt = $('#amttt').val();


                            var Subtotal = $('#Subtot').text();
                            var xsxsx = document.getElementById("disamtt").innerHTML;


                            var Total = $('#total').text();
                            //edited on 9817 by karunakaran

                            var cgggst = $('#cgstt').text();
                            var sgggst = $('#sgstt').text();

                            var createdBy = '<?php echo $user->firstname . " " . $user->lastname; ?>';
                            var totalItems = $('#ItemsNum span').text();

                            var recivamt = $('#recivedamt').val();
                            var ballamtt = $('#bamacee span').text();


                            var Paid = $('#Paid').val();
                            var paidMethod = $('#paymentMethod').find('option:selected').val();
                            var Status = 0;
                            var ccnum = $('#CreditCardNum').val();
                            var ccmonth = $('#CreditCardMonth').val();
                            var ccyear = $('#CreditCardYear').val();
                            var ccv = $('#CreditCardCODECV').val();

                            switch (paidMethod) {
                                case '1':
                                    paidMethod += '~' + $('#CreditCardNum').val() + '~' + $('#CreditCardHold').val();
                                    break;
                                case '2':
                                    paidMethod += '~' + $('#ChequeNum').val()
                                    break;
                                case '0':
                                    var change = parseFloat(Total) - parseFloat(Paid) + parseFloat(lalamt);
                                    if (change == parseFloat(Total)) Status = 1;
                                    else if (change > 0) Status = 2;
                                    else if (change <= 0) Status = 0;
                            }
                            var taxamount = $('.TAX').val().indexOf('%') != -1 ? parseFloat($('#taxValue').text()) : $('.TAX').val();
                            var discountamount = $('.Remise').val().indexOf('%') != -1 ? parseFloat($('#RemiseValue').text()) : $('.Remise').val();

                            $.ajax({
                                url: "<?php echo site_url('pos/AddNewSale') ?>/" + type,
                                type: "POST",
                                data: {
                                    recivamt: recivamt,
                                    ballamtt: ballamtt,
                                    client_id: clientID,
                                    clientname: clientName,
                                    discountamount: discountamount,
                                    tax: Tax,
                                    discount: Discount,
                                    subtotal: Subtotal,
                                    total: Total,
                                    created_by: createdBy,
                                    totalitems: totalItems,
                                    paid: Paid,
                                    status: Status,
                                    paidmethod: paidMethod,
                                    ccnum: ccnum,
                                    ccmonth: ccmonth,
                                    ccyear: ccyear,
                                    ccv: ccv,
                                    taxamount: cgggst,
                                    sgsttaxamt: sgggst,
                                    lalid: lalid,
                                    lalamt: lalamt,
                                    discount_indujul: xsxsx
                                },
                                success: function(data) {

                                    $('#printSection').html(data);
                                    $('#productListkar').load("<?php echo site_url('pos/load_posales') ?>");
                                    $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems') ?>");

                                    $('#AddSale').modal('hide');
                                    $('#ticket').modal('show');
                                    $('#ReturnChange span').text('0');
                                    $('#Paid').val('0');
                                    $('.holdList').load("<?php echo site_url('pos/holdList/' . $register) ?>");
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });

                            $('#CreditCardNum').val('');
                            $('#CreditCardHold').val('');
                            $('#CreditCardYear').val('');
                            $('#CreditCardMonth').val('');
                            $('#CreditCardCODECV').val('');

                        }

                        function PrintTicket() {
                            $('.modal-body').removeAttr('id');
                            window.print();
                            $('.modal-body').attr('id', 'modal-body');
                        }

                        function rrr() {
                            var ddd = $('#retidd').val();

                            var ppp = $('#Paidd').val();
                            $.ajax({
                                url: "<?php echo base_url(); ?>returns/checkret/" + ddd,
                                type: "POST",
                                success: function(data) {

                                    if (data > 0) {
                                        $('#amttt').val(data);
                                        var ccc = parseFloat(data) - parseFloat(ppp);
                                        $('#Paid').val(ccc);
                                        $('#bamacee span').text(ccc.toFixed(<?= $setting->decimals; ?>));
                                    } else {
                                        var lln = $('#recivedamt').val();
                                        $('#retidd').val(0);
                                        $('#amttt').val(0);
                                        $('#Paid').val(ppp);
                                        var bb = 0 - parseFloat(ppp) + parseFloat(lln);



                                        $('#bamacee span').text(bb.toFixed(<?= $setting->decimals; ?>));

                                    }

                                }
                            });
                        }



                        function CloseRegister() {
                            $.ajax({
                                url: "<?php echo site_url('pos/CloseRegister') ?>/",
                                type: "POST",
                                success: function(data) {
                                    $('#closeregsection').html(data);
                                    $('#CloseRegister').modal('show');
                                    setTimeout(function() {
                                        $('#countedcash').focus()
                                    }, 1000);
                                    $('#countedcash').on('keyup', function() {
                                        var change = -(parseFloat($('#expectedcash').text()) - parseFloat($(this).val()));
                                        var difftot = change + parseFloat($('#diffcc').text()) + parseFloat($('#diffcheque').text());
                                        var total = parseFloat($('#countedcc').val()) + parseFloat($('#countedcheque').val()) + parseFloat($('#countedcash').val());
                                        $('#countedtotal').text(total.toFixed(<?= $setting->decimals; ?>));
                                        $('#difftotal').text(difftot.toFixed(<?= $setting->decimals; ?>))
                                        if (change < 0) {
                                            $('#diffcash').text(change.toFixed(<?= $setting->decimals; ?>));
                                            $('#diffcash').addClass("red");
                                            $('#diffcash').removeClass("light-blue");
                                        } else {
                                            $('#diffcash').text(change.toFixed(<?= $setting->decimals; ?>));
                                            $('#diffcash').removeClass("red");
                                            $('#diffcash').addClass("light-blue");
                                        }
                                    });

                                    $('#countedcc').on('keyup', function() {
                                        var change = -(parseFloat($('#expectedcc').text()) - parseFloat($(this).val()));
                                        var difftot = change + parseFloat($('#diffcash').text()) + parseFloat($('#diffcheque').text());
                                        var total = parseFloat($('#countedcc').val()) + parseFloat($('#countedcheque').val()) + parseFloat($('#countedcash').val());
                                        $('#countedtotal').text(total.toFixed(<?= $setting->decimals; ?>));
                                        $('#difftotal').text(difftot.toFixed(<?= $setting->decimals; ?>))
                                        if (change < 0) {
                                            $('#diffcc').text(change.toFixed(<?= $setting->decimals; ?>));
                                            $('#diffcc').addClass("red");
                                            $('#diffcc').removeClass("light-blue");
                                        } else {
                                            $('#diffcc').text(change.toFixed(<?= $setting->decimals; ?>));
                                            $('#diffcc').removeClass("red");
                                            $('#diffcc').addClass("light-blue");
                                        }
                                    });

                                    $('#countedcheque').on('keyup', function() {
                                        var change = -(parseFloat($('#expectedcheque').text()) - parseFloat($(this).val()));
                                        var difftot = change + parseFloat($('#diffcc').text()) + parseFloat($('#diffcash').text());
                                        var total = parseFloat($('#countedcc').val()) + parseFloat($('#countedcheque').val()) + parseFloat($('#countedcash').val());
                                        $('#countedtotal').text(total.toFixed(<?= $setting->decimals; ?>));
                                        $('#difftotal').text(difftot.toFixed(<?= $setting->decimals; ?>))
                                        if (change < 0) {
                                            $('#diffcheque').text(change.toFixed(<?= $setting->decimals; ?>));
                                            $('#diffcheque').addClass("red");
                                            $('#diffcheque').removeClass("light-blue");
                                        } else {
                                            $('#diffcheque').text(change.toFixed(<?= $setting->decimals; ?>));
                                            $('#diffcheque').removeClass("red");
                                            $('#diffcheque').addClass("light-blue");
                                        }
                                    });
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                        }

                        function SubmitRegister() {
                            var expectedcash = $('#expectedcash').text();
                            var countedcash = $('#countedcash').val();
                            var expectedcc = $('#expectedcc').text();
                            var countedcc = $('#countedcc').val();
                            var expectedcheque = $('#expectedcheque').text();
                            var countedcheque = $('#countedcheque').val();
                            var RegisterNote = $('#RegisterNote').val();

                            swal({
                                    title: '<?= label("Areyousure"); ?>',
                                    text: '<?= label("CloseMessageRegister"); ?>',
                                    type: "warning",
                                    showCancelButton: true,
                                    confirmButtonColor: "#DD6B55",
                                    confirmButtonText: '<?= label("yesClose"); ?>',
                                    closeOnConfirm: false
                                },
                                function() {

                                    $.ajax({
                                        url: "<?php echo site_url('pos/SubmitRegister') ?>/",
                                        type: "POST",
                                        data: {
                                            expectedcash: expectedcash,
                                            countedcash: countedcash,
                                            expectedcc: expectedcc,
                                            countedcc: countedcc,
                                            expectedcheque: expectedcheque,
                                            countedcheque: countedcheque,
                                            RegisterNote: RegisterNote
                                        },
                                        success: function(data) {
                                            window.location.href = "<?php echo site_url() ?>";
                                        },
                                        error: function(jqXHR, textStatus, errorThrown) {
                                            alert("error");
                                        }
                                    });

                                    swal.close();
                                });
                        }

                        function email() {
                            $('#ticket').modal('hide');
                            swal({
                                    title: "An input!",
                                    text: "Email:",
                                    type: "input",
                                    showCancelButton: true,
                                    closeOnConfirm: false,
                                    animation: "slide-from-top",
                                    inputPlaceholder: "Email"
                                },
                                function(inputValue) {
                                    if (inputValue === false) return false;
                                    if (inputValue === "") {
                                        swal.showInputError("You need to write an email!");
                                        return false
                                    }
                                    var content = $('#printSection').html();
                                    $.ajax({
                                        url: "<?php echo site_url('pos/email') ?>/",
                                        type: "POST",
                                        data: {
                                            content: content,
                                            email: inputValue
                                        },
                                        success: function(data) {
                                            $('#ticket').modal('show');
                                            swal.close();
                                        },
                                        error: function(jqXHR, textStatus, errorThrown) {
                                            alert("error");
                                        }
                                    });
                                });
                        }

                        function pdfreceipt() {


                            var content = $('#printSection').html();
                            $.redirect('<?php echo site_url('pos/pdfreceipt') ?>/', {
                                content: content
                            });

                        }
                    </script>


                    <!-- Modal -->
                    <div class="modal fade" id="AddSale" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
                        <div class="modal-dialog" role="document">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                    <h4 class="modal-title" id="AddSale"><?= label("AddSale"); ?></h4>
                                </div>
                                <form>
                                    <div class="modal-body">
                                        <div class="form-group">
                                            <h2 id="customerName"><?= label("Customer"); ?> <span><?= label("WalkinCustomer"); ?></span></h2>
                                        </div>
                                        <div class="form-group">
                                            <h3 id="ItemsNum2"><span></span> <?= label("item"); ?></h3>
                                        </div>
                                        <div class="form-group">
                                            <h2 id="TotalModal"></h2>
                                        </div>
                                        <div class="form-group">
                                            <label for="paymentMethod"><?= label("paymentMethod"); ?></label>
                                            <select class="js-select-options form-control" id="paymentMethod">
                                                <option value="0"><?= label("Cash"); ?></option>
                                                <option value="1"><?= label("CreditCard"); ?></option>
                                                <option value="2"><?= label("Cheque"); ?></option>
                                            </select>
                                        </div>
                                        <div>
                                            <label for="paymentMethod">Return Id</label>

                                            <input style="border: 1px solid #ccc;border-radius: 4px;padding: 5px 12px;" type="text" style="width:100px;" name="retidd" class="-control" id="retidd" />
                                            <a href="javascript:void(0);" onclick="rrr();">&nbsp; Check&nbsp;</a>
                                            <input value="0" style="border: 1px solid #ccc;border-radius: 4px;padding: 5px 12px;background-color: #edf2f6;" type="text" readonly="readonly" name="amttt" class="-control" id="amttt" />
                                        </div>

                                        <script type="text/javascript">
                                            function callcc(cc, bb) {

                                                var rssss = document.getElementById('Paid').value;
                                                var amtttf = document.getElementById('amttt').value;

                                                var kmxx = parseFloat(amtttf) + parseFloat(cc) - parseFloat(rssss);
                                                $('#bamacee span').text(kmxx.toFixed(<?= $setting->decimals; ?>));

                                            }
                                        </script>
                                        <div class="form-group Paid">
                                            <label for="Paid">Amount To Pay</label>


                                            <input readonly="readonly" type="text" value="0" name="paid" class="form-control <?= strval($setting->keyboard) === '1' ? 'paidk' : '' ?>" id="Paid" placeholder="<?= label("Paid"); ?>">
                                            <input type="hidden" value="0" name="paidd" class="form-control <?= strval($setting->keyboard) === '1' ? 'paidk' : '' ?>" id="Paidd" placeholder="<?= label("Paid"); ?>">
                                        </div>


                                        <div class="form-group Paid">
                                            <label for="Paid">Received Amount</label>


                                            <input type="text" value="0" onkeyup="return callcc(this.value,this.id);" name="recivedamt" class="form-control <?= strval($setting->keyboard) === '1' ? 'paidk' : '' ?>" id="recivedamt">

                                        </div>



                                        <div class="form-group CreditCardNum">
                                            <i class="fa fa-cc-visa fa-2x" id="visa" aria-hidden="true"></i>
                                            <i class="fa fa-cc-mastercard fa-2x" id="mastercard" aria-hidden="true"></i>
                                            <i class="fa fa-cc-amex fa-2x" id="amex" aria-hidden="true"></i>
                                            <i class="fa fa-cc-discover fa-2x" id="discover" aria-hidden="true"></i>
                                            <label for="CreditCardNum"><?= label("CreditCardNum"); ?></label>
                                            <input type="text" class="form-control cc-num" id="CreditCardNum" placeholder="<?= label("CreditCardNum"); ?>">
                                        </div>
                                        <div class="clearfix"></div>
                                        <div class="form-group CreditCardHold col-md-4 padding-s">
                                            <input type="text" class="form-control" id="CreditCardHold" placeholder="<?= label("CreditCardHold"); ?>">
                                        </div>
                                        <div class="form-group CreditCardHold col-md-2 padding-s">
                                            <input type="text" class="form-control" id="CreditCardMonth" placeholder="<?= label("Month"); ?>">
                                        </div>
                                        <div class="form-group CreditCardHold col-md-2 padding-s">
                                            <input type="text" class="form-control" id="CreditCardYear" placeholder="<?= label("Year"); ?>">
                                        </div>
                                        <div class="form-group CreditCardHold col-md-4 padding-s">
                                            <input type="text" class="form-control" id="CreditCardCODECV" placeholder="<?= label("CODECV"); ?>">
                                        </div>
                                        <div class="form-group ChequeNum">
                                            <label for="ChequeNum"><?= label("ChequeNum"); ?></label>
                                            <input type="text" name="chequenum" class="form-control" id="ChequeNum" placeholder="<?= label("ChequeNum"); ?>">
                                        </div>
                                        <div class="form-group ReturnChange">
                                            <h3 id="ReturnChange"><span></span> </h3>
                                        </div>

                                        <div class="form-group ReturnChange">
                                            <h3 id="bamacee">Balance Rs.<span></span> </h3>
                                        </div>

                                        <div class="clearfix"></div>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                                        <?= strval($setting->stripe) === '1' ? '<button type="button" class="btn btn-add stripe-btn" onclick="saleBtn(2)"><i class="fa fa-cc-stripe" aria-hidden="true"></i> ' . label("StripePayment") . '</button>' : ''; ?>
                                        <button type="button" class="btn btn-add" onclick="saleBtn(1)"><?= label("Submit"); ?></button>
                                    </div>
                                    <?php echo form_close(); ?>
                            </div>
                        </div>
                    </div>
                    <!-- /.Modal -->


                    <!-- Modal ticket -->
                    <div class="modal fade" id="ticket" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
                        <div class="modal-dialog" role="document" id="ticketModal" style="width:400px;">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                    <h4 class="modal-title" id="ticket"><?= label("Receipt"); ?></h4>
                                </div>
                                <div class="modal-body" id="modal-body">
                                    <div id="printSection">
                                        <!-- Ticket goes here -->
                                        <center>
                                            <h1 style="color:#34495E"><?= label("empty"); ?></h1>
                                        </center>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>
                                    <button type="button" class="btn btn-add hiddenpr" href="javascript:void(0)" onClick="pdfreceipt()">PDF</button>
                                    <button type="button" class="btn btn-add hiddenpr" onclick="email()"><?= label("email"); ?></button>
                                    <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket()"><?= label("print"); ?></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- /.Modal -->

                    <!-- Modal add user -->
                    <div class="modal fade" id="AddCustomer" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
                        <div class="modal-dialog" role="document">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                    <h4 class="modal-title" id="myModalLabel"><?= label("AddCustomer"); ?></h4>
                                </div>
                                <?php echo form_open_multipart('customers/add'); ?>
                                <div class="modal-body">
                                    <div class="form-group">
                                        <label for="CustomerName"><?= label("CustomerName"); ?></label>
                                        <input type="text" name="name" class="form-control" id="CustomerName" placeholder="<?= label("CustomerName"); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="CustomerPhone"><?= label("CustomerPhone"); ?></label>
                                        <input type="text" name="phone" class="form-control" id="CustomerPhone" placeholder="<?= label("CustomerPhone"); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="CustomerEmail"><?= label("CustomerEmail"); ?></label>
                                        <input type="email" name="email" class="form-control" id="CustomerEmail" placeholder="<?= label("CustomerEmail"); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="CustomerDiscount"><?= label("CustomerDiscount"); ?></label>
                                        <input type="text" name="discount" class="form-control" id="CustomerDiscount" placeholder="<?= label("CustomerDiscount"); ?>">
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                                    <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
                                </div>
                                <?php echo form_close(); ?>
                            </div>
                        </div>
                    </div>
                    <!-- /.Modal -->

                    <!-- Modal add user -->
                    <div class="modal fade" id="CloseRegister" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
                        <div class="modal-dialog modal-lg" role="document">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                    <h4 class="modal-title" id="myModalLabel"><?= label("CloseRegister"); ?></h4>
                                </div>
                                <div class="modal-body">
                                    <div id="closeregsection">
                                        <!-- close register detail goes here -->
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <a href="javascript:void(0)" onclick="SubmitRegister()" class="btn btn-red col-md-12 flat-box-btn"><?= label("CloseRegister"); ?></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- /.Modal -->

                <?php } ?>


                <script type="text/javascript" src="<?php echo base_url(); ?>assets/js/jquery-2.2.2.min.js"></script>
                <script type="text/javascript" src="<?php echo base_url(); ?>assets/js/daterangepicker.js"></script>
                <script type="text/javascript">
                    $(document).ready(function() {

                        $('#pddate').datepicker({
                            todayHighlight: true,
                            autoclose: true
                        });


                    });
                </script>