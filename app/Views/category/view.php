<!-- Ensure mobile responsiveness -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- Page Content -->
<div class="container my-4">
  <?php 
    $rolr = $user->role;
    $kkar = $db->query("SELECT * FROM permission_new WHERE nname = '".$rolr."'")->getRowArray();
  ?>

  <!-- Page Title and Add Button -->
  <div class="d-flex justify-content-between align-items-center flex-wrap mb-3">
    <h3 class="mb-2"><?= label("Categories"); ?></h3>
    <?php if($kkar['caaa'] == 1): ?>
      <button class="btn btn-primary btn-green mb-2" type="button" data-toggle="modal" data-target="#Addcategory">
        <?= label("AddCategory"); ?>
      </button>
    <?php endif; ?>
  </div>
  <hr>

  <!-- Responsive Table -->
  <div class="row mt-3">
    <div class="col-12">
      <div class="table-responsive">
        <table id="Table" class="table table-striped table-bordered">
          <thead class="thead-light sticky-header">
            <tr>
              <th style="width:40px;">SN</th>
              <th style="width:80px;"><?= label("Category") . ' ' . label("Id"); ?></th>
              <th><?= label("CategoryName"); ?></th>
              <th><?= label("CreatedAt"); ?></th>
              <th><?= label("Action"); ?></th>
            </tr>
          </thead>
          <tbody>
            <?php $sn = 1; foreach ($categories as $category): ?>
              <tr>
                <td><?= $sn++; ?></td>
                <td><?= esc($category->id); ?></td>
                <td><?= esc($category->name); ?></td>
                <td><?= date("d-m-Y H:i:s", strtotime($category->created_at)); ?></td>
                <td>
                  <div class="btn-group" role="group">
                    <?php if ($kkar['caad'] == 1 && $category->id > 12): ?>
                      <button class="btn btn-danger btn-sm delete-btn" data-id="<?= $category->id; ?>">
                        <i class="fa fa-times"></i>
                      </button>
                    <?php endif; ?>
                    <?php if ($kkar['caae'] == 1): ?>
                      <a class="btn btn-info btn-sm" href="categories/edit/<?= $category->id; ?>" title="<?= label('Edit'); ?>">
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
<!-- /.container -->

<!-- Modal: Add Category -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
      <?= form_open_multipart('categories/add'); ?>
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title"><?= label("AddCategory"); ?></h5>
          <button type="button" class="close text-white" data-dismiss="modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="CategoryName"><?= label("CategoryName"); ?></label>
            <input type="text" maxlength="50" name="name" class="form-control" id="CategoryName" placeholder="<?= label("CategoryName"); ?>" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal"><?= label("Close"); ?></button>
          <button type="submit" class="btn btn-success"><?= label("Submit"); ?></button>
        </div>
      <?= form_close(); ?>
    </div>
  </div>
</div>

<!-- Modal: Delete Confirmation -->
<div class="modal fade" id="deleteModal" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
      <div class="modal-header bg-danger text-white">
        <h5 class="modal-title"><?= label("Are you sure?"); ?></h5>
        <button type="button" class="close text-white" data-dismiss="modal">&times;</button>
      </div>
      <div class="modal-body">
        <p><?= label("Do you really want to delete this category?"); ?></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal"><?= label("Cancel"); ?></button>
        <a href="#" id="confirmDelete" class="btn btn-danger"><?= label("Yes, Delete"); ?></a>
      </div>
    </div>
  </div>
</div>

<!-- Script: Handle Delete -->
<script>
  document.addEventListener("DOMContentLoaded", function () {
    const deleteBtns = document.querySelectorAll(".delete-btn");
    const confirmDeleteBtn = document.getElementById("confirmDelete");

    deleteBtns.forEach(button => {
      button.addEventListener("click", function () {
        const categoryId = this.getAttribute("data-id");
        confirmDeleteBtn.setAttribute("href", "categories/delete/" + categoryId);
        $("#deleteModal").modal("show");
      });
    });
  });
</script>

<!-- Responsive & UI Styling -->
<style>
  /* Sticky header for table */
  .sticky-header {
    position: sticky;
    top: 0;
    background-color: #f8f9fa;
    z-index: 10;
  }

  /* Responsive button stack on smaller devices */
  @media (max-width: 576px) {
    .btn-group .btn {
      width: 100%;
      margin-bottom: 5px;
    }
  }

  /* Remove extra spacing in button groups */
  .btn-group .btn:last-child {
    margin-right: 0;
  }
</style>
