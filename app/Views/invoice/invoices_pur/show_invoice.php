<div class="col-sm-12">
    <table width="100%">
        <tr>
            <td align="left">
                <span class="float-left"><?= esc($setting->companyname) ?><br>
                    <?= label("Tel") ?> <?= esc($setting->phone) ?>
                </span>
            </td>
            <td align="right">
                <img src="<?= base_url('files/Setting/' . $setting->logo) ?>" alt="Logo" width="100px" style="margin:15px;" />
            </td>
        </tr>
    </table>
</div>

<h4 class="float-left">#<?= sprintf('%05d', $purchase['id']) ?></h4>
<div style="clear:both;"></div>

<span style="font-size:40px;font-weight:600;padding:5px;background-color:#415472;color:#fff;">
    <?= label("INVOICE") ?>
</span>

<table width="100%">
    <tr>
        <td align="left"><?= label("Date") ?>: <?= date('d-m-Y', strtotime($purchase['created_at'])) ?></td>
        <td align="right"><?= $clientData ?></td>
    </tr>
</table>

<table class="table" cellspacing="0" border="0">
    <thead>
        <tr style="background-color:#555;color:#fff;font-weight:600">
            <th><em>#</em></th>
            <th><?= label("Product") ?></th>
            <th><?= label("Quantity") ?></th>
            <th><?= label("SubTotal") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php $i = 1;
        foreach ($items as $item): ?>
            <tr>
                <td><?= $i++ ?></td>
                <td><?= esc($item['name']) ?></td>
                <td><?= esc($item['qt']) ?></td>
                <td><?= number_format($item['qt'] * $item['price'], $setting->decimals, '.', '') . ' ' . esc($settings['currency']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>

<div class="col-xs-4 col-xs-offset-8">
    <table class="table table-striped">
        <tr>
            <td><?= label("TotalItems") ?></td>
            <td><?= esc($purchase['totalitems']) ?></td>
        </tr>
        <tr>
            <td><?= label("Total") ?></td>
            <td><?= number_format($purchase['subtotal'], $setting->decimals, '.', '') ?> <?= esc($settings['currency']) ?></td>
        </tr>
        <?php if ((int)$purchase['discount']): ?>
            <tr>
                <td><?= label("Discount") ?></td>
                <td><?= esc($purchase['discount']) ?></td>
            </tr>
        <?php endif; ?>
        <?php if ((int)$purchase['tax']): ?>
            <tr>
                <td><?= label("Tax") ?></td>
                <td><?= esc($purchase['tax']) ?></td>
            </tr>
        <?php endif; ?>
        <tr style="background-color:#415472;color:#fff;font-weight:600;font-size:20px">
            <td colspan="2"><?= number_format($purchase['total'], $setting->decimals, '.', '') ?> <?= esc($settings['currency']) ?></td>
        </tr>

        <?php if ($payMethod[0] === '1'): ?>
            <tr>
                <td><?= label("CreditCard") ?></td>
                <td>xxxx xxxx xxxx <?= substr($payMethod[1], -4) ?></td>
            </tr>
            <tr>
                <td><?= label("CreditCardHold") ?></td>
                <td><?= esc($payMethod[2]) ?></td>
            </tr>
        <?php elseif ($payMethod[0] === '2'): ?>
            <tr>
                <td><?= label("ChequeNum") ?></td>
                <td><?= esc($payMethod[1]) ?></td>
            </tr>
        <?php endif; ?>
    </table>
</div>

<div class="text-center" style="padding:10px; background-color:#eee;">
    <span style="font-size:9px;text-transform:uppercase;letter-spacing: 4px;">
        <?= esc($setting->companyname) ?><br><?= esc($setting->phone) ?>
    </span>
</div>