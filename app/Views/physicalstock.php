  <div class="container">
      <?php
        $rolr = $user->role;
        $kkar = $db->query("select * from permission_new where nname='" . $rolr . "'  ")->getRowArray();
        ?>


      <h3> Physical Stock <?php if ($kkar['pra'] == 1) { ?><a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url(); ?>PhysicalStock/add"><?= label('Add'); ?></a><?php } ?>

      </h3>
      <hr>



      <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
          <thead class="thead-inverse">
              <tr>
                  <th><?= label('Date'); ?></th>
                  <th><?= label('Voucher'); ?> <?= label('Number'); ?></th>
                  <th><?= label('TotalItems'); ?> </th>
                  <th><?= label('Action'); ?></th>
                  <th><?= label('Person'); ?> </th>
                  <th><?= label('Action'); ?></th>
              </tr>
          </thead>
          <tbody>
          </tbody>
      </table>
  </div>



  <!-- /.Modal -->


  <script type="text/javascript">
      var save_method; //for save method string
      var table;
      $(document).ready(function() {
          table = $('#table').DataTable({




              // Load data for the table's content from an Ajax source
              "ajax": {
                  "url": "<?php echo site_url('invoicesPur/ajaxListPhysical') ?>",
                  "type": "POST"
              },
              "order": [
                  [1, "desc"]
              ],




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
                      url: "<?php echo site_url('invoices_pur/ajax_delete') ?>/" + id,
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

      function delete_physical_stock(id) {
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
                  window.location.href = '<?= base_url("invoicesPur/deletePhysicalStock/") ?>' + id;
              });
      }

      function showTicket(id) {

          $.ajax({
              url: "<?php echo site_url('invoices_pur/ShowTicket') ?>/" + id,
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



      function showTicket_phycal(id) {

          $.ajax({
              url: "<?php echo site_url('invoicesPur/showTicketPhysi') ?>/" + id,
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
              url: "<?php echo site_url('invoices_pur/payaments') ?>/" + id,
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
          var paidMethod = $('#paymentMethod').find('option:selected').val();
          switch (paidMethod) {
              case '1':
                  paidMethod += '~' + $('#CreditCardNum').val() + '~' + $('#CreditCardHold').val();
                  break;
              case '2':
                  paidMethod += '~' + $('#ChequeNum').val();
          }

          $.ajax({
              url: "<?php echo site_url('invoices_pur/Addpayament') ?>/" + type,
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
              url: "<?php echo site_url('invoices_pur/deletepayement') ?>/" + id + "/" + saleID,
              type: "POST",
              success: function(data) {
                  $('#payementsSection').load("<?php echo site_url('invoices_pur/payaments') ?>/" + saleID);
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

  <!-- Modal ticket -->
  <div class="modal fade" id="ticket" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document" id="ticketModal" style="width:600px;">
          <div class="modal-content">
              <div class="modal-header">
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                  <h4 class="modal-title" id="ticket"><?= label("ListOfItems"); ?> </h4>
              </div>

              <div id="printSection">
                  <!-- Ticket goes here -->
                  <center>
                      <h1 style="color:#34495E"><?= label("empty"); ?></h1>
                  </center>
              </div>

              <div class="modal-footer">
                  <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>


              </div>
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
  <!-- /.Modal -->