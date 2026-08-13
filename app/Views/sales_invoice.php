<div class="modal-dialog" role="document" style="width:800px;">
    <div class="modal-content">
        <div class="modal-header">
            Sales List
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>
        <div style="overflow-y: scroll;height: 400px;width: 100%;">
            <table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
                <thead>
                    <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
                        <th style="border: 1px solid #1c76bc;text-align:center;">Date Time</th>
                        <th style="border: 1px solid #1c76bc;text-align:center;">Sales ID</th>
                        <th style="text-align:center;border: 1px solid #1c76bc;">Product Name</th>
                        <th style="text-align:center;border: 1px solid #1c76bc;">Barcode</th>
                        <th style="text-align:center;border: 1px solid #1c76bc;">QT</th>
                        <th style="text-align:center;border: 1px solid #1c76bc;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Dynamic rows generated from server-side data -->
                </tbody>
            </table>
        </div>
    </div>
</div>

<h2 style="text-align:center;margin-bottom:-15px;">TAX INVOICE </h2>
<div style="width:210mm;font-size:10px;margin-top:1px;margin-left: -10px;padding:30px;">
    <div style="border: 1px solid #333;padding:3px;">
        <table class="table" style="width:100%;border-top: 0px solid #333;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;margin-top:30px;" cellspacing="0" border="0">
            <tr>
                <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
                    <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0">
                        <tr>
                            <td style="border-top: 0px;font-size:15px;color:#333;">
                                <img src="<?= base_url() . '/files/Setting/' . $this->setting->logo ?>" alt="logo" style="max-height: 45px;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border-top: 0px;font-size:13px;color:#333;">
                                <b><?= $mstoef['name'] ?></b>
                            </td>
                        </tr>
                        <tr>
                            <td style="border-top: 0px;">
                                <?= nl2br($mstoef['adresse']) . ',' . $mstoef['city'] . ',' . $mstoef['country'] ?>
                            </td>
                        </tr>
                        <?php if ($mstoef['phone']): ?>
                            <tr>
                                <td style="border-top: 0px;">
                                    PHONE: <?= $mstoef['phone'] ?>
                                </td>
                            </tr>
                        <?php endif; ?>
                        <?php if ($this->setting->gstnoo): ?>
                            <tr>
                                <td style="border-top: 0px;">
                                    GSTIN: <?= $this->setting->gstnoo ?>
                                </td>
                            </tr>
                        <?php endif; ?>
                    </table>
                </td>
                <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
                    <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0">
                        <tr>
                            <td style="width:60%;border-top: 0px;font-size:15px;">
                                <b>Invoice No </b>
                            </td>
                            <td style="border-top: 0px;font-size:13px;text-align:right;">
                                <?= $ttrrt ?>
                            </td>
                        </tr>
                        <tr style="background:#89b03e !important;color:#fff;">
                            <td style="border-top: 0px;font-size:13px;">Amount Due</td>
                            <td style="border-top: 0px;font-size:13px;text-align:right;">
                                <?= number_format((float) $sale->total, $this->setting->decimals, '.', '') ?>
                            </td>
                        </tr>
                        <tr>
                            <td style="border-top: 0px;font-size:13px;">Invoice Date</td>
                            <td style="border-top: 0px;font-size:13px;text-align:right;">
                                <?= $rrarf ?>
                            </td>
                        </tr>
                        <tr>
                            <td style="border-top: 0px;font-size:13px;">Due Date</td>
                            <td style="border-top: 0px;font-size:13px;text-align:right;">
                                <?= $rrarfb ?>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
</div>


<table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0">
    <tr>
        <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0">
                <tr>
                    <td style="border-top: 0px;font-size:13px;color:#333;">
                        <b>Buyer</b>
                    </td>
                </tr>
                <?php if ($sale->clientname): ?>
                    <tr>
                        <td style="border-top: 0px;">
                            <?= $sale->clientname ?>
                        </td>
                    </tr>
                <?php endif; ?>
                <?php if ($ccname2): ?>
                    <tr>
                        <td style="border-top: 0px;">
                            <?= nl2br($ccname2) ?>
                        </td>
                    </tr>
                <?php endif; ?>
                <?php if ($sale->mobnnm): ?>
                    <tr>
                        <td style="border-top: 0px;">
                            Phone: <?= $sale->mobnnm ?>
                        </td>
                    </tr>
                <?php endif; ?>
                <?php if ($ccname570): ?>
                    <tr>
                        <td style="border-top: 0px;">
                            GST: <?= $ccname570 ?>
                        </td>
                    </tr>
                <?php endif; ?>
            </table>
        </td>
        <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0">
                <tr>
                    <td style="border-top: 0px;font-size:13px;color:#333;">
                        <b>Ship To</b>
                    </td>
                </tr>
                <?php if ($ccname569): ?>
                    <tr>
                        <td style="border-top: 0px;">
                            <?= nl2br($ccname569) ?>
                        </td>
                    </tr>
                <?php endif; ?>
                <?php if ($sale->mobnnm): ?>
                    <tr>
                        <td style="border-top: 0px;">
                            Phone: <?= $sale->mobnnm ?>
                        </td>
                    </tr>
                <?php endif; ?>
                <?php if ($ccname570): ?>
                    <tr>
                        <td style="border-top: 0px;">
                            GST: <?= $ccname570 ?>
                        </td>
                    </tr>
                <?php endif; ?>
            </table>
        </td>
    </tr>
</table>

<table class="table" cellspacing="0" border="0" style="margin-bottom: 0px;">
    <thead>
        <tr style="background:#89b03e !important;color:#fff;font-weight:600;">
            <th style="width:10px;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">
                S.No
            </th>
            <th style="width:60mm;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">
                Product Description
            </th>
            <th style="width:15mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">
                HSN
            </th>
            <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">
                GST
            </th>
            <th style="width:10mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">
                Qty
            </th>
            <th style="width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">
                Rate
            </th>
            <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">
                Per
            </th>
            <th style="text-align:center;width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">
                Total
            </th>
        </tr>
    </thead>
    <tbody>
        <!-- Loop over each posale item -->
        <?php $i = 1;
        foreach ($posales as $posale): ?>
            <tr>
                <td style="text-align:center;"><?= $i++ ?></td>
                <td><?= $posale->name ?></td>
                <td style="text-align:right;"><?= $kmkm['hsn'] ?></td>
                <td style="text-align:right;"><?= $ovtax ?>%</td>
                <td style="text-align:right;"><?= $posale->qt ?></td>
                <td style="text-align:right;"><?= number_format((float) $posale->price, $this->setting->decimals, '.', '') ?></td>
                <td style="text-align:right;"><?= $kmkm['unit'] ?></td>
                <td style="text-align:right;"><?= number_format((float) ($posale->qt * $posale->price), $this->setting->decimals, '.', '') ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>