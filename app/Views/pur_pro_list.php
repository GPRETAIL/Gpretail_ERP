<?php
$sn = 0;
$stackt = [];
$categories = $db->query("SELECT * FROM categories ORDER BY name ASC ")->getResult();
foreach ($tyy as $tyyf):
    $toto = $tyyf->toto;
    if ($tyyf->taxtype == 2) {
        // $toto += $tyyf->taxtotal;
    }

    $sn++;
    $count = $tyyf->ats;
    $stackt[] = $count;

    $tywe = $db->table('products')->where('id', $tyyf->producnum)->get()->getRow();
    $products = $tywe;
if(isset($products->code)):

?>
    <tr>
        <td style="width: 45px;">
            <div> <?= $sn ?></div>
        </td>

        <td style="text-align: center; width: 9%;">
            <input type="text" readonly value="<?= esc($products->code) ?>" class="form-control">
            <input type="hidden" readonly value="<?= esc($tyyf->ats) ?>" name="ats[]" class="form-control">
        </td>

        <td style="width: 8%;">
            <select class="form-control inputTab" name="branddd" id="branddd">
                <option value="0">Select</option>
                <?php foreach ($imnn as $imnnf): ?>
                    <option value="<?= $imnnf['id'] ?>" <?= isset($products->brandd) && ($products->brandd == $imnnf['id']) ? 'selected' : '' ?>>
                        <?= esc($imnnf['name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </td>
        <td style="width: 8%;">
            <select class="form-control" name="_category_" id="_Category_">
                <option value="0">Select</option>
                <?php foreach ($categories as $category) : ?>
                    <option value="<?= $category->id ?>" <?= isset($products->category) && ($products->category == $category->id) ? 'selected' : '' ?>><?= $category->name ?></option>
                <?php endforeach; ?>
            </select>
        </td>
        <td style="width: 8%;">
            <input <?= $id == '' ? 'readonly' : '' ?> class="form-control" type="text" value="<?= esc($tyyf->prname) ?>" id="countryname_<?= $count ?>" name="countryname[]">
            <input type="hidden" value="<?= esc($tyyf->producnum) ?>" name="statediv[]">
        </td>

        <td style="width: 8%;">
            <input type="text" class="form-control" name="cosst[]" id="cosst_<?= $count ?>" value="<?= esc($tyyf->purrs) ?>" onkeyup="return callccp(this.value,this.id);">
            <input type="hidden" name="tttpye[]" id="tttpye_<?= $count ?>" value="<?= esc($tywe->taxmethod ?? '') ?>">
        </td>

        <?php if ($lxzmm["gst_tax"] == 1): ?>
            <td style="width: 8%;">
                <input readonly type="text" class="form-control" name="taxtotal[]" id="taxtotal_<?= $count ?>" value="<?= abs($tyyf->taxtotal) ?>">
                <input readonly type="hidden" class="form-control" name="cgst[]" id="cgst_<?= $count ?>" value="<?= abs($tyyf->cgstt) ?>">
                <input readonly type="hidden" class="form-control" name="sgst[]" id="sgst_<?= $count ?>" value="<?= esc($tyyf->sgst) ?>">
                <input readonly type="hidden" class="form-control" name="_cgst_[]" id="_cgst_<?= $count ?>" value="<?= esc($tyyf->_cgst) ?>">
                <input readonly type="hidden" class="form-control" name="_sgst_[]" id="_sgst_<?= $count ?>" value="<?= esc($tyyf->_sgst) ?>">
                <input readonly type="hidden" class="form-control" name="_igst_[]" id="_igst_<?= $count ?>" value="<?= esc($tyyf->_igst) ?>">
                <input readonly type="hidden" class="form-control" name="_gst_[]" id="_gst_<?= $count ?>" value="<?= esc($tyyf->_gst) ?>">
            </td>
        <?php else: ?>
            <td style="width: 8%;">
                <input readonly type="hidden" class="form-control" name="taxtotal[]" id="taxtotal_<?= $count ?>" value="<?= abs($tyyf->taxtotal) ?>">
                <input readonly type="hidden" name="cgst[]" id="cgst_<?= $count ?>" value="<?= abs($tyyf->cgstt) ?>">
                <input readonly type="hidden" name="sgst[]" id="sgst_<?= $count ?>" value="<?= esc($tyyf->sgst) ?>">
            </td>
        <?php endif; ?>

        <td style="width: 8%;">
            <input type="text" class="form-control" no="<?= $count ?>" id="qty_<?= $count ?>" name="qty[]" value="<?= esc($tyyf->qqty) ?>" onkeyup="return callcc(this.value,this.id);">
        </td>

        <?php if ($lxzmm["expi"] == 1): ?>
            <td><input type="text" readonly class="form-control" name="batch[]" id="batch_<?= $count ?>" value="<?= esc($tyyf->batch_1m) ?>"></td>
            <td><input type="text" readonly class="form-control" name="packed[]" id="packed_<?= $count ?>" value="<?= esc($tyyf->packed_1m) ?>"></td>
            <td><input type="text" readonly class="form-control" name="expire[]" id="expire_<?= $count ?>" value="<?= esc($tyyf->expire_1m) ?>"></td>
        <?php else: ?>
            <input type="hidden" name="batch[]" id="batch_<?= $count ?>" value="<?= esc($tyyf->batch_1m) ?>">
            <input type="hidden" name="packed[]" id="packed_<?= $count ?>" value="<?= esc($tyyf->packed_1m) ?>">
            <input type="hidden" name="expire[]" id="expire_<?= $count ?>" value="<?= esc($tyyf->expire_1m) ?>">

        <?php endif; ?>

        <td style="width: 8%;">
            <input type="text" <?= $id == '' ? 'readonly' : '' ?> class="form-control" id="selling_<?= $count ?>" name="selling[]" value="<?= number_format((float)$tyyf->sellrs, DECIMALS, '.', '') ?>">
        </td>
        <?php if ($lxzmm["expi"] == 1): ?>
            <td><input readonly type="text" class="form-control" id="mrpp_<?= $count ?>" name="mrp[]" value="<?= number_format((float)$tyyf->mrpp, DECIMALS, '.', '') ?>"></td>
        <?php else: ?>
            <td> <input type="text" class="form-control" id="mrpp_<?= $count ?>" name="mrp[]" value="<?= number_format((float)$tyyf->mrpp, DECIMALS, '.', '') ?>"></td>
        <?php endif; ?>

        <td style="width: 8%;"><input type="text" <?= $id == '' ? 'readonly' : '' ?> class="form-control discount_amount_<?= $count ?>" id="discount_amount" name="discount_amount[]" value="<?= esc($tyyf->discount_amount) ?>"></td>
        <td style="display: none;"><input type="text" <?= $id == '' ? 'readonly' : '' ?> class="form-control discount_percent_<?= $count ?>" id="discount_percent" name="discount_percent[]" value="<?= esc($tyyf->discount_percentage) ?>"></td>
        <td style="width: 8%;"><input type="text" <?= $id == '' ? 'readonly' : '' ?> class="form-control agent-comission agent_comission<?= $count ?>" id="agent_commission_<?= $count ?>" name="agent_comission[]" placeholder="Agent%" value="<?= isset($tyyf->agent_comission) ? esc($tyyf->agent_comission) : '' ?>"></td>

        <td>

            <div class="input-group">
                <input readonly type="text" class="form-control" id="subtt_<?= $count ?>" name="subtt[]" value="<?= $toto ?>">
                <div class="input-group-btn">
                    <button class="btn btn-danger" type="button" onclick="remove_education_fields(<?= $count ?>);">
                        <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
                    </button>
                </div>
                <input type="hidden" id="lev_<?= $count ?>" name="lev[]" value="1">
                <input type="hidden" id="rack_<?= $count ?>" name="rack[]" value="1">
            </div>
        </td>
    </tr>
<?php endif; ?>
<?php endforeach; ?>

<input type="hidden" name="ll" id="ll" value="<?= implode(',', $stackt) ?>">