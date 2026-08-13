<div id="stockcontent">
    <div class="col-md-12">
        <table class="table table-striped">
            <thead>
                <tr>
                    <th width="5%">S.No</th>
                    <th width="32%"><?= label("Product") . ' ' . label("From") ?></th>
                    <th width="32%"><?= label("Product") . ' ' . label("To") ?></th>
                    <th width="30%"><?= label("Qty") ?></th>
                </tr>
            </thead>
            <tbody class="itemslist">
                <?php foreach ($items as $item): ?>
                    <tr>
                        <td><?= $item['serial'] ?></td>
                        <td><?= esc($item['from_name']) ?></td>
                        <td><?= esc($item['to_name']) ?></td>
                        <td><?= esc($item['quantity']) ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>