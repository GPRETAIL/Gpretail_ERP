<div class="row">
    <div class="col-md-12">
        <h4>
            <b><?= label("Total") ?>:</b> <?= $sale['total'] ?> <?= esc($this->setting->currency) ?> &emsp;
            <b><?= label("Paid") ?>:</b> <?= $sale['paid'] ?> <?= esc($this->setting->currency) ?> &emsp;
            <b><?= label("change") ?>:</b> <?= $change ?> <?= esc($this->setting->currency) ?>
        </h4>

        <div class="form-group">
            <label for="customerSelect"><?= label("changeClient") ?></label>
            <select class="form-control" id="customerSelect">
                <option value="0"><?= label("WalkinCustomer") ?></option>
                <?php foreach ($customers as $customer): ?>
                    <option value="<?= $customer['id'] ?>" <?= $customer['id'] == $sale['client_id'] ? 'selected' : '' ?>>
                        <?= esc($customer['name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="changeStatus"><?= label("changeStatus") ?>
                <span class="<?= esc($status) ?>"><?= label($status) ?></span>
            </label>
            <select class="form-control" id="changeStatus">
                <option value="<?= $sale['status'] ?>"><?= label("changeStatus") ?></option>
                <option value="0"><?= label("paid") ?></option>
                <option value="1"><?= label("unpaid") ?></option>
                <option value="2"><?= label("Partiallypaid") ?></option>
            </select>
        </div>
    </div>

    <input type="hidden" id="ClientId" value="<?= $sale['id'] ?>" />
</div>