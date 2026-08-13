<div style="width:<?= $rfkkkk ?>;font-size:12px;margin:10px auto;padding:10px;">
    <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;">
        <tbody>
            <tr>
                <td style="text-align:center;border:0;background-color:white;">
                    <?= $this->setting->receiptheader ?>
                </td>
            </tr>
            <tr>
                <td style="text-align:center;border:0;background-color:white;">
                    <?= $mstoef['name'] ?>
                </td>
            </tr>
            <?php if ($this->setting->ddsp > 0): ?>
                <tr>
                    <td style="text-align:center;border:0;background-color:white;">
                        <?= $mstoef['adresse'] ?>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr>
                <th style="border-top:1px solid #ddd;width:5px;padding-left:1px;padding-right:1px;"><?= label("S.N") ?></th>
                <th style="border-top:1px solid #ddd;"><?= label("Product") ?></th>
                <th style="border-top:1px solid #ddd;">QTY</th>
                <th style="border-top:1px solid #ddd;text-align:right;"><?= label("MRP") ?></th>
                <th style="border-top:1px solid #ddd;text-align:right;"><?= label("Rate") ?></th>
                <th style="border-top:1px solid #ddd;text-align:right;"><?= label("Amount") ?></th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($posales as $index => $item): ?>
                <tr>
                    <td><?= $index + 1 ?></td>
                    <td><?= $item->name ?></td>
                    <td><?= $item->qt ?></td>
                    <td style="text-align:right;"><?= number_format($item->mrpp, $this->setting->decimals) ?></td>
                    <td style="text-align:right;"><?= number_format($item->price, $this->setting->decimals) ?></td>
                    <td style="text-align:right;"><?= number_format($item->price * $item->qt, $this->setting->decimals) ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>