<div class="container">
    <?php
    $rolr = $user->role;
    $kkar = $db->query(("select * from permission_new where nname='" . $rolr . "'  "))->getRowArray();
    ?>

    <h3><?= label('Quotation'); ?> <?php if ($kkar['qta'] == 1) { ?><a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url(); ?>quotation"><?= label('AddQuotation'); ?> </a><?php } ?></h3>
    <hr>

    <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead class="thead-inverse">
            <tr style="text-align: center;">
                <th style="padding: 8px;"><?= label('Date'); ?></th>
                <th style="padding: 8px;"><?= label('Number'); ?></th>
                <th style="padding: 8px;"><?= label('TotalItems'); ?></th>

                <th style="padding: 8px;"><?= label('Amount'); ?></th>

                <?php
                $lxzmm = $db->query(("select * from settings where id=1 "))->getRowArray();
                if ($lxzmm['gst_tax'] == 1) {
                ?>



                <?php
                }
                if ($lxzmm['disc_all'] == 1) {
                ?>

                    <th style="padding: 8px;"><?= label('Discount'); ?></th>
                <?php
                }
                if ($lxzmm['disc_pro'] == 1) {
                ?>

                    <th style="padding: 8px;"><?= label('Discount'); ?></th>
                <?php    } ?>


                <th style="padding: 8px;"><?= label('Total'); ?></th>
                <th style="padding: 8px;"><?= label('Customer'); ?></th>
                <th style="padding: 8px;"><?= label('Createdby'); ?></th>
                <th style="padding: 8px;"><?= label('Store'); ?></th>

                <th style="padding: 8px;"><?= label('Status'); ?></th>
                <th style="padding: 8px;"><?= label('Action'); ?></th>
            </tr>

        <tbody>

            <?php
            $lxzmm = $db->query(("select * from settings where id=1 "))->getRowArray();
            $rolr = $user->role;
            $kkar = $db->query(("select * from permission_new where nname='" . $rolr . "'  "))->getRowArray();

            $query = $db->query("SELECT *  FROM saleqs   order by id desc ");
            $list = $query->getResult();
            // $list = $query->getResult('object');

            foreach ($list as $invoice) {


                $lkl = $db->query(("select * from registers where id='" . $invoice->register_id . "' "))->getRowArray();

                $lklx = $db->query(("select * from stores where id='" . $lkl['store_id'] . "' "))->getRowArray();


            ?>

                <tr role="row" class="odd">


                    <td style="padding: 8px;"><?php echo date("d-m-Y", strtotime($invoice->created_at)); ?></td>
                    <td style="padding: 8px;"><?php echo $invoice->id; ?></td>

                    <td style="padding: 8px;"><?php echo $invoice->totalitems; ?></td>
                    <td style="padding: 8px;"><?php echo $invoice->subtotal; ?>


                        <span style="display: none;">
                            <?php
                            // $olsdd = mysql_query("select * from sale_items where sale_id='" . $invoice->id . "' ");
                            // while ($olsddf = mysql_fetch_object($olsdd)) {
                            //     echo $olsddf->name . " ";
                            // }
                            $builder = $db->table('sale_items');
                            $builder->select('name');
                            $builder->where('sale_id', $invoice->id);
                            $query = $builder->get();

                            foreach ($query->getResult() as $row) {
                                echo $row->name . " ";
                            }
                            ?>
                        </span>


                    </td>
                    <td style="padding: 8px;"><?php echo $invoice->discount_indujul + $invoice->discountamount; ?></td>


                    <?php

                    $toral_taxxx = 0;

                    $reg_ffr = $invoice->register_id;

                    $reg_ffrf = $db->query(("select id,store_id from registers where id='" . $reg_ffr . "'  "))->getRowArray();
                    $store_idf = $reg_ffrf['store_id'];
                    $store_idd = $db->query(("select id,name from stores where id='" . $store_idf . "'  "))->getRowArray();
                    $stoc_idf = $store_idd['name'];


                    $mkmmmm = ("select * from tax_summary where salesid='" . $invoice->id . "' ");
                    while ($mkmmmmf = $db->query($mkmmmm)->getRowArray()) {
                        $toral_taxxx = $toral_taxxx + $mkmmmmf['taxfrom'];
                    }

                    if ($invoice->sal_id > 0) {
                        $satus = 'Sold-' . $invoice->sal_id;
                    } else {
                        if ($invoice->status == 3) {
                            $satus = 'Cancelled';
                        } else {
                            $satus = 'Pending';
                        }
                    }

                    ?>
                    <td style="padding: 8px;"><?php echo  number_format((float)$invoice->total, $setting->decimals, '.', ''); ?></td>

                    <td style="padding: 8px;"><?php echo  $invoice->clientname; ?></td>
                    <td style="padding: 8px;"><?php echo  $invoice->created_by; ?></td>
                    <td style="padding: 8px;"><?php echo  $stoc_idf; ?></td>

                    <td style="padding: 8px;"><?php echo  '<span class="' . $satus . '">' . label($satus) . '<span>'; ?></td>
                    <td style="padding: 8px;">
                        <div class="btn-group">
                            <a class="btn btn-primary" href="javascript:void(0)" dropdown-toggle" data-toggle="dropdown"><i class="fa fa-cog fa-fw"></i> </a>
                            <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#"><span class="fa fa-caret-down" title="Toggle dropdown menu"></span></a>
                            <ul class="dropdown-menu">
                                <li><a href="javascript:void(0)" onclick="showInvoice4(<?php echo $invoice->id; ?>)"><i class="fa fa-sticky-note" aria-hidden="true"></i>Invoice A4</a></li>
                                <li><a href="javascript:void(0)" onclick="showInvoice(<?php echo $invoice->id; ?>)"><i class="fa fa-sticky-note" aria-hidden="true"></i> Invoice A5 </a></li>


                                <li><a href="javascript:void(0)" onclick="showTicket(<?php echo $invoice->id; ?>)"><i class="fa fa-sticky-note" aria-hidden="true"></i> <?php echo label("Receipt"); ?> 3.5 </a></li>

                                <?php

                                if (isset($ret_ck) && $kkar['qtd'] == "1" && $invoice->status != 3 && intval($ret_ck) == 0 && $invoice->sal_id == 0) {
                                ?>
                                    <li><a href="javascript:void(0)" onclick="delete_invoice(<?php echo $invoice->id; ?>)"><i class="fa fa-trash-o fa-fw" aria-hidden="true"></i>Cancel</a></li>
                                <?php  }


                                $ret_ck = mysql_num_rows(mysql_query("select * from returnss where re_sales_id='" . $invoice->id . "'  "));
                                if ($kkar['qte'] == 1 && $invoice->status != 3 && $invoice->sal_id == 0) {  ?>




                                    <li><a href="<?php echo base_url(); ?>quotation/qindex/<?php echo $invoice->id; ?>">Convert to Sale </a></li>

                                <?php
                                }
                                ?>
                            </ul>
                        </div>

                    </td>



                </tr>


            <?php
            }
            ?>
        </tbody>

    </table>
</div>

<div class="modal fade" id="education_fields" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">


</div>

<script type="text/javascript">
    function gauthamm(ccc) {


        var kkq = document.getElementsByName('retq[]'),
            retq = [].map.call(kkq, function(input) {
                return input.value;
            }).join('|');

        var kkt = document.getElementsByName('stot[]'),
            stot = [].map.call(kkt, function(input) {
                return input.value;
            }).join('|');

        var kky = document.getElementsByName('idd[]'),
            idd = [].map.call(kky, function(input) {
                return input.value;
            }).join('|');





        var discper = document.getElementById('discper').value;
        var distot = document.getElementById('distot').value;
        var gtot = document.getElementById('gtot').value;
        var gltot = document.getElementById('gltot').value;
        var distot = document.getElementById('distot').value;
        var rrtyp = document.getElementById('rrtyp').value;
        var numrowc = document.getElementById('numrowc').value;




        $.ajax({
            url: "<?php echo site_url('returns/addre') ?>/" + ccc,
            type: "POST",
            data: {
                retq: retq,
                stot: stot,
                idd: idd,
                discper: discper,
                distot: distot,
                gtot: gtot,
                gltot: gltot,
                distot: distot,
                rrtyp: rrtyp,
                numrowc: numrowc
            },
            success: function(data) {


                $('#education_fields').modal('hide');
                location.reload();



            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });






    }

    function getqqtt(str, tid) {




        var fie = tid.split('_');
        var iij = fie[1];
        var pprice = document.getElementById('pric_' + iij).value;
        var qtyret = document.getElementById('retq_' + iij).value;
        var ssubtoto = document.getElementById('stot_' + iij).value;
        var qtyavl = document.getElementById('qty_' + iij).value;

        var tta = pprice * qtyret;
        if (parseInt(qtyavl) >= parseInt(qtyret)) {

            document.getElementById('stot_' + iij).value = tta;

        } else {
            document.getElementById('retq_' + iij).value = 0;
            document.getElementById('stot_' + iij).value = 0;
        }


        var texxx = document.getElementById('numrowc').value;

        var mss = 0;
        var i = 1;
        for (i = 1; i < texxx; i++) {

            var skk = document.getElementById('stot_' + i).value;

            if (skk > 0) {
                mss = parseFloat(mss) + parseFloat(skk);
            }

        }
        document.getElementById('gtot').value = mss;
        var ddper = document.getElementById('discper').value;

        var taxcal = (ddper * mss) / 100;
        var ttt = parseFloat(mss) - parseFloat(taxcal);
        document.getElementById('distot').value = taxcal;


        document.getElementById('gltot').value = ttt;




    }

    function education_fields(vl) {




        var datastring = 'countid=' + vl;


        $.ajax({
            type: "POST",
            url: "<?php echo site_url('purchase/addrowret_amt') ?>",
            data: datastring,
            cache: false,
            success: function(result) {

                $('#education_fields').html(result);
                $('#education_fields').modal('show');


            }
        });




    }

    function reload_table() {
        table.ajax.reload(null, false); //reload datatable ajax
    }

    function delete_invoice(id) {
        swal({
                title: '<?= label("Areyousure"); ?>',
                text: '<?= label("Deletemessage"); ?>',
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: '<?= label("Yes,Cancel It"); ?>',
                closeOnConfirm: false
            },
            function() {
                // ajax delete data to database
                $.ajax({
                    url: "<?php echo site_url('invoicesq/ajax_delete') ?>/" + id,
                    type: "POST",
                    dataType: "JSON",
                    success: function(data) {
                        //if success reload ajax table
                        $('#modal_form').modal('hide');
                        location.reload();
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert('Error adding / update data');
                    }
                });
                swal('<?= label("Canceled"); ?>', '<?= label("The Bill has been Canceled"); ?>', "success");
            });
    }

    function showTicket(id) {

        $.ajax({
            url: "<?php echo site_url('invoicesq/ShowTicket') ?>/" + id,
            type: "POST",
            success: function(data) {
                $('#printSection').html(data);
                $('#ticket').modal('show');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    };

    function showTicket4(id) {

        $.ajax({
            url: "<?php echo site_url('invoices/ShowTicket4') ?>/" + id,
            type: "POST",
            success: function(data) {
                $('#printSection').html(data);
                $('#ticket').modal('show');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    };

    function showTicket2(id) {

        $.ajax({
            url: "<?php echo site_url('invoicesq/ShowTicket2') ?>/" + id,
            type: "POST",
            success: function(data) {
                $('#printSection').html(data);
                $('#ticket').modal('show');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    };


    function showInvoice(id) {

        $.ajax({
            url: "<?php echo site_url('invoicesq/showInvoice') ?>/" + id,
            type: "POST",
            success: function(data) {
                $('#printSectionInvoice').html(data);
                $('#invoice').modal('show');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    };

    function showInvoice4(id) {

        $.ajax({
            url: "<?php echo site_url('invoicesq/showInvoice4') ?>/" + id,
            type: "POST",
            success: function(data) {
                $('#printSectionInvoice').html(data);
                $('#invoice').modal('show');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    };

    function Edit_Sale(id) {

        $.ajax({
            url: "<?php echo site_url('invoices/Edit_Ajax') ?>/" + id,
            type: "POST",
            success: function(data) {
                $('#editSection').html(data);
                $('#Edit').modal('show');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    };

    function update_Sale() {
        var id = $('#ClientId').val();
        var customerId = $('#customerSelect').val();
        var customer = $('#customerSelect option:selected').text();
        var Status = $('#changeStatus').val();

        $.ajax({
            url: "<?php echo site_url('invoices/Update_Sale') ?>/" + id,
            data: {
                customer: customer,
                customerId: customerId,
                Status: Status
            },
            type: "POST",
            success: function(data) {
                reload_table();
                $('#Edit').modal('hide');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    };

    function PrintTicket() {
        $('.modal-body').removeAttr('id');
        window.print();
        $('.modal-body').attr('id', 'modal-body');
    }

    function PrintTicket4() {

        $('.modal-body').removeAttr('id');
        window.print();
        $('.modal-body').attr('id', 'modal-body');
    }

    function pdfreceipt() {


        var content = $('#printSection').html();
        $.redirect('<?php echo site_url('pos/pdfreceipt') ?>/', {
            content: content
        });

    }

    function pdfinvoice() {


        var content = $('#printSectionInvoice').html();
        $.redirect('<?php echo site_url('pos/pdfreceipt') ?>/', {
            content: content
        });

    }

    var saleID;

    function payaments(id) {
        saleID = id;
        $.ajax({
            url: "<?php echo site_url('invoices/payaments') ?>/" + id,
            type: "POST",
            success: function(data) {
                $('#payementsSection').html(data);
                $('#payements').modal('show');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    };

    function AddPayement(type) {
        var createdBy = '<?php echo $user->firstname . " " . $user->lastname; ?>';
        var Paid = $('#Paid').val();
        if (Paid > 0) {
            var ccnum = $('#CreditCardNum').val();
            var ccmonth = $('#CreditCardMonth').val();
            var ccyear = $('#CreditCardYear').val();
            var ccv = $('#CreditCardCODECV').val();
            var paidMethod = $('#paymentMethod').find('option:selected').val();
            switch (paidMethod) {
                case '1':
                    paidMethod += '~' + $('#CreditCardNum').val() + '~' + $('#CreditCardHold').val();
                    break;
                case '2':
                    paidMethod += '~' + $('#ChequeNum').val();
            }



            $.ajax({
                url: "<?php echo site_url('invoices/Addpayament') ?>/" + type,
                type: "POST",
                data: {
                    created_by: createdBy,
                    paid: Paid,
                    paidmethod: paidMethod,
                    ccnum: ccnum,
                    ccmonth: ccmonth,
                    ccyear: ccyear,
                    ccv: ccv,
                    sale_id: saleID
                },
                success: function(data) {

                    $('#payementsSection').load("<?php echo site_url('invoices/payaments') ?>/" + saleID);
                    $('#Addpayament').modal('hide');
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
            $('#Paid').val('');

        } else {
            alert("Please enter amount...");
        }
    }

    $(document).ready(function() {
        $('.Paid').show();
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
                $('.Paid').show();
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
    });

    function addpymntBtn() {
        if (<?= $register ? 'true' : 'false'; ?>)
            $('#Addpayament').modal('show');
        else
            swal("<?= label("requiresRegister"); ?>");
    }

    function deletepayement(id) {
        $.ajax({
            url: "<?php echo site_url('invoices/deletepayement') ?>/" + id + "/" + saleID,
            type: "POST",
            success: function(data) {
                $('#payementsSection').load("<?php echo site_url('invoices/payaments') ?>/" + saleID);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    }
</script>

<style type="text/css">
    .table>tbody>tr>td,
    .table>tbody>tr>th,
    .table>tfoot>tr>td,
    .table>tfoot>tr>th,
    .table>thead>tr>td,
    .table>thead>tr>th {
        padding: 0px;

    }
</style>



<!-- Modal ticket -->
<div class="modal fade" id="ticket" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document" id="ticketModal" style="width:400px;">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="ticket"><?= label("Receipt"); ?></h4>
            </div>
            <div class="modal-body" id="modal-body">
                <div id="printSection" style="margin-left: -15px;">
                    <!-- Ticket goes here -->
                    <center>
                        <h1 style="color:#34495E"><?= label("empty"); ?></h1>
                    </center>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>
                <button type="button" class="btn btn-add hiddenpr" href="javascript:void(0)" onClick="pdfreceipt()">PDF</button>
                <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket()"><?= label("print"); ?></button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="invoice" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog " role="document" style="width:800px;" id="invoiceModal">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="invoice"><?= label("INVOICE"); ?></h4>
            </div>
            <div class="modal-body" id="modal-body" style="padding: 0px !important;">
                <div id="printSectionInvoice">
                    <!-- Invoice goes here -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>
                <button type="button" class="btn btn-add hiddenpr" href="javascript:void(0)" onClick="pdfinvoice()">PDF</button>
                <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket();"><?= label("print"); ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal edit -->
<div class="modal fade" id="Edit" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document" id="editModal">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="edit"><?= label("Edit"); ?></h4>
            </div>
            <div class="modal-body" id="modal-body">
                <div id="editSection">
                    <!-- edit goes here -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>
                <button type="button" class="btn btn-add hiddenpr" onclick="update_Sale()"><?= label("Submit"); ?></button>
            </div>
        </div>
    </div>
</div>
<!-- /.Modal -->

<!-- Modal payements -->
<div class="modal fade" id="payements" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document" id="payementsModal">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="edit"><?= label("Payements"); ?></h4>
            </div>
            <div class="modal-body" id="modal-body">
                <div id="payementsSection">
                    <!-- payements goes here -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal" onclick="reload_table();"><?= label("Close"); ?></button>
            </div>
        </div>
    </div>
</div>
<!-- /.Modal -->


<!-- Modal -->
<div class="modal fade" id="Addpayament" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="Addpayament"><?= label("AddPayements"); ?></h4>
            </div>
            <form>
                <div class="modal-body">
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
                    <div class="form-group Paid">
                        <label for="Paid"><?= label("Paid"); ?></label>
                        <input type="text" value="0" name="paid" onkeyup="total_chde(this.value)" class="form-control <?= strval($setting->keyboard) === '1' ? 'paidk' : '' ?>" id="Paid" placeholder="<?= label("Paid"); ?>">
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
                    <div class="clearfix"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                    <?= strval($setting->stripe) === '1' ? '<button type="button" class="btn btn-add stripe-btn" onclick="AddPayement(2)"><i class="fa fa-cc-stripe" aria-hidden="true"></i> ' . label("StripePayment") . '</button>' : ''; ?>
                    <button type="button" class="btn btn-add" onclick="AddPayement(1)"><?= label("Submit"); ?></button>
                </div>
                <?php echo form_close(); ?>
        </div>
    </div>
</div>


<script type="text/javascript">
    function total_chde(ddd) {


        var rtt = $('#balall').val();
        if (parseFloat(ddd) > parseFloat(rtt)) {
            $('#Paid').val('');
            document.getElementById("Paid").focus();
            alert("Enter Amount Not Greater Then Balance Amount...");

        }


    }
</script>
<!-- /.Modal -->