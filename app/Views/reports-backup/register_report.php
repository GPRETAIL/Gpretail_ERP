<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="<?= 7 + count($paymentModes) + 2 ?>" style="text-align:center;">
                <?= esc($company) ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="<?= 7 + count($paymentModes) + 2 ?>"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="<?= 7 + count($paymentModes) + 2 ?>">
                Close Register Reports from <?= esc($start) ?> Till <?= esc($end) ?>
            </th>
        </tr>
        <tr style="background: #1c76bc; color: #fff;">
            <th style="border: 1px solid #1c76bc;"><?= label("Openingtime") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("closedat") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("StoreName") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Openedby") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("CashinHand") ?></th>
            <?php foreach ($paymentModes as $mode): ?>
                <th style="border: 1px solid #1c76bc;"><?= esc($mode['name']) ?></th>
            <?php endforeach; ?>
            <th style="border: 1px solid #1c76bc;">Return</th>
            <th style="border: 1px solid #1c76bc;">Expense</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();
        foreach ($registers as $reg):
            $storeName = $db->table('stores')->where('id', $reg->store_id)->get()->getRow('name');
            $user = $db->table('users')->where('id', $reg->user_id)->get()->getRow('username');
        ?>
        <tr>
            <td style="border: 1px solid #1c76bc;">
                <a href="javascript:void(0)" <?= $reg->closed_at ? 'onclick="RegisterDetails(' . $reg->id . ')"' : '' ?>>
                    <?= date('d-m-Y H:i:s', strtotime($reg->date)) ?>
                </a>
            </td>
            <td style="border: 1px solid #1c76bc;">
                <?= $reg->closed_at ? date("d-m-Y H:i:s", strtotime($reg->closed_at)) : label("Stillopen") ?>
            </td>
            <td style="border: 1px solid #1c76bc;"><?= esc($storeName) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($user) ?></td>
            <td style="border: 1px solid #1c76bc; text-align:center;"><?= number_format($reg->cash_inhand, $decimals) ?></td>

            <?php foreach ($paymentModes as $mode):
                $pay = $db->table('registers_paymentmode')
                    ->where(['reg_idd' => $reg->id, 'pay_m_id' => $mode['id']])
                    ->get()->getRowArray();
            ?>
                <td style="border: 1px solid #1c76bc;">
                    <?= number_format((float)($pay['countedcash'] ?? 0), $decimals) ?>
                </td>
            <?php endforeach; ?>

            <?php
            $return = $db->table('registers_ret_tot')
                ->where(['reg_idd' => $reg->id, 'pay_m_id' => 1])
                ->get()->getRowArray();
            ?>
            <td style="border: 1px solid #1c76bc;">
                <?= number_format((float)($return['countedcash'] ?? 0), $decimals) ?>
            </td>

            <?php
            $expense = $db->table('registers_ret_tot')
                ->where(['reg_idd' => $reg->id, 'pay_m_id' => 3])
                ->get()->getRowArray();
            ?>
            <td style="border: 1px solid #1c76bc;">
                <?= number_format((float)($expense['countedcash'] ?? 0), $decimals) ?>
            </td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
