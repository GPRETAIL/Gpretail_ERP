<!-- Page Content -->
<div class="container">
    <div class="row" style="margin-top:10px;">
        <div class="col-md-12">
            <!-- tab navigation -->
            <?php $tab = (isset($_GET['tab'])) ? $_GET['tab'] : null; ?>




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

                    var vvvxx = vvv;

                    var itemss = vvvxx.split('_');
                    var jjv = itemss[1];

                    var strURL = "<?php echo base_url(); ?>purchase/findcctn?country=" + countryId;
                    var req = getXMLHTTP();
                    if (req) {
                        req.onreadystatechange = function() {
                            if (req.readyState == 4) {
                                if (req.status == 200) {
                                    var data = req.responseText.split(",");
                                    $('#cosst_' + jjv).val(data[0]);
                                    $('#selling_' + jjv).val(data[1]);

                                    $('#cgst_' + jjv).val(data[2]);
                                    $('#sgst_' + jjv).val(data[3]);



                                    $('#qty_' + jjv).val(0);
                                    $('#subtt_' + jjv).val(0);



                                } else {
                                    alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                                }
                            }
                        }
                        req.open("GET", strURL, true);
                        req.send(null);
                    }


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

                function getStatebrd(countryId, jjj) {


                    var idxx = jjj;

                    var items = idxx.split('_');
                    var jj = items[1];


                    var strURL = "<?php echo base_url(); ?>purchase/findStatebran?country=" + countryId;
                    var req = getXMLHTTP();
                    if (req) {
                        req.onreadystatechange = function() {
                            if (req.readyState == 4) {
                                if (req.status == 200) {

                                    document.getElementById('customerSelect_' + jj).innerHTML = req.responseText;
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
            <script>
                $(document).ready(function() {
                    $(document).on("click", "#addMoreRows", function() { //alert("ddssss");
                        var inc = 1;
                        var vl = $('#countid').val();
                        var vl1 = (parseFloat(vl) + parseFloat(inc));
                        //alert(vl1);
                        //alert(vl);
                        $('#countid').val(vl1);
                        var datastring = 'countid=' + vl1;

                        $.ajax({
                            type: "POST",
                            url: "<?php echo base_url(); ?>purchase/addrow",
                            data: datastring,
                            cache: false,
                            success: function(result) {
                                // alert(result);

                                $('#education_fields').append(result);
                            }
                        });

                    });

                });
            </script>


            <script type="text/javascript">
                function education_fields() {

                    var ttyt = document.getElementById('totelemt').value;
                    ttyt++;
                    document.getElementById('totelemt').value = ttyt;
                    document.getElementById('add' + ttyt).style.display = 'block';


                }



                function remove_education_fields(rid) {

                    $('#add' + rid).remove();



                    var amtt = 0;
                    var ttcgst = 0;
                    var ttsgst = 0;
                    var totitem = 0;


                    var cc1 = 0;
                    var ss1 = 0;

                    var ttyt = document.getElementById('totelemt').value;

                    for (var xt = 1; xt <= ttyt; xt++) {
                        var elementExists = document.getElementById('subtt_' + xt);


                        if (elementExists != null) {
                            var rssss = document.getElementById('subtt_' + xt).value;
                            var xxz = document.getElementById('qty_' + xt).value;

                            amtt = parseFloat(amtt) + parseFloat(rssss);
                            totitem = parseFloat(totitem) + parseFloat(xxz);


                            var c1 = document.getElementById('cgst_' + xt).value;

                            var tty = (parseFloat(c1) * parseFloat(amtt)) / 100;
                            $("#ttcgst_" + xt).val(tty);
                            cc1 = parseFloat(cc1) + parseFloat(tty);



                            var s1 = document.getElementById('sgst_' + xt).value;
                            var sty = (parseFloat(s1) * parseFloat(amtt)) / 100;
                            $("#ttsgst_" + xt).val(sty);
                            ss1 = parseFloat(ss1) + parseFloat(sty);




                        }
                    }





                    var dd1 = document.getElementById('ddkst').value;

                    var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);

                    $("#betot").val(amtt);
                    $("#discct").val(totitem);
                    $("#cskgst").val(cc1);
                    $("#sskgst").val(ss1);
                    $("#afftot").val(flss1);









                }


                function callds(cc, bb) {

                    var va1 = document.getElementById('betot').value;
                    var va2 = document.getElementById('cskgst').value;
                    var va3 = document.getElementById('sskgst').value;


                    var kmxx = parseFloat(va1) + parseFloat(va2) + parseFloat(va3) - parseFloat(cc);

                    $("#afftot").val(kmxx);





                }

                function callcc(cc, bb) {


                    var items = bb.split('_');
                    var jj = items[1];
                    var rssss = document.getElementById('cosst_' + jj).value;
                    var qqty = cc;
                    var kmxx = parseFloat(rssss) * parseFloat(qqty);

                    $("#subtt_" + jj).val(kmxx);


                    var amtt = 0;
                    var totitem = 0;

                    var cc1 = 0;
                    var ss1 = 0;


                    var ttyt = document.getElementById('totelemt').value;

                    for (var xt = 1; xt <= ttyt; xt++) {
                        var elementExists = document.getElementById('subtt_' + xt);


                        if (elementExists != null) {
                            var rssss = document.getElementById('subtt_' + xt).value;
                            var xxz = document.getElementById('qty_' + xt).value;

                            amtt = parseFloat(amtt) + parseFloat(rssss);
                            totitem = parseFloat(totitem) + parseFloat(xxz);


                            var c1 = document.getElementById('cgst_' + xt).value;


                            var tty = (parseFloat(c1) * parseFloat(rssss)) / 100;
                            $("#ttcgst_" + xt).val(tty);
                            cc1 = parseFloat(cc1) + parseFloat(tty);



                            var s1 = document.getElementById('sgst_' + xt).value;
                            var sty = (parseFloat(s1) * parseFloat(rssss)) / 100;
                            $("#ttsgst_" + xt).val(sty);
                            ss1 = parseFloat(ss1) + parseFloat(sty);

                        }
                    }

                    var dd1 = document.getElementById('ddkst').value;

                    var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);

                    $("#betot").val(amtt);
                    $("#discct").val(totitem);
                    $("#cskgst").val(cc1);
                    $("#sskgst").val(ss1);
                    $("#afftot").val(flss1);

                }



                function callcctt(cc, bb) {
                    var rssss = document.getElementById('betot').value;

                    var nmm = parseFloat(rssss);
                    if (cx != '') {


                        $("#aftot").val(kmaa);

                    } else {

                        $("#aftot").val(nmm);

                    }
                }
            </script>











            <script>
                $(document).ready(function() {
                    $("#country_1").keyup(function() {
                        $.ajax({
                            type: "POST",
                            url: "<?php echo base_url(); ?>pos/lookupcc",
                            data: 'vv=1&keyword=' + $(this).val(),
                            success: function(data) {
                                $("#suggesstion-box_1").show();
                                $("#suggesstion-box_1").html(data);
                            }
                        });
                    });
                });

                function ckkkr() {

                    var kk = $("#innvamt").val();
                    var mm = $("#betot").val();
                    if (kk == mm)

                    {

                        return true;
                    } else {
                        alert("Sorry ,Supplier Invoice Amount is not matching with total amount");
                        return false;
                    }


                }



                function selectState(nam, m, idd, rss, cgg, sgg) {
                    $("#country_" + m).val(nam);
                    $("#cosst_" + m).val(rss);
                    $("#proid_" + m).val(idd);
                    $("#cgst_" + m).val(cgg);
                    $("#sgst_" + m).val(sgg);
                    $("#suggesstion-box_" + m).hide();
                }
            </script>





            </html>



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

            <h3><?= label("Add"); ?> <a style="float: right;" class="btn btn-primary btn-red" href="<?php echo base_url(); ?>purchase"><?= label("Back"); ?></a></h3>
            <hr>
            <input type="hidden" id="countid" value="1">


            <form method="post" action="<?php echo base_url(); ?>purchase/addtodbb">

                <div class="panel-body" style="padding: 1px;">

                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label("Purchase"); ?> <?= label("Number"); ?>
                            <?php
                            $ikmm = mysql_fetch_array(mysql_query("select id from purchases order by id desc "));
                            $knn = $ikmm['id'] + 1;
                            ?>
                            <input readonly="readonly" class="form-control" type="text" name="prcno" id="prcno" value="<?php echo $knn; ?>">


                        </div>
                    </div>



                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label("Purchase"); ?> <?= label("Date"); ?>
                            <input type="text" maxlength="30" Required="required" value="<?php echo date("m/d/Y"); ?>" name="pddate" class="form-control" id="pddate" placeholder="<?= label("Date"); ?>">



                        </div>
                    </div>


                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label("Purchase"); ?> <?= label("Type"); ?>
                            <select required="required" class="form-control" id="pptye" name="pptye">
                                <option value="0">Cash </option>
                                <option value="1">Credit card</option>
                                <option value="2">Cheque</option>


                            </select>


                        </div>
                    </div>


                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label("Warehouses"); ?>
                            <select required="required" class="form-control" id="warr" name="warr">
                                <option value="">Select</option>
                                <?php
                                $mjm = mysql_query("select * from warehouses order by name asc ");
                                while ($mjmf = mysql_fetch_array($mjm)) {
                                ?>
                                    <option value="<?php echo $mjmf['id']; ?>"><?php echo $mjmf['name']; ?></option>
                                <?php
                                }
                                ?>

                            </select>


                        </div>
                    </div>


                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label("Suppliers"); ?>
                            <select required="required" class="form-control" id="supp" name="supp">
                                <option value="">Select</option>
                                <?php

                                $mjm = mysql_query("select * from suppliers order by name asc ");
                                while ($mjmf = mysql_fetch_array($mjm)) {
                                ?>
                                    <option value="<?php echo $mjmf['id']; ?>"><?php echo $mjmf['name']; ?></option>
                                <?php

                                }
                                ?>

                            </select>


                        </div>
                    </div>
                </div>




                <div class="panel-body" style="padding: 1px;">

                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label("Suppliers"); ?> <?= label("Invoice"); ?> <?= label("No"); ?>
                            <input class="form-control" type="text" name="innvno" id="innvno" required="required" value="" />


                        </div>
                    </div>


                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label("Suppliers"); ?> <?= label("Invoice"); ?> <?= label("Date"); ?>
                            <input required="required" class="form-control" type="text" name="innvdda" id="innvdda" value="<?php echo date("m/d/Y"); ?>" />


                        </div>
                    </div>

                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label("Suppliers"); ?> <?= label("Invoice"); ?> <?= label("Amount"); ?>
                            <input required="required" class="form-control" type="text" name="innvamt" id="innvamt" value="" />


                        </div>
                    </div>


                </div>



                <input type="hidden" id="totelemt" name="totelemt" value="1" />




                <div class="panel panel-default">

                    <div class="panel-heading"><?= label("Products"); ?> </div>
                    <div class="panel-body" style="padding: 1px;">

                        <div style="text-align: center;" class="col-xs-2 table-header">
                            <h7><?= label("Brand"); ?> </h7>
                        </div>

                        <div style="text-align: center;" class="col-xs-2 table-header">
                            <h7><?= label("Product"); ?></h7>
                        </div>

                        <div style="width:120px;text-align: center;" class="col-xs-1 table-header">
                            <h7><?= label("Purchase"); ?> <?= label("Price"); ?> </h7>

                        </div>
                        <?php
                        $lxzmm = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
                        if ($lxzmm['gst_tax'] == 1) {
                        ?>
                            <div style="text-align: center;text-align: center;" class="col-xs-1 table-header">
                                <h7>CGST</h7>
                            </div>
                            <div style="text-align: center;text-align: center;" class="col-xs-1 table-header">
                                <h7>SGST</h7>
                            </div>
                        <?php
                        }
                        ?>
                        <div style="text-align: center;" class="col-xs-1 table-header">
                            <h7><?= label("Quantity"); ?></h7>
                        </div>
                        <div style="width:120px;text-align: center;" class="col-xs-1 table-header">
                            <h7><?= label("Selling"); ?> <?= label("Price"); ?> </h7>
                        </div>

                        <div style="text-align: center;" class="col-xs-2 table-header">
                            <h7><?= label("Total"); ?> <?= label("Price"); ?> </h7>
                        </div>










                        <div id="add1" class="col-xs-12">

                            <div class="col-sm-2 ">
                                <div class="form-group">
                                    <select required="required" onchange="getState(this.value,this.id)" class="js-select-options form-control" name="customerSelect[]" id="customerSelect_1">
                                        <option value="">&nbsp;&nbsp;&nbsp;Select</option>
                                        <?php
                                        $kmk = mysql_query("select * from brand order by name asc ");
                                        while ($kmkf = mysql_fetch_object($kmk)) { ?>
                                            <option value="<?= $kmkf->id; ?>">&nbsp;&nbsp;&nbsp;<?= $kmkf->name; ?></option>
                                        <?php } ?>
                                    </select>
                                </div>
                            </div>

                            <div class="col-sm-2 ">
                                <div class="form-group">
                                    <select required="required" class="js-select-options form-control" id="statediv_1" name="statediv[]" onchange="getdetals(this.value,this.id);getStatebrd(this.value,this.id);">

                                        <option value="">&nbsp;&nbsp;&nbsp;Select Product </option>
                                        <?php
                                        $kmkg = mysql_query("select * from products order by name asc ");
                                        while ($kmkgh = mysql_fetch_object($kmkg)) { ?>
                                            <option value="<?= $kmkgh->id; ?>">&nbsp;&nbsp;&nbsp;<?= $kmkgh->name; ?></option>
                                        <?php } ?>

                                    </select>
                                </div>
                            </div>

                            <div style="width:120px;" class="col-sm-1 ">
                                <div class="form-group">
                                    <input required="required" readonly="readonly" type="text" class="form-control" id="cosst_1" name="cosst[]" value="" placeholder="Cost">
                                </div>
                            </div>
                            <?php
                            if ($lxzmm['gst_tax'] == 1) { ?>
                                <div class="col-sm-1 ">
                                    <div class="form-group">
                                        <input readonly="readonly" type="text" class="form-control" id="cgst_1" name="cgst[]" value="" placeholder="Cgst">
                                        <input readonly="readonly" type="hidden" class="form-control" id="ttcgst_1" name="ttcgst[]" value="0" placeholder="Cgst">
                                    </div>
                                </div>

                                <div class="col-sm-1 ">
                                    <div class="form-group">
                                        <input readonly="readonly" type="text" class="form-control" id="sgst_1" name="sgst[]" value="" placeholder="Sgst">
                                        <input readonly="readonly" type="hidden" class="form-control" id="ttsgst_1" name="ttsgst[]" value="0" placeholder="Sgst">
                                    </div>
                                </div>


                            <?php
                            } else {


                            ?>

                                <input readonly="readonly" type="hidden" class="form-control" id="cgst_1" name="cgst[]" value="" placeholder="Cgst">
                                <input readonly="readonly" type="hidden" class="form-control" id="ttcgst_1" name="ttcgst[]" value="0" placeholder="Cgst">


                                <input readonly="readonly" type="hidden" class="form-control" id="sgst_1" name="sgst[]" value="" placeholder="Sgst">
                                <input readonly="readonly" type="hidden" class="form-control" id="ttsgst_1" name="ttsgst[]" value="0" placeholder="Sgst">
                            <?php } ?>

                            <div class="col-sm-1 ">
                                <div class="form-group">
                                    <input required="required" type="text" onkeyup="return callcc(this.value,this.id);" required="required" class="form-control" id="qty_1" name="qty[]" value="" placeholder="Quantity">
                                </div>
                            </div>

                            <div style="width:140px;" class="col-sm-1 ">
                                <div class="form-group">
                                    <input style="width:120px;" readonly="readonly" type="text" class="form-control" id="selling_1" name="selling[]" value="" placeholder="Cost">
                                </div>
                            </div>

                            <div class="col-sm-2 ">
                                <div class="input-group">
                                    <input readonly="readonly" type="text" class="form-control" value="0" id="subtt_1" name="subtt[]" value="" placeholder="Cost">
                                    <div class="input-group-btn">
                                        <button class="btn btn-danger" type="button">
                                            <span class="glyphicon glyphicon-minus" aria-hidden="true"></span></button>
                                    </div>
                                </div>
                            </div>

                        </div>


























                        <div id="education_fields">

                        </div>




                        <div class="col-sm-2 ">
                            <div class="form-group">
                                &nbsp;
                            </div>
                        </div>
                        <div class="col-sm-2 ">
                            <div class="form-group">
                                &nbsp;
                            </div>
                        </div>
                        <div class="col-sm-2 ">
                            <div class="form-group">
                                &nbsp;
                            </div>
                        </div>
                        <div class="col-sm-1 ">
                            <div class="form-group">
                                &nbsp;
                            </div>
                        </div>
                        <div class="col-sm-2 ">



                            <div class="form-group" style="float: right;">
                                <br><br>


                            </div>
                        </div>

                        <button id="addMoreRows" style="margin: 0px 0px 0px 14px;" class="btn btn-success" type="button" onclick="education_fields();"> <span class="glyphicon glyphicon-plus" aria-hidden="true"></span> </button>



                        <div class="col-xs-12">

                            <div class="col-sm-2 "></div>

                            <div class="col-sm-1 "></div>


                            <?php
                            if ($lxzmm['gst_tax'] == 1) { ?>
                                <div class="col-sm-1 "></div>

                                <div class="col-sm-1 "></div>


                            <?php
                            }
                            ?>
                            <div style="width:120px;" class="col-sm-1 "><?= label("TotalItems"); ?></div>
                            <div class="col-sm-2 "><input readonly="readonly" type="text" class="form-control" id="discct" name="discct" value="" placeholder="Total">
                            </div>

                            <div style="width:140px;" class="col-sm-1 "><?= label("Total"); ?> </div>

                            <div class="col-sm-2 "><input readonly="readonly" type="text" class="form-control" id="betot" name="betot" value="" placeholder="Total"></div>

                        </div>



                        <?php
                        if ($lxzmm['gst_tax'] == 1) { ?>

                            <div class="col-xs-12">

                                <div class="col-sm-2 "></div>

                                <div class="col-sm-2 "></div>

                                <div style="width:120px;" class="col-sm-1 "></div>
                                <?php
                                if ($lxzmm['gst_tax'] == 1) { ?>
                                    <div class="col-sm-1 "></div>

                                    <div class="col-sm-1 "></div>


                                <?php
                                }
                                ?>

                                <div class="col-sm-1 ">
                                </div>

                                <div style="width:140px;" class="col-sm-1 "><br>CGST <?= label("Amount"); ?></div>

                                <div class="col-sm-2 "><br><input readonly="readonly" type="text" class="form-control" id="cskgst" name="cskgst" value="" placeholder="Total"></div>

                            </div>


                            <div class="col-xs-12">

                                <div class="col-sm-2 "></div>

                                <div class="col-sm-2 "></div>

                                <div style="width:120px;" class="col-sm-1 "></div>
                                <?php
                                if ($lxzmm['gst_tax'] == 1) { ?>
                                    <div class="col-sm-1 "></div>

                                    <div class="col-sm-1 "></div>


                                <?php
                                }
                                ?>

                                <div class="col-sm-1 ">
                                </div>

                                <div style="width:140px;" class="col-sm-1 "><br>SGST <?= label("Amount"); ?></div>

                                <div class="col-sm-2 "><br><input readonly="readonly" type="text" class="form-control" id="sskgst" name="sskgst" value="" placeholder=""></div>

                            </div>



                        <?php } else { ?>

                            <input readonly="readonly" type="hidden" class="form-control" id="cskgst" name="cskgst" value="" placeholder="Total">
                            <input readonly="readonly" type="hidden" class="form-control" id="sskgst" name="sskgst" value="" placeholder="">

                        <?php

                        } ?>

                        <div class="col-xs-12">

                            <div class="col-sm-2 "></div>

                            <div class="col-sm-2 "></div>

                            <div style="width:120px;" class="col-sm-1 "></div>
                            <?php
                            if ($lxzmm['gst_tax'] == 1) { ?>
                                <div class="col-sm-1 "></div>

                                <div class="col-sm-1 "></div>


                            <?php
                            }
                            ?>

                            <div class="col-sm-1 ">
                            </div>

                            <div style="width:140px;" class="col-sm-1 "><br><?= label("Discount"); ?> <?= label("Amount"); ?> </div>

                            <div class="col-sm-2 "><br><input onkeyup="return callds(this.value,this.id);" type="text" class="form-control" id="ddkst" name="ddkst" value="0" placeholder=""></div>

                        </div>


                        <div class="col-xs-12">

                            <div class="col-sm-2 "></div>

                            <div class="col-sm-2 "></div>

                            <div style="width:120px;" class="col-sm-1 "></div>
                            <?php
                            if ($lxzmm['gst_tax'] == 1) { ?>
                                <div class="col-sm-1 "></div>

                                <div class="col-sm-1 "></div>


                            <?php
                            }
                            ?>

                            <div class="col-sm-1 ">
                            </div>

                            <div style="width:140px;" class="col-sm-1 "><br><?= label("Total"); ?></div>

                            <div class="col-sm-2 "><br><input readonly="readonly" type="text" class="form-control" id="afftot" name="afftot" value="" placeholder="Total"></div>

                        </div>




                        <div class="col-xs-12">

                            <div class="col-sm-2 "></div>

                            <div class="col-sm-2 "></div>

                            <div style="width:120px;" class="col-sm-1 "></div>
                            <?php
                            if ($lxzmm['gst_tax'] == 1) { ?>
                                <div class="col-sm-1 "></div>

                                <div class="col-sm-1 "></div>


                            <?php
                            }
                            ?>

                            <div class="col-sm-1 ">
                            </div>

                            <div style="width:140px;" class="col-sm-1 "></div>

                            <div class="col-sm-2 "><br><input onclick="return ckkkr();" type="Submit" class="form-control btn btn-green" id="aftot" name="Submit" value="Save"></div>

                        </div>













                        <div class="clear"></div>

                    </div>

                    <div class="panel-footer"><small><em><a href="javascript:void(0);"></a></em></em></small></div>
                </div>





        </div>
    </div>
</div>
</form>

<script type="text/javascript">
    /******** passwors confirmation validation ****************/

    var currency = document.getElementById("currency");

    function validatecurrency() {
        if (currency.value.length < 3) {
            currency.setCustomValidity("The Currency code must be at least 3 characters length");
        } else {
            currency.setCustomValidity('');
        }
    }
    if (currency) currency.onchange = validatecurrency;

    $('.collapse').collapse()
</script>

<script type="text/javascript">
    $(document).ready(function() {

        $('#pddate').datepicker({
            todayHighlight: true,
            autoclose: true
        });


    });

    $(document).ready(function() {


        $('#innvdda').datepicker({
            todayHighlight: true,
            autoclose: true
        });
    });
</script>