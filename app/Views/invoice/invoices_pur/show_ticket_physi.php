<div id="stockcontent">
    <div class="col-md-12">
        <table class="table table-striped">
            <thead>
                <tr>
                    <th width="5%">S.No</th>
                    <th width="32%"><?= label("Product") ?></th>
                    <th width="20%"><?= label("Before") . ' ' . label("Adjustment") ?></th>
                    <th width="15%"><?= label("Adjustment") ?></th>
                    <th width="20%"><?= label("After") . ' ' . label("Adjustment") ?></th>
                    <th width="25%"><?= label("Reason") ?></th>
                </tr>
            </thead>
            <tbody class="itemslist">
                <?php foreach ($products as $i => $item): ?>
                    <tr>
                        <td><?= $i + 1 ?></td>
                        <td><?= esc($item['name']) ?></td>
                        <td><?= esc($item['befqty']) ?></td>
                        <td><?= esc($item['qty']) ?></td>
                        <td><?= esc($item['affqty']) ?></td>
                        <td><?= esc($item['reason']) ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>