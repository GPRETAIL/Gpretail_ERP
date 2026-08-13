<?php
$data = '';
foreach ($items as $tyyf):
    $sn++;
    $count = $tyyf->ats;
    $stack[] = $count;
?>
    <tr id="add<?= $count ?>" class="">
        <td style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group"><?= $sn ?></div>
        </td>
        <td style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input readonly class="form-control" type="text" value="<?= esc($tyyf->prname) ?>" id="countryname_<?= $count ?>" name="countryname[]" />
            </div>
        </td>
        <td style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input readonly class="form-control" value="<?= esc($tyyf->producnum) ?>" type="text" id="statediv_<?= $count ?>" name="statediv[]" />
            </div>
        </td>
        <td style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input readonly type="text" class="form-control" id="cosst_<?= $count ?>" name="cosst[]" value="<?= esc($tyyf->purrs) ?>">
            </div>
        </td>

        <?php if ($setting['gst_tax'] == 1): ?>
            <td style="padding-right: 1px;padding-left: 1px;">
                <div class="form-group">
                    <input readonly type="text" class="form-control" id="cgst_<?= $count ?>" name="cgst[]" value="<?= esc($tyyf->cgstt) ?>" placeholder="Cgst">
                    <input readonly type="hidden" class="form-control" id="tax_methord_<?= $count ?>" name="tax_methord[]" value="<?= esc($tyyf->tax_methord) ?>" placeholder="Cgst">
                </div>
            </td>
            <input readonly type="hidden" class="form-control" id="sgst_<?= $count ?>" name="sgst[]" value="<?= esc($tyyf->sgst) ?>" placeholder="Sgst">
        <?php else: ?>
            <input readonly type="hidden" class="form-control" id="cgst_<?= $count ?>" name="cgst[]" value="<?= esc($tyyf->cgstt) ?>">
            <input readonly type="hidden" class="form-control" id="tax_methord_<?= $count ?>" name="tax_methord[]" value="<?= esc($tyyf->tax_methord) ?>">
            <input readonly type="hidden" class="form-control" id="sgst_<?= $count ?>" name="sgst[]" value="<?= esc($tyyf->sgst) ?>">
        <?php endif; ?>

        <td style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input type="text" onkeyup="return callcc_qtt(this.value,this.id);" required class="form-control" id="qty_<?= $count ?>" name="qty[]" value="<?= esc($tyyf->qqty) ?>" placeholder="Quantity">
            </div>
        </td>

        <td style="padding-right: 1px;padding-left: 1px;">
            <div class="form-group">
                <input type="text" onkeyup="return callcc_rss(this.value,this.id);" class="form-control" id="selling_<?= $count ?>" name="selling[]" value="<?= esc($tyyf->sellrs) ?>" placeholder="Cost">
            </div>
        </td>

        <td style="padding-right: 1px;padding-left: 1px;">
            <div class="input-group">
                <input readonly type="text" class="form-control" id="subtt_<?= $count ?>" name="subtt[]" value="<?= esc($tyyf->toto) ?>" placeholder="Cost">
        <td class="input-group-btn">
            <button class="btn btn-danger" type="button" onclick="remove_education_fields(<?= $count ?>);">
                <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
            </button>
        </td>
        </div>
        </td>
    </tr>
<?php endforeach; ?>

<input type="hidden" readonly class="form-control" id="ll" name="ll" value="<?= implode(',', $stack) ?>">