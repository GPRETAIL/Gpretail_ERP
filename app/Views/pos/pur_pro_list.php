    <?php if (!empty($tyy)): ?>
        <?php $sn = 0; ?>
        <?php foreach ($tyy as $tyyf): ?>
            <?php
            $sn++;
            $count = $tyyf->ats;
            $product = null;
            foreach ($imnn as $brand) {
                if ($brand['id'] == $tyyf->brandd) {
                    $product_brand_name = $brand['name'];
                    break;
                }
            }
            ?>
            <div id="add<?= $count ?>" class="col-xs-12">
                <div class="col-sm-1"> <?= $sn ?> </div>
                <div class="col-sm-1">
                    <input type="text" readonly value="<?= $tyyf->producnum ?>" class="form-control">
                </div>

                <div class="col-sm-1">
                    <select class="form-control inputTab" name="branddd" id="branddd">
                        <option value="0">Select</option>
                        <?php foreach ($imnn as $brand): ?>
                            <option value="<?= $brand['id'] ?>" <?= ($tyyf->brandd == $brand['id']) ? 'selected' : '' ?>><?= $brand['name'] ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="col-sm-1">
                    <div class="form-group">
                        <input readonly class="form-control" type="text" value="<?= $tyyf->prname ?>" id="countryname_<?= $count ?>" name="countryname[]">
                        <input type="hidden" class="form-control" value="<?= $tyyf->producnum ?>" id="statediv_<?= $count ?>" name="statediv[]">
                    </div>
                </div>

                <div class="col-sm-1">
                    <input onkeyup="return callccp(this.value,this.id);" type="text" class="form-control" id="cosst_<?= $count ?>" name="cosst[]" value="<?= $tyyf->purrs ?>">
                    <input type="hidden" class="form-control" id="tttpye_<?= $count ?>" name="tttpye[]" value="<?= $tyyf->taxmethod ?? '' ?>">
                </div>

                <?php if ($lxzmm['gst_tax'] == 1): ?>
                    <div class="col-sm-1">
                        <input readonly type="text" class="form-control" id="cgst_<?= $count ?>" name="cgst[]" value="<?= $tyyf->taxtotal ?>">
                    </div>
                    <input type="hidden" name="sgst[]" value="<?= $tyyf->sgst ?>">
                <?php else: ?>
                    <input type="hidden" name="cgst[]" value="<?= $tyyf->taxtotal ?>">
                    <input type="hidden" name="sgst[]" value="<?= $tyyf->sgst ?>">
                <?php endif; ?>

                <div class="col-sm-1">
                    <input type="text" required class="form-control" id="qty_<?= $count ?>" name="qty[]" value="<?= $tyyf->qqty ?>">
                </div>

                <?php if ($lxzmm['expi'] == 1): ?>
                    <div class="col-sm-1">
                        <input readonly class="form-control" id="batch_<?= $count ?>" name="batch[]" value="<?= $tyyf->batch_1m ?>">
                    </div>
                    <div class="col-sm-1">
                        <input readonly class="form-control" id="packed_<?= $count ?>" name="packed[]" value="<?= $tyyf->packed_1m ?>">
                    </div>
                    <div class="col-sm-1">
                        <input readonly class="form-control" id="expire_<?= $count ?>" name="expire[]" value="<?= $tyyf->expire_1m ?>">
                    </div>
                <?php else: ?>
                    <input type="hidden" name="batch[]" value="<?= $tyyf->batch_1m ?>">
                    <input type="hidden" name="packed[]" value="<?= $tyyf->packed_1m ?>">
                    <input type="hidden" name="expire[]" value="<?= $tyyf->expire_1m ?>">
                <?php endif; ?>

                <input type="hidden" name="lev[]" value="1">
                <input type="hidden" name="rack[]" value="1">

                <div class="col-sm-1">
                    <input readonly type="text" class="form-control" id="selling_<?= $count ?>" name="selling[]" value="<?= number_format((float) $tyyf->sellrs, $setting->decimals, '.', '') ?>">
                </div>

                <div class="col-sm-1">
                    <input type="text" name="discount_amount[]" readonly id="discount_amount" class="form-control discount_amount_<?= $count ?>" value="<?= $tyyf->discount_amount ?>">
                </div>

                <div class="col-sm-1">
                    <input type="text" name="discount_percent[]" readonly id="discount_percent" class="form-control discount_percent_<?= $count ?>" value="<?= $tyyf->discount_percentage ?>">
                </div>

                <div class="col-sm-1">
                    <input type="text" name="agent_comission[]" readonly id="agent_commission_<?= $count ?>" class="form-control agent_comission<?= $count ?>" value="">
                </div>

                <?php if ($lxzmm['expi'] == 1): ?>
                    <div class="col-sm-1">
                        <input readonly type="text" class="form-control" id="mrpp_<?= $count ?>" name="selling[]" value="<?= number_format((float) $tyyf->mrpp, $setting->decimals, '.', '') ?>">
                    </div>
                <?php else: ?>
                    <input type="hidden" id="mrpp_<?= $count ?>" name="selling[]" value="<?= number_format((float) $tyyf->mrpp, $setting->decimals, '.', '') ?>">
                <?php endif; ?>

                <div class="col-sm-1">
                    <div class="input-group">
                        <input readonly type="text" class="form-control" id="subtt_<?= $count ?>" name="subtt[]" value="<?= number_format((float) $tyyf->toto, $setting->decimals, '.', '') ?>">
                        <div class="input-group-btn">
                            <button class="btn btn-danger" type="button" onclick="remove_education_fields(<?= $count ?>);">
                                <span class="glyphicon glyphicon-minus" aria-hidden="true"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>