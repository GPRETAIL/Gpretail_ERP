<!-- app/Views/log/group.php -->

<div class="container">
    <h3>Group List</h3>
    <hr>

    <div class="row" style="margin-top:20px;">
        <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
            <thead>
                <tr>
                    <th style="width:60px;">S.No</th>
                    <th>Group Name</th>
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
