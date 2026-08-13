    <div style="border: 1px solid #333;padding:3px;margin-top:10px;">
        <table style="width:100%; border-style: dashed;" cellspacing="0" border="0">
            <tr>
                <td style="width:55%;">
                    <table style="width:100%; border-style: dashed;" cellspacing="0" border="0">
                        <tr>
                            <td style="font-size:13px;color:#333;"><b>Buyer</b></td>
                        </tr>
                        <?php if ($sale->clientname): ?>
                            <tr>
                                <td><?= esc($sale->clientname) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($client->customeraddress)): ?>
                            <tr>
                                <td><?= nl2br(esc($client->customeraddress)) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if ($sale->mobnnm): ?>
                            <tr>
                                <td><?= lang('Main.Phone') ?>: <?= esc($sale->mobnnm) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($client->gstno)): ?>
                            <tr>
                                <td><?= lang('Main.GST') ?>: <?= esc($client->gstno) ?></td>
                            </tr>
                        <?php endif; ?>
                    </table>
                </td>

                <td style="width:44%;">
                    <table style="width:100%; border-style: dashed;" cellspacing="0" border="0">
                        <tr>
                            <td style="font-size:13px;color:#333;"><b>Ship To</b></td>
                        </tr>
                        <?php if (!empty($client->shppingad)): ?>
                            <tr>
                                <td><?= nl2br(esc($client->shppingad)) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if ($sale->mobnnm): ?>
                            <tr>
                                <td><?= lang('Main.Phone') ?>: <?= esc($sale->mobnnm) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($client->gstno)): ?>
                            <tr>
                                <td><?= lang('Main.GST') ?>: <?= esc($client->gstno) ?></td>
                            </tr>
                        <?php endif; ?>
                    </table>
                </td>
            </tr>
        </table>
    </div>

    <br>

    <table class="table" cellspacing="0" border="0" style="margin-bottom:0;">
        <thead>
            <tr style="background:#89b03e !important;color:#fff;font-weight:600;">
                <th style="width:10px;border:1px solid #333;padding:8px;">S.No</th>
                <th style="width:60mm;border:1px solid #333;padding:8px;"><?= lang('Main.Product') ?> Description</th>
                <th style="width:15mm;border:1px solid #333;text-align:center;padding:8px;"><?= lang('Main.HSN') ?></th>
                <th style="width:8mm;border:1px solid #333;text-align:center;padding:8px;"><?= lang('Main.GST') ?></th>
                <th style="width:10mm;border:1px solid #333;text-align:center;padding:8px;"><?= lang('Main.Qty') ?></th>
                <th style="width:20mm;border:1px solid #333;text-align:center;padding:8px;"><?= lang('Main.Rate') ?></th>
                <th style="width:8mm;border:1px solid #333;text-align:center;padding:8px;"><?= lang('Main.Per') ?></th>
                <th style="width:20mm;border:1px solid #333;text-align:center;padding:8px;"><?= lang('Main.Total') ?></th>
            </tr>
        </thead>
        <tbody>
            <?php $i = 1;
            foreach ($posales as $posale): ?>
                <tr>
                    <td style="border:1px solid #333;padding:3px;text-align:center;"><?= $i++ ?></td>
                    <td style="border:1px solid #333;padding:3px;"><?= esc($posale->name) ?></td>
                    <td style="border:1px solid #333;padding:3px;text-align:right;"><?= esc($posale->hsn ?? '-') ?></td>
                    <td style="border:1px solid #333;padding:3px;text-align:right;"><?= esc($posale->cgst + $posale->sgst) ?>%</td>
                    <td style="border:1px solid #333;padding:3px;text-align:right;"><?= (int)$posale->qt ?></td>
                    <td style="border:1px solid #333;padding:3px;text-align:right;"><?= number_format((float)$posale->price, $setting->decimals, '.', '') ?></td>
                    <td style="border:1px solid #333;padding:3px;text-align:right;"><?= esc($posale->unit ?? '-') ?></td>
                    <td style="border:1px solid #333;padding:3px;text-align:right;">
                        <?= number_format((float)($posale->price * $posale->qt), $setting->decimals, '.', '') ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    </div>