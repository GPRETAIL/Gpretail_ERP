<!-- Include SweetAlert -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<div class="container">
  <?php
  // Fix: Use object property access for $user
  $rolr  = $user->role ?? '';
  $kkar  = $permission ?? [];
  $ikkxm = $settings ?? [];
  ?>

  <h3><?= label("Customers"); ?>
    <?php if (!empty($kkar['cua'])): ?>
      <button style="float: right;" type="button" class="btn btn-primary btn-green" data-toggle="modal" data-target="#AddCustomer">
        <?= label("AddCustomer"); ?>
      </button>
    <?php endif; ?>
  </h3>
  <hr>

  <div class="row" style="margin-top:20px;">
    <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead>
        <tr>
          <th>SN</th>
          <th><?= label("ID"); ?></th>
          <th><?= label("CustomerName"); ?></th>
          <th><?= label("CustomerPhone"); ?></th>
          <th class="hidden-xs"><?= label("CustomerEmail"); ?></th>
          <th class="hidden-xs"><?= label("CustomerDiscount"); ?></th>
          <th class="hidden-xs"><?= label("Point"); ?></th>
          <th class="hidden-xs"><?= label("CreatedAt"); ?></th>
          <th><?= label("Action"); ?></th>
        </tr>
      </thead>
      <tbody>
        <?php
        $sn = 1;
        foreach ($customers as $customer): ?>
          <tr>
            <td><?= $sn++; ?></td>
            <td><?= $customer->id; ?></td>
            <td><?= ucfirst($customer->name); ?></td>
            <td><?= $customer->phone; ?></td>
            <td class="hidden-xs"><?= $customer->email; ?></td>
            <td class="hidden-xs"><?= $customer->discount; ?></td>
            <td class="hidden-xs"><?= $customer->tot_creaditpoint; ?></td>
            <td class="hidden-xs"><?= date("d-m-Y H:i:s", strtotime($customer->created_at)); ?></td>
            <td>
              <div class="btn-group">
                <?php if (!empty($kkar['cud'])): ?>
                  <a class="btn btn-danger" href="javascript:void(0)" onclick="confirmDelete(<?= $customer->id; ?>)">
                    <i class="fa fa-trash"></i>
                  </a>
                <?php endif; ?>
                <?php if (!empty($kkar['cue']) && $ikkxm['ct_mgt'] == 0): ?>
                  <a class="btn btn-info" href="customers/edit/<?= $customer->id; ?>">
                    <i class="fa fa-pencil"></i>
                  </a>
                <?php endif; ?>
                <?php if (!empty($kkar['cue']) && $ikkxm['ct_mgt'] == 1): ?>
                  <a class="btn btn-primary" href="customers/viewcustomer/<?= $customer->id; ?>?tab=setting">
                    <i class="fa fa-eye"></i>
                  </a>
                <?php endif; ?>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<script>
  function confirmDelete(customerId) {
    Swal.fire({
      title: '<div style="background: #2c3e50; color: #fff; padding: 12px; border-radius: 6px 6px 0 0; font-size: 18px;">Delete Customer</div>',
      html: '<p style="margin: 20px 0; font-size: 16px;">Do you really want to delete this customer?</p>',
      showCancelButton: true,
      confirmButtonColor: "#E74C3C",
      cancelButtonColor: "#BDBDBD",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      customClass: {
        popup: 'custom-popup',
        actions: 'custom-actions',
        confirmButton: 'custom-confirm',
        cancelButton: 'custom-cancel'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = "customers/delete/" + customerId;
      }
    });
  }
</script>

