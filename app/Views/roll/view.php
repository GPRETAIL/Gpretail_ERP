<!-- Page Content -->
<div class="container">
  <?php
  $rolr = $user->role;
    //   $kkar = $db->query("SELECT * FROM permission_new WHERE nname='" . $rolr . "' ")->row_array();
    $kkar = $db->query("SELECT * FROM permission_new WHERE nname = ?", [$rolr])->getRowArray();
  ?>

  <h3><?= label("Role"); ?> 
    <?php if ($kkar['rolesa'] == 1) { ?>
      <button style="float: right;" class="btn btn-primary btn-green" type="button" data-toggle="modal" data-target="#Addcategory">
        <?= label("Add Roles"); ?>
      </button>
    <?php } ?>
  </h3>
  <hr>

  <div class="row" style="margin-top:20px;">
    <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead>
        <tr>
          <th>SN</th>
          <th><?= label("Role ID"); ?></th>
          <th><?= label("Role Name"); ?></th>
          <th><?= label("Action"); ?></th>
        </tr>
      </thead>
      <tbody>
        <?php
        $categories = $db->query("SELECT * FROM rolls ORDER BY r_name ASC")->getResult();
        $sn = 1;
        foreach ($categories as $category) {
        ?>
          <tr>
            <td><?= $sn++; ?></td>
            <td><?= $category->r_id; ?></td>
            <td><?= $category->r_name; ?></td>
            <td>
              <?php if ($category->r_id != 1 && $kkar['rolese'] == 1) { ?>
                <a class="btn btn-info" href="roll/edit/<?= $category->r_id; ?>" data-toggle="tooltip" title="<?= label('Edit'); ?>" style="background-color:#36A2EB; color:white; border:none;">
                  <i class="fa fa-pencil"></i>
                </a>
              <?php } ?>
              <?php if ($category->r_id > 2 && $kkar['rolese'] == 1) { ?>
                <a class="btn btn-danger" href="#" onclick="role_delete(<?= $category->r_id; ?>)" data-toggle="tooltip" title="<?= label('Delete'); ?>" style="background-color:#E74C3C; color:white; border:none;">
                  <i class="fa fa-trash"></i>
                </a>
              <?php } ?>
            </td>
          </tr>
        <?php } ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Add Role Modal -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal">&times;</button>
        <h4 class="modal-title"><?= label("Add Role"); ?></h4>
      </div>
      <?php echo form_open_multipart('roll/add'); ?>
      <div class="modal-body">
        <div class="form-group">
          <label><?= label("Role Name"); ?></label>
          <input type="text" name="CategoryName" class="form-control" required>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        <button type="submit" class="btn btn-primary">Submit</button>
      </div>
      <?php echo form_close(); ?>
    </div>
  </div>
</div>

<!-- Delete Confirmation Modal -->
<div id="deleteModal" class="modal fade" role="dialog">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header bg-primary text-white">
        <h4 class="modal-title">Are you sure?</h4>
        <button type="button" class="close" data-dismiss="modal">&times;</button>
      </div>
      <div class="modal-body">
        <p>Do you really want to delete this Role?</p>
        <p class="text-danger"><strong>This action cannot be undone!</strong></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <a id="confirmDelete" class="btn btn-danger">Yes, Delete</a>
      </div>
    </div>
  </div>
</div>

<script>
  function role_delete(id) {
    $("#confirmDelete").attr("href", "<?= base_url('roll/role_delete/') ?>" + id);
    $("#deleteModal").modal("show");
  }
</script>
