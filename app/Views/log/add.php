<!-- app/Views/log/add.php -->

<div class="container">
    <h3>Add New Category</h3>
    <hr>

    <!-- Form for adding a new category -->
    <form action="<?= base_url('log/add') ?>" method="post">
        <div class="form-group">
            <label for="CategoryName">Category Name</label>
            <input type="text" name="CategoryName" id="CategoryName" class="form-control" placeholder="Enter Category Name" required>
        </div>
        <button type="submit" class="btn btn-primary">Submit</button>
    </form>
</div>
