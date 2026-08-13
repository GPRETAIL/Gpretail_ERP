<table class="StatTable">
    <tr>
        <?php foreach (['january', 'feburary', 'march', 'april'] as $month): ?>
        <td>
            <span class="revenuespan" data-toggle="tooltip" data-placement="top" data-html="true"
                  title="<h5><?= label('tax') ?> : <b><?= esc($monthly->{$month . 'tax'}) ?> <?= esc($currency) ?></b><br><br><?= label('Discount') ?> : <b><?= esc($monthly->{$month . 'disc'}) ?> <?= esc($currency) ?></b></h5>">
                <?= esc($monthly->{$month}) ?> <?= esc($currency) ?>
            </span>
            <span class="expencespan">
                <?= esc($monthlyExp->$month) ?> <?= esc($currency) ?>
            </span>
            <?= label(ucfirst($month)) ?>
        </td>
        <?php endforeach; ?>
    </tr>
    <!-- Repeat for next quarters -->
</table>
