  <div class="container">

    <?php

    $rolr = $user->role;
    $kkar = $db->query("select * from permission_new where nname='" . $rolr . "'  ")->getRowArray();
    ?>

    <h3> <?= label('Sales'); ?> <?= label('Return'); ?>
    </h3>
    <hr>


    <?php $lxzmm = $db->query("select * from settings where id=1 ")->getRowArray(); ?>

    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
          <th><?= label('Date'); ?></th>
          <th><?= label('Return'); ?> <?= label('Id'); ?> </th>
          <th><?= label('FromSales'); ?> <?= label('Id'); ?> </th>
          <th><?= label('ToSales'); ?> <?= label('Id'); ?> </th>
          <th><?= label('Total'); ?> <?= label('Amount'); ?> </th>
          <th><?= label('Total'); ?> <?= label('item'); ?> </th>
          <th><?= label('Store'); ?></th>
          <th><?= label('Action'); ?></th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
  </div>




  <script type="text/javascript">
    $(document).ready(function() {

      $('#pddate').datepicker({
        todayHighlight: true,
        autoclose: true
      });


    });


    var save_method; //for save method string
    var table;
    $(document).ready(function() {
      table = $('#table').DataTable({

        "processing": true, //Feature control the processing indicator.
        "serverSide": true, //Feature control DataTables' server-side processing mode.
        "order": [], //Initial no order.
        // Load data for the table's content from an Ajax source
        "ajax": {
          "url": "<?php echo site_url('invoicesPur/ajaxListsales') ?>",
          "type": "POST"
        },

        //Set column definition initialisation properties.
        "columnDefs": [{
          "targets": [-1], //last column
          "orderable": false, //set not orderable
        }, ],
        "bInfo": false,
        // "fnRowCallback": function(nRow, aData, iDisplayIndex) {
        //     nRow.setAttribute('data-order',aData[4]);
        // }
      });
    });


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
          confirmButtonText: '<?= label("yesiam"); ?>',
          closeOnConfirm: false
        },
        function() {
          // ajax delete data to database
          $.ajax({
            url: "<?php echo site_url('invoicesPur/ajax_delete') ?>/" + id,
            type: "POST",
            dataType: "JSON",
            success: function(data) {
              //if success reload ajax table
              $('#modal_form').modal('hide');
              reload_table();
            },
            error: function(jqXHR, textStatus, errorThrown) {
              alert('Error adding / update data');
            }
          });
          swal('<?= label("Deleted"); ?>', '<?= label("Deletedmessage"); ?>', "success");
        });
    }

    function showTicket(id) {

      $.ajax({
        url: "<?php echo site_url('invoicesPur/ShowTicketsales') ?>/" + id,
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

    function showTicketnot(id) {

      $.ajax({
        url: "<?php echo site_url('invoices_pur/ShowTicketnot') ?>/" + id,
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
        url: "<?php echo site_url('invoices_pur/showInvoice') ?>/" + id,
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
        url: "<?php echo site_url('invoices_pur/Edit_Ajax') ?>/" + id,
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
        url: "<?php echo site_url('invoices_pur/Update_Sale') ?>/" + id,
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
        url: "<?php echo site_url('invoices_pur/payamentsrr') ?>/" + id,
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
      var ccnum = $('#CreditCardNum').val();
      var ccmonth = $('#CreditCardMonth').val();
      var ccyear = $('#CreditCardYear').val();
      var ccv = $('#CreditCardCODECV').val();
      var chkk = $('#ChequeNum').val();


      var pddate = $('#pddate').val();
      var bannk = $('#bannk').val();

      var paidMethod = $('#paymentMethod').find('option:selected').val();
      switch (paidMethod) {
        case '1':
          paidMethod += '~' + $('#CreditCardNum').val() + '~' + $('#CreditCardHold').val();
          break;
        case '2':
          paidMethod += '~' + $('#ChequeNum').val();
      }

      $.ajax({
        url: "<?php echo site_url('invoices_pur/Addpayamentrrr') ?>/" + type,
        type: "POST",
        data: {
          pddate: pddate,
          bannk: bannk,
          created_by: createdBy,
          paid: Paid,
          paidmethod: paidMethod,
          ccnum: ccnum,
          ccmonth: ccmonth,
          ccyear: ccyear,
          ccv: ccv,
          sale_id: saleID,
          chkk: chkk
        },
        success: function(data) {


          $('#payementsSection').load("<?php echo site_url('invoices_pur/payamentsrr') ?>/" + saleID);
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

    function deletepayementrrr(id) {
      $.ajax({
        url: "<?php echo site_url('invoices_pur/deletepayementrrr') ?>/" + id + "/" + saleID,
        type: "POST",
        success: function(data) {
          $('#payementsSection').load("<?php echo site_url('invoices_pur/payamentsrr') ?>/" + saleID);
        },
        error: function(jqXHR, textStatus, errorThrown) {
          alert("error");
        }
      });
    }
  </script>


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
      var mml = $('#warr').val();
      if (mml > 0 && countryId > 0) {
        var strURL = "<?php echo base_url(); ?>purchase/findssss?country=" + countryId + "&sss=" + mml;
        var req = getXMLHTTP();
        if (req) {
          req.onreadystatechange = function() {
            if (req.readyState == 4) {
              if (req.status == 200) {


                var data = req.responseText;
                $('#avalqqt').val(data);




              } else {
                alert("There was a problem while using XMLHTTP:\n" + req.statusText);
              }
            }
          }
          req.open("GET", strURL, true);
          req.send(null);
        }
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

              document.getElementById('statediv').innerHTML = req.responseText;
            } else {
              alert("There was a problem while using XMLHTTP:\n" + req.statusText);
            }
          }
        }
        req.open("GET", strURL, true);
        req.send(null);
      }
    }

    function ckkkr() {
      var mml = $('#avalqqt').val();
      if (mml > 0) {

        var nnkm = 0;

        $('input[name="srrtr[]"]').each(function() {
          var nnxx = $(this).val();
          nnkm = parseInt(nnkm) + parseInt(nnxx);
        });

        if (mml >= nnkm) {
          return true;
        } else {
          alert("Sorry Quantity Not Matching...");
          return false;

        }
      } else {
        alert("Sorry  Quantity Not Matching...");
        return false;

      }


    }

    function isNumberKey(evt) {
      var charCode = (evt.which) ? evt.which : evt.keyCode;
      if (charCode > 31 && (charCode < 48 || charCode > 57))
        return false;
      return true;
    }
  </script>

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
                <option value="2"><?= label("Cheque"); ?></option>
              </select>
            </div>
            <div class="form-group Paid">
              <label for="Paid"><?= label("Paid"); ?></label>
              <input type="text" value="0" name="paid" class="form-control <?= strval($setting->keyboard) === '1' ? 'paidk' : '' ?>" id="Paid" placeholder="<?= label("Paid"); ?>">
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
              <label for="ChequeNum"><?= label("Date"); ?></label>
              <input class="form-control" id="pddate" type="text" name="pddate" />
              <label for="ChequeNum"><?= label("ChequeNum"); ?></label>
              <input type="text" name="chequenum" class="form-control" id="ChequeNum" placeholder="<?= label("ChequeNum"); ?>">

              <label for="ChequeNum"><?= label("Bank"); ?></label>
              <input type="text" name="bannk" class="form-control" id="bannk" placeholder="<?= label("Bank"); ?>">

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

        </div>
      </div>
    </div>
  </div>



  <div class="modal fade" id="ticketnnn" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document" id="ticketModal" style="width:600px;">
      <div class="modal-content">

        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title" id="ticket"><?= label("StockTransfer"); ?></h4>
        </div>

        <form method="post" action="<?php echo base_url(); ?>purchase/stockadd">
          <div class="modal-body" id="modal-body">
            <div id="printSection">








              <div class="col-xs-12 nopadding">
                <div class="form-group">


                  <div class="col-xs-3 " style="margin-left:20px;">
                    <label><?= label("Warehouses"); ?></label>
                    <select style="width:150px;float: left;" required="required" class="form-control" id="warr" name="warr">
                      <option value="">Select</option>
                      <?php
                      $omaa = $db->query("select * from warehouses order by name asc ");
                      foreach (($omaa)->getResultArray() as $omaaf) { ?>

                        <option value="<?php echo $omaaf['id']; ?>"><?php echo $omaaf['name']; ?></option>

                      <?php } ?>
                    </select>
                  </div>



                  <div class="col-xs-3 " style="margin-left:20px;">
                    <label><?= label("Brand"); ?></label>
                    <select style="width:150px;float: left;" required="required" onchange="getState(this.value,this.id)" class="form-control" id="brnadd" name="brnadd">
                      <option value="">Select</option>
                      <?php
                      $kmk = $db->query("select * from brand order by name asc ")->getResult();
                      foreach ($kmk as $kmkf) { ?>
                        <option value="<?= $kmkf->id; ?>"><?= $kmkf->name; ?></option>
                      <?php } ?>
                    </select>
                  </div>


                  <div class="col-xs-3 " style="margin-left:20px;">
                    <label><?= label("Product"); ?></label>
                    <select required="required" style="width:150px;float: left;" class=" form-control" id="statediv" name="statediv" onchange="getdetals(this.value,this.id)">
                      <option value="0">Select Brand </option>
                    </select>
                  </div>





                </div>
              </div>






              <div class="col-xs-12 " style="margin-top:40px;">

                <div class="form-group">

                  <div class="col-xs-3 ">
                    <label><?= label("Available"); ?> Qty</label>
                  </div>

                  <div class="col-xs-3 " style="margin-left:20px;">
                    <input readonly="readonly" type="text" name="avalqqt" id="avalqqt" value="0" class="form-control">
                  </div>

                </div>
              </div>




              <div class="col-xs-12 " style="margin-top:20px;background-color:#333;color:#fff;">
                <div class="form-group">
                  <div class="col-xs-6 ">
                    <label><?= label("StoreName"); ?> </label>
                  </div>

                  <div class="col-xs-6 " style="margin-left:00px;">
                    Qty
                  </div>

                </div>
              </div>


              <div class="col-xs-12 " style="margin-top:10px;">

                <?php
                $mmm = $db->query("select * from stores order by name asc ")->getResultArray();
                foreach ($mmm as $mmmf) {
                ?>
                  <div class="form-group">
                    <div class="col-xs-6 ">
                      <label><?php echo $mmmf['name']; ?></label>

                    </div>


                    <div class="col-xs-6 " style="margin-top:10px;">

                      <input onkeypress='return isNumberKey(event)' class="form-control" type="text" name="srrtr[]" id="srrtr_<?php echo $mmmf['id']; ?>" value="0">
                    </div>
                  <?php } ?>

                  </div>
              </div>









            </div>
          </div>




          <div class="col-xs-12 " style="margin-top:10px;align-items: center;">

            <input onclick="return ckkkr();" style="width:30%;margin-left:180px;" class="form-control" type="submit" value="<?= label("Submit"); ?>">
          </div>

        </form>

        <div class="modal-footer">
          <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>


        </div>

      </div>
    </div>











    <div class="modal fade" id="ticketnot" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document" id="ticketModal" style="width:400px;">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title" id="ticket">Note</h4>
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
            <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket()"><?= label("print"); ?></button>
          </div>
        </div>
      </div>
    </div>

    <!-- /.Modal -->

    <!-- Modal invoice -->
    <div class="modal fade" id="invoice" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog modal-lg" role="document" id="invoiceModal">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title" id="invoice"><?= label("INVOICE"); ?></h4>
          </div>
          <div class="modal-body" id="modal-body">
            <div id="printSectionInvoice">
              <!-- Invoice goes here -->
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>
            <button type="button" class="btn btn-add hiddenpr" href="javascript:void(0)" onClick="pdfinvoice()">PDF</button>
            <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket()"><?= label("print"); ?></button>
          </div>
        </div>
      </div>
    </div>
    <!-- /.Modal -->

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

    <!-- /.Modal -->


    <!-- Modal -->

    <!-- /.Modal -->