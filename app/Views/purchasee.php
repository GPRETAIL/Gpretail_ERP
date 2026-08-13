  <div class="container">

      <?php

        $rolr = $user->role;
        $kkar = $db->query(("SELECT * from permission_new where nname='" . $rolr . "'  "))->getRowArray();
        ?>

      <h3 style="padding: 3px; background-color: <?= $setting->purchase_type == 1 ? '#7ec9ff' : ($setting->purchase_type == 2 ? 'lightgreen' : '') ?>">
          <?= label('Purchase'); ?>
          <?php if ($kkar['pua'] == 1) { ?>
              <!--<a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url(); ?>purchase/add"><?= label('Add Purchase'); ?></a>-->
          <?php } ?>

          <?php if ($kkar['stv'] == 1) { ?>
              <!-- <button style="float: right;margin-right:20px;" class="btn btn-primary btn-green" type="button" data-toggle="modal" data-target="#ticketnnn">
                  <?= label('StockTransfer'); ?> </button> -->
          <?php } ?>
      </h3>
      <hr>



      <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
          <thead class="thead-inverse">
              <tr>
                  <th><?= label('Date'); ?></th>
                  <th><?= label('Purchase No'); ?> </th>
                  <th><?= label('INV No'); ?> </th>
                  <?php $lxzmm = $db->query(("SELECT * from settings where id=1 "))->getRowArray();
                    ?>
                  <th><?= label('tax'); ?> <?= label('Amount'); ?></th>
                  <th><?= label('Total'); ?> <?= label('Amount'); ?> </th>
                  <th><?= label('Supplier'); ?></th>
                  <th><?= label('Store'); ?></th>
                  <th><?= label('Warehouses'); ?></th>
                  <th><?= label('Payments'); ?></th>
                  <th><?= label('Person'); ?></th>
                  <th><?= label('Action'); ?></th>
              </tr>
          </thead>
          <tbody>

              <?php
                $lxzmm = $db->query(("SELECT * from settings where id=1 "))->getRowArray();
                $rolr = $user->role;
                $kkar = $db->query(("SELECT * from permission_new where nname='" . $rolr . "'  "))->getRowArray();
                $where = '';
                if ($lxzmm['purchase_type'] != 2) {
                    $where = " WHERE ppurchase_type='" . $lxzmm['purchase_type'] . "' ";
                }
                $query = $db->query("SELECT *  FROM purchases  " . $where . "  ORDER BY id DESC LIMIT 0")->getResult();
                $list = $query;
                foreach ($list as $invoice) {
                    $lkl = $db->query(("SELECT * from suppliers where id='" . $invoice->supplier_id . "' "))->getRowArray();
                    $lklx = $db->query(("SELECT * from stores where id='" . $invoice->store_id . "' "))->getRowArray();
                    $lklxw = $db->query(("SELECT * from warehouses where id='" . $invoice->warehouse_id . "' "))->getRowArray();
                    $lklxwn = $db->query(("SELECT * from users where id='" . $invoice->created_by . "' "))->getRowArray();


                    $iipp = 0;
                    $olpay = $db->query("SELECT * FROM purchases WHERE id='" . $invoice->id . "' ")->getRowArray();
                    $oll = $db->query("SELECT * FROM payment_suplls WHERE purchaid='" . $invoice->id . "' ")->getResultArray();
                    foreach ($oll as $ollf) {
                        $iipp = $iipp + $ollf['amtpaid'];
                    }

                    $iippll = $olpay['total'] - $iipp;
                ?>

                  <tr role="row" class="odd">
                      <td><?php echo date("d-m-Y", strtotime($invoice->purdat)); ?></td>
                      <td><?php echo sprintf("%05d", $invoice->id); ?></td>
                      <td><?php echo  $invoice->invno; ?></td>
                      <td><?php echo floatval($invoice->cgst) * 2; ?></td>
                      <td><?php echo $invoice->total; ?></td>
                      <td><?php echo isset($lkl['name']) ? $lkl['name'] : ''; ?></td>
                      <td><?php echo isset($lklx['name']) ? $lklx['name'] : ''; ?></td>
                      <td><?php echo $lklxw['name'] ?? ''; ?></td>
                      <td>
                          <?php echo '<h6 style="margin: 0px;"><b>' . label("Total") . ':</b> Rs.' . number_format((float)$olpay['total'], $setting->decimals, '.', '') . ' <br><b>' . label("Paid") . ':</b> Rs.' . number_format((float)$iipp, $setting->decimals, '.', '') . '<br><b>' . label("Balance") . ':</b> Rs.' . number_format((float)$iippll, $setting->decimals, '.', '') . '</h6>' ?>
                      </td>
                      <td><?php echo isset($lklxwn['firstname']) ? $lklxwn['firstname'] : '' . ' ' . (isset($lklxwn['lastname']) ? $lklxwn['lastname'] : ''); ?></td>
                      <td>

                          <div class="btn-group">
                              <a class="btn btn-primary" href="javascript:void(0)" dropdown-toggle" data-toggle="dropdown"><i class="fa fa-cog fa-fw"></i> <?php echo  label("Action"); ?></a>
                              <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#"><span class="fa fa-caret-down" title="Toggle dropdown menu"></span></a>
                              <ul class="dropdown-menu">
                                  <li><a href="javascript:void(0)" onclick="showTicket(<?php echo $invoice->id; ?>)"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i><?php echo  label("View"); ?></a></li>

                                  <li><a href="javascript:void(0)" onclick="showTicketptint(<?php echo $invoice->id; ?>)"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i>Print</a></li>

                                  <li><a href="javascript:void(0)" onclick="payaments(<?php echo $invoice->id; ?>)"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> <?php echo  label("Payements"); ?></a></li>


                                  <?php

                                    if ($kkar['pue'] == 1) {
                                    ?>
                                      <li><a href="<?php echo base_url() . 'purchase/edit/' . $invoice->id; ?>"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i> <?php echo label("Edit"); ?></a></li>
                                  <?php

                                    }
                                    if ($kkar['pud'] == 1) {
                                    ?>
                                      <li><a href="javascript:void(0)" onclick="delete_invoice(<?php echo  $invoice->id; ?>)"><i class="fa fa-ticket fa-fw" aria-hidden="true"></i><?php echo  label("Delete"); ?></a></li>
                                  <?php
                                    }
                                    ?>


                              </ul>
                          </div>

                      </td>
                  </tr>
              <?php } ?>

          </tbody>
      </table>
  </div>




  <script>
      $(function() {
          const table = $('#Table').DataTable({
              processing: true,
              serverSide: true,
              responsive: true,
              searching: true,
              lengthMenu: [
                  [10, 25, 50, 100],
                  [10, 25, 50, 100]
              ],
              order: [
                  [1, 'desc']
              ], // default: ID desc
              ajax: {
                  url: "<?= base_url('purchase/getDataServerSide'); ?>",
                  type: "POST",
                  data: function(d) {
                      // You can add extra filters here if you need in the future
                  }
              },
              // If you want HTML in column 8 + 10 (we do), tell DataTables not to escape:
              createdRow: function(row, data, dataIndex) {
                  // data[8] and data[10] contain HTML built server-side
                  $('td', row).eq(8).html(data[8]);
                  $('td', row).eq(10).html(data[10]);
              }
          });

          // Optional: redraw on custom filters change in the future
          // $('#filterX').on('change', () => table.draw());
      });
  </script>

  <script>
      <?php if (isset($_GET['purid'])): ?>
          $(function() {
              showTicketptint(<?php echo $_GET['purid'] ?>);
          });
      <?php endif; ?>
  </script>


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
                  "url": "<?php echo site_url('invoicesPur/ajax_list') ?>",
                  "type": "POST"
              },

              //Set column definition initialisation properties.
              "columnDefs": [{
                  "targets": [1], //last column
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
                  title: '<?= label("Are you sure?"); ?>',
                  text: '<?= label("You will not be able to recover this Data later!"); ?>',
                  type: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#DD6B55",
                  confirmButtonText: '<?= label("Yes"); ?>',
                  closeOnConfirm: false
              },
              function() {
                  // ajax delete data to database
                  $.ajax({
                      url: "<?php echo site_url('invoicesPur/ajaxDelete') ?>/" + id,
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
                  swal('<?= label("Deleted"); ?>', '<?= label("Deletedmessage"); ?>', "success");
              });
      }


      function showTicket(id) {
          $.ajax({
              url: "<?= site_url('invoicesPur/ShowTicket') ?>/" + id,
              type: "POST",
              success: function(data) {
                  $('#printSection').html(data);
                  $('#ticket').modal('show');
              },
              error: function(jqXHR, textStatus, errorThrown) {
                  alert("Error loading ticket: " + textStatus);
              }
          });
      }

      function showTicketptint(id) {

          $.ajax({
              url: "<?php echo site_url('invoicesPur/printstocts') ?>/" + id,
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
              url: "<?php echo site_url('invoicesPur/ShowTicketnot') ?>/" + id,
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
              url: "<?php echo site_url('invoicesPur/showInvoice') ?>/" + id,
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
              url: "<?php echo site_url('invoicesPur/Edit_Ajax') ?>/" + id,
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
              url: "<?php echo site_url('invoicesPur/Update_Sale') ?>/" + id,
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
              url: "<?php echo site_url('invoicesPur/payamentsrr') ?>/" + id,
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
              url: "<?php echo site_url('invoicesPur/Addpayamentrrr') ?>/" + type,
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


                  $('#payementsSection').load("<?php echo site_url('invoicesPur/payamentsrr') ?>/" + saleID);
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
              url: "<?php echo site_url('invoicesPur/deletepayementrrr') ?>/" + id + "/" + saleID,
              type: "POST",
              success: function(data) {
                  $('#payementsSection').load("<?php echo site_url('invoicesPur/payamentsrr') ?>/" + saleID);
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
      <div class="modal-dialog modal-lg" role="document" id="payementsModal">
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
                  <button type="button" class="btn btn-add hiddenpr" href="javascript:void(0)" onClick="pdfreceipt()">PDF</button>
                  <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket()"><?= label("print"); ?></button>
              </div>
          </div>
      </div>
  </div>



  <div class="modal fade" id="ticketnnn" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">

      <div class="modal-dialog" role="document" id="ticketModal" style="width:80%;">
          <div class="modal-content">

              <div class="modal-header">
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                  <h4 class="modal-title" id="ticket"><?= label("StockTransfer"); ?></h4>
              </div>







              <?php
                $attributes = array('id' => 'addformkk');
                echo form_open_multipart('purchase/add_mul', $attributes);
                ?>



              <div class="modal-body">

                  <div class="col-sm-12">
                      <div class="col-sm-2">
                          <div class="form-group">
                              <label for="Category"><?= label("Store"); ?></label>
                              <select class="form-control" name="store_1" id="store_1">
                                  <?php
                                    $mkxcc = $db->query("SELECT * FROM   stores ORDER BY name ASC LIMIT 100 ");
                                    $mkxccf = ($mkxcc->getResult());
                                    foreach ($mkxccf as $row) {
                                    ?>
                                      <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                                  <?php
                                    } ?>
                              </select>
                          </div>
                      </div>
                  </div>







                  <div class="panel-body" style="padding: 1px;">

                      <div class="col-sm-2">
                          <div class="form-group">


                              <input type="hidden" name="countid_exp" id="countid_exp" value="1">
                              <label for="Category"><?= label("Warehouses"); ?></label>
                              <select class="form-control" name="warehouse[]" id="warehouse_1">
                                  <?php
                                    $mkxcc = $db->query("select * from   warehouses order by name asc   ");
                                    $mkxccf = ($mkxcc->getResult());
                                    foreach ($mkxccf as $row) {
                                    ?>
                                      <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                                  <?php
                                    } ?>
                              </select>
                          </div>
                      </div>





                      <div class="col-sm-2">
                          <div class="form-group">
                              <label for="Category"><?= label("Brand"); ?></label>
                              <select class="form-control" name="brand[]" id="brand_1" onchange="ger_subcatmmkk(this.value,this.id,1);">
                                  <option value="0">select</option>
                                  <?php
                                    $mkxcc = $db->query("select * from   brand order by name   ");
                                    $mkxccf = ($mkxcc->getResult());
                                    foreach ($mkxccf as $row) {
                                    ?>
                                      <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                                  <?php
                                    } ?>
                              </select>
                          </div>
                      </div>




                      <div class="col-sm-3">
                          <div class="form-group">
                              <label for="Category"><?= label("Product"); ?></label>
                              <select class="form-control" name="dishname[]" id="dishname_1" onchange="alqtcheck(this.value,this.id,1);">
                                  <option value="0">Select</option>
                              </select>
                          </div>
                      </div>

                      <div class="col-sm-2">
                          <div class="form-group">
                              <label for="Category"> Avl QTY</label>

                              <input type="text" readonly name="avlqty[]" class="form-control" id="avlqty_1" />

                          </div>
                      </div>

                      <div class="col-sm-2">
                          <div class="form-group">
                              <label for="Amount"><?= label("Transferqt"); ?></label>
                              <input type="text" step="any" name="transty[]" class="form-control" id="transty_1" />
                          </div>
                      </div>


                  </div>

                  <div id="education_fields_exp">
                  </div>


                  <div class="panel-body" style="padding:1px;">
                      <div class="col-sm-10">
                          &nbsp;
                      </div>
                      <div class="col-sm-1 ">
                          <button id="addMoreRows_exp" style="margin: 0px -29px 0px 0px;" class="btn btn-success" type="button" onclick="education_fields_exp();"> <span class="glyphicon glyphicon-plus" aria-hidden="true"></span> </button>
                      </div>
                  </div>







              </div>
              <div class="modal-footer">
                  <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                  <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
              </div>
              <?php echo form_close(); ?>






              <div class="modal-footer">
                  <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>


              </div>

          </div>
      </div>



      <script>
          document.onkeydown = KeyCheck;

          function KeyCheck(e) {
              console.log(e.keyCode);
              var KeyID = (window.event) ? event.keyCode : e.keyCode;
              if (e.keyCode == 113 || e.keyCode == 115 || e.keyCode == 119) {
                  $.ajax({
                      url: "<?php echo site_url('purchase/updatepurchaetype'); ?>",
                      type: "POST",
                      data: {
                          KeyID: KeyID
                      },
                      success: function(data) {
                          window.location.href = "<?php echo site_url(); ?>purchase";
                      },
                      error: function(jqXHR, textStatus, errorThrown) {
                          alert("error");
                      }
                  });
              }
          }
      </script>









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



      <script>
          $(document).ready(function() {
              $(document).on("click", "#addMoreRows_exp", function() { //alert("ddssss");
                  var inc = 1;
                  var vl = $('#countid_exp').val();
                  var vl1 = (parseFloat(vl) + parseFloat(inc));
                  $('#countid_exp').val(vl1);
                  var datastring = 'countid_exp=' + vl1;

                  $.ajax({
                      type: "POST",
                      url: "<?php echo base_url(); ?>purchase/addrow_ex",
                      data: datastring,
                      cache: false,
                      success: function(result) {
                          $('#education_fields_exp').append(result);
                      }
                  });

              });
          });
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


          function ger_subcatmmkk(countryId, jjj, tt) {
              var idxx = jjj;
              var items = idxx.split('_');




              var jj = items[1];
              var strURL = "<?php echo base_url(); ?>purchase/get_subcat_exp?country=" + countryId;
              var req = getXMLHTTP();
              if (req) {
                  req.onreadystatechange = function() {
                      if (req.readyState == 4) {
                          if (req.status == 200) {

                              document.getElementById('dishname_' + tt).innerHTML = req.responseText;
                          } else {
                              alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                          }
                      }
                  }
                  req.open("GET", strURL, true);
                  req.send(null);
              }
          }


          function alqtcheck(countryId, jjj, tt) {

              /*var vl=$('#countid_exp').val();

              for(var tk=0;tk<vl;tk++)
              {

              }*/

              var idxx = jjj;
              var items = idxx.split('_');
              var jj = items[1];

              var cmp = 0;
              var ckdish = $('#dishname_' + jj).val();

              var inps = document.getElementsByName('dishname[]');
              for (var i = 0; i < script inps.length; i++) {
                  var inp = inps[i];

                  if (ckdish == inp.value) {
                      cmp = cmp + 1;
                  }
                  if (cmp > 1) {
                      $('#avlqty_' + jj).val(0);
                      return false;

                  }
              }



              var warr = $('#warehouse_' + jj).val();
              var strURL = "<?php echo base_url(); ?>purchase/get_subcatqtt?country=" + countryId + "&warr=" + warr;

          }