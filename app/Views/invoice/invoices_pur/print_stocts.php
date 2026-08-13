<div class="col-md-12">
    <form action="<?= base_url('printbarcodes/PurchaseLabelPrint/' . $id) ?>" target="_blank" method="post" accept-charset="utf-8" id="addformkk" enctype="multipart/form-data">
        <table class="table table-striped">
            <thead>
                <tr>
                    <th width="70%"><?= label("Product") ?></th>
                    <th width="30%">QTY</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($items as $item): ?>
                    <tr>
                        <td><?= esc($item['name']) ?></td>
                        <td>
                            <input name="arrayidd[]" type="hidden" value="<?= esc($item['product_id']) ?>" />
                            <input name="arrayqtt[]" type="text" value="<?= esc($item['qt']) ?>" />
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <button type="submit" class="btn btn-add"><?= label("Submit") ?></button>
    </form>
</div>