<style>
  .swal2-popup.custom-popup {
    border-radius: 6px;
    text-align: center;
    width: 420px;
    padding: 0;
    overflow: hidden;
  }

  .swal2-title {
    display: none !important;
  }

  .swal2-html-container {
    padding: 20px;
  }

  .swal2-actions.custom-actions {
    padding: 15px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .swal2-confirm.custom-confirm {
    background-color: #E74C3C !important;
    border-radius: 4px;
    font-size: 14px;
    padding: 8px 18px;
  }

  .swal2-cancel.custom-cancel {
    background-color: #BDBDBD !important;
    color: #000 !important;
    border-radius: 4px;
    font-size: 14px;
    padding: 8px 18px;
  }
</style>



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


          <div class="col-xs-6">
            <label for="CustomerName"><?= label("CustomerName"); ?></label>
            <input type="text" name="name" maxlength="50" Required class="form-control" id="CustomerName" placeholder="<?= label("CustomerName"); ?>">
          </div>


          <div class="form-group">
            <div class="col-xs-6">
              <label for="CustomerPhone"><?= label("CustomerPhone"); ?></label>
              <input type="text" name="phone" maxlength="30" class="form-control" id="CustomerPhone" placeholder="<?= label("CustomerPhone"); ?>">
            </div>
            <div class="col-xs-6">
              <label for="CustomerPhone"><?= label("GST"); ?></label>
              <input type="text" name="gstno" maxlength="30" class="form-control" id="gstno" placeholder="GST">
            </div>
          </div>


          <div class="form-group">
            <div class="col-xs-6">
              <label for="CustomerEmail"><?= label("CustomerEmail"); ?></label>
              <input type="email" maxlength="50" name="email" class="form-control" id="CustomerEmail" placeholder="<?= label("CustomerEmail"); ?>">
            </div>
            <div class="col-xs-6">
              <label for="CustomerDiscount"><?= label("CustomerDiscount"); ?> (in %)</label>
              <input type="text" maxlength="2" name="discount" class="form-control" id="CustomerDiscount" placeholder="<?= label("CustomerDiscount"); ?>">
            </div>
          </div>


          <?php
          $mkk = $db->query("select birth_anni_modul,id from settings where id=1")->getRowArray();
          if ($mkk['birth_anni_modul'] == 1) {
          ?>


            <div class="form-group">

              <div class="col-xs-6">
                <label for="CustomerEmail"><?= label("Birthday"); ?></label>

                <input type="text" maxlength="30" required="required" value="<?php echo date("d-m-Y"); ?>" name="birthday_date" class="form-control" id="birthday_date" placeholder="Date">

              </div>
              <div class="col-xs-6">
                <label for="CustomerDiscount"><?= label("Anniversary"); ?></label>
                <input type="text" maxlength="30" required="required" value="<?php echo date("d-m-Y"); ?>" name="anniversary_date" class="form-control" id="anniversary_date" placeholder="Date">
              </div>

            </div>
            <script type="text/javascript">
              $(document).ready(function() {
                $('#birthday_date').datepicker({
                  todayHighlight: true,
                  autoclose: true
                });
              });

              $(document).ready(function() {
                $('#anniversary_date').datepicker({
                  todayHighlight: true,
                  autoclose: true
                });
              });
            </script>
          <?php } else {

          ?>


            <input type="hidden" maxlength="30" value="<?php echo date("d-m-Y"); ?>" name="birthday_date" class="form-control" id="birthday_date" placeholder="Date">

            <input type="hidden" maxlength="30" value="<?php echo date("d-m-Y"); ?>" name="anniversary_date" class="form-control" id="anniversary_date" placeholder="Date">

          <?php  } ?>


          <div class="form-group">
            <div class="col-xs-6">
              <label for="CustomerEmail"><?= label("State"); ?></label>

              <select class="form-control" name="custstate" id="custstate">
                <option value=""> <?= label("Select"); ?> <?= label("State"); ?></option>
                <?php
                $stty = $db->query("select * from state where CountryID=1 order by StateName asc ");
                foreach ($stty->getResultArray() as $sttyf) {
                ?>
                  <option <?php if ($setting->mystate == $sttyf['StateID']) { ?> selected="selected" <?php  } ?> value="<?php echo $sttyf['StateID']; ?>"><?php echo $sttyf['StateName']; ?></option>
                <?php
                }
                ?>

              </select>

            </div>
            <div class="col-xs-6">
              <label for="CustomerEmail"><?= label("Customer"); ?> <?= label("Type"); ?></label>
              <select class="form-control" name="custtype" id="custtype">
                <option value="1">Retail</option>
                <option value="2">Wholesale </option>
              </select>

            </div>
          </div>

          <div class="col-xs-6">

            <label for="CustomerDiscount"><?= label("Credit Days"); ?></label>
            <input type="text" maxlength="3" name="creddate" class="form-control" id="creddate" placeholder="<?= label("Credit Days"); ?>">

          </div>

          <div class="form-group">
            <div class="col-xs-6">
              <label for="CustomerDiscount">Billing <?= label("Adresse"); ?></label>
              <textarea name="customeraddress" class="form-control" id="customeraddress"></textarea>
            </div>
            <div class="col-xs-6">

              <label for="CustomerDiscount"><?= label("Shipping Address"); ?></label>
              <textarea name="shppingad" class="form-control" id="shppingad"></textarea>
            </div>

          </div>



        </div>
        <div class="modal-footer">

          <button type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label("Submit"); ?></button>

          <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label("Close"); ?></button>

        </div>
        <?php echo form_close(); ?>
      </div>
    </div>
  </div>

  <style type="text/css">
    .modal-footer {
      border-top: 0px solid #e5e5e5;
    }
  </style>
  <!-- /.Modal -->