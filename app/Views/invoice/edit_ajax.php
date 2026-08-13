<!-- app/Views/invoices/edit_ajax.php -->
<div class="row">
    <div class="col-md-12">
        <h4>
            <b><?= label('Total') ?>:</b> <?= number_format((float)$sale['total'], DECIMALS, '.', '') ?> &emsp;
            <b><?= label('Paid') ?>:</b> Rs. <?= number_format((float)$sale['paid'], DECIMALS, '.', '') ?> &emsp;
            <b><?= label('Change') ?>:</b> Rs. <?= max($sale['total'] - $sale['paid'], 0) ?>
        </h4>

        <div class="form-group">
            <label for="customerSelect"><?= label('changeClient') ?></label>
            <select class="form-control" id="customerSelect">
                <option value="0"><?= label('WalkinCustomer') ?></option>
                <?php foreach ($customers as $customer): ?>
                    <option value="<?= $customer['id'] ?>" <?= ($customer['id'] == $sale['client_id']) ? 'selected' : '' ?>>
                        <?= esc($customer['name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="changeStatus">
                <?= label('changeStatus') ?>
                <span class="<?= $sale['status'] == 0 ? 'paid' : ($sale['status'] == 1 ? 'unpaid' : 'Partiallypaid') ?>">
                    <?= label($sale['status'] == 0 ? 'paid' : ($sale['status'] == 1 ? 'unpaid' : 'Partiallypaid')) ?>
                </span>
            </label>
            <select class="form-control" id="changeStatus">
                <option value="0" <?= $sale['status'] == 0 ? 'selected' : '' ?>><?= label('paid') ?></option>
                <option value="1" <?= $sale['status'] == 1 ? 'selected' : '' ?>><?= label('unpaid') ?></option>
                <option value="2" <?= $sale['status'] == 2 ? 'selected' : '' ?>><?= label('Partiallypaid') ?></option>
            </select>
        </div>
    </div>
</div>
<input type="hidden" id="ClientId" value="<?= $sale['id'] ?>" />