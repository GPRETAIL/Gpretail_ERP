<?php if (($setting['destpp'] ?? 0) != 1): ?>
    <script type="text/javascript">
        $(function () {
            $('#productList').slimScroll({
                height: '330px',
                alwaysVisible: true,
                railVisible: true,
            });
        });
    </script>
<?php endif; ?>

<div class="container">
    <?php if ($user->role === 'admin') : ?>
        <h3><?= label('Dashboard'); ?>
            <div style="float: right;display: inline-block;">
                <li class="dropdown" style="list-style: none;">
                    <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown">
                        <i class="fa fa-cogs" style="font-size: 17px;color:#1e73be;"></i>
                        <span class="caret"></span>
                    </a>
                    <ul class="dropdown-menu">
                        <li class="flat-box">
                            <a href="<?= base_url('categories/chageitt/1') ?>">
                                <input type="checkbox" name="d_s_re" value="1" <?= $user->d_s_re == 0 ? 'checked' : '' ?>>
                                <?= label('Sales'); ?>
                            </a>
                        </li>
                        <li class="flat-box">
                            <a href="<?= base_url('categories/chageitt/2') ?>">
                                <input type="checkbox" name="d_p_re" value="1" <?= $user->d_p_re == 0 ? 'checked' : '' ?>>
                                <?= label('Purchase'); ?>
                            </a>
                        </li>
                        <li class="flat-box">
                            <a href="<?= base_url('categories/chageitt/3') ?>">
                                <input type="checkbox" name="m_s_re" value="1" <?= $user->m_s_re == 0 ? 'checked' : '' ?>>
                                <?= label('Monthly') . ' ' . label('Sales'); ?>
                            </a>
                        </li>
                        <li class="flat-box">
                            <a href="<?= base_url('categories/chageitt/4') ?>">
                                <input type="checkbox" name="m_p_re" value="1" <?= $user->m_p_re == 0 ? 'checked' : '' ?>>
                                <?= label('Monthly') . ' ' . label('Purchase'); ?>
                            </a>
                        </li>
                    </ul>
                </li>
            </div>
        </h3>
        <hr>

        <div class="row">
            <div class="form-group col-md-2">
                <div style="height: 170px;background: #f7a31f;color: #fff;text-align: center;">
                    <i class="fa fa-shopping-cart" style="margin-top: 40px;font-size: 75px;"></i>
                    <h4>
                        <?= number_format(($month_salef->smms ?? 0) - ($monthhh_rettf->smms ?? 0), $setting['decimals'] ?? 2); ?>
                    </h4>
                    <h4 style="font-size: 11px;text-align: left;">
                        &nbsp;&nbsp;<?= label('Monthly') . ' ' . label('Sales'); ?>
                    </h4>
                </div>
            </div>

            <div class="form-group col-md-k1">
                <div style="height: 83px;background: #358ee0;color: #f2f8fe;text-align: center;">
                    <i class="fa fa-shopping-cart" style="margin-top: 22px;font-size: 30px;"></i>
                    <h4>
                        <?= number_format($todat_salef->smms ?? 0, $setting['decimals'] ?? 2); ?>
                    </h4>
                    <h4 style="font-size: 9px;text-align: left;">&nbsp;&nbsp;<?= label('TodaySale'); ?></h4>
                </div>
            </div>

            <div class="form-group col-md-k1">
                <div style="height: 83px;background: #e51400;color: #f2f8fe;text-align: center;">
                    <i class="fa fa-repeat" style="margin-top: 22px;font-size: 30px;"></i>
                    <h4>
                        <?= number_format($todat_rettfttf->smms ?? 0, $setting['decimals'] ?? 2); ?>
                    </h4>
                    <h4 style="font-size: 9px;text-align: left;">&nbsp;&nbsp;<?= label('Today Sales') . ' ' . label('Return'); ?></h4>
                </div>
            </div>

            <div class="form-group col-md-k1">
                <div style="height: 83px;background: #e51400;color: #f2f8fe;text-align: center;">
                    <i class="fa fa-repeat" style="margin-top: 22px;font-size: 30px;"></i>
                    <h4>
                        <?= number_format($todat_rettf->smms ?? 0, $setting['decimals'] ?? 2); ?>
                    </h4>
                    <h4 style="font-size: 9px;text-align: left;">&nbsp;&nbsp;<?= label('Today Total') . ' ' . label('Return'); ?></h4>
                </div>
            </div>

            <div class="form-group col-md-k1">
                <div style="height: 83px;background: #a15001;color: #f2f8fe;text-align: center;">
                    <i class="fa fa-cart-arrow-down" style="margin-top: 22px;font-size: 30px;"></i>
                    <h4>
                        <?= number_format($todat_purf->smms ?? 0, $setting['decimals'] ?? 2); ?>
                    </h4>
                    <h4 style="font-size: 9px;text-align: left;">&nbsp;&nbsp;<?= label('todatpurchase'); ?></h4>
                </div>
            </div>

            <div class="form-group col-md-k1">
                <div style="height: 83px;background: #01abaa;color: #f2f8fe;text-align: center;">
                    <i class="fa fa-shopping-cart" style="margin-top: 22px;font-size: 30px;"></i>
                    <h4>
                        <?= number_format($todat_expenf->smms ?? 0, $setting['decimals'] ?? 2); ?>
                    </h4>
                    <h4 style="font-size: 9px;text-align: left;">&nbsp;&nbsp;<?= label('Todays') . ' ' . label('Expense'); ?></h4>
                </div>
            </div>
        </div>

        <div class="clearfix"></div>

        <?php if ($user->d_s_re == 0): ?>
            <?= view('dashboard/partials/sales_chart', ['user' => $user, 'kmk' => $kmk]) ?>
        <?php endif; ?>
        <?php if ($user->d_p_re == 0): ?>
            <?= view('dashboard/partials/purchase_chart', ['user' => $user, 'kmkp' => $kmkp]) ?>
        <?php endif; ?>
        <?php if ($user->m_s_re == 0): ?>
            <?= view('dashboard/partials/monthly_sales_chart', ['user' => $user, 'kmkp_sm' => $kmkp_sm]) ?>
        <?php endif; ?>
        <?php if ($user->m_p_re == 0): ?>
            <?= view('dashboard/partials/monthly_purchase_chart', ['user' => $user, 'kmkp_pm' => $kmkp_pm]) ?>
        <?php endif; ?>

    <?php else: ?>
        <h3><?= label('Dashboard'); ?></h3>
        <hr>
        <h3>Welcome to GPRETAILS</h3>
    <?php endif; ?>
</div>
