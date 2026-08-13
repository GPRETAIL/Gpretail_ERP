<!-- app/Views/log/product.php -->

<div class="container">
    <h3>Product List</h3>
    <hr>

    <div class="row" style="margin-top:20px;">
        <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
            <thead>
                <tr>
                    <th style="width:60px;">S.No</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($product as $prd): ?>
                    <tr>
                        <td><?= esc($prd->id); ?></td>
                        <td><?= esc($prd->name); ?></td>
                        <td><?= esc($prd->category); ?></td>
                        <td><?= esc($prd->price); ?></td>
                        <td><?= esc($prd->stock); ?></td>
                        <td>
                            <div class="btn-group">
                                <a class="btn btn-default" href="<?= base_url('log/edit/' . esc($prd->id)); ?>">Edit</a>
                                <a class="btn btn-danger" href="<?= base_url('log/delete/' . esc($prd->id)); ?>">Delete</a>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
