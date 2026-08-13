<meta name="viewport" content="width=device-width, initial-scale=1">

<div class="container">
  <?php
    $rolr = $user->role;
    $kkar = $db->query("SELECT * FROM permission_new WHERE nname='" . $rolr . "'")->getRowArray();
  ?>

  <!-- Header with Action Button -->
  <div class="d-flex justify-content-between align-items-center flex-wrap">
    <h3 class="mb-0"><?= label("Brand"); ?></h3>
    <?php if (!empty($kkar['bra'])): ?>
      <button class="btn btn-primary btn-green mt-2 mt-md-0" type="button" data-toggle="modal" data-target="#Addcategory">
        <?= label("Add Brand"); ?>
      </button>
    <?php endif; ?>
  </div>
  <hr>

  <!-- Responsive Table -->
  <div class="row mt-3">
    <div class="col-12">
      <div class="table-responsive">
        <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
          <thead>
            <tr>
              <th style="width:40px;">SN</th>
              <th style="width:60px;"><?= label("Brand") . " " . label("ID"); ?></th>
              <th><?= label("Brand") . " " . label("Name"); ?></th>
              <th><?= label("CreatedAt"); ?></th>
              <th><?= label("Action"); ?></th>
            </tr>
          </thead>
          <tbody>
            <?php $sn = 1; foreach ($brands as $brand): ?>
              <tr>
                <td><?= $sn++; ?></td>
                <td><?= esc($brand['id']); ?></td>
                <td><?= esc($brand['name']); ?></td>
                <td><?= date("d-m-Y H:i:s", strtotime($brand['created_at'])); ?></td>
                <td>
                  <div class="btn-group" role="group">
                    <?php if (!empty($kkar['brd'])): ?>
                      <button class="btn btn-danger btn-sm delete-btn" data-id="<?= $brand['id']; ?>">
                        <i class="fa fa-times"></i>
                      </button>
                    <?php endif; ?>
                    <?php if (!empty($kkar['bre'])): ?>
                      <a class="btn btn-info btn-sm" href="<?= base_url('brand/edit/' . $brand['id']); ?>" data-toggle="tooltip" title="<?= label('Edit'); ?>">
                        <i class="fa fa-pencil"></i>
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
  </div>
</div>

<!-- Add Brand Modal -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="<?= base_url('brand/add') ?>" method="post" enctype="multipart/form-data">
        <div class="modal-header">
          <h4 class="modal-title"><?= label("Add"); ?></h4>
          <button type="button" class="close" data-dismiss="modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="CategoryName"><?= label("Brand Name"); ?></label>
            <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName" placeholder="<?= label("Brand Name"); ?>" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal"><?= label("Close"); ?></button>
          <button type="submit" class="btn btn-primary"><?= label("Submit"); ?></button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteModal" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h4 class="modal-title"><?= label("Are you sure?"); ?></h4>
        <button type="button" class="close" data-dismiss="modal">&times;</button>
      </div>
      <div class="modal-body">
        <p><?= label("Do you really want to delete this brand?"); ?></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal"><?= label("No"); ?></button>
        <a href="#" id="confirmDelete" class="btn btn-danger"><?= label("Yes, Delete"); ?></a>
      </div>
    </div>
  </div>
</div>

<!-- JS for Delete Button -->
<script>
document.addEventListener("DOMContentLoaded", function() {
  const deleteBtns = document.querySelectorAll(".delete-btn");
  const confirmDeleteBtn = document.getElementById("confirmDelete");

  deleteBtns.forEach(button => {
    button.addEventListener("click", function() {
      const brandId = this.getAttribute("data-id");
      confirmDeleteBtn.setAttribute("href", "<?= base_url('brand/delete/') ?>" + brandId);
      $("#deleteModal").modal("show");
    });
  });
});
</script>

<!-- Optional Responsive Styling for Small Screens -->
<style>
@media (max-width: 576px) {
  .btn-group .btn {
    display: block;
    width: 100%;
    margin-bottom: 5px;
  }
}
</style>
