<?php foreach ($items as $data): ?>
    <?php
    $item = $data['item'];
    $product = $data['product'];
    $count = $data['count'];
    ?>
    <div id="add<?= esc($count) ?>" class="col-xs-12">
        <div class="col-sm-3" style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input readonly class="form-control" type="text" value="<?= esc($item->prname) ?>" id="countryname_<?= $count ?>" name="countryname[]" />
                <input class="form-control" type="hidden" value="<?= esc($item->producnum) ?>" id="statediv_<?= $count ?>" name="statediv[]" />
                <input class="form-control" type="hidden" value="<?= esc($item->ppitemid) ?>" id="peritemid_<?= $count ?>" name="peritemid[]" />
            </div>
        </div>

        <div class="col-sm-2" style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input onkeyup="return callccp(this.value,this.id);" type="text" class="form-control" id="cosst_<?= $count ?>" name="cosst[]" value="<?= esc($item->purrs) ?>">
                <input type="hidden" class="form-control" id="tttpye_<?= $count ?>" name="tttpye[]" value="<?= esc($product->taxmethod ?? '') ?>">
            </div>
        </div>

        <?php if ($gstTax == 1): ?>
            <div class="col-sm-1" style="padding-right: 1px;padding-left: 1px;">
                <div class="form-group">
                    <input readonly type="text" class="form-control" id="cgst_<?= $count ?>" name="cgst[]" value="<?= esc($item->cgstt) ?>" placeholder="Cgst">
                </div>
            </div>
            <input readonly type="hidden" class="form-control" id="sgst_<?= $count ?>" name="sgst[]" value="<?= esc($item->sgst) ?>" placeholder="Sgst">
        <?php else: ?>
            <input readonly type="hidden" class="form-control" id="cgst_<?= $count ?>" name="cgst[]" value="<?= esc($item->cgstt) ?>" placeholder="Cgst">
            <input readonly type="hidden" class="form-control" id="sgst_<?= $count ?>" name="sgst[]" value="<?= esc($item->sgst) ?>" placeholder="Sgst">
        <?php endif; ?>

        <div class="col-sm-1" style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input onkeyup="return callcc(this.value,this.id);" type="text" required class="form-control" id="qty_<?= $count ?>" name="qty[]" value="<?= esc($item->qqty) ?>" placeholder="Quantity">
            </div>
        </div>

        <input type="hidden" required class="form-control" id="lev_<?= $count ?>" name="lev[]" value="1">
        <input type="hidden" required class="form-control" id="rack_<?= $count ?>" name="rack[]" value="1">

        <div class="col-sm-2" style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input readonly type="text" class="form-control" id="selling_<?= $count ?>" name="selling[]" value="<?= number_format((float) $item->sellrs, $decimals, '.', '') ?>" placeholder="Cost">
            </div>
        </div>

        <div class="col-sm-2" style="padding-right: 1px;padding-left: 1px;">
            <div class="input-group">
                <input readonly type="text" class="form-control" id="subtt_<?= $count ?>" name="subtt[]" value="<?= number_format((float) $item->toto, $decimals, '.', '') ?>" placeholder="Cost">
                <div class="input-group-btn">
                    <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
                </div>
            </div>
        </div>
    </div>
<?php endforeach; ?>

<input class="form-control" readonly type="hidden" id="ll" name="ll" value="<?= esc($stackList) ?>">