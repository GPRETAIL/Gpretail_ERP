<!-- app/Views/log/tax.php -->

<div class="container">
    <h3>Tax Details</h3>
    <hr>

    <form action="<?= base_url('log/tax') ?>" method="post">
        <div class="form-group">
            <label for="comm">Tax Comment</label>
            <input type="text" name="comm" id="comm" class="form-control" placeholder="Enter tax comment" required>
        </div>

        <div class="form-group">
            <label for="upp">Action Type</label>
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
                    <th style="width:60px;">S.No</th>
                    <th>Tax Name</th>
                    <th>Tax Rate</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($categories as $category): ?>
                    <tr>
                        <td><?= esc($category->sii); ?></td>
                        <td><?= esc($category->taxname); ?></td>
                        <td><?= esc($category->taxrate); ?>%</td>
                        <td>
                            <div class="btn-group">
                                <a class="btn btn-default" href="<?= base_url('log/edit/' . esc($category->sii)); ?>">Edit</a>
                                <a class="btn btn-danger" href="<?= base_url('log/delete/' . esc($category->sii)); ?>">Delete</a>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
