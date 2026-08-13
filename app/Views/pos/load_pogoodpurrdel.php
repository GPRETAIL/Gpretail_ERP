<?php

$sn = 0;
$stackt = [];

foreach ($items as $item): ?>
    <?php

    $sn++;
    $count = $item->ats;
    $product = $productMap[$item->producnum] ?? null;
    ?>
    <tr id="add<?= esc($count) ?>">

        <td>
            <input type="text" readonly value="<?= esc($item->producnum) ?>" class="form-control">
        </td>

        <td>
            <select class="form-control inputTab" name="branddd" id="branddd">
                <option value="0">Select</option>
                <?php foreach ($brands as $brand): ?>
                    <option value="<?= esc($brand['id']) ?>" <?= ($brand['id'] == $product->brandd) ? 'selected' : '' ?>>
                        <?= esc($brand['name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </td>

        <td>
            <input readonly class="form-control" type="text" value="<?= esc($item->prname) ?>" name="countryname[]">
            <input type="hidden" value="<?= esc($item->producnum) ?>" name="statediv[]">
        </td>

        <td>
            <input onkeyup="return callccp(this.value,this.id);" type="text" class="form-control" name="cosst[]" id="cosst_<?= $count ?>" value="<?= esc($item->purrs) ?>">
            <input type="hidden" name="tttpye[]" value="<?= esc($product->taxmethod ?? '') ?>">
        </td>

        <td>
            <?php if ($settings['gst_tax'] == 1): ?>
                <input readonly type="text" class="form-control" name="cgst[]" value="<?= esc($item->cgstt) ?>">
            <?php endif; ?>
            <input type="hidden" name="sgst[]" value="<?= esc($item->sgst) ?>">
        </td>

        <td>
            <input type="text" onkeyup="return callcc(this.value,this.id);" class="form-control" id="qty_<?= $count ?>" name="qty[]" value="<?= esc($item->qqty) ?>" placeholder="Quantity">
        </td>

        <?php if ($settings['expi'] == 1): ?>
            <td>
                <input readonly class="form-control" name="batch[]" value="<?= esc($item->batch_1m) ?>">
                <input readonly class="form-control" name="packed[]" value="<?= esc($item->packed_1m) ?>">
                <input readonly class="form-control" name="expire[]" value="<?= esc($item->expire_1m) ?>">
            </td>
        <?php else: ?>
            <input type="hidden" name="batch[]" value="<?= esc($item->batch_1m) ?>">
            <input type="hidden" name="packed[]" value="<?= esc($item->packed_1m) ?>">
            <input type="hidden" name="expire[]" value="<?= esc($item->expire_1m) ?>">
        <?php endif; ?>

        <td>
            <input readonly type="text" class="form-control" name="selling[]" value="<?= number_format((float)$item->sellrs, $decimals, '.', '') ?>">
        </td>

        <td>
            <input type="text" name="discount_amount[]" readonly class="form-control discount_amount_<?= $count ?>" value="<?= esc($item->discount_amount) ?>" placeholder="Dis Amt">
        </td>

        <td>
            <input type="text" name="discount_percent[]" readonly class="form-control discount_percent_<?= $count ?>" value="<?= esc($item->discount_percentage) ?>" placeholder="Dis%">
        </td>

        <td>
            <input type="text" name="agent_comission[]" readonly class="form-control agent_comission<?= $count ?>" value="" placeholder="Agent%">
        </td>

        <?php if ($settings['expi'] == 1): ?>
            <td>
                <input readonly type="text" class="form-control" name="selling[]" value="<?= number_format((float)$item->mrpp, $decimals, '.', '') ?>">
            </td>
        <?php else: ?>
            <input type="hidden" name="selling[]" value="<?= number_format((float)$item->mrpp, $decimals, '.', '') ?>">
        <?php endif; ?>

        <td>
            <input type="hidden" name="lev[]" value="1">
            <input type="hidden" name="rack[]" value="1">
            <div class="input-group">
                <input readonly type="text" class="form-control" name="subtt[]" value="<?= number_format((float)$item->toto, $decimals, '.', '') ?>" placeholder="Cost">
                <div class="input-group-btn">
                    <button class="btn btn-danger" type="button" onclick="remove_education_fields(<?= $count ?>);">
                        <span class="glyphicon glyphicon-minus"></span>
                    </button>
                </div>
            </div>
        </td>

    </tr>
<?php endforeach; ?>