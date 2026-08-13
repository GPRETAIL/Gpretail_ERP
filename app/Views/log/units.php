<!-- app/Views/log/units.php -->

<div class="container">
    <h3>Unit List</h3>
    <hr>

    <form action="<?= base_url('log/units') ?>" method="post">
        <div class="form-group">
            <label for="comm">Unit Name</label>
            <input type="text" name="comm" id="comm" class="form-control" placeholder="Enter Unit Name" required>
        </div>

        <div class="form-group">
            <label for="upp">Action</label>
            <select name="upp" id="upp" class="form-control" required>
                <option value="Update">Update</option>
                <option value="Xml">Export as XML</option>
            </select>
        </div>

        <button type="submit" class="btn btn-primary">Submit</button>
    </form>

    <hr>

    <div class="row" style="margin-top:20px;">
        <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Unit Name</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($categories as $category): ?>
                    <tr>
                        <td><?= esc($category->ssi); ?></td>
                        <td><?= esc($category->name); ?></td>
                        <td>
                            <div class="btn-group">
                                <a class="btn btn-default" href="<?= base_url('log/edit/' . esc($category->ssi)); ?>">Edit</a>
                                <a class="btn btn-danger" href="<?= base_url('log/delete/' . esc($category->ssi)); ?>">Delete</a>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
